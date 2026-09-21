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
Next.js
React
TypeScript
Tailwind CSS
LangGraph
LLM
LocalStorage
```

暂时不使用：
- SQLite
- PostgreSQL
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

文档优先级：

```text
当前 Codex Prompt
    ↓
AGENT.md
    ↓
DATA.md
    ↓
STATUS.md
    ↓
PRD.md
    ↓
DESIGN.md
    ↓
CONTENT.md
    ↓
TECH.md
```

## 4. 当前架构

```text
Knowledge = Level
```

Knowledge 内部可以有多个 subtopic。

## 5. Agent 架构

核心原则：

> 程序负责边界，Agent 负责教学。

程序负责：
- Knowledge
- Session
- Attempt
- 答案判断
- 数据保存
- Agent 输出验证

Agent 负责：
- 学习状态分析
- 薄弱点判断
- 题目生成
- 难度调整
- 下一批训练策略
- Session 总结

## 6. Question Strategy

MVP 每次生成 10 道题。

只支持：
- choice
- true-false

不支持：
- sentence
- translation
- open-ended

学生回答后程序本地判断，不调用 LLM 判分。

## 7. Learning Strategy

不采用固定 mastery 公式。

程序记录：

```text
question
answer
correct
difficulty
subtopic
timestamp
```

Agent 综合分析学习情况。

## 8. 当前开发阶段

当前处于：

```text
Agent Architecture Refactor
```

目标是把现有固定题库练习架构升级为 Agent 驱动的动态教学架构。

## 9. 第一阶段任务

必须完成：

### Agent 基础结构
建立 Agent / Graph / State / Prompt / LLM / Validator 等合理模块。

### LangGraph
建立：

```text
START
 ↓
load_context
 ↓
generate_batch
 ↓
等待学生
 ↓
记录答案
 ↓
分析 Batch
 ↓
continue / finish
 ↓
generate_batch / summarize_session
 ↓
save_learning_state
 ↓
END
```

### LLM Provider
支持 Provider 和 Model 配置，不写死具体模型。

### Question Batch
一次生成 10 道 choice / true-false 题。

### Question Validator
检查数量、题型、答案、Knowledge 边界、difficulty、重复题等。

### Attempt
每道题回答后记录 Attempt，包括正确和错误。

### Batch Analysis
10 道完成后 Agent 分析并输出 continue / finish、focus、difficulty、reason。

### SessionSummary
finish 后生成 mastery、strengths、weaknesses、recommendedFocus、summary。

### LearningState
SessionSummary 更新长期 LearningState，并保存到 LocalStorage。

## 10. UI 原则

不要大规模修改 UI。

优先保持：
- 已有页面
- 已有视觉风格
- 已有组件
- 已有游戏化交互

只修改实现 Agent 流程所必需的部分。

## 11. 完成标准

真正跑通：

```text
进入 Knowledge
      ↓
创建 Session
      ↓
读取 LearningState
      ↓
Agent 生成 10 道题
      ↓
学生逐题回答
      ↓
程序本地判断
      ↓
记录 10 个 Attempt
      ↓
Agent 分析
      ↓
continue / finish
      ↓
continue → 再生成 10 道针对性题目
      ↓
finish → SessionSummary
      ↓
更新 LearningState
      ↓
Session 结束
```

## 12. Codex 工作要求

每次修改前：
1. 阅读所有 docs。
2. 阅读现有代码。
3. 不要假设旧架构仍然正确。
4. 不要删除已有功能，除非确认已经被新架构取代。
5. 优先复用已有类型和组件。
6. 避免无必要的大规模重构。

完成后：
- 更新 STATUS.md
- 列出修改文件
- 说明架构变化
- 说明测试结果
- 说明剩余问题
- 说明下一步

不要虚构测试结果。
