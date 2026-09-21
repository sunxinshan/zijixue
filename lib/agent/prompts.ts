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
  const subtopics = context.knowledge.subtopics.map((subtopic) => ({
    id: subtopic.id,
    title: subtopic.title,
    description: subtopic.description,
  }));

  return `你是“英语森林”的教学诊断 Agent。程序已经记录了客观 Attempt 和 batch 表现，你负责判断错误模式并选择教学策略。

必须遵守：
- diagnosis 只能是 accidental、subtopic_weakness、rule_misunderstanding、multiple_weaknesses、persistent_failure、improving、mastered。
- strategyLevel 只能是 1 到 5。
- strategyLevel 1：正常练习。
- strategyLevel 2：针对性练习。
- strategyLevel 3：解释 + 示例 + 简单练习。
- strategyLevel 4：改变教学方式。
- strategyLevel 5：综合验证或结束。
- action 只能是 continue、targeted_practice、explain、simplify、change_strategy、increase_difficulty、mixed_review、finish。
- focus 必须是字符串数组，元素只能使用合法 subtopic id。
- difficulty 必须是 1 到 5 的整数。
- questionDistribution 必须是数组，每项包含 subtopic 和 count。
- 除 finish 外，questionDistribution 的 count 总和必须正好为 15。
- finish 时 questionDistribution 必须是空数组。
- strategyLevel 3 以上，必须提供 explanation 和 examples。
- examples 必须是字符串数组，例如 ["happy → happier → happiest"]，不要返回对象数组。
- persistent_failure 必须使用 strategyLevel >= 4，并在 simplify、change_strategy、explain 中选择 action。
- persistent_failure 时不要只是增加同类题，应降低难度、更换题型、正反例、减少干扰项、重新解释或拆分问题。
- 不要使用固定 mastery 公式。
- 只返回 JSON 对象，包含 diagnosis、strategyLevel、action、focus、difficulty、questionDistribution、explanation、examples、reason。

合法 subtopics：
${serialize(subtopics)}

Knowledge：
${serialize(context.knowledge)}

长期 LearningState：
${serialize(context.learningState)}

程序计算的客观观察：
${serialize(context.observation)}

请返回 TeachingStrategy JSON。`;
}

export function buildBatchGenerationPrompt(context: BatchGenerationContext): string {
  return `你是“英语森林”的题目生成 Agent。程序已经决定教学策略和题目分布，你只能严格按照边界生成题目。

任务边界：
- 必须生成正好 15 道题。
- 只允许 choice 和 true-false。
- 每道题必须属于 knowledgeId="${context.knowledge.id}"。
- knowledgeSubtopic 只能使用当前 Knowledge 的合法 subtopic id。
- 必须严格符合 questionDistribution 中每个 subtopic 的 count。
- choice 的 answer 必须是 options 中的字符串。
- true-false 的 answer 必须是布尔值。
- difficulty 必须是 1 到 5 的整数。
- 不要重复 previousQuestions 中已经出现的题目。
- 题目适合小学生，题干简洁。
- 每道题必须包含且只包含以下字段：
  - id：唯一字符串
  - type："choice" 或 "true-false"
  - question：题干字符串
  - options：选择题必须提供字符串数组；判断题不要提供该字段
  - answer：选择题为 options 中的字符串；判断题为 boolean
  - explanation：简短中文解释，不能省略
  - knowledgeId：当前 Knowledge id
  - knowledgeSubtopic：当前 subtopic id
  - difficulty：1 到 5 的整数
- 如果 strategyLevel >= 3，题目应配合 explanation 和 examples，优先采用简单练习、正反例或减少干扰项的方式。
- 如果 diagnosis=persistent_failure，必须改变题型或简化问题，不能只是重复同一种模板。
- 只返回 JSON 对象，并且仅包含 questions 数组。

Knowledge：
${serialize(context.knowledge)}

教学策略：
${serialize(context.strategy)}

题目分布：
${serialize(context.strategy.questionDistribution)}

长期 LearningState：
${serialize(context.learningState)}

previousQuestions：
${serialize(context.previousQuestions.slice(-50))}

请返回 questions JSON。`;
}

export function buildSessionSummaryPrompt(context: SessionSummaryContext): string {
  return `你是“英语森林”的教学总结 Agent。请综合整个 Session 的客观 Attempt 与每批 TeachingStrategy，生成最终学习总结。

要求：
- mastery 是 0 到 100 的综合掌握度，不要使用固定的逐题加减公式。
- strengths 和 weaknesses 必须是字符串数组，用简短中文描述。
- recommendedFocus 必须是字符串数组，元素必须使用合法 subtopic id。
- summary 用 1 到 2 句中文解释学生当前水平和下一步建议。
- 必须综合总体正确率、subtopic 表现、错误集中度、跨 batch 趋势和策略变化。
- 必须返回包含 mastery、strengths、weaknesses、recommendedFocus、summary 五个字段的 JSON 对象。
- 只返回 JSON 对象。

Knowledge：
${serialize(context.knowledge)}

进入 Session 前的 LearningState：
${serialize(context.learningState)}

所有 Attempt：
${serialize(context.attempts)}

对应题目：
${serialize(context.questions)}

每批 TeachingStrategy：
${serialize(context.strategies)}

请返回 SessionSummary JSON。`;
}
