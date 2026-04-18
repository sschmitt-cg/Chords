// Scale strip — horizontal row of note tiles showing scale spelling + roman numerals
// Tapping the tonic plays the scale; tapping any other tile plays that note.

import { useTonalStore } from '../../store/index'
import { useAudio } from '../../hooks/useAudio'
import { computeRomans, pcColorVar } from '../../theory/index'
import styles from './ScaleStrip.module.css'

export default function ScaleStrip() {
  const {
    currentScale,
    selectedNotePc,
    selectedChordIndex,
    setSelectedNote,
    setSelectedChord,
  } = useTonalStore()
  const { playScale, playNote } = useAudio()

  const { pitchClasses, spelled } = currentScale
  const romans = computeRomans(pitchClasses)

  function handleNoteTap(pc: number, isTonic: boolean) {
    if (selectedNotePc === pc) {
      setSelectedNote(null)
    } else {
      setSelectedNote(pc)
      if (selectedChordIndex !== null) setSelectedChord(null)
      if (isTonic) {
        playScale()
      } else {
        playNote(pc)
      }
    }
  }

  return (
    <div className={styles.strip}>
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
              onClick={() => handleNoteTap(pc, isTonic)}
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
