# 英语森林 English Forest

## 内容模型与首批学习内容 CONTENT V0.1

本文件负责定义"学习内容是什么、如何组织、如何从真实资料中录入"。

## 1. 内容层级

``` text
SourceDocument
  ↓
ContentSection
  ↓
KnowledgePoint
  ↓
LearningItem / Example
  ↓
Question
```

用户学习行为独立保存：

``` text
Question
  ↓
Attempt
  ↓
KnowledgeMastery
```

不要把"题目"直接当成"知识点"。

同一个知识点可以拥有多种题型；同一道题也可以明确关联一个或多个知识点。

## 2. 首批资料识别结果

### 主题

比较级和最高级。

### 知识规则

#### Rule 1：普通变化

一般情况下在词尾加 `-er`、`-est`。

示例：

-   long → longer → longest

#### Rule 2：以 e 结尾

只加 `-r`、`-st`。

示例：

-   large → larger → largest

#### Rule 3：以 y 结尾

把 y 改成 i，再加 `-er`、`-est`。

资料中给出的示例：

-   busy → busier → busiest
-   easy → easier → easiest
-   early → earlier → earliest
-   happy → happier → happiest

#### Rule 4：双写最后一个字母

双写最后一个字母，再加 `-er`、`-est`。

资料中给出的示例：

-   big → bigger → biggest
-   hot → hotter → hottest

#### Rule 5：不规则变化

资料中给出的示例：

-   good → better → best
-   well → better → best
-   many → more → most
-   much → more → most

## 3. 练习资料识别结果

练习页明确包含以下比较级/最高级练习：

1.  hot → hotter → hottest
2.  easy → easier → easiest
3.  large → larger → largest
4.  good → better → best
5.  many → more → most

以及句子翻译：

6.  我的狗比你的狗大。
    -   My dog is bigger than yours.
7.  杰克是我最好的朋友。
    -   Jack is my best friend.
8.  林老师是我们学校里最忙的老师。
    -   Ms. Lin is the busiest teacher in our school.
9.  中国和加拿大，哪个比较辽阔？
    -   Which is larger, China or Canada?
10. 今天是我的人生中最快乐的一天。

-   Today is the happiest day of my life.

## 4. 内容数据模型

### SourceDocument

``` ts
export interface SourceDocument {
  id: string;
  title: string;
  sourceType: "book" | "worksheet" | "photo" | "custom";
  subject: "english";
  grade?: string;
  version?: string;
  pages?: number[];
  sections: ContentSection[];
}
```

### ContentSection

``` ts
export interface ContentSection {
  id: string;
  sourceDocumentId: string;
  title: string;
  order: number;
  knowledgePointIds: string[];
  questionIds: string[];
}
```

### KnowledgePoint

``` ts
export interface KnowledgePoint {
  id: string;
  sectionId: string;
  title: string;
  category: "grammar" | "vocabulary" | "sentence-pattern" | "reading";
  summary: string;
  rules?: Rule[];
  examples?: Example[];
  relatedKnowledgePointIds?: string[];
}
```

### Rule

``` ts
export interface Rule {
  id: string;
  knowledgePointId: string;
  title: string;
  explanation: string;
  examples: Example[];
}
```

### Example

``` ts
export interface Example {
  id: string;
  base?: string;
  comparative?: string;
  superlative?: string;
  english?: string;
  chinese?: string;
  audioUrl?: string;
}
```

### Question

``` ts
export type QuestionType =
  | "choice"
  | "fill-blank"
  | "sentence-translation"
  | "ordering"
  | "listening";

export interface Question {
  id: string;
  knowledgePointIds: string[];
  type: QuestionType;
  prompt: string;
  options?: string[];
  answer: string | string[];
  explanation?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  sourceQuestionId?: string;
  tags?: string[];
}
```

### Attempt

``` ts
export interface Attempt {
  id: string;
  questionId: string;
  knowledgePointIds: string[];
  answer: string | string[];
  isCorrect: boolean;
  responseTimeMs?: number;
  createdAt: string;
}
```

### KnowledgeMastery

``` ts
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

## 5. 首批知识点建议 ID

``` text
comparative-basic
comparative-e-ending
comparative-y-ending
comparative-double-consonant
comparative-irregular
```

## 6. 首批题目建议

题目不要直接写死在页面组件里。

应该进入独立内容数据文件，例如：

``` text
data/content/comparatives.ts
```

页面只读取数据并负责展示。

## 7. 内容录入原则

### 原则一：资料事实优先

从用户提供的真实资料中提取内容时，不自行增加教材没有出现的规则或例句。

### 原则二：知识点与题目分离

知识点负责"教什么"。

题目负责"怎么检测"。

### 原则三：来源可追溯

从资料生成的内容尽量保存：

-   sourceDocumentId
-   page
-   sourceQuestionId

方便以后校对。

### 原则四：AI 未来只负责辅助

未来 AI
可以帮助识别、整理和生成题目，但最终进入正式学习内容的数据需要经过校验。
