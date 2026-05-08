// Off-screen chord-sheet component for PNG export.
// Renders the current tonal state as a shareable "chord sheet" image.
// Positioned off-screen (not display:none) so html-to-image can measure it.

import { forwardRef } from 'react'
import { useTonalStore } from '../../store/index'
import { chordNameForRow } from '../../theory/index'
import styles from './ShareCard.module.css'

// html-to-image clones the element into a new document and can't follow nested
// CSS variable chains (--pc-color → var(--pc-N) → hex). Resolve to the actual
// hex value from :root so color-mix() works in the cloned context.
function resolvedPcColor(pc: number): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--pc-${pc}`)
    .trim()
}

const ShareCard = forwardRef<HTMLDivElement>(
  function ShareCard(_props, ref) {
    const tonicLabel       = useTonalStore(s => s.currentTonicLabel)
    const currentMode      = useTonalStore(s => s.currentMode)
    const currentFamily    = useTonalStore(s => s.currentFamily)
    const currentScale     = useTonalStore(s => s.currentScale)
    const harmonyRows      = useTonalStore(s => s.harmonyRows)
    const globalHarmonyMax = useTonalStore(s => s.globalHarmonyMax)
    const modeRootPc       = useTonalStore(s => s.currentModeRootPc)
    const familyId         = useTonalStore(s => s.familyId)
    const modeIndex        = useTonalStore(s => s.modeIndex)

    // Build the URL from store state so it stays in sync even when replaceState
    // hasn't run yet (effects are async; this read is synchronous at render time).
    const params = new URLSearchParams({ root: String(modeRootPc), family: familyId, mode: String(modeIndex) })
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`

    const title    = `${tonicLabel} ${currentMode.name}`
    const subtitle = currentFamily.name

    return (
      <div ref={ref} className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>

        {/* Scale notes */}
        <section className={styles.scaleSection}>
          <div className={styles.sectionLabel}>Scale</div>
          <div className={styles.noteList}>
            {currentScale.spelled.map((note, i) => {
              const pc = currentScale.pitchClasses[i]
              return (
                <span
                  key={`${pc}-${note}`}
                  className={styles.notePill}
                  style={{ '--pc-color': resolvedPcColor(pc) } as React.CSSProperties}
                >
                  {note}
                </span>
              )
            })}
          </div>
        </section>

        {/* Harmony rows */}
        <section className={styles.harmonySection}>
          <div className={styles.sectionLabel}>Harmony ({globalHarmonyMax === 5 ? 'triads' : globalHarmonyMax === 7 ? '7ths' : `${globalHarmonyMax}ths`})</div>
          {harmonyRows.map(row => {
            const rootPc    = row.notes.find(n => n.degree === 1)?.pc ?? 0
            const chordName = chordNameForRow(row, globalHarmonyMax)
            return (
              <div key={row.index} className={styles.harmonyRow}>
                <span
                  className={styles.romanNumeral}
                  style={{ color: resolvedPcColor(rootPc) }}
                >
                  {row.degree}
                </span>
                <span className={styles.chordName}>{chordName}</span>
              </div>
            )
          })}
        </section>

        {/* Footer with share URL */}
        <footer className={styles.footer}>
          <span className={styles.footerLabel}>Share</span>
          <span className={styles.footerUrl}>{shareUrl}</span>
        </footer>
      </div>
    )
  }
)

export default ShareCard
