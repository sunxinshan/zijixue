import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { comparativeKnowledge, getSubtopic } from "@/data/knowledge/comparative";
import {
  createFallbackProvider,
  createLLMProvider,
  getLLMTimeoutMs,
  resolveLLMCallTimeout,
  withLLMTimeout,
} from "@/lib/agent/provider";
import { createMockLLMProvider } from "@/lib/agent/providers/mock";
import type { LLMProvider } from "@/lib/agent/llm";
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
  const knowledge = scopedKnowledge("comparative-form-rules");
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
      "comparative-form-rules",
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
  const strategy = await strategyFor("comparative-form-rules", observation);
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
  const strategy = await strategyFor("comparative-form-rules", observation);
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
  const strategy = await strategyFor("comparative-form-rules", observation);
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
        scopedKnowledge("comparative-form-rules"),
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
    knowledgeSubtopic: "comparative-form-rules",
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

test("LLM 请求超时会主动结束而不是永久等待", async () => {
  await assert.rejects(
    withLLMTimeout(new Promise<never>(() => {}), 10),
    /模型响应超时/,
  );
});

test("主 LLM 超时时自动使用本地教学降级策略并熔断后续调用", async () => {
  let primaryCalls = 0;
  let fallbackCalls = 0;
  const primary: LLMProvider = {
    kind: "primary",
    generate: <T>() => {
      primaryCalls += 1;
      return new Promise<T>(() => {});
    },
  };
  const fallback: LLMProvider = {
    kind: "fallback",
    generate: async <T>() => {
      fallbackCalls += 1;
      return { ok: true } as T;
    },
  };
  const provider = createFallbackProvider(primary, fallback, 10);
  const schema = z.object({ ok: z.boolean() });

  assert.deepEqual(await provider.generate("prompt", schema), { ok: true });
  assert.deepEqual(await provider.generate("prompt", schema), { ok: true });
  assert.equal(primaryCalls, 1);
  assert.equal(fallbackCalls, 2);
});

test("策略分析与总结使用更短的降级超时", () => {
  assert.equal(
    resolveLLMCallTimeout({ task: "generate_teaching_strategy" }, 60_000),
    30_000,
  );
  assert.equal(
    resolveLLMCallTimeout({ task: "summarize_session" }, 60_000),
    30_000,
  );
  assert.equal(
    resolveLLMCallTimeout({ task: "generate_question_batch" }, 60_000),
    60_000,
  );
});

