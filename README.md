# English Forest / 英语森林

面向小学生的游戏化英语学习 Web App。当前版本已升级到 Agent 教学策略 v1。

## 核心架构

```text
Knowledge
  ↓
LearningSession + LearningState
  ↓
analyze_learning_state
  ↓
TeachingStrategy
  ↓
questionDistribution
  ↓
15 道 choice / true-false
  ↓
学生答题
  ↓
程序本地判分 + Attempt
  ↓
analyze_batch
  ↓
TeachingStrategy
  ↓
continue / finish
```

核心原则：

> 程序负责边界和事实记录，Agent 负责诊断和教学策略。

## TeachingStrategy

支持七类诊断：

- accidental
- subtopic_weakness
- rule_misunderstanding
- multiple_weaknesses
- persistent_failure
- improving
- mastered

策略等级 1～5：

1. 正常练习
2. 针对性练习
3. 解释 + 示例 + 简单练习
4. 改变教学方式
5. 综合验证 / 结束

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- LangGraph
- LangChain OpenAI
- Zod
- LocalStorage
- DeepSeek `deepseek-v4-flash`


## Baseline Question Cache

当某个 Knowledge 的 LearningState 为空时，服务器会首次生成并缓存 15 道基线题。后续空状态请求复用该题库，不重复调用模型。

默认存储位置：

```text
.data/baselines/{knowledgeId}.json
```

可通过 `BASELINE_STORAGE_DIR` 修改。

## LLM 配置

默认 `mock`，无需 API Key，适合本地测试。

DeepSeek：

```env
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-v4-flash
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.deepseek.com/v1
```

OpenAI：

```env
LLM_PROVIDER=openai
LLM_MODEL=your-model-name
LLM_API_KEY=your-api-key
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

该命令依次执行 ESLint、TypeScript、测试和生产构建。

## 主要路由

- `/`：首页与 LearningState
- `/knowledge/comparative`：Knowledge 和 subtopics
- `/game/comparative`：Agent 教学 Session
- `/result/[id]`：SessionSummary 和长期 LearningState
- `/api/agent/session/start`：策略生成与首批题目
- `/api/agent/session/complete-batch`：Batch 分析、策略与下一批题目
