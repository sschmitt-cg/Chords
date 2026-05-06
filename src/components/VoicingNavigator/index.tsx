import React from 'react'
import styles from './VoicingNavigator.module.css'

interface VoicingNavigatorProps {
  description: string
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
}

export default function VoicingNavigator({
  description,
  index,
  total,
  onPrev,
  onNext,
}: VoicingNavigatorProps): React.ReactElement {
  const showButtons = total >= 1
  const isAllNotes = index < 0
  const prevDisabled = isAllNotes
  const nextDisabled = !isAllNotes && index >= total - 1

  return (
    <div className={styles.nav} role="group" aria-label="Voicing navigator">
      {showButtons && (
        <button
          className={styles.btn}
          onClick={onPrev}
          disabled={prevDisabled}
          aria-label="Previous voicing"
        >
          ‹
        </button>
      )}
      <span className={styles.label}>{description}</span>
      {showButtons && (
        <button
          className={styles.btn}
          onClick={onNext}
          disabled={nextDisabled}
          aria-label="Next voicing"
        >
          ›
        </button>
      )}
    </div>
  )
}
