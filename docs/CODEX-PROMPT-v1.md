# CODEX-PROMPT-v1.md

请先阅读项目全部 docs，重点阅读：

- docs/AGENT_v1.md
- docs/AGENT.md
- docs/DATA.md
- docs/STATUS.md
- docs/PRD.md
- docs/DESIGN.md
- docs/CONTENT.md
- docs/TECH.md

优先级：

当前 Prompt > AGENT_v1.md > AGENT.md > DATA.md > STATUS.md > PRD.md > DESIGN.md > CONTENT.md > TECH.md

## 第一阶段：只分析，不修改代码

检查：

1. LangGraph
2. Agent batch 分析
3. Question Batch
4. Attempt
5. LearningState
6. LLM Provider
7. UI 对 Agent 数据的消费
8. 旧 Question Selector、固定题库、mastery 公式

先输出：

- 当前架构分析
- 可复用部分
- 改造方案
- 新增文件
- 修改文件
- 数据流变化
- LangGraph 节点变化

## 第二阶段：实现

根据 AGENT_v1.md 实现：

- TeachingStrategy
- 7 类错误/学习状态
- strategyLevel 1～5
- questionDistribution
- batch-level adaptive learning
- persistent_failure 策略升级
- explanation/examples
- LearningState 更新
- Question Validator

保持：

- 每批 10 道题
- choice / true-false
- 程序本地判断
- 每题记录 Attempt
- 不每题调用 LLM
- Knowledge = Level
- subtopic 只能在当前 Knowledge 内
- 新 Session 读取历史 LearningState
- Session 结束更新 LearningState

## 第三阶段：重点实现 persistent_failure

同一 subtopic 连续多个 batch 失败时，不要只继续出同类题。

可考虑：

- 降低难度
- 更换题型
- 规则识别
- 正反例
- 减少干扰项
- 重新解释
- 拆分复杂问题

## 第四阶段：Question Validator

验证：

- 10 道题
- type 合法
- options 合法
- answer 存在
- 不重复
- knowledgeId 正确
- subtopic 合法
- questionDistribution 总数为 10
- difficulty 合法
- LLM 输出符合 schema

## 第五阶段：测试

模拟：

A. 9/10，错误分散
B. 6/10，4 个 y-ending 错误
C. 连续 y-ending 错误
D. 两个 batch 都 y-ending 失败
E. 6/10 → 8/10 → 9/10
F. 多个 batch 稳定正确

重点检查 B～F 是否采取不同策略。

## 第六阶段：不要扩范围

不要增加：

- 登录
- 数据库
- OCR
- 家长系统
- 社交
- Phaser
- 大规模游戏化
- 开放式作文
- 每题一次 LLM
- 固定 mastery 公式
- 大规模 UI 重构

## 第七阶段：完成后

运行项目已有的 tests、lint、typecheck、build，只报告真实结果。

更新 docs/STATUS.md：

- 已实现什么
- 测试结果
- 当前限制
- 下一步建议
