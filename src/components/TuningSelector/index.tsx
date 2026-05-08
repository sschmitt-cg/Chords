// Guitar tuning selector — preset library only (custom editor deferred to a later phase)

import type React from 'react'
import { useTonalStore } from '../../store/index'
import { SHARP_NAMES, wrap } from '../../theory/index'
import type { GuitarTuning } from '../../theory/types'
import styles from './TuningSelector.module.css'

interface TuningPreset {
  id: string
  name: string
  // MIDI values, index 0 = highest string (high E), index 5 = lowest string (low E)
  tuning: GuitarTuning
}

// String order: high→low, matching the store's GuitarTuning convention
const PRESETS: TuningPreset[] = [
  { id: 'standard',      name: 'Standard',        tuning: [64, 59, 55, 50, 45, 40] },
  { id: 'drop-d',        name: 'Drop D',           tuning: [64, 59, 55, 50, 45, 38] },
  { id: 'open-g',        name: 'Open G',           tuning: [62, 59, 55, 50, 43, 38] },
  { id: 'open-d',        name: 'Open D',           tuning: [62, 57, 54, 50, 45, 38] },
  { id: 'open-e',        name: 'Open E',           tuning: [64, 59, 56, 52, 47, 40] },
  { id: 'open-a',        name: 'Open A',           tuning: [64, 61, 57, 52, 45, 40] },
  { id: 'dadgad',        name: 'DADGAD',           tuning: [62, 57, 55, 50, 45, 38] },
  { id: 'half-step-down', name: '½ Step Down',    tuning: [63, 58, 54, 49, 44, 39] },
  { id: 'full-step-down', name: 'Full Step Down',  tuning: [62, 57, 53, 48, 43, 38] },
]

function tuningMatches(a: GuitarTuning, b: GuitarTuning): boolean {
  return a.every((v, i) => v === b[i])
}

function noteLabel(midi: number): string {
  return SHARP_NAMES[wrap(midi, 12)]
}

function tuningNoteLabels(tuning: GuitarTuning): string {
  // Display low→high (reverse) so it reads like a chord diagram or common notation
  return [...tuning].reverse().map(noteLabel).join(' ')
}

export default function TuningSelector(): React.ReactElement {
  const { guitarTuning, setGuitarTuning } = useTonalStore()

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>Tuning</div>
      <div className={styles.presetList}>
        {PRESETS.map(preset => {
          const isActive = tuningMatches(guitarTuning, preset.tuning)
          return (
            <button
              key={preset.id}
              className={[styles.presetBtn, isActive ? styles.presetBtnActive : ''].join(' ')}
              onClick={() => setGuitarTuning(preset.tuning)}
              aria-pressed={isActive}
              aria-label={`${preset.name} tuning: ${tuningNoteLabels(preset.tuning)}`}
            >
              <span className={styles.presetName}>{preset.name}</span>
              <span className={styles.presetNotes}>{tuningNoteLabels(preset.tuning)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
