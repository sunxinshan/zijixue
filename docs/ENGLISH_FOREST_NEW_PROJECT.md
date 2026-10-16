# 英语森林新项目独立实施文档

> 文档版本：v1.0  
> 编写日期：2026-10-15  
> 旧项目参考提交：`ea4852a feat: unlock lessons per pattern`  
> 文档用途：作为全新独立项目的第一实施依据。  
> 重要边界：旧项目只作为业务规则和课程数据来源，不要求继续维护、重构或升级；新项目必须独立运行，不依赖旧项目作为运行时服务或子模块。

---

## 0. 新项目 Codex 首要阅读顺序

新项目开始开发前，先按以下顺序阅读本文件和旧项目源码：

1. `types/agent.ts`：完整数据契约。
2. `data/knowledge/comparative.ts`：当前唯一 Knowledge 的完整课程数据。
3. `data/lessons/comparative-basic.ts`：普通比较级漫画、分镜和理解检查。
4. `lib/agent/graph.ts`：LangGraph 启动图和批次完成图。
5. `lib/agent/coverage.ts`：Coverage、题量、弱项补题、结束条件。
6. `lib/agent/analysis.ts`：Batch 表现和连续错误计算。
7. `lib/agent/question-pool.ts`：公共题库与个性化补题。
8. `lib/agent/question-pool-store.ts`：题库 Repository 和文件存储。
9. `lib/agent/validation.ts`：TeachingStrategy 和 Question 校验。
10. `lib/agent/providers/mock.ts`：确定性教学诊断和题目的降级实现。
11. `lib/mastery.ts`：LearningState 更新和完成判定。
12. `lib/storage.ts`：旧项目 LocalStorage、迁移和解锁状态。
13. `components/game/GameView.tsx`：前端答题、判题、批次提交和页面状态。
14. `components/pattern-lesson/*`：漫画/文字讲解和理解检查。
15. `docs/AGENT.md`、`docs/DATA.md`、`docs/STATUS.md`：旧项目设计边界和当前状态。

本文中标记为“旧项目事实”的内容来自源码；标记为“新项目必须改造”或“待确认”的内容不能当作旧项目已实现能力。

---

## 1. 旧项目现状分析

### 1.1 技术栈

| 层级 | 旧项目实现 |
|---|---|
| 前端 | Next.js 16.3.5、React 19、TypeScript |
| 样式 | Tailwind CSS 4 |
| Agent 编排 | LangGraph 1.4 |
| LLM 接入 | LangChain OpenAI 兼容 Adapter，支持 mock、openai、deepseek |
| Schema 校验 | Zod 4 |
| 持久化 | 浏览器 LocalStorage + 服务端文件题库 |
| 数据库 | 无 |
| 用户认证 | 无，固定使用 `local-user` |
| 服务端题库 | JSON 文件，默认 `.data/question-pools` |
| 图片 | `public/comic/*.png` 静态资源 |
| 测试 | Node test + tsx，共 48 项旧项目测试 |
| 生产部署 | 腾讯云自托管 Next.js 服务 `project2`，本任务不要求使用 |

### 1.2 旧项目目录和关键模块

```text
app/
  api/agent/session/start/route.ts
  api/agent/session/complete-batch/route.ts
  game/[id]/page.tsx
  game/[id]/[subtopicId]/page.tsx
  knowledge/[id]/page.tsx
  pattern/[knowledgeId]/[subtopicId]/[patternId]/page.tsx
  result/[id]/page.tsx
components/
  game/GameView.tsx
  knowledge/KnowledgeCard.tsx
  knowledge/KnowledgeView.tsx
  pattern-lesson/PatternLesson.tsx
  pattern-lesson/ComicLesson.tsx
  pattern-lesson/TextLesson.tsx
  pattern-lesson/UnderstandingCheck.tsx
  result/ResultView.tsx
data/
  knowledge/comparative.ts
  lessons/comparative-basic.ts
lib/
  agent/
    analysis.ts
    api.ts
    client.ts
    coverage.ts
    graph.ts
    llm.ts
    prompts.ts
    provider.ts
    providers/mock.ts
    providers/openai.ts
    question-options.ts
    question-pool.ts
    question-pool-store.ts
    validation.ts
  game.ts
  mastery.ts
  pattern-lesson.ts
  storage.ts
  use-app-storage.ts
public/comic/
```

### 1.3 当前课程数据规模

旧项目当前只有一个正式 Knowledge：

- Knowledge：1 个，`comparative`，名称“比较级”。
- Subtopic：6 个。
- Pattern：28 个。
- 所有 Pattern 均为 `required: true`。
- 漫画：8 张 PNG，覆盖普通比较级 5 个 Pattern。
- 漫画规格：1024 x 1536，合计约 20.22 MB。
- Pattern 的 `teachingContent`：全部存在完整文字教材字段。
- 独立理解检查：只有 `comparative-than` 配置了 2 道。
- 源码中没有静态主题库；题目由公共 QuestionPool 或 Agent 动态生成。

当前 6 个 Subtopic 和 28 个 Pattern：

| Subtopic ID | Subtopic 名称 | 最低题量 | 目标正确率 | Pattern ID |
|---|---|---:|---:|---|
| `comparative-basic` | 普通比较级 | 10 | 90 | `comparative-form`, `comparative-than`, `comparative-be`, `comparative-action`, `which-comparative` |
| `superlative-basic` | 最高级 | 12 | 90 | `superlative-form`, `superlative-the`, `superlative-of`, `superlative-in`, `which-superlative` |
| `comparative-form-rules` | 比较级和最高级的变化规则 | 24 | 90 | `regular`, `e-ending`, `y-ending`, `double-consonant`, `irregular`, `rule-selection` |
| `comparative-more-most` | more / most | 12 | 90 | `more-most`, `more-most-judgment` |
| `comparative-as-as` | as ... as / not as ... as | 9 | 90 | `as-as`, `not-as-as`, `as-as-base-form`, `not-meaning` |
| `comparative-sentence-application` | 比较句型综合应用 | 12 | 90 | `application-comparative`, `application-superlative`, `application-as-as`, `application-not-as-as`, `application-which-comparative`, `application-which-superlative` |

### 1.4 当前本地运行数据

`.data` 是旧项目运行时数据，不进入 Git，不应视为课程权威源：

- `.data/baselines/`：4 个旧基线文件，共 60 道题。
- `.data/question-pools/`：8 个文件、36 个 Pattern Pool、120 道题。
- 其中包含旧 ID：
  - `form-change`
  - `as-as`
- 新项目迁移时应优先使用当前 V3 ID：
  - `comparative-form-rules`
  - `comparative-as-as`

这些文件只能作为可选题目素材来源。正式课程结构必须从 TypeScript 数据和行为规则导出。

---

## 2. 业务模型和实体关系

### 2.1 旧项目事实

```text
Knowledge
  └── Subtopic
       └── Pattern
            └── TeachingContent
                 ├── TextLesson（由 TeachingContent 字段直接承载）
                 ├── ComicLesson（可选）
                 ├── UnderstandingCheck（可选）
                 └── Pattern Examples / Coverage Items
Question
  └── 必须绑定 knowledgeId + knowledgeSubtopic + patternId

LearningSession
  └── Attempt[]
       └── 用于计算 PatternProgress、BatchObservation、Strategy、Summary

LearningState
  └── 长期状态：mastery、patternProgress、strengths、weaknesses、completed
```

### 2.2 业务层级职责

| 实体 | 职责 | 旧项目事实 |
|---|---|---|
| Knowledge | 课程 Level 和完整场景 | 当前只有 `comparative` |
| Subtopic | 学生可见的学习关卡，有最低题量和目标正确率 | 共 6 个 |
| Pattern | Agent 调度的最小教学单元，覆盖率核心 | 共 28 个，全部 required |
| TeachingContent | 教材事实来源，Agent 不得自行改规则 | 每个 Pattern 必有 |
| ComicLesson | TeachingContent 的漫画呈现，可选 | 仅普通比较级 5 个 Pattern 有 |
| UnderstandingCheck | 讲解后的即时理解检查，不等于正式练习 | 仅 `comparative-than` 有 |
| QuestionPool | 公共基础题，按 Knowledge/Subtopic/Pattern 共享 | 文件存储 |
| Question | 正式练习内容，绑定 Knowledge/Subtopic/Pattern | 运行时生成或从题库选取 |
| Session | 一次学习过程 | 每次进入关卡创建 |
| Attempt | 学生对某道正式题的客观作答 | 正确和错误都保存 |
| PatternProgress | Pattern 的尝试、正确和 Coverage 状态 | 覆盖与掌握分离 |
| LearningState | 跨 Session 的长期学习状态 | LocalStorage |
| SessionSummary | 一次 Session 的 Agent 总结 | 用于更新 LearningState |

---

## 3. 当前课程数据真实结构

### 3.1 源码权威位置

当前课程运行时权威数据来自：

- `data/knowledge/comparative.ts`
- `data/lessons/comparative-basic.ts`
- `public/comic/*.png`
- `docs/CONTENT_V3.md` 是教学内容规范，但项目运行时以 TypeScript 数据为准。

### 3.2 Knowledge

旧项目字段：

```ts
interface Knowledge {
  id: string;
  title: string;
  description: string;
  subtopics: Subtopic[];
}
```

当前值：

- `id`: `comparative`
- `title`: `比较级`
- `description`: `从普通比较级、最高级、变化规则、more/most、同级比较到综合应用，逐步掌握比较表达。`

没有独立 `order` 字段。数组顺序就是 Subtopic 顺序。

### 3.3 Subtopic

旧项目字段：

```ts
interface Subtopic {
  id: string;
  knowledgeId: string;
  name: string;
  learningGoal: string;
  description: string;
  minimumQuestions: number;
  targetAccuracy: number;
  patterns: Pattern[];
}
```

迁移注意：

- `knowledgeId` 必须转为外键。
- `order` 需要从数组索引显式导出。
- `targetAccuracy` 当前全部为 90。
- `minimumQuestions` 是 Subtopic 完成的最低总尝试题量之一。

### 3.4 Pattern

旧项目字段：

```ts
interface Pattern {
  id: string;
  knowledgeId: string;
  subtopicId: string;
  name: string;
  description: string;
  required: boolean;
  minimumQuestions: number;
  coverageItems?: string[];
  teachingContent: TeachingContent;
  explanations?: string[];
  notes?: string[];
  examples: PatternExample[];
}
```

真实 Coverage Items：

