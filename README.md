# 德州扑克 · 6 人桌 (6-Max Texas Hold'em)

精致的单机德州扑克网页游戏 —— 深夜赌场风牌桌，你 + 5 位 AI 对手，每人 10,000 筹码，无限注，淘汰制：筹码归零出局，淘汰全部对手即获胜。

## 玩法

- 标准无限注德州扑克规则：两张底牌 + 五张公共牌，四轮下注（翻牌前 / 翻牌 / 转牌 / 河牌）
- 6 人桌：按钮（D）每手轮换，小盲 25 / 大盲 50，翻牌前枪口感位先动，翻牌后按钮左侧先动
- 操作：弃牌 / 过牌 / 跟注 / 加注（最小、半池、整池、全下快捷档）
- 完整边池处理：多人全下自动拆池，平分底池按份分配
- 5 位 AI 对手各有名字（阿豪 / Linda / 老周 / Vicky / 坤哥），基于牌力 + 底池赔率决策，会价值加注也会偶尔诈唬
- 实时显示你当前最佳牌型，摊牌全场亮牌并标注赢家牌型
- 战绩面板：手数 / 赢的锅数 / 淘汰数 / 最大单笔，逐手盈亏流水
- 进度存于浏览器 localStorage（仅本浏览器）；被清台可一键重开一桌

## 技术

- React 19 + TypeScript + Vite 7 + Tailwind CSS 3
- 纯前端无后端：牌力评估器（7 选 5，同花顺到高牌九档带踢脚比较）在 `src/game/evaluate.ts`
- 多人下注状态机（轮转换位、边池、全下跑牌）在 `src/game/holdem.ts`
- AI 决策在 `src/game/ai.ts`；React 状态与发牌节奏在 `src/hooks/useHoldem.ts`
- Web Audio 合成音效（`src/game/sound.ts`），无音频资源文件
- 引擎测试：`npx tsx test-engine.mts`（牌力评估用例 + 随机对局筹码守恒）

## 运行

```bash
npm install
npm run dev      # 开发预览
npm run build    # 构建到 dist/
npm run preview  # 预览构建产物
```
