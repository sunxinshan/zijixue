import assert from "node:assert/strict";
import test from "node:test";

import { comparativeKnowledge } from "@/data/knowledge/comparative";
import {
  calculateStars,
  evaluateQuestionAnswer,
  getAttemptStats,
  getLevelProgress,
  getPatternStats,
} from "@/lib/game";
import type { Question } from "@/types/agent";

const question: Question = {
  id: "q-choice",
  type: "choice",
  question: "happy 的比较级是？",
  options: ["happyer", "happier"],
  answer: "happier",
  explanation: "y 改成 i。",
  knowledgeId: "comparative",
  knowledgeSubtopic: "comparative-form-rules",
  patternId: "y-ending",
  coverageItemId: "happy",
  difficulty: 2,
};

test("choice 和 true-false 均由程序本地判断", () => {
  assert.equal(evaluateQuestionAnswer(question, "Happier"), true);
  assert.equal(evaluateQuestionAnswer(question, "happyer"), false);
});

test("Attempt、星级和等级进度可计算", () => {
  assert.deepEqual(
    getAttemptStats([
      { correct: true },
      { correct: false },
    ] as never),
    { correct: 1, total: 2, wrong: 1, accuracy: 50 },
  );
  assert.equal(calculateStars(14, 15), 3);
  assert.equal(getLevelProgress(350).level, 2);
});

test("Pattern 统计可按 Pattern 汇总", () => {
  const stats = getPatternStats(
    {
      questions: [question],
      attempts: [
        {
          id: "a1",
          sessionId: "s1",
          knowledgeId: "comparative",
          subtopicId: "comparative-form-rules",
          patternId: "y-ending",
          questionId: question.id,
          answer: "happier",
          correct: true,
          timestamp: 1,
        },
      ],
    },
    comparativeKnowledge,
    "comparative-form-rules",
  );
  assert.equal(stats.find((item) => item.patternId === "y-ending")?.accuracy, 100);
});