| Pattern | Coverage Items |
|---|---|
| `comparative-form` | `tall`, `fast`, `long` |
| `superlative-form` | `tall`, `fast` |
| `regular` | `long`, `tall`, `fast` |
| `e-ending` | `large`, `nice` |
| `y-ending` | `busy`, `easy`, `early`, `happy` |
| `double-consonant` | `big`, `hot` |
| `irregular` | `good`, `well`, `many`, `much`, `bad`, `little` |
| `more-most` | `popular`, `famous`, `difficult`, `important`, `interesting`, `useful`, `beautiful`, `expensive` |
| `as-as` | `big`, `tall`, `fast` |
| `not-as-as` | `tall`, `big`, `fast` |

其他 Pattern 当前没有显式 `coverageItems`，Coverage 完成只看最低尝试题量。

### 3.5 TeachingContent

旧项目字段：

```ts
interface TeachingContent {
  concept: string;
  why?: string;
  rule?: string;
  structure?: string;
  examples: TeachingExample[];
  usage?: string[];
  contrasts?: string[];
  commonMistakes?: string[];
  guidedExamples?: string[];
  practiceHints?: string[];
  comic?: ComicLesson;
  understandingCheck?: UnderstandingCheckQuestion[];
}
```

迁移时必须原样保留：

- 所有英文字符串。
- 中文翻译和解释。
- 空值状态。
- 顺序。
- 漫画图片引用。
- 理解检查答案和解析。

### 3.6 漫画和理解检查

旧项目事实：

- 漫画 `status` 只有 `published` 才可用于默认漫画模式。
- 支持 1～2 个 panel。
- 任意 panel 的 `imageUrl` 为空则不使用漫画。
- 图片加载失败时前端自动回退文字讲解。
- 旁白使用中文。
- 英文对话和重点词组由前端文本渲染，不依赖图片文字。
- 理解检查类型：`choice`、`true_false`、`fill_blank`。
- 字符串答案比较采用去首尾空格 + 忽略大小写。
- 理解检查答案按 Pattern 存储在 LocalStorage。
- 阅读漫画或通过理解检查不会写入 Attempt，也不会直接改变 Coverage/Mastery。

新项目要求：

- 图片资源必须进入 Asset/Storage 体系。
- 理解检查提交应保存到数据库。
- 后端必须校验答案，不信任前端 `passed` 字段。
- 漫画和文字模式可以在前端切换，但发布状态由后端控制。

---

## 4. 学生端真实业务流程

### 4.1 Subtopic 讲解解锁

旧项目事实：

1. Knowledge 页面每个 Subtopic 显示单个“解锁关口”。
2. 讲解路由：
   - `/pattern/{knowledgeId}/{subtopicId}`
3. 讲解页按 Pattern 顺序展示该 Subtopic 的全部教学内容。
4. 学生读完最后一个 Pattern 后点击“完成解锁”，即解锁整个 Subtopic。
5. 理解检查是可选学习反馈，不阻塞“继续学习”或“完成解锁”。
6. 已有 PatternProgress / 已完成 Subtopic 的历史用户自动视为该 Subtopic 已解锁。
7. 旧版本整体 Subtopic 解锁记录仍兼容；短周期按 Pattern 全量解锁记录也兼容。
8. 当前练习解锁检查只在前端执行；直接调用 API 仍可能绕过。
9. 新项目必须在后端强制执行 Subtopic 解锁检查。

### 4.2 启动 Session

旧项目 API：

```text
POST /api/agent/session/start
```

请求主要字段：

```ts
{
  userId: string;
  knowledgeId: string;
  mode: "subtopic" | "challenge";
  subtopicId?: string;
  learningState?: LearningState | null;
  subtopicStates?: LearningState[];
}
```

Subtopic 分支：

1. 校验 Knowledge 和 Subtopic。
2. 使用客户端传入的 LearningState，或创建初始 Subtopic LearningState。
3. 若没有 LearningState，进入公共 QuestionPool 路径。
4. 若有 LearningState，生成初始 Observation 并调用 Agent。

Challenge 分支：

1. 校验所有 Subtopic 是否完成且 required Pattern Coverage 完成。
2. 未满足返回 403。
3. 构造 Knowledge LearningState。
4. 合并所有 Subtopic 的 PatternProgress。
5. mastery 使用 Subtopic mastery 平均值。
6. strengths、weaknesses、recommendedFocus 使用去重合并。

### 4.3 启动图真实流程

```text
START
  ↓
load_context
  ↓
analyze_learning_state
  ├── 空状态：读取/生成公共 QuestionPool Batch
  └── 已有状态：创建初始 Observation
  ↓
generate_teaching_strategy
  ├── 公共题库路径：程序生成 QuestionPool Strategy
  └── 已有状态：LLM 生成 Strategy + 程序硬约束
  ↓
generate_question_batch
  ↓
END
```

关键点：

- 空状态首轮不会调用 LLM Strategy；直接使用公共题库固定分布。
- 非空状态首轮会调用 LLM 选择重点 Pattern 和题量。
- 题目 ID 最终由程序重写为：
  - `{sessionId}-b{batchNumber}-q{index+1}`

### 4.4 答题流程

旧项目事实：

1. 题目逐题展示。
2. 判题完全在前端本地进行。
3. 正确答案：自动进入下一题，不显示确认页。
4. 答错：停留在当前题，显示正确答案和解析，点击后继续。
5. 每道题立即记录 Attempt，正确和错误都记录。
6. `answerLocked` 防止连续点击或重复提交。
7. 每题只允许一次当前 Batch 作答；不会在本题原地重试。

新项目必须改造：

- 判题必须在后端完成。
- 后端根据保存的 Question.answer 计算 `correct`。
- 前端提交的 `correct` 只能作为诊断数据，不能作为事实来源。
- 应在数据库保存原始答案、判题结果、题目快照和时间。

### 4.5 完成 Batch 并进入下一批

旧项目 API：

```text
POST /api/agent/session/complete-batch
```

完成图真实流程：

```text
START
  ↓
record_attempt
  ↓
analyze_batch
  ↓
generate_teaching_strategy
  ├── continue → 生成下一批题目 → END
  └── finish → summarize_session → save_learning_state → END
```

`record_attempt` 强制校验：

- Attempt 数量必须等于当前 Batch 题数。
- Attempt ID 数量必须等于当前 Batch 题数。
- Question ID 必须属于当前 Batch。
- Session ID 必须一致。
- Knowledge ID 必须一致。

`analyze_batch`：

- 按 Pattern 汇总当前 Batch 正确数和总数。
- 计算总体正确率。
- 计算每个 Pattern 当前 Batch 内最大连续错误数。
- 合并长期 PatternProgress。

`generate_teaching_strategy`：

- LLM 输出 Strategy。
- 程序校验并修正 Strategy。
- 程序可强制 `finish`。
- 程序可调整题量、补齐 required Pattern、增加弱 Pattern 题量。

`continue`：

- 生成下一批题目。
- 返回前端进入 `continue-ready` 页面。

`finish`：

- 生成 SessionSummary。
- 更新 LearningState。
- Session 标记 completed。
- 跳转结果页。

### 4.6 结果页

旧项目结果页展示：

- 星星：正确率 >= 90% 为 3 星，>= 70% 为 2 星，否则 1 星。
- XP：每题正确 10 XP，Session 完成再奖励 30 XP。
- Mastery 和 Summary。
- strengths / weaknesses / recommendedFocus。
- Subtopic 正确率。
- Challenge 失败或推荐复习时，显示推荐 Subtopic。
- 错题列表显示题干、正确答案和解析。

旧项目缺失：

- 没有实现头像或外观奖励。
- 没有服务端结果存档。
- 没有明确的 Challenge 失败状态，只有 Strategy 不 finish 继续练习。
- 没有 active Session 刷新恢复。

---

## 5. 判题、Attempt 和题目展示规则

### 5.1 判题规则

旧项目事实：

```ts
choice:
  trim + toLocaleLowerCase("en-US") 后比较 answer

true-false:
  答案必须是 boolean，且严格等于 question.answer
```

判断题的 options 即使模型返回，也会在验证阶段删除。

### 5.2 Attempt 字段

```ts
interface Attempt {
  id: string;
  sessionId: string;
  knowledgeId: string;
  subtopicId?: string;
  patternId?: string;
  coverageItemId?: string;
  questionId: string;
  answer: string | boolean;
  correct: boolean;
  timestamp: number;
}
```

### 5.3 题目展示随机化

旧项目事实：

- 选择题正确选项位置按选项数量分组。
- 每组尝试均匀覆盖位置 0、1、2、3。
- 再对目标位置执行 Fisher-Yates 洗牌。
- 目的：避免正确答案总在 A。

新项目应保留这一行为，并增加测试。

---

## 6. Coverage 真实规则

### 6.1 Coverage 与 Mastery 分离

Coverage 表示“测过并覆盖了哪些知识项”，不代表掌握。

Mastery 是 Agent 综合判断，不直接由 Coverage 公式得出。

### 6.2 PatternProgress 更新

`applyBatchToPatternProgress` 的真实做法：

1. 对每个 Pattern 从零构造结果。
2. 继承旧的 `coveredItems`。
3. 遍历本批 Attempt：
   - 找到对应 Question。
   - 只处理 Pattern 匹配的题目。
   - 用 Question ID 去重，避免同一题重复计数。
   - 正确题加入正确集合。
   - 只要 Attempt 出现，就加入 Coverage Item，无论答对还是答错。
4. `attemptedQuestions = 旧 attemptedQuestions + 本批唯一题数`
5. `correctQuestions = 旧 correctQuestions + 本批唯一正确题数`
6. `coveredItems` 为累积去重数组。

### 6.3 Coverage 完成条件

```text
attemptedQuestions >= pattern.minimumQuestions
且
若 pattern.coverageItems 非空，则所有 coverageItems 必须已出现
```

只要某个 Coverage Item 出现过，就算已覆盖；不要求答对。

### 6.4 Subtopic Coverage 完成条件

```text
所有 required Pattern 的 coverageComplete = true
```

非 required Pattern 当前不阻塞。

### 6.5 已知实现风险：强制 finish 的 Coverage 判断

旧项目 `forceFinishOnPerfectBatch` 的条件是：

```text
当前 Batch 100% 正确
且
当前 Batch 中出现过所有 required Pattern
```

但函数注释和 reason 声称“Coverage 完成”，代码并未直接检查：

```text
patternProgress[patternId].coverageComplete === true
```

这可能产生边界偏差：某个 required Pattern 的最小题量或 Coverage Items 尚未完成，仅因当前 Batch 全对且包含该 Pattern 就直接 finish。

新项目应明确采用更安全规则：

```text
强制 finish 前必须满足：
- 当前 Batch 全对
- 所有 required Pattern 的 coverageComplete 均为 true
- totalAttempted >= subtopic.minimumQuestions
```

