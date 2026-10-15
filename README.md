# English Forest / 英语森林

面向小学生的游戏化英语学习 Web App。

当前 Content Model：

```text
Knowledge
→ Subtopic
→ Pattern
→ TeachingContent
→ Question
```

## Comparative Knowledge

包含 6 个 Subtopic：

- `comparative-basic`
- `superlative-basic`
- `comparative-form-rules`
- `comparative-more-most`
- `comparative-as-as`
- `comparative-sentence-application`

所有 Subtopic 完成后解锁 `通关挑战`。

## Agent 教学

- TeachingContent 是教材事实来源。
- Agent 负责诊断、Pattern 选择、题量分配、解释和难度调整。
- 程序负责边界、Coverage、Attempt、Validator 和持久化。
- 首次学习先展示 TeachingContent，再进入练习。
- 普通比较级的 5 个 Pattern 均接入本地漫画讲解，可切换文字讲解。
- Knowledge 卡片先“解锁详情”，完成讲解后才能进入练习。
- 图片缺失或加载失败时自动回退文字讲解。
- 已有学习记录时针对弱 Pattern 少量强化。

## QuestionPool

- 首次需要时由模型生成并保存到服务端。
- 后续新用户复用。
- Agent 个性化题目与公共题库分离。
- Repository 设计允许未来替换为数据库。

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

包含 ESLint、TypeScript、自动化测试和生产构建。
