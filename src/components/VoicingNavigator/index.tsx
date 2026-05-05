import React from 'react'
import styles from './VoicingNavigator.module.css'

interface VoicingNavigatorProps {
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
  if (total < 2) return null

  const displayLabel = label ?? `Voicing ${index + 1}/${total}`

  return (
    <div className={styles.nav} role="group" aria-label="Voicing navigator">
      <button
        className={styles.btn}
        onClick={onPrev}
        disabled={index === 0}
        aria-label="Previous voicing"
      >
        ‹
      </button>
      <span className={styles.label}>{displayLabel}</span>
      <button
        className={styles.btn}
        onClick={onNext}
        disabled={index === total - 1}
        aria-label="Next voicing"
      >
        ›
      </button>
    </div>
  )
}