如果产品决定保留旧行为，必须单独写成明确规则并添加测试，不能沿用含糊注释。

---

## 7. 弱项、错误分类和强化练习规则

### 7.1 确定性 Batch 观察

旧项目先计算客观观察，不依赖 LLM：

- 当前 Batch overall accuracy。
- 每个 Pattern correct / total / accuracy。
- 每个 Pattern 当前 Batch 最大连续错误数。
- 过去 Batch 表现。
- 长期 PatternProgress。
- 历史 TeachingStrategy。

### 7.2 弱 Pattern 判定

旧项目的事实阈值：

```text
accuracy < 60%
且
(total >= 2 或 correct == 0)
```

按 accuracy 升序排序。

### 7.3 连续弱 Batch

`countConsecutiveWeakBatches`：

- 从最新 Batch 向前遍历。
- 某 Pattern 的 Batch accuracy < 60%。
- 且 `total >= 2` 或 `correct == 0`。
- 一旦遇到非弱 Batch 停止。
- 返回连续弱 Batch 数量。

### 7.4 Mock / 降级诊断分支

在真实模型不可用或超时降级时，旧项目使用以下确定性规则：

| 诊断 | 触发条件 | strategyLevel | action | 难度 | 题量/重点 |
|---|---|---:|---|---|---|
| `persistent_failure` | 同一 Pattern 连续弱 Batch >= 2 | 4 | `change_strategy` | 当前 - 1 | 约 5 题，聚焦该 Pattern |
| `rule_misunderstanding` | 同一弱 Pattern 当前 Batch 连续错误 >= 3 | 3 | `explain` | 当前 - 1 | 约 5 题，先重新解释 |
| `improving` | 最新 accuracy >= 90 且最近最多 3 次严格上升 | 3 | `increase_difficulty` | 当前 + 1 | 约 10 题 |
| `mastered` | 最近 2 次 accuracy >= 90 且无未覆盖 required Pattern | 5 | `finish` | 当前 | 0 |
| `subtopic_weakness` | required Pattern 有未完成 Coverage | 2 | `targeted_practice` | 当前 | 最多 3 个未覆盖重点，约 8-9 题 |
| `multiple_weaknesses` | 弱 Pattern >= 2 | 2 | `targeted_practice` | 当前 | 最低分 2 个，约 8 题 |
| `subtopic_weakness` | 只有 1 个弱 Pattern | 2 | `targeted_practice` | 当前 | 该 Pattern，约 6 题 |
| `accidental` | Batch accuracy >= 85 且无明显集中错误 | 1 | `continue` | 当前 | 约 12 题 |
| `accidental` | 其他情况 | 1 | `continue` | 当前 | 继续收集表现 |

### 7.5 TeachingStrategy 结构

```ts
interface TeachingStrategy {
  diagnosis: Diagnosis;
  strategyLevel: 1 | 2 | 3 | 4 | 5;
  action:
    | "continue"
    | "targeted_practice"
    | "explain"
    | "simplify"
    | "change_strategy"
    | "increase_difficulty"
    | "mixed_review"
    | "finish";
  focus: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  questionDistribution: { patternId: string; count: number }[];
  explanation?: string;
  examples?: string[];
  reason: string;
}
```

### 7.6 LLM Strategy 校验硬规则

旧项目 Zod + Validator 强制：

- `diagnosis` 只能是预定义枚举。
- `strategyLevel` 只能是 1-5。
- `action` 只能是预定义枚举。
- `focus` 中的 Pattern 必须属于当前 Knowledge。
- `questionDistribution.patternId` 必须合法且不能重复。
- 除 `finish` 外，总题量必须在 3-20 之间。
- `finish` 时总题量必须为 0。
- `strategyLevel >= 3` 或 `action` 为 `explain`、`simplify`、`change_strategy` 时，必须有 explanation 和非空 examples。
- `persistent_failure` 必须 `strategyLevel >= 4`，且 action 是 `simplify`、`change_strategy`、`explain` 之一。
- 兼容模型返回：
  - `focus` 字符串自动转数组。
  - `questionDistribution` 对象自动转数组。
  - examples 中的结构化对象可转成 `base → comparative → superlative` 字符串。

### 7.7 程序对 Strategy 的强制修正顺序

旧项目真实顺序：

```text
validate strategy
  ↓
forceFinishOnPerfectBatch
  ↓
enforceRequiredPatternCoverage
  ↓
boundStrategyBatchSize
  ↓
enforceWeakPatternMinimums
  ↓
validate strategy again
```

### 7.8 required Coverage 优先补题

`enforceRequiredPatternCoverage`：

- 所有未完成 Coverage 的 required Pattern，至少安排 1 题。
- 若总题数超过 20，优先削减：
  1. 已完成 Coverage 的 Pattern。
  2. 非 focus Pattern。
  3. 题量较多的 Pattern。

### 7.9 弱 Pattern 题量补齐公式

`enforceWeakPatternMinimums`：

```text
targetCorrect = ceil(attemptedQuestions * targetAccuracy / 100)
needed = max(0, targetCorrect - correctQuestions)
下一批该 Pattern 至少安排 needed 题
```

这是旧项目中非常关键、且用户曾明确要求的实际强化规则。

示例：

```text
y-ending 已答 10 题，正确 7 题，targetAccuracy = 90%
targetCorrect = ceil(10 * 0.9) = 9
needed = 9 - 7 = 2
下一批 y-ending 至少 2 题
```

### 7.10 Batch 题量收缩

`boundStrategyBatchSize`：

| 条件 | 目标最大题量 |
|---|---:|
| accuracy >= 90 且 required Coverage 全部完成 | 5 |
| accuracy >= 80 | 8 |
| `persistent_failure` | 5 |
| `rule_misunderstanding` | 5 |
| 其他 | 20 |

削减顺序：

- 保护 `strategy.focus`。
- 保护未完成 Coverage 的 required Pattern。
- 先削题量多、非保护的 Pattern。
- 最后保证最小 3 题。

### 7.11 启动阶段无题保护

如果启动阶段 Strategy 是 `finish` 或 questionDistribution 总数为 0，程序转换为：

```text
action = mixed_review
focus = 所有 Pattern
questionDistribution = 至少 3 题并覆盖 Pattern
```

原因：进入关卡前必须至少产生一轮验证题。

---

## 8. Mastery 和完成判定真实逻辑

### 8.1 旧项目 Mastery 原则

旧项目不在业务代码中固定“答对 +10、答错 -5”。

真实流程：

```text
Attempts
  ↓
Agent 分析
  ↓
SessionSummary.mastery
  ↓
程序 clamp 到 0-100
  ↓
写入 LearningState.mastery
```

### 8.2 降级时的 Mastery

当主模型超时并降级到 Mock Provider：

```text
mastery = round(当前 Session 总正确数 / 总题数 * 100)
```

这只是故障降级实现，不是正式产品规则。

### 8.3 SessionSummary

```ts
interface SessionSummary {
  mastery: number;
  strengths: string[];
  weaknesses: string[];
  recommendedFocus: string[];
  summary: string;
}
```

校验：

- mastery 0-100。
- strengths、weaknesses、recommendedFocus 去重。
- recommendedFocus 必须属于当前 Knowledge 的 Pattern。
- summary 非空。

### 8.4 LearningState 更新

`buildLearningStateFromSummary`：

- mastery：clamp 后写入。
- strengths：去重、去空。
- weaknesses：去重、去空。
- recommendedFocus：过滤非法 Pattern。
- currentDifficulty：最新 Strategy difficulty。
- strategyLevel：最新 Strategy level。
- patternProgress：通过 `applyBatchToPatternProgress` 更新。
- updatedAt：当前时间。

### 8.5 Subtopic 完成条件

```text
Subtopic Coverage 完成
且
总 attemptedQuestions >= subtopic.minimumQuestions
且
最新 Strategy.action == "finish"
```

注意：Coverage 完成和最低题量都不是“掌握”；最终 finish 由 Agent/Strategy 决定。

### 8.6 Knowledge Challenge 解锁条件

旧项目真实条件：

```text
每个 Subtopic 都存在 LearningState
且
state.completed = true
且
该 Subtopic 所有 required Pattern coverageComplete = true
```

### 8.7 Challenge 通过条件

旧项目没有单独的 `challengePassed` 字段。Challenge 的 LearningState：

```text
scope = knowledge
completed = latestStrategy.action == "finish"
```

Challenge 不要求 Coverage 最低题量公式，主要依赖 Agent 的 finish 决策和程序强制 finish。

### 8.8 Mastery 展示分档

仅用于 UI 文案：

| mastery | 文案 |
|---:|---|
| 0-24 | 初学 |
| 25-49 | 学习中 |
| 50-74 | 基本掌握 |
| >= 75 | 熟练掌握 |

这些不是完成条件。

---

## 9. QuestionPool 和题目生成真实逻辑

### 9.1 公共题库目标数量

每个 Pattern 的 pool target：

```text
max(pattern.minimumQuestions, coverageItems.length, 1)
```

若所有 Pattern 总和小于 Subtopic.minimumQuestions，则按 Coverage 项数量多的 Pattern 优先轮询补足。

### 9.2 公共题库读取/生成

`ensureQuestionPools`：

1. 读取该 Knowledge + Subtopic 的所有 Pool。
2. Pool 可用条件：
   - status = active。
   - questions 非空。
   - 通过 Question 校验。
   - 题量达到该 Pattern 的目标数量。
3. 缺失 Pattern 一次性生成。
4. 使用 `pending` Map 防止同一 Subtopic 并发重复生成。
5. 保存到文件 Repository。
6. 返回所有可用 Pool。

### 9.3 公共题库文件

默认路径：

```text
.data/question-pools/{knowledgeId}__{subtopicId}.json
```

文件结构：

```ts
{
  version: 1,
  knowledgeId: string,
  subtopicId: string,
  pools: QuestionPool[]
}
```

`QuestionPool`：

```ts
interface QuestionPool {
  id: string;
  knowledgeId: string;
  subtopicId: string;
  patternId: string;
  questions: Question[];
  version: number;
  status: "active" | "invalid";
  createdAt: string;
  updatedAt: string;
}
```

### 9.4 公共题选择

首轮空状态：

- 按 pool target 从每个 Pattern 选取。
- 优先选择 `previousQuestions` 中未出现的题目。
- 新鲜题不足时允许复用。
- 最终按选项长度均匀随机化选择题答案位置。

### 9.5 个性化习题和公共题分离

后续批：

