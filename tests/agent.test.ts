import assert from "node:assert/strict";
import test from "node:test";

import { comparativeKnowledge } from "@/data/knowledge/comparative";
import { createMockLLMProvider } from "@/lib/agent/providers/mock";
import { questionBatchPublicSchema, validateQuestionBatch } from "@/lib/agent/validation";
import { createInitialLearningState } from "@/lib/mastery";
import type { BatchGenerationContext, QuestionBatch } from "@/types/agent";

test("Mock Provider 生成的可信选择题和判断题通过 Validator", async () => {
  const provider = createMockLLMProvider();
  const context: BatchGenerationContext = {
    task: "generate_batch",
    knowledge: comparativeKnowledge,
    learningState: createInitialLearningState("local-user", "comparative"),
    focus: ["y-ending"],
    difficulty: 2,
    batchNumber: 1,
    previousQuestions: [],
  };

  const batch = await provider.generate(
    "mock",
    questionBatchPublicSchema,
    context,
  );
  const validated = validateQuestionBatch(batch, comparativeKnowledge);

  assert.equal(validated.questions.length, 10);
  assert.ok(validated.questions.some((question) => question.type === "choice"));
  assert.ok(
    validated.questions.some((question) => question.type === "true-false"),
  );
});

test("Validator 拒绝数量不足和重复题", () => {
  const base: QuestionBatch = {
    questions: Array.from({ length: 10 }, (_, index) => ({
      id: `q${index}`,
      type: "choice" as const,
      question: `题目 ${index}`,
      options: ["a", "b"],
      answer: "a",
      explanation: "解释",
      knowledgeId: "comparative",
      knowledgeSubtopic: "regular",
      difficulty: 1 as const,
    })),
  };

  assert.throws(
    () =>
      validateQuestionBatch(
        { questions: base.questions.slice(0, 9) },
        comparativeKnowledge,
      ),
    /数量必须为 10/,
  );

  const duplicate = structuredClone(base);
  duplicate.questions[1].question = duplicate.questions[0].question;
  assert.throws(
    () => validateQuestionBatch(duplicate, comparativeKnowledge),
    /明显重复/,
  );
});
