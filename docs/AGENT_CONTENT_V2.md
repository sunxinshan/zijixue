# AGENT Content Strategy v2

## 1. 本文件目的

本文件定义 Agent 如何围绕：

```text
Knowledge → Subtopic → Pattern → Question
```

进行教学。

Content v2 定义课程边界，本文件定义 Agent 在边界内如何教学。

---

## 2. 核心原则

> 程序负责边界，Agent 负责教学。

程序告诉 Agent：

- 当前 Knowledge
- 当前 Subtopic
- 当前允许使用的 Patterns
- Pattern Coverage
- 历史 Attempts

Agent 决定：

- 练什么
- 练多少
- 哪些需要重复
- 是否需要解释
- 是否降低难度
- 是否提高难度
- 是否完成 Subtopic

---

## 3. Subtopic 学习时的上下文

学习一个 Subtopic 时：

> Agent 主要关注当前 Subtopic 的状态。

例如当前：

```text
Knowledge: comparative
Subtopic: form-change
```

Agent 不需要把：

```text
普通比较级
最高级
as...as
```

的详细学习状态全部放进当前教学上下文。

原因：

- 降低上下文复杂度。
- 避免 Agent 被无关信息干扰。
- 让 Agent 更明确当前教学目标。
- Subtopic 本身已经是一个完整学习单元。

可以保留极少量全局信息，例如学生基本水平，但不要把其他 Subtopic 的详细 Attempts 注入。

---

## 4. Pattern 是 Agent 的细粒度教学单元

例如：

```text
Subtopic：词形变化

Patterns：

regular
e-ending
y-ending
double-consonant
more-most
irregular
```

Agent 每次生成 Batch 时先检查：

1. 哪些 Pattern 尚未完成 Coverage。
2. 哪些 Pattern 正在暴露错误。
3. 哪些 Pattern 已经稳定掌握。
4. 哪些 Pattern 需要重新验证。

---

## 5. Coverage 优先级

Pattern 的优先级：

```text
未覆盖
  ↓
正在覆盖但表现不稳定
  ↓
已覆盖且较弱
  ↓
已掌握
```

未覆盖 Pattern 必须优先进入题目。

弱 Pattern 应增加题量。

已掌握 Pattern 可以减少题量，但在后续混合练习中仍可出现。

---

## 6. 不同 Pattern 可以有不同练习量

不要假设：

```text
每个 Pattern = 2题
```

例如：

```text
regular       2题
e-ending      2题
y-ending      5题
double        2题
more-most     3题
irregular     5题
```

这是允许的。

题量由 Agent 根据：

- Pattern 复杂度
- Coverage
- 错误率
- 错误连续性
- 历史表现
- 当前难度

决定。

程序只负责检查最终 Batch 是否合法。

---

## 7. 特殊词必须覆盖

对于无法通过普通规则推导的核心内容，例如：

```text
good → better → best
bad → worse → worst
little → less → least
many → more → most
much → more → most
```

如果 Content 定义为 required，Agent 必须确保它们出现。

但是：

> 覆盖一次不等于掌握。

如果学生：

```text
good → better → best
```

答对，而：

```text
bad → worse → worst
```

连续错误，那么 Agent 应继续训练 bad。

---

## 8. Batch 机制

MVP：

```text
一次生成 10 题
```

但是：

> Batch 不是 Subtopic。

Agent 可以：

```text
Batch 1
↓
分析
↓
Batch 2
↓
分析
↓
Batch 3
```

直到 Subtopic 达到完成条件。

---

## 9. Batch 生成流程

```text
load current Subtopic state
        ↓
check Pattern Coverage
        ↓
check Pattern performance
        ↓
diagnose
        ↓
create question distribution
        ↓
generate 10 questions
        ↓
validate
```

---

## 10. Question Distribution

Agent 应生成类似：

```json
{
  "questionDistribution": [
    {
      "patternId": "y-ending",
      "count": 5
    },
    {
      "patternId": "irregular",
      "count": 3
    },
    {
      "patternId": "more-most",
      "count": 2
    }
  ]
}
```

要求：

- 总题数必须等于 10。
- 所有 Pattern 必须属于当前 Subtopic。
- 不允许跨 Subtopic。
- required Pattern 未覆盖时必须优先覆盖。

---

## 11. 教学策略

### 情况 A：偶发错误

例如：

```text
9/10
错误分散
```

策略：

```text
正常继续
```

不需要过度干预。

---

### 情况 B：某 Pattern 薄弱

例如：

```text
y-ending：40%
其他：90%+
```

策略：

```text
增加 y-ending
减少已掌握 Pattern
```

---

### 情况 C：规则理解错误

例如：

```text
easy → easyer
```

反复出现。

策略：

```text
短解释
↓
2个例子
↓
1～2个简单练习
↓
正式练习
```

---

### 情况 D：持续失败

同一个 Pattern 多个 Batch 都失败。

不要无限重复同一种题。

应该：

```text
降低难度
↓
减少干扰项
↓
改变题型
↓
重新解释规则
↓
正例/反例对比
↓
简单练习
↓
重新进入正式练习
```

---

### 情况 E：正在进步

例如：

```text
6/10
↓
8/10
↓
9/10
```

策略：

```text
减少辅助
增加难度
增加混合题
```

---

### 情况 F：稳定掌握

如果一个 Pattern 已经稳定正确：

- 降低单独训练比例。
- 保留少量验证题。
- 允许进入混合练习。

---

## 12. Subtopic 完成判断

Agent 不只看总分。

需要综合：

- 总体正确率
- Pattern 正确率
- Pattern Coverage
- 错误集中程度
- 错误连续性
- 历史 Batch
- 当前难度
- 是否经过针对性训练
- 混合题表现

程序负责硬条件：

```text
Coverage 达标
最低题量达标
```

Agent 判断：

```text
是否仍存在明显未掌握 Pattern
```

---

## 13. Challenge 阶段

只有所有 Subtopic 完成后，才进入 Knowledge Challenge。

此时 Agent 可以读取：

```text
Knowledge
+
所有 Subtopic LearningState
+
各 Pattern 历史表现
```

挑战题应混合所有 Subtopic。

挑战失败后：

```text
分析错误 Pattern
↓
定位相关 Subtopic
↓
推荐复习
```

---

## 14. 当前阶段不做

Agent 暂不负责：

- 游戏奖励计算
- 角色属性
- 地图解锁
- 动画
- UI
- XP

这些属于 Game Layer。

Agent 是老师，不是游戏引擎。
