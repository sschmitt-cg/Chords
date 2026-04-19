// ScaleStrip — chromatic 12-position proportional layout
// Active and inactive tiles share the same width; inactive uses a dotted border.
// Scale description annotation appears below the strip.

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

const TILE_W = 52  // both active and inactive tiles share this width

function tileLeft(semitone: number): string {
  return `calc(${semitone / 11} * (100% - ${TILE_W}px))`
}

const SWIPE_THRESHOLD_PX = 30

export default function ScaleStrip() {
  const {
    currentModeNotes,
    currentModeRootPc,
    currentKeyPc,
    modeIndex,
    currentMode,
    currentFamily,
    enharmonicPrefs,
    selectedNotePc,
    selectedChordIndex,
    setSelectedNote,
    setSelectedChord,
    setKey,
  } = useTonalStore()
  const { playScale, playNote } = useAudio()

  const romans = computeRomans(currentModeNotes)

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
      setKey(wrap(currentKeyPc + (delta > 0 ? -1 : 1), 12))
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
      if (isRoot) playScale()
      else playNote(pc)
    }
  }

  const positions = Array.from({ length: 12 }, (_, i) => {
    const pc = wrap(currentModeRootPc + i, 12)
    const scaleIdx = currentModeNotes.indexOf(pc)
    const isActive = scaleIdx !== -1
    const isRoot = i === 0
    return { pc, semitone: i, isActive, isRoot, scaleIdx }
  })

  const annotation = modeIndex === 0
    ? `Mode 1: ${currentMode.name} — root mode of the ${currentFamily.name} family.`
    : `Mode ${modeIndex + 1}: ${currentMode.name}. Same ${currentFamily.name} notes — tonal center shifts.`

  return (
    <div
      className={styles.strip}
      onPointerDown={handleStripPointerDown}
      onPointerMove={handleStripPointerMove}
      onPointerUp={handleStripPointerUp}
    >
      <div className={styles.container}>
        {positions.map(({ pc, semitone, isActive, isRoot, scaleIdx }) => {
          const name = pcName(pc, enharmonicPrefs)
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
