import {
  createFileBaselineStore,
  type BaselineQuestionStore,
} from "@/lib/agent/baseline-store";
import type { LLMProvider } from "@/lib/agent/llm";
import { buildBatchGenerationPrompt } from "@/lib/agent/prompts";
import { randomizeChoiceOptionPositions } from "@/lib/agent/question-options";
import {
  questionBatchPublicSchema,
  validateQuestionBatch,
} from "@/lib/agent/validation";
import { QUESTIONS_PER_BATCH } from "@/lib/game";
import type {
  BatchGenerationContext,
  Knowledge,
  LearningState,
  Pattern,
  QuestionBatch,
  QuestionDistributionItem,
  TeachingStrategy,
} from "@/types/agent";

const defaultStore = createFileBaselineStore();
const pending = new Map<string, Promise<QuestionBatch>>();

function allPatterns(knowledge: Knowledge): Pattern[] {
  return knowledge.subtopics.flatMap((subtopic) => subtopic.patterns);
}

export function createBalancedDistribution(
  knowledge: Knowledge,
): QuestionDistributionItem[] {
  const patterns = allPatterns(knowledge);
  const distribution = patterns.map((pattern) => ({
    patternId: pattern.id,
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
    focus: allPatterns(knowledge).map((pattern) => pattern.id),
    difficulty: 1,
    questionDistribution: createBalancedDistribution(knowledge),
    reason: "首次初始化当前学习范围，生成并缓存基础题目。",
  };
}

function buildBaselineTeachingStrategy(
  batch: QuestionBatch,
): TeachingStrategy {
  const counts = new Map<string, number>();
  for (const question of batch.questions) {
    counts.set(question.patternId, (counts.get(question.patternId) ?? 0) + 1);
  }

  return {
    diagnosis: "accidental",
    strategyLevel: 1,
    action: "continue",
    focus: Array.from(counts.keys()),
    difficulty: 1,
    questionDistribution: Array.from(counts.entries()).map(
      ([patternId, count]) => ({ patternId, count }),
    ),
    reason: "LearningState 为空，使用服务器端预生成的基线题目。",
  };
}

function assignBaselineIds(
  batch: QuestionBatch,
  scopeKey: string,
): QuestionBatch {
  const safeKey = scopeKey.replace(/[^a-zA-Z0-9_-]/g, "-");
  return {
    questions: batch.questions.map((question, index) => ({
      ...question,
      id: `baseline-${safeKey}-q${index + 1}`,
    })),
  };
}

async function generateBaselineBatch(
  knowledge: Knowledge,
  learningState: LearningState,
  provider: LLMProvider,
  scopeKey: string,
): Promise<QuestionBatch> {
  const generationStrategy = buildBaselineGenerationStrategy(knowledge);
  const context: BatchGenerationContext = {
    task: "generate_question_batch",
    knowledge,
    learningState,
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
    scopeKey,
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
  learningState: LearningState;
  scopeKey: string;
  provider: LLMProvider;
  store?: BaselineQuestionStore;
}): Promise<QuestionBatch> {
  const store = input.store ?? defaultStore;
  const existing = validateStoredBaseline(
    await store.get(input.scopeKey),
    input.knowledge,
  );
  if (existing) return randomizeChoiceOptionPositions(existing);

  const pendingKey = input.scopeKey;
  const current = pending.get(pendingKey);
  if (current) return current;

  const task = generateBaselineBatch(
    input.knowledge,
    input.learningState,
    input.provider,
    input.scopeKey,
  )
    .then(async (batch) => {
      await store.save(input.scopeKey, batch);
      return randomizeChoiceOptionPositions(batch);
    })
    .finally(() => {
      pending.delete(pendingKey);
    });

  pending.set(pendingKey, task);
  return task;
}

export function createBaselineStrategy(
  batch: QuestionBatch,
): TeachingStrategy {
  return buildBaselineTeachingStrategy(batch);
}
