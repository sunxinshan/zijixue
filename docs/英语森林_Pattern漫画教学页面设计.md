# 英语森林：Pattern 漫画教学页面设计

> 版本：v1  
> 范围：Pattern 教学内容的展示方式、漫画分镜规范、教学流程、数据结构与前端组件设计  
> 设计原则：程序负责边界，Agent 负责教学；Pattern 定义知识点，TeachingContent 承载具体教学内容。

## 1. 设计目标

当前 Subtopic 页面会列出多个 Pattern，并展示简短说明、例句和练习情况。它适合查看学习进度，但对第一次学习的孩子来说，单靠一句规则和几个例句，通常不足以帮助他们理解知识点。

本次改造的目标：

1. 每个 Pattern 都有一份足够完整的教学内容。
2. 默认展示漫画讲解；如果该 Pattern 没有漫画素材，自动展示文字讲解。
3. 孩子可以主动切换「漫画讲解 / 文字讲解」。
4. 漫画不是装饰图，而是有明确教学目的的情境讲解。
5. 教学结束后衔接理解检查与原有练习，不改变现有 Pattern 的覆盖度、掌握度和完成规则。
6. 漫画素材在课程内容准备阶段生成、审核并保存，学生学习时直接加载，避免每次进入页面都调用图像生成模型。

## 2. 核心设计决定

### 2.1 Pattern 和 TeachingContent 的职责不变

```text
Knowledge（Scene）
└── Subtopic（Level）
    └── Pattern（知识点定义、学习目标、覆盖要求）
        └── TeachingContent（具体教学内容）
            ├── Comic（漫画分镜）
            ├── TextLesson（文字讲解）
            ├── Examples（例句）
            ├── CommonMistakes（常见错误）
            └── CheckQuestions（教学后的理解检查）
```

Pattern 不直接存放图片地址或大段讲解文本。它通过 `teachingContentId` 关联教学内容。以后增加语音、动画或其他讲解形式时，不需要改变 Pattern 的基本定义。

### 2.2 展示模式的选择规则

优先级：

1. 如果 TeachingContent 有可用且审核通过的漫画，默认打开漫画模式。
2. 如果没有可用漫画，自动打开文字模式，不显示空漫画占位。
3. 如果孩子主动切换模式，当前页面保持该选择，不因为翻页或答题而突然切换。
4. 当前版本不要求把模式选择保存到账号；可以只保存在当前页面状态。后续有登录与学习偏好时再决定是否持久化。

### 2.3 漫画数量

- 默认 1–2 个分镜画面。
- 一个画面能讲清楚时，只用一张。
- 需要呈现“情境 → 表达”或“错误 → 修正”时，用两张。
- 复杂规则可以拆成多个教学步骤，但不要把一张漫画塞入过多规则。
- 漫画画面与英文文本分开存储；英文由前端排版，避免图片模型生成错误拼写。

## 3. 页面结构

建议复用现有 Subtopic 页面。点击某个 Pattern 卡片的「学习」或卡片本身，展开一个教学区域或进入 Pattern 教学页。MVP 优先采用独立教学页，便于后续增加语音、互动和学习状态。

```text
PatternLessonPage
├── Header
│   ├── 返回 Subtopic
│   ├── Pattern 标题
│   └── 当前步骤 / 总步骤
├── ModeSwitcher
│   ├── 漫画讲解（默认）
│   └── 文字讲解
├── LessonContent
│   ├── ComicLesson
│   │   ├── ComicPanel（1–2 格）
│   │   ├── 对话气泡 / 旁白
│   │   └── 本格重点
│   └── TextLesson
│       ├── 核心规则
│       ├── 例句
│       └── 常见错误
├── KeyTakeaway
├── UnderstandingCheck（1–2 道）
└── ContinuePracticeButton
```

### 页面交互原则

