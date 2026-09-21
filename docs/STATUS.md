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
学习知识
 ↓
Agent 教学
 ↓
生成练习
 ↓
学生答题
 ↓
程序判定
 ↓
Agent 分析
 ↓
针对性训练
 ↓
掌握
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
```

暂时不使用：

- SQLite
- PostgreSQL
- MySQL
- 用户登录系统

## 3. 项目文档

```text
docs/
├── PRD.md
├── DESIGN.md
├── TECH.md
├── CONTENT.md
├── AGENT.md
├── DATA.md
└── STATUS.md
```

## 4. 当前架构

- `Comparative` 是唯一 Knowledge / Level。
- `regular`、`e-ending`、`y-ending`、`double-consonant`、`irregular` 是 subtopic。
- 每次进入 Game 页面会创建新的 LearningSession。
- 新 Session 使用新的 Agent Context，只读取对应 Knowledge 的 LearningState。
- 固定 Question Selector 已移除。
- 固定 mastery 加减公式已移除。

## 5. Agent 流程

LangGraph 当前分为两阶段，以 HTTP 边界表示 `WAIT_FOR_USER`：

启动阶段：

```text
START
→ load_context
→ generate_batch
→ END
```

一批答题完成后：

```text
START
→ record_attempt
→ analyze_batch
→ continue ? generate_next_batch
           : summarize_session
             → save_learning_state
→ END
```

程序在浏览器本地逐题判分，并在每道题回答后记录 Attempt。
只有每批 10 道题完成后才调用一次 Agent 分析。

## 6. LLM Provider

已实现：

```ts
interface LLMProvider {
  generate<T>(
    prompt: string,
    schema: z.ZodType<T>,
    context?: unknown
  ): Promise<T>;
}
```

支持：

- `mock`：默认本地演示 Provider，不需要 API Key。
- `openai`：通过 `@langchain/openai` 调用，支持 `LLM_MODEL`、`LLM_API_KEY` 和可选 `LLM_BASE_URL`。
- `deepseek`：通过 OpenAI 兼容接口调用；默认 Base URL 为 `https://api.deepseek.com/v1`，模型由 `LLM_MODEL` 指定。

OpenAI API Key 不会发送到浏览器。

## 7. Question 和 Validation

MVP 每批正好 10 道题，仅支持：

- `choice`
- `true-false`

Validator 校验：

- 数量必须为 10
- 题型合法
- choice 的 options 和 answer 合法
- true-false 的 answer 为 boolean
- knowledgeId 属于当前 Knowledge
- knowledgeSubtopic 属于当前 Knowledge
- difficulty 为 1 到 5
- 题目 ID 和题干不重复

## 8. 当前 Storage

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

旧版 `english-forest:v1` 的 mastery、XP 和星星会在首次读取时迁移。

## 9. 当前完成状态

已跑通：

- Knowledge = Level
- subtopic 数据模型
- LearningSession
- LangGraph 两阶段流程
- 动态生成 10 道 choice / true-false
- 程序本地判分
- Attempt 逐题记录
- Batch Analysis
- continue 后生成下一批针对性题目
- finish 后生成 SessionSummary
- SessionSummary 更新 LearningState
- LocalStorage 持久化和旧数据迁移
- 原有森林主题 UI 保留

当前默认 Provider：

```text
mock
```

因此线上或本地在没有环境变量时会使用可重复的本地教学 Provider。
生产环境如要使用真实模型，需配置 `LLM_PROVIDER=openai` 以及对应模型和 Key。

## 10. 测试状态

当前自动化测试覆盖：

- Knowledge / subtopic 数据
- choice / true-false 本地判分
- LearningState 更新
- Mock Provider 题目生成
- Question Validator
- LangGraph start 流程
- Batch continue 流程
- Batch finish + SessionSummary 流程
- Storage v2 初始结构
- Legacy LocalStorage 迁移

## 11. 下一阶段

最合理的下一阶段任务是：

1. 配置并验证真实 OpenAI Provider 的结构化输出稳定性。
2. 增加 Agent 生成题目的离线 eval 数据集，评估题目正确性、难度和 subtopic 覆盖。
3. 增加 active Session 恢复能力，刷新或关闭页面后可继续同一 Session。
4. 为真实模型增加请求超时、降级和错误重试策略。
5. 在真实模型稳定后，再评估是否需要数据库和跨设备 LearningState。
