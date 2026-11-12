# 字里之间｜iOS 真机 MVP

独立 SwiftUI + `WKWebView` 离线容器。它只打包上级周易网页原型的正式运行时资源，不连接服务器、不保存出生资料。完成的卦象会自动保存在应用容器的版本化本地历史中；回看与反思始终可选。

## 工程身份

- Project：`IChingReflectionMVP.xcodeproj`
- Scheme / Target：`IChingReflectionMVP`
- Bundle Identifier：`com.cczij.ichingreflectionmvp`
- iOS：17+
- 方向：仅竖屏

## 同步网页资源

在网页源文件更新后运行：

```bash
./scripts/sync-web.sh
```

同步范围：`index.html`、核心 JS/CSS、`assets/`、`content/`。历史 `vendor/` 不复制且运行时加载器拒绝访问；脚本会仅移除已知的生成副本 `Web/vendor/`，避免旧的 `lunar.js`/`iztro.min.js` 残留进入 `.app`。`Web/` 是构建输入副本，不是新的内容源。

## 当前边界

- 不包含账号、后端、服务端数据库、上传、推送、CloudKit 或真实 App Store 商品。
- 包含 StoreKit 2 本地骨架：商品 loading/empty/failure、已验证 `currentEntitlements` 与 `Transaction.updates`、购买成功/待处理/取消/失败、`finish()` 和显式 `AppStore.sync()` 恢复。
- `LocalProducts.storekit` 是未同步 App Store Connect 的本地测试配置；共享 Scheme 的 Run action 已激活。它不会上传，也不代表真实收费完成。
- Swift ↔ Web 只下发经过本地 StoreKit 已验证权益推导出的 `free`/`lifetime`/`subscription` 枚举；免费核心起卦与最近 5 条历史永不被付费墙锁住。永久解锁和可选订阅才可访问完整历史与备份；“学习与主题”入口已从产品导航撤下。
- 应用 entitlement 声明 `NSFileProtectionCompleteUntilFirstUserAuthentication`。用户主动导出的 JSON 是未加密明文，离开应用容器后不再受该边界保护。
- 不自动播放声音；声音与语言切换均在 Web 阅读层右上角齿轮的本机偏好设置中，且会保留当前流程状态。
- Xcode 使用自动签名；真机运行时在 Xcode 中选择现有付费个人团队。团队标识由 Xcode 写入本地工程配置，但不在文档或回报中展示。

## 测试边界

- Web：在上级目录运行 `corepack pnpm check`；导航与单页阅读回归使用 `scripts/qa-navigation-reading.py`。
- iOS：可在 iPhone Simulator 构建和运行；`IChingReflectionMVPTests` 使用 StoreKitTest 尝试自动化本地交易状态。
- 模拟器/StoreKitTest 不替代真机 VoiceOver、Dynamic Type、真实沙盒或 App Store Connect 验收。本轮未授权 TestFlight、真实购买或收费后台操作。
