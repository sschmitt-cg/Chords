// ScaleNavigator — shared React components used by ScaleLogical and ScaleExploratory

import React, { useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDismissable } from '../../hooks/useDismissable'
import styles from './ScaleNavigator.module.css'

export const DRAG_THRESHOLD_PX = 22

// Fire a brief haptic pulse on devices that support it. Used when a knob crosses a step
// so the user gets tactile confirmation without us watching for individual interaction events.
function hapticTick(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(10)
  }
}

// ------------------------------------------------------------------
// Circular SVG Knob — full 360°, step 0 at top
// ------------------------------------------------------------------

export interface KnobProps {
  step: number
  total: number
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
}

export function Knob({ step, total, onPointerDown, onPointerMove, onPointerUp }: KnobProps): React.ReactElement {
  const ticks: React.ReactNode[] = []
  for (let i = 0; i < total; i++) {
    const angleDeg = (i / total) * 360
    const rad = (angleDeg * Math.PI) / 180
    const x1 = 36 + Math.sin(rad) * 26
    const y1 = 36 - Math.cos(rad) * 26
    const x2 = 36 + Math.sin(rad) * 32
    const y2 = 36 - Math.cos(rad) * 32
    const isCurrent = i === step
    ticks.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isCurrent ? 'var(--knob-accent)' : 'var(--knob-tick-inactive)'}
        strokeWidth={isCurrent ? 3 : 1.5}
        strokeLinecap="round"
      />
    )
  }
  const angleStep = (step / total) * 360
  const rad = (angleStep * Math.PI) / 180
  const indX = 36 + Math.sin(rad) * 18
  const indY = 36 - Math.cos(rad) * 18
  return (
    <svg width={72} height={72} style={{ cursor: 'ns-resize', touchAction: 'none', userSelect: 'none' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    >
      {ticks}
      <circle cx={36} cy={36} r={22} fill="var(--knob-body)" />
      <circle cx={36} cy={36} r={21} fill="none" stroke="var(--knob-body-border)" strokeWidth={0.5} />
      <line x1={36} y1={36} x2={indX} y2={indY} stroke="var(--knob-accent)" strokeWidth={2} strokeLinecap="round" />
      <circle cx={indX} cy={indY} r={2.5} fill="var(--knob-accent-bright)" />
      <circle cx={36} cy={36} r={3} fill="var(--knob-pivot)" />
    </svg>
  )
}

// ------------------------------------------------------------------
// Bounded SVG Wheel — configurable arc, ticks glow up to current step
// ------------------------------------------------------------------

export interface BoundedKnobProps extends KnobProps {
  arcMin?: number  // degrees, default -135
  arcMax?: number  // degrees, default +135
}

export function BoundedKnob({ step, total, arcMin = -135, arcMax = 135, onPointerDown, onPointerMove, onPointerUp }: BoundedKnobProps): React.ReactElement {
  const ticks: React.ReactNode[] = []
  for (let i = 0; i < total; i++) {
    const angleDeg = arcMin + (i / (total - 1)) * (arcMax - arcMin)
    const rad = (angleDeg * Math.PI) / 180
    const x1 = 36 + Math.sin(rad) * 26
    const y1 = 36 - Math.cos(rad) * 26
    const x2 = 36 + Math.sin(rad) * 32
    const y2 = 36 - Math.cos(rad) * 32
    const isCurrent = i === step
    const isFilled = i <= step
    ticks.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isCurrent ? 'var(--knob-accent-bright)' : isFilled ? 'var(--knob-accent)' : 'var(--knob-tick-inactive)'}
        strokeWidth={isCurrent ? 3 : isFilled ? 2 : 1.5}
        strokeLinecap="round"
      />
    )
  }
  const angleStep = total > 1 ? arcMin + (step / (total - 1)) * (arcMax - arcMin) : arcMin
  const rad = (angleStep * Math.PI) / 180
  const indX = 36 + Math.sin(rad) * 18
  const indY = 36 - Math.cos(rad) * 18
  return (
    <svg width={72} height={72} style={{ cursor: 'ns-resize', touchAction: 'none', userSelect: 'none' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    >
      {ticks}
      <circle cx={36} cy={36} r={22} fill="var(--knob-body)" />
      <circle cx={36} cy={36} r={21} fill="none" stroke="var(--knob-body-border)" strokeWidth={0.5} />
      <line x1={36} y1={36} x2={indX} y2={indY} stroke="var(--knob-accent)" strokeWidth={2} strokeLinecap="round" />
      <circle cx={indX} cy={indY} r={2.5} fill="var(--knob-accent-bright)" />
      <circle cx={36} cy={36} r={3} fill="var(--knob-pivot)" />
    </svg>
  )
}

// ------------------------------------------------------------------
// LCD display
// ------------------------------------------------------------------

export function LCD({ value, onClick, ariaLabel }: { value: string; onClick?: () => void; ariaLabel?: string }): React.ReactElement {
  if (onClick) {
    return (
      <button
        type="button"
        className={styles.lcd}
        onClick={onClick}
        aria-label={ariaLabel ?? `${value} — open picker`}
        aria-haspopup="listbox"
        style={{ cursor: 'pointer' }}
      >
        {value}
      </button>
    )
  }
  return <div className={styles.lcd}>{value}</div>
}

// ------------------------------------------------------------------
// Brightness sun icon for picker rows
// ------------------------------------------------------------------

export function BrightnessDot({ brightness }: { brightness: number }): React.ReactElement {
  const t = brightness / 100
  const r = 255
  const g = Math.round(170 + t * 85)   // amber → near-white yellow
  const b = Math.round(30 + t * 170)
  const alpha = 0.2 + t * 0.8
  const color = `rgba(${r},${g},${b},${alpha})`
  const numRays = 8
  const innerR = 3.5
  const outerR = innerR + 1.5 + t * 3.5
  const rays: React.ReactNode[] = []
  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2
    rays.push(
      <line key={i}
        x1={8 + Math.cos(angle) * innerR} y1={8 + Math.sin(angle) * innerR}
        x2={8 + Math.cos(angle) * outerR} y2={8 + Math.sin(angle) * outerR}
        stroke={color} strokeWidth={0.7 + t * 0.8} strokeLinecap="round"
      />
    )
  }
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
      {rays}
      <circle cx={8} cy={8} r={2.5} fill={color} />
    </svg>
  )
}

