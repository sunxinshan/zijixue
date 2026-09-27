import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import { analyzeBatch, createInitialObservation } from "@/lib/agent/analysis";
import {
  applyBatchToPatternProgress,
  boundStrategyBatchSize,
  enforceRequiredPatternCoverage,
  enforceWeakPatternMinimums,
  forceFinishOnPerfectBatch,
} from "@/lib/agent/coverage";
import {
  createQuestionPoolStrategy,
  getOrCreateQuestionPoolBatch,
} from "@/lib/agent/question-pool";
import type { QuestionPoolRepository } from "@/lib/agent/question-pool-store";
import type { LLMProvider } from "@/lib/agent/llm";
import { createLLMProvider } from "@/lib/agent/provider";
import {
  buildBatchGenerationPrompt,
  buildSessionSummaryPrompt,
  buildTeachingStrategyPrompt,
} from "@/lib/agent/prompts";
import {
  AgentValidationError,
  questionBatchPublicSchema,
  sessionSummaryPublicSchema,
  teachingStrategyPublicSchema,
  validateQuestionBatch,
  validateSessionSummary,
  validateTeachingStrategy,
} from "@/lib/agent/validation";
import { createLocalId } from "@/lib/game";
import { randomizeChoiceOptionPositions } from "@/lib/agent/question-options";
import { buildLearningStateFromSummary } from "@/lib/mastery";
import type {
  Attempt,
  BatchGenerationContext,
  BatchObservation,
  BatchPerformance,
  Knowledge,
  LearningState,
  QuestionBatch,
  SessionMode,
  SessionSummary,
  StrategyGenerationContext,
  Subtopic,
  TeachingStrategy,
} from "@/types/agent";

function replaceValue<T>(fallback: () => T) {
  return {
    value: (_left: T, right: T) => right,
    default: fallback,
  };
}

const StartGraphState = Annotation.Root({
  userId: Annotation<string>(),
  knowledge: Annotation<Knowledge>(),
  mode: Annotation<SessionMode>(),
  subtopicId: Annotation<string | undefined>(),
  learningState: Annotation<LearningState>(),
  sessionId: Annotation<string>(
    replaceValue<string>(() => createLocalId("session")),
  ),
  isEmptyState: Annotation<boolean>(),
  sharedPoolBatch: Annotation<QuestionBatch | null>(
    replaceValue<QuestionBatch | null>(() => null),
  ),
  observation: Annotation<BatchObservation | null>(
    replaceValue<BatchObservation | null>(() => null),
  ),
  strategy: Annotation<TeachingStrategy | null>(
    replaceValue<TeachingStrategy | null>(() => null),
  ),
  currentBatch: Annotation<QuestionBatch | null>(
    replaceValue<QuestionBatch | null>(() => null),
  ),
});

const CompletionGraphState = Annotation.Root({
  userId: Annotation<string>(),
  knowledge: Annotation<Knowledge>(),
  mode: Annotation<SessionMode>(),
  subtopicId: Annotation<string | undefined>(),
  learningState: Annotation<LearningState>(),
  sessionId: Annotation<string>(),
  attempts: Annotation<Attempt[]>(),
  currentBatch: Annotation<QuestionBatch>(),
  batchNumber: Annotation<number>(),
  pastBatches: Annotation<BatchPerformance[]>(
    replaceValue<BatchPerformance[]>(() => []),
  ),
  strategies: Annotation<TeachingStrategy[]>(
    replaceValue<TeachingStrategy[]>(() => []),
  ),
  previousQuestions: Annotation<string[]>(replaceValue<string[]>(() => [])),
  observation: Annotation<BatchObservation | null>(
    replaceValue<BatchObservation | null>(() => null),
  ),
  strategy: Annotation<TeachingStrategy | null>(
    replaceValue<TeachingStrategy | null>(() => null),
  ),
  nextBatch: Annotation<QuestionBatch | null>(
    replaceValue<QuestionBatch | null>(() => null),
  ),
  sessionSummary: Annotation<SessionSummary | null>(
    replaceValue<SessionSummary | null>(() => null),
  ),
  updatedLearningState: Annotation<LearningState | null>(
    replaceValue<LearningState | null>(() => null),
  ),
});

