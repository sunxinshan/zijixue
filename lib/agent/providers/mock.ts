import type { z } from "zod";

import { countConsecutiveWeakBatches } from "@/lib/agent/analysis";
import type { LLMProvider } from "@/lib/agent/llm";
import {
  validateQuestionBatch,
  validateSessionSummary,
  validateTeachingStrategy,
} from "@/lib/agent/validation";
import { MAX_QUESTIONS_PER_BATCH, MIN_QUESTIONS_PER_BATCH } from "@/lib/game";
import type {
  BatchGenerationContext,
  BatchPerformance,
  Difficulty,
  Knowledge,
  Pattern,
  PatternProgress,
  Question,
  QuestionBatch,
  QuestionDistributionItem,
  SessionSummary,
  SessionSummaryContext,
  StrategyGenerationContext,
  TeachingStrategy,
} from "@/types/agent";

function clampDifficulty(value: number): Difficulty {
  return Math.max(1, Math.min(5, Math.round(value))) as Difficulty;
}

function allPatterns(knowledge: Knowledge): Pattern[] {
  return knowledge.subtopics.flatMap((subtopic) => subtopic.patterns);
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function buildDistribution(
  patterns: Pattern[],
  priorityPatternIds: string[],
  requestedTotal = Math.min(12, patterns.length + 4),
): QuestionDistributionItem[] {
  const targetTotal = Math.max(
    MIN_QUESTIONS_PER_BATCH,
    Math.min(MAX_QUESTIONS_PER_BATCH, requestedTotal),
  );
  const counts = new Map(patterns.map((pattern) => [pattern.id, 0]));
  const priority = unique(priorityPatternIds).filter((id) => counts.has(id));
  const required = patterns.filter((pattern) => pattern.required).map((pattern) => pattern.id);
  const order = unique([...priority, ...required, ...patterns.map((pattern) => pattern.id)]);
  let assigned = 0;

  if (targetTotal <= patterns.length) {
    for (const patternId of priority) {
      if (assigned + 3 > targetTotal) break;
      counts.set(patternId, 3);
      assigned += 3;
    }
    for (const patternId of order) {
      if (assigned >= targetTotal) break;
      if ((counts.get(patternId) ?? 0) > 0) continue;
      counts.set(patternId, 1);
      assigned += 1;
    }
  } else {
    for (const patternId of order) {
      if (assigned >= targetTotal) break;
      counts.set(patternId, 1);
      assigned += 1;
    }

    for (const patternId of priority) {
      while (assigned < targetTotal && (counts.get(patternId) ?? 0) < 6) {
        counts.set(patternId, (counts.get(patternId) ?? 0) + 1);
        assigned += 1;
      }
    }
  }

  let index = 0;
  while (assigned < targetTotal && order.length > 0) {
    const patternId = order[index % order.length];
    counts.set(patternId, (counts.get(patternId) ?? 0) + 1);
    assigned += 1;
    index += 1;
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 0)
    .map(([patternId, count]) => ({ patternId, count }));
}

function weakPatterns(
  performance: BatchPerformance,
  threshold = 60,
): { patternId: string; accuracy: number }[] {
  return performance.patternStats
    .filter(
      (item) =>
        item.accuracy < threshold && (item.total >= 2 || item.correct === 0),
    )
    .sort((left, right) => left.accuracy - right.accuracy)
    .map((item) => ({ patternId: item.patternId, accuracy: item.accuracy }));
}

function uncoveredPatternIds(
  patterns: Pattern[],
  progress: Record<string, PatternProgress>,
): string[] {
  const incomplete = patterns.filter(
    (pattern) => pattern.required && !progress[pattern.id]?.coverageComplete,
  );
  return [
    ...incomplete.filter((pattern) => (progress[pattern.id]?.attemptedQuestions ?? 0) > 0),
    ...incomplete.filter((pattern) => (progress[pattern.id]?.attemptedQuestions ?? 0) === 0),
  ].map((pattern) => pattern.id);
}

function exampleStrings(pattern: Pattern): string[] {
  return pattern.examples.slice(0, 3).map((example) => example.text);
}

function makeStrategy(
  input: Omit<TeachingStrategy, "questionDistribution"> & {
    questionDistribution?: QuestionDistributionItem[];
  },
): TeachingStrategy {
  return {
    ...input,
    questionDistribution: input.questionDistribution ?? [],
  };
}

function diagnoseMockStrategy(
  context: StrategyGenerationContext,
): TeachingStrategy {
  const patterns = allPatterns(context.knowledge);
  const { currentBatch, pastBatches, previousStrategies } = context.observation;
  const weak = weakPatterns(currentBatch);
  const uncovered = uncoveredPatternIds(patterns, context.observation.patternProgress);
  const previousStrategy = previousStrategies.at(-1);
  const currentDifficulty = context.learningState.currentDifficulty;
  const accuracyHistory = [
    ...pastBatches.map((batch) => batch.accuracy),
    currentBatch.accuracy,
  ];

  if (currentBatch.total > 0) {
    const persistent = currentBatch.patternStats
      .filter((item) => item.accuracy < 60 && (item.total >= 2 || item.correct === 0))
      .map((item) => ({
        patternId: item.patternId,
        consecutive: countConsecutiveWeakBatches(
          item.patternId,
          pastBatches,
          currentBatch,
        ),
      }))
      .sort((left, right) => right.consecutive - left.consecutive)[0];

    if (persistent && persistent.consecutive >= 2) {
      const focus = [persistent.patternId];
      const pattern = patterns.find((item) => item.id === persistent.patternId);
      return makeStrategy({
        diagnosis: "persistent_failure",
        strategyLevel: 4,
        action: "change_strategy",
        focus,
        difficulty: clampDifficulty(currentDifficulty - 1),
        questionDistribution: buildDistribution(patterns, focus, 5),
        explanation: `${pattern?.name ?? persistent.patternId} 连续多个 batch 不稳定，改用更简单、更少干扰项和正反例。`,
        examples: pattern ? exampleStrings(pattern) : [],
        reason: "同一 Pattern 连续多个 batch 低于目标正确率，需要改变教学方式。",
      });
    }

    const consecutive = Object.entries(context.observation.consecutivePatternErrors)
      .filter(([patternId]) => weak.some((item) => item.patternId === patternId))
      .sort((left, right) => right[1] - left[1])[0];

    if (consecutive && consecutive[1] >= 3) {
      const focus = [consecutive[0]];
      const pattern = patterns.find((item) => item.id === focus[0]);
      return makeStrategy({
        diagnosis: "rule_misunderstanding",
        strategyLevel: 3,
        action: "explain",
        focus,
        difficulty: clampDifficulty(currentDifficulty - 1),
        questionDistribution: buildDistribution(patterns, focus, 5),
        explanation: `${pattern?.name ?? focus[0]} 出现连续错误，先重新解释规则，再用简单练习确认。`,
        examples: pattern ? exampleStrings(pattern) : [],
        reason: "同一 Pattern 连续出错，判断为规则理解问题。",
      });
    }
  }

  if (
    accuracyHistory.length >= 2 &&
    accuracyHistory.at(-1)! >= 90 &&
    accuracyHistory
      .slice(-3)
      .every((value, index, values) => index === 0 || value > values[index - 1])
  ) {
    const focus =
      weak.length > 0
        ? weak.slice(0, 2).map((item) => item.patternId)
        : context.learningState.recommendedFocus.length > 0
          ? context.learningState.recommendedFocus.slice(0, 2)
          : [patterns[0].id];
    const pattern = patterns.find((item) => item.id === focus[0]);
    return makeStrategy({
      diagnosis: "improving",
      strategyLevel: 3,
      action: "increase_difficulty",
      focus,
      difficulty: clampDifficulty(currentDifficulty + 1),
      questionDistribution: buildDistribution(patterns, focus, 10),
      explanation: "表现正在连续提高，下一批增加混合和难度。",
      examples: pattern ? exampleStrings(pattern) : [],
      reason: "连续多个 batch 准确率提升。",
    });
  }

  if (
    accuracyHistory.length >= 2 &&
    accuracyHistory.slice(-2).every((accuracy) => accuracy >= 90) &&
    uncovered.length === 0
  ) {
    return makeStrategy({
      diagnosis: "mastered",
      strategyLevel: 5,
      action: "finish",
      focus: [],
      difficulty: currentDifficulty,
      questionDistribution: [],
      reason: "连续多个 batch 稳定正确且 Coverage 完成。",
    });
  }

  if (uncovered.length > 0) {
    const focus = uncovered.slice(0, 3);
    return makeStrategy({
      diagnosis: "subtopic_weakness",
      strategyLevel: 2,
      action: "targeted_practice",
      focus,
      difficulty: currentDifficulty,
      questionDistribution: buildDistribution(patterns, focus, Math.max(8, focus.length * 3)),
      reason: "仍有 required Pattern 未完成 Coverage，优先补齐覆盖。",
    });
  }

  if (weak.length >= 2) {
    const focus = weak.slice(0, 2).map((item) => item.patternId);
    return makeStrategy({
      diagnosis: "multiple_weaknesses",
      strategyLevel: 2,
      action: "targeted_practice",
      focus,
      difficulty: currentDifficulty,
      questionDistribution: buildDistribution(patterns, focus, 8),
      reason: "多个 Pattern 同时薄弱，优先训练两个最低分项。",
    });
  }

  if (weak.length === 1) {
    const focus = [weak[0].patternId];
    return makeStrategy({
      diagnosis: "subtopic_weakness",
      strategyLevel: 2,
      action: "targeted_practice",
      focus,
      difficulty: currentDifficulty,
      questionDistribution: buildDistribution(patterns, focus, 6),
      reason: "错误集中在单一 Pattern。",
    });
  }

  if (currentBatch.accuracy >= 85 && previousStrategy?.diagnosis !== "mastered") {
    return makeStrategy({
      diagnosis: "accidental",
      strategyLevel: 1,
      action: "continue",
      focus: [],
      difficulty: currentDifficulty,
      questionDistribution: buildDistribution(patterns, []),
      reason: "错误没有明显集中，正常继续。",
    });
  }

  return makeStrategy({
    diagnosis: "accidental",
    strategyLevel: 1,
    action: "continue",
    focus: [],
    difficulty: currentDifficulty,
    questionDistribution: buildDistribution(patterns, uncovered),
    reason: "继续收集 Pattern 表现。",
  });
}

interface GeneratedQuestionData {
  question: string;
  options?: string[];
  answer: string | boolean;
  explanation: string;
  coverageItemId?: string;
}

function grammarQuestion(
  pattern: Pattern,
  index: number,
): GeneratedQuestionData {
  const coverageItemId =
    pattern.coverageItems?.[index % pattern.coverageItems.length];
  if (pattern.id === "comparative-form") {
    const example = pattern.examples[index % pattern.examples.length];
    return {
      question: `${example.base ?? "tall"} 的比较级是？`,
      options: [example.comparative ?? "taller", `${example.base ?? "tall"}est`, `more ${example.base ?? "tall"}`],
      answer: example.comparative ?? "taller",
      explanation: pattern.description,
      coverageItemId: example.coverageItemId ?? coverageItemId,
    };
  }
  if (pattern.id === "superlative-form") {
    const example = pattern.examples[index % pattern.examples.length];
    return {
      question: `${example.base ?? "tall"} 的最高级是？`,
      options: [example.superlative ?? "tallest", `${example.base ?? "tall"}er`, `most ${example.base ?? "tall"}`],
      answer: example.superlative ?? "tallest",
      explanation: pattern.description,
      coverageItemId: example.coverageItemId ?? coverageItemId,
    };
  }

  const templates: Record<
    string,
    { question: string; options: string[]; answer: string; explanation: string }
  > = {
    "comparative-be": {
      question: "选择正确的词：Tom ___ taller than Ken.",
      options: ["is", "are", "has"],
      answer: "is",
      explanation: "A + be + 比较级 + than + B。",
    },
    "comparative-action": {
      question: "选择正确的词：I run ___ than Misa.",
      options: ["faster", "more fast", "fastest"],
      answer: "faster",
      explanation: "行为动词句使用比较级 faster than。",
    },
    "comparative-than": {
      question: "选择正确的词：Tom is taller ___ Ken.",
      options: ["than", "as", "of"],
      answer: "than",
      explanation: "比较级后用 than 引出比较对象。",
    },
    "which-comparative": {
      question: "选择正确的词：Which is longer, April ___ May?",
      options: ["or", "and", "than"],
      answer: "or",
      explanation: "Which A or B? 表示两个对象中选一个。",
    },
    "superlative-the": {
      question: "选择正确的词：Tom is ___ tallest.",
      options: ["the", "a", "than"],
      answer: "the",
      explanation: "最高级前通常使用 the。",
    },
    "superlative-of": {
      question: "选择正确的词：Tom is the tallest ___ the three.",
      options: ["of", "in", "than"],
      answer: "of",
      explanation: "of 表示范围中的人或物。",
    },
    "superlative-in": {
      question: "选择正确的词：I run the fastest ___ my class.",
      options: ["in", "of", "than"],
      answer: "in",
      explanation: "in 表示地点或班级范围。",
    },
    "which-superlative": {
      question: "选择正确的词：___ animal is the strongest?",
      options: ["Which", "Who", "What"],
      answer: "Which",
      explanation: "Which + 最高级用于从范围中提问。",
    },
    "as-as": {
      question: "选择正确的词：My dog is ___ big as yours.",
      options: ["as", "than", "more"],
      answer: "as",
      explanation: "as + 形容词 + as 表示和……一样。",
    },
    "not-as-as": {
      question: "选择正确的词：I'm ___ as tall as Penny.",
      options: ["not", "more", "than"],
      answer: "not",
      explanation: "not as...as 表示没有……那么……。",
    },
  };

  const template = templates[pattern.id] ?? {
    question: `请选择符合 ${pattern.name} 的句子。`,
    options: pattern.examples.slice(0, 3).map((example) => example.text),
    answer: pattern.examples[0]?.text ?? pattern.name,
    explanation: pattern.description,
  };

  return {
    ...template,
    options: [...template.options],
    explanation: template.explanation,
    coverageItemId,
  };
}

function formQuestion(
  pattern: Pattern,
  index: number,
): GeneratedQuestionData {
  const examples = pattern.examples;
  const example = examples[index % examples.length];
  const form = index % 2 === 0 ? "comparative" : "superlative";
  const correct =
    form === "comparative"
      ? example.comparative ?? example.text
      : example.superlative ?? example.text;
  const label = form === "comparative" ? "比较级" : "最高级";
  const wrong = [
    `${example.base ?? "word"}er`,
    form === "comparative" ? `more ${example.base ?? "word"}` : `most ${example.base ?? "word"}`,
  ];
  const options = Array.from(new Set([correct, ...wrong])).slice(0, 4);

  return {
    question: `${example.base ?? "word"} 的${label}是？`,
    options,
    answer: correct,
    explanation: `${pattern.name}：${example.text}`,
    coverageItemId: example.coverageItemId,
  };
}

function generateMockQuestions(context: BatchGenerationContext): QuestionBatch {
  const patterns = allPatterns(context.knowledge);
  const patternById = new Map(patterns.map((pattern) => [pattern.id, pattern]));
  const plan = context.strategy.questionDistribution.flatMap((item) => {
    const pattern = patternById.get(item.patternId);
    return pattern ? Array.from({ length: item.count }, () => pattern) : [];
  });
  const seenQuestions = new Set(context.previousQuestions);
  const questions: Question[] = [];

  for (let index = 0; index < plan.length && questions.length < plan.length; index += 1) {
    const pattern = plan[index];
    const isFormPattern =
      Boolean(pattern.examples[0]?.comparative) &&
      Boolean(pattern.examples[0]?.superlative);
    const generated = isFormPattern
      ? formQuestion(pattern, index)
      : grammarQuestion(pattern, index);
    const type = index % 3 === 0 ? "true-false" : "choice";
    let questionText = generated.question;
    let answer = generated.answer;
    let options = generated.options;

    if (type === "true-false") {
      if (typeof answer !== "string") continue;
      const showCorrect = index % 2 === 0;
      const shown = showCorrect
        ? answer
        : options?.find((option) => option !== answer) ?? answer;
      questionText = `“${shown}”是正确形式。`;
      answer = showCorrect;
      options = undefined;
    }

    if (seenQuestions.has(questionText)) {
      questionText = `请选择：${questionText}`;
    }
    if (seenQuestions.has(questionText)) {
      questionText = `${questionText}（第 ${index + 1} 题）`;
    }
    seenQuestions.add(questionText);

    questions.push({
      id: `mock-${pattern.id}-${context.batchNumber}-${index}`,
      type,
      question: questionText,
      options,
      answer,
      explanation: generated.explanation,
      knowledgeId: context.knowledge.id,
      knowledgeSubtopic: pattern.subtopicId,
      patternId: pattern.id,
      coverageItemId: generated.coverageItemId,
      difficulty: clampDifficulty(
        context.strategy.difficulty + (index % 3 === 0 ? -1 : index % 3 === 2 ? 1 : 0),
      ),
    });
  }

  return { questions };
}

function summarizeMockSession(context: SessionSummaryContext): SessionSummary {
  const questionById = new Map(context.questions.map((question) => [question.id, question]));
  const patternStats = allPatterns(context.knowledge).map((pattern) => {
    const attempts = context.attempts.filter(
      (attempt) => questionById.get(attempt.questionId)?.patternId === pattern.id,
    );
    const correct = attempts.filter((attempt) => attempt.correct).length;
    return {
      id: pattern.id,
      name: pattern.name,
      total: attempts.length,
      accuracy: attempts.length > 0 ? correct / attempts.length : 0,
    };
  });
  const practiced = patternStats.filter((item) => item.total > 0);
  const overall = context.attempts.length
    ? context.attempts.filter((attempt) => attempt.correct).length / context.attempts.length
    : 0;
  const strengths = practiced.filter((item) => item.accuracy >= 0.8).map((item) => item.name);
  const weaknesses = practiced.filter((item) => item.accuracy < 0.8).map((item) => item.name);
  const recommendedFocus = practiced
    .filter((item) => item.accuracy < 0.8)
    .sort((left, right) => left.accuracy - right.accuracy)
    .map((item) => item.id);

  return {
    mastery: Math.round(overall * 100),
    strengths,
    weaknesses,
    recommendedFocus,
    summary:
      recommendedFocus.length > 0
        ? "部分 Pattern 仍需继续巩固，优先完成弱项训练和 Coverage。"
        : "当前 Pattern 表现稳定，可以继续混合验证或完成该关卡。",
  };
}

export function createMockLLMProvider(): LLMProvider {
  return {
    kind: "mock",
    async generate<T>(_prompt: string, _schema: z.ZodType<T>, context?: unknown) {
      const task = (context as { task?: string } | undefined)?.task;

      if (task === "generate_teaching_strategy") {
        const strategyContext = context as StrategyGenerationContext;
        return validateTeachingStrategy(
          diagnoseMockStrategy(strategyContext),
          strategyContext.knowledge,
        ) as T;
      }

      if (task === "generate_question_batch") {
        const generationContext = context as BatchGenerationContext;
        return randomizeOptions(
          validateQuestionBatch(
            generateMockQuestions(generationContext),
            generationContext.knowledge,
            generationContext.strategy.questionDistribution,
          ),
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

function randomizeOptions(batch: QuestionBatch): QuestionBatch {
  const questions = [...batch.questions];
  const choiceIndexes = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => question.type === "choice" && question.options);
  const positions = choiceIndexes.map((_, index) => index % 4);

  choiceIndexes.forEach(({ question, index }, positionIndex) => {
    if (!question.options || typeof question.answer !== "string") return;
    const distractors = question.options.filter((option) => option !== question.answer);
    const reordered = [...distractors];
    reordered.splice(
      Math.min(positions[positionIndex], reordered.length),
      0,
      question.answer,
    );
    questions[index] = { ...question, options: reordered };
  });

  return { questions };
}
