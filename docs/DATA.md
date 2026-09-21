# Data Architecture

> 本文档描述英语森林当前的数据模型。
>
> 本文档是当前数据架构的权威说明。
>
> 如果本文档与旧版 `CONTENT.md` / `TECH.md` 中的数据模型描述冲突，以本文档为准。

## 1. 数据层次

```text
Content
  ↓
Knowledge
  ↓
LearningState
  ↓
Session
  ↓
Question
  ↓
Attempt
  ↓
SessionSummary
  ↓
LearningState
```

## 2. Knowledge

Knowledge 是教学系统的基本 Level。

```ts
interface Knowledge {
  id: string;
  title: string;
  description: string;
  subtopics: KnowledgeSubtopic[];
  rules: KnowledgeRule[];
}
```

## 3. LearningState

```ts
interface LearningState {
  userId: string;
  knowledgeId: string;
  mastery: number;
  strengths: string[];
  weaknesses: string[];
  currentDifficulty: number;
  recommendedFocus: string[];
  summary: string;
  updatedAt: number;
}
```

MVP 没有登录系统时，`userId` 可以使用 `local-user`。

## 4. Session

```ts
interface LearningSession {
  id: string;
  userId: string;
  knowledgeId: string;
  startedAt: number;
  endedAt?: number;
  status: "active" | "completed";
  sessionSummary?: SessionSummary;
}
```

每次进入同一个 Knowledge 都可以创建新的 Session。

## 5. Attempt

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

必须记录正确题和错误题。

## 6. Question

```ts
type QuestionType = "choice" | "true-false";

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string | boolean;
  explanation: string;
  knowledgeId: string;
  knowledgeSubtopic: string;
  difficulty: number;
}
```

## 7. QuestionBatch

```ts
interface QuestionBatch {
  questions: Question[];
}
```

MVP 要求 `questions.length === 10`。

## 8. AgentDecision

```ts
interface AgentDecision {
  action: "continue" | "finish";
  focus: string[];
  difficulty: number;
  reason: string;
}
```

## 9. SessionSummary

```ts
interface SessionSummary {
  mastery: number;
  strengths: string[];
  weaknesses: string[];
  recommendedFocus: string[];
  summary: string;
}
```

SessionSummary 是一次 Session 的结果，不是长期状态。

## 10. LearningState 更新

```text
Attempts
   ↓
Agent 分析
   ↓
SessionSummary
   ↓
更新 LearningState
```

## 11. LocalStorage

MVP 使用 Storage Layer。

建议：

```ts
interface AppStorage {
  learningStates: LearningState[];
  sessions: LearningSession[];
  attempts: Attempt[];
  questions: Question[];
}
```

统一 Key：

```text
english-forest
```

## 12. Storage Layer

业务代码不要大量直接调用：

```ts
localStorage.getItem(...)
localStorage.setItem(...)
```

建议通过 storage service 访问。

未来可以替换为数据库，而不修改 Agent 业务逻辑。

## 13. Agent 与 Data

Agent 不直接负责最终持久化。

正确流程：

```text
Agent
 ↓
结构化结果
 ↓
程序验证
 ↓
Storage Layer
 ↓
保存
```

## 14. Data Principles

1. Attempt 是事实。
2. Session 是一次学习过程。
3. SessionSummary 是一次学习过程的总结。
4. LearningState 是长期学习状态。
5. Agent Context 是临时状态。
6. Question 是练习内容。
7. Knowledge 是课程边界。
8. Storage 与业务逻辑解耦。
