import assert from "node:assert/strict";
import test from "node:test";

import { comparativesQuestions } from "@/data/content/comparatives";
import {
  calculateCurrentStreak,
  calculateQuestionXp,
  calculateStars,
  getCorrectRate,
  getLevelProgress,
  isAnswerCorrect,
  normalizeAnswer,
} from "@/lib/game";

test("答案判断忽略大小写、首尾空格和句末标点", () => {
  assert.equal(normalizeAnswer("  My Dog is Bigger than yours. "), "my dog is bigger than yours");
  const question = comparativesQuestions.find(
    (item) => item.id === "translate-dog-bigger",
  );
  assert.ok(question);
  assert.equal(isAnswerCorrect(question, "my dog is bigger than yours"), true);
  assert.equal(isAnswerCorrect(question, "My dog is biggest than yours."), false);
});

test("选择题答案判断准确", () => {
  const question = comparativesQuestions.find(
    (item) => item.id === "large-comparative-choice",
  );
  assert.ok(question);
  assert.equal(isAnswerCorrect(question, "larger"), true);
  assert.equal(isAnswerCorrect(question, "largeer"), false);
});

test("连续答对会获得少量 XP bonus", () => {
  assert.equal(calculateQuestionXp(false, 0), 0);
  assert.equal(calculateQuestionXp(true, 1), 10);
  assert.equal(calculateQuestionXp(true, 2), 12);
  assert.equal(calculateQuestionXp(true, 8), 16);
});

test("星级、正确率和等级进度可计算", () => {
  assert.equal(calculateStars(10, 10), 3);
  assert.equal(calculateStars(8, 10), 2);
  assert.equal(calculateStars(6, 10), 1);
  assert.equal(getCorrectRate(7, 10), 70);
  assert.deepEqual(getLevelProgress(350), {
    level: 2,
    currentXp: 50,
    xpForNextLevel: 300,
    percent: 17,
  });
});

test("连续答对长度从当前题向前计算", () => {
  const ids = ["a", "b", "c", "d"];
  const results = { a: true, b: false, c: true, d: true };
  assert.equal(calculateCurrentStreak(ids, results, 3), 2);
  assert.equal(calculateCurrentStreak(ids, results, 1), 0);
});
