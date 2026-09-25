import { createFileBaselineStore, type BaselineQuestionStore } from "@/lib/agent/baseline-store";
import type { LLMProvider } from "@/lib/agent/llm";
import { QUESTIONS_PER_BATCH } from "@/lib/game";
import { buildBatchGenerationPrompt } from "@/lib/agent/prompts";
import { randomizeChoiceOptionPositions } from "@/lib/agent/question-options";
import {
  questionBatchPublicSchema,
  validateQuestionBatch,
} from "@/lib/agent/validation";
import type {
  BatchGenerationContext,
  Knowledge,
  QuestionBatch,
  QuestionDistributionItem,
  TeachingStrategy,
} from "@/types/agent";

const defaultStore = createFileBaselineStore();
const pending = new Map<string, Promise<QuestionBatch>>();

export function createBalancedDistribution(
  knowledge: Knowledge,
): QuestionDistributionItem[] {
  const distribution = knowledge.subtopics.map((subtopic) => ({
    subtopic: subtopic.id,
    count: 0,
  }));

  for (let index = 0; index < QUESTIONS_PER_BATCH; index += 1) {
    distribution[index % distribution.length].count += 1;
  }

  return distribution.filter((item) => item.count > 0);
}

function buildBaselineGenerationStrategy(
  knowledge: Knowledge,
): TeachingStrategy {
  return {
    diagnosis: "accidental",
    strategyLevel: 1,
    action: "continue",
    focus: knowledge.subtopics.map((subtopic) => subtopic.id),
    difficulty: 1,
    questionDistribution: createBalancedDistribution(knowledge),
    reason: "首次初始化 Knowledge，生成并缓存基础题目。",
  };
}

function buildBaselineTeachingStrategy(
  knowledge: Knowledge,
  batch: QuestionBatch,
): TeachingStrategy {
  const counts = new Map<string, number>();
  for (const question of batch.questions) {
    counts.set(
      question.knowledgeSubtopic,
      (counts.get(question.knowledgeSubtopic) ?? 0) + 1,
    );
  }

  return {
    diagnosis: "accidental",
    strategyLevel: 1,
    action: "continue",
    focus: Array.from(counts.keys()),
    difficulty: 1,
    questionDistribution: Array.from(counts.entries()).map(
      ([subtopic, count]) => ({ subtopic, count }),
    ),
    reason: "LearningState 为空，使用服务器端预生成的基线题目。",
  };
}

function assignBaselineIds(
  batch: QuestionBatch,
  knowledgeId: string,
): QuestionBatch {
  return {
    questions: batch.questions.map((question, index) => ({
      ...question,
      id: `baseline-${knowledgeId}-q${index + 1}`,
    })),
  };
}

async function generateBaselineBatch(
  knowledge: Knowledge,
  provider: LLMProvider,
): Promise<QuestionBatch> {
  const generationStrategy = buildBaselineGenerationStrategy(knowledge);
  const context: BatchGenerationContext = {
    task: "generate_question_batch",
    knowledge,
    learningState: {
      userId: "baseline",
      knowledgeId: knowledge.id,
      mastery: 0,
      strengths: [],
      weaknesses: [],
      currentDifficulty: 1,
      recommendedFocus: [],
      strategyLevel: 1,
      summary: "首次初始化 Knowledge。",
      updatedAt: Date.now(),
    },
    strategy: generationStrategy,
    batchNumber: 1,
    previousQuestions: [],
  };
  const generated = await provider.generate(
    buildBatchGenerationPrompt(context),
    questionBatchPublicSchema,
    context,
  );
  return assignBaselineIds(
    validateQuestionBatch(
      generated,
      knowledge,
      generationStrategy.questionDistribution,
    ),
    knowledge.id,
  );
}

function validateStoredBaseline(
  batch: QuestionBatch | null,
  knowledge: Knowledge,
): QuestionBatch | null {
  if (!batch) return null;
  try {
    return validateQuestionBatch(batch, knowledge);
  } catch {
    return null;
  }
}

export async function getOrCreateBaselineBatch(input: {
  knowledge: Knowledge;
  provider: LLMProvider;
  store?: BaselineQuestionStore;
}): Promise<QuestionBatch> {
  const store = input.store ?? defaultStore;
  const existing = validateStoredBaseline(
    await store.get(input.knowledge.id),
    input.knowledge,
  );
  if (existing) return randomizeChoiceOptionPositions(existing);

  const pendingKey = input.knowledge.id;
  const current = pending.get(pendingKey);
  if (current) return current;

  const task = generateBaselineBatch(input.knowledge, input.provider)
    .then(async (batch) => {
      await store.save(input.knowledge.id, batch);
      return randomizeChoiceOptionPositions(batch);
    })
    .finally(() => {
      pending.delete(pendingKey);
    });

  pending.set(pendingKey, task);
  return task;
}

export function createBaselineStrategy(
  knowledge: Knowledge,
  batch: QuestionBatch,
): TeachingStrategy {
  return buildBaselineTeachingStrategy(knowledge, batch);
}
