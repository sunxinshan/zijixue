import assert from "node:assert/strict";
import test from "node:test";

import { comparativeKnowledge, getSubtopic } from "@/data/knowledge/comparative";
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
  PatternProgress,
  StrategyGenerationContext,
  TeachingStrategy,
} from "@/types/agent";

function scopedKnowledge(subtopicId: string) {
  const subtopic = getSubtopic(comparativeKnowledge, subtopicId);
  assert.ok(subtopic);
  return { ...comparativeKnowledge, subtopics: [subtopic] };
}

function performance(
  batchNumber: number,
  patterns: Record<string, { correct: number; total: number }>,
): BatchPerformance {
  const correct = Object.values(patterns).reduce((sum, item) => sum + item.correct, 0);
  const total = Object.values(patterns).reduce((sum, item) => sum + item.total, 0);
  return {
    batchNumber,
    correct,
    total,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    patternStats: Object.entries(patterns).map(([patternId, value]) => ({
      patternId,
      correct: value.correct,
      total: value.total,
      accuracy: value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
    })),
  };
}

function emptyProgress(progress: Record<string, PatternProgress>): Record<string, PatternProgress> {
  return progress;
}

async function strategyFor(
  subtopicId: string,
  observation: BatchObservation,
) {
  const provider = createMockLLMProvider();
  const knowledge = scopedKnowledge(subtopicId);
  const learningState = createInitialLearningState(
    "local-user",
    "comparative",
    Date.now(),
    "subtopic",
    subtopicId,
  );
  const context: StrategyGenerationContext = {
    task: "generate_teaching_strategy",
    knowledge,
    learningState,
    observation,
  };
  return provider.generate("mock", teachingStrategyPublicSchema, context);
}

test("Mock Provider 严格按 questionDistribution 生成 Pattern 题", async () => {
  const provider = createMockLLMProvider();
  const knowledge = scopedKnowledge("form-change");
  const strategy: TeachingStrategy = {
    diagnosis: "subtopic_weakness",
    strategyLevel: 2,
    action: "targeted_practice",
    focus: ["y-ending"],
    difficulty: 2,
    questionDistribution: [
      { patternId: "y-ending", count: 9 },
      { patternId: "regular", count: 3 },
      { patternId: "irregular", count: 3 },
    ],
    reason: "y-ending 薄弱。",
  };
  const context: BatchGenerationContext = {
    task: "generate_question_batch",
    knowledge,
    learningState: createInitialLearningState(
      "local-user",
      "comparative",
      Date.now(),
      "subtopic",
      "form-change",
    ),
    strategy,
    batchNumber: 1,
    previousQuestions: [],
  };
  const batch = await provider.generate("mock", questionBatchPublicSchema, context);
  const validated = validateQuestionBatch(batch, knowledge, strategy.questionDistribution);
  assert.equal(validated.questions.length, 15);
  assert.equal(
    validated.questions.filter((question) => question.patternId === "y-ending").length,
    9,
  );
});

test("B：y-ending 薄弱时下一批增加 y-ending 占比", async () => {
  const observation: BatchObservation = {
    batchNumber: 1,
    currentBatch: performance(1, {
      regular: { correct: 3, total: 3 },
      "e-ending": { correct: 3, total: 3 },
      "y-ending": { correct: 0, total: 6 },
      "double-consonant": { correct: 2, total: 2 },
      "more-most": { correct: 1, total: 1 },
      irregular: { correct: 0, total: 0 },
    }),
    pastBatches: [],
    previousStrategies: [],
    patternProgress: emptyProgress({}),
    consecutivePatternErrors: { "y-ending": 3 },
  };
  const strategy = await strategyFor("form-change", observation);
  const yCount =
    strategy.questionDistribution.find((item) => item.patternId === "y-ending")?.count ?? 0;
  const regularCount =
    strategy.questionDistribution.find((item) => item.patternId === "regular")?.count ?? 0;
  assert.ok(yCount > regularCount);
  assert.ok(yCount >= 3);
});