// ------------------------------------------------------------------
// Unified picker type
// ------------------------------------------------------------------

export type PickerType = 'root' | 'family' | 'mode' | 'brightness' | 'tension'

// ------------------------------------------------------------------
// Circular KnobUnit (Root / Family / Mode)
// ------------------------------------------------------------------

export interface KnobUnitProps {
  label: string
  lcdValue: string
  step: number
  total: number
  pickerType: PickerType
  onOpen: (type: PickerType, rect: DOMRect) => void
  onChange: (newValue: number) => void
}

export function KnobUnit({ label, lcdValue, step, total, pickerType, onOpen, onChange }: KnobUnitProps): React.ReactElement {
  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(step)
  const dragged = useRef(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const openPicker = useCallback(() => {
    if (wrapperRef.current) onOpen(pickerType, wrapperRef.current.getBoundingClientRect())
  }, [pickerType, onOpen])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY
    dragStartValue.current = step
    dragged.current = false
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }, [step])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    const delta = dragStartY.current - e.clientY
    if (Math.abs(delta) > 4) { dragged.current = true; e.preventDefault() }
    const steps = Math.round(delta / DRAG_THRESHOLD_PX)
    const newValue = ((dragStartValue.current + steps) % total + total) % total
    if (newValue !== step) {
      hapticTick()
      onChange(newValue)
    }
  }, [step, total, onChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragged.current) openPicker()
    dragStartY.current = null
    dragged.current = false
    e.preventDefault()
  }, [openPicker])

  // Keyboard: arrows nudge, Home/End jump to extremes. Wraps because the knob is circular.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next: number | null = null
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = (step + 1) % total
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = (step - 1 + total) % total
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = total - 1
    if (next !== null) {
      e.preventDefault()
      hapticTick()
      onChange(next)
    }
  }, [step, total, onChange])

  return (
    <div
      ref={wrapperRef}
      className={styles.knobUnit}
      role="group"
      aria-label={label}
    >
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${label} value`}
        aria-valuemin={0}
        aria-valuemax={total - 1}
        aria-valuenow={step}
        aria-valuetext={lcdValue}
        onKeyDown={handleKeyDown}
        className={styles.knobFocusable}
      >
        <Knob step={step} total={total} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
      </div>
      <LCD value={lcdValue} onClick={openPicker} ariaLabel={`${label}: ${lcdValue} — open picker`} />
      <span className={styles.knobLabel}>{label}</span>
    </div>
  )
}

// ------------------------------------------------------------------
// Bounded WheelUnit (Brightness / Tension)
// ------------------------------------------------------------------

export interface WheelUnitProps {
  label: string
  lcdValue: string
  step: number
  total: number
  pickerType: PickerType
  arcMin?: number
  arcMax?: number
  onOpen: (type: PickerType, rect: DOMRect) => void
  onChange: (newValue: number) => void
}

export function WheelUnit({ label, lcdValue, step, total, pickerType, arcMin, arcMax, onOpen, onChange }: WheelUnitProps): React.ReactElement {
  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(step)
  const dragged = useRef(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const openPicker = useCallback(() => {
    if (wrapperRef.current) onOpen(pickerType, wrapperRef.current.getBoundingClientRect())
  }, [pickerType, onOpen])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY
    dragStartValue.current = step
    dragged.current = false
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }, [step])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    const delta = dragStartY.current - e.clientY
    if (Math.abs(delta) > 4) { dragged.current = true; e.preventDefault() }
    const steps = Math.round(delta / DRAG_THRESHOLD_PX)
    const newValue = Math.max(0, Math.min(total - 1, dragStartValue.current + steps))
    if (newValue !== step) {
      hapticTick()
      onChange(newValue)
    }
  }, [step, total, onChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragged.current) openPicker()
    dragStartY.current = null
    dragged.current = false
    e.preventDefault()
  }, [openPicker])

  // Keyboard: arrows nudge, Home/End jump to extremes. Bounded — clamps at edges.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next: number | null = null
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = Math.min(total - 1, step + 1)
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = Math.max(0, step - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = total - 1
    if (next !== null && next !== step) {
      e.preventDefault()
      hapticTick()
      onChange(next)
    }
  }, [step, total, onChange])

  return (
    <div
      ref={wrapperRef}
      className={styles.knobUnit}
      role="group"
      aria-label={label}
    >
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${label} value`}
        aria-valuemin={0}
        aria-valuemax={total - 1}
        aria-valuenow={step}
        aria-valuetext={lcdValue}
        onKeyDown={handleKeyDown}
        className={styles.knobFocusable}
      >
        <BoundedKnob step={step} total={total} arcMin={arcMin} arcMax={arcMax}
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
      </div>
      <LCD value={lcdValue} onClick={openPicker} ariaLabel={`${label}: ${lcdValue} — open picker`} />
      <span className={styles.knobLabel}>{label}</span>
    </div>
  )
}

