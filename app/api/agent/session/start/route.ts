import { getKnowledge } from "@/data/knowledge/comparative";
import { startSessionRequestSchema } from "@/lib/agent/api";
import { runStartSessionGraph } from "@/lib/agent/graph";
import { AgentValidationError } from "@/lib/agent/validation";
import { createInitialLearningState } from "@/lib/mastery";
import type { LearningSession, LearningState } from "@/types/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = startSessionRequestSchema.parse(await request.json());
    const knowledge = getKnowledge(input.knowledgeId);

    if (!knowledge) {
      return Response.json({ error: "Knowledge 不存在" }, { status: 404 });
    }

    const learningState: LearningState = input.learningState
      ? {
          ...input.learningState,
          userId: input.userId,
          knowledgeId: knowledge.id,
          currentDifficulty: input.learningState.currentDifficulty as 1 | 2 | 3 | 4 | 5,
        }
      : createInitialLearningState(input.userId, knowledge.id);

    const result = await runStartSessionGraph({
      userId: input.userId,
      knowledge,
      learningState,
    });

    const session: LearningSession = {
      id: result.sessionId,
      userId: input.userId,
      knowledgeId: knowledge.id,
      startedAt: Date.now(),
      status: "active",
    };

    return Response.json({
      provider: result.provider,
      session,
      learningState: result.learningState,
      batch: result.batch,
    });
  } catch (error) {
    if (error instanceof AgentValidationError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof Error && error.name === "ZodError") {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("start session failed", error);
    return Response.json(
      { error: "Agent 生成题目失败，请稍后重试。" },
      { status: 502 },
    );
  }
}
