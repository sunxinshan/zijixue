import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import { createLLMProvider } from "@/lib/agent/provider";
import type { LLMProvider } from "@/lib/agent/llm";
import {
  buildBatchAnalysisPrompt,
  buildBatchGenerationPrompt,
  buildSessionSummaryPrompt,
} from "@/lib/agent/prompts";
import {
  AgentValidationError,
  agentDecisionPublicSchema,
  questionBatchPublicSchema,
  sessionSummaryPublicSchema,
  validateAgentDecision,
  validateQuestionBatch,
  validateSessionSummary,
} from "@/lib/agent/validation";
import { createLocalId } from "@/lib/game";
import { buildLearningStateFromSummary } from "@/lib/mastery";
import type {
  AgentDecision,
  Attempt,
  BatchAnalysisContext,
  BatchGenerationContext,
  Knowledge,
  LearningState,
  QuestionBatch,
  SessionSummary,
  SessionSummaryContext,
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
  decisions: Annotation<AgentDecision[]>(
    replaceValue<AgentDecision[]>(() => []),
  ),
  previousQuestions: Annotation<string[]>(replaceValue<string[]>(() => [])),
  decision: Annotation<AgentDecision | null>(
    replaceValue<AgentDecision | null>(() => null),
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

function createStartGraph(provider: LLMProvider) {
  const loadContext = async (state: typeof StartGraphState.State) => {
    return {
      learningState: {
        ...state.learningState,
        userId: state.userId,
        knowledgeId: state.knowledge.id,
      },
    };
  };

  const generateBatch = async (state: typeof StartGraphState.State) => {
    const context: BatchGenerationContext = {
      task: "generate_batch",
      knowledge: state.knowledge,
      learningState: state.learningState,
      focus: state.learningState.recommendedFocus,
      difficulty: state.learningState.currentDifficulty,
      batchNumber: 1,
      previousQuestions: [],
    };
    const generated = await provider.generate(
      buildBatchGenerationPrompt(context),
      questionBatchPublicSchema,
      context,
    );
    return {
      currentBatch: assignProgramQuestionIds(
        validateQuestionBatch(generated, state.knowledge),
        state.sessionId,
        1,
      ),
    };
  };

  return new StateGraph(StartGraphState)
    .addNode("load_context", loadContext)
    .addNode("generate_batch", generateBatch)
    .addEdge(START, "load_context")
    .addEdge("load_context", "generate_batch")
    .addEdge("generate_batch", END)
    .compile();
}

function createCompletionGraph(provider: LLMProvider) {
  const recordAttempt = async (state: typeof CompletionGraphState.State) => {
    const expectedIds = new Set(
      state.currentBatch.questions.map((question) => question.id),
    );
    const actualIds = new Set(state.attempts.map((attempt) => attempt.id));

    if (state.attempts.length !== 10 || actualIds.size !== 10) {
      throw new AgentValidationError("record_attempt 必须收到 10 条唯一 Attempt");
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

  const analyzeBatch = async (state: typeof CompletionGraphState.State) => {
    const context: BatchAnalysisContext = {
      task: "analyze_batch",
      knowledge: state.knowledge,
      learningState: state.learningState,
      attempts: state.attempts,
      questions: state.currentBatch.questions,
      batchNumber: state.batchNumber,
    };
    const decision = await provider.generate(
      buildBatchAnalysisPrompt(context),
      agentDecisionPublicSchema,
      context,
    );
    return {
      decision: validateAgentDecision(decision, state.knowledge),
    };
  };

  const generateNextBatch = async (
    state: typeof CompletionGraphState.State,
  ) => {
    if (!state.decision) {
      throw new AgentValidationError("generate_batch 缺少 AgentDecision");
    }

    const context: BatchGenerationContext = {
      task: "generate_batch",
      knowledge: state.knowledge,
      learningState: state.learningState,
      focus: state.decision.focus,
      difficulty: state.decision.difficulty,
      batchNumber: state.batchNumber + 1,
      previousQuestions: state.previousQuestions,
    };
    const generated = await provider.generate(
      buildBatchGenerationPrompt(context),
      questionBatchPublicSchema,
      context,
    );
    return {
      nextBatch: assignProgramQuestionIds(
        validateQuestionBatch(generated, state.knowledge),
        state.sessionId,
        state.batchNumber + 1,
      ),
    };
  };

  const summarizeSession = async (
    state: typeof CompletionGraphState.State,
  ) => {
    if (!state.decision) {
      throw new AgentValidationError("summarize_session 缺少 AgentDecision");
    }

    const context: SessionSummaryContext = {
      task: "summarize_session",
      knowledge: state.knowledge,
      learningState: state.learningState,
      attempts: state.attempts,
      questions: state.currentBatch.questions,
      decisions: [...state.decisions, state.decision],
    };
    const summary = await provider.generate(
      buildSessionSummaryPrompt(context),
      sessionSummaryPublicSchema,
      context,
    );
    return {
      sessionSummary: validateSessionSummary(summary, state.knowledge),
    };
  };

  const saveLearningState = async (
    state: typeof CompletionGraphState.State,
  ) => {
    if (!state.sessionSummary) {
      throw new AgentValidationError("save_learning_state 缺少 SessionSummary");
    }

    return {
      updatedLearningState: buildLearningStateFromSummary(
        state.learningState,
        state.knowledge,
        state.sessionSummary,
        state.decisions.concat(state.decision ? [state.decision] : []),
      ),
    };
  };

  return new StateGraph(CompletionGraphState)
    .addNode("record_attempt", recordAttempt)
    .addNode("analyze_batch", analyzeBatch)
    .addNode("generate_next_batch", generateNextBatch)
    .addNode("summarize_session", summarizeSession)
    .addNode("save_learning_state", saveLearningState)
    .addEdge(START, "record_attempt")
    .addEdge("record_attempt", "analyze_batch")
    .addConditionalEdges(
      "analyze_batch",
      (state) => (state.decision?.action === "continue" ? "continue" : "finish"),
      {
        continue: "generate_next_batch",
        finish: "summarize_session",
      },
    )
    .addEdge("generate_next_batch", END)
    .addEdge("summarize_session", "save_learning_state")
    .addEdge("save_learning_state", END)
    .compile();
}

export interface StartSessionGraphInput {
  userId: string;
  knowledge: Knowledge;
  learningState: LearningState;
}

export async function runStartSessionGraph(
  input: StartSessionGraphInput,
  provider: LLMProvider = createLLMProvider(),
) {
  const graph = createStartGraph(provider);
  const result = await graph.invoke(input);

  if (!result.currentBatch) {
    throw new AgentValidationError("generate_batch 未返回题目");
  }

  return {
    provider: provider.kind,
    sessionId: result.sessionId,
    learningState: result.learningState,
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
  decisions: AgentDecision[];
  previousQuestions: string[];
}

export async function runCompleteBatchGraph(
  input: CompleteBatchGraphInput,
  provider: LLMProvider = createLLMProvider(),
) {
  const graph = createCompletionGraph(provider);
  const result = await graph.invoke(input);

  if (!result.decision) {
    throw new AgentValidationError("analyze_batch 未返回决策");
  }

  return {
    provider: provider.kind,
    decision: result.decision,
    batch: result.nextBatch ?? undefined,
    sessionSummary: result.sessionSummary ?? undefined,
    learningState: result.updatedLearningState ?? result.learningState,
  };
}
