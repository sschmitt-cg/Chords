// ScaleNavigator — analog knobs + LCD displays + exploratory sliders
// Logical region: Root / Family / Mode knobs
// Exploratory region: Brightness slider + Tension slider

import { useRef, useState, useCallback, useEffect } from 'react'
import { useTonalStore } from '../../store/index'
import { SCALE_FAMILIES, BRIGHTNESS_ORDER, ENHARMONIC_OPTIONS, wrap } from '../../theory/index'
import styles from './ScaleNavigator.module.css'

// Pixels of drag distance that equals one step change
const DRAG_THRESHOLD_PX = 22

// ------------------------------------------------------------------
// SVG Knob
// ------------------------------------------------------------------

interface KnobProps {
  step: number
  total: number
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
}

function Knob({ step, total, onPointerDown, onPointerMove, onPointerUp }: KnobProps) {
  const ticks: React.ReactNode[] = []
  for (let i = 0; i < total; i++) {
    const angleDeg = -135 + (i / (total - 1)) * 270
    const rad = (angleDeg * Math.PI) / 180
    const x1 = 36 + Math.sin(rad) * 26
    const y1 = 36 - Math.cos(rad) * 26
    const x2 = 36 + Math.sin(rad) * 32
    const y2 = 36 - Math.cos(rad) * 32
    const isCurrent = i === step
    ticks.push(
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isCurrent ? '#6670e8' : '#1e2858'}
        strokeWidth={isCurrent ? 3 : 1.5}
        strokeLinecap="round"
      />
    )
  }

  const angleStep = total > 1 ? -135 + (step / (total - 1)) * 270 : -135
  const rad = (angleStep * Math.PI) / 180
  const indX = 36 + Math.sin(rad) * 18
  const indY = 36 - Math.cos(rad) * 18

  return (
    <svg
      width={72} height={72}
      style={{ cursor: 'ns-resize', touchAction: 'none', userSelect: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {ticks}
      <circle cx={36} cy={36} r={22} fill="#1a2350" />
      <circle cx={36} cy={36} r={21} fill="none" stroke="#2e3a70" strokeWidth={0.5} />
      {/* Indicator line */}
      <line
        x1={36} y1={36}
        x2={indX} y2={indY}
        stroke="#6670e8" strokeWidth={2} strokeLinecap="round"
      />
      {/* Indicator dot */}
      <circle cx={indX} cy={indY} r={2.5} fill="#9098f8" />
      {/* Center dot */}
      <circle cx={36} cy={36} r={3} fill="#0e1538" />
    </svg>
  )
}

// ------------------------------------------------------------------
// LCD display
// ------------------------------------------------------------------

function LCD({ value }: { value: string }) {
  return <div className={styles.lcd}>{value}</div>
}

// ------------------------------------------------------------------
// Knob unit (SVG + LCD + label)
// ------------------------------------------------------------------

type KnobType = 'root' | 'family' | 'mode'

interface KnobUnitProps {
  label: string
  lcdValue: string
  step: number
  total: number
  knobType: KnobType
  onOpen: (type: KnobType, rect: DOMRect) => void
  onChange: (newValue: number) => void
}

function KnobUnit({ label, lcdValue, step, total, knobType, onOpen, onChange }: KnobUnitProps) {
  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(step)
  const dragged = useRef(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY
    dragStartValue.current = step
    dragged.current = false
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }, [step])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    const delta = dragStartY.current - e.clientY
    if (Math.abs(delta) > 4) {
      dragged.current = true
      e.preventDefault()
    }
    const steps = Math.round(delta / DRAG_THRESHOLD_PX)
    const newValue = ((dragStartValue.current + steps) % total + total) % total
    if (newValue !== step) onChange(newValue)
  }, [step, total, onChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragged.current && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      onOpen(knobType, rect)
    }
    dragStartY.current = null
    dragged.current = false
    e.preventDefault()
  }, [knobType, onOpen])

  // keep the unused svgRef from triggering lint — ref attached via callback
  void svgRef

  return (
    <div ref={wrapperRef} className={styles.knobUnit}>
      <Knob
        step={step}
        total={total}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <LCD value={lcdValue} />
      <span className={styles.knobLabel}>{label}</span>
    </div>
  )
}

// ------------------------------------------------------------------
// Picker popover
// ------------------------------------------------------------------

interface PickerOption {
  label: string
  value: number
  brightnessBar?: number  // 0–100 — only for mode picker
}

interface PickerProps {
  options: PickerOption[]
  currentValue: number
  anchorRect: DOMRect
  containerRect: DOMRect
  onSelect: (value: number) => void
  onClose: () => void
}

