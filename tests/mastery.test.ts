import assert from "node:assert/strict";
import test from "node:test";

import { comparativeKnowledge } from "@/data/knowledge/comparative";
import {
  buildLearningStateFromSummary,
  createInitialLearningState,
  getMasteryMeta,
} from "@/lib/mastery";

test("LearningState 初值包含 strategyLevel，不使用固定逐题加减公式", () => {
  const state = createInitialLearningState("local-user", "comparative", 1);
  assert.equal(state.mastery, 0);
  assert.equal(state.currentDifficulty, 1);
  assert.equal(state.strategyLevel, 1);
  assert.deepEqual(state.strengths, []);
});

test("Agent SessionSummary 和最终 TeachingStrategy 更新 LearningState", () => {
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
        diagnosis: "persistent_failure",
        strategyLevel: 4,
        action: "change_strategy",
        focus: ["y-ending"],
        difficulty: 3,
        questionDistribution: [
          { subtopic: "y-ending", count: 6 },
          { subtopic: "regular", count: 4 },
        ],
        explanation: "重新解释 y 结尾变化。",
        examples: ["happy → happier → happiest"],
        reason: "连续多个 batch 失败。",
      },
    ],
    10,
  );

  assert.equal(next.mastery, 78);
  assert.equal(next.currentDifficulty, 3);
  assert.equal(next.strategyLevel, 4);
  assert.deepEqual(next.recommendedFocus, ["y-ending"]);
  assert.equal(next.updatedAt, 10);
});

test("掌握度文字等级保留原有游戏化展示", () => {
  assert.equal(getMasteryMeta(10).label, "初学");
  assert.equal(getMasteryMeta(90).icon, "🌲");
});
