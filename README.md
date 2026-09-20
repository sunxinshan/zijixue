# English Forest / 英语森林

一个面向小学阶段学习者的游戏化英语学习 Web App MVP。当前版本围绕「比较级和最高级」实现完整的「学习 → 练习 → 即时反馈 → 掌握度 → 再次挑战」闭环。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Browser LocalStorage

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

也可以一次执行：

```bash
npm run check
```

## 主要路由

- `/`：首页与学习进度
- `/knowledge/comparatives`：知识点与五类规则
- `/game/comparatives`：10 题挑战
- `/result/[id]`：挑战结果与掌握度

用户学习数据统一保存在浏览器 LocalStorage 的 `english-forest:v1` 命名空间下。
