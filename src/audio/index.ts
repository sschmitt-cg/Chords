// Web Audio engine — migrated from script.js
// Module-level singleton: one AudioContext for the lifetime of the app.
// Safe to use in Capacitor WKWebView — Web Audio API is fully supported.

// ---- Voice tracking ----

interface Voice {
  disposed: boolean
  stop: () => void
}

// ---- Timing constants (seconds) ----

export const SCALE_GAP        = 0.22
export const SCALE_DUR        = 0.32
export const CHORD_TONE_GAP   = 0.18
export const CHORD_TONE_DUR   = 0.30
export const STRUM_GAP        = 0.02
export const STRUM_DUR        = 0.90
const AUDIO_MASTER_GAIN       = 0.2

// ---- Module-level audio state ----

let audioCtx:       AudioContext | null = null
let masterGain:     GainNode | null = null
let limiter:        DynamicsCompressorNode | null = null
// iOS routes audio through a MediaStream + <audio> element to unlock playback
let audioMediaDest: MediaStreamAudioDestinationNode | null = null
let audioOutEl:     HTMLAudioElement | null = null
let audioWarmupDone = false
let audioUnlockInFlight: Promise<boolean> | null = null
let playbackToken = 0
let activeVoices: Voice[] = []

// ---- Platform detection ----

export const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)

// ---- Core graph setup ----

export function ensureAudio(): boolean {
  if (!audioCtx) {
    // webkitAudioContext is the legacy Safari name — cast to access it without TS error
    const Ctx = window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return false
    try {
      audioCtx = new Ctx({ latencyHint: 'interactive' })
    } catch {
      audioCtx = new Ctx()
    }

    // Master gain + brick-wall limiter keep the synth output controlled
    masterGain = audioCtx.createGain()
    limiter = audioCtx.createDynamicsCompressor()
    limiter.threshold.setValueAtTime(-18, audioCtx.currentTime)
    limiter.knee.setValueAtTime(18, audioCtx.currentTime)
    limiter.ratio.setValueAtTime(12, audioCtx.currentTime)
    limiter.attack.setValueAtTime(0.003, audioCtx.currentTime)
    limiter.release.setValueAtTime(0.25, audioCtx.currentTime)
    masterGain.connect(limiter)

    // iOS: route through a MediaStream so WKWebView actually plays audio
    if (isIOS()) {
      if (!audioMediaDest) audioMediaDest = audioCtx.createMediaStreamDestination()
      try { limiter.connect(audioMediaDest) } catch { /* already connected */ }
    } else {
      try { limiter.connect(audioCtx.destination) } catch { /* already connected */ }
    }
  }

  return true
}

function warmupAudioOnce(): void {
  if (audioWarmupDone || !audioCtx || !masterGain) return
  try {
    const warmGain = audioCtx.createGain()
    warmGain.gain.value = 0.0001
    warmGain.connect(masterGain)
    const warmOsc = audioCtx.createOscillator()
    warmOsc.connect(warmGain)
    warmOsc.start()
    warmOsc.stop(audioCtx.currentTime + 0.03)
    warmOsc.onended = () => {
      try { warmOsc.disconnect() } catch { /* ignore */ }
      try { warmGain.disconnect() } catch { /* ignore */ }
    }
    audioWarmupDone = true
  } catch { /* warmup is best-effort */ }
}

// Must be called synchronously inside a user-gesture handler on iOS
export function unlockAudioGestureSync(): void {
  if (!ensureAudio() || !audioCtx) return

  if (isIOS()) {
    if (!audioOutEl) audioOutEl = document.getElementById('audioOut') as HTMLAudioElement | null
    if (audioOutEl && audioMediaDest && audioOutEl.srcObject !== audioMediaDest.stream) {
      audioOutEl.srcObject = audioMediaDest.stream
    }
    if (audioOutEl) {
      // playsInline is a valid iOS Safari attribute not yet in the TS lib types
      ;(audioOutEl as HTMLAudioElement & { playsInline: boolean }).playsInline = true
      audioOutEl.autoplay = true
      audioOutEl.muted = false
      audioOutEl.volume = 1
      try {
        const p = audioOutEl.play()
        if (p) p.catch(e => console.warn('iOS audio element play() failed', e))
      } catch (e) {
        console.warn('iOS audioOutEl.play() threw', e)
      }
    }
  }

  try {
    const p = audioCtx.resume()
    if (p) p.catch(e => console.warn('audioCtx.resume() failed', e))
  } catch (e) {
    console.warn('audioCtx.resume() threw', e)
  }

  warmupAudioOnce()
}

export async function unlockAudioIfNeeded(): Promise<boolean> {
  if (audioUnlockInFlight) return audioUnlockInFlight
  audioUnlockInFlight = (async () => {
    if (!ensureAudio() || !audioCtx) return false
    if (isIOS()) unlockAudioGestureSync()
    if (audioCtx.state !== 'running') {
      try {
        await audioCtx.resume()
      } catch (e) {
        console.warn('audioCtx.resume() failed', e)
        if (isIOS()) return true  // iOS resume failures are often recoverable
        return false
      }
    }
    warmupAudioOnce()
    return true
  })()
  try {
    return await audioUnlockInFlight
  } finally {
    audioUnlockInFlight = null
  }
}

