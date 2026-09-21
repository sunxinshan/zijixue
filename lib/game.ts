import type {
  AppStorage,
  Attempt,
  Difficulty,
  Knowledge,
  Question,
} from "@/types/agent";

export const QUESTIONS_PER_BATCH = 15;
export const XP_PER_CORRECT = 10;
export const XP_PER_SESSION = 30;
export const XP_PER_LEVEL = 300;

export function createTimestamp(): number {
  return Date.now();
}

export function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function normalizeChoiceAnswer(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function evaluateQuestionAnswer(
  question: Question,
  answer: string | boolean,
): boolean {
  if (question.type === "true-false") {
    return typeof answer === "boolean" && answer === question.answer;
  }

  return (
    typeof answer === "string" &&
    typeof question.answer === "string" &&
    normalizeChoiceAnswer(answer) === normalizeChoiceAnswer(question.answer)
  );
}

export function getAttemptStats(attempts: Attempt[]) {
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const total = attempts.length;
  return {
    correct,
    total,
    wrong: total - correct,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}

export function calculateStars(correct: number, total: number): 1 | 2 | 3 {
  const accuracy = total > 0 ? correct / total : 0;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

export function getSessionAttempts(storage: AppStorage, sessionId: string) {
  return storage.attempts.filter((attempt) => attempt.sessionId === sessionId);
}

export function getSessionXp(storage: AppStorage, sessionId: string): number {
  const attempts = getSessionAttempts(storage, sessionId);
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const session = storage.sessions.find((item) => item.id === sessionId);
  return correct * XP_PER_CORRECT + (session?.status === "completed" ? XP_PER_SESSION : 0);
}

export function getTotalXp(storage: AppStorage): number {
  const attemptXp =
    storage.attempts.filter((attempt) => attempt.correct).length * XP_PER_CORRECT;
  const sessionXp =
    storage.sessions.filter((session) => session.status === "completed").length *
    XP_PER_SESSION;
  return (storage.legacyXp ?? 0) + attemptXp + sessionXp;
}

export function getLevelProgress(xp: number) {
  const safeXp = Math.max(0, xp);
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const currentXp = safeXp % XP_PER_LEVEL;

  return {
    level,
    currentXp,
    xpForNextLevel: XP_PER_LEVEL,
    percent: Math.round((currentXp / XP_PER_LEVEL) * 100),
  };
}

export interface SubtopicStats {
  subtopicId: string;
  title: string;
  correct: number;
  total: number;
  accuracy: number;
}

export function getSubtopicStats(
  storage: Pick<AppStorage, "attempts" | "questions">,
  knowledge: Knowledge,
): SubtopicStats[] {
  const questionById = new Map(
    storage.questions.map((question) => [question.id, question]),
  );

  return knowledge.subtopics.map((subtopic) => {
    const attempts = storage.attempts.filter(
      (attempt) =>
        questionById.get(attempt.questionId)?.knowledgeSubtopic === subtopic.id,
    );
    const correct = attempts.filter((attempt) => attempt.correct).length;
    return {
      subtopicId: subtopic.id,
      title: subtopic.title,
      correct,
      total: attempts.length,
      accuracy:
        attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0,
    };
  });
}

export function difficultyLabel(difficulty: Difficulty): string {
  return ["", "起步", "基础", "进阶", "挑战", "精通"][difficulty];
}
