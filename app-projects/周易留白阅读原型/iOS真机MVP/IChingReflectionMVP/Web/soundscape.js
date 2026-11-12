const PENTATONIC = [146.83, 174.61, 196, 220, 261.63, 293.66]

let audioContext = null
let masterGain = null
let ambienceTimer = null
let soundscapeGeneration = 0
let active = false
let droneNodes = []

function contextConstructor() {
  return window.AudioContext || window.webkitAudioContext
}

function createTone(frequency, startAt, duration, volume, type = 'sine') {
  if (!audioContext || !masterGain) return
  const oscillator = audioContext.createOscillator()
  const overtone = audioContext.createOscillator()
  const filter = audioContext.createBiquadFilter()
  const envelope = audioContext.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startAt)
  overtone.type = 'sine'
  overtone.frequency.setValueAtTime(frequency * 2.01, startAt)
  overtone.detune.setValueAtTime(-7, startAt)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1350, startAt)
  filter.Q.setValueAtTime(0.65, startAt)

  envelope.gain.setValueAtTime(0.0001, startAt)
  envelope.gain.exponentialRampToValueAtTime(volume, startAt + 0.11)
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  oscillator.connect(filter)
  overtone.connect(filter)
  filter.connect(envelope)
  envelope.connect(masterGain)
  oscillator.start(startAt)
  overtone.start(startAt)
  oscillator.stop(startAt + duration + 0.05)
  overtone.stop(startAt + duration + 0.05)
}

function createMetallicStrike(startAt, baseFrequency, volume) {
  if (!audioContext || !masterGain) return

  const partials = [1, 1.47, 2.09, 2.76, 3.83]
  partials.forEach((ratio, index) => {
    const oscillator = audioContext.createOscillator()
    const bandpass = audioContext.createBiquadFilter()
    const envelope = audioContext.createGain()
    const frequency = baseFrequency * ratio
    const duration = 0.16 + index * 0.075

    oscillator.type = index < 2 ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(frequency, startAt)
    oscillator.detune.setValueAtTime(index % 2 ? -9 : 7, startAt)
    bandpass.type = 'bandpass'
    bandpass.frequency.setValueAtTime(frequency, startAt)
    bandpass.Q.setValueAtTime(3.2 + index * 0.8, startAt)
    envelope.gain.setValueAtTime(0.0001, startAt)
    envelope.gain.exponentialRampToValueAtTime(volume / (1 + index * 0.72), startAt + 0.006)
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

    oscillator.connect(bandpass)
    bandpass.connect(envelope)
    envelope.connect(masterGain)
    oscillator.start(startAt)
    oscillator.stop(startAt + duration + 0.02)
  })

  const noiseDuration = 0.045
  const noiseBuffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * noiseDuration), audioContext.sampleRate)
  const channel = noiseBuffer.getChannelData(0)
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * (1 - index / channel.length)
  }
  const noise = audioContext.createBufferSource()
  const highpass = audioContext.createBiquadFilter()
  const noiseGain = audioContext.createGain()
  noise.buffer = noiseBuffer
  highpass.type = 'highpass'
  highpass.frequency.setValueAtTime(1800, startAt)
  noiseGain.gain.setValueAtTime(volume * 0.42, startAt)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + noiseDuration)
  noise.connect(highpass)
  highpass.connect(noiseGain)
  noiseGain.connect(masterGain)
  noise.start(startAt)
}

function scheduleAmbientPhrase(generation) {
  if (!active || generation !== soundscapeGeneration || !audioContext) return
  const noteIndex = Math.floor(Math.random() * PENTATONIC.length)
  const octave = Math.random() > 0.78 ? 2 : 1
  createTone(PENTATONIC[noteIndex] * octave, audioContext.currentTime + 0.08, 4.6, 0.027)
  const delay = 3800 + Math.random() * 3100
  ambienceTimer = window.setTimeout(() => scheduleAmbientPhrase(generation), delay)
}

function startDrone() {
  if (!audioContext || !masterGain) return
  droneNodes = [73.42, 110].map((frequency, index) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.value = index === 0 ? 0.012 : 0.006
    oscillator.connect(gain)
    gain.connect(masterGain)
    oscillator.start()
    return { oscillator, gain }
  })
}

export async function startSoundscape() {
  if (active && audioContext) return true
  const AudioContextClass = contextConstructor()
  if (!AudioContextClass) return false

  const generation = ++soundscapeGeneration
  audioContext = new AudioContextClass()
  await audioContext.resume()
  masterGain = audioContext.createGain()
  masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime)
  masterGain.gain.exponentialRampToValueAtTime(0.72, audioContext.currentTime + 1.8)
  masterGain.connect(audioContext.destination)
  active = true
  startDrone()
  createTone(146.83, audioContext.currentTime + 0.05, 5.2, 0.024)
  ambienceTimer = window.setTimeout(() => scheduleAmbientPhrase(generation), 2800)
  return true
}

export function stopSoundscape() {
  active = false
  ++soundscapeGeneration
  window.clearTimeout(ambienceTimer)
  ambienceTimer = null
  if (!audioContext || !masterGain) return

  const contextToClose = audioContext
  const gainToFade = masterGain
  const nodesToStop = droneNodes
  droneNodes = []
  gainToFade.gain.cancelScheduledValues(contextToClose.currentTime)
  gainToFade.gain.setValueAtTime(Math.max(gainToFade.gain.value, 0.0001), contextToClose.currentTime)
  gainToFade.gain.exponentialRampToValueAtTime(0.0001, contextToClose.currentTime + 0.75)
  window.setTimeout(() => {
    nodesToStop.forEach(({ oscillator }) => {
      try { oscillator.stop() } catch {}
    })
    contextToClose.close().catch(() => {})
    if (audioContext === contextToClose) {
      audioContext = null
      masterGain = null
    }
  }, 820)
}

export function playCoinChime(faces = []) {
  if (!active || !audioContext || !masterGain) return
  const now = audioContext.currentTime
  faces.slice(0, 3).forEach((face, index) => {
    const base = 660 + index * 34 + (face === 'heads' ? 78 : -36)
    const volume = index === 2 ? 0.052 : 0.043
    createMetallicStrike(now + index * 0.085, base, volume)
  })
}

export function playPassageChime(step = 0) {
  if (!active || !audioContext || !masterGain) return
  const note = PENTATONIC[Math.abs(step) % PENTATONIC.length]
  createTone(note, audioContext.currentTime + 0.02, 2.3, 0.021)
}

export function soundscapeSpec() {
  return {
    notes: [...PENTATONIC],
    startsMuted: true,
    externalAssets: false,
    coinSound: 'three-layer-metallic-strike'
  }
}
