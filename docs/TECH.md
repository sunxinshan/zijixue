# 英语森林 English Forest

## 技术设计文档 TECH V0.1

## 1. 技术目标

第一版目标是以最低复杂度完成：

``` text
真实学习内容
  ↓
React UI
  ↓
答题交互
  ↓
学习记录
  ↓
掌握度
  ↓
本地保存
```

不引入后端和数据库。

## 2. 技术栈

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   Browser LocalStorage

后续如果动画需求明显增加，可以加入 Framer Motion。

第一版不引入 Phaser。

## 3. 数据模型原则

数据分成三类：

### A. 静态内容数据

不会因为用户答题而改变：

-   SourceDocument
-   ContentSection
-   KnowledgePoint
-   Rule
-   Example
-   Question

存放于代码仓库的数据文件。

### B. 用户学习数据

会随着学习行为变化：

-   Attempt
-   KnowledgeMastery
-   PlayerProfile
-   ChallengeRecord

第一版保存在 LocalStorage。

### C. 页面临时状态

只在当前交互过程中存在：

-   当前题目索引
-   当前答案
-   当前题目是否已经提交
-   当前反馈状态
-   当前挑战分数

这些属于 UI state，不需要持久化。

React 官方建议把 state
保持为最小、完整且不重复的表示，能够从现有数据计算出的值不要重复保存为
state；本项目的数据模型也遵循这一原则。citeturn0search0turn0search5

## 4. 核心 TypeScript 模型

``` ts
export interface PlayerProfile {
  id: string;
  nickname?: string;
  level: number;
  xp: number;
  totalStars: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeRecord {
  id: string;
  knowledgePointIds: string[];
  questionIds: string[];
  totalQuestions: number;
  correctAnswers: number;
  earnedXp: number;
  stars: 1 | 2 | 3;
  startedAt: string;
  completedAt?: string;
}

export interface KnowledgeMastery {
  knowledgePointId: string;
  mastery: number;
  correctCount: number;
  wrongCount: number;
  streak: number;
  lastPracticedAt?: string;
  lastCorrectAt?: string;
}
```

完整内容模型见 `CONTENT.md`。

## 5. LocalStorage

建议统一使用一个命名空间：

``` text
english-forest:v1
```

内部结构：

``` ts
export interface AppStorage {
  player: PlayerProfile;
  mastery: Record<string, KnowledgeMastery>;
  attempts: Attempt[];
  challenges: ChallengeRecord[];
}
```

不要把每个 React 组件直接写 LocalStorage。

统一通过：

``` text
lib/storage.ts
```

访问。

## 6. 游戏状态

一轮挑战的状态建议：

``` ts
export interface GameSession {
  challengeId: string;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, string | string[]>;
  results: Record<string, boolean>;
  isSubmitted: boolean;
  isFinished: boolean;
  correctCount: number;
  earnedXp: number;
}
```

页面只保存当前挑战需要的临时状态。

完成挑战后再写入持久化数据。

## 7. 掌握度

第一版使用简单、可解释的算法。

建议初始：

``` text
mastery = 0
```

答对：

``` text
+10
```

答错：

``` text
-5
```

限制：

``` text
0 <= mastery <= 100
```

连续答对可以增加少量 bonus，但第一版不要让算法过于复杂。

后续再根据真实使用数据升级。

## 8. 题目抽取

一轮题量由 Pattern Coverage、LearningState 和 TeachingStrategy 动态决定。

第一版先采用：

``` text
从指定知识点题池随机抽取
```

如果该知识点存在 mastery 数据，则提高低掌握度知识点的抽题概率。

概念算法：

``` text
weight = 100 - mastery
```

例如：

``` text
mastery 90 → weight 10
mastery 50 → weight 50
mastery 20 → weight 80
```

但同一道题不能在同一轮重复出现。

## 9. UI 与数据流

建议遵循：

``` text
Page
 ↓
Container / Feature
 ↓
Reusable Components
 ↓
Content Data + User State
```

例如：

``` text
GamePage
 ├── GameHeader
 ├── QuestionCard
 ├── AnswerOptions
 ├── FeedbackPanel
 └── GameProgress
```

React 官方的组件设计建议也是先从 UI 原型拆分组件，再明确数据模型和
state，并保持单向数据流。citeturn0search0

## 10. 推荐目录

``` text
app/
├── page.tsx
├── knowledge/
│   └── [id]/
│       └── page.tsx
├── learn/
│   └── [id]/
│       └── page.tsx
├── game/
│   └── [id]/
│       └── page.tsx
└── result/
    └── [id]/
        └── page.tsx

components/
├── home/
├── knowledge/
├── game/
└── result/

data/
└── content/
    └── comparatives.ts

lib/
├── storage.ts
├── mastery.ts
├── game.ts
└── question-selector.ts

types/
└── content.ts

docs/
├── PRD.md
├── DESIGN.md
├── TECH.md
└── CONTENT.md
```

## 11. 状态边界

必须区分：

### 静态内容

例如：

``` text
busy → busier → busiest
```

不应该放进 React state。

### 用户状态

例如：

``` text
mastery = 70
```

需要持久化。

### UI 状态

例如：

``` text
当前第 3 题
```

只属于当前页面/挑战。

避免重复保存可以从已有数据计算出来的状态，以降低状态不同步和维护成本。citeturn0search5

## 12. 第一版数据流

``` text
data/content/comparatives.ts
        ↓
KnowledgePage
        ↓
GamePage
        ↓
question-selector
        ↓
用户回答
        ↓
game.ts
        ↓
mastery.ts
        ↓
storage.ts
        ↓
LocalStorage
        ↓
ResultPage
```

## 13. 后续 AI / OCR 接入预留

未来增加：

``` text
Image
 ↓
OCR
 ↓
AI Content Parser
 ↓
SourceDocument
 ↓
KnowledgePoint
 ↓
Question
```

因此现在的数据模型不能只服务"比较级"。

必须能支持：

-   单词
-   语法
-   句型
-   阅读
-   听力

这也是 `KnowledgePoint.category` 设计为可扩展枚举的原因。

## 14. 技术约束

第一版禁止：

-   直接在页面组件里写大量题目数据
-   每个组件独立操作 LocalStorage
-   将 mastery、correctCount 等重复数据散落在多个 state 中
-   为了一个小游戏引入数据库
-   为了动画过早引入复杂游戏引擎
-   将 AI API 直接写进前端

## 15. MVP 完成定义

满足以下条件才算完成：

1.  能打开首页。
2.  能进入比较级知识点。
3.  能查看知识规则和例词。
4.  能开始一轮 10 题挑战。
5.  能完成选择、填空、句子题。
6.  每道题有即时反馈。
7.  完成后生成星级和 XP。
8.  知识点 mastery 能更新。
9.  错题/作答记录能够保存。
10. 刷新页面后学习进度仍然存在。
