import StoreKit
import SwiftUI

struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: EntitlementStore

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    VStack(spacing: 4) {
                        Text("透明产品结构")
                            .font(.largeTitle.bold())
                        Text("Transparent plans")
                            .font(.title3)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .accessibilityElement(children: .combine)
                    localTestingNotice
                    storeState
                    freeTier
                    lifetimeTier
                    subscriptionTier
                    boundaries
                }
                .padding()
            }
            .background(Color(red: 0.04, green: 0.05, blue: 0.04))
            .foregroundStyle(.primary)
            .navigationTitle("收费结构 / Plans")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成 / Done", action: dismiss.callAsFunction)
                }
            }
            .safeAreaInset(edge: .bottom) {
                restoreBar
            }
        }
        .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private var storeState: some View {
        switch store.loadState {
        case .idle, .loading:
            HStack(spacing: 12) {
                ProgressView()
                Text("正在读取本地测试商品 / Loading local test products")
            }
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .accessibilityElement(children: .combine)
        case .empty:
            Label("未找到商品；核心起卦仍可免费使用。 / No products found; core casting remains free.", systemImage: "shippingbox")
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        case .failed(let message):
            Label("商品读取失败 / Product loading failed: \(message)", systemImage: "exclamationmark.triangle")
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .foregroundStyle(.orange)
        case .loaded:
            Label("本地商品已读取 / Local products loaded", systemImage: "checkmark.seal")
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        }
    }

    private var localTestingNotice: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Xcode 本地 StoreKit Testing / Local testing", systemImage: "hammer")
                .font(.headline)
            Text("尚未绑定 App Store Connect 真实商品，不代表已具备对外收费能力。 / Not connected to real App Store Connect products; this is not live billing.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.orange.opacity(0.12))
        .clipShape(.rect(cornerRadius: 16))
        .accessibilityElement(children: .combine)
    }

    private var freeTier: some View {
        TierCard(
            title: "免费 / Free",
            subtitle: "永远保留可靠起卦与基本阅读 / Reliable casting and core reading remain free",
            features: ["三钱六掷 / Six-line casting", "经典原文 / Original text", "最近历史与删除 / Recent history and deletion", "随机与隐私说明 / Randomness and privacy"]
        )
    }

    private var lifetimeTier: some View {
        TierCard(
            title: "永久解锁 / Lifetime",
            subtitle: store.lifetimeProduct?.displayPrice ?? "本地测试价格读取中",
            features: ["完整历史与检索 / Full searchable history", "JSON/文本备份 / JSON and text backup", "六十四卦学习地图 / 64-hexagram map", "已完成的编辑内容包 / Completed editorial packs"],
            isActionEnabled: store.lifetimeProduct != nil && !store.isBusy
        ) {
            guard !store.isBusy, let product = store.lifetimeProduct else { return }
            Task { await store.purchase(product) }
        }
    }

    private var subscriptionTier: some View {
        TierCard(
            title: "可选订阅 / Optional subscription",
            subtitle: store.subscriptionProduct?.displayPrice ?? "本地测试价格读取中",
            features: ["未来人工编辑主题包 / Future human-edited packs", "不卖更吉利答案 / Never luckier answers", "不声称提高准确率 / No accuracy claims", "可随时取消 / Cancel anytime"],
            isActionEnabled: store.subscriptionProduct != nil && !store.isBusy
        ) {
            guard !store.isBusy, let product = store.subscriptionProduct else { return }
            Task { await store.purchase(product) }
        }
    }

    private var boundaries: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("永远不放入付费层 / Never paywalled")
                .font(.headline)
            Text("更吉利的卦象、所谓准确率、医疗/金融/法律/安全结论、重大关系决策、恐惧型倒计时。 / Luckier results, accuracy claims, medical/financial/legal/safety conclusions, major relationship decisions, and fear-based countdowns.")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
    }

    private var restoreBar: some View {
        VStack(spacing: 8) {
            if let statusMessage = store.statusMessage {
                Text(statusMessage)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            Button("恢复本地测试购买 / Restore local test purchases") {
                Task { await store.restore() }
            }
            .frame(minHeight: 44)
            .disabled(store.isBusy)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
    }
}
