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
TeachingContent
  ↓
Question
```

- Knowledge 是完整场景。
- Subtopic 是学习关卡。
- Pattern 是 Agent 调度的最小教学单元。
- TeachingContent 是教材事实来源。
- Coverage 与 Mastery 分离。

## 2. Comparative Knowledge

当前包含 6 个 Subtopic：

- `comparative-basic`：普通比较级
- `superlative-basic`：最高级
- `comparative-form-rules`：比较级和最高级变化规则
- `comparative-more-most`：more / most
- `comparative-as-as`：as ... as / not as ... as
- `comparative-sentence-application`：比较句型综合应用

所有 Subtopic 完成后才可进入 `通关挑战`。

## 3. TeachingContent

每个 Pattern 都包含：

- concept
- why
- rule
- structure
- examples
- usage
- contrasts
- commonMistakes
- guidedExamples
- practiceHints

首次进入 Subtopic 时，UI 会按 Pattern 分步展示 TeachingContent，然后进入练习。

## 4. Pattern Coverage

`comparative-form-rules` 必须分别覆盖：

- regular
- e-ending
- y-ending
- double-consonant
- irregular
- rule-selection

irregular 的核心词逐项覆盖：

- good
- well
- many
- much
- bad
- little

## 5. QuestionPool

公共 QuestionPool 存在服务器端，通过 Repository 抽象访问。

- 首次 Subtopic 请求：不存在则调用 LLM 生成并保存。
- 后续新用户：直接读取公共题库。
- 个性化强化：优先从公共题库取题，缺少的部分才生成个性化 new questions。
- 个性化题目不会污染公共题库。

默认目录：

```text
.data/question-pools/{knowledgeId}__{subtopicId}.json
```

## 6. Agent 流程

```text
进入 Subtopic
↓
读取 TeachingContent
↓
读取当前 Subtopic LearningState
↓
第一次学习：分步教学 → 基础练习
↓
已有学习记录：定位薄弱 Pattern → 读取 TeachingContent → 少量强化
```

每道题绑定：

```text
knowledgeId
subtopicId
patternId
```

## 7. 题量策略

不再固定每个 Subtopic 15 题。

- 首次学习生成足够完成 Subtopic 的题目。
- 弱 Pattern 自动补足达到目标正确率所需的题量。
- 高正确率且 Coverage 完成后，下一批最多 5 题。
- 最后一批全对且 required Pattern 已覆盖时直接 finish。
- 普通动态强化通常为 3～20 题。

## 8. LLM Provider

支持：

- mock
- openai
- deepseek

当前生产使用：

```env
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-v4-flash
LLM_BASE_URL=https://api.deepseek.com/v1
```

## 9. 当前测试

- ESLint
- TypeScript
- 33 项自动化测试
- Next.js production build
- 真实 DeepSeek 生成与 Batch 分析

## 10. 当前限制

- active Session 刷新恢复尚未实现。
- PatternProgress 使用 LocalStorage，未跨设备同步。
- TeachingContent 当前主要通过首次教学页展示。
- Challenge UI 仍是基础验收版本。

## 11. 下一步

1. 完成 6 个 Subtopic 的端到端人工体验。
2. 增加 TeachingContent 的语音播放和逐段教学展示。
3. 增加真实模型题目质量 eval。
4. 增加 active Session 恢复。
5. 验证后部署到生产环境。
