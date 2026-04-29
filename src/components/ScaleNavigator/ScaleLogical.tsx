// ScaleLogical — ROOT / FAMILY / MODE knobs (Key & Mode section)

import React, { useState, useCallback } from 'react'
import { useTonalStore } from '../../store/index'
import { SCALE_FAMILIES } from '../../theory/index'
import { KnobUnit, Picker, type PickerType, type PickerOption } from './index'
import { pcName, FAMILY_LCD } from './shared'
import styles from './ScaleNavigator.module.css'

interface PickerState {
  type: PickerType
  anchorRect: DOMRect
}

export default function ScaleLogical(): React.ReactElement {
  const {
    currentModeRootPc,
    familyIndex,
    modeIndex,
    currentFamily,
    currentMode,
    enharmonicPrefs,
    setKey,
    setFamily,
    setModeIndex,
    setModeIndexPreservingTonic,
  } = useTonalStore()

  const [picker, setPicker] = useState<PickerState | null>(null)

  const openPicker = useCallback((type: PickerType, rect: DOMRect) => {
    setPicker(prev => prev?.type === type ? null : { type, anchorRect: rect })
  }, [])

  const closePicker = useCallback(() => setPicker(null), [])

  const rootOptions: PickerOption[] = Array.from({ length: 12 }, (_, i) => ({
    label: pcName(i, enharmonicPrefs),
    value: i,
  }))

  const familyOptions: PickerOption[] = SCALE_FAMILIES.map((f, i) => ({
    label: f.name,
    value: i,
  }))

  const modeOptions: PickerOption[] = currentFamily.modes.map((m, i) => ({
    label: m.name,
    value: i,
    brightnessDot: m.brightness,
  }))

  function handlePickerSelect(value: number) {
    if (!picker) return
    switch (picker.type) {
      case 'root':   setKey(value); break
      case 'family': setFamily(value); break
      case 'mode':   setModeIndexPreservingTonic(value); break
    }
  }

  function handleKnobChange(type: 'root' | 'family' | 'mode', newValue: number) {
    if (type === 'root') setKey(newValue)
    else if (type === 'family') setFamily(newValue)
    else setModeIndex(newValue)
  }

  const pickerOptions: PickerOption[] =
    picker?.type === 'root'   ? rootOptions
    : picker?.type === 'family' ? familyOptions
    : modeOptions

  const pickerValue =
    picker?.type === 'root'   ? currentModeRootPc
    : picker?.type === 'family' ? familyIndex
    : modeIndex

  return (
    <div className={styles.outer}>
      <div className={styles.panel}>
        <div className={styles.region}>
          <span className={styles.regionLabel}>LOGICAL</span>
          <div className={styles.knobRow}>
            <KnobUnit label="ROOT"   lcdValue={pcName(currentModeRootPc, enharmonicPrefs)} step={currentModeRootPc} total={12} pickerType="root"   onOpen={openPicker} onChange={v => handleKnobChange('root', v)} />
            <KnobUnit label="FAMILY" lcdValue={FAMILY_LCD[currentFamily.id] ?? currentFamily.name.toUpperCase()} step={familyIndex} total={5} pickerType="family" onOpen={openPicker} onChange={v => handleKnobChange('family', v)} />
            <KnobUnit label="MODE"   lcdValue={currentMode.lcdName} step={modeIndex} total={7} pickerType="mode" onOpen={openPicker} onChange={v => handleKnobChange('mode', v)} />
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
