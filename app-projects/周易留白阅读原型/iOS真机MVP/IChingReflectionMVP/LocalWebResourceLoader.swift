import Foundation

actor LocalWebResourceLoader {
    func load(_ requestURL: URL?) -> (status: Int, data: Data, mimeType: String) {
        let requestedPath = requestURL?.path.removingPercentEncoding ?? ""
        let relativePath = requestedPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let safePath = relativePath.isEmpty ? "index.html" : relativePath

        guard !safePath.split(separator: "/").contains(".."),
              isAllowed(safePath),
              let root = Bundle.main.resourceURL?.appending(path: "Web", directoryHint: .isDirectory) else {
            return (404, Data(), "text/plain; charset=utf-8")
        }

        let fileURL = root.appending(path: safePath).standardizedFileURL
        let rootPath = root.standardizedFileURL.path
        guard fileURL.path == rootPath || fileURL.path.hasPrefix(rootPath + "/") else {
            return (404, Data(), "text/plain; charset=utf-8")
        }

        do {
            let data = try Data(contentsOf: fileURL, options: .mappedIfSafe)
            return (200, data, mimeType(for: fileURL.pathExtension))
        } catch {
            return (404, Data(), "text/plain; charset=utf-8")
        }
    }

    private func isAllowed(_ path: String) -> Bool {
        let rootFiles: Set<String> = [
            "index.html", "styles.css", "app.js", "iching-core.js",
            "reflection-prompts.js", "reflection-store.js", "soundscape.js"
        ]
        return rootFiles.contains(path) || path.hasPrefix("assets/") || path.hasPrefix("content/")
    }

    private func mimeType(for extensionName: String) -> String {
        switch extensionName.lowercased() {
        case "html": "text/html; charset=utf-8"
        case "css": "text/css; charset=utf-8"
        case "js", "mjs": "text/javascript; charset=utf-8"
        case "json": "application/json; charset=utf-8"
        case "txt": "text/plain; charset=utf-8"
        case "svg": "image/svg+xml"
        case "png": "image/png"
        case "jpg", "jpeg": "image/jpeg"
        case "webp": "image/webp"
        case "woff": "font/woff"
        case "woff2": "font/woff2"
        default: "application/octet-stream"
        }
    }
}