1. 根据 Strategy questionDistribution。
2. 优先从公共题库取足够题。
3. 若公共题不足，只对缺失数量调用 LLM 生成个性化补充题。
4. 个性化题不写回公共题库。
5. 生成空响应最多重试 2 次。
6. 两次都无题则抛错。

### 9.6 Question 校验规则

旧项目 Validator 强制：

- 题目数量 1-40。
- Question ID 唯一。
- 题干必须含中文说明。
- 题干按小写、去空白、去常见标点后不能重复。
- knowledgeId 必须匹配当前 Knowledge。
- patternId 必须存在。
- `knowledgeSubtopic` 会被程序按 patternId 自动纠正。
- 有 coverageItems 时，coverageItemId 必须合法。
- choice：
  - 至少 2 个 options。
  - answer 必须是 options 之一。
- true-false：
  - answer 必须是 boolean。
  - options 会被删除。
- 若传入 distribution，则每个 Pattern 实际数量必须完全一致。

### 9.7 新项目题库建议

新项目不要把运行时文件结构原样搬过去。建议：

- QuestionPool / Question 入 MySQL。
- `source` 字段区分 `imported_pool`、`agent_generated`、`admin_published`。
- 个性化题默认不污染公共题库。
- 题库发布状态：draft / reviewed / published / invalid。
- 新项目必须保存 question snapshot 到 SessionBatch，避免题库后续修改影响历史 Attempt 还原。

---

## 10. 旧项目持久化真实结构

### 10.1 LocalStorage Key

- 当前：`english-forest`
- 旧版：`english-forest:v1`
- 更新事件：`english-forest:storage-change`

### 10.2 AppStorage v2

```ts
interface AppStorage {
  version: 2;
  userId: string;
  learningStates: LearningState[];
  sessions: LearningSession[];
  attempts: Attempt[];
  questions: Question[];
  lessonProgress: Record<string, LessonProgress>;
  lessonCheckProgress: Record<string, LessonCheckProgress>;
  legacyXp?: number;
  legacyStars?: number;
}
```

### 10.3 旧数据迁移

事实：

- `english-forest:v1` 的 mastery 平均值迁移为 Knowledge LearningState。
- XP 和星星保留为 legacyXp / legacyStars。
- 旧 Subtopic ID 映射：
  - `form-change` → `comparative-form-rules`
  - `as-as` → `comparative-as-as`
- 旧 `form-change` LearningState 会拆分成：
  - `comparative-form-rules`
  - `comparative-more-most`
- 迁移后 completed 被保守设为 false。

### 10.4 恢复缺失 Subtopic

如果存在已完成 Session 但没有对应 LearningState，旧项目会从：
- Session Summary
- Attempt
- Question
- Session 对应 Subtopic

重建该 Subtopic 的 LearningState。

### 10.5 存储限制

- `questions` 只保留最后 500 条。
- Attempt 没有限制，可能无限增长。
- 无跨设备同步。
- 一个浏览器一个 `local-user`。
- 刷新后 active Session 和当前 Batch 不恢复。

新项目要求：

- 所有状态进 MySQL/Learning Repository。
- 支持 active Session 恢复。
- 支持真正的多用户隔离。
- 不建议继续使用 LocalStorage 作为主数据源。

---

## 11. 旧项目 API 与前端调用契约

### 11.1 当前接口

旧项目只有两个 Agent API：

```text
POST /api/agent/session/start
POST /api/agent/session/complete-batch
```

没有：
- 注册
- 登录
- JWT/Session Auth
- 用户隔离
- 课程管理
- 文件上传
- Prompt 管理
- AI Task
- 服务端进度接口

### 11.2 Start Session 请求

```json
{
  "userId": "local-user",
  "knowledgeId": "comparative",
  "mode": "subtopic",
  "subtopicId": "comparative-basic",
  "learningState": null,
  "subtopicStates": []
}
```

### 11.3 Start Session 响应

```json
{
  "provider": "deepseek",
  "session": {
    "id": "session-uuid",
    "userId": "local-user",
    "knowledgeId": "comparative",
    "mode": "subtopic",
    "subtopicId": "comparative-basic",
    "startedAt": 1780000000000,
    "status": "active"
  },
  "learningState": {},
  "strategy": {},
  "batch": {
    "questions": []
  }
}
```

### 11.4 Complete Batch 请求

```json
{
  "userId": "local-user",
  "knowledgeId": "comparative",
  "mode": "subtopic",
  "subtopicId": "comparative-basic",
  "learningState": {},
  "sessionId": "session-uuid",
  "attempts": [],
  "currentBatch": { "questions": [] },
  "batchNumber": 1,
  "pastBatches": [],
  "strategies": [],
  "previousQuestions": []
}
```

### 11.5 Complete Batch 响应

```json
{
  "provider": "deepseek",
  "strategy": {},
  "batch": null,
  "sessionSummary": {},
  "learningState": {}
}
```

### 11.6 旧接口缺陷

1. `learningState` 由前端传入，未做服务端防篡改。
2. Attempts 的 `correct` 由前端计算，服务端未重新判题。
3. 没有用户认证，任何客户端可以伪造 userId。
4. 没有 Session Ownership 检查。
5. 没有幂等键，重复提交存在风险。
6. 没有 active Session 查询和恢复接口。
7. 没有题库管理和题目审核接口。
8. 没有文件上传接口。
9. 没有 Prompt 版本管理接口。
10. 没有 Challenge Reward。

新项目 API 必须修复这些问题。

---

## 12. 新项目技术架构要求

### 12.1 总体原则

新项目必须是一个独立仓库，推荐单仓库双应用：

```text
english-forest-v2/
  backend/      # Python + FastAPI
  frontend/     # React / Next.js
  data/
    seed/       # 旧项目导出的课程 JSON
    assets/     # 本地开发文件资源，生产替换 Storage Adapter
```

也可以拆成独立前后端仓库，但接口契约必须版本化。无论采用哪种方式，都不能依赖旧仓库运行。

### 12.2 后端技术栈

- Python 3.12+
- FastAPI
- Pydantic v2
- SQLAlchemy 2.x
- Alembic
- pytest
- SQLite 开发数据库
- MySQL 生产数据库
- 统一 AI Adapter
- 独立 Storage Adapter
- 建议使用 `uv` 或 `poetry` 管理依赖，但必须固定锁文件
- 密码哈希建议 Argon2 或 bcrypt
- Auth 建议 JWT + refresh token，或 httpOnly secure cookie

### 12.3 前端技术栈

- React / Next.js
- TypeScript
- Tailwind 或设计系统
- API Client 统一封装
- 不保存服务端密钥
- 课程、用户、进度和 AI 操作全部通过后端 API

### 12.4 数据库环境区分

| 环境 | 数据库 |
|---|---|
| 本地开发 | SQLite 文件 |
| 自动化测试 | 内存 SQLite 或临时测试库 |
| 生产 | 腾讯云 MySQL |

要求：

- 数据库 URL 通过 `DATABASE_URL` 配置。
- 不在代码中写死 SQLite/MySQL 地址。
- 业务代码只通过 SQLAlchemy Session 和 Repository 访问。
- 禁止直接依赖 SQLite 特有 SQL。
- JSON 字段通过 SQLAlchemy JSON 类型抽象。
- 索引、唯一约束、事务和并发必须同时考虑 SQLite 与 MySQL。
- Alembic 必须支持 SQLite 和 MySQL。
- 部署前必须执行 MySQL 兼容性测试。

### 12.5 推荐后端目录

```text
backend/
  app/
    main.py
    core/
      config.py
      security.py
      logging.py
      dependencies.py
    db/
      base.py
      session.py
      models/
      repositories/
    api/
      v1/
        auth.py
        catalog.py
        lessons.py
        learning.py
        results.py
        admin_courses.py
        admin_assets.py
        admin_prompts.py
        admin_ai_tasks.py
    schemas/
      auth.py
      catalog.py
      lesson.py
      learning.py
      question.py
      strategy.py
      admin.py
    services/
      auth_service.py
      catalog_service.py
      lesson_service.py
      learning_service.py
      coverage_service.py
      mastery_service.py
      question_pool_service.py
      prompt_service.py
    ai/
      adapter.py
      providers/
        mock_provider.py
        openai_compatible_provider.py
        deepseek_provider.py
      prompts/
        teaching_strategy_v1.yml
        question_batch_v1.yml
        session_summary_v1.yml
        ...
    storage/
      base.py
      local.py
      cos.py
    jobs/
      ai_task_runner.py
  alembic/
  tests/
  pyproject.toml
  .env.example
```

---

## 13. 新项目数据库模型建议

以下模型是推荐的 MySQL/SQLite 兼容设计；字段名可按项目规范调整，但语义必须保留。

### 13.1 用户和权限

#### users

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string/UUID PK | 用户 ID |
| email/username | varchar unique | 登录标识，二选一或都支持 |
| password_hash | varchar | 安全哈希 |
| display_name | varchar | 昵称 |
| role | enum: student/admin | 角色 |
| status | enum: active/disabled | 状态 |
| created_at / updated_at | datetime | 时间 |

#### user_preferences（可选）

- user_id
- preferred_teaching_mode
- avatar_key
- extra_json

### 13.2 课程结构

#### knowledge

- id
- title
- description
- scene_config_json
- status
- order_index
- version
- created_at / updated_at

#### subtopics

- id
- knowledge_id FK
- name
- learning_goal
- description
- minimum_questions
- target_accuracy
- order_index
- status
- created_at / updated_at
- unique(knowledge_id, order_index)

#### patterns

- id
- knowledge_id FK
- subtopic_id FK
- name
- description
- required
- minimum_questions
- coverage_items_json
- explanations_json
- notes_json
- order_index
- status
- created_at / updated_at
- unique(subtopic_id, order_index)

#### teaching_contents

- id
- pattern_id FK unique
- concept
- why
- rule
- structure
- usage_json
- contrasts_json
- common_mistakes_json
- guided_examples_json
- practice_hints_json
- version
- status: draft/reviewed/published
- created_at / updated_at

#### teaching_examples

- id
- teaching_content_id FK
- order_index
- sentence
- translation
- analysis

#### pattern_examples

- id
- pattern_id FK
- order_index
- text
- base
- comparative
- superlative
- coverage_item_id

#### comic_lessons

- id
- teaching_content_id FK unique
- status: draft/reviewed/published
- style_id
- alt_text
- created_at / updated_at

#### comic_panels

- id
- comic_lesson_id FK
- order_index
- asset_id FK
- purpose
- scene_description
- narration
- focus_text_json
- teacher_note
- alt_text

#### comic_dialogues

- id
- panel_id FK
- order_index
- character_id
- character_name
- text
- translation
- emotion

#### understanding_checks

