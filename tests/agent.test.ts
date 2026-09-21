import assert from "node:assert/strict";
import test from "node:test";

import { comparativeKnowledge } from "@/data/knowledge/comparative";
import { createLLMProvider } from "@/lib/agent/provider";
import { createMockLLMProvider } from "@/lib/agent/providers/mock";
import {
  questionBatchPublicSchema,
  teachingStrategyPublicSchema,
  validateQuestionBatch,
  validateTeachingStrategy,
} from "@/lib/agent/validation";
import { createInitialLearningState } from "@/lib/mastery";
import type {
  BatchGenerationContext,
  BatchObservation,
  BatchPerformance,
  StrategyGenerationContext,
  TeachingStrategy,
} from "@/types/agent";

function performance(
  batchNumber: number,
  accuracy: number,
  subtopics: Record<string, { correct: number; total: number }>,
): BatchPerformance {
  const correct = Object.values(subtopics).reduce(
    (sum, item) => sum + item.correct,
    0,
  );
  const total = Object.values(subtopics).reduce(
    (sum, item) => sum + item.total,
    0,
  );
  return {
    batchNumber,
    correct,
    total,
    accuracy,
    subtopicStats: Object.entries(subtopics).map(([subtopic, value]) => ({
      subtopic,
      correct: value.correct,
      total: value.total,
      accuracy:
        value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
    })),
  };
}

async function strategyFor(observation: BatchObservation) {
  const provider = createMockLLMProvider();
  const learningState = createInitialLearningState("local-user", "comparative");
  const context: StrategyGenerationContext = {
    task: "generate_teaching_strategy",
    knowledge: comparativeKnowledge,
    learningState,
    observation,
  };
  return provider.generate(
    "mock",
    teachingStrategyPublicSchema,
    context,
  );
}

test("Mock Provider 按 questionDistribution 生成可信题目", async () => {
  const provider = createMockLLMProvider();
  const strategy: TeachingStrategy = {
    diagnosis: "subtopic_weakness",
    strategyLevel: 2,
    action: "targeted_practice",
    focus: ["y-ending"],
    difficulty: 2,
    questionDistribution: [
      { subtopic: "y-ending", count: 9 },
      { subtopic: "regular", count: 3 },
      { subtopic: "e-ending", count: 2 },
      { subtopic: "irregular", count: 1 },
    ],
    reason: "y-ending 薄弱。",
  };
  const context: BatchGenerationContext = {
    task: "generate_question_batch",
    knowledge: comparativeKnowledge,
    learningState: createInitialLearningState("local-user", "comparative"),
    strategy,
    batchNumber: 1,
    previousQuestions: [],
  };

  const batch = await provider.generate(
    "mock",
    questionBatchPublicSchema,
    context,
  );
  const validated = validateQuestionBatch(
    batch,
    comparativeKnowledge,
    strategy.questionDistribution,
  );

  assert.equal(validated.questions.length, 15);
  assert.equal(
    validated.questions.filter(
      (question) => question.knowledgeSubtopic === "y-ending",
    ).length,
    9,
  );
});

test("A：14/15 且错误分散为 accidental", async () => {
  const observation: BatchObservation = {
    batchNumber: 1,
    currentBatch: performance(1, 93, {
      regular: { correct: 3, total: 3 },
      "e-ending": { correct: 3, total: 3 },
      "y-ending": { correct: 1, total: 2 },
      "double-consonant": { correct: 3, total: 3 },
      irregular: { correct: 4, total: 4 },
    }),
    pastBatches: [],
    previousStrategies: [],
    consecutiveSubtopicErrors: { "y-ending": 1 },
  };
  const strategy = await strategyFor(observation);
  assert.equal(strategy.diagnosis, "accidental");
  assert.equal(strategy.action, "continue");
  assert.equal(strategy.strategyLevel, 1);
});

test("B：9/15，y-ending 集中错误会增加下一批占比", async () => {
  const observation: BatchObservation = {
    batchNumber: 1,
    currentBatch: performance(1, 60, {
      regular: { correct: 3, total: 3 },
      "e-ending": { correct: 3, total: 3 },
      "y-ending": { correct: 0, total: 6 },
      "double-consonant": { correct: 2, total: 2 },
      irregular: { correct: 1, total: 1 },
    }),
    pastBatches: [],
    previousStrategies: [],
    consecutiveSubtopicErrors: { "y-ending": 2 },
  };
  const strategy = await strategyFor(observation);
  assert.equal(strategy.diagnosis, "subtopic_weakness");
  assert.equal(strategy.action, "targeted_practice");
  assert.equal(
    strategy.questionDistribution.find((item) => item.subtopic === "y-ending")
      ?.count,
    6,
  );
});

