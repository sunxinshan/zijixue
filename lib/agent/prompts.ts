import type {
  BatchAnalysisContext,
  BatchGenerationContext,
  SessionSummaryContext,
} from "@/types/agent";

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildBatchGenerationPrompt(context: BatchGenerationContext): string {
  const allowedSubtopics = context.knowledge.subtopics.map((subtopic) => ({
    id: subtopic.id,
    title: subtopic.title,
    description: subtopic.description,
  }));

  return `你是“英语森林”的英语教学 Agent。程序负责边界，你只负责生成当前 Knowledge 内的练习。

任务边界：
- 必须生成正好 10 道题。
- 只允许 choice 和 true-false。
- 不允许句子、翻译、开放题。
- 每道题必须属于 knowledgeId="${context.knowledge.id}"。
- knowledgeSubtopic 只能使用给定的 subtopic id。
- choice 的 answer 必须是 options 中的字符串。
- true-false 的 answer 必须是布尔值。
- difficulty 必须是 1 到 5 的整数。
- 题目必须围绕 focus 优先训练，同时覆盖当前 Knowledge 的规则。
- 不要重复 previousQuestions 中已经出现的题目。
- 题目要适合小学生，题干简洁明确。
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

Knowledge：
${serialize(context.knowledge)}

当前 LearningState：
${serialize(context.learningState)}

本批参数：
${serialize({
  focus: context.focus,
  difficulty: context.difficulty,
  batchNumber: context.batchNumber,
  allowedSubtopics,
  previousQuestions: context.previousQuestions.slice(-50),
})}

请只返回一个 JSON 对象，并且仅包含 questions 数组。`;
}

export function buildBatchAnalysisPrompt(context: BatchAnalysisContext): string {
  return `你是“英语森林”的教学 Agent。请根据刚完成的 10 道题分析学生表现。

规则：
- action 只能是 continue 或 finish。
- 如果学生仍需巩固，返回 continue；如果已经达到本 Knowledge 的阶段目标，返回 finish。
- focus 必须是字符串数组，即使只有一个重点也必须使用数组；数组元素必须是 Knowledge 中合法的 subtopic id。
- difficulty 必须是 1 到 5 的整数，并表示下一批建议难度。
- reason 用简短中文解释判断依据。
- 不判断单题对错，单题正确性已经由程序完成。
- 必须返回包含 action、focus、difficulty、reason 四个字段的 JSON 对象。

Knowledge：
${serialize(context.knowledge)}

长期 LearningState：
${serialize(context.learningState)}

本批 10 道题的客观 Attempt：
${serialize(context.attempts)}

对应题目：
${serialize(context.questions)}

当前批次序号：${context.batchNumber}

请只返回 JSON 对象，并符合 AgentDecision 结构。`;
}

export function buildSessionSummaryPrompt(context: SessionSummaryContext): string {
  return `你是“英语森林”的教学 Agent。请综合整个 Session 的客观 Attempt 记录，生成最终学习总结。

要求：
- mastery 是 0 到 100 的综合掌握度，不要使用固定的逐题加减公式。
- strengths 和 weaknesses 必须是字符串数组，用简短中文描述。
- recommendedFocus 必须是字符串数组，即使只有一个重点也必须使用数组；数组元素必须是 Knowledge 中合法的 subtopic id。
- summary 用 1 到 2 句中文解释学生当前水平和下一步建议。
- 必须根据整个 Session 的表现，而不是其中一道题。
- 必须返回包含 mastery、strengths、weaknesses、recommendedFocus、summary 五个字段的 JSON 对象。

Knowledge：
${serialize(context.knowledge)}

进入 Session 前的 LearningState：
${serialize(context.learningState)}

所有 Attempt：
${serialize(context.attempts)}

对应题目：
${serialize(context.questions)}

每批 AgentDecision：
${serialize(context.decisions)}

请只返回 JSON 对象，并符合 SessionSummary 结构。`;
}
