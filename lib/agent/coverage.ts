import type {
  Attempt,
  Knowledge,
  Pattern,
  PatternProgress,
  Question,
  Subtopic,
} from "@/types/agent";

export function createEmptyPatternProgress(
  patterns: Pattern[],
): Record<string, PatternProgress> {
  return Object.fromEntries(
    patterns.map((pattern) => [
      pattern.id,
      {
        patternId: pattern.id,
        attemptedQuestions: 0,
        correctQuestions: 0,
        coveredItems: [],
        coverageComplete: false,
      },
    ]),
  );
}

function isCoverageComplete(
  pattern: Pattern,
  attemptedQuestions: number,
  coveredItems: string[],
): boolean {
  if (attemptedQuestions < pattern.minimumQuestions) return false;
  if (!pattern.coverageItems?.length) return true;
  const covered = new Set(coveredItems);
  return pattern.coverageItems.every((item) => covered.has(item));
}

export function applyBatchToPatternProgress(
  patterns: Pattern[],
  questions: Question[],
  attempts: Attempt[],
  previous: Record<string, PatternProgress> = {},
): Record<string, PatternProgress> {
  const questionById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const result = createEmptyPatternProgress(patterns);

  for (const pattern of patterns) {
    const previousProgress = previous[pattern.id];
    const attemptedQuestionIds = new Set<string>();
    const correctQuestionIds = new Set<string>();
    const coveredItems = new Set(previousProgress?.coveredItems ?? []);

    for (const attempt of attempts) {
      const question = questionById.get(attempt.questionId);
      if (!question || question.patternId !== pattern.id) continue;

      attemptedQuestionIds.add(question.id);
      if (attempt.correct) correctQuestionIds.add(question.id);
      if (question.coverageItemId) coveredItems.add(question.coverageItemId);
    }

    const attemptedQuestions =
      (previousProgress?.attemptedQuestions ?? 0) + attemptedQuestionIds.size;
    const correctQuestions =
      (previousProgress?.correctQuestions ?? 0) + correctQuestionIds.size;
    const coveredItemList = Array.from(coveredItems);

    result[pattern.id] = {
      patternId: pattern.id,
      attemptedQuestions,
      correctQuestions,
      coveredItems: coveredItemList,
      coverageComplete: isCoverageComplete(
        pattern,
        attemptedQuestions,
        coveredItemList,
      ),
    };
  }

  return result;
}

export function mergePatternProgress(
  patterns: Pattern[],
  progress: Record<string, PatternProgress>,
): Record<string, PatternProgress> {
  const result = createEmptyPatternProgress(patterns);
  for (const pattern of patterns) {
    result[pattern.id] = progress[pattern.id] ?? result[pattern.id];
  }
  return result;
}

export function isSubtopicCoverageComplete(
  subtopic: Subtopic,
  progress: Record<string, PatternProgress>,
): boolean {
  return subtopic.patterns.every(
    (pattern) =>
      !pattern.required || progress[pattern.id]?.coverageComplete === true,
  );
}

export function getSubtopicPatterns(
  knowledge: Knowledge,
  subtopicId: string,
): Pattern[] {
  return knowledge.subtopics.find((subtopic) => subtopic.id === subtopicId)?.patterns ?? [];
}

import {
  MAX_QUESTIONS_PER_BATCH,
} from "@/lib/game";
import type { TeachingStrategy } from "@/types/agent";

export function enforceRequiredPatternCoverage(
  strategy: TeachingStrategy,
  knowledge: Knowledge,
  progress: Record<string, PatternProgress>,
): TeachingStrategy {
  if (strategy.action === "finish") return strategy;

  const patterns = knowledge.subtopics.flatMap((subtopic) => subtopic.patterns);
  const counts = new Map(
    strategy.questionDistribution.map((item) => [item.patternId, item.count]),
  );

  for (const pattern of patterns) {
    if (!pattern.required || progress[pattern.id]?.coverageComplete) continue;
    if ((counts.get(pattern.id) ?? 0) === 0) counts.set(pattern.id, 1);
  }

  let total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
  const focus = new Set(strategy.focus);
  while (total > MAX_QUESTIONS_PER_BATCH) {
    const candidate = patterns
      .filter((pattern) => (counts.get(pattern.id) ?? 0) > 1)
      .sort((left, right) => {
        const leftCovered = progress[left.id]?.coverageComplete ? 0 : 1;
        const rightCovered = progress[right.id]?.coverageComplete ? 0 : 1;
        if (leftCovered !== rightCovered) return leftCovered - rightCovered;
        const leftFocus = focus.has(left.id) ? 1 : 0;
        const rightFocus = focus.has(right.id) ? 1 : 0;
        return leftFocus - rightFocus;
      })[0];

    if (!candidate) break;
    counts.set(candidate.id, (counts.get(candidate.id) ?? 1) - 1);
    total -= 1;
  }

  return {
    ...strategy,
    questionDistribution: Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([patternId, count]) => ({ patternId, count })),
  };
}

import {
  MIN_QUESTIONS_PER_BATCH,
} from "@/lib/game";
import type { BatchObservation } from "@/types/agent";