- id
- pattern_id FK
- order_index
- type: choice/true_false/fill_blank
- prompt
- options_json
- answer_json
- explanation
- status
- created_at / updated_at

### 13.3 文件和资源

#### assets

| 字段 | 说明 |
|---|---|
| id | Asset ID |
| storage_backend | local/cos |
| storage_key | 相对路径或对象键 |
| original_name | 原始文件名 |
| mime_type | MIME |
| size_bytes | 大小 |
| sha256 | 内容校验 |
| owner_user_id | 上传者 |
| status | draft/published/deleted |
| created_at / updated_at | 时间 |

禁止把图片二进制直接存入 MySQL。

### 13.4 学习数据

#### learning_states

- id
- user_id FK
- knowledge_id FK
- scope: subtopic/knowledge
- subtopic_id nullable
- mastery
- strengths_json
- weaknesses_json
- current_difficulty
- recommended_focus_json
- strategy_level
- completed
- summary
- updated_at
- unique(user_id, knowledge_id, scope, subtopic_id)

#### pattern_progress

可以独立表，也建议独立表：

- user_id FK
- knowledge_id FK
- subtopic_id FK
- pattern_id FK
- attempted_questions
- correct_questions
- covered_items_json
- coverage_complete
- updated_at
- unique(user_id, pattern_id)

#### lesson_progress

- user_id FK
- knowledge_id FK
- subtopic_id FK
- completed
- completed_at
- unique(user_id, knowledge_id, subtopic_id)

#### lesson_check_progress

- user_id FK
- pattern_id FK
- answers_json
- passed
- updated_at
- unique(user_id, pattern_id)

### 13.5 Session 和学习批次

#### learning_sessions

- id
- user_id FK
- knowledge_id FK
- subtopic_id nullable FK
- mode: subtopic/challenge
- status: active/completed/abandoned
- started_at
- ended_at
- session_summary_json
- learning_state_snapshot_json
- created_at / updated_at

#### session_batches

- id
- session_id FK
- batch_number
- strategy_json
- status: active/completed
- current_question_index
- created_at / updated_at
- unique(session_id, batch_number)

#### session_questions

- id
- batch_id FK
- order_index
- question_snapshot_json
- question_id nullable FK
- correct_answer_snapshot_json
- explanation_snapshot
- pattern_id
- coverage_item_id
- answered_at
- unique(batch_id, order_index)

建议保存题目快照，而不是只保存 question_id。

#### attempts

- id
- session_id FK
- batch_id FK
- session_question_id FK
- user_id FK
- knowledge_id FK
- subtopic_id FK
- pattern_id FK
- coverage_item_id
- submitted_answer_json
- correct
- attempt_number
- duration_ms nullable
- created_at
- unique(batch_id, session_question_id, attempt_number)

### 13.6 题库

#### question_pools

- id
- knowledge_id FK
- subtopic_id FK
- pattern_id FK
- version
- status: active/invalid/draft/published
- created_at / updated_at
- unique(knowledge_id, subtopic_id, pattern_id, version)

#### questions

- id
- pool_id nullable FK
- knowledge_id FK
- subtopic_id FK
- pattern_id FK
- coverage_item_id
- type
- question
- options_json
- answer_json
- explanation
- difficulty
- source: imported_pool/agent_generated/admin_published
- status: draft/reviewed/published/invalid
- question_hash
- created_at / updated_at

`answer_json` 或拆分 `answer_text` / `answer_boolean` 均可；必须保证 choice 和 true-false 都能无损表达。

### 13.7 课程内容审核和 AI 任务

#### content_versions

- entity_type
- entity_id
- version
- snapshot_json
- status
- created_by
- reviewed_by
- created_at / reviewed_at

#### prompt_templates

- id
- key
- version
- system_prompt
- user_prompt_template
- input_schema_json
- output_schema_json
- retry_policy_json
- status
- created_at / updated_at
- unique(key, version)

#### ai_tasks

- id
- task_type
- status: queued/running/succeeded/failed/waiting_review
- input_json
- output_json
- error_json
- prompt_template_id
- provider
- model
- created_by
- created_at / started_at / finished_at

#### ai_task_results

- task_id
- result_json
- validation_status
- review_status
- reviewer_id
- review_comment
- published_entity_id
- created_at / reviewed_at

---

## 14. 课程数据导出方案

### 14.1 导出原则

1. 课程内容必须来自旧项目，不允许新项目重新生成。
2. 原始文字、答案、解析不得擅自改写。
3. 数组顺序必须转成显式 `order_index`。
4. ID 必须保持稳定，不能重新随机生成。
5. 图片必须复制到导出资产目录并计算 hash。
6. 导出和导入都必须可重复执行。
7. 必须输出统计和校验报告。
8. 不得修改旧项目源码或数据。
9. 导出脚本建议放在临时目录运行，或只在独立的新项目中实现读取逻辑。
10. 运行时题库和基线题必须标记为“可选资料”，不能冒充正式课程结构。

### 14.2 推荐导出文件

```text
export/
  manifest.json
  knowledge.json
  subtopics.json
  patterns.json
  teaching_contents.json
  teaching_examples.json
  pattern_examples.json
  comic_lessons.json
  comic_panels.json
  comic_dialogues.json
  understanding_checks.json
  question_pools_optional.json
  baseline_questions_optional.json
  assets_manifest.json
  validation_report.json
```

### 14.3 导出脚本读取位置

必须读取：

- `data/knowledge/comparative.ts`
- `data/lessons/comparative-basic.ts`
- `public/comic/*.png`

可选读取：

- `.data/question-pools/*.json`
- `.data/baselines/*.json`

不得读取或导出：

- `.env.local`
- API Key
- 用户 LocalStorage 数据
- 服务器日志
- 任何凭据

### 14.4 参考导出脚本

以下脚本是给新项目 Codex 的参考，不建议直接写回旧项目。应在临时目录运行，或在新项目 `tools/` 中运行并显式传入旧项目根目录。

```ts
// tools/export-old-course.ts
import { mkdir, writeFile, copyFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { comparativeKnowledge } from "../old-project/data/knowledge/comparative";
import { comparativeThanUnderstandingCheck } from "../old-project/data/lessons/comparative-basic";

const out = path.resolve(process.argv[2] ?? "./export");

function ordered<T>(items: T[]) {
  return items.map((item, index) => ({ ...item, order_index: index }));
}

await mkdir(out, { recursive: true });
await writeFile(
  path.join(out, "knowledge.json"),
  JSON.stringify(
    [{
      id: comparativeKnowledge.id,
      title: comparativeKnowledge.title,
      description: comparativeKnowledge.description,
      order_index: 0,
    }],
    null,
    2,
  ),
);

// 其余实体按相同方式从 comparativeKnowledge 展开。
// 每个实体必须保留旧 ID，并显式写入 order_index。
// 漫画 panel 的 imageUrl 应转换为 asset manifest 引用。
```

真实实现必须处理：

- `teachingContent` 的 optional 字段。
- 漫画 panel 的 asset ID。
- 理解检查答案类型。
- coverageItems。
- pattern examples。
- subtopic/pattern 的数组顺序。
- 导出统计。

### 14.5 字段映射

#### Knowledge

```text
id -> knowledge.id
title -> knowledge.title
description -> knowledge.description
order_index -> 数组索引
```

#### Subtopic

```text
id -> subtopic.id
knowledge_id -> subtopic.knowledgeId
name -> subtopic.name
learning_goal -> subtopic.learningGoal
description -> subtopic.description
minimum_questions -> subtopic.minimumQuestions
target_accuracy -> subtopic.targetAccuracy
order_index -> 数组索引
```

#### Pattern

```text
id -> pattern.id
knowledge_id -> pattern.knowledgeId
subtopic_id -> pattern.subtopicId
name -> pattern.name
description -> pattern.description
required -> pattern.required
minimum_questions -> pattern.minimumQuestions
coverage_items_json -> pattern.coverageItems ?? []
explanations_json -> pattern.explanations ?? []
notes_json -> pattern.notes ?? []
order_index -> 数组索引
```

#### TeachingContent

```text
pattern_id -> pattern.id
concept -> teachingContent.concept
why -> teachingContent.why
rule -> teachingContent.rule
structure -> teachingContent.structure
usage_json -> teachingContent.usage ?? []
contrasts_json -> teachingContent.contrasts ?? []
common_mistakes_json -> teachingContent.commonMistakes ?? []
guided_examples_json -> teachingContent.guidedExamples ?? []
practice_hints_json -> teachingContent.practiceHints ?? []
```

#### 漫画

```text
comic.id -> comic_lesson.id
comic.status -> comic_lesson.status
comic.styleId -> comic_lesson.style_id
comic.altText -> comic_lesson.alt_text
panel.id -> comic_panel.id
panel.order -> comic_panel.order_index
panel.imageUrl -> assets_manifest.source_url -> comic_panel.asset_id
panel.purpose -> comic_panel.purpose
panel.sceneDescription -> comic_panel.scene_description
panel.narration -> comic_panel.narration
panel.focusText -> comic_panel.focus_text_json
panel.teacherNote -> comic_panel.teacher_note
panel.altText -> comic_panel.alt_text
dialogue.* -> comic_dialogues
```

#### 理解检查

```text
id -> understanding_check.id
patternId -> pattern_id
type -> type
prompt -> prompt
options -> options_json
answer -> answer_json
explanation -> explanation
order_index -> 数组索引
```

#### 题目

运行时题库可选导入：

```text
id -> questions.id
type -> type
question -> question
options -> options_json
answer -> answer_json
explanation -> explanation
knowledgeId -> knowledge_id
knowledgeSubtopic -> subtopic_id
patternId -> pattern_id
coverageItemId -> coverage_item_id
difficulty -> difficulty
```

导入时必须校验：

- `knowledgeSubtopic` 是否是当前有效 Subtopic。
- `patternId` 是否与 Subtopic 对应。
- `coverageItemId` 是否在 Pattern coverageItems 中。
- 题干是否重复。
- choice answer 是否在 options 中。
- true-false answer 是否为 boolean。

### 14.6 图片迁移

旧项目引用方式：

```text
/comic/01-lesson082-p1.png
```

新项目不能用 `/public` 作为生产文件存储。推荐流程：

1. 复制 `public/comic/*.png` 到导出目录 `assets/comic/`。
2. 计算 SHA256。
3. 上传到 Storage Adapter。
4. 在数据库保存 asset metadata。
5. ComicPanel 只保存 asset_id。
6. 验证所有 panel 都能解析到 asset。
7. 验证 MIME 为 image/png，尺寸为 1024x1536。
8. 导入完成后不允许继续依赖旧项目的 `public` 路径。

