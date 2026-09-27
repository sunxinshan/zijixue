import { getKnowledge, getSubtopic } from "@/data/knowledge/comparative";
import { startSessionRequestSchema } from "@/lib/agent/api";
import { runStartSessionGraph } from "@/lib/agent/graph";
import { AgentValidationError } from "@/lib/agent/validation";
import { createInitialLearningState } from "@/lib/mastery";
import type { LearningSession, LearningState, Subtopic } from "@/types/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function averageMastery(states: LearningState[]): number {
  if (states.length === 0) return 0;
  return Math.round(
    states.reduce((sum, state) => sum + state.mastery, 0) / states.length,
  );
}

function challengeUnlocked(knowledgeId: string, states: LearningState[]) {
  const knowledge = getKnowledge(knowledgeId);
  if (!knowledge) return false;
  return knowledge.subtopics.every((subtopic) =>
    states.some(
      (state) =>
        state.scope === "subtopic" &&
        state.subtopicId === subtopic.id &&
        state.completed &&
        subtopic.patterns.every(
          (pattern) =>
            !pattern.required ||
            state.patternProgress[pattern.id]?.coverageComplete === true,
        ),
    ),
  );
}

function buildChallengeState(
  userId: string,
  knowledgeId: string,
  states: LearningState[],
): LearningState {
  const patternProgress = Object.assign(
    {},
    ...states.map((state) => state.patternProgress),
  );
  return {
    ...createInitialLearningState(userId, knowledgeId, Date.now(), "knowledge"),
    mastery: averageMastery(states),
    strengths: Array.from(new Set(states.flatMap((state) => state.strengths))),
    weaknesses: Array.from(new Set(states.flatMap((state) => state.weaknesses))),
    recommendedFocus: Array.from(
      new Set(states.flatMap((state) => state.recommendedFocus)),
    ),
    patternProgress,
  };
}

export async function POST(request: Request) {
  try {
    const input = startSessionRequestSchema.parse(await request.json());
    const knowledge = getKnowledge(input.knowledgeId);

    if (!knowledge) {
      return Response.json({ error: "Knowledge 不存在" }, { status: 404 });
    }

    let subtopic: Subtopic | undefined;
    let learningState: LearningState;

    if (input.mode === "subtopic") {
      if (!input.subtopicId) {
        return Response.json({ error: "subtopicId 不能为空" }, { status: 400 });
      }
      subtopic = getSubtopic(knowledge, input.subtopicId);
      if (!subtopic) {
        return Response.json({ error: "Subtopic 不存在" }, { status: 404 });
      }
      learningState =
        input.learningState ??
        createInitialLearningState(
          input.userId,
          knowledge.id,
          Date.now(),
          "subtopic",
          subtopic.id,
        );
    } else {
      const states = input.subtopicStates ?? [];
      if (!challengeUnlocked(knowledge.id, states)) {
        return Response.json(
          { error: "所有 Subtopic 完成后才能进入 Challenge" },
          { status: 403 },
        );
      }
      learningState =
        input.learningState ??
        buildChallengeState(input.userId, knowledge.id, states);
    }

    const result = await runStartSessionGraph({
      userId: input.userId,
      knowledge,
      mode: input.mode,
      subtopicId: input.subtopicId,
      learningState,
      isEmptyState: input.mode === "subtopic" ? !input.learningState : false,
    });

    const session: LearningSession = {
      id: result.sessionId,
      userId: input.userId,
      knowledgeId: knowledge.id,
      mode: input.mode,
      subtopicId: subtopic?.id,
      startedAt: Date.now(),
      status: "active",
    };

    return Response.json({
      provider: result.provider,
      session,
      learningState: result.learningState,
      strategy: result.strategy,
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
      { error: "超级大脑生成题目失败，请稍后重试。" },
      { status: 502 },
    );
  }
}
