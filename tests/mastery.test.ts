import assert from "node:assert/strict";
import test from "node:test";

import { comparativeKnowledge, getSubtopic } from "@/data/knowledge/comparative";
import { applyBatchToPatternProgress } from "@/lib/agent/coverage";
import { createInitialLearningState, getMasteryMeta } from "@/lib/mastery";
import type { Attempt, Question } from "@/types/agent";

test("Subtopic LearningState 初始化包含 Pattern Progress", () => {
  const state = createInitialLearningState(
    "local-user",
    "comparative",
    1,
    "subtopic",
    "comparative-form-rules",
  );
  assert.equal(state.scope, "subtopic");
  assert.equal(state.subtopicId, "comparative-form-rules");
  assert.equal(state.completed, false);
  assert.deepEqual(state.patternProgress, {});
});

test("irregular 只覆盖 good 时 Coverage 不完整", () => {
  const subtopic = getSubtopic(comparativeKnowledge, "comparative-form-rules");
  assert.ok(subtopic);
  const question: Question = {
    id: "irregular-good",
    type: "choice",
    question: "good 的比较级是？",
    options: ["better", "gooder"],
    answer: "better",
    explanation: "good 不规则。",
    knowledgeId: "comparative",
    knowledgeSubtopic: "comparative-form-rules",
    patternId: "irregular",
    coverageItemId: "good",
    difficulty: 1,
  };
  const attempt: Attempt = {
    id: "a1",
    sessionId: "s1",
    knowledgeId: "comparative",
    subtopicId: "comparative-form-rules",
    patternId: "irregular",
    coverageItemId: "good",
    questionId: question.id,
    answer: "better",
    correct: true,
    timestamp: 1,
  };

  const progress = applyBatchToPatternProgress(
    subtopic.patterns,
    [question],
    [attempt],
  );
  assert.equal(progress.irregular.coverageComplete, false);
  assert.deepEqual(progress.irregular.coveredItems, ["good"]);
});

test("掌握度文字等级保留游戏化展示", () => {
  assert.equal(getMasteryMeta(10).label, "初学");
  assert.equal(getMasteryMeta(90).icon, "🌲");
});
