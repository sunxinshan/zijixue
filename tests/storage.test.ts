import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialAgentStorage,
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