### 14.7 导入流程

```text
读取 manifest
  ↓
预览：实体数、字段差异、重复 ID、缺失引用
  ↓
校验 Knowledge/Subtopic/Pattern/TeachingContent
  ↓
校验漫画和 asset manifest
  ↓
校验 UnderstandingCheck
  ↓
可选校验 QuestionPool / baseline
  ↓
事务导入
  ↓
输出统计报告
```

导入必须支持：

- `--dry-run`
- `--update-existing`
- `--skip-questions`
- `--asset-root`
- 错误报告
- 重复导入幂等

### 14.8 当前旧数据统计

课程结构：

- Knowledge：1
- Subtopic：6
- Pattern：28
- TeachingContent：28
- Pattern Examples：68 条
- TeachingContent 示例：66 条
- 漫画 Lesson：5
- Comic Panels：8
- UnderstandingCheck：2

可选运行时数据：

- baseline 文件：4，共 60 题。
- question pool 文件：8，共 36 Pattern Pool，120 题。
- 其中包含旧 ID `form-change` / `as-as`，导入时需要迁移或跳过重复池。

在正式导入前，导出脚本必须输出实际计数，不允许人工估算。

---

## 15. 新项目 API 契约

所有业务接口建议使用 `/api/v1` 前缀。以下为最低契约。实际实现可以调整路径，但不能删除语义。

### 15.1 认证

#### POST `/api/v1/auth/register`

请求：

```json
{
  "username": "student01",
  "password": "secure-password",
  "display_name": "森林同学"
}
```

响应：

```json
{
  "user": {
    "id": "uuid",
    "username": "student01",
    "display_name": "森林同学",
    "role": "student"
  }
}
```

#### POST `/api/v1/auth/login`

- 校验密码哈希。
- 返回 access token，或设置 httpOnly cookie。
- 不返回 password hash。

#### POST `/api/v1/auth/logout`

- 撤销 refresh token / session。

#### GET `/api/v1/auth/me`

- 返回当前用户与角色。

### 15.2 学生课程接口

#### GET `/api/v1/catalog/knowledge`

返回 Knowledge 列表。

#### GET `/api/v1/catalog/knowledge/{knowledge_id}`

返回：

- Knowledge 基础信息。
- Subtopic 列表。
- 每个 Subtopic 的 Pattern 列表。
- 当前用户的 Subtopic 解锁状态。
- 用户 LearningState 摘要。

#### GET `/api/v1/catalog/patterns/{pattern_id}`

返回 Pattern TeachingContent、ComicLesson、UnderstandingCheck。

#### POST `/api/v1/catalog/subtopics/{subtopic_id}/lesson-complete`

请求：

```json
{}
```

后端必须：

1. 标记该 Subtopic LessonProgress.completed=true。
2. 解锁该 Subtopic 的正式练习入口。
3. 不要求 UnderstandingCheck 通过才能解锁。
4. 返回最新 LessonProgress。

#### POST `/api/v1/catalog/patterns/{pattern_id}/understanding-check`

请求：

```json
{
  "answers": {
    "comparative-than-who": "I",
    "comparative-than-blank": "than"
  }
}
```

后端必须：

1. 校验答案。
2. 保存 Pattern 的 LessonCheckProgress。
3. 返回对错、解析和是否全部通过。
4. 检查结果只用于教学反馈，不控制 Subtopic 解锁。

### 15.3 学习 Session

#### POST `/api/v1/learning/sessions`

请求：

```json
{
  "knowledge_id": "comparative",
  "mode": "subtopic",
  "subtopic_id": "comparative-basic"
}
```

后端必须：

- 从当前登录用户读取 LearningState。
- 检查 Lesson 解锁。
- 检查 mode。
- 对 Challenge 检查解锁条件。
- 创建 LearningSession。
- 生成或恢复当前 Batch。
- 保存 Question Snapshot。
- 返回 Session、Batch 和 Strategy。

#### GET `/api/v1/learning/sessions/{session_id}`

返回 active Session 当前状态，用于刷新恢复。

#### POST `/api/v1/learning/sessions/{session_id}/answers`

提交单题答案。

请求：

```json
{
  "session_question_id": "uuid",
  "answer": "happier",
  "client_request_id": "idempotency-key"
}
```

后端：

- 必须重新判题。
- 记录 Attempt。
- 返回 correct、正确答案和解析。
- 如果该答案完成当前 Batch，可返回 batch_completed=true。

#### POST `/api/v1/learning/sessions/{session_id}/batches/{batch_id}/complete`

请求可以只提供幂等键；Attempt 已由服务端保存。

响应：

```json
{
  "strategy": {},
  "next_batch": null,
  "session_summary": {},
  "learning_state": {}
}
```

如果 strategy.action 不是 finish，必须返回 next_batch。

### 15.4 学习进度

#### GET `/api/v1/learning/progress`

返回当前用户：

- LearningState 列表。
- PatternProgress。
- LessonProgress。
- Session 列表摘要。

#### GET `/api/v1/results/{session_id}`

返回：

- SessionSummary。
- Attempt 统计。
- XP。
- 星级。
- 错题和解析。
- Challenge 推荐复习 Subtopic。

### 15.5 管理端

#### Course Admin

- `GET/POST/PATCH /api/v1/admin/knowledge`
- `GET/POST/PATCH /api/v1/admin/subtopics`
- `GET/POST/PATCH /api/v1/admin/patterns`
- `GET/PUT /api/v1/admin/teaching-contents/{pattern_id}`
- `GET/POST/PATCH /api/v1/admin/questions`

所有管理端接口必须校验 `role=admin`。

#### Asset Admin

- `POST /api/v1/admin/assets`
- `GET /api/v1/admin/assets`
- `DELETE /api/v1/admin/assets/{asset_id}`

#### Prompt Admin

- `GET/POST/PATCH /api/v1/admin/prompts`
- `POST /api/v1/admin/prompts/{id}/publish`

#### AI Task Admin

- `POST /api/v1/admin/ai-tasks`
- `GET /api/v1/admin/ai-tasks/{id}`
- `POST /api/v1/admin/ai-tasks/{id}/approve`
- `POST /api/v1/admin/ai-tasks/{id}/reject`

### 15.6 错误响应

统一格式：

```json
{
  "error": {
    "code": "CHALLENGE_LOCKED",
    "message": "还不能进入综合挑战",
    "details": {}
  }
}
```

错误状态建议：

- 400 参数错误
- 401 未登录
- 403 无权限或未解锁
- 404 资源不存在
- 409 幂等冲突或重复操作
- 422 业务校验失败
- 502 AI Provider 失败
- 504 AI Provider 超时

---

## 16. AI Adapter 和 Prompt 管理要求

### 16.1 当前旧项目实际 Prompt

旧项目只有 3 个 Prompt：

1. `generate_teaching_strategy`
   - 输入：当前 Knowledge、LearningState、BatchObservation。
   - 输出：TeachingStrategy。
2. `generate_question_batch`
   - 输入：Knowledge、Strategy、LearningState、previousQuestions。
   - 输出：QuestionBatch。
3. `summarize_session`
   - 输入：Knowledge、LearningState、Attempts、Questions、Strategies。
   - 输出：SessionSummary。

### 16.2 当前 Prompt 规则

#### TeachingStrategy

Prompt 要求：

- 只能返回枚举值。
- focus 使用 patternId。
- 除 finish 外总题量 3-20。
- 优先未完成 Coverage 的 required Pattern。
- 弱 Pattern 增加题量。
- 已掌握 Pattern 减少题量。
- level >= 3 必须有 explanation 和 examples。
- persistent_failure 必须 level >= 4 并改变教学方式。
- teachingContent 是教材事实。
- 不能扩展到其他 Knowledge。

#### QuestionBatch

Prompt 要求：

- 严格等于 questionDistribution 总数。
- 只允许 choice / true-false。
- 必须绑定 patternId。
- 有 coverageItems 时必须填写 coverageItemId。
- answer 和 options 必须匹配。
- 题干必须有中文说明。
- 不得重复 previousQuestions。
- 正确答案位置要分散。
- 必须依据 TeachingContent 生成。
- 只能返回 JSON。

#### SessionSummary

Prompt 要求：

- mastery 0-100。
- strengths / weaknesses / recommendedFocus。
- recommendedFocus 必须是合法 patternId。
- summary 1-2 句中文。
- Coverage Complete 不等于 Mastered。
- 综合考虑总体表现、Pattern、Coverage、连续错误和趋势。

### 16.3 新项目 Prompt 目录

建议每个 Prompt 一个 YAML 或 JSON 文件：

```text
prompts/
  textbook_ocr_v1.yml
  knowledge_structure_extract_v1.yml
  pattern_extract_v1.yml
  teaching_content_generate_v1.yml
  comic_script_generate_v1.yml
  question_batch_generate_v1.yml
  teaching_strategy_v1.yml
  session_summary_v1.yml
  answer_error_analysis_v1.yml
  targeted_review_v1.yml
  challenge_summary_v1.yml
```

每个 Prompt 必须包含：

- key
- version
- system_prompt
- user_prompt_template
- input_schema
- output_schema
- retry_policy
- validation_policy
- test_cases
- business_scenarios

### 16.4 AI Adapter 接口

```python
class AIProvider(Protocol):
    async def generate(
        self,
        *,
        prompt_name: str,
        prompt_version: int,
        variables: dict,
        output_schema: type[BaseModel],
        request_context: dict | None = None,
    ) -> BaseModel: ...
```

A dapter 责任：

- 加载 Prompt。
- 渲染模板。
- Provider 选择。
- 超时与重试。
- Schema 校验。
- 记录 AI Task。
- 失败降级。
- 不把 SDK 类型泄漏到业务层。

### 16.5 新项目需要的 AI Task 类型

- `TEXTBOOK_OCR`
- `KNOWLEDGE_STRUCTURE_EXTRACT`
- `PATTERN_EXTRACT`
- `TEACHING_CONTENT_GENERATE`
- `COMIC_SCRIPT_GENERATE`
- `QUESTION_BATCH_GENERATE`
- `TEACHING_STRATEGY`
- `ANSWER_ERROR_ANALYSIS`
- `SESSION_SUMMARY`
- `TARGETED_REVIEW`
- `CHALLENGE_SUMMARY`

所有 AI 输出先进入 `waiting_review`，管理员审核后才能发布为正式内容。

---

## 17. 管理端和内容工作流要求

### 17.1 第一阶段必须有

- 管理员登录。
- Knowledge 列表和基础编辑。
- Subtopic 列表和基础编辑。
- Pattern 列表和 TeachingContent 查看。
- 教材图片上传。
- 资源列表和元数据查看。
- Question Pool 查看。
- 导入报告查看。

