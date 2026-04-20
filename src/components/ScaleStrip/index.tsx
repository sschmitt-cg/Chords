// ScaleStrip — chromatic 12-position proportional layout
// Active and inactive tiles share the same width; inactive uses a dotted border.
// Scale description annotation appears below the strip.

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
  } = useTonalStore()
  const { playScale, playNote } = useAudio()

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
    <div className={styles.strip}>
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
