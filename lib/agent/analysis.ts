import type {
  Attempt,
  BatchObservation,
  BatchPerformance,
  Knowledge,
  Question,
  QuestionBatch,
  SubtopicPerformance,
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
    const subtopic = questionById.get(attempt.questionId)?.knowledgeSubtopic;
    if (!subtopic) continue;
    const current = stats.get(subtopic) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (attempt.correct) current.correct += 1;
    stats.set(subtopic, current);
  }

  const correct = attempts.filter((attempt) => attempt.correct).length;
  return {
    batchNumber,
    total: attempts.length,
    correct,
    accuracy: attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0,
    subtopicStats: Array.from(stats.entries()).map(([subtopic, value]) => ({
      subtopic,
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
    const subtopic = question.knowledgeSubtopic;

    if (attempt.correct) {
      currentRun[subtopic] = 0;
      continue;
    }

    currentRun[subtopic] = (currentRun[subtopic] ?? 0) + 1;
    maxRun[subtopic] = Math.max(maxRun[subtopic] ?? 0, currentRun[subtopic]);
  }

  return maxRun;
}

export function analyzeBatch(input: {
  batchNumber: number;
  attempts: Attempt[];
  currentBatch: QuestionBatch;
  pastBatches: BatchPerformance[];
  previousStrategies: TeachingStrategy[];
}): BatchObservation {
  const currentBatch = createBatchPerformance(
    input.batchNumber,
    input.attempts,
    input.currentBatch.questions,
  );

  return {
    batchNumber: input.batchNumber,
    currentBatch,
    pastBatches: input.pastBatches,
    previousStrategies: input.previousStrategies,
    consecutiveSubtopicErrors: calculateConsecutiveErrors(
      input.attempts,
      input.currentBatch.questions,
    ),
  };
}

export function createInitialObservation(): BatchObservation {
  return {
    batchNumber: 0,
    currentBatch: {
      batchNumber: 0,
      total: 0,
      correct: 0,
      accuracy: 0,
      subtopicStats: [],
    },
    pastBatches: [],
    previousStrategies: [],
    consecutiveSubtopicErrors: {},
  };
}

export function getSubtopicPerformance(
  performance: BatchPerformance,
  subtopic: string,
): SubtopicPerformance | undefined {
  return performance.subtopicStats.find((item) => item.subtopic === subtopic);
}

export function countConsecutiveWeakBatches(
  subtopic: string,
  pastBatches: BatchPerformance[],
  currentBatch: BatchPerformance,
  threshold = 60,
): number {
  let count = 0;
  const ordered = [...pastBatches, currentBatch].sort(
    (left, right) => right.batchNumber - left.batchNumber,
  );

  for (const performance of ordered) {
    const stat = getSubtopicPerformance(performance, subtopic);
    const isWeak =
      stat &&
      stat.total > 0 &&
      stat.accuracy < threshold &&
      (stat.total >= 3 || stat.correct === 0);
    if (!isWeak) break;
    count += 1;
  }

  return count;
}

export function hasSubtopic(knowledge: Knowledge, subtopic: string): boolean {
  return knowledge.subtopics.some((item) => item.id === subtopic);
}
