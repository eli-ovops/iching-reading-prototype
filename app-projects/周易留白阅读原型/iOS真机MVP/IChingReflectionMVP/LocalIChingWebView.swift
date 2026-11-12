import SwiftUI
import WebKit

struct LocalIChingWebView: UIViewRepresentable {
    @Binding var loadState: WebContentLoadState
    let reloadToken: Int
    let entitlementLevel: EntitlementLevel
    let presentPaywall: () -> Void

    func makeCoordinator() -> WebViewCoordinator {
        WebViewCoordinator(loadState: $loadState, entitlementLevel: entitlementLevel, presentPaywall: presentPaywall)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        configuration.userContentController.add(context.coordinator, name: "haptics")
        configuration.userContentController.add(context.coordinator, name: "coinAudio")
        configuration.userContentController.add(context.coordinator, name: "commerce")
        configuration.setURLSchemeHandler(LocalWebSchemeHandler(), forURLScheme: "iching")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = true
        webView.backgroundColor = UIColor(red: 8 / 255, green: 10 / 255, blue: 8 / 255, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceHorizontal = false
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.scrollView.isDirectionalLockEnabled = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.keyboardDismissMode = .interactive

#if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
#endif

        context.coordinator.reload(webView, token: reloadToken)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.updateEntitlement(webView, level: entitlementLevel)
        guard context.coordinator.lastReloadToken != reloadToken else { return }
        context.coordinator.reload(webView, token: reloadToken)
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: WebViewCoordinator) {
        webView.stopLoading()
        webView.navigationDelegate = nil
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "haptics")
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "coinAudio")
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "commerce")
        coordinator.shutdown()
    }
}
