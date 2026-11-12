import SwiftUI

struct WebContentStatusView: View {
    let loadState: WebContentLoadState
    let retryAction: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            if loadState == .loading {
                ProgressView()
                    .tint(.white)
                    .controlSize(.large)
                    .accessibilityLabel("正在打开字里之间")

                Text("正在展开这一页")
                    .font(.headline)
                    .foregroundStyle(.white)
            } else {
                Image(systemName: "book.closed")
                    .font(.largeTitle)
                    .foregroundStyle(Color(red: 199 / 255, green: 169 / 255, blue: 104 / 255))
                    .accessibilityHidden(true)

                VStack(spacing: 8) {
                    Text("这一页暂时没有打开")
                        .font(.title3)
                        .bold()
                        .foregroundStyle(.white)

                    Text("内容仍保留在设备中，可以重新打开。")
                        .font(.body)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                }

                Button("重新打开", action: retryAction)
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 113 / 255, green: 93 / 255, blue: 49 / 255))
                    .controlSize(.large)
                    .frame(minWidth: 44, minHeight: 44)
            }
        }
        .padding(32)
        .frame(maxWidth: 360)
        .accessibilityElement(children: .contain)
    }
}
