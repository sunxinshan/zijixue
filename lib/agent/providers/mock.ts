import type { z } from "zod";

import type { LLMProvider } from "@/lib/agent/llm";
import { validateAgentDecision, validateQuestionBatch, validateSessionSummary } from "@/lib/agent/validation";
import type {
  AgentDecision,
  BatchAnalysisContext,
  BatchGenerationContext,
  Difficulty,
  Knowledge,
  KnowledgeExample,
  Question,
  QuestionBatch,
  SessionSummary,
  SessionSummaryContext,
} from "@/types/agent";

interface ExampleEntry {
  subtopicId: string;
  example: KnowledgeExample;
}

function clampDifficulty(value: number): Difficulty {
  return Math.max(1, Math.min(5, Math.round(value))) as Difficulty;
}

function collectExamples(knowledge: Knowledge, focus: string[]): ExampleEntry[] {
  const focusSet = new Set(focus);
  const entries = knowledge.rules.flatMap((rule) =>
    rule.examples.map((example) => ({
      subtopicId: rule.subtopicId,
      example,
    })),
  );

  const unique = new Map<string, ExampleEntry>();
  for (const entry of entries) {
    const key = `${entry.subtopicId}:${entry.example.base}`;
    if (!unique.has(key)) unique.set(key, entry);
  }

  return Array.from(unique.values()).sort((left, right) => {
    const leftFocused = focusSet.has(left.subtopicId) ? 0 : 1;
    const rightFocused = focusSet.has(right.subtopicId) ? 0 : 1;
    return leftFocused - rightFocused;
  });
}

function wrongForm(base: string, form: "comparative" | "superlative"): string {
  return form === "comparative" ? `${base}er` : `${base}est`;
}

function buildChoiceOptions(
  base: string,
  correct: string,
  form: "comparative" | "superlative",
  optionSeed: number,
): string[] {
  const candidates = [
    correct,
    wrongForm(base, form),
    form === "comparative" ? `more ${base}` : `most ${base}`,
    form === "comparative" ? `${base}iest` : `${base}ier`,
  ];
  const unique = Array.from(new Set(candidates));
  const offset = optionSeed % unique.length;
  return [...unique.slice(offset), ...unique.slice(0, offset)];
}

