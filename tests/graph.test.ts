import assert from "node:assert/strict";
import test from "node:test";
import type { z } from "zod";

import { comparativeKnowledge, getSubtopic } from "@/data/knowledge/comparative";
import {
  ensureQuestionPools,
  getOrCreateQuestionPoolBatch,
} from "@/lib/agent/question-pool";
import { createMemoryQuestionPoolRepository } from "@/lib/agent/question-pool-store";
import { runStartSessionGraph } from "@/lib/agent/graph";
import type { LLMProvider } from "@/lib/agent/llm";
import { createMockLLMProvider } from "@/lib/agent/providers/mock";
import { createInitialLearningState } from "@/lib/mastery";
import type { LearningState, PatternProgress } from "@/types/agent";

function scopedKnowledge(subtopicId: string) {
  const subtopic = getSubtopic(comparativeKnowledge, subtopicId);
  assert.ok(subtopic);
  return { ...comparativeKnowledge, subtopics: [subtopic] };
}

function completeProgressForSubtopic(subtopicId: string): Record<string, PatternProgress> {
  const subtopic = getSubtopic(comparativeKnowledge, subtopicId);
  assert.ok(subtopic);
  return Object.fromEntries(
    subtopic.patterns.map((pattern) => [
      pattern.id,
      {
        patternId: pattern.id,
        attemptedQuestions: Math.max(pattern.minimumQuestions, pattern.coverageItems?.length ?? 0),
        correctQuestions: Math.max(pattern.minimumQuestions, pattern.coverageItems?.length ?? 0),
        coveredItems: pattern.coverageItems ?? [],
        coverageComplete: true,
      },
    ]),
  );
}

function completedSubtopicState(subtopicId: string): LearningState {
  return {
    ...createInitialLearningState(
      "local-user",
      "comparative",
      Date.now(),
      "subtopic",
      subtopicId,
    ),
    mastery: 90,
    completed: true,
    patternProgress: completeProgressForSubtopic(subtopicId),
  };
}

test("首个用户生成 QuestionPool，第二个用户直接复用", async () => {
  const provider = createMockLLMProvider();
  let calls = 0;
  const countingProvider: LLMProvider = {
    kind: "counting",
    async generate<T>(prompt: string, schema: z.ZodType<T>, context?: unknown) {
      calls += 1;
      return provider.generate(prompt, schema, context);
    },
  };
  const repository = createMemoryQuestionPoolRepository();
  const knowledge = scopedKnowledge("form-change");
  const subtopic = knowledge.subtopics[0];
  const learningState = createInitialLearningState(
    "local-user",
    "comparative",
    Date.now(),
    "subtopic",
    "form-change",
  );

  const firstPools = await ensureQuestionPools({
    knowledge,
    subtopic,
    provider: countingProvider,
    repository,
  });
  const secondPools = await ensureQuestionPools({
    knowledge,
    subtopic,
    provider: countingProvider,
    repository,
  });
  const firstBatch = await getOrCreateQuestionPoolBatch({
    knowledge,
    subtopic,
    learningState,
    provider: countingProvider,
    repository,
  });

  assert.equal(calls, 1);
  assert.equal(firstPools.length, subtopic.patterns.length);
  assert.equal(secondPools.length, subtopic.patterns.length);
  assert.ok(firstBatch.questions.length >= subtopic.minimumQuestions);
});

test("Subtopic 启动图只看到当前 Subtopic 的 Patterns", async () => {
  const provider = createMockLLMProvider();
  const started = await runStartSessionGraph(
    {
      userId: "local-user",
      knowledge: comparativeKnowledge,
      mode: "subtopic",
      subtopicId: "form-change",
      learningState: createInitialLearningState(
        "local-user",
        "comparative",
        Date.now(),
        "subtopic",
        "form-change",
      ),
      isEmptyState: true,
    },
    provider,
    createMemoryQuestionPoolRepository(),
  );

  assert.ok(
    started.batch.questions.length >=
      (getSubtopic(comparativeKnowledge, "form-change")?.minimumQuestions ?? 0),
  );
  assert.ok(
    started.batch.questions.every(
      (question) => question.knowledgeSubtopic === "form-change",
    ),
  );
  assert.equal(
    new Set(started.batch.questions.map((question) => question.patternId)).size,
    getSubtopic(comparativeKnowledge, "form-change")?.patterns.length,
  );
});

test("Challenge 模式可以混合所有 Subtopic 和 Pattern", async () => {
  const provider = createMockLLMProvider();
  const subtopicStates = comparativeKnowledge.subtopics.map((subtopic) =>
    completedSubtopicState(subtopic.id),
  );
  const challengeState = {
    ...createInitialLearningState(
      "local-user",
      "comparative",
      Date.now(),
      "knowledge",
    ),
    mastery: 90,
    completed: true,
    patternProgress: Object.assign(
      {},
      ...subtopicStates.map((state) => state.patternProgress),
    ),
  };
  const started = await runStartSessionGraph(
    {
      userId: "local-user",
      knowledge: comparativeKnowledge,
      mode: "challenge",
      learningState: challengeState,
      isEmptyState: false,
    },
    provider,
  );

  assert.ok(started.batch.questions.length >= 3);
  assert.ok(started.batch.questions.length <= 20);
  assert.ok(
    new Set(
      started.batch.questions.map((question) => question.knowledgeSubtopic),
    ).size > 1,
  );
});
