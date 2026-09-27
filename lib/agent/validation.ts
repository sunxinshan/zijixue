import { z } from "zod";

import {
  MAX_QUESTIONS_PER_BATCH,
  MAX_QUESTIONS_PER_POOL_PATTERN,
  MIN_QUESTIONS_PER_BATCH,
} from "@/lib/game";
import type {
  Attempt,
  BatchObservation,
  BatchPerformance,
  Difficulty,
  Knowledge,
  LearningState,
  Pattern,
  PatternProgress,
  Question,
  QuestionBatch,
  QuestionDistributionItem,
  SessionSummary,
  StrategyLevel,
  TeachingStrategy,
} from "@/types/agent";

const scoreLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const patternProgressSchema: z.ZodType<PatternProgress> = z.object({
  patternId: z.string().min(1),
  attemptedQuestions: z.number().int().min(0),
  correctQuestions: z.number().int().min(0),
  coveredItems: z.array(z.string()),
  coverageComplete: z.boolean(),
});

export const questionDistributionItemSchema: z.ZodType<QuestionDistributionItem> =
  z.object({
    patternId: z.string().min(1),
    count: z.number().int().min(0).max(MAX_QUESTIONS_PER_POOL_PATTERN),
  });

export const teachingStrategySchema = z.object({
  diagnosis: z.enum([
    "accidental",
    "subtopic_weakness",
    "rule_misunderstanding",
    "multiple_weaknesses",
    "persistent_failure",
    "improving",
    "mastered",
  ]),
  strategyLevel: scoreLevelSchema,
  action: z.enum([
    "continue",
    "targeted_practice",
    "explain",
    "simplify",
    "change_strategy",
    "increase_difficulty",
    "mixed_review",
    "finish",
  ]),
  focus: z.array(z.string()),
  difficulty: scoreLevelSchema,
  questionDistribution: z.array(questionDistributionItemSchema),
  explanation: z.string().optional(),
  examples: z.array(z.unknown()).optional(),
  reason: z.string().min(1),
});

export const teachingStrategyPublicSchema: z.ZodType<TeachingStrategy> = z.object({
  diagnosis: z.enum([
    "accidental",
    "subtopic_weakness",
    "rule_misunderstanding",
    "multiple_weaknesses",
    "persistent_failure",
    "improving",
    "mastered",
  ]),
  strategyLevel: scoreLevelSchema,
  action: z.enum([
    "continue",
    "targeted_practice",
    "explain",
    "simplify",
    "change_strategy",
    "increase_difficulty",
    "mixed_review",
    "finish",
  ]),
  focus: z.array(z.string()),
  difficulty: scoreLevelSchema,
  questionDistribution: z.array(questionDistributionItemSchema),
  explanation: z.string().optional(),
  examples: z.array(z.string()).optional(),
  reason: z.string().min(1),
});

export const patternPerformanceSchema = z.object({
  patternId: z.string().min(1),
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
});

export const batchPerformanceSchema: z.ZodType<BatchPerformance> = z.object({
  batchNumber: z.number().int().min(0),
  total: z.number().int().min(0),
  correct: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
  patternStats: z.array(patternPerformanceSchema),
});

export const batchObservationSchema: z.ZodType<BatchObservation> = z.object({
  batchNumber: z.number().int().min(0),
  currentBatch: batchPerformanceSchema,
  pastBatches: z.array(batchPerformanceSchema),
  previousStrategies: z.array(teachingStrategyPublicSchema),
  patternProgress: z.record(z.string(), patternProgressSchema),
  consecutivePatternErrors: z.record(z.string(), z.number().int().min(0)),
});

export const llmQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["choice", "true-false"]),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).nullable().optional(),
  answer: z.union([z.string(), z.boolean()]),
  explanation: z.string().min(1),
  knowledgeId: z.string().min(1),
  knowledgeSubtopic: z.string().min(1),
  patternId: z.string().min(1),
  coverageItemId: z.string().nullable().optional(),
  difficulty: scoreLevelSchema,
});

