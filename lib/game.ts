import type { GameSession, Question } from "@/types/content";

export const QUESTIONS_PER_CHALLENGE = 10;
export const XP_PER_CORRECT = 10;
export const XP_STREAK_BONUS = 2;
export const XP_MAX_STREAK_BONUS = 6;
export const XP_PER_LEVEL = 300;

export function createGameSession(
  challengeId: string,
  questionIds: string[],
): GameSession {
  return {
    challengeId,
    questionIds,
    currentIndex: 0,
    answers: {},
    results: {},
    isSubmitted: false,
    isFinished: false,
    correctCount: 0,
    earnedXp: 0,
  };
}

export function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[.,!?;:，。！？；：]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAnswerCorrect(
  question: Question,
  answer: string | string[],
): boolean {
  const expected = Array.isArray(question.answer)
    ? question.answer.map(normalizeAnswer)
    : [normalizeAnswer(question.answer)];
  const actual = Array.isArray(answer)
    ? answer.map(normalizeAnswer)
    : [normalizeAnswer(answer)];

  return (
    expected.length === actual.length &&
    expected.every((value, index) => value === actual[index])
  );
}

export function formatAnswer(answer: string | string[]): string {
  return Array.isArray(answer) ? answer.join(" / ") : answer;
}

export function calculateCurrentStreak(
  questionIds: string[],
  results: Record<string, boolean>,
  upToIndex: number,
): number {
  let streak = 0;
  for (let index = upToIndex; index >= 0; index -= 1) {
    if (results[questionIds[index]] !== true) break;
    streak += 1;
  }
  return streak;
}

export function calculateQuestionXp(isCorrect: boolean, streak: number): number {
  if (!isCorrect) return 0;
  const streakBonus = Math.min(
    Math.max(streak - 1, 0) * XP_STREAK_BONUS,
    XP_MAX_STREAK_BONUS,
  );
  return XP_PER_CORRECT + streakBonus;
}

export function calculateStars(
  correctAnswers: number,
  totalQuestions: number,
): 1 | 2 | 3 {
  const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

export function calculateCompletionBonus(stars: 1 | 2 | 3): number {
  return 20 + stars * 10;
}

export function getLevelFromXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export function getLevelProgress(xp: number) {
  const safeXp = Math.max(0, xp);
  const level = getLevelFromXp(safeXp);
  const currentLevelXp = (level - 1) * XP_PER_LEVEL;
  const currentXp = safeXp - currentLevelXp;

  return {
    level,
    currentXp,
    xpForNextLevel: XP_PER_LEVEL,
    percent: Math.min(100, Math.round((currentXp / XP_PER_LEVEL) * 100)),
  };
}

export function getCorrectRate(correctAnswers: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0;
  return Math.round((correctAnswers / totalQuestions) * 100);
}
