import SwiftUI
import WebKit

@MainActor
final class WebViewCoordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    private let loadState: Binding<WebContentLoadState>
    private let presentPaywall: () -> Void
    private let feedbackController = NativeFeedbackController()
    private var entitlementLevel: EntitlementLevel
    private(set) var lastReloadToken = -1

    init(loadState: Binding<WebContentLoadState>, entitlementLevel: EntitlementLevel, presentPaywall: @escaping () -> Void) {
        self.loadState = loadState
        self.entitlementLevel = entitlementLevel
        self.presentPaywall = presentPaywall
    }

    func reload(_ webView: WKWebView, token: Int) {
        lastReloadToken = token
        loadState.wrappedValue = .loading

        guard let startURL = URL(string: "iching://local/index.html?variant=D&style=bronze") else {
            loadState.wrappedValue = .failed
            return
        }

        webView.load(URLRequest(url: startURL, cachePolicy: .reloadIgnoringLocalCacheData))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation?) {
        loadState.wrappedValue = .loaded
        pushEntitlement(to: webView)
    }

    func updateEntitlement(_ webView: WKWebView, level newLevel: EntitlementLevel) {
        guard entitlementLevel != newLevel else { return }
        entitlementLevel = newLevel
        pushEntitlement(to: webView)
    }

    private func pushEntitlement(to webView: WKWebView) {
        let encodedLevel = (try? JSONEncoder().encode(entitlementLevel.rawValue))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "\"free\""
        webView.evaluateJavaScript("window.__ichingSetEntitlementLevel?.(\(encodedLevel));") { _, _ in }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation?, withError error: any Error) {
        loadState.wrappedValue = .failed
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation?, withError error: any Error) {
        loadState.wrappedValue = .failed
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        switch message.name {
        case "haptics":
            guard let pattern = message.body as? String else { return }
            feedbackController.playHaptic(pattern)
        case "coinAudio":
            feedbackController.handleCoinAudioMessage(message.body)
        case "commerce":
            guard
                let payload = message.body as? [String: Any],
                payload["action"] as? String == "present-paywall"
            else { return }
            presentPaywall()
        default:
            break
        }
    }

    func shutdown() {
        feedbackController.shutdown()
    }
}
