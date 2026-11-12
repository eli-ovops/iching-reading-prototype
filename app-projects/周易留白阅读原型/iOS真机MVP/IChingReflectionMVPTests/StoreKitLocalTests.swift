import StoreKit
import StoreKitTest
import XCTest
@testable import IChingReflectionMVP

@MainActor
final class StoreKitLocalTests: XCTestCase {
    private var session: SKTestSession!

    override func setUpWithError() throws {
        session = try SKTestSession(configurationFileNamed: "LocalProducts")
        session.resetToDefaultState()
        session.clearTransactions()
        session.disableDialogs = true
    }

    override func tearDownWithError() throws {
        session.clearTransactions()
        session = nil
    }

    private func requireConfiguredProducts() async throws -> [Product] {
        let products = try await Product.products(for: [
            EntitlementStore.lifetimeProductID,
            EntitlementStore.subscriptionProductID,
        ])
        guard products.count == 2 else {
            let message = "BLOCKED: The simulator StoreKitTest service did not bind LocalProducts.storekit; transaction-state evidence is unavailable in this environment."
            XCTFail(message)
            throw StoreKitTestBlocked.configuration(message)
        }
        return products
    }

    func testConfigurationLoadsLifetimeAndSubscriptionProducts() async throws {
        let products = try await requireConfiguredProducts()
        XCTAssertEqual(Set(products.map(\.id)), [
            EntitlementStore.lifetimeProductID,
            EntitlementStore.subscriptionProductID,
        ])
    }

    func testUnknownProductSetIsTrulyEmpty() async throws {
        _ = try await requireConfiguredProducts()
        let products = try await Product.products(for: ["missing.local.product"])
        XCTAssertTrue(products.isEmpty)
    }

    func testVerifiedLifetimePurchaseUnlocksAndFinishes() async throws {
        _ = try await requireConfiguredProducts()
        let store = EntitlementStore()
        await store.load()
        let product = try XCTUnwrap(store.lifetimeProduct)

        await store.purchase(product)

        XCTAssertEqual(store.purchaseState, .succeeded)
        XCTAssertEqual(store.level, .lifetime)
        var unfinishedProductIDs = Set<String>()
        for await result in Transaction.unfinished {
            if case .verified(let transaction) = result { unfinishedProductIDs.insert(transaction.productID) }
        }
        XCTAssertFalse(unfinishedProductIDs.contains(EntitlementStore.lifetimeProductID))
    }

    func testCancelledPurchaseDoesNotUnlock() async throws {
        _ = try await requireConfiguredProducts()
        let store = EntitlementStore()
        await store.load()
        let product = try XCTUnwrap(store.lifetimeProduct)
        try await session.setSimulatedError(.generic(.userCancelled), forAPI: .purchase)

        await store.purchase(product)

        XCTAssertEqual(store.purchaseState, .cancelled)
        XCTAssertEqual(store.level, .free)
    }

    func testFailedPurchaseDoesNotUnlock() async throws {
        _ = try await requireConfiguredProducts()
        let store = EntitlementStore()
        await store.load()
        let product = try XCTUnwrap(store.lifetimeProduct)
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .purchase)

        await store.purchase(product)

        guard case .failed = store.purchaseState else {
            return XCTFail("Expected failed purchase state")
        }
        XCTAssertEqual(store.level, .free)
    }

    func testAskToBuyReturnsPendingWithoutUnlock() async throws {
        _ = try await requireConfiguredProducts()
        let store = EntitlementStore()
        await store.load()
        let product = try XCTUnwrap(store.subscriptionProduct)
        session.askToBuyEnabled = true

        await store.purchase(product)

        XCTAssertEqual(store.purchaseState, .pending)
        XCTAssertEqual(store.level, .free)
    }

    func testRestoreWithNoTransactionRemainsFree() async throws {
        _ = try await requireConfiguredProducts()
        let store = EntitlementStore()
        await store.restore()

        XCTAssertEqual(store.level, .free)
        XCTAssertTrue(store.statusMessage?.contains("no active transaction") == true)
    }

    func testExpiredSubscriptionAndRefundedLifetimeAreRevoked() async throws {
        _ = try await requireConfiguredProducts()
        let store = EntitlementStore()
        _ = try await session.buyProduct(identifier: EntitlementStore.subscriptionProductID)
        await store.refreshEntitlements()
        XCTAssertEqual(store.level, .subscription)

        try session.expireSubscription(productIdentifier: EntitlementStore.subscriptionProductID)
        await store.refreshEntitlements()
        XCTAssertEqual(store.level, .free)

        let lifetime = try await session.buyProduct(identifier: EntitlementStore.lifetimeProductID)
        await store.refreshEntitlements()
        XCTAssertEqual(store.level, .lifetime)

        try session.refundTransaction(identifier: UInt(lifetime.id))
        await store.refreshEntitlements()
        XCTAssertEqual(store.level, .free)
    }
}

private enum StoreKitTestBlocked: LocalizedError {
    case configuration(String)

    var errorDescription: String? {
        switch self {
        case .configuration(let message): message
        }
    }
}