test("C：irregular 只覆盖 good 不能视为 Coverage 完成", async () => {
  const observation: BatchObservation = {
    batchNumber: 1,
    currentBatch: performance(1, {
      irregular: { correct: 1, total: 1 },
      regular: { correct: 1, total: 1 },
    }),
    pastBatches: [],
    previousStrategies: [],
    patternProgress: {
      irregular: {
        patternId: "irregular",
        attemptedQuestions: 1,
        correctQuestions: 1,
        coveredItems: ["good"],
        coverageComplete: false,
      },
    },
    consecutivePatternErrors: {},
  };
  const strategy = await strategyFor("form-change", observation);
  assert.ok(strategy.focus.includes("irregular"));
  assert.ok(
    strategy.questionDistribution.some((item) => item.patternId === "irregular"),
  );
});

test("E：9/15 → 12/15 → 14/15 识别 improving", async () => {
  const observation: BatchObservation = {
    batchNumber: 3,
    currentBatch: performance(3, {
      regular: { correct: 3, total: 3 },
      "e-ending": { correct: 2, total: 2 },
      "y-ending": { correct: 5, total: 6 },
      "double-consonant": { correct: 2, total: 2 },
      "more-most": { correct: 1, total: 1 },
      irregular: { correct: 1, total: 1 },
    }),
    pastBatches: [
      performance(1, { "y-ending": { correct: 3, total: 6 } }),
      performance(2, { "y-ending": { correct: 5, total: 6 } }),
    ],
    previousStrategies: [],
    patternProgress: emptyProgress({}),
    consecutivePatternErrors: { "y-ending": 1 },
  };
  const strategy = await strategyFor("form-change", observation);
  assert.equal(strategy.diagnosis, "improving");
  assert.equal(strategy.action, "increase_difficulty");
});

test("Validator 拒绝 Pattern distribution 超出动态范围", () => {
  assert.throws(
    () =>
      validateTeachingStrategy(
        {
          diagnosis: "subtopic_weakness",
          strategyLevel: 2,
          action: "targeted_practice",
          focus: ["y-ending"],
          difficulty: 2,
          questionDistribution: [{ patternId: "y-ending", count: 21 }],
          reason: "测试",
        },
        scopedKnowledge("form-change"),
      ),
    /总数必须在 3-20 之间/,
  );
});

test("选择题正确选项位置在 ABCD 中均衡随机", async () => {
  const { randomizeChoiceOptionPositions } = await import(
    "@/lib/agent/question-options"
  );
  const questions = Array.from({ length: 16 }, (_, index) => ({
    id: `choice-${index}`,
    type: "choice" as const,
    question: `question ${index}`,
    options: ["correct", "wrong-1", "wrong-2", "wrong-3"],
    answer: "correct",
    explanation: "test",
    knowledgeId: "comparative",
    knowledgeSubtopic: "form-change",
    patternId: "regular",
    difficulty: 1 as const,
  }));
  const randomized = randomizeChoiceOptionPositions({ questions }, () => 0);
  const positions = randomized.questions.map((question) =>
    question.options?.indexOf("correct"),
  );
  assert.deepEqual(
    [0, 1, 2, 3].map(
      (position) => positions.filter((value) => value === position).length,
    ),
    [4, 4, 4, 4],
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

  assert.equal(createLLMProvider().kind, "deepseek");

  if (previous.provider === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = previous.provider;
  if (previous.model === undefined) delete process.env.LLM_MODEL;
  else process.env.LLM_MODEL = previous.model;
  if (previous.apiKey === undefined) delete process.env.LLM_API_KEY;
  else process.env.LLM_API_KEY = previous.apiKey;
  if (previous.baseUrl === undefined) delete process.env.LLM_BASE_URL;
  else process.env.LLM_BASE_URL = previous.baseUrl;
});

test("Validator 将模型返回的 coverageItemId=null 规范化为 undefined", () => {
  const knowledge = scopedKnowledge("comparative-basic");
  const questions = Array.from({ length: 15 }, (_, index) => ({
    id: `null-coverage-${index}`,
    type: "choice" as const,
    question: `请选择正确的词：Tom is taller than Ken ${index}`,
    options: ["than", "as", "of"],
    answer: "than",
    explanation: "比较级后用 than。",
    knowledgeId: "comparative",
    knowledgeSubtopic: "comparative-basic",
    patternId: "comparative-than",
    coverageItemId: null,
    difficulty: 1 as const,
  }));

  const validated = validateQuestionBatch({ questions }, knowledge);
  assert.equal(validated.questions.length, 15);
  assert.ok(
    validated.questions.every(
      (question) => question.coverageItemId === undefined,
    ),
  );
});