- 不要在一屏同时堆满漫画、长篇文字和所有题目。
- 漫画模式下，先看情境和对话，再展示一句简短的规则总结。
- 文字模式提供与漫画相同的核心知识，不应只是漫画的简略摘要。
- 理解检查只负责检查孩子是否看懂本次讲解；正式题目仍由现有 Question / Attempt 流程管理。
- 若孩子答错理解检查，显示简短解释并允许重试；不要仅凭一次检查就认定 Pattern 未掌握。
- 保留现有掌握度与覆盖度显示，但不要把“看完漫画”直接算作掌握。

## 4. 漫画分镜规范

每个分镜必须有一个清晰的教学目的。建议脚本字段：

- `purpose`：本格想让孩子理解什么。
- `sceneDescription`：画面描述。
- `narration`：旁白，可选。
- `dialogue`：角色和台词。
- `focusText`：需要突出显示的英文词组。
- `teacherNote`：给教学逻辑使用的说明，不一定直接展示给孩子。

### 示例：Pattern `comparative_than`

目标：理解 `than` 用于引出比较对象，并能理解 `A + be + comparative + than + B`。

**第 1 格：看见差异**

- 画面：Tom 和 Ken 站在学校操场的身高墙前，Tom 明显更高。
- 旁白：Tom and Ken are comparing their heights.
- 角色台词：Tom: “I am taller!”
- 教学目的：先通过视觉建立“更高”的含义。
- 重点：`taller`

**第 2 格：说清比较对象**

- 画面：Tom 指向自己，再指向 Ken。
- 角色台词：Tom: “I am taller than Ken.”
- 旁白：`than Ken` tells us who Tom is compared with.
- 教学目的：理解整句含义，注意比较对象由 `than` 引出。
- 重点：`taller than Ken`

随后展示简短总结：

> **A + be + 比较级 + than + B**  
> Tom is taller than Ken.  
> `than Ken` 表示拿 Ken 来比较。

理解检查示例：
1. “Amy is older than Lucy.” 谁年龄更大？
2. 补全句子：Tom is taller ___ Ken.

注意：这只是教学内容示例。实际题目应由内容制作流程校验语法、年级适配性和答案。

## 5. 漫画素材制作流程

不要让学生每次打开 Pattern 时临时生成漫画。建议采用离线内容制作流程：

1. 读取 Pattern 定义和完整教学内容。
2. 生成教学脚本，明确目标、分镜、台词、重点词组和常见误区。
3. 检查脚本：教学目标是否覆盖、语法是否正确、是否符合四年级学生理解水平。
4. 根据画面描述生成无文字或少文字的插图。
5. 将经过校验的英文台词和旁白由前端叠加到画面上。
6. 人工检查人物一致性、画面是否表达正确、文字是否遮挡。
7. 保存素材和内容版本，关联到 TeachingContent。
8. 页面运行时只加载已发布的素材。

### 图片生成注意事项

- 固定主要角色设定与画风，减少跨 Pattern 的视觉跳变。
- 图片中尽量不生成英文文字，所有关键英文由前端文本层呈现。
- 如果一课有两格，优先分别生成两张画面，方便响应式布局和逐格教学。
- 图片生成失败或素材缺失时，必须自动回退到文字讲解。
- 素材需要有 `status` 或发布状态，只有审核通过的版本才能作为默认漫画。

## 6. 数据结构建议（TypeScript）

下面是建议的数据契约，可按现有项目的数据结构调整。字段名为示例，不要求一次性引入所有可选字段。

