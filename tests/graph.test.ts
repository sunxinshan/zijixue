import assert from "node:assert/strict";
import test from "node:test";

import { comparativeKnowledge } from "@/data/knowledge/comparative";
import {
  runCompleteBatchGraph,
  runStartSessionGraph,
} from "@/lib/agent/graph";
import { createMockLLMProvider } from "@/lib/agent/providers/mock";
import { createInitialLearningState } from "@/lib/mastery";
import type { Attempt } from "@/types/agent";

function createAttempts(
  sessionId: string,
  questionIds: string[],
  correctCount: number,
): Attempt[] {
  return questionIds.map((questionId, index) => ({
    id: `attempt-${index}`,
    sessionId,
    knowledgeId: "comparative",
    questionId,
    answer: index % 2 === 0 ? "a" : true,
    correct: index < correctCount,
    timestamp: index + 1,
  }));
}

test("LangGraph 启动流程读取 Context 并生成 10 道题", async () => {
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

  assert.equal(started.batch.questions.length, 10);
  assert.ok(started.sessionId.startsWith("session-"));
  assert.equal(started.learningState.knowledgeId, "comparative");
});

test("Batch 未达标时 Agent 返回 continue 和下一批题目", async () => {
  const provider = createMockLLMProvider();
  const learningState = createInitialLearningState("local-user", "comparative");
  const started = await runStartSessionGraph(
    { userId: "local-user", knowledge: comparativeKnowledge, learningState },
    provider,
  );
  const questionIds = started.batch.questions.map((question) => question.id);
  const completed = await runCompleteBatchGraph(
    {
      userId: "local-user",
      knowledge: comparativeKnowledge,
      learningState: started.learningState,
      sessionId: started.sessionId,
      attempts: createAttempts(started.sessionId, questionIds, 5),
      currentBatch: started.batch,
      batchNumber: 1,
      decisions: [],
      previousQuestions: started.batch.questions.map((question) => question.question),
    },
    provider,
  );

  assert.equal(completed.decision.action, "continue");
  assert.equal(completed.batch?.questions.length, 10);
  assert.equal(completed.sessionSummary, undefined);
  const firstBatchIds = new Set(questionIds);
  assert.equal(
    completed.batch?.questions.some((question) => firstBatchIds.has(question.id)),
    false,
  );
});

test("Batch 达标时 Agent 生成 Summary 并更新 LearningState", async () => {
  const provider = createMockLLMProvider();
  const learningState = createInitialLearningState("local-user", "comparative");
  const started = await runStartSessionGraph(
    { userId: "local-user", knowledge: comparativeKnowledge, learningState },
    provider,
  );
  const questionIds = started.batch.questions.map((question) => question.id);
  const completed = await runCompleteBatchGraph(
    {
      userId: "local-user",
      knowledge: comparativeKnowledge,
      learningState: started.learningState,
      sessionId: started.sessionId,
      attempts: createAttempts(started.sessionId, questionIds, 10),
      currentBatch: started.batch,
      batchNumber: 1,
      decisions: [],
      previousQuestions: started.batch.questions.map((question) => question.question),
    },
    provider,
  );

  assert.equal(completed.decision.action, "finish");
  assert.ok(completed.sessionSummary);
  assert.equal(completed.learningState.mastery, 100);
  assert.equal(completed.learningState.updatedAt > 0, true);
});