### 17.2 第二阶段

- 教材 OCR。
- AI 生成课程草稿。
- 漫画脚本草稿。
- AI 练习题草稿。
- 人工审核。
- 发布版本。

### 17.3 内容状态

所有内容实体至少支持：

```text
draft
reviewed
published
archived
```

学生端只能读取 `published` 内容。

### 17.4 审核边界

AI 不能直接发布：

- Knowledge
- Subtopic
- Pattern
- TeachingContent
- Comic
- Question

必须经过：

```text
AI 生成
  ↓
Schema 校验
  ↓
业务校验
  ↓
人工审核
  ↓
published
```

---

## 18. Python 业务实现建议

### 18.1 核心领域服务

建议建立独立领域服务，而不是把逻辑放进 FastAPI route：

- `AnswerEvaluator`
- `CoverageService`
- `BatchAnalysisService`
- `StrategyPolicyService`
- `MasteryService`
- `LessonUnlockService`
- `QuestionPoolService`
- `QuestionValidator`
- `SessionService`
- `ChallengeService`
- `StorageService`
- `AIOrchestrator`

### 18.2 关键伪代码

#### Coverage

```python
def apply_batch_to_pattern_progress(
    patterns, questions, attempts, previous
):
    result = {}
    question_by_id = {q.id: q for q in questions}

    for pattern in patterns:
        prev = previous.get(pattern.id)
        attempted_ids = set()
        correct_ids = set()
        covered = set(prev.covered_items if prev else [])

        for attempt in attempts:
            question = question_by_id.get(attempt.question_id)
            if not question or question.pattern_id != pattern.id:
                continue

            attempted_ids.add(question.id)
            if attempt.correct:
                correct_ids.add(question.id)
            if question.coverage_item_id:
                covered.add(question.coverage_item_id)

        attempted = (prev.attempted_questions if prev else 0) + len(attempted_ids)
        correct = (prev.correct_questions if prev else 0) + len(correct_ids)
        coverage_complete = (
            attempted >= pattern.minimum_questions
            and all(item in covered for item in pattern.coverage_items)
        )

        result[pattern.id] = PatternProgress(
            pattern_id=pattern.id,
            attempted_questions=attempted,
            correct_questions=correct,
            covered_items=sorted(covered),
            coverage_complete=coverage_complete,
        )

    return result
```

#### 弱 Pattern 补题

```python
for pattern in patterns:
    current = progress.get(pattern.id)
    if not current or current.attempted_questions == 0:
        continue

    target_accuracy = subtopic_target_accuracy(pattern.id)
    target_correct = math.ceil(
        current.attempted_questions * target_accuracy / 100
    )
    needed = max(0, target_correct - current.correct_questions)

    if needed > counts.get(pattern.id, 0):
        counts[pattern.id] = needed
```

#### 批次题量限制

```python
if accuracy >= 90 and coverage_complete:
    target_total = 5
elif accuracy >= 80:
    target_total = 8
elif diagnosis in {"persistent_failure", "rule_misunderstanding"}:
    target_total = 5
else:
    target_total = 20
```

#### Subtopic 完成

```python
completed = (
    coverage_complete
    and total_attempted >= subtopic.minimum_questions
    and latest_strategy.action == "finish"
)
```

#### Challenge 解锁

```python
challenge_unlocked = all(
    state.completed
    and all(
        not pattern.required or progress.coverage_complete
        for pattern in subtopic.patterns
    )
    for subtopic in knowledge.subtopics
)
```

### 18.3 异常处理

必须处理：

- 模型超时
- 模型返回非 JSON
- Schema 校验失败
- 题目数量不足
- 题目重复
- 正确答案不在 options
- coverageItemId 缺失
- 题库文件损坏
- Asset 不存在
- Session 已结束
- 重复提交答案
- 用户无权限
- 未解锁练习
- 数据库事务冲突

推荐策略：

- 答案提交：数据库事务 + 幂等键。
- AI Strategy：超时后使用确定性 fallback。
- 题目生成：2 次重试，仍失败则返回可重试错误。
- 课程导入：dry-run + 事务 + 错误报告。
- 文件上传：先写 storage，再提交 DB 元数据；失败时清理孤儿文件。

---

## 19. 新项目测试要求

### 19.1 必测领域测试

- AnswerEvaluator choice 大小写和空格。
- AnswerEvaluator true-false。
- PatternProgress 唯一题去重。
- Coverage Items 全部覆盖才完成。
- irregular 只覆盖 good 时 Coverage 不完整。
- Subtopic minimumQuestions。
- 弱 Pattern 补齐公式。
- accuracy >= 90 + Coverage 完成时题量收缩到 5。
- required Coverage 未完成优先补题。
- perfect batch 强制 finish。
- persistent_failure 校验。
- strategyLevel >= 3 explanation/examples 校验。
- questionDistribution 3-20 校验。
- finish 题量必须 0。
- Question Validator 全部规则。
- 选项位置随机均衡。
- Challenge 解锁。
- Challenge finish。
- Subtopic lesson unlock。
- UnderstandingCheck 持久化且不阻塞解锁。

### 19.2 API 测试

- 注册、登录、退出。
- 未登录访问。
- 学生访问其他用户数据被拒绝。
- 管理员接口权限。
- 未解锁直接访问练习被拒绝。
- 重复答案提交幂等。
- AI 超时返回 502/504。
- SQLite 测试库 Alembic 迁移。
- MySQL 兼容性集成测试。

### 19.3 E2E 测试

- 新学生注册。
- 浏览 Knowledge。
- 进入 Subtopic 讲解页。
- 顺序完成该 Subtopic 的全部 Pattern 漫画和文字讲解。
- 可选完成 UnderstandingCheck。
- 点击“完成解锁”后解锁整个 Subtopic 练习。
- 完成第一批题。
- 错题触发强化。
- Coverage 完成后 finish。
- 完成全部 Subtopic。
- 解锁 Challenge。
- Challenge 通过后获得奖励。
- Challenge 失败后推荐复习。

---

## 20. 分阶段实施计划与验收

### 阶段 1：项目骨架

交付：

- backend/frontend 独立目录。
- FastAPI 健康检查。
- React/Next.js 启动。
- SQLite 默认配置。
- Alembic 初始化。
- pytest 基础测试。
- 统一环境变量。

验收：

- 后端 `pytest` 通过。
- 前端构建通过。
- 空环境无需 MySQL 即可启动。

### 阶段 2：认证和权限

交付：

- 学生注册/登录/退出。
- 管理员角色。
- 密码哈希。
- 权限依赖。
- 禁止访问他人学习记录。

验收：

- 未登录 401。
- 学生访问管理员接口 403。
- 用户间数据隔离测试通过。

### 阶段 3：课程模型和导入

交付：

- Knowledge/Subtopic/Pattern/TeachingContent/Comic/UnderstandingCheck 模型。
- Asset 模型。
- 课程导入 CLI。
- Dry-run 和校验报告。

验收：

- 导入 1 Knowledge、6 Subtopic、28 Pattern。
- 所有 FK、Coverage、资源引用有效。
- 幂等重复导入不产生重复数据。

### 阶段 4：教学内容展示

交付：

- Knowledge 页面。
- Pattern 卡片。
- 漫画/文字切换。
- 图片失败回退。
- Subtopic 级“解锁关口”。
- 阅读完成后整体解锁。
- 可选理解检查。

验收：

- 有漫画默认漫画。
- 无漫画默认文字。
- 图片失败回退。
- 读完该 Subtopic 全部 Pattern 后点击完成即可解锁。
- 理解检查不阻塞解锁。
- 阅读讲解不改变 Mastery。

### 阶段 5：正式练习

交付：

- Session。
- Batch。
- 服务端判题。
- Attempt 记录。
- 正确自动下一题。
- 答错反馈。
- 进度保存。

验收：

- 刷新可恢复 active Session。
- 重复提交幂等。
- 服务端判题不可绕过。

### 阶段 6：Coverage / Mastery / 强化

交付：

- PatternProgress。
- Coverage。
- Observation。
- Strategy。
- 弱项强化。
- Mastery。
- Subtopic 完成判定。

验收：

- 所有领域测试通过。
- 弱 Pattern 补齐正确的题量。
- Coverage 与 Mastery 分离。
- finish 条件有测试。

### 阶段 7：Challenge

交付：

- Challenge 解锁。
- Challenge Session。
- Challenge Summary。
- 推荐复习。
- 奖励。

验收：

- 未完成全部 Subtopic 无法进入。
- 通过后获得头像/外观奖励。
- 失败后能跳转推荐 Subtopic。

### 阶段 8：管理端

交付：

- 课程 CRUD。
- Asset 上传。
- Question 查看。
- 发布状态。

验收：

- 学生看不到 draft。
- 管理员可上传和发布。
- 文件存持久化目录，不存 DB 二进制。

### 阶段 9：AI Adapter 和 Prompt

交付：

- AI Provider。
- Prompt Registry。
- AI Task。
- Schema 校验。
- retry/timeout。
- 模拟 Provider。

验收：

- 不绑定某一家厂商。
- Prompt 版本可查询。
- AI 输出不能直接发布。
- 失败时可降级或明确报错。

### 阶段 10：联调、回归和部署

交付：

- E2E。
- MySQL 兼容性测试。
- 部署文档。
- 数据备份/恢复。
- 日志和监控。

验收：

- 从空环境可完成安装、迁移、导入、启动、测试。
- SQLite 开发环境可独立运行。
- MySQL 部署验证通过。

---

## 21. 旧项目已知问题、缺失和待确认事项

### 21.1 必须在新项目中修复

1. LocalStorage 作为主数据源。
2. 无登录和用户隔离。
3. 服务端信任客户端 LearningState。
4. 服务端信任客户端 correct。
5. 练习解锁只在前端。
6. active Session 刷新后丢失。
7. Questions 只保留最后 500 条。
8. 无题库管理后台。
9. 无 Prompt 版本管理。
10. 无 Asset Adapter。
11. 无 MySQL。
12. 无头像/外观奖励。
13. 无明确 Challenge 失败状态。
14. 无题目快照，题库变动可能影响历史还原。
15. 无 Admin 用户和权限。

### 21.2 需要产品确认

1. UnderstandingCheck 是否需要作为可选反馈、补充强化或后续评分依据。
2. 是否所有 Pattern 都必须配置 UnderstandingCheck。
3. 漫画审核人是谁。
4. Challenge 通过奖励具体是什么。
5. 错题强化是否需要保留原题的同一题目 ID，还是允许同 Pattern 新题。
6. Mastery 是否继续由 LLM 决定，还是混合程序公式。
7. 是否要求多设备同步。
8. 是否允许学生查看答案和解析。
9. 题库是否允许 AI 生成后直接使用，还是一律人工审核。
10. 课程版本更新时，历史 Attempt 是否要绑定旧版本快照。

