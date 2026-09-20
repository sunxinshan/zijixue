import assert from "node:assert/strict";
import test from "node:test";

import { comparativesQuestions } from "@/data/content/comparatives";
import { getQuestionWeight, selectQuestions } from "@/lib/question-selector";

test("一轮抽题不会重复，并默认抽取十道题", () => {
  const selected = selectQuestions(comparativesQuestions, {
    count: 10,
    random: () => 0,
  });
  assert.equal(selected.length, 10);
  assert.equal(new Set(selected.map((question) => question.id)).size, 10);
});

test("低掌握度知识点获得更高抽题权重", () => {
  const question = comparativesQuestions.find(
    (item) => item.id === "good-comparative-choice",
  );
  assert.ok(question);
  assert.equal(
    getQuestionWeight(question, {
      "comparative-irregular": {
        knowledgePointId: "comparative-irregular",
        mastery: 20,
        correctCount: 0,
        wrongCount: 0,
        streak: 0,
      },
    }),
    80,
  );
});

test("题池不足十题时返回全部题目", () => {
  const selected = selectQuestions(comparativesQuestions.slice(0, 3), {
    count: 10,
    random: () => 0.5,
  });
  assert.equal(selected.length, 3);
});
