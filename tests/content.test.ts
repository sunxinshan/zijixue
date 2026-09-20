import assert from "node:assert/strict";
import test from "node:test";

import {
  comparativesKnowledgePointIds,
  comparativesKnowledgePoints,
  comparativesQuestions,
  comparativesSection,
} from "@/data/content/comparatives";

test("首批内容包含五类规则和全部十项来源练习", () => {
  assert.equal(comparativesKnowledgePoints.length, 5);
  assert.deepEqual(
    comparativesKnowledgePoints.map((point) => point.id),
    [...comparativesKnowledgePointIds],
  );

  const sourceExerciseIds = new Set(
    comparativesQuestions.map((question) => question.sourceQuestionId),
  );
  for (let index = 1; index <= 10; index += 1) {
    assert.ok(sourceExerciseIds.has(`exercise-${index}`));
  }
  assert.equal(comparativesSection.questionIds.length, comparativesQuestions.length);
});

test("题目 ID 唯一，并且每道题关联有效知识点", () => {
  const ids = comparativesQuestions.map((question) => question.id);
  assert.equal(new Set(ids).size, ids.length);

  const knowledgePointIds = new Set<string>(comparativesKnowledgePointIds);
  for (const question of comparativesQuestions) {
    assert.ok(question.knowledgePointIds.length > 0);
    for (const knowledgePointId of question.knowledgePointIds) {
      assert.ok(knowledgePointIds.has(knowledgePointId));
    }
  }
});

test("内容覆盖选择、填空和句子翻译三种题型", () => {
  const types = new Set(comparativesQuestions.map((question) => question.type));
  assert.ok(types.has("choice"));
  assert.ok(types.has("fill-blank"));
  assert.ok(types.has("sentence-translation"));
});
