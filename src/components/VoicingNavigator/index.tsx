import React from 'react'
import styles from './VoicingNavigator.module.css'

interface VoicingNavigatorProps {
  // -1 = "All notes" state; 0..total-1 = specific voicing
  index: number
  total: number
  label?: string
  onPrev: () => void
  onNext: () => void
}

export default function VoicingNavigator({
  index,
  total,
  label,
  onPrev,
  onNext,
}: VoicingNavigatorProps): React.ReactElement | null {
  if (total < 1) return null

  const isAllNotes = index < 0
  const displayLabel = isAllNotes ? 'All notes' : (label ?? `Voicing ${index + 1}/${total}`)

  return (
    <div className={styles.nav} role="group" aria-label="Voicing navigator">
      <button
        className={styles.btn}
        onClick={onPrev}
        disabled={isAllNotes}
        aria-label="Previous voicing"
      >
        ‹
      </button>
      <span className={styles.label}>{displayLabel}</span>
      <button
        className={styles.btn}
        onClick={onNext}
        disabled={!isAllNotes && index >= total - 1}
        aria-label="Next voicing"
      >
        ›
      </button>
    </div>
  )
}
