# AGENT_v1.md

## Agent 教学策略 v1

核心目标：Agent 不只是出题，而是根据学生的错误模式决定怎么教。

核心闭环：

孩子答题 → 程序记录 → Agent 诊断 → 选择教学策略 → 生成下一批题 → 再评估。

原则：

> 程序负责边界和事实记录，Agent 负责诊断和教学策略。

## 1. 错误类型

### accidental
偶然错误，错误没有明显集中。

策略：正常继续，不重新讲解。

### subtopic_weakness
某个 subtopic 明显薄弱，但基本理解存在。

策略：下一批增加该 subtopic 的题目比例，保持或略降难度。

### rule_misunderstanding
同一规则连续明显错误。

策略：简短解释 → 1～2 个例子 → 1 个简单练习 → 正式练习。

### multiple_weaknesses
多个 subtopic 都薄弱。

策略：拆分问题，选择优先级最高的 1～2 个 subtopic，分阶段训练。

### persistent_failure
同一 subtopic 连续多个 batch 都表现很差。

策略：不要只是继续刷同类题，应考虑降低难度、更换题型、规则识别、正反例、减少干扰项、重新解释、拆分问题。

### improving
表现连续提高，例如 6/10 → 8/10 → 9/10。

策略：逐步提高难度，增加混合题。

### mastered
多个 batch 稳定正确。

策略：少量混合题确认后结束 Session，更新 LearningState。

## 2. Strategy Level

1. 正常练习
2. 针对性练习
3. 解释 + 示例 + 简单练习
4. 改变教学方式
5. 综合验证 / 结束

## 3. TeachingStrategy

```ts
interface TeachingStrategy {
  diagnosis:
    | "accidental"
    | "subtopic_weakness"
    | "rule_misunderstanding"
    | "multiple_weaknesses"
    | "persistent_failure"
    | "improving"
    | "mastered";

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
  difficulty: number;

  questionDistribution: {
    subtopic: string;
    count: number;
  }[];

  explanation?: string;
  examples?: string[];
  reason: string;
}
```

## 4. Question Distribution

下一批仍然生成 10 道题。

例如：

```json
{
  "questionDistribution": [
    { "subtopic": "y-ending", "count": 6 },
    { "subtopic": "regular", "count": 2 },
    { "subtopic": "e-ending", "count": 1 },
    { "subtopic": "irregular", "count": 1 }
  ]
}
```

要求：

- 总数必须等于 10
- subtopic 必须属于当前 Knowledge
- 不允许越过当前 Level
- 程序必须校验 Agent 输出

## 5. 教学输出顺序

需要教学干预时：

诊断 → 简短解释 → 示例 → 简单练习 → 正式练习 → 重新评估。

例如 y-ending：

happy、busy、easy 这些词最后都是辅音 + y。

变成比较级时，先把 y 变成 i，再加 er。

happy → happier

busy → busier

## 6. 不要只看总分

Agent 需要综合：

- 总体正确率
- subtopic 正确率
- 错误是否集中
- 错误是否连续
- 历史 batch
- 当前 difficulty
- 是否经过针对性训练
- 混合题稳定性

不要使用固定的“正确 +10 / 错误 -5” mastery 公式。

## 7. LearningState

```ts
interface LearningState {
  knowledgeId: string;
  mastery: number;
  strengths: string[];
  weaknesses: string[];
  currentDifficulty: number;
  recommendedFocus: string[];
  strategyLevel: number;
  summary: string;
}
```

mastery 由 Agent 综合 Session 表现判断，程序负责校验和持久化。

## 8. LangGraph

```text
START
 ↓
load_context
 ↓
analyze_learning_state
 ↓
generate_teaching_strategy
 ↓
generate_question_batch
 ↓
WAIT_FOR_USER
 ↓
evaluate_answer
 ↓
record_attempt
 ↓
next_question
 ↓
batch_complete
 ↓
analyze_batch
 ↓
continue → generate_teaching_strategy
       ↘
        finish
         ↓
   summarize_session
         ↓
 save_learning_state
         ↓
        END
```

程序负责 evaluate_answer、record_attempt、save_learning_state。

Agent 负责 analyze_batch、generate_teaching_strategy、generate_question_batch。

## 9. 验收测试

A：9/10，错误分散 → 正常继续。

B：6/10，其中 4 个 y-ending 错误 → 下一批明显增加 y-ending。

C：连续 y-ending 错误 → explain + examples + 简单练习。

D：连续两个 batch 在 y-ending 上失败 → persistent_failure + strategyLevel 提升 + 改变教学方式。

E：6/10 → 8/10 → 9/10 → improving + 逐步提高难度。

F：多个 batch 稳定正确 → mastered + 综合验证 + 结束 Session。

核心产品假设：

> 孩子答错以后，AI 能判断为什么错，并采取不同的教学方式。

如果只是“答错 → 多生成几道类似题”，就不算真正建立 Agent 教学策略。
