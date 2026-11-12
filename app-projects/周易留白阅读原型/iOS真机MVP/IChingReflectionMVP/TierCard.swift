import SwiftUI

struct TierCard: View {
    let title: String
    let subtitle: String
    let features: [String]
    var isActionEnabled = true
    var action: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title2)
                .bold()
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            ForEach(features, id: \.self) { feature in
                Label(feature, systemImage: "checkmark.circle")
                    .font(.body)
            }
            if let action {
                Button("在本地测试环境继续 / Continue local test", action: action)
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 0.58, green: 0.46, blue: 0.25))
                    .frame(minHeight: 44)
                    .disabled(!isActionEnabled)
                    .accessibilityHint("Opens the Xcode local StoreKit purchase confirmation. Not a live App Store purchase.")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.white.opacity(0.045))
        .clipShape(.rect(cornerRadius: 16))
    }
}