export const questionBatchSchema = z.object({
  questions: z.array(llmQuestionSchema),
});

export const sessionSummarySchema = z.object({
  mastery: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendedFocus: z.array(z.string()),
  summary: z.string().min(1),
});

export const learningStateSchema: z.ZodType<LearningState> = z.object({
  userId: z.string().min(1),
  knowledgeId: z.string().min(1),
  scope: z.enum(["subtopic", "knowledge"]),
  subtopicId: z.string().optional(),
  mastery: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  currentDifficulty: scoreLevelSchema,
  recommendedFocus: z.array(z.string()),
  strategyLevel: scoreLevelSchema,
  patternProgress: z.record(z.string(), patternProgressSchema),
  completed: z.boolean(),
  summary: z.string(),
  updatedAt: z.number(),
});

export const attemptSchema: z.ZodType<Attempt> = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  knowledgeId: z.string().min(1),
  subtopicId: z.string().optional(),
  patternId: z.string().optional(),
  coverageItemId: z.string().optional(),
  questionId: z.string().min(1),
  answer: z.union([z.string(), z.boolean()]),
  correct: z.boolean(),
  timestamp: z.number(),
});

export const questionSchema: z.ZodType<Question> = z.object({
  id: z.string().min(1),
  type: z.enum(["choice", "true-false"]),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  answer: z.union([z.string(), z.boolean()]),
  explanation: z.string().min(1),
  knowledgeId: z.string().min(1),
  knowledgeSubtopic: z.string().min(1),
  patternId: z.string().min(1),
  coverageItemId: z.string().optional(),
  difficulty: scoreLevelSchema,
});

export const questionBatchPublicSchema: z.ZodType<QuestionBatch> = z.object({
  questions: z.array(questionSchema),
});

export const sessionSummaryPublicSchema: z.ZodType<SessionSummary> = z.object({
  mastery: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendedFocus: z.array(z.string()),
  summary: z.string().min(1),
});

export class AgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentValidationError";
  }
}

function normalizeStrategyPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...source };

  if (typeof source.focus === "string") {
    normalized.focus = [source.focus];
  }

  const distribution = source.questionDistribution;
  if (Array.isArray(distribution)) {
    normalized.questionDistribution = distribution.map((item) => {
      if (!item || typeof item !== "object") return item;
      const entry = item as Record<string, unknown>;
      return {
        ...entry,
        patternId:
          entry.patternId ?? entry.pattern ?? entry.subtopic ?? entry.id,
        count:
          typeof entry.count === "number"
            ? entry.count
            : Number(entry.count ?? 0),
      };
    });
  } else if (distribution && typeof distribution === "object") {
    normalized.questionDistribution = Object.entries(
      distribution as Record<string, unknown>,
    ).map(([patternId, count]) => ({
      patternId,
      count: typeof count === "number" ? count : Number(count),
    }));
  }

  if (Array.isArray(source.examples)) {
    normalized.examples = normalizeStrategyExamples(source.examples);
  }

  return normalized;
}

function normalizeQuestionBatchPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  if (!Array.isArray(source.questions)) return value;

  return {
    ...source,
    questions: source.questions.map((item) => {
      if (!item || typeof item !== "object") return item;
      const question = { ...(item as Record<string, unknown>) };

      if (Array.isArray(question.options)) {
        question.options = question.options.map((option) =>
          typeof option === "string" ? option : String(option),
        );
      }

      if (question.type === "true-false") {
        delete question.options;
      }

      if (question.coverageItemId === null) {
        delete question.coverageItemId;
      }

      return question;
    }),
  };
}

function normalizeQuestionText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[?.!,，。！？]/g, "").trim();
}

function getPatterns(knowledge: Knowledge): Pattern[] {
  return knowledge.subtopics.flatMap((subtopic) => subtopic.patterns);
}

