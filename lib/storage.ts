import { getKnowledge, getSubtopic } from "@/data/knowledge/comparative";
import { applyBatchToPatternProgress } from "@/lib/agent/coverage";
import { createInitialLearningState } from "@/lib/mastery";
import type {
  AppStorage,
  Knowledge,
  Attempt,
  Difficulty,
  LearningSession,
  LearningState,
  Question,
  SessionSummary,
} from "@/types/agent";

export const STORAGE_KEY = "english-forest";
export const LEGACY_STORAGE_KEY = "english-forest:v1";
export const STORAGE_CHANGE_EVENT = "english-forest:storage-change";

interface LegacyMastery {
  knowledgePointId: string;
  mastery: number;
}

interface LegacyStorage {
  player?: {
    xp?: number;
    totalStars?: number;
  };
  mastery?: Record<string, LegacyMastery>;
  attempts?: unknown[];
  challenges?: unknown[];
}

const LEGACY_SUBTOPIC_ID_MAP: Record<string, string> = {
  "form-change": "comparative-form-rules",
  "as-as": "comparative-as-as",
};

function normalizeSubtopicId(subtopicId: string | undefined): string | undefined {
  if (!subtopicId) return subtopicId;
  return LEGACY_SUBTOPIC_ID_MAP[subtopicId] ?? subtopicId;
}

export function expandLegacyLearningState(state: LearningState): LearningState[] {
  if (state.subtopicId !== "form-change") {
    return [{ ...state, subtopicId: normalizeSubtopicId(state.subtopicId) }];
  }

  const knowledge = getKnowledge(state.knowledgeId);
  const formRules = knowledge ? getSubtopic(knowledge, "comparative-form-rules") : undefined;
  const moreMost = knowledge ? getSubtopic(knowledge, "comparative-more-most") : undefined;
  if (!formRules || !moreMost) {
    return [{ ...state, subtopicId: "comparative-form-rules" }];
  }

  const formPatternIds = new Set(formRules.patterns.map((pattern) => pattern.id));
  const morePatternIds = new Set(moreMost.patterns.map((pattern) => pattern.id));
  const formProgress = Object.fromEntries(
    Object.entries(state.patternProgress).filter(([patternId]) =>
      formPatternIds.has(patternId),
    ),
  );
  const moreProgress = Object.fromEntries(
    Object.entries(state.patternProgress).filter(([patternId]) =>
      morePatternIds.has(patternId),
    ),
  );

  return [
    {
      ...state,
      subtopicId: "comparative-form-rules",
      patternProgress: formProgress,
      completed: false,
    },
    {
      ...state,
      subtopicId: "comparative-more-most",
      patternProgress: moreProgress,
      completed: false,
    },
  ];
}

const serverStorageSnapshot = createInitialAgentStorage();
let cachedRawStorage: string | null | undefined;
let cachedStorage: AppStorage | null = null;

export function createInitialAgentStorage(): AppStorage {
  return {
    version: 2,
    userId: "local-user",
    learningStates: [],
    sessions: [],
    attempts: [],
    questions: [],
  };
}

export function migrateLegacyStorage(raw: string): AppStorage | null {
  try {
    const legacy = JSON.parse(raw) as LegacyStorage;
    const masteryValues = Object.values(legacy.mastery ?? {}).map(
      (item) => item.mastery,
    );
    const averageMastery =
      masteryValues.length > 0
        ? Math.round(
            masteryValues.reduce((total, value) => total + value, 0) /
              masteryValues.length,
          )
        : 0;

    return {
      ...createInitialAgentStorage(),
      learningStates:
        masteryValues.length > 0
          ? [
              {
                userId: "local-user",
                knowledgeId: "comparative",
                scope: "knowledge",
                mastery: averageMastery,
                strengths: [],
                weaknesses: [],
                currentDifficulty: 1,
                recommendedFocus: [],
                strategyLevel: 1,
                patternProgress: {},
                completed: false,
                summary: "由旧版固定掌握度迁移，下一次超级大脑 Session 会重新评估。",
                updatedAt: Date.now(),
              },
            ]
          : [],
      legacyXp: legacy.player?.xp ?? 0,
      legacyStars: legacy.player?.totalStars ?? 0,
    };
  } catch {
    return null;
  }
}

