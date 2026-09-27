# English Forest Content Model v2

## 1. 目标

本文件定义英语森林（English Forest）当前采用的课程内容结构。

核心层级：

```text
Knowledge
  ↓
Subtopic
  ↓
Pattern
  ↓
Question
```

定义：

- **Knowledge**：一个完整的场景/知识主题，例如“比较级”。
- **Subtopic**：场景中的一个关卡，例如“普通比较级”“最高级”“比较级/最高级词形变化”“同级比较”。
- **Pattern**：Subtopic 内部更细粒度的教学模式/规则。
- **Question**：针对 Pattern 生成的具体练习题。

核心原则：

> Subtopic 是用户看到的学习关卡，Pattern 是 Agent 内部进行教学和练习调度的最小教学单元。

---

## 2. Knowledge：比较级

当前第一个完整 Knowledge：

```text
Knowledge: comparative
名称：比较级与比较表达
```

教材范围来自比较级相关内容：

- 比较级句型
- 最高级句型
- 比较级/最高级词形变化
- more / most
- as...as / not as...as
- 比较级与最高级句型总结

---

# 3. Subtopic 划分

## Subtopic 1：普通比较级

### 学习目标

学生能够理解“两者比较”的基本含义，并正确使用比较级表达：

> A 比 B 更……

### Patterns

#### Pattern 1.1：比较级基本形式

例如：

```text
tall → taller
fast → faster
```

目标：

- 理解比较级表示“两者中更……”
- 能识别比较级形式。

#### Pattern 1.2：比较级 + than

例如：

```text
Tom is taller than Ken.
I run faster than Misa.
```

目标：

- 理解 than 后面表示比较对象。
- 能正确识别比较对象。

#### Pattern 1.3：Which A or B

例如：

```text
Which is longer, April or May?
```

目标：

- 理解 Which ... A or B? 的比较含义。
- 能识别句子是在比较两个对象。

### 建议最低练习量

10 题左右。

不要求每个 Pattern 固定题量，Agent 根据 Coverage 和表现动态调整。

### 完成条件

- 必须覆盖 1.1、1.2、1.3。
- 最低练习量达到要求。
- 整体表现达到 90% 左右。
- Agent 判断没有明显未掌握 Pattern。

---

# 4. Subtopic 2：最高级

### 学习目标

学生能够理解“三者或更多对象中最……”的含义，并正确使用最高级。

### Patterns

#### Pattern 2.1：最高级基本形式

例如：

```text
tall → tallest
fast → fastest
```

#### Pattern 2.2：the + 最高级

例如：

```text
Tom is the tallest.
```

目标：

- 理解最高级前通常使用 the。

#### Pattern 2.3：of + 人/物

例如：

```text
Tom is the tallest of the three.
Tom is the most interesting of all.
```

目标：

- 理解 of 用于表示比较范围中的人/物数量或集合。

#### Pattern 2.4：in + 地点/范围

例如：

```text
I run the fastest in my class.
Tom is the tallest in the class.
```

目标：

- 理解 in 用于表示地点、班级、家庭等范围。

#### Pattern 2.5：Which + 最高级

例如：

```text
Which animal is the strongest?
```

目标：

- 理解 Which ... is the + 最高级? 的结构。

### 建议最低练习量

10～15 题。

### 完成条件

- 必须覆盖所有必需 Pattern。
- 最低练习量达到要求。
- 整体表现达到 90% 左右。
- Agent 判断没有明显未掌握 Pattern。

---

# 5. Subtopic 3：比较级 / 最高级词形变化

这是比较级 Knowledge 中最复杂的 Subtopic。

因此不应该和其他 Subtopic 使用相同的固定题量。

建议最低练习量：

> 20～30 题起步，根据 Agent 判断动态增加。

## Pattern 3.1：普通变化

例如：

```text
long → longer → longest
tall → taller → tallest
fast → faster → fastest
```

规则：

```text
一般情况下：
+ er
+ est
```

最低覆盖：

至少 3 题。

---

## Pattern 3.2：e 结尾

例如：

```text
large → larger → largest
```

规则：

```text
只加 r / st
```

最低覆盖：

至少 3 题。

---

## Pattern 3.3：y 结尾

例如：

```text
busy → busier → busiest
easy → easier → easiest
happy → happier → happiest
```

规则：

```text
辅音字母 + y
→ y 改 i
→ 加 er / est
```

这是需要重点训练的 Pattern。

最低覆盖：

至少 3 题。

如果错误率较高，Agent 应主动增加训练比例。

---

## Pattern 3.4：双写最后一个辅音字母

例如：

```text
big → bigger → biggest
hot → hotter → hottest
```

规则：

```text
双写最后一个辅音字母
+ er / est
```

最低覆盖：

至少 3 题。

---

## Pattern 3.5：more / most

例如：

```text
popular
→ more popular
→ most popular

useful
→ more useful
→ most useful

difficult
→ more difficult
→ most difficult
```

目标：

- 认识不能直接加 er / est 的常见词。
- 能区分 more / most 与普通 -er / -est。

最低覆盖：

至少 4 题。

教材明确列出的核心词应尽量覆盖。

---

## Pattern 3.6：不规则变化

这是另一个重点 Pattern。

教材中出现的典型形式：

```text
good → better → best
well → better → best

bad → worse → worst
little → less → least

many → more → most
much → more → most
```

建议：

> 教材明确列出的核心不规则形式原则上都至少出现一次。

但“出现一次”只代表 Coverage 完成，不代表已经掌握。

如果某个不规则词反复错误，Agent 应继续针对该词进行练习。

### 建议最低覆盖

每个核心不规则形式至少 1 次。

整体最低练习量建议 4～6 题以上。

---

# 6. Pattern Coverage 机制

