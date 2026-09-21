import assert from "node:assert/strict";
import test from "node:test";

import { comparativeKnowledge } from "@/data/knowledge/comparative";
import { createLLMProvider } from "@/lib/agent/provider";
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

test("deepseek Provider 使用可配置模型和兼容接口", () => {
  const previous = {
    provider: process.env.LLM_PROVIDER,
    model: process.env.LLM_MODEL,
    apiKey: process.env.LLM_API_KEY,
    baseUrl: process.env.LLM_BASE_URL,
  };
  process.env.LLM_PROVIDER = "deepseek";
  process.env.LLM_MODEL = "deepseek-v4-flash";
  process.env.LLM_API_KEY = "test-key";
  delete process.env.LLM_BASE_URL;

  const provider = createLLMProvider();
  assert.equal(provider.kind, "deepseek");

  if (previous.provider === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = previous.provider;
  if (previous.model === undefined) delete process.env.LLM_MODEL;
  else process.env.LLM_MODEL = previous.model;
  if (previous.apiKey === undefined) delete process.env.LLM_API_KEY;
  else process.env.LLM_API_KEY = previous.apiKey;
  if (previous.baseUrl === undefined) delete process.env.LLM_BASE_URL;
  else process.env.LLM_BASE_URL = previous.baseUrl;
});
