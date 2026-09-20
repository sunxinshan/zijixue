import type { KnowledgeMastery } from "@/types/content";

export const MASTERY_CORRECT_GAIN = 10;
export const MASTERY_WRONG_PENALTY = 5;
export const MASTERY_STREAK_BONUS = 2;
export const MASTERY_MAX_STREAK_BONUS = 6;

export type MasteryTier = "starter" | "growing" | "strong" | "mastered";

export interface MasteryMeta {
  tier: MasteryTier;
  label: string;
  icon: string;
  description: string;
}

const MASTERY_LEVELS: MasteryMeta[] = [
  { tier: "starter", label: "初学", icon: "🌱", description: "刚刚开始，慢慢来" },
  { tier: "growing", label: "学习中", icon: "🌿", description: "正在长出新的枝叶" },
  { tier: "strong", label: "基本掌握", icon: "🌳", description: "越来越稳了" },
  { tier: "mastered", label: "熟练掌握", icon: "🌲", description: "已经长成大树" },
];

export function createKnowledgeMastery(knowledgePointId: string): KnowledgeMastery {
  return {
    knowledgePointId,
    mastery: 0,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
  };
}

export function clampMastery(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function getMasteryMeta(mastery: number): MasteryMeta {
  if (mastery >= 75) return MASTERY_LEVELS[3];
  if (mastery >= 50) return MASTERY_LEVELS[2];
  if (mastery >= 25) return MASTERY_LEVELS[1];
  return MASTERY_LEVELS[0];
}

export function applyAttemptToMastery(
  current: KnowledgeMastery | undefined,
  knowledgePointId: string,
  isCorrect: boolean,
  practicedAt: string,
): KnowledgeMastery {
  const base = current ?? createKnowledgeMastery(knowledgePointId);

  if (isCorrect) {
    const streakBonus = Math.min(base.streak * MASTERY_STREAK_BONUS, MASTERY_MAX_STREAK_BONUS);
    return {
      ...base,
      mastery: clampMastery(base.mastery + MASTERY_CORRECT_GAIN + streakBonus),
      correctCount: base.correctCount + 1,
      streak: base.streak + 1,
      lastPracticedAt: practicedAt,
      lastCorrectAt: practicedAt,
    };
  }

  return {
    ...base,
    mastery: clampMastery(base.mastery - MASTERY_WRONG_PENALTY),
    wrongCount: base.wrongCount + 1,
    streak: 0,
    lastPracticedAt: practicedAt,
  };
}

export function getAverageMastery(mastery: Record<string, KnowledgeMastery>, ids: readonly string[]): number {
  if (ids.length === 0) return 0;
  const total = ids.reduce((sum, id) => sum + (mastery[id]?.mastery ?? 0), 0);
  return Math.round(total / ids.length);
}