function getScopedKnowledge(
  knowledge: Knowledge,
  mode: SessionMode,
  subtopicId?: string,
): Knowledge {
  if (mode === "challenge") return knowledge;
  const subtopic = knowledge.subtopics.find((item) => item.id === subtopicId);
  if (!subtopic) {
    throw new AgentValidationError(`未知 Subtopic：${subtopicId ?? "missing"}`);
  }
  return { ...knowledge, subtopics: [subtopic] };
}

function getSubtopic(
  knowledge: Knowledge,
  subtopicId?: string,
): Subtopic | undefined {
  return knowledge.subtopics.find((item) => item.id === subtopicId);
}

function assignProgramQuestionIds(
  batch: QuestionBatch,
  sessionId: string,
  batchNumber: number,
): QuestionBatch {
  return {
    questions: batch.questions.map((question, index) => ({
      ...question,
      id: `${sessionId}-b${batchNumber}-q${index + 1}`,
    })),
  };
}

async function generateValidatedStrategy(
  provider: LLMProvider,
  context: StrategyGenerationContext,
): Promise<TeachingStrategy> {
  const generated = await provider.generate(
    buildTeachingStrategyPrompt(context),
    teachingStrategyPublicSchema,
    context,
  );
  const forced = forceFinishOnPerfectBatch(
    generated as TeachingStrategy,
    context.knowledge,
    context.observation,
  );
  if (forced.action === "finish") {
    return validateTeachingStrategy(forced, context.knowledge);
  }

  const coverageBounded = enforceRequiredPatternCoverage(
    forced,
    context.knowledge,
    context.observation.patternProgress,
  );
  const bounded = boundStrategyBatchSize(
    coverageBounded,
    context.knowledge,
    context.observation,
  );
  return validateTeachingStrategy(
    enforceWeakPatternMinimums(
      bounded,
      context.knowledge,
      context.observation,
    ),
    context.knowledge,
  );
}

async function generateValidatedBatch(
  provider: LLMProvider,
  context: BatchGenerationContext,
): Promise<QuestionBatch> {
  const generated = await provider.generate(
    buildBatchGenerationPrompt(context),
    questionBatchPublicSchema,
    context,
  );
  const validated = validateQuestionBatch(
    generated,
    context.knowledge,
    context.strategy.questionDistribution,
  );
  return randomizeChoiceOptionPositions(validated);
}

function createStartGraph(
  provider: LLMProvider,
  questionPoolRepository?: QuestionPoolRepository,
) {
  const loadContext = async (state: typeof StartGraphState.State) => {
    return {
      learningState: {
        ...state.learningState,
        userId: state.userId,
        knowledgeId: state.knowledge.id,
      },
    };
  };

  const analyzeLearningState = async (
    state: typeof StartGraphState.State,
  ) => {
    const scopedKnowledge = getScopedKnowledge(
      state.knowledge,
      state.mode,
      state.subtopicId,
    );
    if (!state.isEmptyState) {
      return {
        observation: createInitialObservation(state.learningState.patternProgress),
      };
    }

    const subtopic = getSubtopic(state.knowledge, state.subtopicId);
    if (!subtopic) {
      throw new AgentValidationError("Subtopic 模式缺少有效 subtopicId");
    }
    const sharedPoolBatch = await getOrCreateQuestionPoolBatch({
      knowledge: scopedKnowledge,
      subtopic,
      learningState: state.learningState,
      provider,
      repository: questionPoolRepository,
    });
    return {
      sharedPoolBatch,
      observation: createInitialObservation(state.learningState.patternProgress),
    };
  };

  const generateTeachingStrategy = async (
    state: typeof StartGraphState.State,
  ) => {
    if (state.sharedPoolBatch) {
      return {
        strategy: createQuestionPoolStrategy(state.sharedPoolBatch),
      };
    }

    if (!state.observation) {
      throw new AgentValidationError("start graph 缺少 initial observation");
    }
    const context: StrategyGenerationContext = {
      task: "generate_teaching_strategy",
      knowledge: getScopedKnowledge(state.knowledge, state.mode, state.subtopicId),
      learningState: state.learningState,
      observation: state.observation,
    };
    return {
      strategy: await generateValidatedStrategy(provider, context),
    };
  };

  const generateQuestionBatch = async (
    state: typeof StartGraphState.State,
  ) => {
    if (state.sharedPoolBatch) {
      return {
        currentBatch: state.sharedPoolBatch,
      };
    }

    if (!state.strategy) {
      throw new AgentValidationError("start graph 缺少 TeachingStrategy");
    }
    const context: BatchGenerationContext = {
      task: "generate_question_batch",
      knowledge: getScopedKnowledge(state.knowledge, state.mode, state.subtopicId),
      learningState: state.learningState,
      strategy: state.strategy,
      batchNumber: 1,
      previousQuestions: [],
    };
    const validated = await generateValidatedBatch(provider, context);
    return {
      currentBatch: assignProgramQuestionIds(
        validated,
        state.sessionId,
        1,
      ),
    };
  };

  return new StateGraph(StartGraphState)
    .addNode("load_context", loadContext)
    .addNode("analyze_learning_state", analyzeLearningState)
    .addNode("generate_teaching_strategy", generateTeachingStrategy)
    .addNode("generate_question_batch", generateQuestionBatch)
    .addEdge(START, "load_context")
    .addEdge("load_context", "analyze_learning_state")
    .addEdge("analyze_learning_state", "generate_teaching_strategy")
    .addEdge("generate_teaching_strategy", "generate_question_batch")
    .addEdge("generate_question_batch", END)
    .compile();
}

