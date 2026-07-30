import SwiftUI

struct ContentView: View {
    var body: some View {
        LensLibraryWebView()
            .ignoresSafeArea(.container, edges: .bottom)
    }
}

#Preview {
    ContentView()
}
