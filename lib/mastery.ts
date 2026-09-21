import type {
  Knowledge,
  LearningState,
  SessionSummary,
  TeachingStrategy,
} from "@/types/agent";

export interface MasteryMeta {
  label: string;
  icon: string;
  description: string;
}

const MASTERY_LEVELS: MasteryMeta[] = [
  { label: "初学", icon: "🌱", description: "刚刚开始，慢慢来" },
  { label: "学习中", icon: "🌿", description: "正在长出新的枝叶" },
  { label: "基本掌握", icon: "🌳", description: "越来越稳了" },
  { label: "熟练掌握", icon: "🌲", description: "已经长成大树" },
];

export function clampMastery(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getMasteryMeta(mastery: number): MasteryMeta {
  if (mastery >= 75) return MASTERY_LEVELS[3];
  if (mastery >= 50) return MASTERY_LEVELS[2];
  if (mastery >= 25) return MASTERY_LEVELS[1];
  return MASTERY_LEVELS[0];
}

export function createInitialLearningState(
  userId: string,
  knowledgeId: string,
  updatedAt = Date.now(),
): LearningState {
  return {
    userId,
    knowledgeId,
    mastery: 0,
    strengths: [],
    weaknesses: [],
    currentDifficulty: 1,
    recommendedFocus: [],
    strategyLevel: 1,
    summary: "还没有完成过一次学习 Session。",
    updatedAt,
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildLearningStateFromSummary(
  current: LearningState,
  knowledge: Knowledge,
  summary: SessionSummary,
  strategies: TeachingStrategy[],
  updatedAt = Date.now(),
): LearningState {
  const validSubtopicIds = new Set(knowledge.subtopics.map((subtopic) => subtopic.id));
  const recommendedFocus = summary.recommendedFocus.filter((id) =>
    validSubtopicIds.has(id),
  );
  const latestStrategy = strategies.at(-1);

  return {
    ...current,
    mastery: clampMastery(summary.mastery),
    strengths: unique(summary.strengths),
    weaknesses: unique(summary.weaknesses),
    currentDifficulty:
      latestStrategy?.difficulty ?? current.currentDifficulty,
    recommendedFocus,
    strategyLevel: latestStrategy?.strategyLevel ?? current.strategyLevel,
    summary: summary.summary.trim(),
    updatedAt,
  };
}
