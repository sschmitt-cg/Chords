// TypeScript types for music theory data structures

export interface ScaleData {
  pitchClasses: number[]
  spelled: string[]
}

export interface HarmonyNote {
  label: string
  degree: number
  pc: number
  note: string
}

export interface HarmonyRow {
  index: number
  degree: string  // Roman numeral e.g. "ii"
  rootNote: string
  notes: HarmonyNote[]
}

export interface ChordQuality {
  name: string
  suffix: string
  valid: boolean
}

export interface ChordData {
  categories: {
    triads: HarmonyRow[]
    sevenths: HarmonyRow[]
    ninths: HarmonyRow[]
    suspended: HarmonyRow[]
  }
  degrees: HarmonyRow[]
}

export type ScaleType =
  | 'ionian' | 'dorian' | 'phrygian' | 'lydian'
  | 'mixolydian' | 'aeolian' | 'locrian'
  | 'major-pentatonic' | 'minor-pentatonic' | 'blues'
  | 'harmonic-minor' | 'melodic-minor'
  | 'whole-tone' | 'half-whole-dim' | 'whole-half-dim'

export type ChordFunction = 'tonic' | 'subdominant' | 'dominant'

// Guitar tuning: 6 MIDI values, index 0 = high E string, index 5 = low E string
export type GuitarTuning = [number, number, number, number, number, number]

export interface TuningPreset {
  id: string
  name: string
  category: string
  tuning: GuitarTuning
  warning?: string  // e.g. "Strings 4 and 5 are tuned above standard — use medium gauge or heavier"
}
