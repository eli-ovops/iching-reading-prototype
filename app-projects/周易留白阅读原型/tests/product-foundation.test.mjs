import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('当前用户流程不含个人底色，默认视觉为 bronze', async () => {
  const [app, server, sync] = await Promise.all([read('../app.js'), read('../server.mjs'), read('../iOS真机MVP/scripts/sync-web.sh')])
  assert.doesNotMatch(app, /个人底色|profileEntryMarkup|profileMarkup|buildProfile|window\.iztro|window\.Lunar/)
  assert.match(app, /\? value : 'bronze'/)
  assert.doesNotMatch(server, /vendor\/iztro|vendor\/lunar/)
  assert.doesNotMatch(sync, /assets content vendor/)
})

test('英文译本不伪装已完成，版权阻塞可追溯', async () => {
  const manifest = JSON.parse(await read('../content/translations/manifest.json'))
  const legge = manifest.translations.find(item => item.id === 'legge-1882-en')
  assert.equal(legge.bundled, false)
  assert.equal(legge.coverage, 0)
  assert.match(legge.blocker, /non-commercial/)
  assert.equal(legge.sourceCandidates.length, 2)
})

test('收费骨架声明本地测试、未绑定真实商品且核心起卦不锁', async () => {
  const [paywall, store, feature, app, coordinator, content] = await Promise.all([
    read('../iOS真机MVP/IChingReflectionMVP/PaywallView.swift'),
    read('../iOS真机MVP/IChingReflectionMVP/EntitlementStore.swift'),
    read('../iOS真机MVP/IChingReflectionMVP/ProductFeature.swift'),
    read('../app.js'),
    read('../iOS真机MVP/IChingReflectionMVP/WebViewCoordinator.swift'),
    read('../iOS真机MVP/IChingReflectionMVP/ContentView.swift'),
  ])
  assert.match(paywall, /Xcode 本地 StoreKit Testing/)
  assert.match(paywall, /尚未绑定 App Store Connect 真实商品/)
  assert.match(store, /case \.coreCasting, \.recentHistory:\s+true/)
  assert.match(store, /var bridgeLevel/)
  assert.match(store, /canAccess\(\.fullHistory\)/)
  assert.match(feature, /coreCasting/)
  assert.match(app, /function canAccess\(feature\)/)
  assert.match(app, /__ichingSetEntitlementLevel/)
  assert.match(coordinator, /evaluateJavaScript/)
  assert.match(content, /entitlementStore\.bridgeLevel/)
})

test('StoreKit 2 配置与交易闭环代码齐全', async () => {
  const [scheme, config, store] = await Promise.all([
    read('../iOS真机MVP/IChingReflectionMVP.xcodeproj/xcshareddata/xcschemes/IChingReflectionMVP.xcscheme'),
    read('../iOS真机MVP/IChingReflectionMVP/LocalProducts.storekit'),
    read('../iOS真机MVP/IChingReflectionMVP/EntitlementStore.swift'),
  ])
  assert.match(scheme, /StoreKitConfigurationFileReference/)
  assert.match(scheme, /LocalProducts\.storekit/)
  assert.equal(JSON.parse(config).products.length, 1)
  assert.equal(JSON.parse(config).subscriptionGroups[0].subscriptions.length, 1)
  for (const marker of ['Transaction.currentEntitlements', 'Transaction.updates', 'transaction.finish()', 'AppStore.sync()', 'case .pending', 'case .userCancelled', 'revocationDate', 'expirationDate']) assert.match(store, new RegExp(marker.replace(/[().]/g, '\\$&')))
})

test('学习与主题入口已撤下，但六十四卦原文仍保留给起卦结果和典籍资料', async () => {
  const [content, app] = await Promise.all([read('../content/iching/hexagrams.json'), read('../app.js')])
  const payload = JSON.parse(content)
  assert.equal(payload.entryCount, 64)
  assert.equal(payload.hexagrams.length, 64)
  assert.equal(new Set(payload.hexagrams.map(item => item.number)).size, 64)
  assert.doesNotMatch(app, /\['learning', '学习', 'Learn'\]/)
  assert.doesNotMatch(app, /\['themes', '主题', 'Themes'\]/)
  assert.match(app, /ensureIChingContent/)
  assert.match(app, /contentByNumber/)
})

test('投掷动态状态直接本地化，结果页从典籍 manifest 解析周易 canonical 路径', async () => {
  const [app, manifestFile] = await Promise.all([read('../app.js'), read('../content/classics/library/manifest.json')])
  const manifest = JSON.parse(manifestFile)
  const zhouyi = manifest.entries.find(entry => entry.collection === '十三经' && entry.title === '周易')
  assert.equal(zhouyi.path, '/content/classics/library/十三经/01_周易.txt')
  for (const marker of ['function castingLineLabel', 'function castingValueLabel', 'function coinAccessibilityLabel', 'aria-hidden="true"', 'data-action="open-zhouyi-source"', 'function zhouyiClassicEntry']) assert.match(app, new RegExp(marker.replace(/[().]/g, '\\$&')))
  assert.doesNotMatch(app, /data-path="\/content\/classics\/library\/十三经\/周易\.txt"/)
})

test('首页不暴露独立典籍入口，设置关于保留完整典籍库且结果页保留来源链', async () => {
  const app = await read('../app.js')
  const opening = app.slice(app.indexOf('function openingMarkup'), app.indexOf('function questionEntryMarkup'))
  assert.doesNotMatch(opening, /data-action="open-classics"/)
  assert.match(app, /aria-labelledby="about-title"/)
  assert.match(app, /localized\('关于', 'About'\)/)
  assert.match(app, /data-action="open-classics"/)
  assert.match(app, /data-action="open-zhouyi-source"/)
})

test('经典中文原文声明中文语言并在英文模式追加英文说明', async () => {
  const app = await read('../app.js')
  assert.match(app, /lang="zh-Hant"/)
  assert.match(app, /Original Chinese source text/)
  assert.match(app, /Original Chinese text from the Zhouyi/)
})

test('RNG 不含 Math.random 静默回退并明确阻断错误', async () => {
  const source = await read('../iching-core.js')
  assert.doesNotMatch(source, /Math\.random/)
  assert.match(source, /安全随机源不可用/)
})

test('页面允许系统缩放，WebView 不禁用 pinch', async () => {
  const [index, webView] = await Promise.all([
    read('../index.html'),
    read('../iOS真机MVP/IChingReflectionMVP/LocalIChingWebView.swift'),
  ])
  assert.doesNotMatch(index, /user-scalable=no|maximum-scale=1/)
  assert.doesNotMatch(webView, /pinchGestureRecognizer.*isEnabled\s*=\s*false/)
})

test('iOS Web 构建输入不保留历史 profile vendor', async () => {
  const [sync, loader] = await Promise.all([
    read('../iOS真机MVP/scripts/sync-web.sh'),
    read('../iOS真机MVP/IChingReflectionMVP/LocalWebResourceLoader.swift'),
  ])
  assert.match(sync, /\$web_root\/vendor/)
  assert.match(sync, /rm -rf/)
  assert.doesNotMatch(loader, /vendor/)
})

test('iOS 目标明确默认 Data Protection 且没有云能力', async () => {
  const entitlements = await read('../iOS真机MVP/IChingReflectionMVP/IChingReflectionMVP.entitlements')
  assert.match(entitlements, /com\.apple\.developer\.default-data-protection/)
  assert.match(entitlements, /NSFileProtectionCompleteUntilFirstUserAuthentication/)
  assert.doesNotMatch(entitlements, /icloud|CloudKit/i)
})
