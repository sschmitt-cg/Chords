// Metronome — BPM control, time signature, tap tempo, downbeat accent, beat indicator.
// Uses the Web Audio clock pattern: a setTimeout-based scheduler loop fires every
// ~60 ms and schedules oscillator bursts a fixed lookahead window ahead of currentTime.
// This keeps timing rock-solid regardless of JS thread jank.

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ensureAudio,
  getAudioContext,
  getMasterGain,
  unlockAudioGestureSync,
  unlockAudioIfNeeded,
  isIOS,
} from '../../audio/index'
import styles from './Metronome.module.css'

// ---- Constants ----

const BPM_MIN = 20
const BPM_MAX = 300
const BPM_DEFAULT = 120
// How far ahead (seconds) to schedule beats
const LOOKAHEAD_S = 0.2
// How often (ms) the scheduler fires to queue upcoming beats
const SCHEDULER_INTERVAL_MS = 60
// Gap before taps are considered a new tap sequence (ms)
const TAP_RESET_MS = 2000

const TIME_SIG_OPTIONS = [2, 3, 4, 5, 6] as const
type BeatsPerBar = (typeof TIME_SIG_OPTIONS)[number]

// ---- Helper: schedule a single click via Web Audio ----

function scheduleClick(
  ctx: AudioContext,
  time: number,
  isDownbeat: boolean,
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  // Downbeat: higher pitch + louder; off-beat: lower + softer
  osc.frequency.setValueAtTime(isDownbeat ? 1000 : 800, time)

  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(isDownbeat ? 0.45 : 0.25, time + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06)

  osc.connect(gain)
  const dest = getMasterGain() ?? ctx.destination
  gain.connect(dest)

  osc.start(time)
  osc.stop(time + 0.08)

  osc.onended = () => {
    try { osc.disconnect() } catch { /* ignore */ }
    try { gain.disconnect() } catch { /* ignore */ }
  }
}

// ---- Engine state ----
// All mutable scheduler state is co-located in one object and accessed only from
// event handlers / effects — never during render — to satisfy react-hooks/refs.

interface EngineState {
  isPlaying: boolean
  bpm: number
  beatsPerBar: number
  nextBeatTime: number
  beatIndex: number
  timerId: ReturnType<typeof setTimeout> | null
  onBeat: ((beat: number) => void) | null
}

function createEngine(): EngineState {
  return {
    isPlaying: false,
    bpm: BPM_DEFAULT,
    beatsPerBar: 4,
    nextBeatTime: 0,
    beatIndex: 0,
    timerId: null,
    onBeat: null,
  }
}

function engineTick(engine: EngineState): void {
  const ctx = getAudioContext()
  if (!ctx || !engine.isPlaying) return

  while (engine.nextBeatTime < ctx.currentTime + LOOKAHEAD_S) {
    const beatIdx = engine.beatIndex
    const isDownbeat = beatIdx === 0

    scheduleClick(ctx, engine.nextBeatTime, isDownbeat)

    // Schedule the visual indicator to fire approximately when the beat sounds
    const delayMs = Math.max(0, (engine.nextBeatTime - ctx.currentTime) * 1000)
    const capturedBeat = beatIdx
    setTimeout(() => engine.onBeat?.(capturedBeat), delayMs)

    const beatDuration = 60 / engine.bpm
    engine.nextBeatTime += beatDuration
    engine.beatIndex = (beatIdx + 1) % engine.beatsPerBar
  }

  engine.timerId = setTimeout(() => engineTick(engine), SCHEDULER_INTERVAL_MS)
}

function engineStart(engine: EngineState): void {
  const ctx = getAudioContext()
  if (!ctx) return
  engine.isPlaying = true
  engine.beatIndex = 0
  engine.nextBeatTime = ctx.currentTime + 0.05
  engineTick(engine)
}

function engineStop(engine: EngineState): void {
  engine.isPlaying = false
  if (engine.timerId !== null) {
    clearTimeout(engine.timerId)
    engine.timerId = null
  }
  engine.onBeat = null
}

function engineRestart(engine: EngineState): void {
  if (!engine.isPlaying) return
  const savedOnBeat = engine.onBeat
  engineStop(engine)
  engine.onBeat = savedOnBeat
  engineStart(engine)
}

// ---- Component ----

