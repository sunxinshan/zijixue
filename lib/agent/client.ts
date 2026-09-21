import type {
  AgentDecision,
  Attempt,
  Knowledge,
  LearningSession,
  LearningState,
  QuestionBatch,
  SessionSummary,
} from "@/types/agent";

interface StartSessionResponse {
  provider: string;
  session: LearningSession;
  learningState: LearningState;
  batch: QuestionBatch;
}

interface CompleteBatchResponse {
  provider: string;
  decision: AgentDecision;
  batch?: QuestionBatch;
  sessionSummary?: SessionSummary;
  learningState: LearningState;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Agent 服务暂时不可用");
  }
  return data;
}

export function startAgentSession(input: {
  userId: string;
  knowledge: Knowledge;
  learningState?: LearningState;
}) {
  return postJson<StartSessionResponse>("/api/agent/session/start", {
    userId: input.userId,
    knowledgeId: input.knowledge.id,
    learningState: input.learningState,
  });
}

export function completeAgentBatch(input: {
  userId: string;
  knowledge: Knowledge;
  learningState: LearningState;
  sessionId: string;
  attempts: Attempt[];
  currentBatch: QuestionBatch;
  batchNumber: number;
  decisions: AgentDecision[];
  previousQuestions: string[];
}) {
  return postJson<CompleteBatchResponse>(
    "/api/agent/session/complete-batch",
    {
      userId: input.userId,
      knowledgeId: input.knowledge.id,
      learningState: input.learningState,
      sessionId: input.sessionId,
      attempts: input.attempts,
      currentBatch: input.currentBatch,
      batchNumber: input.batchNumber,
      decisions: input.decisions,
      previousQuestions: input.previousQuestions,
    },
  );
}
