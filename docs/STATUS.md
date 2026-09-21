# Project Status

> 本文档记录英语森林当前开发状态。
>
> Codex 在开始开发任务前必须阅读本文档。
>
> 完成任务后必须更新本文档。

## 1. 当前项目目标

英语森林是一款面向小学生的游戏化英语学习网站。

核心模式：

```text
孩子答题
 ↓
程序记录客观事实
 ↓
Agent 诊断学习状态
 ↓
选择教学策略
 ↓
生成下一批题
 ↓
再次评估
```

## 2. 当前技术栈

MVP：

```text
Next.js 16
React 19
TypeScript
Tailwind CSS 4
LangGraph
LangChain Core / OpenAI
Zod
LocalStorage
DeepSeek deepseek-v4-flash
```

## 3. 项目文档

```text
docs/
├── PRD.md
├── DESIGN.md
├── TECH.md
├── CONTENT.md
├── AGENT.md
├── AGENT_v1.md
├── DATA.md
├── STATUS.md
├── CODEX-PROMPT.md
├── CODEX-PROMPT-v1.md
└── AGENT_v1.md
```

## 4. 当前架构

- `Comparative` 是唯一 Knowledge / Level。
- `regular`、`e-ending`、`y-ending`、`double-consonant`、`irregular` 是 subtopic。
- 每次进入 Game 页面会创建新的 LearningSession。
- Session 使用新的 Agent Context，只读取当前 Knowledge 的 LearningState。
- 固定 Question Selector 已移除。
- 固定 mastery 加减公式已移除。

## 5. TeachingStrategy v1

已实现七类诊断：

- accidental
- subtopic_weakness
- rule_misunderstanding
- multiple_weaknesses
- persistent_failure
- improving
- mastered

已实现五级教学策略：

1. 正常练习
2. 针对性练习
3. 解释 + 示例 + 简单练习
4. 改变教学方式
5. 综合验证 / 结束

TeachingStrategy 包含：

```ts
{
  diagnosis,
  strategyLevel,
  action,
  focus,
  difficulty,
  questionDistribution,
  explanation?,
  examples?,
  reason
}
```

`questionDistribution` 总数必须为 10，且每个 subtopic 必须属于当前 Knowledge。

## 6. persistent_failure

同一 subtopic 连续多个 batch 低准确率时：

- diagnosis 升级为 `persistent_failure`
- strategyLevel 至少为 4
- action 必须为 `simplify`、`change_strategy` 或 `explain`
- 必须提供 explanation 和 examples
- 可以减少干扰项、降低难度、更换题型、使用正反例和拆分问题

## 7. LangGraph 流程

启动：

```text
START
→ load_context
→ analyze_learning_state
→ generate_teaching_strategy
→ generate_question_batch
→ END
```

每批完成：

```text
START
→ record_attempt
→ analyze_batch（程序客观统计）
→ generate_teaching_strategy（Agent 诊断）
→ finish ? summarize_session → save_learning_state → END
         : generate_question_batch → END
```

程序负责答案判定和 Attempt 事实记录。Agent 负责诊断、策略和题目生成。

## 8. Question 和 Validation

每批正好 10 道题，只支持：

- choice
- true-false

Validator 校验：

- 10 道题
- 类型合法
- choice 的 options 和 answer 合法
- true-false answer 为 boolean
- knowledgeId 正确
- subtopic 合法
- questionDistribution 每个 subtopic 范围合法
- questionDistribution 总数必须为 10，finish 时必须为空
- 实际题目分布必须与 TeachingStrategy 一致
- difficulty 为 1 到 5
- 题目 ID 和题干不重复
- strategyLevel 3 以上必须提供 explanation 和 examples
- persistent_failure 必须升级 strategyLevel 并改变教学方式

## 9. 当前 Storage

LocalStorage 统一 Key：

```text
english-forest
```

结构：

```ts
interface AppStorage {
  version: 2;
  userId: string;
  learningStates: LearningState[];
  sessions: LearningSession[];
  attempts: Attempt[];
  questions: Question[];
}
```

LearningState 已包含：

- mastery
- strengths
- weaknesses
- currentDifficulty
- recommendedFocus
- strategyLevel
- summary
- updatedAt

旧版 LocalStorage 数据会迁移。

## 10. LLM Provider

支持：

- `mock`：无需 API Key，用于测试和离线运行。
- `openai`：OpenAI 结构化输出。
- `deepseek`：OpenAI 兼容 JSON Object 模式。

当前本地 `.env.local` 使用：

```env
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-v4-flash
LLM_BASE_URL=https://api.deepseek.com/v1
```

API Key 只存在于服务端环境变量，不会进入浏览器。

## 11. 测试状态

自动化测试覆盖：

- A：9/10，错误分散 → accidental
- B：6/10，y-ending 集中错误 → subtopic_weakness + 提高占比
- C：连续 y-ending 错误 → rule_misunderstanding + explain + examples
- D：两个 batch y-ending 失败 → persistent_failure + strategyLevel 4
- E：6/10 → 8/10 → 9/10 → improving + 提高难度
- F：多个 batch 稳定正确 → mastered + finish
- questionDistribution 总数校验
- LangGraph 启动、continue、finish
- SessionSummary 更新 LearningState
- Storage v2 与旧数据迁移
- DeepSeek Provider 配置

真实 DeepSeek 验证：

- 生成 10 道题和 questionDistribution
- 识别 y-ending 和 double-consonant 的集中错误
- 输出 explanation 和规范化 examples
- 生成下一批 10 道针对性题目

## 12. 当前限制

- active Session 暂不支持刷新后继续。
- 没有真实用户数据驱动的长期 evaluator。
- DeepSeek 返回格式仍可能需要根据 Prompt 版本继续加固。
- 没有请求超时、自动重试和自动降级策略。
- LocalStorage 仍是唯一持久化方式。
- 线上 `yidongxun.com` 尚未部署该 v1 版本。

## 13. 下一步

1. 增加 active Session 恢复。
2. 建立 A～F 之外的真实模型回归 eval。
3. 为 DeepSeek 增加超时、失败重试和降级到 mock 的可选策略。
4. 增强 UI 对教学策略历史的展示。
5. 验证后部署到 `yidongxun.com`。
