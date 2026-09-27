import assert from "node:assert/strict";
import test from "node:test";

import { createInitialLearningState } from "@/lib/mastery";
import {
  createInitialAgentStorage,
  mergeLearningState,
  migrateLegacyStorage,
} from "@/lib/storage";

test("v2 Storage 使用 LearningState、Session、Attempt、Question 四类数据", () => {
  const storage = createInitialAgentStorage();
  assert.deepEqual(Object.keys(storage).sort(), [
    "attempts",
    "learningStates",
    "questions",
    "sessions",
    "userId",
    "version",
  ]);
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
