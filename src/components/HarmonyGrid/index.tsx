// HarmonyGrid — chord matrix: 7 scale-degree rows × extension degree columns
// Clicking a chord cell selects that chord; clicking a note cell selects that note.
// The degree header buttons (3 5 7 9 11 13) control how many extensions are shown.

import { useTonalStore } from '../../store/index'
import { useAudio } from '../../hooks/useAudio'
import { chordNameForRow, pcColorVar } from '../../theory/index'
import type { HarmonyRow, HarmonyNote } from '../../theory/types'
import styles from './HarmonyGrid.module.css'

const DEGREE_COLUMNS: { label: string; degree: number }[] = [
  { label: '3',  degree: 3  },
  { label: '5',  degree: 5  },
  { label: '7',  degree: 7  },
  { label: '9',  degree: 9  },
  { label: '11', degree: 11 },
  { label: '13', degree: 13 },
]

export default function HarmonyGrid() {
  const {
    harmonyRows,
    selectedChordIndex,
    selectedNotePc,
    globalHarmonyMax,
    rowHarmonyMaxOverrides,
    setSelectedChord,
    setGlobalHarmonyMax,
    setRowHarmonyMax,
  } = useTonalStore()
  const { playChord } = useAudio()

  if (!harmonyRows.length) {
    return (
      <div className={styles.empty}>
        Select a key and mode to see the harmony grid.
      </div>
    )
  }

  function getRowMax(rowIndex: number): number {
    return rowHarmonyMaxOverrides.get(rowIndex) ?? globalHarmonyMax
  }

  function handleChordCell(row: HarmonyRow) {
    if (selectedChordIndex === row.index) {
      setSelectedChord(null)
    } else {
      setSelectedChord(row.index)
      playChord(row.index)
    }
  }

  function handleVisibleNoteCell(row: HarmonyRow, colIdx: number) {
    const col = DEGREE_COLUMNS[colIdx]
    setRowHarmonyMax(row.index, col.degree)
    setSelectedChord(row.index)
    playChord(row.index, col.degree)
  }

  function handleGhostCell(_note: HarmonyNote, row: HarmonyRow, degree: number) {
    setRowHarmonyMax(row.index, degree)
    setSelectedChord(row.index)
    playChord(row.index, degree)
  }

  return (
    <div className={styles.wrapper}>
      {/* ---- Degree header ---- */}
      <div
        className={styles.header}
        style={{ '--col-count': DEGREE_COLUMNS.length } as React.CSSProperties}
      >
        <div className={styles.hChord} role="columnheader">Chord</div>
        {DEGREE_COLUMNS.map(col => (
          <button
            key={col.degree}
            className={[
              styles.hDegree,
              col.degree <= globalHarmonyMax ? styles.hDegreeActive : '',
              col.degree === globalHarmonyMax ? styles.hDegreeCurrent : '',
            ].join(' ').trim()}
            role="columnheader"
            aria-pressed={col.degree <= globalHarmonyMax}
            onClick={() => setGlobalHarmonyMax(col.degree)}
          >
            {col.label}
          </button>
        ))}
      </div>

      {/* ---- Rows ---- */}
      <div className={styles.body}>
        {harmonyRows.map(row => {
          const rowMax = getRowMax(row.index)
          const root = row.notes.find(n => n.degree === 1)!
          const chordLabel = chordNameForRow(row, rowMax)
          const rootColor = pcColorVar(root.pc)
          const isChordSelected = selectedChordIndex === row.index

          return (
            <div
              key={row.index}
              className={[styles.row, isChordSelected ? styles.rowSelected : ''].join(' ').trim()}
              style={{ '--row-color': rootColor } as React.CSSProperties}
              role="row"
            >
              {/* Sticky chord name cell */}
              <button
                className={[
                  styles.chordCell,
                  isChordSelected ? styles.chordCellSelected : '',
                ].join(' ').trim()}
                style={{ '--pc-color': rootColor } as React.CSSProperties}
                role="gridcell"
                aria-pressed={isChordSelected}
                aria-label={`${chordLabel}, ${row.degree}`}
                onClick={() => handleChordCell(row)}
              >
                <span className={styles.romanOverlay}>{row.degree}</span>
                <span className={styles.chordName}>{chordLabel}</span>
              </button>

              {/* Extension degree cells */}
              {DEGREE_COLUMNS.map((col, colIdx) => {
                const note = row.notes.find(n => n.degree === col.degree)
                const isVisible = col.degree <= rowMax
                const isNoteSelected = selectedNotePc === note?.pc

                if (!note) {
                  return (
                    <div
                      key={col.degree}
                      className={styles.emptyCell}
                      role="gridcell"
                    />
                  )
                }

                return (
                  <button
                    key={col.degree}
                    className={[
                      styles.noteCell,
                      isVisible ? styles.noteCellVisible : styles.noteCellGhost,
                      isNoteSelected ? styles.noteCellSelected : '',
                    ].join(' ').trim()}
                    style={{ '--pc-color': pcColorVar(note.pc) } as React.CSSProperties}
                    role="gridcell"
                    aria-pressed={isNoteSelected}
                    aria-label={`${note.note}, degree ${col.degree}`}
                    onClick={() => isVisible ? handleVisibleNoteCell(row, colIdx) : handleGhostCell(note, row, col.degree)}
                  >
                    {note.note}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
