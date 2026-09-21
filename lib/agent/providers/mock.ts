import type { z } from "zod";

import { countConsecutiveWeakBatches } from "@/lib/agent/analysis";
import type { LLMProvider } from "@/lib/agent/llm";
import {
  validateQuestionBatch,
  validateSessionSummary,
  validateTeachingStrategy,
} from "@/lib/agent/validation";
import type {
  BatchGenerationContext,
  BatchPerformance,
  Difficulty,
  Knowledge,
  KnowledgeExample,
  Question,
  QuestionBatch,
  QuestionDistributionItem,
  SessionSummary,
  SessionSummaryContext,
  StrategyGenerationContext,
  TeachingStrategy,
} from "@/types/agent";

interface ExampleEntry {
  subtopicId: string;
  example: KnowledgeExample;
}

function clampDifficulty(value: number): Difficulty {
  return Math.max(1, Math.min(5, Math.round(value))) as Difficulty;
}

function collectExamples(knowledge: Knowledge, subtopicId: string): ExampleEntry[] {
  const rule = knowledge.rules.find((item) => item.subtopicId === subtopicId);
  return (rule?.examples ?? []).map((example) => ({ subtopicId, example }));
}

function wrongForm(base: string, form: "comparative" | "superlative"): string {
  return form === "comparative" ? `${base}er` : `${base}est`;
}

function buildChoiceOptions(
  base: string,
  correct: string,
  form: "comparative" | "superlative",
  optionSeed: number,
  simplified: boolean,
): string[] {
  const candidates = [
    correct,
    wrongForm(base, form),
    form === "comparative" ? `more ${base}` : `most ${base}`,
    form === "comparative" ? `${base}iest` : `${base}ier`,
  ];
  const unique = simplified
    ? [correct, wrongForm(base, form)]
    : Array.from(new Set(candidates));
  const offset = optionSeed % unique.length;
  return [...unique.slice(offset), ...unique.slice(0, offset)];
}

