import type {
  BatchGenerationContext,
  SessionSummaryContext,
  StrategyGenerationContext,
} from "@/types/agent";

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildTeachingStrategyPrompt(
  context: StrategyGenerationContext,
): string {
  const patterns = context.knowledge.subtopics.flatMap((subtopic) =>
    subtopic.patterns.map((pattern) => ({
      id: pattern.id,
      subtopicId: pattern.subtopicId,
      name: pattern.name,
      description: pattern.description,
      required: pattern.required,
      minimumQuestions: pattern.minimumQuestions,
      coverageItems: pattern.coverageItems,
    })),
  );

  return `你是“英语森林”的教学诊断 Agent。程序已经记录客观 Attempt、Pattern Coverage 和 Batch 表现，你负责选择下一步 Pattern 教学策略。

必须遵守：
- diagnosis 只能是 accidental、subtopic_weakness、rule_misunderstanding、multiple_weaknesses、persistent_failure、improving、mastered。
- strategyLevel 只能是 1 到 5。
- action 只能是 continue、targeted_practice、explain、simplify、change_strategy、increase_difficulty、mixed_review、finish。
- focus 必须是 patternId 字符串数组。
- questionDistribution 必须使用 patternId，除 finish 外 count 总和必须正好为 ${15}。
- 未完成 Coverage 的 required Pattern 必须优先安排。
- 弱 Pattern 增加题量，已掌握 Pattern 减少题量。
- strategyLevel 3 以上必须提供 explanation 和 examples。
- examples 必须是字符串数组，例如 ["happy → happier → happiest"]。
- persistent_failure 必须使用 strategyLevel >= 4，并改变教学方式。
- 只返回 JSON 对象，包含 diagnosis、strategyLevel、action、focus、difficulty、questionDistribution、explanation、examples、reason。

当前允许使用的 Patterns：
${serialize(patterns)}

当前 Knowledge / Subtopic 边界：
${serialize(context.knowledge)}

当前 LearningState：
${serialize(context.learningState)}

程序计算的 Pattern 客观观察：
${serialize(context.observation)}

请返回 TeachingStrategy JSON。`;
}

export function buildBatchGenerationPrompt(context: BatchGenerationContext): string {
  return `你是“英语森林”的题目生成 Agent。程序已经决定 Pattern 教学策略和题目分布，你只能严格按照边界生成题目。

任务边界：
- 必须生成正好 15 道题。
- 只允许 choice 和 true-false。
- 每道题必须属于 knowledgeId="${context.knowledge.id}"。
- 每道题必须同时填写 knowledgeSubtopic 和 patternId。
- patternId 必须来自当前允许的 Patterns。
- 必须严格符合 questionDistribution 中每个 Pattern 的 count。
- 如果 Pattern 定义了 coverageItems，必须使用 coverageItemId 标记覆盖项。
- 同一 Pattern 的核心 coverageItems 应尽量全部覆盖。
- choice 的 answer 必须是 options 中的字符串。
- true-false 的 answer 必须是布尔值。
- difficulty 必须是 1 到 5 的整数。
- 不要重复 previousQuestions 中已经出现的题目。
- 正确答案不要总放在第一个位置。
- question 题干必须使用中文说明；英文只能出现在被引用的句子、空格、或 options 中。
- 每道题必须包含 id、type、question、options、answer、explanation、knowledgeId、knowledgeSubtopic、patternId、coverageItemId、difficulty。
- 不要返回全英文题干。
- 只返回 JSON 对象，并且仅包含 questions 数组。

当前 Knowledge / Subtopic 边界：
${serialize(context.knowledge)}

教学策略：
${serialize(context.strategy)}

Pattern 分布：
${serialize(context.strategy.questionDistribution)}

LearningState：
${serialize(context.learningState)}

previousQuestions：
${serialize(context.previousQuestions.slice(-50))}

请返回 questions JSON。`;
}

export function buildSessionSummaryPrompt(context: SessionSummaryContext): string {
  return `你是“英语森林”的教学总结 Agent。请综合整个 Session 的客观 Attempt、Pattern Coverage 与每批 TeachingStrategy，生成最终学习总结。

要求：
- mastery 是 0 到 100 的综合掌握度，不要使用固定逐题加减公式。
- strengths 和 weaknesses 必须是字符串数组，用简短中文描述。
- recommendedFocus 必须是 patternId 字符串数组，必须是当前边界内的合法 Pattern。
- summary 用 1 到 2 句中文解释学生当前水平和下一步建议。
- 必须综合总体正确率、Pattern 表现、Coverage、错误集中度和跨 batch 趋势。
- Coverage Complete 不等于 Mastered。
- 只返回 JSON 对象，包含 mastery、strengths、weaknesses、recommendedFocus、summary。

当前 Knowledge / Subtopic 边界：
${serialize(context.knowledge)}

Session 前 LearningState：
${serialize(context.learningState)}

所有 Attempt：
${serialize(context.attempts)}

对应题目：
${serialize(context.questions)}

每批 TeachingStrategy：
${serialize(context.strategies)}

请返回 SessionSummary JSON。`;
}
