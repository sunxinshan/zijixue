import { getKnowledge } from "@/data/knowledge/comparative";
import { completeBatchRequestSchema } from "@/lib/agent/api";
import { runCompleteBatchGraph } from "@/lib/agent/graph";
import { AgentValidationError } from "@/lib/agent/validation";
import type { Difficulty, LearningState } from "@/types/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = completeBatchRequestSchema.parse(await request.json());
    const knowledge = getKnowledge(input.knowledgeId);

    if (!knowledge) {
      return Response.json({ error: "Knowledge 不存在" }, { status: 404 });
    }

    const learningState: LearningState = {
      ...input.learningState,
      userId: input.userId,
      knowledgeId: knowledge.id,
      currentDifficulty: input.learningState.currentDifficulty as Difficulty,
    };

    const result = await runCompleteBatchGraph({
      userId: input.userId,
      knowledge,
      learningState,
      sessionId: input.sessionId,
      attempts: input.attempts,
      currentBatch: input.currentBatch,
      batchNumber: input.batchNumber,
      pastBatches: input.pastBatches,
      strategies: input.strategies,
      previousQuestions: input.previousQuestions,
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof AgentValidationError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof Error && error.name === "ZodError") {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("complete batch failed", error);
    return Response.json(
      { error: "Agent 分析题目失败，请稍后重试。" },
      { status: 502 },
    );
  }
}