### 21.3 已发现的实现差异

1. `forceFinishOnPerfectBatch` 的 reason 声称 Coverage 完成，但代码只检查当前 Batch 是否覆盖 all required Pattern。
2. `knowledgeSubtopic` 字段实际保存 Subtopic ID，命名容易误解。
3. `comparative_than` 设计命名与代码 ID `comparative-than` 不一致。
4. `.data/question-pools` 同时存在旧 ID 文件和新 ID 文件。
5. 旧项目的课程内容主要在 TS 源码，而非数据库。
6. `.data` 题库不是 Git 跟踪的正式课程，环境差异会导致题目不同。
7. 当前题库文件存储没有版本迁移机制。
8. 当前组件中漫画首屏是客户端 hydration 后决定，SSR 不包含用户解锁状态。
9. 题目生成依赖模型，质量波动较大。
10. AI 超时降级后，Mock Strategy/Mastery 会直接参与应用行为。

### 21.4 待后续检查

- 核对真实教材图片内容与漫画脚本是否完全一致。
- 核对 28 个 Pattern 的 `PatternExample` 数量和文本。
- 核对所有 Coverage Items 是否与教材覆盖一致。
- 核对 `.data/baselines` 中旧 ID 和当前课程结构的完整映射。
- 核对生产环境 MySQL 连接配置和可用权限。
- 确认腾讯云 COS 或对象存储 Bucket 配置。
- 确认管理员账号创建方式。
- 确认学生注册是否需要手机号/邮箱验证。

---

## 22. 保留行为与允许重新设计

### 22.1 必须保留的业务行为

- Knowledge / Subtopic / Pattern / TeachingContent 层级。
- Coverage 与 Mastery 分离。
- required Pattern 优先。
- Coverage 完成不等于 Mastery。
- 弱 Pattern 增加题量。
- 弱 Pattern 至少补齐达到 targetAccuracy 所需正确数。
- 高正确率 + Coverage 完成后压缩题量。
- perfect batch 可以 finish。
- 正确题和错误题都保存 Attempt。
- choice 和 true-false 本地语义一致。
- 正确答案位置随机分布。
- 每个 Subtopic 使用单个解锁关口，阅读完成后整体解锁。
- Challenge 需全部 Subtopic 完成。
- Challenge 推荐薄弱 Subtopic。

### 22.2 允许重新设计

- 前端框架和 UI 实现。
- LocalStorage 结构。
- API 路径和响应包装。
- 数据表结构。
- 模型 Provider。
- Prompt 文件格式。
- 题库存储。
- 文件存储。
- 身份认证。
- Active Session 恢复。
- 题库审核流程。
- 管理员后台。
- 题目质量评估。
- 课程版本和发布流程。
- 头像/外观奖励的具体表现。

### 22.3 不可以静默删除

- 漫画/文字切换能力。
- 图片失败回退。
- UnderstandingCheck。
- Subtopic 解锁门禁。
- Coverage。
- Mastery。
- 错题强化。
- QuestionPool 共享复用。
- SessionSummary。
- Challenge。
- 结果页。

---

## 23. 最终验收清单

### 空环境启动

- [ ] `python` 后端无需 MySQL 即可启动。
- [ ] SQLite 数据库自动创建。
- [ ] Alembic migration 可运行。
- [ ] 前端可启动并连接后端。
- [ ] `.env.example` 完整。
- [ ] 不在前端暴露服务端密钥。

### 用户与权限

- [ ] 学生可注册。
- [ ] 学生可登录/退出。
- [ ] 管理员角色存在。
- [ ] 学生不能访问他人记录。
- [ ] 管理员接口有权限检查。
- [ ] 密码哈希存储。

### 课程迁移

- [ ] 旧课程导出脚本可重复执行。
- [ ] 导出 JSON 带 manifest。
- [ ] 导入 dry-run 可用。
- [ ] 重复导入幂等。
- [ ] 缺失 Asset 会报错。
- [ ] 导入 1 Knowledge、6 Subtopic、28 Pattern。
- [ ] 所有 TeachingContent 保留。
- [ ] 所有漫画引用有效。
- [ ] 所有 UnderstandingCheck 保留。

### 学生学习

- [ ] 浏览 Knowledge/Subtopic/Pattern。
- [ ] 每个 Subtopic 使用单个解锁关口。
- [ ] 读完全部 Pattern 后点击完成即可解锁。
- [ ] 漫画/文字切换。
- [ ] 无漫画回退文字。
- [ ] 图片失败回退文字。
- [ ] 理解检查可保存、恢复和重试，但不阻塞解锁。
- [ ] Subtopic 解锁后才能练习。
- [ ] 未解锁直接调用 API 会 403。

### 正式练习

- [ ] 服务端判题。
- [ ] choice 正确。
- [ ] true-false 正确。
- [ ] Attempt 正确和错误都记录。
- [ ] 重复提交幂等。
- [ ] 题正确自动下一题。
- [ ] 错题显示解析。
- [ ] 刷新可恢复 active Session。

### 教学策略

- [ ] required Coverage 优先。
- [ ] 弱 Pattern 增加题量。
- [ ] 弱 Pattern 按 targetAccuracy 补齐。
- [ ] 连续错误分类。
- [ ] 连续弱 Batch 分类。
- [ ] improving 分类。
- [ ] mastered 分类。
- [ ] persistent_failure 强制 level >= 4。
- [ ] strategyLevel >= 3 有 explanation/examples。
- [ ] 3-20 题限制。
- [ ] finish 题量 0。

### Coverage / Mastery

- [ ] Coverage 使用覆盖项判定。
- [ ] Coverage 不要求答对。
- [ ] Mastery 不写成 Coverage。
- [ ] Mastery 0-100。
- [ ] 最新 Strategy 更新 difficulty。
- [ ] coverageComplete + minQuestions + finish 才算 Subtopic 完成。

### QuestionPool

- [ ] 公共题库共享。
- [ ] 个性化题不污染公共题库。
- [ ] 题量不足时补题。
- [ ] 空响应重试。
- [ ] 题库失效检测。
- [ ] 题目绑定 knowledge/subtopic/pattern。

### Challenge

- [ ] 所有 Subtopic 完成后解锁。
- [ ] Challenge 混合多个 Subtopic。
- [ ] Challenge 通过后奖励。
- [ ] Challenge 失败后推荐复习 Subtopic。
- [ ] 奖励和结果持久化。

### 管理和审核

- [ ] 管理员可创建/编辑课程。
- [ ] 管理员可上传教材图片。
- [ ] 资源存储元数据在 DB。
- [ ] AI 输出进入待审核。
- [ ] 未审核内容学生不可见。
- [ ] Prompt 可版本化。

### 测试

- [ ] pytest 全部通过。
- [ ] 前端测试通过。
- [ ] E2E 通过。
- [ ] MySQL 兼容性验证。
- [ ] 题库校验测试。
- [ ] Coverage/Mastery 回归测试。
- [ ] 课程导入/导出测试。
- [ ] 权限测试。
- [ ] 失败重试测试。

---

## 24. 给新项目 Codex 的最终指令

1. 不要在当前旧仓库中直接开始新项目开发。
2. 先创建独立新仓库。
3. 先完成 SQLite 开发环境和 Alembic。
4. 不要依赖旧项目运行。
5. 先实现课程数据导入，再实现学习闭环。
6. 不要把课程内容重新让 AI 生成。
7. 不要把 LocalStorage 作为主存储。
8. 不要让前端负责最终判题。
9. 不要在未解锁时允许练习。
10. 不要把 Coverage 完成等同于 Mastery。
11. 不要以固定 15 题替代动态题量。
12. 不要静默跳过旧项目已有能力。
13. 每个阶段必须可启动、可测试、可验收。
14. 未实现内容必须写入 README 或 STATUS。
15. 最终提供从空环境启动、迁移、导入、测试和部署的完整步骤。

---

## 25. 旧项目源文件索引

| 主题 | 文件 |
|---|---|
| 数据契约 | `types/agent.ts` |
| 课程数据 | `data/knowledge/comparative.ts` |
| 漫画课程数据 | `data/lessons/comparative-basic.ts` |
| Agent 图 | `lib/agent/graph.ts` |
| Coverage | `lib/agent/coverage.ts` |
| Batch 分析 | `lib/agent/analysis.ts` |
| 题库 | `lib/agent/question-pool.ts` |
| 题库存储 | `lib/agent/question-pool-store.ts` |
| Prompt | `lib/agent/prompts.ts` |
| 模型适配 | `lib/agent/provider.ts` |
| Mock 降级 | `lib/agent/providers/mock.ts` |
| OpenAI/DeepSeek | `lib/agent/providers/openai.ts` |
| 校验 | `lib/agent/validation.ts` |
| 判题 | `lib/game.ts` |
| Mastery | `lib/mastery.ts` |
| LocalStorage | `lib/storage.ts` |
| API 请求 Schema | `lib/agent/api.ts` |
| 客户端请求 | `lib/agent/client.ts` |
| 答题 UI | `components/game/GameView.tsx` |
| 漫画讲解 | `components/pattern-lesson/*` |
| 课程页 | `components/knowledge/KnowledgeView.tsx` |
| 结果页 | `components/result/ResultView.tsx` |
| 开始接口 | `app/api/agent/session/start/route.ts` |
| 完成批次接口 | `app/api/agent/session/complete-batch/route.ts` |
| Agent 设计 | `docs/AGENT.md` |
| 数据设计 | `docs/DATA.md` |
| 当前状态 | `docs/STATUS.md` |

---

## 26. 结论

旧项目已经形成一套完整的“教学内容 → Pattern 解锁 → 动态练习 → Attempt → Coverage → Agent 诊断 → Mastery → Subtopic 完成 → Challenge”业务闭环，但实现依赖 Next.js、LocalStorage、文件题库和前端判题，不适合作为新项目的长期架构。

新项目必须：

- 保持业务规则；
- 重做持久化、认证、权限、题库、资源管理和 AI Adapter；
- 使用 SQLite 开发、MySQL 生产；
- 从旧项目导出课程结构和资源；
- 按阶段交付，不允许一次性生成不可验证的大规模代码。

本文是实施基线。任何新规则都应先补充到本文或新的设计文档，再实施和测试。对于标记为“待确认”的行为，新项目 Codex 应先查旧源码或请求产品确认，不能自行假设。
