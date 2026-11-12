# 周易留白阅读原型（中文优先）

> PROTOTYPE / 本地收费基础能力。周易阅读与起卦原型：即时问事（铜钱起卦）+ 四个阅读变体 + 本地典籍库。不是正式产品，不预测结果。完成的卦象自动进入版本化本机历史；反思与事后回看始终可选。无账号、无后端、无云同步，导出/导入仅由用户主动触发。个人底色入口已撤下且不得重新引入。

## 运行

```bash
corepack pnpm start        # node server.mjs，打开 http://127.0.0.1:4174
corepack pnpm check        # 全量检查：语法 + 单测 + 典籍库/卦库核对
corepack pnpm test         # node --test tests/*.test.mjs
corepack pnpm build:classics / check:classics   # 重建/核对典籍库
corepack pnpm build:iching / check:iching       # 重建/核对 64 卦 JSON
```

## 目录地图

- `index.html` + `app.js` + `styles.css` + `server.mjs` — Hybrid Web 主程序。
- `iching-core.js` 起卦/卦变核心；`reflection-prompts.js` 64 卦开放式提示；`soundscape.js` Web Audio 环境声（本地合成，无外部音频文件）。
- `content/classics/library/` — 典籍库 18 条目（十三经/四书/六经），`manifest.json` 记录逐文件字节数/行数/SHA-256/重复关系/来源状态；`content/iching/hexagrams.json` 64 卦。
- `vendor/`、`vendor-input/` — 历史实验归档；正式 Web 服务器与 iOS 资源加载器均不允许访问，`sync-web.sh` 也不复制。不得恢复“个人底色”运行链。
- `design-system/`、`docs/` — 设计规范、竞品与 UX 审计、QA 截图、复用决策记录。
- `tests/` — node:test 单元测试。

## 功能要点

- 单一入口：**即时问事**（三枚铜钱投掷，六轮记爻 → 本卦/变爻/之卦；可手动记录；关注方向只影响末尾开放式提示，不操纵卦象）。个人底色不在当前用户流程中展示。
- 四个阅读变体：A 典藏 / B 回声 / C 门槛 / D 余响，URL 参数 `?variant=`，正常起卦后四个版本共用本次卦象与原文。
- 问题、卦象、标签与可选回看备注只存在本机应用容器；用户可检索、删除，或经明文风险确认后主动导出。导入必须通过版本、类型、大小、枚举与纯文本校验。
- iOS 收费能力仅为 StoreKit 2 + 本地 `.storekit` 测试骨架；没有 App Store Connect 商品、真实交易或收费后台。核心起卦与最近历史不锁。

## 边界（写死，不要破坏）

- 不生成预测、吉凶评分、准确率或重大决策建议；不把星座/日主宽泛描述包装成科学测评。
- 不保存出生资料；无后端、不接 API、不创建服务端数据库、不部署。历史仅使用本机版本化存储；iOS 目标声明“首次解锁后可用”的 Data Protection，用户导出的明文文件不再受该容器边界保护。
- 不自动播放声音；不加载未授权现代译本；动态起卦只展示经典原文。
- 不根据关注方向挑选卦象或改写经典原文；不用基础盘面自动输出性格定论/流年断语。
- 典籍库中《仪礼》《春秋公羊传》《尔雅》原文件自带「来源待确认」标记，界面必须如实显示。

## 相关研究（在上级目录，本工作区外，需手动引用）

`周易反思仪式海外本土化深研.md`、`国内增长App海外本土化研究/情绪娱乐_周易卜卦.md`、`三类海外轻量产品机会初筛_2026-07-31.md`。
