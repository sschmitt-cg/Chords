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

export interface ScaleMode {
  name: string
  brightness: number  // 0–100 global ordering score
}

export interface ScaleFamily {
  id: string
  name: string
  tension: 0 | 1 | 2  // count of augmented 2nd (3-semitone) steps
  intervals: [number, number, number, number, number, number, number]  // step sizes, sum = 12
  modes: [ScaleMode, ScaleMode, ScaleMode, ScaleMode, ScaleMode, ScaleMode, ScaleMode]
}

export type BrightnessEntry = { familyId: string; modeIndex: number; brightness: number }

// Guitar tuning: 6 MIDI values, index 0 = high E string, index 5 = low E string
export type GuitarTuning = [number, number, number, number, number, number]

export interface TuningPreset {
  id: string
  name: string
  category: string
  tuning: GuitarTuning
  warning?: string  // e.g. "Strings 4 and 5 are tuned above standard — use medium gauge or heavier"
}
