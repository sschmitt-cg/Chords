// FretboardVisualizer — guitar fretboard 0–12 frets, tuning-aware
// Reads guitarTuning from the store (index 0 = high E, index 5 = low E).
// Highlights scale/chord/note tones by pitch class color.

import { useTonalStore } from '../../store/index'
import { pcColorVar, wrap } from '../../theory/index'
import { computeGuitarVoicings } from '../../theory/voicings'
import VoicingNavigator from '../VoicingNavigator/index'
import styles from './FretboardVisualizer.module.css'

const FRET_COUNT = 13  // frets 0–12
const STRING_COUNT = 6
const MARKER_FRETS = [3, 5, 7, 9, 12]

type HighlightRole = 'root' | 'tone' | 'scale' | 'off' | 'muted'

export default function FretboardVisualizer() {
  const {
    currentScale,
    harmonyRows,
    selectedChordIndex,
    selectedNotePc,
    globalHarmonyMax,
    rowHarmonyMaxOverrides,
    guitarTuning,
    guitarVoicingIndex,
    setSelectedNote,
    setSelectedChord,
    setGuitarVoicingIndex,
  } = useTonalStore()

  const scalePcs = new Set(currentScale.pitchClasses)

  const selectedRow = selectedChordIndex !== null
    ? harmonyRows.find(r => r.index === selectedChordIndex) ?? null
    : null

  const effectiveMax = selectedRow
    ? (rowHarmonyMaxOverrides.get(selectedRow.index) ?? globalHarmonyMax)
    : globalHarmonyMax

  // Compute guitar voicings when a chord is selected
  const voicings = selectedRow ? computeGuitarVoicings(selectedRow, effectiveMax, guitarTuning) : []
  const safeVoicingIndex = voicings.length > 0
    ? Math.min(guitarVoicingIndex, voicings.length - 1)
    : 0
  const activeVoicing = voicings[safeVoicingIndex] ?? null

  const chordPcs: Set<number> = selectedRow
    ? new Set(selectedRow.notes.filter(n => n.degree <= effectiveMax).map(n => n.pc))
    : new Set()
  const chordRootPc = selectedRow?.notes.find(n => n.degree === 1)?.pc ?? null

  // In voicing mode, build a per-string lookup: stringIndex → fret or null (muted)
  // stringIndex 0 = high E; this matches guitarTuning indexing.
  const voicingFretMap: Map<number, number | null> = new Map()
  if (activeVoicing) {
    activeVoicing.frets.forEach((fret, si) => {
      voicingFretMap.set(si, fret)
    })
  }

  function getRole(pc: number, stringIdx: number, fret: number): HighlightRole {
    if (activeVoicing) {
      const assignedFret = voicingFretMap.get(stringIdx)
      if (assignedFret === null) {
        // String is explicitly muted in this voicing — show nothing
        return 'off'
      }
      if (assignedFret === fret) {
        // This is exactly the fret prescribed by the voicing
        return pc === chordRootPc ? 'root' : 'tone'
      }
      // Not the active fret — fade to scale or off
      if (scalePcs.has(pc)) return 'scale'
      return 'off'
    }

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

  function handleDotClick(pc: number) {
    if (!scalePcs.has(pc)) return
    if (selectedNotePc === pc) {
      setSelectedNote(null)
    } else {
      setSelectedNote(pc)
      if (selectedChordIndex !== null) setSelectedChord(null)
    }
  }

  function handlePrevVoicing() {
    setGuitarVoicingIndex(Math.max(0, safeVoicingIndex - 1))
  }

  function handleNextVoicing() {
    setGuitarVoicingIndex(Math.min(voicings.length - 1, safeVoicingIndex + 1))
  }

  // guitarTuning[0] = high E (top string visually), guitarTuning[5] = low E (bottom)
  // For display we render strings top-to-bottom, so string index 0 is at the top.

  return (
    <div className={styles.wrapper} aria-label="Guitar fretboard">
      <div
        className={styles.shell}
        style={{
          '--string-count': STRING_COUNT,
          '--fret-count': FRET_COUNT,
        } as React.CSSProperties}
      >
        {/* ---- Fret markers (dots between frets) ---- */}
        <div className={styles.markerLayer} aria-hidden="true">
          {MARKER_FRETS.map(fret => {
            // Midpoint of slot N = (N + 0.5) / fretCount. Slot 0 is the open-string area.
            const markerPos = fret + 0.5
            if (fret === 12) {
              return (
                <React.Fragment key={fret}>
                  <div
                    className={styles.marker}
                    style={{ '--marker-pos': markerPos, '--marker-y': '33%' } as React.CSSProperties}
                  />
                  <div
                    className={styles.marker}
                    style={{ '--marker-pos': markerPos, '--marker-y': '67%' } as React.CSSProperties}
                  />
                </React.Fragment>
              )
            }
            return (
              <div
                key={fret}
                className={styles.marker}
                style={{ '--marker-pos': markerPos, '--marker-y': '50%' } as React.CSSProperties}
              />
            )
          })}
        </div>

        {/* ---- Strings + note dots ---- */}
        {Array.from({ length: STRING_COUNT }, (_, stringIdx) => {
          const openMidi = guitarTuning[stringIdx]
          const openPc = wrap(openMidi, 12)

          return (
            <div
              key={stringIdx}
              className={styles.string}
              style={{ '--string-index': stringIdx } as React.CSSProperties}
            >
              {/* String line */}
              <div className={styles.stringLine} aria-hidden="true" />

              {/* Note dots for each fret */}
              {Array.from({ length: FRET_COUNT }, (_, fret) => {
                const pc = wrap(openPc + fret, 12)
                const midi = openMidi + fret
                const role = getRole(pc, stringIdx, fret)
                const isOpen = fret === 0

                return (
                  <div
                    key={fret}
                    className={styles.fretSlot}
                    style={{ '--fret-index': fret } as React.CSSProperties}
                  >
                    {/* Fret wire — nut rendered as its own class so styles don't conflict */}
                    {!isOpen && (
                      <div className={fret === 1 ? styles.nut : styles.fretWire} aria-hidden="true" />
                    )}

                    {/* Note dot — only rendered when role is not 'off' */}
                    {role !== 'off' && (
                      <button
                        className={[
                          styles.dot,
                          styles[`role_${role}`],
                          isOpen ? styles.dotOpen : '',
                        ].join(' ')}
                        style={{ '--pc-color': pcColorVar(pc) } as React.CSSProperties}
                        data-pc={pc}
                        data-midi={midi}
                        aria-label={`String ${stringIdx + 1}, fret ${fret}, MIDI ${midi}`}
                        onClick={() => handleDotClick(pc)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

      </div>

      {selectedRow && (
        <VoicingNavigator
          index={safeVoicingIndex}
          total={voicings.length}
          onPrev={handlePrevVoicing}
          onNext={handleNextVoicing}
        />
      )}
    </div>
  )
}

// React is needed for JSX Fragment
import React from 'react'
