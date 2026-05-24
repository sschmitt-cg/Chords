import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './Tuner.module.css'
import { freqToMidi, midiToNoteInfo, type NoteInfo } from '../../theory/index'

const SILENCE_THRESHOLD = 0.005

// Lower bound on lag; shorter lags alias frequencies above ~1500 Hz (above guitar's high E)
const MIN_SAMPLES = 30
// Upper bound on lag; longer lags would alias below ~47 Hz, below the lowest bass guitar string
const MAX_SAMPLES = 1024

// YIN absolute threshold on the cumulative mean normalized difference function.
// 0.15 is the value used in the original paper; lower values demand a cleaner
// periodicity (rejecting more noisy frames), higher values accept weaker periods.
const YIN_THRESHOLD = 0.15

// MIDI-smoothing ring buffer length; at ~60fps this covers ~116ms — wide enough that a
// single mis-detected frame (e.g. octave alt) can't flip the displayed note, narrow
// enough that real string changes still cross the median within the test budget.
const MIDI_SMOOTHING_WINDOW = 7

// Bandpass roughly the musical range of interest: above bass rumble / mains hum,
// below mic hiss and high overtones that bias YIN toward half-period (octave alt).
const BANDPASS_HIGHPASS_HZ = 50
const BANDPASS_LOWPASS_HZ  = 1500

function median(samples: readonly number[]): number {
  const sorted = [...samples].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

// YIN pitch detector (de Cheveigné & Kawahara, 2002). Picks the first lag whose
// cumulative-mean-normalized difference dips below an absolute threshold, which is
// immune to the octave-flip / wander failure modes of unnormalized autocorrelation.
function detectPitch(buffer: Float32Array<ArrayBuffer>, sampleRate: number): number | null {
  // RMS power gate — skip if signal is nearly silent
  let rms = 0
  for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i]
  rms = Math.sqrt(rms / buffer.length)
  if (rms < SILENCE_THRESHOLD) return null

  // Window must hold both buffer[i] and buffer[i + tau] for tau up to maxTau,
  // so cap maxTau at half the buffer length.
  const window = buffer.length >> 1
  const maxTau = Math.min(MAX_SAMPLES, window)

  // d'(tau): cumulative-mean-normalized difference. d'(0) is defined as 1.
  const yin = new Float32Array(maxTau)
  yin[0] = 1
  let runningSum = 0
  for (let tau = 1; tau < maxTau; tau++) {
    let d = 0
    for (let i = 0; i < window; i++) {
      const diff = buffer[i] - buffer[i + tau]
      d += diff * diff
    }
    runningSum += d
    yin[tau] = (d * tau) / runningSum
  }

  // First tau >= MIN_SAMPLES where d'(tau) crosses below threshold; then descend
  // to the local minimum so parabolic interpolation acts on the actual valley.
  let chosenTau = -1
  let tau = MIN_SAMPLES
  while (tau < maxTau - 1) {
    if (yin[tau] < YIN_THRESHOLD) {
      while (tau + 1 < maxTau && yin[tau + 1] < yin[tau]) tau++
      chosenTau = tau
      break
    }
    tau++
  }

  if (chosenTau === -1) return null

  // Parabolic interpolation on d'(tau) around the chosen minimum
  const y1 = chosenTau > 0 ? yin[chosenTau - 1] : yin[chosenTau]
  const y2 = yin[chosenTau]
  const y3 = chosenTau < maxTau - 1 ? yin[chosenTau + 1] : yin[chosenTau]
  const denom = 2 * (2 * y2 - y1 - y3)
  const refinedTau = denom !== 0 ? chosenTau + (y1 - y3) / denom : chosenTau

  return sampleRate / refinedTau
}

interface NeedleProps {
  cents: number  // -50 to +50
}

