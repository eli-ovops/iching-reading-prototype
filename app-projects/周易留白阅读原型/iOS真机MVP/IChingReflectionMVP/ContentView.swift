import SwiftUI

struct ContentView: View {
    @State private var loadState = WebContentLoadState.loading
    @State private var reloadToken = 0
    @State private var entitlementStore = EntitlementStore()
    @State private var isPresentingPaywall = ProcessInfo.processInfo.arguments.contains("--show-local-paywall")

    var body: some View {
        ZStack {
            Color(red: 8 / 255, green: 10 / 255, blue: 8 / 255)
                .ignoresSafeArea()

            LocalIChingWebView(
                loadState: $loadState,
                reloadToken: reloadToken,
                entitlementLevel: entitlementStore.bridgeLevel,
                presentPaywall: presentPaywall
            )
                .opacity(loadState == .loaded ? 1 : 0.01)
                .ignoresSafeArea()

            if loadState != .loaded {
                WebContentStatusView(loadState: loadState, retryAction: retry)
            }
        }
        .sheet(isPresented: $isPresentingPaywall) {
            PaywallView(store: entitlementStore)
        }
        .task {
            await entitlementStore.load()
        }
    }

    private func retry() {
        loadState = .loading
        reloadToken += 1
    }

    private func presentPaywall() {
        DispatchQueue.main.async {
            isPresentingPaywall = true
        }
    }
}
