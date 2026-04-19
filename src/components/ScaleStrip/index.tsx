// ScaleStrip — chromatic 12-position proportional layout
// Active scale tones = full-height tiles; inactive = reduced grey tiles.
// Tile horizontal center is proportional to semitone distance from mode root.

import { useRef, useCallback } from 'react'
import { useTonalStore } from '../../store/index'
import { useAudio } from '../../hooks/useAudio'
import { computeRomans, pcColorVar, wrap, ENHARMONIC_OPTIONS } from '../../theory/index'
import styles from './ScaleStrip.module.css'

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function pcName(pc: number, enharmonicPrefs: Record<number, 'sharp' | 'flat'>): string {
  const norm = wrap(pc, 12)
  const opt = ENHARMONIC_OPTIONS[norm]
  if (!opt) return SHARP_NAMES[norm]
  const pref = enharmonicPrefs[norm]
  if (pref === 'flat') return FLAT_NAMES[norm]
  if (pref === 'sharp') return SHARP_NAMES[norm]
  return FLAT_NAMES[norm]
}

// Key change swipe gesture constants
const SWIPE_THRESHOLD_PX = 30

export default function ScaleStrip() {
  const {
    currentModeNotes,
    currentModeRootPc,
    currentKeyPc,
    enharmonicPrefs,
    selectedNotePc,
    selectedChordIndex,
    setSelectedNote,
    setSelectedChord,
    setKey,
  } = useTonalStore()
  const { playScale, playNote } = useAudio()

  const romans = computeRomans(currentModeNotes)

  // Swipe gesture state
  const swipeStartX = useRef<number | null>(null)
  const swipeMoved = useRef(false)

  const handleStripPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    swipeStartX.current = e.clientX
    swipeMoved.current = false
  }, [])

  const handleStripPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (swipeStartX.current === null) return
    const delta = e.clientX - swipeStartX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD_PX) {
      swipeMoved.current = true
      const direction = delta > 0 ? -1 : 1
      setKey(wrap(currentKeyPc + direction, 12))
      swipeStartX.current = e.clientX
    }
  }, [currentKeyPc, setKey])

  const handleStripPointerUp = useCallback(() => {
    swipeStartX.current = null
  }, [])

  function handleTileTap(pc: number, isRoot: boolean) {
    if (swipeMoved.current) return
    if (selectedNotePc === pc) {
      setSelectedNote(null)
    } else {
      setSelectedNote(pc)
      if (selectedChordIndex !== null) setSelectedChord(null)
      if (isRoot) {
        playScale()
      } else {
        playNote(pc)
      }
    }
  }

  // Build the 12 chromatic positions relative to mode root
  // position i = (modeRoot + i) % 12
  const positions = Array.from({ length: 12 }, (_, i) => {
    const pc = wrap(currentModeRootPc + i, 12)
    const scaleIdx = currentModeNotes.indexOf(pc)
    const isActive = scaleIdx !== -1
    const isRoot = i === 0
    return { pc, semitone: i, isActive, isRoot, scaleIdx }
  })

  // Aug 2nd brackets: consecutive active tiles with 3 semitones between them
  // Find pairs of adjacent scale-tone positions (in order) separated by 3 semitones
  const activeSemitones = positions
    .filter(p => p.isActive)
    .map(p => p.semitone)

  const augPairs: Array<{ from: number; to: number }> = []
  for (let i = 0; i < activeSemitones.length; i++) {
    const curr = activeSemitones[i]
    const next = activeSemitones[(i + 1) % activeSemitones.length]
    const gap = next > curr ? next - curr : (next + 12) - curr
    if (gap === 3) augPairs.push({ from: curr, to: next > curr ? next : next + 12 })
  }
  // Only include aug pairs where both endpoints are within 0–11
  const inRangeAugPairs = augPairs.filter(p => p.from >= 0 && p.from <= 11 && p.to <= 11)

  return (
    <div
      className={styles.strip}
      onPointerDown={handleStripPointerDown}
      onPointerMove={handleStripPointerMove}
      onPointerUp={handleStripPointerUp}
    >
      <div className={styles.container}>
        {positions.map(({ pc, semitone, isActive, isRoot, scaleIdx }) => {
          // Center position as % of container width
          const centerPct = (semitone / 12) * 100

          if (isActive) {
            const roman = romans[scaleIdx]
            const name = pcName(pc, enharmonicPrefs)
            const isSelected = selectedNotePc === pc
            return (
              <button
                key={semitone}
                className={[
                  styles.activeTile,
                  isRoot ? styles.activeTileRoot : '',
                  isSelected ? styles.activeTileSelected : '',
                ].join(' ').trim()}
                style={{
                  left: `calc(${centerPct}% - 26px)`,
                  '--pc-color': pcColorVar(pc),
                } as React.CSSProperties}
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
            const name = pcName(pc, enharmonicPrefs)
            return (
              <div
                key={semitone}
                className={styles.inactiveTile}
                style={{ left: `calc(${centerPct}% - 16px)` }}
                aria-hidden="true"
              >
                <span className={styles.inactiveName}>{name}</span>
              </div>
            )
          }
        })}

        {/* Aug 2nd brackets */}
        {inRangeAugPairs.map(({ from, to }) => {
          const leftPct = (from / 12) * 100
          const rightPct = (to / 12) * 100
          // left edge = center of first tile + half tile width (26px)
          // right edge = center of second tile - half tile width (26px)
          return (
            <div
              key={`aug-${from}-${to}`}
              className={styles.augBracket}
              style={{
                left: `calc(${leftPct}% + 26px)`,
                width: `calc(${rightPct - leftPct}% - 52px)`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
