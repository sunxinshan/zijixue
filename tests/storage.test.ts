import assert from "node:assert/strict";
import test from "node:test";

import { buildChallengeRecord, getChallengeSummary } from "@/lib/storage";

test("挑战记录包含答题 XP 和完成奖励", () => {
  const challenge = buildChallengeRecord({
    id: "challenge-test",
    questionIds: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"],
    knowledgePointIds: ["comparative-basic"],
    correctAnswers: 10,
    questionXp: 118,
    stars: 3,
    startedAt: "2026-09-20T00:00:00.000Z",
    completedAt: "2026-09-20T00:05:00.000Z",
  });

  assert.equal(challenge.earnedXp, 168);
  assert.deepEqual(getChallengeSummary(challenge), {
    accuracy: 100,
    completionBonus: 50,
  });
});