function createCompletionGraph(provider: LLMProvider) {
  const recordAttempt = async (state: typeof CompletionGraphState.State) => {
    const expectedIds = new Set(
      state.currentBatch.questions.map((question) => question.id),
    );
    const actualIds = new Set(state.attempts.map((attempt) => attempt.id));

    if (
      state.attempts.length !== state.currentBatch.questions.length ||
      actualIds.size !== state.currentBatch.questions.length
    ) {
      throw new AgentValidationError(
        `record_attempt 必须与当前批次题目数量一致：期望 ${state.currentBatch.questions.length}，实际 ${state.attempts.length}`,
      );
    }

    for (const attempt of state.attempts) {
      if (!expectedIds.has(attempt.questionId)) {
        throw new AgentValidationError(`Attempt 题目越界：${attempt.questionId}`);
      }
      if (attempt.sessionId !== state.sessionId) {
        throw new AgentValidationError(`Attempt Session 越界：${attempt.sessionId}`);
      }
      if (attempt.knowledgeId !== state.knowledge.id) {
        throw new AgentValidationError(`Attempt Knowledge 越界：${attempt.knowledgeId}`);
      }
    }

    return {};
  };

  const analyzeBatchNode = async (
    state: typeof CompletionGraphState.State,
  ) => {
    const patterns = getScopedKnowledge(
      state.knowledge,
      state.mode,
      state.subtopicId,
    ).subtopics.flatMap((subtopic) => subtopic.patterns);
    const patternProgress = applyBatchToPatternProgress(
      patterns,
      state.currentBatch.questions,
      state.attempts,
      state.learningState.patternProgress,
    );
    const learningState = {
      ...state.learningState,
      patternProgress,
    };

    return {
      learningState,
      observation: analyzeBatch({
        batchNumber: state.batchNumber,
        attempts: state.attempts,
        currentBatch: state.currentBatch,
        pastBatches: state.pastBatches,
        previousStrategies: state.strategies,
        previousPatternProgress: state.learningState.patternProgress,
        patternProgress,
      }),
    };
  };

  const generateTeachingStrategy = async (
    state: typeof CompletionGraphState.State,
  ) => {
    if (!state.observation) {
      throw new AgentValidationError("completion graph 缺少 BatchObservation");
    }
    const context: StrategyGenerationContext = {
      task: "generate_teaching_strategy",
      knowledge: getScopedKnowledge(state.knowledge, state.mode, state.subtopicId),
      learningState: state.learningState,
      observation: state.observation,
    };
    return {
      strategy: await generateValidatedStrategy(provider, context),
    };
  };

  const generateNextBatch = async (
    state: typeof CompletionGraphState.State,
  ) => {
    if (!state.strategy) {
      throw new AgentValidationError("generate_question_batch 缺少 TeachingStrategy");
    }
    const context: BatchGenerationContext = {
      task: "generate_question_batch",
      knowledge: getScopedKnowledge(state.knowledge, state.mode, state.subtopicId),
      learningState: state.learningState,
      strategy: state.strategy,
      batchNumber: state.batchNumber + 1,
      previousQuestions: state.previousQuestions,
    };
    const validated = await generateValidatedBatch(provider, context);
    return {
      nextBatch: assignProgramQuestionIds(
        validated,
        state.sessionId,
        state.batchNumber + 1,
      ),
    };
  };

  const summarizeSession = async (
    state: typeof CompletionGraphState.State,
  ) => {
    if (!state.strategy) {
      throw new AgentValidationError("summarize_session 缺少 TeachingStrategy");
    }
    const context = {
      task: "summarize_session" as const,
      knowledge: getScopedKnowledge(state.knowledge, state.mode, state.subtopicId),
      learningState: state.learningState,
      attempts: state.attempts,
      questions: state.currentBatch.questions,
      strategies: [...state.strategies, state.strategy],
    };
    const generated = await provider.generate(
      buildSessionSummaryPrompt(context),
      sessionSummaryPublicSchema,
      context,
    );
    return {
      sessionSummary: validateSessionSummary(generated, state.knowledge),
    };
  };

  const saveLearningState = async (
    state: typeof CompletionGraphState.State,
  ) => {
    if (!state.sessionSummary || !state.strategy) {
      throw new AgentValidationError("save_learning_state 缺少 Summary 或 Strategy");
    }
    return {
      updatedLearningState: buildLearningStateFromSummary({
        current: state.learningState,
        knowledge: getScopedKnowledge(state.knowledge, state.mode, state.subtopicId),
        subtopic: getSubtopic(state.knowledge, state.subtopicId),
        summary: state.sessionSummary,
        strategies: [...state.strategies, state.strategy],
        attempts: state.attempts,
        questions: state.currentBatch.questions,
      }),
    };
  };

  return new StateGraph(CompletionGraphState)
    .addNode("record_attempt", recordAttempt)
    .addNode("analyze_batch", analyzeBatchNode)
    .addNode("generate_teaching_strategy", generateTeachingStrategy)
    .addNode("generate_question_batch", generateNextBatch)
    .addNode("summarize_session", summarizeSession)
    .addNode("save_learning_state", saveLearningState)
    .addEdge(START, "record_attempt")
    .addEdge("record_attempt", "analyze_batch")
    .addEdge("analyze_batch", "generate_teaching_strategy")
    .addConditionalEdges(
      "generate_teaching_strategy",
      (state) => (state.strategy?.action === "finish" ? "finish" : "continue"),
      {
        continue: "generate_question_batch",
        finish: "summarize_session",
      },
    )
    .addEdge("generate_question_batch", END)
    .addEdge("summarize_session", "save_learning_state")
    .addEdge("save_learning_state", END)
    .compile();
}