export function boundStrategyBatchSize(
  strategy: TeachingStrategy,
  knowledge: Knowledge,
  observation: BatchObservation,
): TeachingStrategy {
  if (strategy.action === "finish") return strategy;

  const patterns = knowledge.subtopics.flatMap((subtopic) => subtopic.patterns);
  const coverageComplete = patterns.every(
    (pattern) =>
      !pattern.required ||
      observation.patternProgress[pattern.id]?.coverageComplete === true,
  );
  const accuracy = observation.currentBatch.accuracy;
  const targetTotal =
    accuracy >= 90 && coverageComplete
      ? 5
      : accuracy >= 80
        ? 8
        : strategy.diagnosis === "persistent_failure" ||
            strategy.diagnosis === "rule_misunderstanding"
          ? 5
          : MAX_QUESTIONS_PER_BATCH;

  const counts = new Map(
    strategy.questionDistribution.map((item) => [item.patternId, item.count]),
  );
  const protectedIds = new Set([
    ...strategy.focus,
    ...patterns
      .filter(
        (pattern) =>
          pattern.required &&
          !observation.patternProgress[pattern.id]?.coverageComplete,
      )
      .map((pattern) => pattern.id),
  ]);

  let total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  while (total > targetTotal) {
    const candidates = patterns
      .filter((pattern) => (counts.get(pattern.id) ?? 0) > 0)
      .sort((left, right) => {
        const leftProtected = protectedIds.has(left.id) ? 1 : 0;
        const rightProtected = protectedIds.has(right.id) ? 1 : 0;
        if (leftProtected !== rightProtected) return leftProtected - rightProtected;
        const leftCount = counts.get(left.id) ?? 0;
        const rightCount = counts.get(right.id) ?? 0;
        if (leftCount !== rightCount) return rightCount - leftCount;
        return left.id.localeCompare(right.id);
      });

    const candidate = candidates.find(
      (pattern) =>
        (counts.get(pattern.id) ?? 0) > 1 ||
        !protectedIds.has(pattern.id),
    );
    if (!candidate) break;
    counts.set(candidate.id, (counts.get(candidate.id) ?? 0) - 1);
    total -= 1;
  }

  while (total < MIN_QUESTIONS_PER_BATCH) {
    const patternId =
      strategy.focus[0] ??
      patterns.find((pattern) => !observation.patternProgress[pattern.id]?.coverageComplete)?.id ??
      patterns[0]?.id;
    if (!patternId) break;
    counts.set(patternId, (counts.get(patternId) ?? 0) + 1);
    total += 1;
  }

  return {
    ...strategy,
    questionDistribution: Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([patternId, count]) => ({ patternId, count })),
  };
}

export function forceFinishOnPerfectBatch(
  strategy: TeachingStrategy,
  knowledge: Knowledge,
  observation: BatchObservation,
): TeachingStrategy {
  const patterns = knowledge.subtopics.flatMap((subtopic) => subtopic.patterns);
  const requiredPatternIds = patterns
    .filter((pattern) => pattern.required)
    .map((pattern) => pattern.id);
  const attemptedPatternIds = new Set(
    observation.currentBatch.patternStats.map((item) => item.patternId),
  );
  const allRequiredPatternsAttempted = requiredPatternIds.every((patternId) =>
    attemptedPatternIds.has(patternId),
  );
  const perfectBatch =
    observation.currentBatch.total > 0 &&
    observation.currentBatch.correct === observation.currentBatch.total;

  if (!perfectBatch || !allRequiredPatternsAttempted) return strategy;

  return {
    ...strategy,
    diagnosis: "mastered",
    strategyLevel: 5,
    action: "finish",
    focus: [],
    questionDistribution: [],
    explanation: undefined,
    examples: undefined,
    reason: "当前批次全部答对，且所有 required Pattern 均已覆盖，直接通过。",
  };
}

function subtopicTargetAccuracy(
  knowledge: Knowledge,
  patternId: string,
): number {
  return (
    knowledge.subtopics.find((subtopic) =>
      subtopic.patterns.some((pattern) => pattern.id === patternId),
    )?.targetAccuracy ?? 90
  );
}

export function enforceWeakPatternMinimums(
  strategy: TeachingStrategy,
  knowledge: Knowledge,
  observation: BatchObservation,
): TeachingStrategy {
  if (strategy.action === "finish") return strategy;

  const patterns = knowledge.subtopics.flatMap((subtopic) => subtopic.patterns);
  const progress =
    observation.previousPatternProgress ?? observation.patternProgress;
  const counts = new Map(
    strategy.questionDistribution.map((item) => [item.patternId, item.count]),
  );

  for (const pattern of patterns) {
    const current = progress[pattern.id];
    if (!current || current.attemptedQuestions === 0) continue;

    const targetAccuracy = subtopicTargetAccuracy(knowledge, pattern.id);
    const targetCorrect = Math.ceil(
      current.attemptedQuestions * (targetAccuracy / 100),
    );
    const needed = Math.max(0, targetCorrect - current.correctQuestions);
    if (needed > 0 && (counts.get(pattern.id) ?? 0) < needed) {
      counts.set(pattern.id, needed);
    }
  }

  let total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  const protectedMinimums = new Map(counts);

  while (total > MAX_QUESTIONS_PER_BATCH) {
    const candidate = patterns
      .filter(
        (pattern) =>
          (counts.get(pattern.id) ?? 0) >
          (protectedMinimums.get(pattern.id) ?? 0),
      )
      .sort(
        (left, right) =>
          (counts.get(right.id) ?? 0) - (counts.get(left.id) ?? 0),
      )[0];
    if (!candidate) break;
    counts.set(candidate.id, (counts.get(candidate.id) ?? 1) - 1);
    total -= 1;
  }

  return {
    ...strategy,
    questionDistribution: Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([patternId, count]) => ({ patternId, count })),
  };
}
