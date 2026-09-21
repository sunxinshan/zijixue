import { z } from "zod";

import { QUESTIONS_PER_BATCH } from "@/lib/game";

import {
  attemptSchema,
  batchPerformanceSchema,
  learningStateSchema,
  questionBatchPublicSchema,
  teachingStrategyPublicSchema,
} from "@/lib/agent/validation";

export const startSessionRequestSchema = z.object({
  userId: z.string().min(1),
  knowledgeId: z.string().min(1),
  learningState: learningStateSchema.nullable().optional(),
});

export const completeBatchRequestSchema = z.object({
  userId: z.string().min(1),
  knowledgeId: z.string().min(1),
  learningState: learningStateSchema,
  sessionId: z.string().min(1),
  attempts: z.array(attemptSchema).length(QUESTIONS_PER_BATCH),
  currentBatch: questionBatchPublicSchema,
  batchNumber: z.number().int().min(1),
  pastBatches: z.array(batchPerformanceSchema).default([]),
  strategies: z.array(teachingStrategyPublicSchema).default([]),
  previousQuestions: z.array(z.string()).default([]),
});

export type StartSessionRequest = z.infer<typeof startSessionRequestSchema>;
export type CompleteBatchRequest = z.infer<typeof completeBatchRequestSchema>;