export interface StartSessionGraphInput {
  userId: string;
  knowledge: Knowledge;
  mode: SessionMode;
  subtopicId?: string;
  learningState: LearningState;
  isEmptyState: boolean;
}

export async function runStartSessionGraph(
  input: StartSessionGraphInput,
  provider: LLMProvider = createLLMProvider(),
  questionPoolRepository?: QuestionPoolRepository,
) {
  const graph = createStartGraph(provider, questionPoolRepository);
  const result = await graph.invoke(input);

  if (!result.strategy || !result.currentBatch) {
    throw new AgentValidationError("start graph 未返回策略或题目");
  }

  return {
    provider: provider.kind,
    sessionId: result.sessionId,
    learningState: result.learningState,
    strategy: result.strategy,
    batch: result.currentBatch,
  };
}

export interface CompleteBatchGraphInput {
  userId: string;
  knowledge: Knowledge;
  mode: SessionMode;
  subtopicId?: string;
  learningState: LearningState;
  sessionId: string;
  attempts: Attempt[];
  currentBatch: QuestionBatch;
  batchNumber: number;
  pastBatches: BatchPerformance[];
  strategies: TeachingStrategy[];
  previousQuestions: string[];
}

export async function runCompleteBatchGraph(
  input: CompleteBatchGraphInput,
  provider: LLMProvider = createLLMProvider(),
) {
  const graph = createCompletionGraph(provider);
  const result = await graph.invoke(input);

  if (!result.strategy) {
    throw new AgentValidationError("completion graph 未返回 TeachingStrategy");
  }

  return {
    provider: provider.kind,
    strategy: result.strategy,
    batch: result.nextBatch ?? undefined,
    sessionSummary: result.sessionSummary ?? undefined,
    learningState: result.updatedLearningState ?? result.learningState,
  };
}
