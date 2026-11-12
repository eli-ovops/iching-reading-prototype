import Observation
import StoreKit

@MainActor
@Observable
final class EntitlementStore {
    static let lifetimeProductID = "com.cczij.ichingreflection.lifetime.local"
    static let subscriptionProductID = "com.cczij.ichingreflection.membership.monthly.local"

    private(set) var products: [Product] = []
    private(set) var level = EntitlementLevel.free
    private(set) var loadState = StoreLoadState.idle
    private(set) var purchaseState = PurchaseState.idle
    var statusMessage: String?

    @ObservationIgnored
    private var transactionUpdatesTask: Task<Void, Never>?

    var isBusy: Bool {
        loadState == .loading || purchaseState == .purchasing
    }

    var lifetimeProduct: Product? {
        products.first { $0.id == Self.lifetimeProductID }
    }

    var subscriptionProduct: Product? {
        products.first { $0.id == Self.subscriptionProductID }
    }

    // The WebView receives a capability-derived level rather than deciding
    // StoreKit status itself. A missing or unverified entitlement therefore
    // degrades to free before crossing the native bridge.
    var bridgeLevel: EntitlementLevel {
        guard canAccess(.fullHistory),
              canAccess(.backupExport),
              canAccess(.learningMap),
              canAccess(.editorialPacks)
        else { return .free }
        return level
    }

    init() {
        transactionUpdatesTask = observeTransactionUpdates()
    }

    deinit {
        transactionUpdatesTask?.cancel()
    }

    func canAccess(_ feature: ProductFeature) -> Bool {
        switch feature {
        case .coreCasting, .recentHistory:
            true
        case .fullHistory, .backupExport, .learningMap, .editorialPacks:
            level != .free
        }
    }

    func load() async {
        loadState = .loading
        statusMessage = nil
        do {
            products = try await Product.products(for: [
                Self.lifetimeProductID,
                Self.subscriptionProductID,
            ]).sorted { $0.price < $1.price }
            await refreshEntitlements()
            if products.isEmpty {
                loadState = .empty
                statusMessage = "未找到本地测试商品。请确认共享 Scheme 已选择 LocalProducts.storekit。 / No local products found. Confirm the shared scheme selects LocalProducts.storekit."
            } else {
                loadState = .loaded
                statusMessage = "已从当前 Scheme 读取 \(products.count) 个本地测试商品。 / Loaded \(products.count) local products from the active scheme."
            }
        } catch {
            products = []
            loadState = .failed(error.localizedDescription)
            statusMessage = "无法读取本地测试商品 / Unable to load local test products: \(error.localizedDescription)"
        }
    }

    func purchase(_ product: Product) async {
        purchaseState = .purchasing
        statusMessage = "正在打开本地 StoreKit 购买确认。 / Opening local StoreKit purchase confirmation."
        do {
            switch try await product.purchase() {
            case .success(let verification):
                let transaction = try verified(verification)
                await transaction.finish()
                await refreshEntitlements()
                purchaseState = .succeeded
                statusMessage = "已验证并完成本地 StoreKit 测试交易。 / Local StoreKit transaction verified and finished."
            case .pending:
                purchaseState = .pending
                statusMessage = "本地测试交易正在等待确认，尚未解锁。 / Local test transaction is pending; access remains locked."
            case .userCancelled:
                purchaseState = .cancelled
                statusMessage = "已取消本地测试交易，权益未改变。 / Local test transaction cancelled; entitlement unchanged."
            @unknown default:
                purchaseState = .failed("Unknown purchase result")
                statusMessage = "本地测试交易返回未知状态，权益未改变。 / Unknown local purchase result; entitlement unchanged."
            }
        } catch StoreKitError.userCancelled {
            purchaseState = .cancelled
            statusMessage = "已取消本地测试交易，权益未改变。 / Local test transaction cancelled; entitlement unchanged."
        } catch {
            purchaseState = .failed(error.localizedDescription)
            statusMessage = "本地测试交易失败，权益未改变 / Local test transaction failed; entitlement unchanged: \(error.localizedDescription)"
        }
    }

    func restore() async {
        purchaseState = .purchasing
        statusMessage = "正在请求 AppStore.sync()。 / Requesting AppStore.sync()."
        do {
            try await AppStore.sync()
            await refreshEntitlements()
            purchaseState = .idle
            statusMessage = level == .free
                ? "恢复完成，但没有找到有效交易。 / Restore completed; no active transaction was found."
                : "恢复完成，已重新读取有效权益。 / Restore completed; active entitlement refreshed."
        } catch {
            purchaseState = .failed(error.localizedDescription)
            statusMessage = "恢复失败 / Restore failed: \(error.localizedDescription)"
        }
    }

    func refreshEntitlements() async {
        var refreshedLevel = EntitlementLevel.free
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            guard transaction.revocationDate == nil else { continue }
            if let expirationDate = transaction.expirationDate, expirationDate <= .now { continue }
            if transaction.productID == Self.lifetimeProductID {
                refreshedLevel = .lifetime
            } else if transaction.productID == Self.subscriptionProductID, refreshedLevel != .lifetime {
                refreshedLevel = .subscription
            }
        }
        level = refreshedLevel
    }

    private func observeTransactionUpdates() -> Task<Void, Never> {
        Task { [weak self] in
            for await result in Transaction.updates {
                guard !Task.isCancelled else { return }
                guard case .verified(let transaction) = result else {
                    self?.statusMessage = "收到未通过验证的交易更新，未授予权益。 / Unverified transaction update ignored."
                    continue
                }
                await transaction.finish()
                await self?.refreshEntitlements()
            }
        }
    }

    private func verified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let value):
            value
        case .unverified:
            throw StoreError.failedVerification
        }
    }
}

private enum StoreError: LocalizedError {
    case failedVerification

    var errorDescription: String? {
        "StoreKit 交易验证失败。 / StoreKit transaction verification failed."
    }
}
