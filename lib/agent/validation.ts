import { z } from "zod";

import type {
  AgentDecision,
  Difficulty,
  Knowledge,
  Question,
  QuestionBatch,
  SessionSummary,
} from "@/types/agent";

const difficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const llmQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["choice", "true-false"]),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  answer: z.union([z.string(), z.boolean()]),
  explanation: z.string().min(1),
  knowledgeId: z.string().min(1),
  knowledgeSubtopic: z.string().min(1),
  difficulty: difficultySchema,
});

export const questionBatchSchema = z.object({
  questions: z.array(llmQuestionSchema),
});

export const agentDecisionSchema = z.object({
  action: z.enum(["continue", "finish"]),
  focus: z.array(z.string()),
  difficulty: difficultySchema,
  reason: z.string().min(1),
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
  currentDifficulty: difficultySchema,
  recommendedFocus: z.array(z.string()),
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
  difficulty: difficultySchema,
});

export const questionBatchPublicSchema: z.ZodType<QuestionBatch> = z.object({
  questions: z.array(questionSchema),
});

export const agentDecisionPublicSchema: z.ZodType<AgentDecision> = z.object({
  action: z.enum(["continue", "finish"]),
  focus: z.array(z.string()),
  difficulty: difficultySchema,
  reason: z.string().min(1),
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

export class AgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentValidationError";
  }
}

export function validateQuestionBatch(
  value: unknown,
  knowledge: Knowledge,
): QuestionBatch {
  const parsed = questionBatchSchema.safeParse(value);
  if (!parsed.success) {
    throw new AgentValidationError(`题目结构无效：${parsed.error.message}`);
  }

  const questions = parsed.data.questions as Question[];
  if (questions.length !== 10) {
    throw new AgentValidationError(`题目数量必须为 10，实际为 ${questions.length}`);
  }

  const subtopicIds = new Set(knowledge.subtopics.map((subtopic) => subtopic.id));
  const ids = new Set<string>();
  const texts = new Set<string>();

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

  return { questions };
}

export function validateAgentDecision(
  value: unknown,
  knowledge: Knowledge,
): AgentDecision {
  const parsed = agentDecisionSchema.safeParse(value);
  if (!parsed.success) {
    throw new AgentValidationError(`AgentDecision 无效：${parsed.error.message}`);
  }

  const validSubtopicIds = new Set(knowledge.subtopics.map((subtopic) => subtopic.id));
  const focus = Array.from(new Set(parsed.data.focus));
  if (parsed.data.action === "continue" && focus.length === 0) {
    throw new AgentValidationError("continue 决策必须包含 focus");
  }

  const invalidFocus = focus.find((id) => !validSubtopicIds.has(id));
  if (invalidFocus) {
    throw new AgentValidationError(`focus 越界：${invalidFocus}`);
  }

  return {
    action: parsed.data.action,
    focus,
    difficulty: parsed.data.difficulty as Difficulty,
    reason: parsed.data.reason,
  };
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
