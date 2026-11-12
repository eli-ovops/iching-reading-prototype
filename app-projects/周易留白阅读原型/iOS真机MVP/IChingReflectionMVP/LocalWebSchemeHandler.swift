import Foundation
import WebKit

final class LocalWebSchemeHandler: NSObject, WKURLSchemeHandler {
    private let resourceLoader = LocalWebResourceLoader()
    private let cancellationLock = NSLock()
    private var cancelledTasks = Set<ObjectIdentifier>()

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        let taskIdentifier = ObjectIdentifier(urlSchemeTask as AnyObject)
        _ = cancellationLock.withLock {
            cancelledTasks.remove(taskIdentifier)
        }

        let requestURL = urlSchemeTask.request.url
        Task { [weak self] in
            guard let self else { return }
            let response = await resourceLoader.load(requestURL)
            finish(
                urlSchemeTask,
                status: response.status,
                data: response.data,
                mimeType: response.mimeType
            )
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        let taskIdentifier = ObjectIdentifier(urlSchemeTask as AnyObject)
        _ = cancellationLock.withLock {
            cancelledTasks.insert(taskIdentifier)
        }
    }

    @MainActor
    private func finish(_ task: WKURLSchemeTask, status: Int, data: Data, mimeType: String) {
        let taskIdentifier = ObjectIdentifier(task as AnyObject)
        let wasCancelled = cancellationLock.withLock {
            cancelledTasks.remove(taskIdentifier) != nil
        }
        guard !wasCancelled, let responseURL = task.request.url else { return }
        guard let response = HTTPURLResponse(
            url: responseURL,
            statusCode: status,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mimeType,
                "Cache-Control": "no-store"
            ]
        ) else { return }

        task.didReceive(response)
        if !data.isEmpty {
            task.didReceive(data)
        }
        task.didFinish()
    }
}
