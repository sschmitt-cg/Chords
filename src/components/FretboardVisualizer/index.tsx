import React, { useState } from 'react'
import { useTonalStore } from '../../store/index'
import { pcColorVar, wrap, SHARP_NAMES } from '../../theory/index'
import VoicingNavigator from '../VoicingNavigator/index'
import TuningSelector from '../TuningSelector/index'
import styles from './FretboardVisualizer.module.css'

const FRET_COUNT = 13  // frets 0–12
const STRING_COUNT = 6
const MARKER_FRETS = [3, 5, 7, 9, 12]

type HighlightRole = 'root' | 'tone' | 'scale' | 'off' | 'muted'

export default function FretboardVisualizer(): React.ReactElement {
  const {
    currentScale,
    harmonyRows,
    selectedChordIndex,
    selectedNotePc,
    globalHarmonyMax,
    rowHarmonyMaxOverrides,
    guitarTuning,
    guitarVoicings,
    guitarVoicingIndex,
    setSelectedNote,
    setSelectedChord,
    setGuitarVoicingIndex,
  } = useTonalStore()

  const [tuningModalOpen, setTuningModalOpen] = useState(false)

  const scalePcs = new Set(currentScale.pitchClasses)

  const selectedRow = selectedChordIndex !== null
    ? harmonyRows.find(r => r.index === selectedChordIndex) ?? null
    : null

  const effectiveMax = selectedRow
    ? (rowHarmonyMaxOverrides.get(selectedRow.index) ?? globalHarmonyMax)
    : globalHarmonyMax

  const voicings = guitarVoicings
  const voicingActive = guitarVoicingIndex >= 0 && voicings.length > 0
  const safeVoicingIndex = voicingActive
    ? Math.min(guitarVoicingIndex, voicings.length - 1)
    : 0
  const activeVoicing = voicingActive ? (voicings[safeVoicingIndex] ?? null) : null

  const chordPcs: Set<number> = selectedRow
    ? new Set(selectedRow.notes.filter(n => n.degree <= effectiveMax).map(n => n.pc))
    : new Set()
  const chordRootPc = selectedRow?.notes.find(n => n.degree === 1)?.pc ?? null

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
        return fret === 0 ? 'muted' : 'off'
      }
      if (assignedFret === fret) {
        return pc === chordRootPc ? 'root' : 'tone'
      }
      // Only voicing positions shown; scale context is noise when viewing a fingering
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
    setGuitarVoicingIndex(guitarVoicingIndex <= 0 ? -1 : guitarVoicingIndex - 1)
  }

  function handleNextVoicing() {
    setGuitarVoicingIndex(Math.min(voicings.length - 1, guitarVoicingIndex + 1))
  }

  let description: string
  if (!selectedRow) {
    description = 'all scale notes, root squared'
  } else if (guitarVoicingIndex < 0) {
    description = 'all chord notes, root squared'
  } else {
    description = `voicing ${guitarVoicingIndex + 1} of ${voicings.length}, root squared`
  }

  return (
    <>
    {tuningModalOpen && (
      <div
        className={styles.tuningOverlay}
        role="dialog"
        aria-modal="true"
        aria-label="Tuning selector"
        onClick={() => setTuningModalOpen(false)}
      >
        <div
          className={styles.tuningModal}
          onClick={(e) => e.stopPropagation()}
        >
          <TuningSelector onSelect={() => setTuningModalOpen(false)} />
          <button
            className={styles.tuningModalClose}
            aria-label="Close tuning selector"
            onClick={() => setTuningModalOpen(false)}
          >
            ✕
          </button>
        </div>
      </div>
    )}
    <div className={styles.wrapper} aria-label="Guitar fretboard">
      <div className={styles.fretboardRow}>
        <div className={styles.stringLabels} aria-label="Open string notes, tap to change tuning">
          {Array.from({ length: STRING_COUNT }, (_, stringIdx) => {
            const midi = guitarTuning[stringIdx]
            const pc = wrap(midi, 12)
            const name = SHARP_NAMES[pc]
            return (
              <button
                key={stringIdx}
                className={styles.stringLabel}
                style={{ '--pc-color': pcColorVar(pc) } as React.CSSProperties}
                aria-label={`String ${stringIdx + 1}: ${name}. Tap to change tuning.`}
                onClick={() => setTuningModalOpen(true)}
              >
                {name}
              </button>
            )
          })}
        </div>
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

                    {/* Muted string X — only at open slot, non-interactive */}
                    {role === 'muted' && (
                      <div className={[styles.dot, styles.role_muted, styles.dotOpen].join(' ')} aria-hidden="true" />
                    )}

                    {/* Note dot — only rendered when role is not 'off' or 'muted' */}
                    {role !== 'off' && role !== 'muted' && (
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

      <div className={styles.navOverlay}>
        <VoicingNavigator
          description={description}
          index={guitarVoicingIndex}
          total={selectedRow ? voicings.length : 0}
          onPrev={handlePrevVoicing}
          onNext={handleNextVoicing}
        />
      </div>
    </div>
    </>
  )
}