function Needle({ cents }: NeedleProps): React.ReactElement {
  // Map cents (-50..+50) to an angle (-60..+60 degrees from 12 o'clock)
  const angleDeg = (cents / 50) * 60
  const angleRad = (angleDeg * Math.PI) / 180

  // Needle tip position (pivot at center-bottom of a 100×60 SVG arc area)
  const cx = 60
  const cy = 56
  const length = 46
  const tx = cx + length * Math.sin(angleRad)
  const ty = cy - length * Math.cos(angleRad)

  // Arc: semicircle from -60° to +60° (relative to 12 o'clock)
  // We draw from leftmost to rightmost using SVG arc notation
  const r = 50
  const startX = cx + r * Math.sin(-Math.PI / 3)
  const startY = cy - r * Math.cos(-Math.PI / 3)
  const endX = cx + r * Math.sin(Math.PI / 3)
  const endY = cy - r * Math.cos(Math.PI / 3)

  const inTune = Math.abs(cents) <= 5

  return (
    <svg
      viewBox="0 0 120 64"
      className={styles.gauge}
      aria-hidden="true"
    >
      <path
        d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`}
        fill="none"
        stroke="var(--surface-3)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {(() => {
        const zoneRad = (10 / 50) * (Math.PI / 3) // ±10 cents gives visual margin around the ±5-cent perceptual threshold
        const zs = cx + r * Math.sin(-zoneRad)
        const zy = cy - r * Math.cos(-zoneRad)
        const ze = cx + r * Math.sin(zoneRad)
        const zey = cy - r * Math.cos(zoneRad)
        return (
          <path
            d={`M ${zs} ${zy} A ${r} ${r} 0 0 1 ${ze} ${zey}`}
            fill="none"
            stroke={inTune ? 'var(--action-primary)' : 'var(--surface-3)'}
            strokeWidth="4"
            strokeLinecap="round"
            className={inTune ? styles.inTuneArc : ''}
          />
        )
      })()}
      {[-50, -25, 0, 25, 50].map((c) => {
        const a = (c / 50) * (Math.PI / 3)
        const inner = r - 6
        const outer = r + 2
        return (
          <line
            key={c}
            x1={cx + inner * Math.sin(a)}
            y1={cy - inner * Math.cos(a)}
            x2={cx + outer * Math.sin(a)}
            y2={cy - outer * Math.cos(a)}
            stroke={c === 0 ? 'var(--text-secondary)' : 'var(--card-border)'}
            strokeWidth={c === 0 ? 2 : 1}
          />
        )
      })}
      <line
        x1={cx}
        y1={cy}
        x2={tx}
        y2={ty}
        stroke={inTune ? 'var(--action-primary)' : 'var(--action-danger)'}
        strokeWidth="2"
        strokeLinecap="round"
        className={styles.needle}
      />
      <circle cx={cx} cy={cy} r="3.5" fill="var(--text-secondary)" />
    </svg>
  )
}

type TunerStatus = 'idle' | 'requesting' | 'running' | 'denied'

export default function ChromaticTuner(): React.ReactElement {
  const [status, setStatus] = useState<TunerStatus>('idle')
  const [note, setNote] = useState<NoteInfo | null>(null)

  // All mutable audio refs — never read during render
  const streamRef    = useRef<MediaStream | null>(null)
  const ctxRef       = useRef<AudioContext | null>(null)
  const analyserRef  = useRef<AnalyserNode | null>(null)
  const rafRef       = useRef<number | null>(null)
  // Float32Array<ArrayBuffer> required by getFloatTimeDomainData; new Float32Array() always uses ArrayBuffer
  const bufferRef    = useRef<Float32Array<ArrayBuffer> | null>(null)
  // Recent MIDI numbers (continuous, not rounded) — median of this buffer drives both note and cents.
  // Smoothing MIDI rather than cents means a single outlier frame can't flip the displayed note name.
  const midiBufferRef = useRef<number[]>([])

  const stopTuner = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => { /* best-effort */ })
      ctxRef.current = null
    }
    analyserRef.current = null
    bufferRef.current = null
    setNote(null)
    setStatus('idle')
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      ctxRef.current?.close().catch(() => { /* best-effort */ })
    }
  }, [])

  const startTuner = useCallback(async () => {
    setStatus('requesting')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      setStatus('denied')
      return
    }

    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    // 2048-point FFT gives us enough low-frequency resolution
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0

    // Bandpass the mic input before pitch detection: rolls off mains hum / room rumble
    // below the lowest bass string, and HF mic hiss / overtones above the highest guitar fret.
    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = BANDPASS_HIGHPASS_HZ
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = BANDPASS_LOWPASS_HZ

    const source = ctx.createMediaStreamSource(stream)
    source.connect(highpass)
    highpass.connect(lowpass)
    lowpass.connect(analyser)

    streamRef.current   = stream
    ctxRef.current      = ctx
    analyserRef.current = analyser
    bufferRef.current   = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>
    midiBufferRef.current = []

    setStatus('running')

    function tick() {
      const analyserNode = analyserRef.current
      const buf = bufferRef.current
      if (!analyserNode || !buf) return

      analyserNode.getFloatTimeDomainData(buf)
      const hz = detectPitch(buf, ctx.sampleRate)
      if (hz === null) {
        midiBufferRef.current = []
        setNote(null)
      } else {
        const buffer = midiBufferRef.current
        buffer.push(freqToMidi(hz))
        if (buffer.length > MIDI_SMOOTHING_WINDOW) buffer.shift()
        setNote(midiToNoteInfo(median(buffer)))
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const handleToggle = useCallback(() => {
    if (status === 'running') {
      stopTuner()
    } else {
      startTuner().catch(() => { /* handled inside */ })
    }
  }, [status, startTuner, stopTuner])

  function renderDisplay(): React.ReactNode {
    if (status === 'denied') {
      return (
        <div className={styles.message}>
          Microphone access denied. Check browser permissions.
        </div>
      )
    }
    if (status === 'requesting') {
      return <div className={styles.message}>Waiting for microphone…</div>
    }
    if (status === 'idle') {
      return <div className={styles.message}>Press Start to begin tuning.</div>
    }
    // running
    if (!note) {
      return (
        <>
          <div className={styles.noteDisplay}>
            <span className={styles.noteName}>—</span>
          </div>
          <Needle cents={0} />
          <div className={styles.centsDisplay}>listening…</div>
        </>
      )
    }
    const inTune = Math.abs(note.cents) <= 5
    const centsLabel = note.cents === 0
      ? '♩ in tune'
      : note.cents > 0
        ? `+${note.cents} ¢ sharp`
        : `${note.cents} ¢ flat`
    return (
      <>
        <div className={styles.noteDisplay}>
          <span className={styles.noteName}>{note.name}</span>
          <span className={styles.noteOctave}>{note.octave}</span>
        </div>
        <Needle cents={note.cents} />
        <div className={[styles.centsDisplay, inTune ? styles.centsInTune : ''].join(' ')}>
          {centsLabel}
        </div>
      </>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Chromatic Tuner</span>
        <button
          className={[styles.startStop, status === 'running' ? styles.startStopActive : ''].join(' ')}
          onClick={handleToggle}
          aria-label={status === 'running' ? 'Stop tuner' : 'Start tuner'}
          aria-pressed={status === 'running'}
        >
          {status === 'running' ? 'Stop' : 'Start'}
        </button>
      </div>

      <div className={styles.displayArea}>
        {renderDisplay()}
      </div>
    </div>
  )
}
