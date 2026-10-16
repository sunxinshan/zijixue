import assert from "node:assert/strict";
import test from "node:test";

import {
  comparativeKnowledge,
  getSubtopic,
} from "@/data/knowledge/comparative";
import { createInitialLearningState } from "@/lib/mastery";
import {
  createInitialAgentStorage,
  expandLegacyLearningState,
  getLessonCheckProgressBySubtopic,
  isSubtopicLessonUnlocked,
  mergeLearningState,
  migrateLegacyStorage,
  recoverMissingSubtopicStates,
} from "@/lib/storage";

test("v2 Storage 使用 LearningState、Session、Attempt、Question 和 LessonProgress 数据", () => {
  const storage = createInitialAgentStorage();
  assert.deepEqual(Object.keys(storage).sort(), [
    "attempts",
    "learningStates",
    "lessonCheckProgress",
    "lessonProgress",
    "questions",
    "sessions",
    "userId",
    "version",
  ]);
});

test("理解检查答案可按 Pattern 从存储中恢复", () => {
  const storage = createInitialAgentStorage();
  const withCheck = {
    ...storage,
    lessonCheckProgress: {
      "comparative:comparative-basic:comparative-than": {
        knowledgeId: "comparative",
        subtopicId: "comparative-basic",
        patternId: "comparative-than",
        answers: { "comparative-than-who": "I" },
        passed: false,
        updatedAt: 1,
      },
    },
  };

  assert.deepEqual(
    getLessonCheckProgressBySubtopic(
      withCheck,
      "comparative",
      "comparative-basic",
    )["comparative-than"].answers,
    { "comparative-than-who": "I" },
  );
});

test("Subtopic 阅读完成后整体解锁，并兼容旧 Pattern 解锁记录", () => {
  const subtopic = getSubtopic(comparativeKnowledge, "comparative-basic");
  assert.ok(subtopic);
  const storage = createInitialAgentStorage();

  assert.equal(
    isSubtopicLessonUnlocked(storage, "comparative", subtopic),
    false,
  );

  const subtopicUnlocked = {
    ...storage,
    lessonProgress: {
      "comparative:comparative-basic": {
        knowledgeId: "comparative",
        subtopicId: "comparative-basic",
        completed: true,
      },
    },
  };
  assert.equal(
    isSubtopicLessonUnlocked(subtopicUnlocked, "comparative", subtopic),
    true,
  );

  const partiallyUnlocked = {
    ...storage,
    lessonProgress: {
      "comparative:comparative-basic:comparative-form": {
        knowledgeId: "comparative",
        subtopicId: "comparative-basic",
        patternId: "comparative-form",
        completed: true,
      },
    },
  };
  assert.equal(
    isSubtopicLessonUnlocked(partiallyUnlocked, "comparative", subtopic),
    false,
  );

  const legacyPatternUnlocks = {
    ...storage,
    lessonProgress: Object.fromEntries(
      subtopic.patterns.map((pattern) => [
        `comparative:comparative-basic:${pattern.id}`,
        {
          knowledgeId: "comparative",
          subtopicId: "comparative-basic",
          patternId: pattern.id,
          completed: true,
        },
      ]),
    ),
  };
  assert.equal(
    isSubtopicLessonUnlocked(legacyPatternUnlocks, "comparative", subtopic),
    true,
  );

  const legacyState = {
    ...createInitialLearningState(
      "local-user",
      "comparative",
      1,
      "subtopic",
      "comparative-basic",
    ),
    patternProgress: {
      "comparative-form": {
        patternId: "comparative-form",
        attemptedQuestions: 1,
        correctQuestions: 1,
        coveredItems: ["tall"],
        coverageComplete: false,
      },
    },
  };
  assert.equal(
    isSubtopicLessonUnlocked(storage, "comparative", subtopic, legacyState),
    true,
  );
});

