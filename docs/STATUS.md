# Project Status

> 本文档记录英语森林当前开发状态。
>
> Codex 在开始开发任务前必须阅读本文档。
>
> 完成任务后必须更新本文档。

## 1. 当前内容模型

```text
Knowledge
  ↓
Subtopic
  ↓
Pattern
  ↓
Question
```

- Knowledge 是完整场景/知识主题。
- Subtopic 是用户看到的学习关卡。
- Pattern 是 Agent 调度的最小教学单元。
- Coverage 与 Mastery 分离。

## 2. Comparative Knowledge

```text
comparative
比较级与比较表达

├── comparative-basic 普通比较级
├── superlative-basic 最高级
├── form-change 比较级/最高级词形变化
└── as-as 同级比较
```

`form-change` 包含：

- regular
- e-ending
- y-ending
- double-consonant
- more-most
- irregular

`irregular` 支持逐词 Coverage：

- good
- well
- bad
- little
- many
- much

## 3. PatternProgress

```ts
interface PatternProgress {
  patternId: string;
  attemptedQuestions: number;
  correctQuestions: number;
  coveredItems: string[];
  coverageComplete: boolean;
}
```

Coverage Complete 只表示测过，不表示掌握。

## 4. LearningState

LearningState 区分：

- Subtopic LearningState
- Knowledge Challenge LearningState

Subtopic LearningState 包含：

- scope
- subtopicId
- mastery
- strengths
- weaknesses
- currentDifficulty
- recommendedFocus
- strategyLevel
- patternProgress
- completed
- summary
- updatedAt

## 5. Agent Context

Subtopic 学习时，只向 Agent 注入当前 Subtopic 的：

- Patterns
- PatternProgress
- LearningState
- Attempts 统计

不会注入其他 Subtopic 的详细状态。

Challenge 时才读取整个 Knowledge 的所有 Subtopic 和 Pattern 状态。

## 6. LangGraph

Subtopic 启动：

```text
START
→ load_context
→ analyze_learning_state
→ generate_teaching_strategy
→ generate_question_batch
→ END
```

Batch 完成：

```text
START
→ record_attempt
→ analyze_batch
→ generate_teaching_strategy
→ continue ? generate_question_batch
           : summarize_session → save_learning_state
→ END
```

## 7. Question Batch

- 每批题量由 Pattern Coverage、弱项和 TeachingStrategy 动态决定。
- 只支持 choice / true-false。
- Batch 不等于 Subtopic。
- Agent 根据 Pattern Coverage 和历史表现决定 Pattern 分布。
- required Pattern 未完成 Coverage 时优先。
- y-ending、irregular、more-most 可增加题量。
- 选择题正确选项位置由程序在 A/B/C/D 中均衡随机。

## 8. Baseline Question Cache

当 Subtopic LearningState 为空时：

- 首次由模型生成基础 Pattern 题池。
- 程序验证后保存到服务器端。
- 后续同 Subtopic 请求复用。
- 非空状态进入 Pattern 动态教学。
- 默认目录：`.data/question-pools/{knowledgeId}__{subtopicId}.json`
- 可通过 `QUESTION_POOL_DIR` 覆盖。

## 9. Challenge

- 所有 Subtopic completed 且 required Pattern Coverage 完成后解锁。
- Challenge 混合所有 Subtopic 和 Pattern。
- Challenge 失败后根据错误 Pattern 定位相关 Subtopic。
- 结果页提供对应 Subtopic 的复习入口。

## 10. LLM Provider

支持：

- mock
- openai
- deepseek

当前本地使用：

```env
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-v4-flash
LLM_BASE_URL=https://api.deepseek.com/v1
```

API Key 仅在服务端环境变量。

## 11. 测试状态

自动化测试覆盖：

- 四个 Subtopic 与 Pattern 数据
- irregular 逐词 Coverage
- Pattern 统计
- y-ending 薄弱时增加 Pattern 题量
- irregular 只覆盖 good 时 Coverage 不完整
- Subtopic Context 隔离
- Challenge 混合所有 Pattern
- Pattern distribution 总数校验
- 选项位置均衡随机
- Baseline 缓存复用
- DeepSeek Provider 配置

真实 DeepSeek 已验证：

- form-change 只返回六个 Pattern
- Pattern distribution 正确
- PatternProgress 逐项统计
- irregular 仅覆盖 good/bad 时 `coverageComplete=false`
- 下一批优先增加未覆盖 Pattern

## 12. 当前限制

- active Session 刷新恢复尚未实现。
- Challenge UI 仍是基础验收版本。
- PatternProgress 目前使用 LocalStorage，未跨设备同步。
- 真实模型输出仍依赖 Prompt 与 Validator 持续评估。
- 尚未部署本次 V2 内容模型到生产环境。

## 13. 下一步

1. 在实际 UI 中完整走通四个 Subtopic 和 Challenge。
2. 增加真实用户数据驱动的 Pattern eval。
3. 增加 active Session 恢复。
4. 增加更丰富的 Challenge 失败复习策略。
5. 验证后部署到 `yidongxun.com`。
