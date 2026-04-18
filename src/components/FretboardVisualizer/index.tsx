// FretboardVisualizer — guitar fretboard 0–12 frets, tuning-aware
// Reads guitarTuning from the store (index 0 = high E, index 5 = low E).
// Highlights scale/chord/note tones by pitch class color.

import { useTonalStore } from '../../store/index'
import { pcColorVar, wrap } from '../../theory/index'
import styles from './FretboardVisualizer.module.css'

const FRET_COUNT = 13  // frets 0–12
const STRING_COUNT = 6
const MARKER_FRETS = [3, 5, 7, 9, 12]

type HighlightRole = 'root' | 'tone' | 'scale' | 'off'

export default function FretboardVisualizer() {
  const {
    currentScale,
    harmonyRows,
    selectedChordIndex,
    selectedNotePc,
    globalHarmonyMax,
    guitarTuning,
    setSelectedNote,
    setSelectedChord,
  } = useTonalStore()

  const scalePcs = new Set(currentScale.pitchClasses)

  const selectedRow = selectedChordIndex !== null
    ? harmonyRows.find(r => r.index === selectedChordIndex) ?? null
    : null

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

  function handleDotClick(pc: number) {
    if (!scalePcs.has(pc)) return
    if (selectedNotePc === pc) {
      setSelectedNote(null)
    } else {
      setSelectedNote(pc)
      if (selectedChordIndex !== null) setSelectedChord(null)
    }
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
            // Position marker in the middle of the fret span (between fret-1 and fret lines)
            const markerPos = fret === 12 ? fret - 0.5 : fret - 0.5
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
                const role = getRole(pc)
                const isOpen = fret === 0

                return (
                  <div
                    key={fret}
                    className={styles.fretSlot}
                    style={{ '--fret-index': fret } as React.CSSProperties}
                  >
                    {/* Fret wire */}
                    {!isOpen && (
                      <div className={[styles.fretWire, fret === 1 ? styles.nut : ''].join(' ')} aria-hidden="true" />
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
    </div>
  )
}

// React is needed for JSX Fragment
import React from 'react'
