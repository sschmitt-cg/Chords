// ScaleNavigator — key selector, scale family tabs, mode drum, brightness + tension indicators

import { useTonalStore } from '../../store/index'
import { SCALE_FAMILIES, GLOBAL_BRIGHTNESS_ORDER, pcColorVar, wrap } from '../../theory/index'
import styles from './ScaleNavigator.module.css'

export default function ScaleNavigator() {
  const {
    currentKeyPc,
    currentTonicLabel,
    familyId,
    familyModeIndex,
    setKey,
    setFamily,
    setFamilyModeIndex,
    setModeByBrightness,
  } = useTonalStore()

  const family = SCALE_FAMILIES.find(f => f.id === familyId) ?? SCALE_FAMILIES[0]
  const mode = family.modes[familyModeIndex]
  const prevModeIdx = wrap(familyModeIndex - 1, 7)
  const nextModeIdx = wrap(familyModeIndex + 1, 7)
  const prevMode = family.modes[prevModeIdx]
  const nextMode = family.modes[nextModeIdx]

  const brightnessScore = mode.brightness
  const brightnessGlobalIdx = GLOBAL_BRIGHTNESS_ORDER.findIndex(
    e => e.familyId === familyId && e.modeIndex === familyModeIndex
  )

  return (
    <div className={styles.navigator}>

      {/* ---- Row 1: key navigation + tension + brightness ---- */}
      <div className={styles.topRow}>

        <div className={styles.keyControl}>
          <button
            className={styles.navBtn}
            aria-label="Previous key"
            onClick={() => setKey(wrap(currentKeyPc - 1, 12))}
          >‹</button>
          <span
            className={styles.keyLabel}
            style={{ '--pc-color': pcColorVar(currentKeyPc) } as React.CSSProperties}
          >
            {currentTonicLabel}
          </span>
          <button
            className={styles.navBtn}
            aria-label="Next key"
            onClick={() => setKey(wrap(currentKeyPc + 1, 12))}
          >›</button>
        </div>

        <div className={styles.tensionDots} aria-label={`Tension level ${family.tension}`}>
          {([0, 1, 2] as const).map(i => (
            <span
              key={i}
              className={[styles.tensionDot, i < family.tension ? styles.tensionDotActive : ''].join(' ')}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className={styles.brightnessControl}>
          <button
            className={styles.brightBtn}
            aria-label="Darker mode"
            onClick={() => setModeByBrightness(-1)}
          >◂</button>
          <div
            className={styles.brightnessBar}
            aria-label={`Brightness ${brightnessScore}`}
            title={`Brightness: ${brightnessScore} / 100  (${brightnessGlobalIdx + 1} of ${GLOBAL_BRIGHTNESS_ORDER.length})`}
          >
            <div
              className={styles.brightnessFill}
              style={{ width: `${brightnessScore}%` }}
            />
          </div>
          <button
            className={styles.brightBtn}
            aria-label="Brighter mode"
            onClick={() => setModeByBrightness(1)}
          >▸</button>
        </div>

      </div>

      {/* ---- Row 2: family tabs ---- */}
      <div className={styles.familyTabs} role="tablist" aria-label="Scale families">
        {SCALE_FAMILIES.map(f => (
          <button
            key={f.id}
            role="tab"
            aria-selected={f.id === familyId}
            className={[styles.familyTab, f.id === familyId ? styles.familyTabActive : ''].join(' ')}
            onClick={() => setFamily(f.id)}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* ---- Row 3: mode drum ---- */}
      <div className={styles.modeDrum} aria-label="Mode selector">
        <button
          className={[styles.drumRow, styles.drumRowAdj].join(' ')}
          aria-label={`Go to ${prevMode.name}`}
          onClick={() => setFamilyModeIndex(prevModeIdx)}
        >
          <span className={styles.drumAdjName}>{prevMode.name}</span>
          <span className={styles.drumBrightness}>{prevMode.brightness}</span>
        </button>

        <div className={[styles.drumRow, styles.drumRowCurrent].join(' ')} aria-current="true">
          <span className={styles.drumCurrentName}>{mode.name}</span>
          <span className={styles.drumBrightness}>{brightnessScore}</span>
        </div>

        <button
          className={[styles.drumRow, styles.drumRowAdj].join(' ')}
          aria-label={`Go to ${nextMode.name}`}
          onClick={() => setFamilyModeIndex(nextModeIdx)}
        >
          <span className={styles.drumAdjName}>{nextMode.name}</span>
          <span className={styles.drumBrightness}>{nextMode.brightness}</span>
        </button>
      </div>

    </div>
  )
}
