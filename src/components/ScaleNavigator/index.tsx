// ScaleNavigator — shared React components used by ScaleLogical and ScaleExploratory

import React, { useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './ScaleNavigator.module.css'

export const DRAG_THRESHOLD_PX = 22

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

export function Knob({ step, total, onPointerDown, onPointerMove, onPointerUp }: KnobProps) {
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
        stroke={isCurrent ? '#6670e8' : '#2a3878'}
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
      <circle cx={36} cy={36} r={22} fill="#223070" />
      <circle cx={36} cy={36} r={21} fill="none" stroke="#384888" strokeWidth={0.5} />
      <line x1={36} y1={36} x2={indX} y2={indY} stroke="#6670e8" strokeWidth={2} strokeLinecap="round" />
      <circle cx={indX} cy={indY} r={2.5} fill="#9098f8" />
      <circle cx={36} cy={36} r={3} fill="#1a2660" />
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

export function BoundedKnob({ step, total, arcMin = -135, arcMax = 135, onPointerDown, onPointerMove, onPointerUp }: BoundedKnobProps) {
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
        stroke={isCurrent ? '#9098f8' : isFilled ? '#6670e8' : '#2a3878'}
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
      <circle cx={36} cy={36} r={22} fill="#223070" />
      <circle cx={36} cy={36} r={21} fill="none" stroke="#384888" strokeWidth={0.5} />
      <line x1={36} y1={36} x2={indX} y2={indY} stroke="#6670e8" strokeWidth={2} strokeLinecap="round" />
      <circle cx={indX} cy={indY} r={2.5} fill="#9098f8" />
      <circle cx={36} cy={36} r={3} fill="#1a2660" />
    </svg>
  )
}

// ------------------------------------------------------------------
// LCD display
// ------------------------------------------------------------------

export function LCD({ value, onClick }: { value: string; onClick?: () => void }) {
  return (
    <div className={styles.lcd} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {value}
    </div>
  )
}

// ------------------------------------------------------------------
// Brightness sun icon for picker rows
// ------------------------------------------------------------------

export function BrightnessDot({ brightness }: { brightness: number }) {
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

export function KnobUnit({ label, lcdValue, step, total, pickerType, onOpen, onChange }: KnobUnitProps) {
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
    if (newValue !== step) onChange(newValue)
  }, [step, total, onChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragged.current) openPicker()
    dragStartY.current = null
    dragged.current = false
    e.preventDefault()
  }, [openPicker])

  return (
    <div ref={wrapperRef} className={styles.knobUnit}>
      <Knob step={step} total={total} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
      <LCD value={lcdValue} />
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

export function WheelUnit({ label, lcdValue, step, total, pickerType, arcMin, arcMax, onOpen, onChange }: WheelUnitProps) {
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
    if (newValue !== step) onChange(newValue)
  }, [step, total, onChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragged.current) openPicker()
    dragStartY.current = null
    dragged.current = false
    e.preventDefault()
  }, [openPicker])

  return (
    <div ref={wrapperRef} className={styles.knobUnit}>
      <BoundedKnob step={step} total={total} arcMin={arcMin} arcMax={arcMax}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
      <LCD value={lcdValue} />
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

export function VolumeKnobUnit({ volume, onToggleMute, onVolumeChange }: VolumeKnobUnitProps) {
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
    if (newStep * 5 !== volume) onVolumeChange(newStep * 5)
  }, [volume, onVolumeChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragged.current) onToggleMute()
    dragStartY.current = null
    dragged.current = false
    e.preventDefault()
  }, [onToggleMute])

  const lcdValue = volume === 0 ? 'MUTED' : `VOL ${volume}%`

  return (
    <div className={styles.knobUnit}>
      <BoundedKnob step={step} total={TOTAL} arcMin={-135} arcMax={135}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />
      <LCD value={lcdValue} />
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
}

export interface PickerProps {
  options: PickerOption[]
  currentValue: number
  anchorRect: DOMRect
  onSelect: (value: number) => void
  onClose: () => void
}

export function Picker({ options, currentValue, anchorRect, onSelect, onClose }: PickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Scroll selected item to vertical center after both refs are attached
  useEffect(() => {
    const container = containerRef.current
    const selected = selectedRef.current
    if (!container || !selected) return
    container.scrollTop = selected.offsetTop - container.clientHeight / 2 + selected.clientHeight / 2
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
    <div ref={containerRef} data-picker className={styles.picker} style={{ left: anchorRect.left, top: anchorRect.bottom + 6 }}>
      {options.map(opt => (
        <button
          key={opt.value}
          ref={opt.value === currentValue ? selectedRef : undefined}
          className={[styles.pickerRow, opt.value === currentValue ? styles.pickerRowCurrent : ''].join(' ')}
          onClick={() => { onSelect(opt.value); onClose() }}
        >
          <span>{opt.label}</span>
          {opt.brightnessDot !== undefined && <BrightnessDot brightness={opt.brightnessDot} />}
        </button>
      ))}
    </div>,
    document.body
  )
}

