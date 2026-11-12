import AVFoundation
import UIKit

@MainActor
final class NativeFeedbackController {
    private let liftFeedback = UIImpactFeedbackGenerator(style: .soft)
    private let coinFeedback = UIImpactFeedbackGenerator(style: .rigid)
    private let selectionFeedback = UISelectionFeedbackGenerator()
    private var coinAudioEnabled = false
    private var coinAudioPlayer: AVAudioPlayer?
    private var settlementTask: Task<Void, Never>?

    func playHaptic(_ pattern: String) {
        switch pattern {
        case "coin-lift":
            liftFeedback.prepare()
            liftFeedback.impactOccurred(intensity: 0.32)
        case "coin-settle":
            playCoinSettlement()
        case "selection":
            selectionFeedback.prepare()
            selectionFeedback.selectionChanged()
        default:
            break
        }
    }

    func handleCoinAudioMessage(_ body: Any) {
        guard let payload = body as? [String: Any], let event = payload["event"] as? String else { return }

        switch event {
        case "enabled":
            setCoinAudioEnabled(payload["value"] as? Bool ?? false)
        case "coin":
            guard coinAudioEnabled else { return }
            playNativeCoinSound(faces: payload["faces"] as? [String] ?? [])
        default:
            break
        }
    }

    func shutdown() {
        settlementTask?.cancel()
        settlementTask = nil
        setCoinAudioEnabled(false)
    }

    private func setCoinAudioEnabled(_ enabled: Bool) {
        coinAudioEnabled = enabled
        if enabled {
            activateAudioSession()
        } else {
            coinAudioPlayer?.stop()
            coinAudioPlayer = nil
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        }
    }

    private func activateAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            // 声音失败时仍保留完整起卦流程与触觉反馈。
        }
    }

    private func playNativeCoinSound(faces: [String]) {
        activateAudioSession()
        do {
            let player = try AVAudioPlayer(data: makeCoinWave(faces: faces), fileTypeHint: AVFileType.wav.rawValue)
            player.volume = 1
            player.prepareToPlay()
            coinAudioPlayer = player
            player.play()
        } catch {
            coinAudioPlayer = nil
        }
    }

    private func playCoinSettlement() {
        settlementTask?.cancel()
        settlementTask = Task { [weak self] in
            guard let self else { return }
            coinFeedback.prepare()
            coinFeedback.impactOccurred(intensity: 0.42)

            try? await Task.sleep(for: .milliseconds(85))
            guard !Task.isCancelled else { return }
            coinFeedback.prepare()
            coinFeedback.impactOccurred(intensity: 0.58)

            try? await Task.sleep(for: .milliseconds(85))
            guard !Task.isCancelled else { return }
            coinFeedback.prepare()
            coinFeedback.impactOccurred(intensity: 0.82)
        }
    }

    private func makeCoinWave(faces: [String]) -> Data {
        let sampleRate = 44_100
        let duration = 0.62
        let sampleCount = Int(Double(sampleRate) * duration)
        let strikeStarts = [0.0, 0.085, 0.17]
        var signal = [Double](repeating: 0, count: sampleCount)
        var noiseState: UInt32 = 0x49_43_48_47

        for (strikeIndex, strikeStart) in strikeStarts.enumerated() {
            let face = strikeIndex < faces.count ? faces[strikeIndex] : "tails"
            let base = 720.0 + Double(strikeIndex * 36) + (face == "heads" ? 92.0 : -38.0)
            let startSample = Int(strikeStart * Double(sampleRate))
            let partials = [(1.0, 0.58), (1.47, 0.31), (2.09, 0.21), (2.76, 0.13), (3.83, 0.08)]

            for sampleIndex in startSample..<sampleCount {
                let elapsed = Double(sampleIndex - startSample) / Double(sampleRate)
                if elapsed > 0.43 { break }
                let bodyEnvelope = exp(-elapsed * (8.6 + Double(strikeIndex) * 0.35))
                var sample = 0.0
                for (ratio, amplitude) in partials {
                    sample += sin(2 * Double.pi * base * ratio * elapsed) * amplitude * bodyEnvelope
                }

                if elapsed < 0.028 {
                    noiseState = 1_664_525 &* noiseState &+ 1_013_904_223
                    let noise = Double(Int32(bitPattern: noiseState)) / Double(Int32.max)
                    sample += noise * 0.24 * (1 - elapsed / 0.028)
                }
                signal[sampleIndex] += sample * (strikeIndex == 2 ? 0.66 : 0.52)
            }
        }

        let peak = max(signal.map(abs).max() ?? 1, 0.001)
        let samples = signal.map { value -> Int16 in
            let normalized = max(-1, min(1, value / peak * 0.92))
            return Int16(normalized * Double(Int16.max))
        }
        return makeWAVData(samples: samples, sampleRate: sampleRate)
    }

    private func makeWAVData(samples: [Int16], sampleRate: Int) -> Data {
        let dataSize = UInt32(samples.count * MemoryLayout<Int16>.size)
        var data = Data()
        data.append(contentsOf: "RIFF".utf8)
        appendLittleEndian(UInt32(36) + dataSize, to: &data)
        data.append(contentsOf: "WAVEfmt ".utf8)
        appendLittleEndian(UInt32(16), to: &data)
        appendLittleEndian(UInt16(1), to: &data)
        appendLittleEndian(UInt16(1), to: &data)
        appendLittleEndian(UInt32(sampleRate), to: &data)
        appendLittleEndian(UInt32(sampleRate * 2), to: &data)
        appendLittleEndian(UInt16(2), to: &data)
        appendLittleEndian(UInt16(16), to: &data)
        data.append(contentsOf: "data".utf8)
        appendLittleEndian(dataSize, to: &data)
        samples.forEach { appendLittleEndian(UInt16(bitPattern: $0), to: &data) }
        return data
    }

    private func appendLittleEndian<T: FixedWidthInteger>(_ value: T, to data: inout Data) {
        var littleEndian = value.littleEndian
        withUnsafeBytes(of: &littleEndian) { data.append(contentsOf: $0) }
    }
}