function normalizeStrategyExamples(value: unknown[] | undefined): string[] | undefined {
  if (!value) return undefined;
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const example = item as Record<string, unknown>;
        if (
          typeof example.base === "string" &&
          typeof example.comparative === "string" &&
          typeof example.superlative === "string"
        ) {
          return `${example.base} → ${example.comparative} → ${example.superlative}`;
        }
      }
      return "";
    })
    .filter(Boolean);
}

export function validateTeachingStrategy(
  value: unknown,
  knowledge: Knowledge,
): TeachingStrategy {
  const parsed = teachingStrategySchema.safeParse(normalizeStrategyPayload(value));
  if (!parsed.success) {
    throw new AgentValidationError(`TeachingStrategy 无效：${parsed.error.message}`);
  }

  const patterns = getPatterns(knowledge);
  const validPatternIds = new Set(patterns.map((pattern) => pattern.id));
  const focus = Array.from(new Set(parsed.data.focus));
  const invalidFocus = focus.find((id) => !validPatternIds.has(id));
  if (invalidFocus) {
    throw new AgentValidationError(`TeachingStrategy focus 越界：${invalidFocus}`);
  }

  const distribution = parsed.data.questionDistribution;
  const seen = new Set<string>();
  for (const item of distribution) {
    if (!validPatternIds.has(item.patternId)) {
      throw new AgentValidationError(`questionDistribution patternId 越界：${item.patternId}`);
    }
    if (seen.has(item.patternId)) {
      throw new AgentValidationError(`questionDistribution patternId 重复：${item.patternId}`);
    }
    seen.add(item.patternId);
  }

  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  if (
    parsed.data.action !== "finish" &&
    (total < MIN_QUESTIONS_PER_BATCH || total > MAX_QUESTIONS_PER_BATCH)
  ) {
    throw new AgentValidationError(
      `questionDistribution 总数必须在 ${MIN_QUESTIONS_PER_BATCH}-${MAX_QUESTIONS_PER_BATCH} 之间，实际为 ${total}`,
    );
  }
  if (parsed.data.action === "finish" && total !== 0) {
    throw new AgentValidationError("finish 策略不应包含下一批题目分布");
  }

  const requiresExplanation =
    parsed.data.action !== "finish" &&
    (parsed.data.strategyLevel >= 3 ||
      ["explain", "simplify", "change_strategy"].includes(parsed.data.action));
  if (
    requiresExplanation &&
    (!parsed.data.explanation || !parsed.data.examples?.length)
  ) {
    throw new AgentValidationError(
      "strategyLevel 3 以上必须包含 explanation 和 examples",
    );
  }

  if (
    parsed.data.diagnosis === "persistent_failure" &&
    (parsed.data.strategyLevel < 4 ||
      !["simplify", "change_strategy", "explain"].includes(parsed.data.action))
  ) {
    throw new AgentValidationError(
      "persistent_failure 必须提升到 strategyLevel >= 4 并改变教学方式",
    );
  }

  return {
    diagnosis: parsed.data.diagnosis,
    strategyLevel: parsed.data.strategyLevel as StrategyLevel,
    action: parsed.data.action,
    focus,
    difficulty: parsed.data.difficulty as Difficulty,
    questionDistribution: distribution,
    explanation: parsed.data.explanation,
    examples: normalizeStrategyExamples(parsed.data.examples),
    reason: parsed.data.reason,
  };
}

