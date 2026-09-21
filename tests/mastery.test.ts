import assert from "node:assert/strict";
import test from "node:test";

import { comparativeKnowledge } from "@/data/knowledge/comparative";
import {
  buildLearningStateFromSummary,
  createInitialLearningState,
  getMasteryMeta,
} from "@/lib/mastery";

test("LearningState 初值为空，不使用固定逐题加减公式", () => {
  const state = createInitialLearningState("local-user", "comparative", 1);
  assert.equal(state.mastery, 0);
  assert.equal(state.currentDifficulty, 1);
  assert.deepEqual(state.strengths, []);
});

test("Agent SessionSummary 更新长期 LearningState", () => {
  const current = createInitialLearningState("local-user", "comparative", 1);
  const next = buildLearningStateFromSummary(
    current,
    comparativeKnowledge,
    {
      mastery: 78,
      strengths: ["一般情况"],
      weaknesses: ["y 结尾变化"],
      recommendedFocus: ["y-ending"],
      summary: "基本规则稳定，y 结尾仍需练习。",
    },
    [
      {
        action: "finish",
        focus: ["y-ending"],
        difficulty: 3,
        reason: "需要巩固。",
      },
    ],
    10,
  );

  assert.equal(next.mastery, 78);
  assert.equal(next.currentDifficulty, 3);
  assert.deepEqual(next.recommendedFocus, ["y-ending"]);
  assert.equal(next.updatedAt, 10);
});

test("掌握度文字等级保留原有游戏化展示", () => {
  assert.equal(getMasteryMeta(10).label, "初学");
  assert.equal(getMasteryMeta(90).icon, "🌲");
});
