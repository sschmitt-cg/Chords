// KeyboardVisualizer — two-octave piano with scale/chord/note highlights
// White keys: C D E F G A B C D E F G A B (MIDI 60–83)
// Black keys positioned relative to their white-key neighbors

import { useTonalStore } from '../../store/index'
import { pcColorVar } from '../../theory/index'
import styles from './KeyboardVisualizer.module.css'

// White key layout: pc, midi, position-index
const WHITE_KEYS: { pc: number; midi: number }[] = [
  { pc: 0, midi: 60 }, { pc: 2, midi: 62 }, { pc: 4, midi: 64 },
  { pc: 5, midi: 65 }, { pc: 7, midi: 67 }, { pc: 9, midi: 69 }, { pc: 11, midi: 71 },
  { pc: 0, midi: 72 }, { pc: 2, midi: 74 }, { pc: 4, midi: 76 },
  { pc: 5, midi: 77 }, { pc: 7, midi: 79 }, { pc: 9, midi: 81 }, { pc: 11, midi: 83 },
]

// Black key layout: pc, midi, position between white keys (fractional white-key index)
// Position is the left edge expressed as a fraction of total white keys (14)
const BLACK_KEYS: { pc: number; midi: number; whiteIndex: number }[] = [
  { pc: 1,  midi: 61, whiteIndex: 0  },
  { pc: 3,  midi: 63, whiteIndex: 1  },
  { pc: 6,  midi: 66, whiteIndex: 3  },
  { pc: 8,  midi: 68, whiteIndex: 4  },
  { pc: 10, midi: 70, whiteIndex: 5  },
  { pc: 1,  midi: 73, whiteIndex: 7  },
  { pc: 3,  midi: 75, whiteIndex: 8  },
  { pc: 6,  midi: 78, whiteIndex: 10 },
  { pc: 8,  midi: 80, whiteIndex: 11 },
  { pc: 10, midi: 82, whiteIndex: 12 },
]

const WHITE_COUNT = WHITE_KEYS.length  // 14

type HighlightRole = 'root' | 'tone' | 'scale' | 'off'

export default function KeyboardVisualizer() {
  const {
    currentScale,
    harmonyRows,
    selectedChordIndex,
    selectedNotePc,
    setSelectedNote,
    setSelectedChord,
  } = useTonalStore()

  const scalePcs = new Set(currentScale.pitchClasses)

  // Determine which pitch classes belong to the selected chord
  const selectedRow = selectedChordIndex !== null
    ? harmonyRows.find(r => r.index === selectedChordIndex) ?? null
    : null

  // Build the active chord pc set from the store's globalHarmonyMax
  const { globalHarmonyMax } = useTonalStore()
  const chordPcs: Set<number> = selectedRow
    ? new Set(selectedRow.notes.filter(n => n.degree <= globalHarmonyMax).map(n => n.pc))
    : new Set()
  const chordRootPc = selectedRow?.notes.find(n => n.degree === 1)?.pc ?? null

  function getRole(pc: number): HighlightRole {
    if (chordPcs.size) {
      if (chordPcs.has(pc)) return pc === chordRootPc ? 'root' : 'tone'
      if (scalePcs.has(pc)) return 'scale'
      return 'off'
    }
    if (selectedNotePc !== null) {
      if (pc === selectedNotePc) return 'root'
      if (scalePcs.has(pc)) return 'scale'
      return 'off'
    }
    if (scalePcs.has(pc)) {
      return pc === currentScale.pitchClasses[0] ? 'root' : 'scale'
    }
    return 'off'
  }

  function handleKeyClick(pc: number) {
    if (!scalePcs.has(pc)) return
    if (selectedNotePc === pc) {
      setSelectedNote(null)
    } else {
      setSelectedNote(pc)
      if (selectedChordIndex !== null) setSelectedChord(null)
    }
  }

  return (
    <div className={styles.wrapper} aria-label="Piano keyboard">
      <div className={styles.shell} style={{ '--white-count': WHITE_COUNT } as React.CSSProperties}>

        {/* White keys */}
        {WHITE_KEYS.map(({ pc, midi }, idx) => {
          const role = getRole(pc)
          return (
            <div
              key={midi}
              className={[
                styles.keyWhite,
                styles[`role_${role}`],
              ].join(' ')}
              style={{
                '--pc-color': pcColorVar(pc),
                '--key-index': idx,
              } as React.CSSProperties}
              data-pc={pc}
              data-midi={midi}
              role="button"
              tabIndex={scalePcs.has(pc) ? 0 : -1}
              aria-label={`MIDI ${midi}`}
              onClick={() => handleKeyClick(pc)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleKeyClick(pc) }}
            >
              {/* Dot indicator for lit keys */}
              {role !== 'off' && (
                <span
                  className={styles.dot}
                  style={{ '--pc-color': pcColorVar(pc) } as React.CSSProperties}
                />
              )}
            </div>
          )
        })}

        {/* Black keys — absolutely positioned */}
        {BLACK_KEYS.map(({ pc, midi, whiteIndex }) => {
          const role = getRole(pc)
          // Center the black key over the gap between whiteIndex and whiteIndex+1
          const leftPct = ((whiteIndex + 1) / WHITE_COUNT) * 100
          return (
            <div
              key={midi}
              className={[
                styles.keyBlack,
                styles[`role_${role}`],
              ].join(' ')}
              style={{
                '--pc-color': pcColorVar(pc),
                left: `${leftPct}%`,
              } as React.CSSProperties}
              data-pc={pc}
              data-midi={midi}
              role="button"
              tabIndex={scalePcs.has(pc) ? 0 : -1}
              aria-label={`MIDI ${midi}`}
              onClick={() => handleKeyClick(pc)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleKeyClick(pc) }}
            >
              {role !== 'off' && (
                <span
                  className={styles.dot}
                  style={{ '--pc-color': pcColorVar(pc) } as React.CSSProperties}
                />
              )}
            </div>
          )
        })}

      </div>
    </div>
  )
}
