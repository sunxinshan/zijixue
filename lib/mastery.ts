import { applyBatchToPatternProgress } from "@/lib/agent/coverage";
import type {
  Attempt,
  Knowledge,
  LearningScope,
  LearningState,
  PatternProgress,
  Question,
  SessionSummary,
  Subtopic,
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
  scope: LearningScope = "knowledge",
  subtopicId?: string,
): LearningState {
  return {
    userId,
    knowledgeId,
    scope,
    subtopicId,
    mastery: 0,
    strengths: [],
    weaknesses: [],
    currentDifficulty: 1,
    recommendedFocus: [],
    strategyLevel: 1,
    patternProgress: {},
    completed: false,
    summary: "还没有完成过一次学习 Session。",
    updatedAt,
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildLearningStateFromSummary(input: {
  current: LearningState;
  knowledge: Knowledge;
  subtopic?: Subtopic;
  summary: SessionSummary;
  strategies: TeachingStrategy[];
  attempts: Attempt[];
  questions: Question[];
  updatedAt?: number;
}): LearningState {
  const {
    current,
    knowledge,
    subtopic,
    summary,
    strategies,
    attempts,
    questions,
  } = input;
  const validPatternIds = new Set(
    knowledge.subtopics.flatMap((item) =>
      item.patterns.map((pattern) => pattern.id),
    ),
  );
  const recommendedFocus = summary.recommendedFocus.filter((id) =>
    validPatternIds.has(id),
  );
  const latestStrategy = strategies.at(-1);
  const patternProgress = subtopic
    ? applyBatchToPatternProgress(
        subtopic.patterns,
        questions,
        attempts,
        current.patternProgress,
      )
    : current.patternProgress;
  const totalAttempted = Object.values(patternProgress).reduce(
    (sum, progress) => sum + progress.attemptedQuestions,
    0,
  );
  const coverageComplete = subtopic
    ? subtopic.patterns.every(
        (pattern) =>
          !pattern.required || patternProgress[pattern.id]?.coverageComplete,
      )
    : false;
  const completed =
    current.scope === "knowledge"
      ? latestStrategy?.action === "finish"
      : Boolean(
          subtopic &&
            coverageComplete &&
            totalAttempted >= subtopic.minimumQuestions &&
            latestStrategy?.action === "finish",
        );

  return {
    ...current,
    mastery: clampMastery(summary.mastery),
    strengths: unique(summary.strengths),
    weaknesses: unique(summary.weaknesses),
    currentDifficulty:
      latestStrategy?.difficulty ?? current.currentDifficulty,
    recommendedFocus,
    strategyLevel: latestStrategy?.strategyLevel ?? current.strategyLevel,
    patternProgress,
    completed,
    summary: summary.summary.trim(),
    updatedAt: input.updatedAt ?? Date.now(),
  };
}

export function mergePatternProgress(
  target: Record<string, PatternProgress>,
  source: Record<string, PatternProgress>,
): Record<string, PatternProgress> {
  return { ...target, ...source };
}