Pattern 不是单纯的标签。

每个 Pattern 应该拥有 Coverage 状态。

例如：

```json
{
  "patternId": "y-ending",
  "required": true,
  "minimumQuestions": 3,
  "attemptedQuestions": 4,
  "correctQuestions": 3,
  "coverageComplete": true
}
```

注意：

> Coverage Complete 不等于 Mastered。

例如：

```text
y-ending

覆盖：4/4
正确率：50%

Coverage：✅
Mastery：❌
```

此时 Agent 仍然需要继续教学。

---

# 7. Pattern 的两种状态

## Coverage

回答：

> 这个内容有没有被测过？

## Mastery

回答：

> 学生是否真正掌握？

两者必须分开。

---

# 8. Agent 如何决定下一批题目

Agent 每次生成 Batch 前，读取：

```text
当前 Subtopic
↓
Patterns
↓
Pattern Coverage
↓
Pattern 表现
↓
历史 Attempts
```

然后决定：

- 哪些 Pattern 必须补 Coverage。
- 哪些 Pattern 错误率高。
- 哪些 Pattern 应增加题量。
- 哪些 Pattern 可以减少题量。
- 是否需要解释。
- 是否需要降低难度。
- 是否需要换一种题型。
- 是否可以进入混合练习。

---

# 9. 10 题只是 Batch，不是关卡题量

MVP 默认一次生成 10 题。

但：

> 10 题只是一个练习 Batch，不代表 Subtopic 必须 10 题完成。

例如：

```text
Batch 1：10题
↓
Coverage 不完整
↓
Batch 2：10题
↓
Coverage 完整，但 y-ending 较弱
↓
Batch 3：8题
↓
达到完成条件
```

因此：

```text
Batch ≠ Subtopic
```

---

# 10. Subtopic 完成条件

建议统一采用：

```text
Subtopic Completed
=
Coverage 达标
+
最低练习量达标
+
整体表现达到要求
+
没有明显未掌握 Pattern
```

其中：

- Coverage：程序统计。
- 最低练习量：程序检查。
- 整体表现：程序提供事实，Agent 综合判断。
- 未掌握 Pattern：Agent 根据 Pattern 历史表现判断。

暂时不采用固定：

```text
正确 +10
错误 -5
```

之类的 mastery 公式。

---

# 11. Subtopic 4：同级比较

## 学习目标

学生能够理解“和……一样……”以及“没有……那么……”的表达。

### Pattern 4.1：as...as

例如：

```text
My dog is as big as yours.
```

目标：

- 理解 as + 形容词/副词 + as。
- 理解“和……一样……”。

最低覆盖：

至少 3 题。

### Pattern 4.2：not as...as

例如：

```text
I'm not as tall as Penny.
```

目标：

- 理解 not as...as 表示“没有……那么……”。

最低覆盖：

至少 3 题。

### 建议最低练习量

8～10 题。

---

# 12. 比较级 Knowledge 的整体结构

```text
🌳 Knowledge：比较级与比较表达

├── 🎯 Subtopic 1：普通比较级
│   ├── comparative
│   ├── than
│   └── Which A or B
│
├── 🎯 Subtopic 2：最高级
│   ├── superlative
│   ├── the
│   ├── of
│   ├── in
│   └── Which + superlative
│
├── 🎯 Subtopic 3：词形变化
│   ├── regular
│   ├── e-ending
│   ├── y-ending
│   ├── double-consonant
│   ├── more-most
│   └── irregular
│
└── 🎯 Subtopic 4：同级比较
    ├── as...as
    └── not as...as

             ↓

      👑 场景挑战赛

混合所有 Subtopic / Pattern
```

---

# 13. 场景挑战赛

只有所有 Subtopic 完成后开放。

挑战赛不再针对单个 Subtopic。

它的目标是验证：

> 学生能否把整个 Knowledge 中学过的内容混合使用。

例如 10～15 题：

```text
普通比较级
最高级
词形变化
as...as
not as...as
```

题目随机混合。

同时重点关注：

- 是否能区分 comparative / superlative。
- 是否能正确选择词形。
- 是否能区分 than / of / in。
- 是否能正确使用 as...as。
- 是否能处理特殊变化。

---

# 14. 挑战失败后的处理

不要简单显示：

> 挑战失败，再来一次。

而是：

```text
Challenge
↓
分析错误
↓
找到相关 Pattern
↓
推荐复习 Subtopic
↓
复习
↓
重新挑战
```

例如：

```text
挑战错误：

y-ending：2题错
irregular：1题错
as...as：0题错

↓

推荐：

复习「词形变化」
重点：
y-ending
irregular
```

这样挑战赛就成为整个 Knowledge 的最终验证，而不是普通考试。

---

# 15. Agent 的职责

Agent 负责：

```text
分析
↓
诊断
↓
制定教学策略
↓
决定 Pattern 分布
↓
生成题目
↓
解释
↓
调整难度
↓
判断 Subtopic 是否掌握
```

程序负责：

```text
Knowledge 边界
Subtopic 边界
Pattern 定义
Coverage 统计
Attempts 记录
题目 schema 校验
完成状态保存
挑战赛解锁
```

核心原则：

> **程序负责边界，Agent 负责教学。**

---

# 16. 当前 MVP 不做的内容

暂时不加入：

- 复杂地图
- 战斗系统
- 装备系统
- 金币经济
- 排行榜
- 多人系统
- 开放式句子评分
- 每题一次 LLM 调用
- 复杂动画

保留：

- NPC 知识介绍
- Subtopic 关卡
- Pattern 内部自适应练习
- Subtopic 完成
- 场景挑战赛
- 挑战成功后的简单形象变化

这已经足够形成第一版游戏化学习闭环。
