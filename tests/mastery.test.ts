import assert from "node:assert/strict";
import test from "node:test";

import { applyAttemptToMastery, getMasteryMeta } from "@/lib/mastery";

test("答对增加掌握度和连续答对次数", () => {
  const first = applyAttemptToMastery(
    undefined,
    "comparative-basic",
    true,
    "2026-09-20T00:00:00.000Z",
  );
  assert.equal(first.mastery, 10);
  assert.equal(first.correctCount, 1);
  assert.equal(first.streak, 1);

  const second = applyAttemptToMastery(
    first,
    "comparative-basic",
    true,
    "2026-09-20T00:01:00.000Z",
  );
  assert.equal(second.mastery, 22);
  assert.equal(second.correctCount, 2);
  assert.equal(second.streak, 2);
});

test("答错扣除掌握度并重置连续答对次数", () => {
  const current = {
    knowledgePointId: "comparative-basic",
    mastery: 30,
    correctCount: 3,
    wrongCount: 0,
    streak: 3,
  };
  const next = applyAttemptToMastery(
    current,
    "comparative-basic",
    false,
    "2026-09-20T00:02:00.000Z",
  );
  assert.equal(next.mastery, 25);
  assert.equal(next.wrongCount, 1);
  assert.equal(next.streak, 0);
});

test("掌握度始终限制在 0 到 100", () => {
  const high = applyAttemptToMastery(
    {
      knowledgePointId: "comparative-basic",
      mastery: 98,
      correctCount: 10,
      wrongCount: 0,
      streak: 4,
    },
    "comparative-basic",
    true,
    "2026-09-20T00:03:00.000Z",
  );
  assert.equal(high.mastery, 100);

  const low = applyAttemptToMastery(
    {
      knowledgePointId: "comparative-basic",
      mastery: 2,
      correctCount: 0,
      wrongCount: 2,
      streak: 0,
    },
    "comparative-basic",
    false,
    "2026-09-20T00:04:00.000Z",
  );
  assert.equal(low.mastery, 0);
});

test("掌握度文字等级符合产品定义", () => {
  assert.equal(getMasteryMeta(10).label, "初学");
  assert.equal(getMasteryMeta(30).label, "学习中");
  assert.equal(getMasteryMeta(60).label, "基本掌握");
  assert.equal(getMasteryMeta(90).label, "熟练掌握");
});
