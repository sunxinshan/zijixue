# English Forest / 英语森林

面向小学生的游戏化英语学习 Web App。当前版本已从固定题库升级为 Agent 驱动的动态教学闭环。

## 核心架构

```text
进入 Knowledge
  ↓
创建 LearningSession
  ↓
读取 LearningState
  ↓
LangGraph: load_context → generate_batch
  ↓
学生逐题作答
  ↓
程序本地判分并记录 Attempt
  ↓
每 10 题完成一次 Batch Analysis
  ↓
continue → 生成下一批针对性题目
或
finish → SessionSummary → 更新 LearningState
```

核心原则：

> 程序负责边界，Agent 负责教学。

- 程序负责题目数量、题型、答案判定、Attempt、校验和持久化。
- Agent 负责分析学习状态、选择重点、调整难度、生成题目和总结 Session。
- LangGraph 只保存当前 Session 工作状态，不代替 Storage Layer。
- 浏览器使用 LocalStorage；OpenAI API Key 只存在于服务端环境变量中。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- LangGraph
- LangChain OpenAI
- Zod
- Browser LocalStorage

## LLM 配置

默认使用 `mock` Provider，便于在没有 API Key 时运行和测试。

复制环境变量模板：

```bash
cp .env.example .env.local
```

本地演示模式：

```env
LLM_PROVIDER=mock
```

OpenAI 模式：

```env
LLM_PROVIDER=openai
LLM_MODEL=your-model-name
LLM_API_KEY=your-api-key
```

可选 OpenAI 兼容接口：

```env
LLM_BASE_URL=https://api.openai.com/v1
```

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 质量检查

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

或执行：

```bash
npm run check
```

## 主要路由

- `/`：首页与长期 LearningState
- `/knowledge/comparative`：Knowledge 与 subtopics
- `/game/comparative`：Agent 动态教学 Session
- `/result/[id]`：SessionSummary 与 LearningState 更新结果
- `/api/agent/session/start`：创建 Session 并生成首批 10 题
- `/api/agent/session/complete-batch`：分析一批 Attempt，决定 continue / finish
