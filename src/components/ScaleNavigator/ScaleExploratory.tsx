// ScaleExploratory — BRIGHTNESS / TENSION / VOLUME knobs (Scale Explorer section)

import React, { useState, useCallback } from 'react'
import { useTonalStore } from '../../store/index'
import { useAudio } from '../../hooks/useAudio'
import { SCALE_FAMILIES, BRIGHTNESS_ORDER } from '../../theory/index'
import { WheelUnit, VolumeKnobUnit, Picker, type PickerType, type PickerOption } from './index'
import { TENSION_LCD } from './shared'
import styles from './ScaleNavigator.module.css'

interface PickerState {
  type: PickerType
  anchorRect: DOMRect
}

export default function ScaleExploratory(): React.ReactElement {
  const {
    currentMode,
    currentTension,
    currentBrightnessPosition,
    setModeByBrightness,
    setModeByTension,
  } = useTonalStore()

  const { volume, toggleMuteVolume, setVolume } = useAudio()

  const [picker, setPicker] = useState<PickerState | null>(null)

  const openPicker = useCallback((type: PickerType, rect: DOMRect) => {
    setPicker(prev => prev?.type === type ? null : { type, anchorRect: rect })
  }, [])

  const closePicker = useCallback(() => setPicker(null), [])

  const brightnessOptions: PickerOption[] = BRIGHTNESS_ORDER.map((entry, pos) => {
    const f = SCALE_FAMILIES[entry.familyIndex]
    const m = f.modes[entry.modeIndex]
    return { label: `${m.name} (${f.name})`, value: pos, brightnessDot: m.brightness }
  })

  const tensionOptions: PickerOption[] = [
    { label: 'Diatonic — no augmented 2nds', value: 0 },
    { label: '1 Augmented 2nd', value: 1 },
    { label: '2 Augmented 2nds', value: 2 },
  ]

  function handlePickerSelect(value: number) {
    if (!picker) return
    switch (picker.type) {
      case 'brightness': setModeByBrightness(value); break
      case 'tension':    setModeByTension(value as 0 | 1 | 2); break
    }
  }

  const pickerOptions: PickerOption[] =
    picker?.type === 'brightness' ? brightnessOptions : tensionOptions

  const pickerValue =
    picker?.type === 'brightness' ? currentBrightnessPosition : currentTension

  return (
    <div className={styles.outer}>
      <div className={styles.panel}>
        <div className={styles.region}>
          <span className={styles.regionLabel}>EXPLORATORY</span>
          <div className={styles.knobRow}>
            <WheelUnit label="BRIGHTNESS" lcdValue={currentMode.lcdName}         step={currentBrightnessPosition} total={BRIGHTNESS_ORDER.length} pickerType="brightness" onOpen={openPicker} onChange={pos => setModeByBrightness(pos)} />
            {/* Tension has 3 steps — use a short arc confined to the upper face of the knob */}
            <WheelUnit label="TENSION"    lcdValue={TENSION_LCD[currentTension]}  step={currentTension}            total={3}                        pickerType="tension"    arcMin={-75} arcMax={75} onOpen={openPicker} onChange={t => setModeByTension(t as 0 | 1 | 2)} />
            <VolumeKnobUnit volume={volume} onToggleMute={toggleMuteVolume} onVolumeChange={setVolume} />
          </div>
        </div>
      </div>

      {picker && (
        <Picker
          options={pickerOptions}
          currentValue={pickerValue}
          anchorRect={picker.anchorRect}
          onSelect={handlePickerSelect}
          onClose={closePicker}
        />
      )}
    </div>
  )
}