// ---- Mute control ----

export function setAudioMuted(muted: boolean): void {
  if (!masterGain || !audioCtx) return
  const now = audioCtx.currentTime
  const target = muted ? 0 : AUDIO_MASTER_GAIN
  masterGain.gain.cancelScheduledValues(now)
  masterGain.gain.setValueAtTime(masterGain.gain.value, now)
  masterGain.gain.linearRampToValueAtTime(target, now + 0.05)
}

// ---- Playback control ----

export function stopPlayback(): number {
  playbackToken += 1
  if (masterGain && audioCtx) {
    const now = audioCtx.currentTime
    masterGain.gain.cancelScheduledValues(now)
    masterGain.gain.setValueAtTime(masterGain.gain.value, now)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03)
    masterGain.gain.exponentialRampToValueAtTime(AUDIO_MASTER_GAIN, now + 0.08)
  }
  activeVoices.forEach(v => { try { v.stop() } catch { /* ignore */ } })
  activeVoices = []
  return playbackToken
}

export function getPlaybackToken(): number { return playbackToken }

// ---- Synthesis ----

export const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12)

export interface ScheduledNote {
  midi: number
  pc:   number
  dur:  number
}

export function playSynthNote(midi: number, when: number, dur = 0.18): void {
  if (!audioCtx || !masterGain) return
  if (!Number.isFinite(midi)) return

  const start = Math.max(when, audioCtx.currentTime)
  const end   = start + dur

  const gain = audioCtx.createGain()
  gain.gain.setValueAtTime(0.0001, start)

  const osc = audioCtx.createOscillator()
  osc.frequency.setValueAtTime(midiToFreq(midi), start)

  // Second oscillator one octave up adds presence
  const harmonic = audioCtx.createOscillator()
  harmonic.type = 'sine'
  harmonic.frequency.setValueAtTime(midiToFreq(midi) * 2, start)
  const harmonicGain = audioCtx.createGain()
  harmonicGain.gain.setValueAtTime(0.2, start)
  harmonic.connect(harmonicGain)
  harmonicGain.connect(gain)
  osc.connect(gain)
  gain.connect(masterGain)

  // ADSR-ish envelope for a plucked feel
  gain.gain.linearRampToValueAtTime(0.9, start + 0.01)
  gain.gain.linearRampToValueAtTime(0.35, start + 0.01 + 0.18 * 0.4)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)

  osc.start(start)
  harmonic.start(start)
  osc.stop(end + 0.05)
  harmonic.stop(end + 0.05)

  let cleanupTimer: ReturnType<typeof setTimeout> | null = null
  const nodes = [osc, harmonic, harmonicGain, gain]

  const voice: Voice = {
    disposed: false,
    stop() {
      if (voice.disposed) return
      voice.disposed = true
      if (cleanupTimer) clearTimeout(cleanupTimer)
      try { gain.gain.setTargetAtTime(0.0001, audioCtx!.currentTime, 0.01) } catch { /* ignore */ }
      ;[osc, harmonic].forEach(n => { try { n.stop() } catch { /* ignore */ } })
      nodes.forEach(n => { try { n.disconnect() } catch { /* ignore */ } })
      activeVoices = activeVoices.filter(v => v !== voice)
    },
  }

  const cleanup = () => { if (!voice.disposed) voice.stop() }
  activeVoices.push(voice)
  osc.onended = cleanup
  harmonic.onended = cleanup
  cleanupTimer = setTimeout(cleanup, Math.max(0, (end - audioCtx.currentTime + 0.2) * 1000))
}

export function playSequence(
  notes: ScheduledNote[],
  startTime: number,
  gap: number,
  token: number,
): number {
  if (!audioCtx || !masterGain) return startTime
  let last = startTime
  notes.forEach((note, idx) => {
    if (token !== playbackToken) return
    const when = startTime + gap * idx
    playSynthNote(note.midi, when, note.dur)
    last = when
  })
  return last + gap
}

// Strum is the same scheduling as sequence — the longer dur is set by the caller
export function playStrum(
  notes: ScheduledNote[],
  startTime: number,
  gap: number,
  token: number,
): number {
  return playSequence(notes, startTime, gap, token)
}

// ---- MIDI helpers ----

// Build an ascending one-octave + return MIDI sequence from pitch classes
export function buildAscendingScaleMidis(pitchClasses: number[]): number[] {
  if (!pitchClasses.length) return []
  let last = 60 + pitchClasses[0]
  const midis = [last]
  for (let i = 1; i < pitchClasses.length; i++) {
    let midi = 60 + pitchClasses[i]
    while (midi < last) midi += 12
    midis.push(midi)
    last = midi
  }
  midis.push(midis[0] + 12)
  return midis
}

// Build chord MIDI values ascending from middle C
export function buildChordMidis(pitchClasses: number[]): number[] {
  if (!pitchClasses.length) return []
  const root = 60 + pitchClasses[0]
  const result = [root]
  let prev = root
  for (let i = 1; i < pitchClasses.length; i++) {
    let midi = 60 + pitchClasses[i]
    while (midi <= prev) midi += 12
    result.push(midi)
    prev = midi
  }
  return result
}

export function getAudioContext(): AudioContext | null { return audioCtx }
