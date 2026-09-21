import assert from "node:assert/strict";
import test from "node:test";

import { comparativeKnowledge } from "@/data/knowledge/comparative";
import { createBatchPerformance } from "@/lib/agent/analysis";
import {
  runCompleteBatchGraph,
  runStartSessionGraph,
} from "@/lib/agent/graph";
import { createMockLLMProvider } from "@/lib/agent/providers/mock";
import { createInitialLearningState } from "@/lib/mastery";
import type { Attempt, QuestionBatch, TeachingStrategy } from "@/types/agent";

function createAttempts(
  sessionId: string,
  questionIds: string[],
  correctIds: Set<string>,
  batchNumber: number,
): Attempt[] {
  return questionIds.map((questionId, index) => ({
    id: `attempt-b${batchNumber}-${index}`,
    sessionId,
    knowledgeId: "comparative",
    questionId,
    answer: index % 2 === 0 ? "answer" : true,
    correct: correctIds.has(questionId),
    timestamp: index + 1,
  }));
}

async function runBatch(
  provider: ReturnType<typeof createMockLLMProvider>,
  input: {
    sessionId: string;
    learningState: ReturnType<typeof createInitialLearningState>;
    currentBatch: QuestionBatch;
    batchNumber: number;
    strategies: TeachingStrategy[];
    pastBatches: ReturnType<typeof createBatchPerformance>[];
    correctCount: number;
  },
) {
  const questionIds = input.currentBatch.questions.map((question) => question.id);
  const correctIds = new Set(questionIds.slice(0, input.correctCount));
  const attempts = createAttempts(
    input.sessionId,
    questionIds,
    correctIds,
    input.batchNumber,
  );
  const result = await runCompleteBatchGraph(
    {
      userId: "local-user",
      knowledge: comparativeKnowledge,
      learningState: input.learningState,
      sessionId: input.sessionId,
      attempts,
      currentBatch: input.currentBatch,
      batchNumber: input.batchNumber,
      pastBatches: input.pastBatches,
      strategies: input.strategies,
      previousQuestions: input.currentBatch.questions.map(
        (question) => question.question,
      ),
    },
    provider,
  );
  return {
    result,
    performance: createBatchPerformance(
      input.batchNumber,
      attempts,
      input.currentBatch.questions,
    ),
  };
}

test("LangGraph 启动流程生成 TeachingStrategy 和 15 道题", async () => {
  const provider = createMockLLMProvider();
  const learningState = createInitialLearningState("local-user", "comparative");
  const started = await runStartSessionGraph(
    {
      userId: "local-user",
      knowledge: comparativeKnowledge,
      learningState,
    },
    provider,
  );

  assert.equal(started.batch.questions.length, 15);
  assert.equal(
    started.strategy.questionDistribution.reduce(
      (sum, item) => sum + item.count,
      0,
    ),
    15,
  );
  assert.ok(started.sessionId.startsWith("session-"));
});

test("未达标 batch 返回 continue、TeachingStrategy 和下一批题目", async () => {
  const provider = createMockLLMProvider();
  const learningState = createInitialLearningState("local-user", "comparative");
  const started = await runStartSessionGraph(
    { userId: "local-user", knowledge: comparativeKnowledge, learningState },
    provider,
  );
  const { result } = await runBatch(provider, {
    sessionId: started.sessionId,
    learningState: started.learningState,
    currentBatch: started.batch,
    batchNumber: 1,
    strategies: [started.strategy],
    pastBatches: [],
    correctCount: 8,
  });

  assert.notEqual(result.strategy.action, "finish");
  assert.equal(result.batch?.questions.length, 15);
  assert.equal(result.sessionSummary, undefined);
  const firstBatchIds = new Set(
    started.batch.questions.map((question) => question.id),
  );
  assert.equal(
    result.batch?.questions.some((question) => firstBatchIds.has(question.id)),
    false,
  );
});

test("连续稳定正确后生成 Summary 并更新 LearningState", async () => {
  const provider = createMockLLMProvider();
  const learningState = createInitialLearningState("local-user", "comparative");
  const started = await runStartSessionGraph(
    { userId: "local-user", knowledge: comparativeKnowledge, learningState },
    provider,
  );

  const first = await runBatch(provider, {
    sessionId: started.sessionId,
    learningState: started.learningState,
    currentBatch: started.batch,
    batchNumber: 1,
    strategies: [started.strategy],
    pastBatches: [],
    correctCount: 15,
  });
  assert.notEqual(first.result.strategy.action, "finish");
  assert.ok(first.result.batch);

  const second = await runBatch(provider, {
    sessionId: started.sessionId,
    learningState: first.result.learningState,
    currentBatch: first.result.batch,
    batchNumber: 2,
    strategies: [started.strategy, first.result.strategy],
    pastBatches: [first.performance],
    correctCount: 15,
  });

  assert.equal(second.result.strategy.diagnosis, "mastered");
  assert.equal(second.result.strategy.action, "finish");
  assert.ok(second.result.sessionSummary);
  assert.ok(second.result.learningState.mastery >= 90);
  assert.equal(second.result.learningState.strategyLevel, 5);
});
