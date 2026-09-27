# English Forest / 英语森林

面向小学生的游戏化英语学习 Web App，当前使用 Content Model v2：

```text
Knowledge → Subtopic → Pattern → Question
```

## 当前课程

```text
comparative
比较级与比较表达

├── comparative-basic 普通比较级
├── superlative-basic 最高级
├── form-change 词形变化
└── as-as 同级比较
```

`form-change` 包含：

- regular
- e-ending
- y-ending
- double-consonant
- more-most
- irregular

## Agent 机制

- 程序负责 Knowledge、Subtopic、Pattern 边界。
- 程序记录 Attempts 和 Pattern Coverage。
- Agent 负责诊断、Pattern 选择、题量分配、解释和难度调整。
- 每批题数由 Pattern Coverage、表现和 TeachingStrategy 动态决定，通常为 3～20 题。
- Coverage 与 Mastery 分离。
- required Pattern 未完成 Coverage 时优先训练。
- Challenge 阶段混合所有 Subtopic 和 Pattern。

## LangGraph

```text
START
→ load_context
→ analyze_learning_state
→ generate_teaching_strategy
→ generate_question_batch
→ WAIT_FOR_USER
→ record_attempt
→ analyze_batch
→ generate_teaching_strategy
→ continue / finish
→ summarize_session
→ save_learning_state
→ END
```

## LLM 配置

默认 `mock`。

DeepSeek：

```env
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-v4-flash
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.deepseek.com/v1
```

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 质量检查

```bash
npm run check
```

## 主要路由

- `/`：Knowledge 首页
- `/knowledge/comparative`：四个 Subtopic 和 Pattern 概览
- `/game/comparative/{subtopicId}`：Subtopic 关卡
- `/game/comparative`：Knowledge Challenge
- `/result/[id]`：SessionSummary、Pattern 结果和复习入口