test("旧版 mastery、XP 和星星可迁移到 LearningState v2", () => {
  const migrated = migrateLegacyStorage(
    JSON.stringify({
      player: { xp: 198, totalStars: 3 },
      mastery: {
        "comparative-basic": { knowledgePointId: "comparative-basic", mastery: 20 },
        "comparative-y-ending": {
          knowledgePointId: "comparative-y-ending",
          mastery: 40,
        },
      },
    }),
  );

  assert.ok(migrated);
  assert.equal(migrated.legacyXp, 198);
  assert.equal(migrated.legacyStars, 3);
  assert.equal(migrated.learningStates[0].knowledgeId, "comparative");
  assert.equal(migrated.learningStates[0].mastery, 30);
});

test("完成一个 Subtopic 不会覆盖其他 Subtopic LearningState", () => {
  const comparative = {
    ...createInitialLearningState(
      "local-user",
      "comparative",
      1,
      "subtopic",
      "comparative-basic",
    ),
    mastery: 80,
  };
  const superlative = {
    ...createInitialLearningState(
      "local-user",
      "comparative",
      1,
      "subtopic",
      "superlative-basic",
    ),
    mastery: 60,
  };
  const updatedSuperlative = { ...superlative, mastery: 90 };
  const merged = mergeLearningState(
    [comparative, superlative],
    updatedSuperlative,
  );

  assert.equal(merged.length, 2);
  assert.equal(
    merged.find((state) => state.subtopicId === "comparative-basic")?.mastery,
    80,
  );
  assert.equal(
    merged.find((state) => state.subtopicId === "superlative-basic")?.mastery,
    90,
  );
});

test("缺失的 Subtopic LearningState 可从完成 Session 恢复", () => {
  const storage = createInitialAgentStorage();
  const question = {
    id: "q1",
    type: "choice" as const,
    question: "选择正确的词",
    options: ["the", "a"],
    answer: "the",
    explanation: "最高级前用 the",
    knowledgeId: "comparative",
    knowledgeSubtopic: "superlative-basic",
    patternId: "superlative-the",
    difficulty: 1 as const,
  };
  const recovered = recoverMissingSubtopicStates({
    ...storage,
    sessions: [
      {
        id: "session-1",
        userId: "local-user",
        knowledgeId: "comparative",
        mode: "subtopic",
        subtopicId: "superlative-basic",
        startedAt: 1,
        endedAt: 2,
        status: "completed",
        sessionSummary: {
          mastery: 80,
          strengths: ["the + 最高级"],
          weaknesses: [],
          recommendedFocus: [],
          summary: "恢复测试",
        },
      },
    ],
    questions: [question],
    attempts: [
      {
        id: "a1",
        sessionId: "session-1",
        knowledgeId: "comparative",
        subtopicId: "superlative-basic",
        patternId: "superlative-the",
        questionId: "q1",
        answer: "the",
        correct: true,
        timestamp: 2,
      },
    ],
  });

  const state = recovered.learningStates.find(
    (item) => item.subtopicId === "superlative-basic",
  );
  assert.ok(state);
  assert.equal(state.mastery, 80);
  assert.equal(state.patternProgress["superlative-the"].attemptedQuestions, 1);
});

test("旧 form-change LearningState 会拆分迁移到 V3 Subtopic", () => {
  const legacy = {
    ...createInitialLearningState(
      "local-user",
      "comparative",
      Date.now(),
      "subtopic",
      "form-change",
    ),
    patternProgress: {
      regular: {
        patternId: "regular",
        attemptedQuestions: 3,
        correctQuestions: 3,
        coveredItems: ["long", "tall", "fast"],
        coverageComplete: true,
      },
      "more-most": {
        patternId: "more-most",
        attemptedQuestions: 4,
        correctQuestions: 3,
        coveredItems: ["popular", "famous"],
        coverageComplete: true,
      },
    },
  };
  const migrated = expandLegacyLearningState(legacy);
  assert.equal(migrated.length, 2);
  assert.ok(migrated.some((state) => state.subtopicId === "comparative-form-rules"));
  assert.ok(migrated.some((state) => state.subtopicId === "comparative-more-most"));
});