test("C：连续 y-ending 错误进入 explanation + examples", async () => {
  const observation: BatchObservation = {
    batchNumber: 2,
    currentBatch: performance(2, 60, {
      "y-ending": { correct: 2, total: 6 },
      regular: { correct: 4, total: 4 },
      "e-ending": { correct: 2, total: 3 },
      irregular: { correct: 1, total: 2 },
    }),
    pastBatches: [performance(1, 80, { "y-ending": { correct: 5, total: 6 } })],
    previousStrategies: [],
    consecutiveSubtopicErrors: { "y-ending": 3 },
  };
  const strategy = await strategyFor(observation);
  assert.equal(strategy.diagnosis, "rule_misunderstanding");
  assert.equal(strategy.strategyLevel, 3);
  assert.equal(strategy.action, "explain");
  assert.ok(strategy.explanation);
  assert.ok(strategy.examples?.length);
});

test("D：连续两个 batch 的 y-ending 失败升级为 persistent_failure", async () => {
  const observation: BatchObservation = {
    batchNumber: 2,
    currentBatch: performance(2, 60, {
      "y-ending": { correct: 0, total: 6 },
      regular: { correct: 3, total: 3 },
      "e-ending": { correct: 3, total: 3 },
      irregular: { correct: 3, total: 3 },
    }),
    pastBatches: [
      performance(1, 50, {
        "y-ending": { correct: 1, total: 6 },
        regular: { correct: 3, total: 4 },
        "e-ending": { correct: 1, total: 3 },
        irregular: { correct: 2, total: 2 },
      }),
    ],
    previousStrategies: [],
    consecutiveSubtopicErrors: { "y-ending": 4 },
  };
  const strategy = await strategyFor(observation);
  assert.equal(strategy.diagnosis, "persistent_failure");
  assert.equal(strategy.strategyLevel, 4);
  assert.equal(strategy.action, "change_strategy");
  assert.ok(strategy.explanation);
  assert.ok(strategy.examples?.length);
});

test("E：9/15 → 12/15 → 14/15 识别 improving 并提高难度", async () => {
  const observation: BatchObservation = {
    batchNumber: 3,
    currentBatch: performance(3, 93, {
      regular: { correct: 3, total: 3 },
      "y-ending": { correct: 5, total: 6 },
      "e-ending": { correct: 2, total: 2 },
      irregular: { correct: 2, total: 2 },
      "double-consonant": { correct: 2, total: 2 },
    }),
    pastBatches: [
      performance(1, 60, { "y-ending": { correct: 3, total: 6 } }),
      performance(2, 80, { "y-ending": { correct: 5, total: 6 } }),
    ],
    previousStrategies: [],
    consecutiveSubtopicErrors: { "y-ending": 1 },
  };
  const strategy = await strategyFor(observation);
  assert.equal(strategy.diagnosis, "improving");
  assert.equal(strategy.action, "increase_difficulty");
});

test("F：多个 batch 稳定正确进入 mastered 并结束", async () => {
  const observation: BatchObservation = {
    batchNumber: 3,
    currentBatch: performance(3, 100, {
      regular: { correct: 3, total: 3 },
      "y-ending": { correct: 3, total: 3 },
      "e-ending": { correct: 3, total: 3 },
      irregular: { correct: 3, total: 3 },
      "double-consonant": { correct: 3, total: 3 },
    }),
    pastBatches: [
      performance(1, 100, { regular: { correct: 15, total: 15 } }),
      performance(2, 100, { regular: { correct: 15, total: 15 } }),
    ],
    previousStrategies: [],
    consecutiveSubtopicErrors: {},
  };
  const strategy = await strategyFor(observation);
  assert.equal(strategy.diagnosis, "mastered");
  assert.equal(strategy.strategyLevel, 5);
  assert.equal(strategy.action, "finish");
  assert.deepEqual(strategy.questionDistribution, []);
});

test("Validator 拒绝 questionDistribution 总数不是 15", () => {
  assert.throws(
    () =>
      validateTeachingStrategy(
        {
          diagnosis: "subtopic_weakness",
          strategyLevel: 2,
          action: "targeted_practice",
          focus: ["y-ending"],
          difficulty: 2,
          questionDistribution: [{ subtopic: "y-ending", count: 14 }],
          reason: "测试",
        },
        comparativeKnowledge,
      ),
    /总数必须为 15/,
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
