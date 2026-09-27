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
