import assert from "node:assert/strict";
import test from "node:test";

import { comparativeKnowledge } from "@/data/knowledge/comparative";
import {
  calculateStars,
  evaluateQuestionAnswer,
  getAttemptStats,
  getLevelProgress,
  getSubtopicStats,
} from "@/lib/game";
import type { AppStorage, Question } from "@/types/agent";

const choiceQuestion: Question = {
  id: "q-choice",
  type: "choice",
  question: "happy 的比较级是？",
  options: ["happyer", "happier"],
  answer: "happier",
  explanation: "y 改成 i。",
  knowledgeId: "comparative",
  knowledgeSubtopic: "y-ending",
  difficulty: 2,
};

const trueFalseQuestion: Question = {
  id: "q-tf",
  type: "true-false",
  question: "hotter 是 hot 的比较级。",
  answer: true,
  explanation: "hot 双写 t。",
  knowledgeId: "comparative",
  knowledgeSubtopic: "double-consonant",
  difficulty: 1,
};

test("choice 和 true-false 都由程序本地判断", () => {
  assert.equal(evaluateQuestionAnswer(choiceQuestion, "Happier"), true);
  assert.equal(evaluateQuestionAnswer(choiceQuestion, "happyer"), false);
  assert.equal(evaluateQuestionAnswer(trueFalseQuestion, true), true);
  assert.equal(evaluateQuestionAnswer(trueFalseQuestion, false), false);
});

test("Attempt 统计、星级和等级进度可计算", () => {
  const attempts = [
    { correct: true },
    { correct: true },
    { correct: false },
    { correct: true },
  ];
  assert.deepEqual(getAttemptStats(attempts as never), {
    correct: 3,
    total: 4,
    wrong: 1,
    accuracy: 75,
  });
  assert.equal(calculateStars(9, 10), 3);
  assert.equal(getLevelProgress(350).level, 2);
});

test("Subtopic 统计来自客观 Attempt 和 Question", () => {
  const storage = {
    questions: [choiceQuestion, trueFalseQuestion],
    attempts: [
      {
        id: "a1",
        sessionId: "s1",
        knowledgeId: "comparative",
        questionId: choiceQuestion.id,
        answer: "happier",
        correct: true,
        timestamp: 1,
      },
      {
        id: "a2",
        sessionId: "s1",
        knowledgeId: "comparative",
        questionId: trueFalseQuestion.id,
        answer: false,
        correct: false,
        timestamp: 2,
      },
    ],
  } as Pick<AppStorage, "attempts" | "questions">;

  const stats = getSubtopicStats(storage, comparativeKnowledge);
  assert.equal(
    stats.find((item) => item.subtopicId === "y-ending")?.accuracy,
    100,
  );
  assert.equal(
    stats.find((item) => item.subtopicId === "double-consonant")?.accuracy,
    0,
  );
});