export function recoverMissingSubtopicStates(storage: AppStorage): AppStorage {
  const states = [...storage.learningStates];

  const completedSessions = storage.sessions
    .filter(
      (session) =>
        session.status === "completed" &&
        session.mode === "subtopic" &&
        Boolean(session.subtopicId) &&
        Boolean(session.sessionSummary),
    )
    .sort((left, right) => left.startedAt - right.startedAt);

  for (const session of completedSessions) {
    const subtopicId = session.subtopicId;
    if (!subtopicId || !session.sessionSummary) continue;
    if (
      states.some(
        (state) =>
          state.knowledgeId === session.knowledgeId &&
          state.scope === "subtopic" &&
          state.subtopicId === subtopicId,
      )
    ) {
      continue;
    }

    const knowledge = getKnowledge(session.knowledgeId);
    const subtopic = knowledge ? getSubtopic(knowledge, subtopicId) : undefined;
    if (!knowledge || !subtopic) continue;

    const attempts = storage.attempts.filter(
      (attempt) => attempt.sessionId === session.id,
    );
    const questionIds = new Set(attempts.map((attempt) => attempt.questionId));
    const questions = storage.questions.filter((question) =>
      questionIds.has(question.id),
    );
    const patternProgress = applyBatchToPatternProgress(
      subtopic.patterns,
      questions,
      attempts,
    );
    const totalAttempted = Object.values(patternProgress).reduce(
      (sum, progress) => sum + progress.attemptedQuestions,
      0,
    );
    const coverageComplete = subtopic.patterns.every(
      (pattern) =>
        !pattern.required || patternProgress[pattern.id]?.coverageComplete,
    );
    const maxDifficulty = questions.reduce<Difficulty>(
      (max, question) =>
        Math.max(max, question.difficulty) as Difficulty,
      1,
    );
    const state = createInitialLearningState(
      session.userId,
      session.knowledgeId,
      session.endedAt ?? session.startedAt,
      "subtopic",
      subtopicId,
    );

    states.push({
      ...state,
      mastery: session.sessionSummary.mastery,
      strengths: session.sessionSummary.strengths,
      weaknesses: session.sessionSummary.weaknesses,
      recommendedFocus: session.sessionSummary.recommendedFocus,
      currentDifficulty: maxDifficulty,
      patternProgress,
      completed:
        coverageComplete && totalAttempted >= subtopic.minimumQuestions,
      summary: session.sessionSummary.summary,
    });
  }

  return { ...storage, learningStates: states };
}

function parseAgentStorage(raw: string | null): AppStorage {
  if (!raw) return createInitialAgentStorage();

  try {
    const parsed = JSON.parse(raw) as Partial<AppStorage>;
    if (parsed.version !== 2) {
      throw new Error("unsupported storage version");
    }

    const normalized: AppStorage = {
      version: 2,
      userId: parsed.userId ?? "local-user",
      learningStates: Array.isArray(parsed.learningStates)
        ? parsed.learningStates.flatMap((state) =>
            expandLegacyLearningState({
              ...state,
              scope: state.scope ?? "knowledge",
              patternProgress: state.patternProgress ?? {},
              completed: state.completed ?? false,
              strategyLevel: state.strategyLevel ?? 1,
            }),
          )
        : [],
      sessions: Array.isArray(parsed.sessions)
        ? parsed.sessions.map((session) => ({
            ...session,
            subtopicId: normalizeSubtopicId(session.subtopicId),
            mode: session.mode ?? "challenge",
          }))
        : [],
      attempts: Array.isArray(parsed.attempts)
        ? parsed.attempts.map((attempt) => ({
            ...attempt,
            subtopicId: normalizeSubtopicId(attempt.subtopicId),
          }))
        : [],
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.map((question) => ({
            ...question,
            knowledgeSubtopic:
              normalizeSubtopicId(question.knowledgeSubtopic) ??
              question.knowledgeSubtopic,
          }))
        : [],
      legacyXp: parsed.legacyXp,
      legacyStars: parsed.legacyStars,
    };
    return recoverMissingSubtopicStates(normalized);
  } catch {
    return createInitialAgentStorage();
  }
}

