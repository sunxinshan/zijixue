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
- comic（可选）
- understandingCheck（可选）

首次进入 Subtopic 时，UI 会按 Pattern 分步展示 TeachingContent，然后进入练习。

### Pattern 漫画教学

- 普通比较级的 5 个 Pattern 已全部接入本地已发布漫画。
- 01 → 比较级词形；02 → `than`；03/04 → `be`；05/06 → 行为动词；07/08 → `Which`。
- 有已发布漫画时默认展示漫画模式，可切换文字讲解。
- 无漫画或图片加载失败时自动回退文字讲解。
- 漫画旁白使用中文，英文对话仍由前端文本渲染，不依赖图片中的文字。
- 理解检查答案按 Pattern 持久化，翻页或重新进入讲解页不会重置。
- 理解检查不写入 Attempt，也不直接改变 Coverage 或 Mastery。

### 讲解解锁

- 每个 Subtopic 提供单个“解锁关口 / 查看讲解”入口。
- 讲解路由为 `/pattern/{knowledgeId}/{subtopicId}`，按顺序展示该 Subtopic 的全部 Pattern。
- 阅读完成后点击“完成解锁”，即解锁整个 Subtopic；理解检查是可选反馈，不阻塞解锁。
- 已有 Pattern 练习进度或已完成 Subtopic 的历史用户自动视为已解锁。
- 旧版按 Pattern 记录和整体 Subtopic 记录均可兼容。

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
- 48 项自动化测试
- Next.js production build
- 真实 DeepSeek 生成与 Batch 分析

## 10. 当前限制

- active Session 刷新恢复尚未实现。
- PatternProgress 使用 LocalStorage，未跨设备同步。
- 当前只有普通比较级接入正式漫画，其余 Subtopic 使用文字讲解。
- Challenge UI 仍是基础验收版本。

## 11. 下一步

1. 完成 6 个 Subtopic 的端到端人工体验。
2. 按统一脚本模板扩展其他 Pattern 的正式漫画素材。
3. 增加 TeachingContent 的语音播放和逐段教学展示。
4. 增加真实模型题目质量 eval。
5. 增加 active Session 恢复。
6. 验证后部署到生产环境。
