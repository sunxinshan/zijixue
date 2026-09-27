import type {
  Attempt,
  BatchObservation,
  BatchPerformance,
  PatternProgress,
  Question,
  QuestionBatch,
  TeachingStrategy,
} from "@/types/agent";

export function createBatchPerformance(
  batchNumber: number,
  attempts: Attempt[],
  questions: Question[],
): BatchPerformance {
  const questionById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const stats = new Map<string, { correct: number; total: number }>();

  for (const attempt of attempts) {
    const patternId = questionById.get(attempt.questionId)?.patternId;
    if (!patternId) continue;
    const current = stats.get(patternId) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (attempt.correct) current.correct += 1;
    stats.set(patternId, current);
  }

  const correct = attempts.filter((attempt) => attempt.correct).length;
  return {
    batchNumber,
    total: attempts.length,
    correct,
    accuracy:
      attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0,
    patternStats: Array.from(stats.entries()).map(([patternId, value]) => ({
      patternId,
      correct: value.correct,
      total: value.total,
      accuracy:
        value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
    })),
  };
}

function calculateConsecutiveErrors(
  attempts: Attempt[],
  questions: Question[],
): Record<string, number> {
  const attemptByQuestionId = new Map(
    attempts.map((attempt) => [attempt.questionId, attempt]),
  );
  const currentRun: Record<string, number> = {};
  const maxRun: Record<string, number> = {};

  for (const question of questions) {
    const attempt = attemptByQuestionId.get(question.id);
    if (!attempt) continue;
    const patternId = question.patternId;
    if (attempt.correct) {
      currentRun[patternId] = 0;
      continue;
    }
    currentRun[patternId] = (currentRun[patternId] ?? 0) + 1;
    maxRun[patternId] = Math.max(maxRun[patternId] ?? 0, currentRun[patternId]);
  }

  return maxRun;
}

export function analyzeBatch(input: {
  batchNumber: number;
  attempts: Attempt[];
  currentBatch: QuestionBatch;
  pastBatches: BatchPerformance[];
  previousStrategies: TeachingStrategy[];
  patternProgress: Record<string, PatternProgress>;
}): BatchObservation {
  return {
    batchNumber: input.batchNumber,
    currentBatch: createBatchPerformance(
      input.batchNumber,
      input.attempts,
      input.currentBatch.questions,
    ),
    pastBatches: input.pastBatches,
    previousStrategies: input.previousStrategies,
    patternProgress: input.patternProgress,
    consecutivePatternErrors: calculateConsecutiveErrors(
      input.attempts,
      input.currentBatch.questions,
    ),
  };
}

export function createInitialObservation(
  patternProgress: Record<string, PatternProgress>,
): BatchObservation {
  return {
    batchNumber: 0,
    currentBatch: {
      batchNumber: 0,
      total: 0,
      correct: 0,
      accuracy: 0,
      patternStats: [],
    },
    pastBatches: [],
    previousStrategies: [],
    patternProgress,
    consecutivePatternErrors: {},
  };
}

export function getPatternPerformance(
  performance: BatchPerformance,
  patternId: string,
) {
  return performance.patternStats.find((item) => item.patternId === patternId);
}

export function countConsecutiveWeakBatches(
  patternId: string,
  pastBatches: BatchPerformance[],
  currentBatch: BatchPerformance,
  threshold = 60,
): number {
  let count = 0;
  const ordered = [...pastBatches, currentBatch].sort(
    (left, right) => right.batchNumber - left.batchNumber,
  );

  for (const performance of ordered) {
    const stat = getPatternPerformance(performance, patternId);
    const isWeak =
      stat &&
      stat.total > 0 &&
      stat.accuracy < threshold &&
      (stat.total >= 2 || stat.correct === 0);
    if (!isWeak) break;
    count += 1;
  }

  return count;
}