export function getAgentStorageSnapshot(): AppStorage {
  if (typeof window === "undefined") return serverStorageSnapshot;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRawStorage && cachedStorage) return cachedStorage;

  if (raw) {
    const parsedRaw = JSON.parse(raw) as Partial<AppStorage>;
    cachedStorage = parseAgentStorage(raw);
    if (
      cachedStorage.learningStates.length >
      (Array.isArray(parsedRaw.learningStates)
        ? parsedRaw.learningStates.length
        : 0)
    ) {
      const recoveredRaw = JSON.stringify(cachedStorage);
      window.localStorage.setItem(STORAGE_KEY, recoveredRaw);
      cachedRawStorage = recoveredRaw;
    } else {
      cachedRawStorage = raw;
    }
    return cachedStorage;
  }

  const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  const migrated = legacyRaw ? migrateLegacyStorage(legacyRaw) : null;
  cachedRawStorage = raw;
  cachedStorage = migrated ?? createInitialAgentStorage();

  if (migrated) {
    const migratedRaw = JSON.stringify(migrated);
    window.localStorage.setItem(STORAGE_KEY, migratedRaw);
    cachedRawStorage = migratedRaw;
  }

  return cachedStorage;
}

export function getServerAgentStorageSnapshot(): AppStorage {
  return serverStorageSnapshot;
}

export function subscribeToAgentStorage(onStoreChange: () => void): () => void {
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

export function loadAgentStorage(): AppStorage {
  return getAgentStorageSnapshot();
}

export function saveAgentStorage(storage: AppStorage): void {
  if (typeof window === "undefined") return;

  const raw = JSON.stringify(storage);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRawStorage = raw;
  cachedStorage = storage;
  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
}

export function getLearningState(
  storage: AppStorage,
  knowledgeId: string,
): LearningState | undefined {
  return storage.learningStates.find(
    (state) =>
      state.knowledgeId === knowledgeId && state.scope === "knowledge",
  );
}

export function getSubtopicLearningState(
  storage: AppStorage,
  knowledgeId: string,
  subtopicId: string,
): LearningState | undefined {
  return storage.learningStates.find(
    (state) =>
      state.knowledgeId === knowledgeId &&
      state.scope === "subtopic" &&
      state.subtopicId === subtopicId,
  );
}

export function getSubtopicLearningStates(
  storage: AppStorage,
  knowledgeId: string,
): LearningState[] {
  return storage.learningStates.filter(
    (state) =>
      state.knowledgeId === knowledgeId && state.scope === "subtopic",
  );
}

export function isChallengeUnlocked(
  storage: AppStorage,
  knowledge: Knowledge,
): boolean {
  const states = getSubtopicLearningStates(storage, knowledge.id);
  return knowledge.subtopics.every((subtopic) =>
    states.some(
      (state) =>
        state.subtopicId === subtopic.id &&
        state.completed &&
        subtopic.patterns.every(
          (pattern) =>
            !pattern.required ||
            state.patternProgress[pattern.id]?.coverageComplete === true,
        ),
    ),
  );
}

export function mergeLearningState(
  states: LearningState[],
  state: LearningState,
): LearningState[] {
  return [
    ...states.filter(
      (item) =>
        !(
          item.knowledgeId === state.knowledgeId &&
          item.scope === state.scope &&
          item.subtopicId === state.subtopicId
        ),
    ),
    state,
  ];
}

export function upsertLearningState(state: LearningState): AppStorage {
  const current = loadAgentStorage();
  const next = {
    ...current,
    learningStates: mergeLearningState(current.learningStates, state),
  };
  saveAgentStorage(next);
  return next;
}

export function upsertSession(session: LearningSession): AppStorage {
  const current = loadAgentStorage();
  const next = {
    ...current,
    sessions: [
      ...current.sessions.filter((item) => item.id !== session.id),
      session,
    ],
  };
  saveAgentStorage(next);
  return next;
}

export function saveQuestions(questions: Question[]): AppStorage {
  const current = loadAgentStorage();
  const byId = new Map(current.questions.map((question) => [question.id, question]));
  for (const question of questions) byId.set(question.id, question);

  const next = {
    ...current,
    questions: Array.from(byId.values()).slice(-500),
  };
  saveAgentStorage(next);
  return next;
}

export function recordAttempt(attempt: Attempt): AppStorage {
  const current = loadAgentStorage();
  const next = {
    ...current,
    attempts: [...current.attempts, attempt],
  };
  saveAgentStorage(next);
  return next;
}

export function completeSession(
  sessionId: string,
  summary: SessionSummary,
  learningState: LearningState,
): AppStorage {
  const current = loadAgentStorage();
  const completedAt = Date.now();
  const next = {
    ...current,
    learningStates: mergeLearningState(
      current.learningStates,
      learningState,
    ),
    sessions: current.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            status: "completed" as const,
            endedAt: completedAt,
            sessionSummary: summary,
          }
        : session,
    ),
  };
  saveAgentStorage(next);
  return next;
}
