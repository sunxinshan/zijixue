import type {
  Attempt,
  BatchPerformance,
  Knowledge,
  LearningSession,
  LearningState,
  QuestionBatch,
  SessionMode,
  SessionSummary,
  TeachingStrategy,
} from "@/types/agent";

interface StartSessionResponse {
  provider: string;
  session: LearningSession;
  learningState: LearningState;
  strategy: TeachingStrategy;
  batch: QuestionBatch;
}

interface CompleteBatchResponse {
  provider: string;
  strategy: TeachingStrategy;
  batch?: QuestionBatch;
  sessionSummary?: SessionSummary;
  learningState: LearningState;
}

export class AgentRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AgentRequestError";
    this.status = status;
  }
}

export async function readAgentJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  let data: (T & { error?: string }) | null = null;

  if (contentType.includes("application/json")) {
    try {
      data = (await response.json()) as T & { error?: string };
    } catch {
      data = null;
    }
  } else {
    await response.text();
  }

  if (!response.ok) {
    const fallback =
      response.status === 504
        ? "超级大脑响应超时，请稍后重试"
        : "超级大脑服务暂时不可用，请稍后重试";
    throw new AgentRequestError(data?.error ?? fallback, response.status);
  }

  if (!data) {
    throw new AgentRequestError(
      "超级大脑返回了无法识别的数据，请稍后重试",
      response.status,
    );
  }
  return data;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readAgentJson<T>(response);
}

export function startAgentSession(input: {
  userId: string;
  knowledge: Knowledge;
  mode: SessionMode;
  subtopicId?: string;
  learningState?: LearningState;
  subtopicStates?: LearningState[];
}) {
  return postJson<StartSessionResponse>("/api/agent/session/start", {
    userId: input.userId,
    knowledgeId: input.knowledge.id,
    mode: input.mode,
    subtopicId: input.subtopicId,
    learningState: input.learningState,
    subtopicStates: input.subtopicStates,
  });
}

export function completeAgentBatch(input: {
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
}) {
  return postJson<CompleteBatchResponse>(
    "/api/agent/session/complete-batch",
    {
      userId: input.userId,
      knowledgeId: input.knowledge.id,
      mode: input.mode,
      subtopicId: input.subtopicId,
      learningState: input.learningState,
      sessionId: input.sessionId,
      attempts: input.attempts,
      currentBatch: input.currentBatch,
      batchNumber: input.batchNumber,
      pastBatches: input.pastBatches,
      strategies: input.strategies,
      previousQuestions: input.previousQuestions,
    },
  );
}
