import SwiftUI
import WebKit

struct LensLibraryWebView: UIViewRepresentable {
    private let localOrigin = URL(string: "https://lens-library.local")!

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground

        loadBundledLibrary(into: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if webView.url == nil {
            loadBundledLibrary(into: webView)
        }
    }

    private func loadBundledLibrary(into webView: WKWebView) {
        guard let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html"),
              let html = try? String(contentsOf: htmlURL, encoding: .utf8) else {
            webView.loadHTMLString(
                "<h1>Не удалось открыть библиотеку линз</h1><p>Файл index.html не найден в приложении.</p>",
                baseURL: localOrigin
            )
            return
        }

        // A fixed local origin keeps localStorage stable inside the app between launches.
        webView.loadHTMLString(html, baseURL: localOrigin)
    }
}