function createQuestionId(seed: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${seed}-${crypto.randomUUID()}`;
  }
  return `${seed}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function distributeRemainder(
  knowledge: Knowledge,
  primary: string,
  primaryCount: number,
): QuestionDistributionItem[] {
  const distribution: QuestionDistributionItem[] = [
    { subtopic: primary, count: primaryCount },
  ];
  const others = knowledge.subtopics
    .map((subtopic) => subtopic.id)
    .filter((id) => id !== primary);
  let remaining = 10 - primaryCount;

  for (let index = 0; remaining > 0; index += 1) {
    const subtopic = others[index % others.length];
    const item = distribution.find((entry) => entry.subtopic === subtopic);
    if (item) item.count += 1;
    else distribution.push({ subtopic, count: 1 });
    remaining -= 1;
  }

  return distribution;
}

function balancedDistribution(knowledge: Knowledge): QuestionDistributionItem[] {
  const distribution = knowledge.subtopics.map((subtopic) => ({
    subtopic: subtopic.id,
    count: 0,
  }));
  for (let index = 0; index < 10; index += 1) {
    distribution[index % distribution.length].count += 1;
  }
  return distribution.filter((item) => item.count > 0);
}

function twoFocusDistribution(
  knowledge: Knowledge,
  first: string,
  second: string,
): QuestionDistributionItem[] {
  const distribution: QuestionDistributionItem[] = [
    { subtopic: first, count: 4 },
    { subtopic: second, count: 4 },
  ];
  const others = knowledge.subtopics
    .map((subtopic) => subtopic.id)
    .filter((id) => id !== first && id !== second);
  let remaining = 2;

  for (let index = 0; remaining > 0; index += 1) {
    const subtopic = others[index % others.length];
    const item = distribution.find((entry) => entry.subtopic === subtopic);
    if (item) item.count += 1;
    else distribution.push({ subtopic, count: 1 });
    remaining -= 1;
  }

  return distribution;
}

function getWeakSubtopics(
  performance: BatchPerformance,
  threshold = 60,
): { subtopic: string; accuracy: number }[] {
  return performance.subtopicStats
    .filter(
      (item) =>
        item.accuracy < threshold &&
        (item.total >= 3 || item.correct === 0),
    )
    .sort((left, right) => left.accuracy - right.accuracy)
    .map((item) => ({ subtopic: item.subtopic, accuracy: item.accuracy }));
}

function getStrategyExamples(
  knowledge: Knowledge,
  focus: string[],
): string[] {
  return focus
    .flatMap((subtopic) => collectExamples(knowledge, subtopic))
    .slice(0, 3)
    .map(
      (entry) =>
        `${entry.example.base} → ${entry.example.comparative} → ${entry.example.superlative}`,
    );
}

function makeStrategy(
  knowledge: Knowledge,
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
  const { knowledge, learningState, observation } = context;
  const { currentBatch, pastBatches, previousStrategies } = observation;
  const weakSubtopics = getWeakSubtopics(currentBatch);
  const previousStrategy = previousStrategies.at(-1);
  const currentDifficulty = learningState.currentDifficulty;
  const accuracyHistory = [
    ...pastBatches.map((batch) => batch.accuracy),
    currentBatch.accuracy,
  ];

  if (currentBatch.total > 0) {
    const persistentCandidates = currentBatch.subtopicStats
      .filter(
        (item) =>
          item.accuracy < 60 && (item.total >= 3 || item.correct === 0),
      )
      .map((item) => ({
        subtopic: item.subtopic,
        consecutive: countConsecutiveWeakBatches(
          item.subtopic,
          pastBatches,
          currentBatch,
        ),
      }))
      .sort((left, right) => right.consecutive - left.consecutive);

    const persistent = persistentCandidates[0];
    if (persistent && persistent.consecutive >= 2) {
      const focus = [persistent.subtopic];
      return makeStrategy(knowledge, {
        diagnosis: "persistent_failure",
        strategyLevel: 4,
        action: "change_strategy",
        focus,
        difficulty: clampDifficulty(currentDifficulty - 1),
        questionDistribution: distributeRemainder(knowledge, persistent.subtopic, 4),
        explanation: `${knowledge.subtopics.find((item) => item.id === persistent.subtopic)?.title ?? persistent.subtopic} 已经连续多个 batch 不稳定，这一批改用更简单的正反例和更少干扰项。`,
        examples: getStrategyExamples(knowledge, focus),
        reason: "同一 subtopic 连续多个 batch 低于目标准确率，需要改变教学方式。",
      });
    }

    const consecutiveRuleFailure = Object.entries(
      observation.consecutiveSubtopicErrors,
    )
      .filter(([subtopic]) =>
        weakSubtopics.some((item) => item.subtopic === subtopic),
      )
      .sort((left, right) => right[1] - left[1])[0];

    if (consecutiveRuleFailure && consecutiveRuleFailure[1] >= 3) {
      const focus = [consecutiveRuleFailure[0]];
      return makeStrategy(knowledge, {
        diagnosis: "rule_misunderstanding",
        strategyLevel: 3,
        action: "explain",
        focus,
        difficulty: clampDifficulty(currentDifficulty - 1),
        questionDistribution: distributeRemainder(knowledge, focus[0], 5),
        explanation: `${knowledge.subtopics.find((item) => item.id === focus[0])?.title ?? focus[0]} 出现连续错误，先重新解释规则，再用简单练习确认。`,
        examples: getStrategyExamples(knowledge, focus),
        reason: "同一规则在当前 batch 中连续出错，判断为规则理解问题。",
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
      weakSubtopics.length > 0
        ? weakSubtopics.slice(0, 2).map((item) => item.subtopic)
        : learningState.recommendedFocus.length > 0
          ? learningState.recommendedFocus.slice(0, 2)
          : [knowledge.subtopics[0].id];
    return makeStrategy(knowledge, {
      diagnosis: "improving",
      strategyLevel: 3,
      action: "increase_difficulty",
      focus,
      difficulty: clampDifficulty(currentDifficulty + 1),
      questionDistribution: balancedDistribution(knowledge),
      explanation: "表现正在连续提高，下一批增加混合题并逐步提高难度。",
      examples: getStrategyExamples(knowledge, focus),
      reason: "连续多个 batch 准确率提升，进入提高难度的综合练习。",
    });
  }

  if (
    accuracyHistory.length >= 2 &&
    accuracyHistory.slice(-2).every((accuracy) => accuracy >= 90)
  ) {
    return makeStrategy(knowledge, {
      diagnosis: "mastered",
      strategyLevel: 5,
      action: "finish",
      focus: [],
      difficulty: currentDifficulty,
      questionDistribution: [],
      reason: "连续多个 batch 稳定正确，达到结束 Session 的条件。",
    });
  }

  if (weakSubtopics.length >= 2) {
    const focus = weakSubtopics.slice(0, 2).map((item) => item.subtopic);
    return makeStrategy(knowledge, {
      diagnosis: "multiple_weaknesses",
      strategyLevel: 2,
      action: "targeted_practice",
      focus,
      difficulty: currentDifficulty,
      questionDistribution: twoFocusDistribution(knowledge, focus[0], focus[1]),
      explanation: "多个 subtopic 同时不稳定，先集中训练优先级最高的两个。",
      examples: getStrategyExamples(knowledge, focus),
      reason: "当前 batch 有多个 subtopic 低于目标准确率。",
    });
  }

  if (weakSubtopics.length === 1) {
    const focus = [weakSubtopics[0].subtopic];
    return makeStrategy(knowledge, {
      diagnosis: "subtopic_weakness",
      strategyLevel: 2,
      action: "targeted_practice",
      focus,
      difficulty: currentDifficulty,
      questionDistribution: distributeRemainder(knowledge, focus[0], 6),
      reason: "错误集中在单一 subtopic，下一批提高该 subtopic 的占比。",
    });
  }

  if (currentBatch.accuracy >= 85 && previousStrategy?.diagnosis !== "mastered") {
    return makeStrategy(knowledge, {
      diagnosis: "accidental",
      strategyLevel: 1,
      action: "continue",
      focus: [],
      difficulty: currentDifficulty,
      questionDistribution: balancedDistribution(knowledge),
      reason: "错误没有明显集中，保持正常练习。",
    });
  }

  return makeStrategy(knowledge, {
    diagnosis: "accidental",
    strategyLevel: 1,
    action: "continue",
    focus: [],
    difficulty: currentDifficulty,
    questionDistribution: balancedDistribution(knowledge),
    reason: "暂未发现稳定的错误模式，继续收集学习表现。",
  });
}

function buildQuestionPlan(
  knowledge: Knowledge,
  strategy: TeachingStrategy,
): ExampleEntry[] {
  const distribution =
    strategy.questionDistribution.length > 0
      ? strategy.questionDistribution
      : balancedDistribution(knowledge);
  return distribution.flatMap((item) =>
    Array.from({ length: item.count }, (_, index) => {
      const examples = collectExamples(knowledge, item.subtopic);
      return examples[index % examples.length];
    }),
  );
}

function generateMockQuestions(context: BatchGenerationContext): QuestionBatch {
  const plan = buildQuestionPlan(context.knowledge, context.strategy);
  const previous = new Set(context.previousQuestions);
  const questions: Question[] = [];

  for (let index = 0; index < plan.length && questions.length < 10; index += 1) {
    const entry = plan[index];
    const form = index % 2 === 0 ? "comparative" : "superlative";
    const correct = entry.example[form];
    const improvedMode = context.strategy.strategyLevel >= 3;
    const persistentMode = context.strategy.diagnosis === "persistent_failure";
    const type = persistentMode
      ? index % 2 === 0
        ? "true-false"
        : "choice"
      : improvedMode
        ? index % 3 === 0
          ? "true-false"
          : "choice"
        : index % 4 < 2
          ? "choice"
          : "true-false";
    const difficulty = clampDifficulty(
      context.strategy.difficulty +
        (index % 3 === 0 ? -1 : index % 3 === 2 ? 1 : 0),
    );
    const subtopic = context.knowledge.subtopics.find(
      (item) => item.id === entry.subtopicId,
    );

    let questionText: string;
    let answer: string | boolean;
    let options: string[] | undefined;
    let explanation: string;

    if (type === "choice") {
      questionText = persistentMode
        ? `选出正确形式：${entry.example.base} 的${
            form === "comparative" ? "比较级" : "最高级"
          }`
        : `${entry.example.base} 的${
            form === "comparative" ? "比较级" : "最高级"
          }是？`;
      answer = correct;
      options = buildChoiceOptions(
        entry.example.base,
        correct,
        form,
        index,
        improvedMode || persistentMode,
      );
      explanation = `${subtopic?.title ?? entry.subtopicId}：${entry.example.base} → ${entry.example.comparative} → ${entry.example.superlative}。`;
    } else {
      const shouldBeTrue = improvedMode ? index % 3 !== 1 : index % 2 === 0;
      const shown = shouldBeTrue
        ? correct
        : wrongForm(entry.example.base, form);
      questionText = `“${shown}”是 ${entry.example.base} 的${
        form === "comparative" ? "比较级" : "最高级"
      }。`;
      answer = shouldBeTrue;
      explanation = `${entry.example.base} 的${form === "comparative" ? "比较级" : "最高级"}是 ${correct}。`;
    }

    const seen = new Set([
      ...previous,
      ...questions.map((question) => question.question),
    ]);
    if (seen.has(questionText)) {
      questionText = `请完成：${questionText}`;
    }
    if (seen.has(questionText)) {
      questionText = `${questionText}（第 ${index + 1} 题）`;
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
  const finalStrategy = context.strategies.at(-1);
  const mastery = Math.round(
    overallAccuracy * 80 +
      (finalStrategy?.diagnosis === "mastered" ? 20 : Math.min(context.attempts.length, 30) / 2),
  );

  return {
    mastery: Math.max(0, Math.min(100, mastery)),
    strengths,
    weaknesses,
    recommendedFocus,
    summary:
      finalStrategy?.diagnosis === "mastered"
        ? "多个 batch 表现稳定，已经达到本 Knowledge 的阶段目标。"
        : "学生的表现正在变化，建议继续按当前教学策略巩固薄弱 subtopic。",
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
        const batch = generateMockQuestions(generationContext);
        return validateQuestionBatch(
          batch,
          generationContext.knowledge,
          generationContext.strategy.questionDistribution,
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