function Picker({ options, currentValue, anchorRect, containerRect, onSelect, onClose }: PickerProps) {
  const left = anchorRect.left - containerRect.left
  const top = anchorRect.bottom - containerRect.top + 6

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Element
      if (!target.closest('[data-picker]')) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      data-picker
      className={styles.picker}
      style={{ left, top }}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          className={[styles.pickerRow, opt.value === currentValue ? styles.pickerRowCurrent : ''].join(' ')}
          onClick={() => { onSelect(opt.value); onClose() }}
        >
          <span>{opt.label}</span>
          {opt.brightnessBar !== undefined && (
            <span
              className={styles.pickerBrightnessBar}
              style={{ width: opt.brightnessBar * 0.35 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------
// Exploratory slider
// ------------------------------------------------------------------

interface ExploratorySliderProps {
  label: string
  min: number
  max: number
  value: number
  labelMin: string
  labelMax: string
  onChange: (value: number) => void
}

function ExploratorySlider({ label, min, max, value, labelMin, labelMax, onChange }: ExploratorySliderProps) {
  const pct = ((value - min) / (max - min) * 100).toFixed(1) + '%'
  return (
    <div className={styles.sliderUnit}>
      <span className={styles.sliderLabel}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        className={styles.slider}
        style={{ '--pct': pct } as React.CSSProperties}
        onChange={e => onChange(Number(e.target.value))}
      />
      <div className={styles.sliderEndLabels}>
        <span>{labelMin}</span>
        <span>{labelMax}</span>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Note name helper (respects enharmonic preference)
// ------------------------------------------------------------------

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function pcName(pc: number, enharmonicPrefs: Record<number, 'sharp' | 'flat'>): string {
  const norm = wrap(pc, 12)
  const opt = ENHARMONIC_OPTIONS[norm]
  if (!opt) return SHARP_NAMES[norm]
  const pref = enharmonicPrefs[norm]
  if (pref === 'flat') return FLAT_NAMES[norm]
  if (pref === 'sharp') return SHARP_NAMES[norm]
  return FLAT_NAMES[norm] // default for enharmonic pcs
}

// Family LCD names
const FAMILY_LCD: Record<string, string> = {
  'major':           'MAJOR',
  'melodic-minor':   'MEL MIN',
  'harmonic-minor':  'HRM MIN',
  'harmonic-major':  'HRM MAJ',
  'double-harmonic': 'DBL HRM',
}

// Interval label between two consecutive mode notes
function intervalLabel(semitones: number): { text: string; color: string; size: string; weight: string } {
  if (semitones === 1) return { text: 'H',   color: '#7c86ac', size: '8px', weight: '400' }
  if (semitones === 2) return { text: 'W',   color: '#7c86ac', size: '8px', weight: '400' }
  return                       { text: 'aug', color: '#c07820', size: '9px', weight: '700' }
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

interface PickerState {
  type: KnobType
  anchorRect: DOMRect
}

export default function ScaleNavigator() {
  const {
    currentKeyPc,
    familyIndex,
    modeIndex,
    currentFamily,
    currentMode,
    currentTension,
    currentBrightnessPosition,
    currentModeNotes,
    currentModeIntervals,
    enharmonicPrefs,
    setKey,
    setFamily,
    setModeIndex,
    setModeByBrightness,
    setModeByTension,
  } = useTonalStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [annotation, setAnnotation] = useState('Select any control to explore.')

  const openPicker = useCallback((type: KnobType, rect: DOMRect) => {
    setPicker({ type, anchorRect: rect })
  }, [])

  const closePicker = useCallback(() => setPicker(null), [])

  // Root knob
  const rootOptions: PickerOption[] = Array.from({ length: 12 }, (_, i) => ({
    label: pcName(i, enharmonicPrefs),
    value: i,
  }))

  // Family knob
  const familyOptions: PickerOption[] = SCALE_FAMILIES.map((f, i) => ({
    label: f.name,
    value: i,
  }))

  // Mode knob
  const modeOptions: PickerOption[] = currentFamily.modes.map((m, i) => ({
    label: m.name,
    value: i,
    brightnessBar: m.brightness,
  }))

  function handlePickerSelect(value: number) {
    if (!picker) return
    if (picker.type === 'root') {
      setKey(value)
      const name = pcName(value, enharmonicPrefs)
      const diff = wrap(value - currentKeyPc, 12)
      const dir = diff <= 6 ? `up ${diff}` : `down ${12 - diff}`
      setAnnotation(`Root → ${name}. Transposed ${dir} semitone${diff === 1 || diff === 11 ? '' : 's'}.`)
    } else if (picker.type === 'family') {
      setFamily(value)
      const f = SCALE_FAMILIES[value]
      setAnnotation(`Family → ${f.name}. ${f.tension === 0 ? 'Fully diatonic.' : f.tension === 1 ? 'One augmented 2nd.' : 'Two augmented 2nds.'}`)
    } else {
      setModeIndex(value)
      const m = currentFamily.modes[value]
      setAnnotation(`Mode ${value + 1}: ${m.name}. Same ${currentFamily.name} notes — tonal center shifts.`)
    }
  }

  function handleKnobChange(type: KnobType, newValue: number) {
    if (type === 'root') {
      setKey(newValue)
      setAnnotation(`Root → ${pcName(newValue, enharmonicPrefs)}.`)
    } else if (type === 'family') {
      setFamily(newValue)
      const f = SCALE_FAMILIES[newValue]
      setAnnotation(`Family → ${f.name}.`)
    } else {
      setModeIndex(newValue)
      const m = currentFamily.modes[newValue]
      setAnnotation(`Mode ${newValue + 1}: ${m.name}.`)
    }
  }

  const tensionHints: Record<number, string> = {
    0: 'Fully diatonic — no augmented leaps.',
    1: 'One augmented 2nd — the exotic leap that defines Harmonic Minor and Phrygian Dominant.',
    2: 'Two augmented 2nds — the Double Harmonic universe. Intensely colorful.',
  }

  // Compute interval sizes between consecutive mode notes for the note row
  const intervals: number[] = []
  for (let i = 0; i < currentModeNotes.length - 1; i++) {
    intervals.push(currentModeIntervals[i])
  }

  const containerRect = containerRef.current?.getBoundingClientRect()

  return (
    <div className={styles.outer} ref={containerRef}>

      {/* ---- Dark panel ---- */}
      <div className={styles.panel}>

        {/* Left region: Logical knobs */}
        <div className={styles.region}>
          <span className={styles.regionLabel}>LOGICAL ↺</span>
          <div className={styles.knobRow}>

            <KnobUnit
              label="ROOT"
              lcdValue={pcName(currentKeyPc, enharmonicPrefs)}
              step={currentKeyPc}
              total={12}
              knobType="root"
              onOpen={openPicker}
              onChange={v => handleKnobChange('root', v)}
            />

            <KnobUnit
              label="FAMILY"
              lcdValue={FAMILY_LCD[currentFamily.id] ?? currentFamily.name.toUpperCase()}
              step={familyIndex}
              total={5}
              knobType="family"
              onOpen={openPicker}
              onChange={v => handleKnobChange('family', v)}
            />

            <KnobUnit
              label="MODE"
              lcdValue={currentMode.lcdName}
              step={modeIndex}
              total={7}
              knobType="mode"
              onOpen={openPicker}
              onChange={v => handleKnobChange('mode', v)}
            />

          </div>
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Right region: Exploratory sliders */}
        <div className={styles.region}>
          <span className={styles.regionLabel}>EXPLORATORY</span>

          <ExploratorySlider
            label="BRIGHTNESS"
            min={0}
            max={BRIGHTNESS_ORDER.length - 1}
            value={currentBrightnessPosition}
            labelMin="darker"
            labelMax="brighter"
            onChange={pos => {
              const entry = BRIGHTNESS_ORDER[pos]
              const f = SCALE_FAMILIES[entry.familyIndex]
              const m = f.modes[entry.modeIndex]
              setModeByBrightness(pos)
              setAnnotation(`Brightness → ${m.name} (${f.name}).`)
            }}
          />

          <ExploratorySlider
            label="TENSION"
            min={0}
            max={2}
            value={currentTension}
            labelMin="smoother"
            labelMax="crunchier"
            onChange={t => {
              const tension = t as 0 | 1 | 2
              const prev = currentTension
              setModeByTension(tension)
              if (tension > prev) setAnnotation(`Added an aug. 2nd → ${tensionHints[tension].split('—')[0].trim()}.`)
              else setAnnotation(`Removed an aug. 2nd → ${tensionHints[tension].split('—')[0].trim()}.`)
            }}
          />

          <p className={styles.tensionHint}>{tensionHints[currentTension]}</p>

        </div>

        {/* Picker popover */}
        {picker && containerRect && (
          <Picker
            options={picker.type === 'root' ? rootOptions : picker.type === 'family' ? familyOptions : modeOptions}
            currentValue={picker.type === 'root' ? currentKeyPc : picker.type === 'family' ? familyIndex : modeIndex}
            anchorRect={picker.anchorRect}
            containerRect={containerRect}
            onSelect={handlePickerSelect}
            onClose={closePicker}
          />
        )}

      </div>

      {/* ---- Note display row (outside dark panel) ---- */}
      <div className={styles.noteRow}>
        {currentModeNotes.map((pc, i) => {
          const isRoot = i === 0
          const name = pcName(pc, enharmonicPrefs)
          return (
            <div key={i} className={styles.noteGroup}>
              <div className={[styles.notePill, isRoot ? styles.notePillRoot : ''].join(' ')}>
                {name}
              </div>
              {i < currentModeNotes.length - 1 && (() => {
                const il = intervalLabel(intervals[i])
                return (
                  <span
                    className={styles.intervalLabel}
                    style={{ color: il.color, fontSize: il.size, fontWeight: il.weight }}
                  >
                    {il.text}
                  </span>
                )
              })()}
            </div>
          )
        })}
      </div>

      {/* ---- Annotation line ---- */}
      <p className={styles.annotation}>{annotation}</p>

    </div>
  )
}
