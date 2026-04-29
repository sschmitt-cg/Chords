// Non-component constants and helpers shared between ScaleLogical and ScaleExploratory

import { ENHARMONIC_OPTIONS, wrap } from '../../theory/index'

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

export function pcName(pc: number, enharmonicPrefs: Record<number, 'sharp' | 'flat'>): string {
  const norm = wrap(pc, 12)
  const opt = ENHARMONIC_OPTIONS[norm]
  if (!opt) return SHARP_NAMES[norm]
  const pref = enharmonicPrefs[norm]
  if (pref === 'flat') return FLAT_NAMES[norm]
  if (pref === 'sharp') return SHARP_NAMES[norm]
  return FLAT_NAMES[norm]
}

export const FAMILY_LCD: Record<string, string> = {
  'major':           'MAJOR',
  'melodic-minor':   'MEL MIN',
  'harmonic-minor':  'HRM MIN',
  'harmonic-major':  'HRM MAJ',
  'double-harmonic': 'DBL HRM',
}

export const TENSION_LCD = ['DIA', '1 AUG', '2 AUG']