// ------------------------------------------------------------------
// Volume KnobUnit — bounded knob, click=toggle mute, drag=set volume
// step 0-20 → volume 0-100% in 5% increments
// ------------------------------------------------------------------

export interface VolumeKnobUnitProps {
  volume: number           // 0–100
  onToggleMute: () => void
  onVolumeChange: (v: number) => void
}

export function VolumeKnobUnit({ volume, onToggleMute, onVolumeChange }: VolumeKnobUnitProps): React.ReactElement {
  const TOTAL = 21
  const step = Math.round(volume / 5)
  const dragStartY = useRef<number | null>(null)
  const dragStartStep = useRef<number>(step)
  const dragged = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY
    dragStartStep.current = Math.round(volume / 5)
    dragged.current = false
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }, [volume])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    const delta = dragStartY.current - e.clientY
    if (Math.abs(delta) > 4) { dragged.current = true; e.preventDefault() }
    const steps = Math.round(delta / DRAG_THRESHOLD_PX)
    const newStep = Math.max(0, Math.min(TOTAL - 1, dragStartStep.current + steps))
    if (newStep * 5 !== volume) {
      hapticTick()
      onVolumeChange(newStep * 5)
    }
  }, [volume, onVolumeChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragged.current) onToggleMute()
    dragStartY.current = null
    dragged.current = false
    e.preventDefault()
  }, [onToggleMute])

  // Keyboard on the slider track: arrows adjust volume in 5% steps, Home/End jump to mute/100%.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next: number | null = null
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = Math.min(TOTAL - 1, step + 1)
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = Math.max(0, step - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TOTAL - 1
    if (next !== null && next * 5 !== volume) {
      e.preventDefault()
      hapticTick()
      onVolumeChange(next * 5)
    }
  }, [step, volume, onVolumeChange])

  const lcdValue = volume === 0 ? 'MUTED' : `VOL ${volume}%`

  return (
    <div className={styles.knobUnit} role="group" aria-label="Volume">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Volume value"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={volume}
        aria-valuetext={lcdValue}
        onKeyDown={handleKeyDown}
        className={styles.knobFocusable}
      >
        <BoundedKnob step={step} total={TOTAL} arcMin={-135} arcMax={135}
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
      </div>
      <LCD value={lcdValue} onClick={onToggleMute} ariaLabel={volume === 0 ? 'Muted — tap to unmute' : `Volume ${volume}% — tap to mute`} />
      <span className={styles.knobLabel}>VOLUME</span>
    </div>
  )
}

