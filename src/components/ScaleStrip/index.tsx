// Scale strip — horizontal row of note tiles showing scale spelling + roman numerals
// Tapping a tile selects that note; swiping left/right changes key by semitone.

import { useTonalStore } from '../../store/index'
import { computeRomans, pcColorVar, wrap } from '../../theory/index'
import styles from './ScaleStrip.module.css'

export default function ScaleStrip() {
  const {
    currentScale,
    currentTonicLabel,
    currentModeIndex,
    selectedNotePc,
    selectedChordIndex,
    setSelectedNote,
    setSelectedChord,
    setKey,
    setMode,
  } = useTonalStore()

  const { pitchClasses, spelled } = currentScale
  const romans = computeRomans(pitchClasses)

  function handleNoteTap(pc: number, _note: string) {
    if (selectedNotePc === pc) {
      // Deselect if tapping the already-selected note
      setSelectedNote(null)
    } else {
      setSelectedNote(pc)
      if (selectedChordIndex !== null) setSelectedChord(null)
    }
  }

  function handleKeyShift(delta: number) {
    const nextPc = wrap(pitchClasses[0] + delta, 12)
    setKey(nextPc)
  }

  function handleModeShift(delta: number) {
    setMode(wrap(currentModeIndex + delta, 7))
  }

  return (
    <div className={styles.strip}>
      {/* Header: key label + mode nav arrows */}
      <div className={styles.header}>
        <button
          className={styles.navBtn}
          aria-label="Previous key"
          onClick={() => handleKeyShift(-1)}
        >‹</button>

        <div className={styles.keyModeLabel}>
          <button className={styles.modeBtn} onClick={() => handleModeShift(-1)} aria-label="Previous mode">◂</button>
          <span className={styles.tonicLabel} style={{ color: pcColorVar(pitchClasses[0] ?? 0) }}>
            {currentTonicLabel}
          </span>
          <button className={styles.modeBtn} onClick={() => handleModeShift(1)} aria-label="Next mode">▸</button>
        </div>

        <button
          className={styles.navBtn}
          aria-label="Next key"
          onClick={() => handleKeyShift(1)}
        >›</button>
      </div>

      {/* Tile row */}
      <div className={styles.tileRow} role="list" aria-label="Scale notes">
        {spelled.map((note, idx) => {
          const pc = pitchClasses[idx]
          const isSelected = selectedNotePc === pc
          const isTonic = idx === 0
          return (
            <button
              key={idx}
              role="listitem"
              className={[
                styles.tile,
                isTonic ? styles.tonic : '',
                isSelected ? styles.selected : '',
              ].join(' ').trim()}
              style={{
                '--pc-color': pcColorVar(pc),
              } as React.CSSProperties}
              aria-label={`${note}, degree ${romans[idx]}`}
              aria-pressed={isSelected}
              onClick={() => handleNoteTap(pc, note)}
            >
              <span className={styles.roman}>{romans[idx]}</span>
              <span className={styles.note}>{note}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