export default function Metronome(): React.ReactElement {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(BPM_DEFAULT)
  const [beatsPerBar, setBeatsPerBar] = useState<BeatsPerBar>(4)
  const [currentBeat, setCurrentBeat] = useState<number | null>(null)

  // Single ref holding all mutable engine state — never read during render
  const engineRef = useRef<EngineState>(createEngine())

  useEffect(() => {
    const engine = engineRef.current
    return () => { engineStop(engine) }
  }, [])

  const tapTimesRef = useRef<number[]>([])

  // ---- BPM controls ----

  const changeBpm = useCallback((next: number) => {
    const clamped = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(next)))
    setBpm(clamped)
    engineRef.current.bpm = clamped
    engineRestart(engineRef.current)
  }, [])

  // ---- Tap tempo ----

  const handleTap = useCallback(() => {
    const now = performance.now()
    const taps = tapTimesRef.current

    // Discard stale taps older than TAP_RESET_MS
    if (taps.length > 0 && now - taps[taps.length - 1] > TAP_RESET_MS) {
      tapTimesRef.current = []
    }

    tapTimesRef.current.push(now)
    if (tapTimesRef.current.length > 6) tapTimesRef.current.shift()

    if (tapTimesRef.current.length >= 2) {
      const intervals = tapTimesRef.current
        .slice(1)
        .map((t, idx) => t - tapTimesRef.current[idx])
      const avgMs = intervals.reduce((sum, v) => sum + v, 0) / intervals.length
      if (avgMs > 0) changeBpm(60000 / avgMs)
    }
  }, [changeBpm])

  // ---- Time signature ----

  const handleTimeSig = useCallback((beats: BeatsPerBar) => {
    setBeatsPerBar(beats)
    engineRef.current.beatsPerBar = beats
    engineRestart(engineRef.current)
  }, [])

  // ---- Start / Stop ----

  const togglePlayback = useCallback(() => {
    const engine = engineRef.current
    if (engine.isPlaying) {
      engineStop(engine)
      setIsPlaying(false)
      setCurrentBeat(null)
    } else {
      if (!ensureAudio()) return
      // iOS: AudioContext must be resumed synchronously inside a gesture handler
      unlockAudioGestureSync()
      if (!isIOS()) {
        unlockAudioIfNeeded().catch(() => { /* best-effort */ })
      }
      engine.onBeat = setCurrentBeat
      engineStart(engine)
      setIsPlaying(true)
    }
  }, [])

  // ---- Render ----

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Metronome</span>
        <button
          className={[styles.startStop, isPlaying ? styles.startStopActive : ''].join(' ')}
          onClick={togglePlayback}
          aria-label={isPlaying ? 'Stop metronome' : 'Start metronome'}
          aria-pressed={isPlaying}
        >
          {isPlaying ? 'Stop' : 'Start'}
        </button>
      </div>

      <div className={styles.bpmRow}>
        <button
          className={styles.bpmBtn}
          onClick={() => changeBpm(bpm - 1)}
          onContextMenu={(e) => { e.preventDefault(); changeBpm(bpm - 10) }}
          aria-label="Decrease BPM"
          title="Click: –1  |  Right-click: –10"
        >
          −
        </button>
        <div className={styles.bpmDisplay}>
          <span className={styles.bpmValue}>{bpm}</span>
          <span className={styles.bpmLabel}>BPM</span>
        </div>
        <button
          className={styles.bpmBtn}
          onClick={() => changeBpm(bpm + 1)}
          onContextMenu={(e) => { e.preventDefault(); changeBpm(bpm + 10) }}
          aria-label="Increase BPM"
          title="Click: +1  |  Right-click: +10"
        >
          +
        </button>
      </div>

      <div className={styles.sliderRow}>
        <input
          type="range"
          className={styles.tempoSlider}
          min={BPM_MIN}
          max={BPM_MAX}
          value={bpm}
          onChange={(e) => changeBpm(Number(e.target.value))}
          aria-label="Tempo slider"
        />
      </div>

      <button className={styles.tapBtn} onClick={handleTap} aria-label="Tap tempo">
        Tap Tempo
      </button>

      <div className={styles.timeSigRow}>
        <span className={styles.timeSigLabel}>Beats</span>
        <div className={styles.timeSigOptions}>
          {TIME_SIG_OPTIONS.map((n) => (
            <button
              key={n}
              className={[
                styles.timeSigBtn,
                beatsPerBar === n ? styles.timeSigBtnActive : '',
              ].join(' ')}
              onClick={() => handleTimeSig(n)}
              aria-label={`${n} beats per bar`}
              aria-pressed={beatsPerBar === n}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.beatRow} aria-hidden="true">
        {Array.from({ length: beatsPerBar }, (_, i) => {
          const isActive = currentBeat === i
          const isDownbeat = i === 0
          const classNames = [
            styles.beat,
            isDownbeat ? styles.beatDownbeat : '',
            isActive && isDownbeat ? styles.beatActiveDownbeat : '',
            isActive && !isDownbeat ? styles.beatActive : '',
          ]
            .filter(Boolean)
            .join(' ')
          return <div key={i} className={classNames} />
        })}
      </div>
    </div>
  )
}
