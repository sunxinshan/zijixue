import { z } from "zod";

import { QUESTIONS_PER_BATCH } from "@/lib/game";
import type {
  BatchObservation,
  BatchPerformance,
  Difficulty,
  Knowledge,
  Question,
  QuestionBatch,
  QuestionDistributionItem,
  SessionSummary,
  StrategyLevel,
  SubtopicPerformance,
  TeachingStrategy,
} from "@/types/agent";

const scoreLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const questionDistributionItemSchema = z.object({
  subtopic: z.string().min(1),
  count: z.number().int().min(0).max(QUESTIONS_PER_BATCH),
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

export const subtopicPerformanceSchema: z.ZodType<SubtopicPerformance> = z.object({
  subtopic: z.string().min(1),
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
});

export const batchPerformanceSchema: z.ZodType<BatchPerformance> = z.object({
  batchNumber: z.number().int().min(0),
  total: z.number().int().min(0),
  correct: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
  subtopicStats: z.array(subtopicPerformanceSchema),
});

export const batchObservationSchema: z.ZodType<BatchObservation> = z.object({
  batchNumber: z.number().int().min(0),
  currentBatch: batchPerformanceSchema,
  pastBatches: z.array(batchPerformanceSchema),
  previousStrategies: z.array(teachingStrategyPublicSchema),
  consecutiveSubtopicErrors: z.record(z.string(), z.number().int().min(0)),
});

export const llmQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["choice", "true-false"]),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  answer: z.union([z.string(), z.boolean()]),
  explanation: z.string().min(1),
  knowledgeId: z.string().min(1),
  knowledgeSubtopic: z.string().min(1),
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

export const learningStateSchema = z.object({
  userId: z.string().min(1),
  knowledgeId: z.string().min(1),
  mastery: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  currentDifficulty: scoreLevelSchema,
  recommendedFocus: z.array(z.string()),
  strategyLevel: scoreLevelSchema,
  summary: z.string(),
  updatedAt: z.number(),
});

export const attemptSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  knowledgeId: z.string().min(1),
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

function normalizeQuestionText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[?.!,，。！？]/g, "").trim();
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

export class AgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentValidationError";
  }
}

export function validateTeachingStrategy(
  value: unknown,
  knowledge: Knowledge,
): TeachingStrategy {
  const parsed = teachingStrategySchema.safeParse(value);
  if (!parsed.success) {
    throw new AgentValidationError(`TeachingStrategy 无效：${parsed.error.message}`);
  }

  const validSubtopicIds = new Set(knowledge.subtopics.map((subtopic) => subtopic.id));
  const focus = Array.from(new Set(parsed.data.focus));
  const invalidFocus = focus.find((id) => !validSubtopicIds.has(id));
  if (invalidFocus) {
    throw new AgentValidationError(`TeachingStrategy focus 越界：${invalidFocus}`);
  }

  const distribution = parsed.data.questionDistribution;
  const seenDistribution = new Set<string>();
  for (const item of distribution) {
    if (!validSubtopicIds.has(item.subtopic)) {
      throw new AgentValidationError(`questionDistribution subtopic 越界：${item.subtopic}`);
    }
    if (seenDistribution.has(item.subtopic)) {
      throw new AgentValidationError(`questionDistribution subtopic 重复：${item.subtopic}`);
    }
    seenDistribution.add(item.subtopic);
  }

  const distributionTotal = distribution.reduce((sum, item) => sum + item.count, 0);
  if (
    parsed.data.action !== "finish" &&
    distributionTotal !== QUESTIONS_PER_BATCH
  ) {
    throw new AgentValidationError(
      `questionDistribution 总数必须为 ${QUESTIONS_PER_BATCH}，实际为 ${distributionTotal}`,
    );
  }
  if (parsed.data.action === "finish" && distributionTotal !== 0) {
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
    questionDistribution: distribution as QuestionDistributionItem[],
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
  const parsed = questionBatchSchema.safeParse(value);
  if (!parsed.success) {
    throw new AgentValidationError(`题目结构无效：${parsed.error.message}`);
  }

  const questions = parsed.data.questions as Question[];
  if (questions.length !== QUESTIONS_PER_BATCH) {
    throw new AgentValidationError(
      `题目数量必须为 ${QUESTIONS_PER_BATCH}，实际为 ${questions.length}`,
    );
  }

  const subtopicIds = new Set(knowledge.subtopics.map((subtopic) => subtopic.id));
  const ids = new Set<string>();
  const texts = new Set<string>();
  const actualDistribution = new Map<string, number>();

  for (const question of questions) {
    if (ids.has(question.id)) {
      throw new AgentValidationError(`题目 ID 重复：${question.id}`);
    }
    ids.add(question.id);

    const normalizedText = normalizeQuestionText(question.question);
    if (texts.has(normalizedText)) {
      throw new AgentValidationError(`题目明显重复：${question.question}`);
    }
    texts.add(normalizedText);

    if (question.knowledgeId !== knowledge.id) {
      throw new AgentValidationError(`题目越界：${question.knowledgeId}`);
    }
    if (!subtopicIds.has(question.knowledgeSubtopic)) {
      throw new AgentValidationError(`未知 subtopic：${question.knowledgeSubtopic}`);
    }
    actualDistribution.set(
      question.knowledgeSubtopic,
      (actualDistribution.get(question.knowledgeSubtopic) ?? 0) + 1,
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
      const actual = actualDistribution.get(item.subtopic) ?? 0;
      if (actual !== item.count) {
        throw new AgentValidationError(
          `题目分布不符：${item.subtopic} 期望 ${item.count}，实际 ${actual}`,
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

  const validSubtopicIds = new Set(knowledge.subtopics.map((subtopic) => subtopic.id));
  const recommendedFocus = Array.from(new Set(parsed.data.recommendedFocus));
  const invalidFocus = recommendedFocus.find((id) => !validSubtopicIds.has(id));
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