test("LLM 超时时间可通过环境变量配置", () => {
  const previous = process.env.LLM_TIMEOUT_MS;
  process.env.LLM_TIMEOUT_MS = "45000";
  assert.equal(getLLMTimeoutMs(), 45000);

  if (previous === undefined) delete process.env.LLM_TIMEOUT_MS;
  else process.env.LLM_TIMEOUT_MS = previous;
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

test("高正确率且 Coverage 完成时下一批压缩为 5 题以内", async () => {
  const { boundStrategyBatchSize } = await import("@/lib/agent/coverage");
  const knowledge = scopedKnowledge("comparative-form-rules");
  const patterns = knowledge.subtopics.flatMap((subtopic) => subtopic.patterns);
  const strategy: TeachingStrategy = {
    diagnosis: "improving",
    strategyLevel: 2,
    action: "mixed_review",
    focus: ["more-most", "irregular", "e-ending"],
    difficulty: 2,
    questionDistribution: patterns.map((pattern) => ({
      patternId: pattern.id,
      count: 4,
    })),
    reason: "20/20 后混合复习。",
  };
  const observation: BatchObservation = {
    batchNumber: 5,
    currentBatch: performance(5, {
      "more-most": { correct: 4, total: 4 },
      irregular: { correct: 4, total: 4 },
      "e-ending": { correct: 4, total: 4 },
      regular: { correct: 4, total: 4 },
      "y-ending": { correct: 4, total: 4 },
      "double-consonant": { correct: 4, total: 4 },
    }),
    pastBatches: [],
    previousStrategies: [],
    patternProgress: Object.fromEntries(
      patterns.map((pattern) => [
        pattern.id,
        {
          patternId: pattern.id,
          attemptedQuestions: 4,
          correctQuestions: 4,
          coveredItems: pattern.coverageItems ?? [],
          coverageComplete: true,
        },
      ]),
    ),
    consecutivePatternErrors: {},
  };
  const bounded = boundStrategyBatchSize(strategy, knowledge, observation);
  const total = bounded.questionDistribution.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  assert.ok(total <= 5);
  assert.ok(total >= 3);
});

test("最后批次全对且 Coverage 完成时强制 finish", async () => {
  const { forceFinishOnPerfectBatch } = await import("@/lib/agent/coverage");
  const knowledge = scopedKnowledge("comparative-as-as");
  const patterns = knowledge.subtopics.flatMap((subtopic) => subtopic.patterns);
  const strategy: TeachingStrategy = {
    diagnosis: "improving",
    strategyLevel: 2,
    action: "mixed_review",
    focus: ["as-as"],
    difficulty: 2,
    questionDistribution: [{ patternId: "as-as", count: 5 }],
    reason: "继续复习。",
  };
  const observation: BatchObservation = {
    batchNumber: 2,
    currentBatch: performance(2, {
      "as-as": { correct: 5, total: 5 },
      "not-as-as": { correct: 5, total: 5 },
      "as-as-base-form": { correct: 5, total: 5 },
      "not-meaning": { correct: 5, total: 5 },
    }),
    pastBatches: [],
    previousStrategies: [],
    patternProgress: Object.fromEntries(
      patterns.map((pattern) => [
        pattern.id,
        {
          patternId: pattern.id,
          attemptedQuestions: 5,
          correctQuestions: 5,
          coveredItems: pattern.coverageItems ?? [],
          coverageComplete: true,
        },
      ]),
    ),
    consecutivePatternErrors: {},
  };

  const forced = forceFinishOnPerfectBatch(strategy, knowledge, observation);
  assert.equal(forced.action, "finish");
  assert.equal(forced.diagnosis, "mastered");
  assert.deepEqual(forced.questionDistribution, []);
});

test("Validator 以 patternId 自动纠正 knowledgeSubtopic", () => {
  const knowledge = scopedKnowledge("comparative-as-as");
  const questions = Array.from({ length: 10 }, (_, index) => ({
    id: `as-as-${index}`,
    type: "choice" as const,
    question: `请选择同级比较形式 ${index}`,
    options: ["as big as", "bigger than", "more big"],
    answer: "as big as",
    explanation: "同级比较使用 as...as。",
    knowledgeId: "comparative",
    knowledgeSubtopic: "wrong-subtopic",
    patternId: "as-as",
    coverageItemId: "big",
    difficulty: 1 as const,
  }));

  const validated = validateQuestionBatch({ questions }, knowledge);
  assert.ok(
    validated.questions.every(
      (question) => question.knowledgeSubtopic === "comparative-as-as",
    ),
  );
});

test("弱 Pattern 下一批至少补齐达到目标正确数所需的题量", async () => {
  const { enforceWeakPatternMinimums } = await import("@/lib/agent/coverage");
  const knowledge = scopedKnowledge("comparative-form-rules");
  const strategy: TeachingStrategy = {
    diagnosis: "subtopic_weakness",
    strategyLevel: 2,
    action: "targeted_practice",
    focus: ["y-ending"],
    difficulty: 2,
    questionDistribution: [
      { patternId: "y-ending", count: 1 },
      { patternId: "regular", count: 2 },
    ],
    reason: "继续练习。",
  };
  const observation: BatchObservation = {
    batchNumber: 1,
    currentBatch: performance(1, {
      "y-ending": { correct: 7, total: 10 },
    }),
    pastBatches: [],
    previousStrategies: [],
    previousPatternProgress: {
      "y-ending": {
        patternId: "y-ending",
        attemptedQuestions: 10,
        correctQuestions: 7,
        coveredItems: ["busy", "easy", "happy"],
        coverageComplete: true,
      },
    },
    patternProgress: {
      "y-ending": {
        patternId: "y-ending",
        attemptedQuestions: 10,
        correctQuestions: 7,
        coveredItems: ["busy", "easy", "happy"],
        coverageComplete: true,
      },
    },
    consecutivePatternErrors: {},
  };

  const enforced = enforceWeakPatternMinimums(strategy, knowledge, observation);
  assert.ok(
    (enforced.questionDistribution.find((item) => item.patternId === "y-ending")
      ?.count ?? 0) >= 2,
  );
});

test("questionDistribution 对象格式会规范化为数组", () => {
  const strategy = validateTeachingStrategy(
    {
      diagnosis: "subtopic_weakness",
      strategyLevel: 2,
      action: "targeted_practice",
      focus: "as-as",
      difficulty: 2,
      questionDistribution: {
        "as-as": 3,
        "not-as-as": 3,
      },
      reason: "对象格式兼容测试",
    },
    scopedKnowledge("comparative-as-as"),
  );

  assert.deepEqual(strategy.focus, ["as-as"]);
  assert.equal(strategy.questionDistribution.length, 2);
  assert.equal(
    strategy.questionDistribution.reduce((sum, item) => sum + item.count, 0),
    6,
  );
});

test("判断题带布尔 options 时会自动移除 options", () => {
  const knowledge = scopedKnowledge("comparative-as-as");
  const validated = validateQuestionBatch(
    {
      questions: [
        {
          id: "tf-as-as",
          type: "true-false",
          question: "“as big as”表示同级比较。",
          options: [true, false],
          answer: true,
          explanation: "as...as 表示同级比较。",
          knowledgeId: "comparative",
          knowledgeSubtopic: "comparative-as-as",
          patternId: "as-as",
          coverageItemId: "big",
          difficulty: 1,
        },
      ],
    },
    knowledge,
  );

  assert.equal(validated.questions[0].options, undefined);
  assert.equal(validated.questions[0].answer, true);
});

test("启动阶段收到 finish 时会转换为混合验证批次", async () => {
  const { ensureStartStrategyCanGenerate } = await import("@/lib/agent/coverage");
  const strategy: TeachingStrategy = {
    diagnosis: "mastered",
    strategyLevel: 5,
    action: "finish",
    focus: [],
    difficulty: 2,
    questionDistribution: [],
    reason: "已经掌握。",
  };
  const adjusted = ensureStartStrategyCanGenerate(
    strategy,
    comparativeKnowledge,
  );
  const total = adjusted.questionDistribution.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  assert.equal(adjusted.action, "mixed_review");
  assert.ok(total > 0);
  assert.ok(total <= 20);
});
