// ScaleStrip — chromatic 12-position proportional layout
// Active and inactive tiles share the same width; inactive uses a dotted border.
// Scale description annotation appears below the strip.

import { useRef } from 'react'
import { useTonalStore } from '../../store/index'
import { useAudio } from '../../hooks/useAudio'
import { computeRomans, pcColorVar, wrap, pcName } from '../../theory/index'
import styles from './ScaleStrip.module.css'

const TILE_W = 52  // both active and inactive tiles share this width

// Horizontal swipe shifts the mode within the current family — same notes, new tonal center.
// Threshold and duration are tuned to feel deliberate (mobile MODE-knob replacement) without
// firing on incidental drift during a tap.
const SWIPE_THRESHOLD_PX = 40
const SWIPE_MAX_DURATION_MS = 800
const SWIPE_AXIS_LOCK_PX = 8

function tileLeft(semitone: number): string {
  return `calc(${semitone / 11} * (100% - ${TILE_W}px))`
}

export default function ScaleStrip() {
  const {
    currentScale,
    currentModeNotes,
    currentModeRootPc,
    modeIndex,
    currentMode,
    currentFamily,
    enharmonicPrefs,
    selectedNotePc,
    selectedChordIndex,
    setSelectedNote,
    setSelectedChord,
    setModeIndex,
  } = useTonalStore()
  const { playScale, playNote } = useAudio()

  // Gesture state — refs so renders don't churn and handlers can read/write freely.
  const gestureStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const suppressClickRef = useRef(false)

  function onPointerDown(e: React.PointerEvent) {
    gestureStartRef.current = { x: e.clientX, y: e.clientY, time: performance.now() }
  }

  function onPointerUp(e: React.PointerEvent) {
    const start = gestureStartRef.current
    gestureStartRef.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const dt = performance.now() - start.time
    if (dt > SWIPE_MAX_DURATION_MS) return
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    if (Math.abs(dx) <= Math.abs(dy)) return
    // Swipe-left advances to the next mode (carousel: contents move left, next mode in view).
    setModeIndex(modeIndex + (dx < 0 ? 1 : -1))
    suppressClickRef.current = true
  }

  function onPointerCancel() {
    gestureStartRef.current = null
  }

  function onClickCapture(e: React.MouseEvent) {
    if (suppressClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressClickRef.current = false
    }
  }

  // If the pointer moves past the axis-lock threshold horizontally, claim the gesture
  // so the page's vertical scroll doesn't fight us. touch-action: pan-y on .strip
  // already keeps vertical scroll available when the gesture stays vertical.
  function onPointerMove(e: React.PointerEvent) {
    const start = gestureStartRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > SWIPE_AXIS_LOCK_PX && Math.abs(dx) > Math.abs(dy)) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const romans = computeRomans(currentModeNotes)

  function handleTileTap(pc: number, isRoot: boolean) {
    if (selectedNotePc === pc) {
      setSelectedNote(null)
    } else {
      setSelectedNote(pc)
      if (selectedChordIndex !== null) setSelectedChord(null)
      if (isRoot) playScale()
      else playNote(pc)
    }
  }

  const positions = Array.from({ length: 12 }, (_, i) => {
    const pc = wrap(currentModeRootPc + i, 12)
    const scaleIdx = currentModeNotes.indexOf(pc)
    const isActive = scaleIdx !== -1
    const isRoot = i === 0
    // Use diatonic spelling for active tiles so Cb shows as Cb, not B, etc.
    const name = isActive ? currentScale.spelled[scaleIdx] : pcName(pc, enharmonicPrefs)
    return { pc, semitone: i, isActive, isRoot, scaleIdx, name }
  })

  const annotation = modeIndex === 0
    ? `Mode 1: ${currentMode.name} — root mode of the ${currentFamily.name} family.`
    : `Mode ${modeIndex + 1}: ${currentMode.name}. Same ${currentFamily.name} notes — tonal center shifts.`

  return (
    <div
      className={styles.strip}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
    >
      <div className={styles.container}>
        {positions.map(({ pc, semitone, isActive, isRoot, scaleIdx, name }) => {
          if (isActive) {
            const roman = romans[scaleIdx]
            const isSelected = selectedNotePc === pc
            return (
              <button
                key={semitone}
                className={[
                  styles.activeTile,
                  isRoot ? styles.activeTileRoot : '',
                  isSelected ? styles.activeTileSelected : '',
                ].join(' ').trim()}
                style={{ left: tileLeft(semitone), '--pc-color': pcColorVar(pc) } as React.CSSProperties}
                aria-label={`${name}, ${roman}`}
                aria-pressed={isSelected}
                onClick={() => handleTileTap(pc, isRoot)}
              >
                <span className={styles.roman}>{roman}</span>
                <span className={styles.noteName}>{name}</span>
                <span className={styles.colorBar} />
              </button>
            )
          } else {
            return (
              <div
                key={semitone}
                className={styles.inactiveTile}
                style={{ left: tileLeft(semitone) }}
                aria-hidden="true"
              >
                <span className={styles.inactiveName}>{name}</span>
              </div>
            )
          }
        })}
      </div>

      <p className={styles.annotation}>{annotation}</p>
    </div>
  )
}