export function validateQuestionBatch(
  value: unknown,
  knowledge: Knowledge,
  distribution?: QuestionDistributionItem[],
): QuestionBatch {
  const parsed = questionBatchSchema.safeParse(
    normalizeQuestionBatchPayload(value),
  );
  if (!parsed.success) {
    throw new AgentValidationError(`题目结构无效：${parsed.error.message}`);
  }

  const questions: Question[] = parsed.data.questions.map((question) => ({
    ...question,
    options: question.options ?? undefined,
    coverageItemId: question.coverageItemId ?? undefined,
    difficulty: question.difficulty as Difficulty,
  }));
  if (questions.length === 0 || questions.length > MAX_QUESTIONS_PER_POOL_PATTERN) {
    throw new AgentValidationError(
      `题目数量必须在 1-${MAX_QUESTIONS_PER_POOL_PATTERN} 之间，实际为 ${questions.length}`,
    );
  }

  const patterns = getPatterns(knowledge);
  const patternById = new Map(patterns.map((pattern) => [pattern.id, pattern]));
  const ids = new Set<string>();
  const texts = new Set<string>();
  const actualDistribution = new Map<string, number>();

  for (const question of questions) {
    if (ids.has(question.id)) {
      throw new AgentValidationError(`题目 ID 重复：${question.id}`);
    }
    ids.add(question.id);

    if (!/[\u4e00-\u9fff]/.test(question.question)) {
      throw new AgentValidationError(`题干必须使用中文说明：${question.question}`);
    }

    const normalizedText = normalizeQuestionText(question.question);
    if (texts.has(normalizedText)) {
      throw new AgentValidationError(`题目明显重复：${question.question}`);
    }
    texts.add(normalizedText);

    if (question.knowledgeId !== knowledge.id) {
      throw new AgentValidationError(`题目越界：${question.knowledgeId}`);
    }

    const pattern = patternById.get(question.patternId);
    if (!pattern) {
      throw new AgentValidationError(`未知 patternId：${question.patternId}`);
    }
    // Pattern 是比 subtopic 字符串更可信的结构信息。模型即使写错
    // knowledgeSubtopic，也由程序按 patternId 自动纠正。
    question.knowledgeSubtopic = pattern.subtopicId;
    if (
      pattern.coverageItems?.length &&
      (!question.coverageItemId ||
        !pattern.coverageItems.includes(question.coverageItemId))
    ) {
      throw new AgentValidationError(
        `Pattern ${pattern.id} 的 coverageItemId 无效：${question.coverageItemId ?? "missing"}`,
      );
    }

    actualDistribution.set(
      question.patternId,
      (actualDistribution.get(question.patternId) ?? 0) + 1,
    );

    if (question.type === "choice") {
      if (!question.options || question.options.length < 2) {
        throw new AgentValidationError(`选择题缺少有效 options：${question.id}`);
      }
      if (
        typeof question.answer !== "string" ||
        !question.options.includes(question.answer)
      ) {
        throw new AgentValidationError(`选择题 answer 无效：${question.id}`);
      }
    }

    if (question.type === "true-false" && typeof question.answer !== "boolean") {
      throw new AgentValidationError(`判断题 answer 必须为 boolean：${question.id}`);
    }
  }

  if (distribution) {
    for (const item of distribution) {
      const actual = actualDistribution.get(item.patternId) ?? 0;
      if (actual !== item.count) {
        throw new AgentValidationError(
          `题目分布不符：${item.patternId} 期望 ${item.count}，实际 ${actual}`,
        );
      }
    }
  }

  return { questions };
}

export function validateSessionSummary(
  value: unknown,
  knowledge: Knowledge,
): SessionSummary {
  const parsed = sessionSummarySchema.safeParse(value);
  if (!parsed.success) {
    throw new AgentValidationError(`SessionSummary 无效：${parsed.error.message}`);
  }

  const validPatternIds = new Set(getPatterns(knowledge).map((pattern) => pattern.id));
  const recommendedFocus = Array.from(new Set(parsed.data.recommendedFocus));
  const invalidFocus = recommendedFocus.find((id) => !validPatternIds.has(id));
  if (invalidFocus) {
    throw new AgentValidationError(`recommendedFocus 越界：${invalidFocus}`);
  }

  return {
    mastery: Math.round(parsed.data.mastery),
    strengths: Array.from(new Set(parsed.data.strengths)),
    weaknesses: Array.from(new Set(parsed.data.weaknesses)),
    recommendedFocus,
    summary: parsed.data.summary,
  };
}
