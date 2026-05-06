import React from 'react'
import { useTonalStore } from '../../store/index'
import { pcColorVar } from '../../theory/index'
import VoicingNavigator from '../VoicingNavigator/index'
import styles from './KeyboardVisualizer.module.css'

// White key layout: pc, midi, position-index
const WHITE_KEYS: { pc: number; midi: number }[] = [
  { pc: 0, midi: 60 }, { pc: 2, midi: 62 }, { pc: 4, midi: 64 },
  { pc: 5, midi: 65 }, { pc: 7, midi: 67 }, { pc: 9, midi: 69 }, { pc: 11, midi: 71 },
  { pc: 0, midi: 72 }, { pc: 2, midi: 74 }, { pc: 4, midi: 76 },
  { pc: 5, midi: 77 }, { pc: 7, midi: 79 }, { pc: 9, midi: 81 }, { pc: 11, midi: 83 },
]

// Black key layout — position is (whiteIndex + 1) / WHITE_COUNT expressed as a percentage,
// centering the key over the gap between white keys at that index and the next.
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

export default function KeyboardVisualizer(): React.ReactElement {
  const {
    currentScale,
    harmonyRows,
    selectedChordIndex,
    selectedNotePc,
    globalHarmonyMax,
    rowHarmonyMaxOverrides,
    keyboardVoicings,
    keyboardVoicingIndex,
    setSelectedNote,
    setSelectedChord,
    setKeyboardVoicingIndex,
  } = useTonalStore()

  const scalePcs = new Set(currentScale.pitchClasses)

  const selectedRow = selectedChordIndex !== null
    ? harmonyRows.find(r => r.index === selectedChordIndex) ?? null
    : null

  const effectiveMax = selectedRow
    ? (rowHarmonyMaxOverrides.get(selectedRow.index) ?? globalHarmonyMax)
    : globalHarmonyMax

  const voicings = keyboardVoicings
  const voicingActive = keyboardVoicingIndex >= 0 && voicings.length > 0
  const safeVoicingIndex = voicingActive
    ? Math.min(keyboardVoicingIndex, voicings.length - 1)
    : 0
  const activeVoicing = voicingActive ? (voicings[safeVoicingIndex] ?? null) : null

  const voicingMidiSet: Set<number> = activeVoicing
    ? new Set(activeVoicing.midiNotes)
    : new Set()

  const chordPcs: Set<number> = selectedRow
    ? new Set(selectedRow.notes.filter(n => n.degree <= effectiveMax).map(n => n.pc))
    : new Set()
  const chordRootPc = selectedRow?.notes.find(n => n.degree === 1)?.pc ?? null

  function getRole(pc: number, midi: number): HighlightRole {
    if (chordPcs.size) {
      if (activeVoicing) {
        // Only voicing notes shown; scale context is noise when viewing a fingering
        if (voicingMidiSet.has(midi)) {
          return pc === chordRootPc ? 'root' : 'tone'
        }
        return 'off'
      }
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

  function handlePrevVoicing() {
    setKeyboardVoicingIndex(keyboardVoicingIndex <= 0 ? -1 : keyboardVoicingIndex - 1)
  }

  function handleNextVoicing() {
    setKeyboardVoicingIndex(Math.min(voicings.length - 1, keyboardVoicingIndex + 1))
  }

  return (
    <div className={styles.wrapper} aria-label="Piano keyboard">
      <div className={styles.shell} style={{ '--white-count': WHITE_COUNT } as React.CSSProperties}>

        {/* White keys */}
        {WHITE_KEYS.map(({ pc, midi }, idx) => {
          const role = getRole(pc, midi)
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
            </div>
          )
        })}

        {/* Black keys — absolutely positioned */}
        {BLACK_KEYS.map(({ pc, midi, whiteIndex }) => {
          const role = getRole(pc, midi)
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
            </div>
          )
        })}

      </div>

      {selectedRow && (
        <VoicingNavigator
          index={keyboardVoicingIndex}
          total={voicings.length}
          label={voicings[safeVoicingIndex]?.label}
          onPrev={handlePrevVoicing}
          onNext={handleNextVoicing}
        />
      )}
    </div>
  )
}