function createQuestionId(seed: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${seed}-${crypto.randomUUID()}`;
  }
  return `${seed}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function generateMockQuestions(context: BatchGenerationContext): QuestionBatch {
  const examples = collectExamples(context.knowledge, context.focus);
  const previous = new Set(context.previousQuestions);
  const questions: Question[] = [];
  let exampleOffset = (context.batchNumber - 1) * 10;

  for (let index = 0; questions.length < 10; index += 1) {
    const entry = examples[(exampleOffset + index) % examples.length];
    const form = index % 2 === 0 ? "comparative" : "superlative";
    const correct = entry.example[form];
    const type = index % 4 < 2 ? "choice" : "true-false";
    const subtopic = context.knowledge.subtopics.find(
      (item) => item.id === entry.subtopicId,
    );
    const difficulty = clampDifficulty(
      context.difficulty + (index % 3 === 0 ? -1 : index % 3 === 2 ? 1 : 0),
    );

    let questionText: string;
    let answer: string | boolean;
    let options: string[] | undefined;
    let explanation: string;

    if (type === "choice") {
      questionText = `${entry.example.base} 的${
        form === "comparative" ? "比较级" : "最高级"
      }是？`;
      answer = correct;
      options = buildChoiceOptions(entry.example.base, correct, form, index);
      explanation = `${subtopic?.title ?? entry.subtopicId}：${entry.example.base} → ${entry.example.comparative} → ${entry.example.superlative}。`;
    } else {
      const shouldBeTrue = index % 2 === 0;
      const shown = shouldBeTrue
        ? correct
        : wrongForm(entry.example.base, form);
      questionText = `“${shown}”是 ${entry.example.base} 的${
        form === "comparative" ? "比较级" : "最高级"
      }。`;
      answer = shouldBeTrue;
      explanation = `${entry.example.base} 的${form === "comparative" ? "比较级" : "最高级"}是 ${correct}。`;
    }

    if (previous.has(questionText)) {
      exampleOffset += 1;
      continue;
    }

    questions.push({
      id: createQuestionId(`mock-q${context.batchNumber}-${index}`),
      type,
      question: questionText,
      options,
      answer,
      explanation,
      knowledgeId: context.knowledge.id,
      knowledgeSubtopic: entry.subtopicId,
      difficulty,
    });
  }

  return { questions };
}

function analyzeMockBatch(context: BatchAnalysisContext): AgentDecision {
  const questionById = new Map(
    context.questions.map((question) => [question.id, question]),
  );
  const relevantAttempts = context.attempts.filter((attempt) =>
    questionById.has(attempt.questionId),
  );
  const stats = new Map<string, { correct: number; total: number }>();

  for (const attempt of relevantAttempts) {
    const subtopicId = questionById.get(attempt.questionId)?.knowledgeSubtopic;
    if (!subtopicId) continue;
    const current = stats.get(subtopicId) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (attempt.correct) current.correct += 1;
    stats.set(subtopicId, current);
  }

  const ranked = Array.from(stats.entries())
    .map(([subtopicId, value]) => ({
      subtopicId,
      accuracy: value.total > 0 ? value.correct / value.total : 0,
    }))
    .sort((left, right) => left.accuracy - right.accuracy);
  const accuracy =
    relevantAttempts.length > 0
      ? relevantAttempts.filter((attempt) => attempt.correct).length /
        relevantAttempts.length
      : 0;
  const action =
    accuracy >= 0.85 || context.batchNumber >= 3 ? "finish" : "continue";
  const focus = ranked.slice(0, 2).map((item) => item.subtopicId);
  const difficulty =
    action === "finish"
      ? clampDifficulty(context.learningState.currentDifficulty)
      : clampDifficulty(
          accuracy < 0.55
            ? context.learningState.currentDifficulty - 1
            : accuracy > 0.8
              ? context.learningState.currentDifficulty + 1
              : context.learningState.currentDifficulty,
        );

  return {
    action,
    focus: focus.length > 0 ? focus : context.learningState.recommendedFocus,
    difficulty,
    reason:
      accuracy >= 0.85
        ? "本批准确率较高，已经达到阶段目标，可以结束 Session。"
        : "部分 subtopic 仍需要巩固，建议继续针对薄弱点训练。",
  };
}

function summarizeMockSession(context: SessionSummaryContext): SessionSummary {
  const questionById = new Map(
    context.questions.map((question) => [question.id, question]),
  );
  const stats = context.knowledge.subtopics.map((subtopic) => {
    const attempts = context.attempts.filter(
      (attempt) =>
        questionById.get(attempt.questionId)?.knowledgeSubtopic === subtopic.id,
    );
    const correct = attempts.filter((attempt) => attempt.correct).length;
    return {
      id: subtopic.id,
      title: subtopic.title,
      total: attempts.length,
      accuracy: attempts.length > 0 ? correct / attempts.length : 0,
    };
  });

  const totalCorrect = context.attempts.filter((attempt) => attempt.correct).length;
  const overallAccuracy =
    context.attempts.length > 0 ? totalCorrect / context.attempts.length : 0;
  const practiced = stats.filter((item) => item.total > 0);
  const strengths = practiced
    .filter((item) => item.accuracy >= 0.8)
    .map((item) => item.title);
  const weaknesses = practiced
    .filter((item) => item.accuracy < 0.8)
    .map((item) => item.title);
  const recommendedFocus = practiced
    .filter((item) => item.accuracy < 0.8)
    .sort((left, right) => left.accuracy - right.accuracy)
    .map((item) => item.id);
  const completionSignal = Math.min(context.attempts.length, 10) / 10;
  const mastery = Math.round(overallAccuracy * 85 + completionSignal * 15);

  return {
    mastery,
    strengths,
    weaknesses,
    recommendedFocus,
    summary:
      mastery >= 80
        ? "学生已经比较稳定地掌握本 Knowledge，建议保持间隔复习。"
        : "学生已理解主要规则，但薄弱 subtopic 仍需要针对性训练。",
  };
}

export function createMockLLMProvider(): LLMProvider {
  return {
    kind: "mock",
    async generate<T>(_prompt: string, _schema: z.ZodType<T>, context?: unknown) {
      const task = (context as { task?: string } | undefined)?.task;

      if (task === "generate_batch") {
        const batch = generateMockQuestions(context as BatchGenerationContext);
        return validateQuestionBatch(
          batch,
          (context as BatchGenerationContext).knowledge,
        ) as T;
      }

      if (task === "analyze_batch") {
        const analysisContext = context as BatchAnalysisContext;
        return validateAgentDecision(
          analyzeMockBatch(analysisContext),
          analysisContext.knowledge,
        ) as T;
      }

      if (task === "summarize_session") {
        const summaryContext = context as SessionSummaryContext;
        return validateSessionSummary(
          summarizeMockSession(summaryContext),
          summaryContext.knowledge,
        ) as T;
      }

      throw new Error(`未知 Mock Provider 任务：${String(task)}`);
    },
  };
}
