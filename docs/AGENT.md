# Agent Architecture

> 本文档描述“英语森林”的当前 AI Agent 教学架构。
>
> 本文档是 Agent 架构的权威说明。
>
> 如果本文档与旧版 `TECH.md` 中关于固定题库、Question Selector、Mastery 固定计算公式等描述冲突，以本文档为准。

## 1. 核心理念

英语森林不是传统的固定题库练习系统。

核心教学机制：

> 程序负责边界，Agent 负责教学。

程序负责：
- 当前 Knowledge / Level
- 当前 Session
- 学习范围和硬边界
- 题目类型和数量
- 答案判定
- Attempt 记录
- 数据持久化
- Agent 输出校验

Agent 负责：
- 分析学生表现
- 判断薄弱知识点
- 决定训练重点
- 动态生成题目
- 调整难度
- 决定继续或结束
- 生成解释和 Session 总结
- 给出 LearningState 更新建议

## 2. Knowledge = Level

一个 Knowledge 就是一个 Level。

例如：
- Comparative
- Present Continuous
- Simple Past

Knowledge 内部可以有 Subtopic，但 Subtopic 不是独立 Level。

例如：

```text
Comparative
├── regular
├── e-ending
├── y-ending
├── double-consonant
└── irregular
```

Agent 可以发现学生在某个 subtopic 上较弱，并在当前 Level 内重点训练。

## 3. Session

每次进入一个 Knowledge，都创建新的 Session。

新的 Session 使用新的 Agent Context，但可以读取当前 Knowledge 的长期 LearningState。

新 Session 不继承上一个 Knowledge 的完整对话上下文。

## 4. Batch

MVP 一次生成 10 道题，而不是每题调用一次 LLM。

```text
Agent 分析当前状态
 ↓
LLM 一次生成 10 道题
 ↓
前端逐题展示
 ↓
程序本地判断
 ↓
记录 Attempt
 ↓
10 道完成
 ↓
Agent 分析 Batch
 ↓
continue / finish
```

## 5. MVP Question Types

只支持：
- choice
- true-false

暂时不支持：
- sentence
- translation
- open-ended

## 6. Question

题目必须属于当前 Knowledge。

示例：

```json
{
  "id": "q1",
  "type": "choice",
  "question": "What is the comparative form of happy?",
  "options": ["happyer", "happier", "more happy", "happiest"],
  "answer": "happier",
  "explanation": "happy 以辅音字母+y结尾，变比较级时 y 变 i 再加 er。",
  "knowledgeSubtopic": "y-ending",
  "difficulty": 2
}
```

## 7. Answer Evaluation

choice 和 true-false 由程序本地判断，不需要逐题调用 LLM。

## 8. Attempt

每一道题都记录 Attempt，包括正确和错误。

```ts
interface Attempt {
  id: string;
  sessionId: string;
  knowledgeId: string;
  questionId: string;
  answer: string | boolean;
  correct: boolean;
  timestamp: number;
}
```

## 9. Agent Decision

每一批题完成后：

```json
{
  "action": "continue",
  "focus": ["y-ending"],
  "difficulty": 2,
  "reason": "学生对一般比较级掌握较好，但 y 结尾变化仍然不稳定。"
}
```

`action` 只能是 `continue` 或 `finish`。

## 10. SessionSummary

Session 完成后：

```json
{
  "mastery": 72,
  "strengths": ["一般比较级", "e结尾变化"],
  "weaknesses": ["y结尾变化"],
  "recommendedFocus": ["y-ending"],
  "summary": "学生已经理解比较级的基本概念，但 y 结尾变化仍不稳定。"
}
```

## 11. LearningState

LearningState 是长期学习状态。

```json
{
  "knowledgeId": "comparative",
  "mastery": 72,
  "strengths": ["一般比较级"],
  "weaknesses": ["y-ending"],
  "currentDifficulty": 2,
  "recommendedFocus": ["y-ending"],
  "summary": "学生已经理解基本概念，但 y 结尾变化仍不稳定。"
}
```

结构化字段为主，summary 为自然语言补充。

## 12. Mastery

MVP 不使用固定公式，例如“正确 +10、错误 -5”。

程序记录客观事实；Agent 综合 Session 上下文判断 mastery、strengths、weaknesses、recommendedFocus。

程序负责验证 Agent 输出并保存。

## 13. LangGraph

```text
START
  ↓
load_context
  ↓
generate_batch
  ↓
WAIT_FOR_USER
  ↓
evaluate_answer
  ↓
record_attempt
  ↓
batch_finished?
  ↓
analyze_batch
  ↓
continue ─────→ generate_batch
  ↓
finish
  ↓
summarize_session
  ↓
save_learning_state
  ↓
END
```

LangGraph State 只表示当前 Session 工作状态，不代替整个数据库。

```ts
interface SessionState {
  sessionId: string;
  knowledgeId: string;
  learningState: LearningState;
  attempts: Attempt[];
  currentBatch?: QuestionBatch;
  currentQuestionIndex?: number;
  lastAnswer?: string;
  isCorrect?: boolean;
  decision?: AgentDecision;
  sessionSummary?: SessionSummary;
}
```

## 14. LLM Provider

LLM 不允许硬编码到业务逻辑中。

```ts
interface LLMProvider {
  generate<T>(
    prompt: string,
    schema: unknown
  ): Promise<T>;
}
```

通过环境变量选择：

```env
LLM_PROVIDER=openai
LLM_MODEL=xxx
LLM_API_KEY=xxx
```

## 15. Question Validation

至少校验：
- 正好 10 道题
- 合法题型
- choice 存在 options
- answer 合法
- true-false answer 为 boolean
- knowledgeId 属于当前 Knowledge
- knowledgeSubtopic 属于当前 Knowledge
- difficulty 合法
- 不存在明显重复题

## 16. MVP Storage

MVP 使用 LocalStorage。

暂时不使用 SQLite、PostgreSQL、MySQL。

通过 Storage Layer 访问 LocalStorage，以便未来替换数据库。

## 17. 总原则

> Program controls boundaries.
>
> Agent controls teaching.

程序决定：你在哪一关、能学什么、允许生成什么题、题目怎么判定、数据怎么保存。

Agent 决定：你哪里不会、下一步练什么、题目难不难、是否继续、什么时候结束、怎么解释。

## 18. MVP 约束

- 不做登录
- 不做数据库
- 不做句子题
- 不做 LLM 逐题判分
- 不做固定 mastery 公式
- 不做独立 Question Selector
- 不把每个 subtopic 做成 Level
- 不要求每道题调用 LLM
- 不推翻现有 UI