```ts
export type TeachingMode = "comic" | "text";

export interface Pattern {
  id: string;
  subtopicId: string;
  title: string;
  learningObjectives: string[];
  requiredCoverage: {
    minQuestions: number;
  };
  teachingContentId: string;
}

export interface TeachingContent {
  id: string;
  patternId: string;
  version: number;
  status: "draft" | "reviewed" | "published";
  defaultMode: TeachingMode;
  comic?: ComicLesson;
  textLesson: TextLesson;
  examples: Example[];
  commonMistakes: CommonMistake[];
  understandingCheck?: UnderstandingCheckQuestion[];
}

export interface ComicLesson {
  panels: ComicPanel[];
  styleId?: string;
  altText: string;
}

export interface ComicPanel {
  id: string;
  order: number;
  imageUrl: string;
  purpose: string;
  sceneDescription: string;
  narration?: string;
  dialogue: ComicDialogue[];
  focusText?: string[];
  teacherNote?: string;
  altText: string;
}

export interface ComicDialogue {
  characterId: string;
  characterName: string;
  text: string;
  translation?: string;
  emotion?: string;
}

export interface TextLesson {
  introduction?: string;
  explanation: string[];
  ruleSummary: string;
  examples: Example[];
}

export interface Example {
  english: string;
  chineseMeaning: string;
  highlight?: string[];
  note?: string;
}

export interface CommonMistake {
  incorrect: string;
  correct: string;
  explanation: string;
}

export interface UnderstandingCheckQuestion {
  id: string;
  type: "choice" | "true_false" | "fill_blank";
  prompt: string;
  options?: string[];
  answer: string | boolean;
  explanation: string;
}
```

### 数据建模说明

1. `Pattern` 保存学习目标与覆盖规则，不直接保存漫画内容。
2. `TeachingContent` 保存完整教学材料，且应有版本号和发布状态。
3. `comic` 是可选项；没有漫画就用 `textLesson`。
4. `defaultMode` 可以保存内容作者推荐的模式，但前端仍需校验漫画是否存在且已发布。
5. `imageUrl` 应指向项目可访问的静态资源或对象存储地址，不要把图片 Base64 塞进课程 JSON。
6. 正式练习题仍使用项目原有的 Question 模型；`understandingCheck` 只用于讲解后的即时检查，避免把两类题混在一起。
7. `teacherNote` 是教学元数据，不应默认直接展示给学生。
8. 当前 MVP 可以先不实现 `styleId`、`emotion` 等非必要字段，但保留清晰的扩展边界。

## 7. 前端组件设计

建议组件拆分：

```text
components/pattern-lesson/
├── PatternLessonPage.tsx
├── LessonModeSwitcher.tsx
├── ComicLesson.tsx
├── ComicPanel.tsx
├── TextLesson.tsx
├── KeyTakeaway.tsx
└── UnderstandingCheck.tsx
```

### 组件职责

- `PatternLessonPage`
  - 加载当前 Pattern 和 TeachingContent。
  - 决定初始展示模式。
  - 管理漫画 / 文字切换与教学步骤。
  - 连接当前 Subtopic 的学习状态。

- `LessonModeSwitcher`
  - 只负责切换 `comic` 和 `text`。
  - 当没有可用漫画时隐藏漫画选项，或只展示文字模式。

- `ComicLesson`
  - 按顺序展示分镜。
  - 处理一格 / 两格布局和逐格阅读。
  - 为图片提供加载失败回退。

- `ComicPanel`
  - 展示单格插图、旁白、角色对话和重点标注。
  - 对图片使用 `altText`。
  - 不把关键英文内容仅放在图片里。

- `TextLesson`
  - 展示完整文字讲解、规则总结、例句和常见错误。

- `KeyTakeaway`
  - 用简短内容总结本 Pattern 的核心规则。

- `UnderstandingCheck`
  - 展示 1–2 道即时理解题。
  - 答错时给解释与重试。
  - 完成状态只表示完成讲解检查，不直接改变 Pattern mastery。

### 推荐的模式选择逻辑

```ts
function getInitialTeachingMode(
  content: TeachingContent
): TeachingMode {
  const hasPublishedComic =
    content.status === "published" &&
    content.comic !== undefined &&
    content.comic.panels.length > 0 &&
    content.comic.panels.every((panel) => Boolean(panel.imageUrl));

  return hasPublishedComic ? "comic" : "text";
}
```

实际项目中，`status` 属于整个 TeachingContent 的发布状态。若漫画有独立审核状态，应增加 `comic.status`，并以漫画自身发布状态为准。

## 8. 教学流程与状态边界

推荐流程：

