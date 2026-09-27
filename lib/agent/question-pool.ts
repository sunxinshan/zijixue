import { buildBatchGenerationPrompt } from "@/lib/agent/prompts";
import type { LLMProvider } from "@/lib/agent/llm";
import {
  createFileQuestionPoolRepository,
  type QuestionPoolRepository,
} from "@/lib/agent/question-pool-store";
import { randomizeChoiceOptionPositions } from "@/lib/agent/question-options";
import {
  questionBatchPublicSchema,
  validateQuestionBatch,
} from "@/lib/agent/validation";
import { MAX_QUESTIONS_PER_BATCH, MIN_QUESTIONS_PER_BATCH } from "@/lib/game";
import type {
  BatchGenerationContext,
  Knowledge,
  LearningState,
  Pattern,
  Question,
  QuestionBatch,
  QuestionDistributionItem,
  QuestionPool,
  Subtopic,
  TeachingStrategy,
} from "@/types/agent";

const defaultRepository = createFileQuestionPoolRepository();
const pending = new Map<string, Promise<QuestionPool[]>>();

function poolTargetCount(pattern: Pattern): number {
  return Math.max(
    pattern.minimumQuestions,
    pattern.coverageItems?.length ?? 0,
    1,
  );
}

function createPoolDistribution(patterns: Pattern[]): QuestionDistributionItem[] {
  return patterns.map((pattern) => ({
    patternId: pattern.id,
    count: poolTargetCount(pattern),
  }));
}

function createInitialState(knowledgeId: string, subtopicId: string): LearningState {
  return {
    userId: "question-pool",
    knowledgeId,
    scope: "subtopic",
    subtopicId,
    mastery: 0,
    strengths: [],
    weaknesses: [],
    currentDifficulty: 1,
    recommendedFocus: [],
    strategyLevel: 1,
    patternProgress: {},
    completed: false,
    summary: "公共题池初始化。",
    updatedAt: Date.now(),
  };
}

function isPoolUsable(pool: QuestionPool, knowledge: Knowledge): boolean {
  if (pool.status !== "active" || pool.questions.length === 0) return false;
  try {
    validateQuestionBatch({ questions: pool.questions }, knowledge);
    return true;
  } catch {
    return false;
  }
}

async function generateMissingPools(input: {
  knowledge: Knowledge;
  subtopic: Subtopic;
  missingPatterns: Pattern[];
  provider: LLMProvider;
  repository: QuestionPoolRepository;
}): Promise<QuestionPool[]> {
  const distribution = createPoolDistribution(input.missingPatterns);
  const strategy: TeachingStrategy = {
    diagnosis: "accidental",
    strategyLevel: 1,
    action: "continue",
    focus: input.missingPatterns.map((pattern) => pattern.id),
    difficulty: 1,
    questionDistribution: distribution,
    reason: "首次初始化公共服务题池。",
  };
  const context: BatchGenerationContext = {
    task: "generate_question_batch",
    knowledge: { ...input.knowledge, subtopics: [input.subtopic] },
    learningState: createInitialState(input.knowledge.id, input.subtopic.id),
    strategy,
    batchNumber: 1,
    previousQuestions: [],
  };
  const generated = await input.provider.generate(
    buildBatchGenerationPrompt(context),
    questionBatchPublicSchema,
    context,
  );
  const validated = validateQuestionBatch(
    generated,
    context.knowledge,
    distribution,
  );
  const timestamp = new Date().toISOString();
  const pools: QuestionPool[] = input.missingPatterns.map((pattern) => {
    const questions = validated.questions
      .filter((question) => question.patternId === pattern.id)
      .map((question, index) => ({
        ...question,
        id: `pool-${input.knowledge.id}-${input.subtopic.id}-${pattern.id}-q${index + 1}`,
      }));
    return {
      id: `${input.knowledge.id}:${input.subtopic.id}:${pattern.id}`,
      knowledgeId: input.knowledge.id,
      subtopicId: input.subtopic.id,
      patternId: pattern.id,
      questions,
      version: 1,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
  await input.repository.savePools(pools);
  return pools;
}

export async function ensureQuestionPools(input: {
  knowledge: Knowledge;
  subtopic: Subtopic;
  provider: LLMProvider;
  repository?: QuestionPoolRepository;
}): Promise<QuestionPool[]> {
  const repository = input.repository ?? defaultRepository;
  const existing = await repository.getPools(input.knowledge.id, input.subtopic.id);
  const usable = existing.filter((pool) => isPoolUsable(pool, input.knowledge));
  const usablePatterns = new Set(usable.map((pool) => pool.patternId));
  const missing = input.subtopic.patterns.filter(
    (pattern) => !usablePatterns.has(pattern.id),
  );

  if (missing.length === 0) return usable;

  const pendingKey = `${input.knowledge.id}:${input.subtopic.id}`;
  const current = pending.get(pendingKey);
  if (current) return current;

  const task = generateMissingPools({
    ...input,
    repository,
    missingPatterns: missing,
  })
    .then((created) => [...usable, ...created])
    .finally(() => pending.delete(pendingKey));

  pending.set(pendingKey, task);
  return task;
}

function createSelectionDistribution(patterns: Pattern[]): QuestionDistributionItem[] {
  const counts = new Map(patterns.map((pattern) => [pattern.id, 1]));
  const target = Math.min(
    MAX_QUESTIONS_PER_BATCH,
    Math.max(MIN_QUESTIONS_PER_BATCH, patterns.length * 2),
  );
  let assigned = counts.size;
  let index = 0;
  const order = patterns.map((pattern) => pattern.id);
  while (assigned < target && order.length > 0) {
    const patternId = order[index % order.length];
    counts.set(patternId, (counts.get(patternId) ?? 0) + 1);
    assigned += 1;
    index += 1;
  }
  return Array.from(counts.entries()).map(([patternId, count]) => ({
    patternId,
    count,
  }));
}

function pickFromPool(
  pool: QuestionPool | undefined,
  count: number,
  previousQuestions: Set<string>,
): Question[] {
  if (!pool || count <= 0) return [];
  const fresh = pool.questions.filter(
    (question) => !previousQuestions.has(question.question),
  );
  const candidates = fresh.length >= count ? fresh : [...fresh, ...pool.questions];
  return candidates.slice(0, count);
}

export async function getOrCreateQuestionPoolBatch(input: {
  knowledge: Knowledge;
  subtopic: Subtopic;
  learningState: LearningState;
  provider: LLMProvider;
  repository?: QuestionPoolRepository;
  previousQuestions?: string[];
}): Promise<QuestionBatch> {
  const pools = await ensureQuestionPools(input);
  const distribution = createSelectionDistribution(input.subtopic.patterns);
  const previous = new Set(input.previousQuestions ?? []);
  const selected = distribution.flatMap((item) =>
    pickFromPool(
      pools.find((pool) => pool.patternId === item.patternId),
      item.count,
      previous,
    ),
  );
  return randomizeChoiceOptionPositions({ questions: selected });
}

export function createQuestionPoolStrategy(
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
    reason: "新 LearningState 使用服务器端公共 QuestionPool。",
  };
}