// ------------------------------------------------------------------
// Picker — portaled to document.body to avoid layout shift
// ------------------------------------------------------------------

export interface PickerOption {
  label: string
  value: number
  brightnessDot?: number
  separatorBefore?: boolean
}

export interface PickerProps {
  options: PickerOption[]
  currentValue: number
  anchorRect: DOMRect
  ariaLabel?: string
  onSelect: (value: number) => void
  onClose: () => void
}

export function Picker({ options, currentValue, anchorRect, ariaLabel, onSelect, onClose }: PickerProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Escape closes; previously-focused element (the knob/LCD that opened the picker) gets focus back
  useDismissable(true, onClose)

  // Scroll the current option into view, then focus it so keyboard nav starts at the right place
  useEffect(() => {
    const container = containerRef.current
    const selected = selectedRef.current
    if (!container || !selected) return
    container.scrollTop = selected.offsetTop - container.clientHeight / 2 + selected.clientHeight / 2
    selected.focus()
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Element
      if (!target.closest('[data-picker]')) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return createPortal(
    <div
      ref={containerRef}
      data-picker
      className={styles.picker}
      style={{ left: anchorRect.left, top: anchorRect.bottom + 6 }}
      role="listbox"
      aria-label={ariaLabel ?? 'Options'}
    >
      {options.map(opt => (
        <React.Fragment key={opt.value}>
          {opt.separatorBefore && <div className={styles.pickerSeparator} aria-hidden />}
          <button
            ref={opt.value === currentValue ? selectedRef : undefined}
            role="option"
            aria-selected={opt.value === currentValue}
            className={[styles.pickerRow, opt.value === currentValue ? styles.pickerRowCurrent : ''].join(' ')}
            onClick={() => { onSelect(opt.value); onClose() }}
          >
            <span>{opt.label}</span>
            {opt.brightnessDot !== undefined && <BrightnessDot brightness={opt.brightnessDot} />}
          </button>
        </React.Fragment>
      ))}
    </div>,
    document.body
  )
}

