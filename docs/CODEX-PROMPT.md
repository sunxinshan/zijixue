# Codex 第一阶段开发 Prompt

你现在正在开发“英语森林”项目。

这是一个面向小学生的游戏化英语学习网站。

请先完整阅读：

- docs/PRD.md
- docs/DESIGN.md
- docs/TECH.md
- docs/CONTENT.md
- docs/AGENT.md
- docs/DATA.md
- docs/STATUS.md

文档优先级：

1. 当前 Prompt
2. AGENT.md
3. DATA.md
4. STATUS.md
5. PRD.md
6. DESIGN.md
7. CONTENT.md
8. TECH.md

如果旧版 TECH.md / CONTENT.md 与 AGENT.md / DATA.md 冲突，以新的文档为准。

---

## 本次任务

不要重新设计整个产品。

请基于当前已有代码，把现有固定题库练习架构逐步升级为 Agent 驱动的动态教学架构。

核心原则：

> 程序负责边界，Agent 负责教学。

---

## 一、Knowledge

一个 Knowledge 就是一个 Level。

例如：

Comparative
Present Continuous
Simple Past

Comparative 内部可以存在：

regular
e-ending
y-ending
double-consonant
irregular

这些是 subtopic，不是独立 Level。

---

## 二、Session

学生每进入一个 Knowledge，都创建新的 Session。

Session 使用新的 Agent Context。

新的 Session 不继承上一个 Knowledge 的完整对话上下文，但是可以读取当前 Knowledge 对应的 LearningState。

---

## 三、LangGraph

使用 LangGraph 构建 Agent 流程。

目标：

```text
START
→ load_context
→ generate_batch
→ 等待学生回答
→ 程序本地判断
→ record_attempt
→ batch_finished
→ analyze_batch
→ continue / finish
→ continue 则 generate_batch
→ finish 则 summarize_session
→ save_learning_state
→ END
```

不要让 LangGraph State 代替整个数据库。

---

## 四、题目生成

MVP 一次生成 15 道题。

只允许：

- choice
- true-false

暂时不要实现：

- sentence
- translation
- open-ended

不要为每一道题单独调用 LLM。

正确模式：

```text
Agent / LLM
→ 一次生成 15 道题
→ 前端逐题展示
→ 程序本地判断
→ 记录 Attempt
→ 15 道完成后再调用 Agent 分析
```

---

## 五、答案判断

choice 和 true-false 必须由程序本地判断。

不要调用 LLM 判断每一道题对不对。

---

## 六、Attempt

每一道题都记录 Attempt，包括正确和错误。

至少包含：

```text
id
sessionId
knowledgeId
questionId
answer
correct
timestamp
```

如果项目已有类似类型，可以合理修改，而不是重复创建冲突类型。

---

## 七、Batch Analysis

每 15 道题完成后，让 Agent 综合分析。

Agent 输出：

```text
action: continue | finish
focus: 当前需要重点训练的 subtopic
difficulty: 下一批题目的难度
reason: 对当前学习情况的解释
```

如果 continue，生成下一批 15 道题。

下一批题目应该根据 Agent 的 focus 进行针对性训练。

---

## 八、SessionSummary

Agent 决定 finish 后，生成：

- mastery
- strengths
- weaknesses
- recommendedFocus
- summary

不要使用：

```text
正确 +10
错误 -5
```

这种固定 mastery 公式。

mastery 应由 Agent 根据整个 Session 的表现综合判断。

---

## 九、LearningState

SessionSummary 用来更新长期 LearningState。

至少包含：

```text
knowledgeId
mastery
strengths
weaknesses
currentDifficulty
recommendedFocus
summary
updatedAt
```

结构化字段优先，summary 作为自然语言补充。

---

## 十、LLM Provider

LLM Provider 必须可配置。

不要把具体模型硬编码进教学业务逻辑。

可以使用：

```ts
interface LLMProvider {
  generate<T>(
    prompt: string,
    schema: unknown
  ): Promise<T>;
}
```

环境变量：

```env
LLM_PROVIDER=openai
LLM_MODEL=xxx
LLM_API_KEY=xxx
```

如果项目已有 provider abstraction，优先复用。

---

## 十一、Question Validation

LLM 生成题目后必须验证：

- 正好 15 道
- type 合法
- choice 存在 options
- answer 有效
- true-false answer 为 boolean
- knowledgeId 属于当前 Knowledge
- knowledgeSubtopic 属于当前 Knowledge
- difficulty 合法
- 不存在明显重复题

未经验证的 LLM 输出不能直接交给前端。

---

## 十二、Storage

MVP 使用 LocalStorage。

暂时不要引入：

- SQLite
- PostgreSQL
- MySQL
- Supabase

设计 Storage Layer，使未来可以替换成数据库。

业务逻辑不要直接大量依赖 `localStorage.getItem()` / `setItem()`。

---

## 十三、UI

不要重新设计整个 UI。

尽可能保留现有页面、样式、组件和游戏化视觉。

只修改实现新 Agent 流程所必需的部分。

---

## 十四、开始修改前

请先：

1. 阅读全部 docs。
2. 检查现有代码结构。
3. 找出旧的固定题库。
4. 找出旧的 Question Selector。
5. 找出旧的 mastery 计算。
6. 判断哪些可以复用。
7. 判断哪些需要替换。
8. 再开始修改。

不要没有检查现有代码就创建大量新文件。

---

## 十五、第一阶段目标

跑通最小闭环：

```text
进入一个 Knowledge
→ 创建 Session
→ 读取 LearningState
→ Agent 生成 15 道题
→ 前端逐题答题
→ 程序本地判断
→ 记录 Attempt
→ 15 道完成
→ Agent 分析 Batch
→ continue / finish
```

continue：

```text
→ 再生成下一批 15 道针对性题目
```

finish：

```text
→ 生成 SessionSummary
→ 更新 LearningState
→ 保存 LocalStorage
→ Session 结束
```

---

## 十六、不要过度实现

本次不要提前实现：

- OCR
- 图片识别教材
- 登录系统
- 云端数据库
- 复杂推荐算法
- 句子语义评分
- 家长端
- 排行榜
- 社交系统
- Phaser
- 大规模游戏系统

先把：

> Agent 教学闭环

跑通。

---

## 十七、完成后

完成开发后：

1. 运行项目。
2. 运行现有测试。
3. 解决 TypeScript / lint / build 错误。
4. 更新 docs/STATUS.md。

最后汇报：

### 修改文件
列出实际修改的文件。

### 架构变化
简述旧架构变成了什么。

### Agent 流程
说明 LangGraph 当前流程。

### 已完成
列出真正跑通的功能。

### 测试
说明运行了哪些测试以及结果。

### 未完成
明确列出没有完成的部分。

### 下一步
给出下一阶段最合理的开发任务。

不要虚构测试结果。
