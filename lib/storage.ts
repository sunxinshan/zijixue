import { calculateCompletionBonus, getCorrectRate, getLevelFromXp } from "@/lib/game";
import { applyAttemptToMastery, createKnowledgeMastery } from "@/lib/mastery";
import type {
  AppStorage,
  Attempt,
  ChallengeRecord,
  PlayerProfile,
} from "@/types/content";

export const STORAGE_KEY = "english-forest:v1";
export const STORAGE_CHANGE_EVENT = "english-forest:storage-change";

const serverStorageSnapshot = createInitialAppStorage();
let cachedRawStorage: string | null | undefined;
let cachedStorage: AppStorage | null = null;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createInitialPlayer(now = new Date().toISOString()): PlayerProfile {
  return {
    id: createId("player"),
    level: 1,
    xp: 0,
    totalStars: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function createInitialAppStorage(): AppStorage {
  const player = createInitialPlayer();
  return {
    player,
    mastery: {},
    attempts: [],
    challenges: [],
  };
}

function parseAppStorage(raw: string | null): AppStorage {
  const fallback = createInitialAppStorage();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<AppStorage>;
    return {
      player: {
        ...fallback.player,
        ...(parsed.player ?? {}),
      },
      mastery:
        parsed.mastery && typeof parsed.mastery === "object"
          ? parsed.mastery
          : {},
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [],
    };
  } catch {
    return fallback;
  }
}

export function getServerAppStorageSnapshot(): AppStorage {
  return serverStorageSnapshot;
}

export function getAppStorageSnapshot(): AppStorage {
  if (typeof window === "undefined") return serverStorageSnapshot;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRawStorage && cachedStorage) {
    return cachedStorage;
  }

  cachedRawStorage = raw;
  cachedStorage = parseAppStorage(raw);
  return cachedStorage;
}

export function subscribeToAppStorage(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_CHANGE_EVENT, onStoreChange);
  };
}

export function loadAppStorage(): AppStorage {
  return getAppStorageSnapshot();
}

export function saveAppStorage(storage: AppStorage): void {
  if (typeof window === "undefined") return;

  const raw = JSON.stringify(storage);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRawStorage = raw;
  cachedStorage = storage;
  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
}

export interface CompleteChallengeInput {
  challenge: ChallengeRecord;
  attempts: Attempt[];
}

export function completeChallenge({
  challenge,
  attempts,
}: CompleteChallengeInput): AppStorage {
  const current = loadAppStorage();
  const existingChallenge = current.challenges.find(
    (item) => item.id === challenge.id,
  );

  if (existingChallenge) return current;

  const nextMastery = { ...current.mastery };

  for (const attempt of attempts) {
    for (const knowledgePointId of attempt.knowledgePointIds) {
      nextMastery[knowledgePointId] = applyAttemptToMastery(
        nextMastery[knowledgePointId] ?? createKnowledgeMastery(knowledgePointId),
        knowledgePointId,
        attempt.isCorrect,
        attempt.createdAt,
      );
    }
  }

  const xp = current.player.xp + challenge.earnedXp;
  const completedAt = challenge.completedAt ?? new Date().toISOString();
  const completedChallenge: ChallengeRecord = {
    ...challenge,
    completedAt,
  };

  const nextStorage: AppStorage = {
    player: {
      ...current.player,
      level: getLevelFromXp(xp),
      xp,
      totalStars: current.player.totalStars + challenge.stars,
      updatedAt: completedAt,
    },
    mastery: nextMastery,
    attempts: [...current.attempts, ...attempts],
    challenges: [...current.challenges, completedChallenge],
  };

  saveAppStorage(nextStorage);
  return nextStorage;
}

export function buildChallengeRecord(input: {
  id: string;
  questionIds: string[];
  knowledgePointIds: string[];
  correctAnswers: number;
  questionXp: number;
  stars: 1 | 2 | 3;
  startedAt: string;
  completedAt: string;
}): ChallengeRecord {
  return {
    id: input.id,
    knowledgePointIds: input.knowledgePointIds,
    questionIds: input.questionIds,
    totalQuestions: input.questionIds.length,
    correctAnswers: input.correctAnswers,
    earnedXp: input.questionXp + calculateCompletionBonus(input.stars),
    stars: input.stars,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  };
}

export function getChallengeSummary(challenge: ChallengeRecord) {
  return {
    accuracy: getCorrectRate(challenge.correctAnswers, challenge.totalQuestions),
    completionBonus: calculateCompletionBonus(challenge.stars),
  };
}
