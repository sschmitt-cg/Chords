// CircleOfFifths — interactive SVG circle with major (outer) and minor (inner) rings.
// Clicking a major wedge switches to major/Ionian at that root.
// Clicking a minor wedge switches to major/Aeolian at that root.

import { useTonalStore } from '../../store/index'
import { CIRCLE_OF_FIFTHS_MAJOR, CIRCLE_OF_FIFTHS_MINOR, SCALE_FAMILIES, pcColorVar, wrap } from '../../theory/index'
import styles from './CircleOfFifths.module.css'

// Families whose root mode is major-flavoured — outer ring gets the active highlight.
// Anything not in this set is treated as minor-type (inner ring gets the highlight).
const MAJOR_FAMILY_IDS = new Set(['major', 'harmonic-major', 'double-harmonic'])

// Index of the Major family in SCALE_FAMILIES (Ionian=0 through Locrian=6)
const MAJOR_FAMILY_INDEX = SCALE_FAMILIES.findIndex(f => f.id === 'major')
// Aeolian is mode index 5 within the Major family
const AEOLIAN_MODE_INDEX = 5

const WEDGE_COUNT = 12
const ANGLE_STEP = (2 * Math.PI) / WEDGE_COUNT
// Half-wedge offset so the first segment (C) is centered at the top
const START_ANGLE = -Math.PI / 2 - ANGLE_STEP / 2

const CX = 150
const CY = 150
const R_OUTER_OUTER = 140  // outer edge of major ring
const R_OUTER_INNER = 95   // inner edge of major ring / outer edge of minor ring
const R_INNER_INNER = 58   // inner edge of minor ring (hollow center)

const R_MAJOR_TEXT = 118   // label radius for major ring
const R_MINOR_TEXT = 77    // label radius for minor ring

function wedgePath(outerR: number, innerR: number, index: number): string {
  const a1 = START_ANGLE + index * ANGLE_STEP
  const a2 = a1 + ANGLE_STEP
  const ox1 = CX + outerR * Math.cos(a1)
  const oy1 = CY + outerR * Math.sin(a1)
  const ox2 = CX + outerR * Math.cos(a2)
  const oy2 = CY + outerR * Math.sin(a2)
  const ix1 = CX + innerR * Math.cos(a2)
  const iy1 = CY + innerR * Math.sin(a2)
  const ix2 = CX + innerR * Math.cos(a1)
  const iy2 = CY + innerR * Math.sin(a1)
  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 0 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerR} ${innerR} 0 0 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ')
}

function labelPosition(r: number, index: number): { x: number; y: number } {
  const angle = START_ANGLE + (index + 0.5) * ANGLE_STEP
  return {
    x: CX + r * Math.cos(angle),
    y: CY + r * Math.sin(angle),
  }
}

export default function CircleOfFifths(): React.ReactElement {
  const { currentModeRootPc, familyIndex, setKey, setFamily, setModeIndex } = useTonalStore()
  const tonicPc = wrap(currentModeRootPc, 12)
  // Only highlight the outer (major) ring when the current family is major-typed,
  // and the inner (minor) ring when it is minor-typed, so clicking Am doesn't
  // also light up the A Major wedge sharing the same pitch class.
  const isMajorFamily = MAJOR_FAMILY_IDS.has(SCALE_FAMILIES[familyIndex].id)

  // Switch to Major/Ionian then set the tonal center to the clicked pitch class.
  function handleMajorClick(pc: number): void {
    setFamily(MAJOR_FAMILY_INDEX)
    setKey(pc)
  }

  // Switch to Major/Aeolian (natural minor) then set the tonal center.
  function handleMinorClick(pc: number): void {
    setFamily(MAJOR_FAMILY_INDEX)
    setModeIndex(AEOLIAN_MODE_INDEX)
    setKey(pc)
  }

  return (
    <div className={styles.wrapper}>
      <svg
        viewBox="0 0 300 300"
        className={styles.svg}
        role="group"
        aria-label="Circle of Fifths"
      >
        {/* Major (outer) ring wedges */}
        {CIRCLE_OF_FIFTHS_MAJOR.map((key, i) => {
          const isActive = isMajorFamily && key.pc === tonicPc
          const colorVar = pcColorVar(key.pc)
          const pos = labelPosition(R_MAJOR_TEXT, i)
          return (
            <g key={`major-${i}`}>
              <path
                d={wedgePath(R_OUTER_OUTER, R_OUTER_INNER, i)}
                className={[styles.wedge, isActive ? styles.wedgeActive : styles.wedgeMuted].join(' ')}
                style={{ '--pc-color': colorVar } as React.CSSProperties}
                onClick={() => handleMajorClick(key.pc)}
                role="button"
                aria-label={`${key.label} major`}
                aria-pressed={isActive}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMajorClick(key.pc) } }}
              />
              <text
                x={pos.x}
                y={pos.y}
                className={[styles.label, styles.labelMajor, isActive ? styles.labelActive : ''].join(' ')}
                textAnchor="middle"
                dominantBaseline="middle"
                // Click is on the path; text is decorative — pointer-events handled by path
                style={{ pointerEvents: 'none' }}
              >
                {key.label}
              </text>
            </g>
          )
        })}

        {/* Minor (inner) ring wedges */}
        {CIRCLE_OF_FIFTHS_MINOR.map((key, i) => {
          const isActive = !isMajorFamily && key.pc === tonicPc
          const colorVar = pcColorVar(key.pc)
          const pos = labelPosition(R_MINOR_TEXT, i)
          return (
            <g key={`minor-${i}`}>
              <path
                d={wedgePath(R_OUTER_INNER, R_INNER_INNER, i)}
                className={[styles.wedge, isActive ? styles.wedgeActive : styles.wedgeMuted].join(' ')}
                style={{ '--pc-color': colorVar } as React.CSSProperties}
                onClick={() => handleMinorClick(key.pc)}
                role="button"
                aria-label={`${key.label}`}
                aria-pressed={isActive}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMinorClick(key.pc) } }}
              />
              <text
                x={pos.x}
                y={pos.y}
                className={[styles.label, styles.labelMinor, isActive ? styles.labelActive : ''].join(' ')}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ pointerEvents: 'none' }}
              >
                {key.label}
              </text>
            </g>
          )
        })}

        {/* Center hub */}
        <circle
          cx={CX}
          cy={CY}
          r={R_INNER_INNER - 2}
          className={styles.hub}
        />
        <text
          x={CX}
          y={CY - 8}
          className={styles.hubLabel}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          Circle
        </text>
        <text
          x={CX}
          y={CY + 8}
          className={styles.hubLabel}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          of 5ths
        </text>
      </svg>
    </div>
  )
}