```text
进入 Pattern
  ↓
加载 TeachingContent
  ↓
有已发布漫画？
  ├── 是：默认漫画模式
  └── 否：默认文字模式
  ↓
学生阅读讲解（可切换模式）
  ↓
查看核心规则与例句
  ↓
完成 1–2 道理解检查
  ├── 未理解：显示解释，可重试
  └── 已理解：进入正式练习
  ↓
现有 Agent + Question 流程
  ↓
更新 Pattern Coverage / Mastery
```

需要明确以下边界：

- 看完漫画 ≠ 掌握 Pattern。
- 通过理解检查 ≠ Pattern 已完成。
- 正式练习的 Attempt 记录、覆盖统计和掌握度计算继续使用原有逻辑。
- Agent 可以根据学习记录决定补充解释、调整难度或增加针对性练习。
- 程序继续验证题目是否属于当前 Subtopic、是否覆盖必需 Pattern，以及是否满足完成条件。

## 9. MVP 实施范围

第一版只做以下内容：

1. `TeachingContent` 支持 `comic` 和 `textLesson`。
2. 默认漫画，有漫画则显示；无漫画自动回退文字。
3. 提供漫画 / 文字切换。
4. 支持一张或两张漫画图片。
5. 漫画图片与英文对话分层展示。
6. 漫画结束后展示核心规则和 1–2 道理解检查。
7. 继续沿用现有正式练习、Attempt、Coverage 和 Mastery 逻辑。
8. 图片加载失败时回退文字。
9. 课程素材通过静态 JSON + 本地静态资源管理，暂不增加数据库。

第一版暂不做：

- 学生端实时生成漫画。
- 复杂的漫画编辑器。
- 动画、配音、口型同步。
- 学生自由输入英文的开放式评分。
- 根据孩子偏好长期记忆漫画 / 文字模式。
- 自动发布未经审核的模型生成内容。

## 10. 推荐实施顺序

### 第一步：确定一个完整样例

先用 `comparative_than` 做样例，完成：
- Pattern 定义；
- 两格漫画脚本；
- 两张插图；
- 完整文字讲解；
- 核心规则；
- 1–2 道理解检查。

### 第二步：打通页面组件

先用本地静态 JSON 读取样例，完成模式切换、漫画显示、文字回退和理解检查。暂时不改 Agent 的掌握度算法。

### 第三步：确认内容规范

拿一个 Pattern 试学后，检查：
- 孩子能否从情境理解知识点；
- 漫画是否真的比纯文字更容易理解；
- 一格还是两格更合适；
- 文字讲解是否完整；
- 理解检查是否能发现误解。

### 第四步：扩展到其他 Pattern

样例稳定后，再按统一脚本模板批量制作其他 Pattern 的教学内容和漫画素材。

## 11. 验收标准

- 有已发布漫画的 Pattern 默认打开漫画模式。
- 无漫画的 Pattern 默认打开文字模式，不出现空白区域。
- 学生可以随时切换漫画与文字。
- 图片加载失败时仍能完成学习。
- 所有关键英文台词均可作为真实文本阅读，不依赖图片识字。
- 漫画表达与 TeachingContent 的规则一致，不出现错误语法或误导画面。
- 理解检查答错会提供解释与重试。
- 看完漫画或通过理解检查不会直接将 Pattern 标记为已掌握。
- 原有 Question、Attempt、Coverage、Mastery 与 Subtopic 完成逻辑不被破坏。
- 课程素材可版本化、审核并替换，不需要改动页面业务逻辑。

## 12. 最终建议

将漫画视为 TeachingContent 的一种呈现方式，而不是 Pattern 的新层级，也不是 Agent 每次教学时临时生成的图片。

最稳妥的实现路径是：**先把一个 Pattern 的完整教学内容设计好，再用漫画呈现它；先用静态素材跑通页面，再考虑自动化内容生产。** 这样既能提升孩子的学习体验，也不会让项目在第一版就陷入复杂的图片生成、存储和审核系统。
