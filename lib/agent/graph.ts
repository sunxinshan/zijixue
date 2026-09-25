import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import { analyzeBatch, createInitialObservation } from "@/lib/agent/analysis";
import {
  createBaselineStrategy,
  getOrCreateBaselineBatch,
} from "@/lib/agent/baseline";
import type { BaselineQuestionStore } from "@/lib/agent/baseline-store";
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
import { createLocalId, QUESTIONS_PER_BATCH } from "@/lib/game";
import { buildLearningStateFromSummary } from "@/lib/mastery";
import type {
  Attempt,
  BatchGenerationContext,
  BatchObservation,
  BatchPerformance,
  Knowledge,
  LearningState,
  QuestionBatch,
  SessionSummary,
  StrategyGenerationContext,
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
  learningState: Annotation<LearningState>(),
  sessionId: Annotation<string>(
    replaceValue<string>(() => createLocalId("session")),
  ),
  isEmptyState: Annotation<boolean>(),
  baselineBatch: Annotation<QuestionBatch | null>(
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
  return validateTeachingStrategy(generated, context.knowledge);
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
  return validateQuestionBatch(
    generated,
    context.knowledge,
    context.strategy.questionDistribution,
  );
}

function createStartGraph(
  provider: LLMProvider,
  baselineStore?: BaselineQuestionStore,
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
    if (!state.isEmptyState) {
      return {
        observation: createInitialObservation(),
      };
    }

    const baselineBatch = await getOrCreateBaselineBatch({
      knowledge: state.knowledge,
      provider,
      store: baselineStore,
    });
    return {
      baselineBatch,
      observation: createInitialObservation(),
    };
  };

  const generateTeachingStrategy = async (
    state: typeof StartGraphState.State,
  ) => {
    if (state.baselineBatch) {
      return {
        strategy: createBaselineStrategy(state.knowledge, state.baselineBatch),
      };
    }

    if (!state.observation) {
      throw new AgentValidationError("start graph 缺少 initial observation");
    }
    const context: StrategyGenerationContext = {
      task: "generate_teaching_strategy",
      knowledge: state.knowledge,
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
    if (state.baselineBatch) {
      return {
        currentBatch: state.baselineBatch,
      };
    }

    if (!state.strategy) {
      throw new AgentValidationError("start graph 缺少 TeachingStrategy");
    }
    const context: BatchGenerationContext = {
      task: "generate_question_batch",
      knowledge: state.knowledge,
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
      state.attempts.length !== QUESTIONS_PER_BATCH ||
      actualIds.size !== QUESTIONS_PER_BATCH
    ) {
      throw new AgentValidationError(
        `record_attempt 必须收到 ${QUESTIONS_PER_BATCH} 条唯一 Attempt`,
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
    return {
      observation: analyzeBatch({
        batchNumber: state.batchNumber,
        attempts: state.attempts,
        currentBatch: state.currentBatch,
        pastBatches: state.pastBatches,
        previousStrategies: state.strategies,
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
      knowledge: state.knowledge,
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
      knowledge: state.knowledge,
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
      knowledge: state.knowledge,
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
      updatedLearningState: buildLearningStateFromSummary(
        state.learningState,
        state.knowledge,
        state.sessionSummary,
        [...state.strategies, state.strategy],
      ),
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
  learningState: LearningState;
  isEmptyState: boolean;
}

export async function runStartSessionGraph(
  input: StartSessionGraphInput,
  provider: LLMProvider = createLLMProvider(),
  baselineStore?: BaselineQuestionStore,
) {
  const graph = createStartGraph(provider, baselineStore);
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
