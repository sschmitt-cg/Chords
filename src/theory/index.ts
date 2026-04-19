// Music theory: scale spelling, chord analysis, harmony building
// Migrated from script.js — pure functions, no DOM dependencies.

import type {
  ScaleData,
  HarmonyRow,
  HarmonyNote,
  ChordQuality,
  ScaleType,
  ScaleFamily,
  BrightnessEntry,
} from './types'

// -------------------- CONSTANTS --------------------

export const NOTE_TO_INDEX: Record<string, number> = {
  C: 0,  'C#': 1, Db: 1,
  D: 2,  'D#': 3, Eb: 3,
  E: 4,
  F: 5,  'F#': 6, Gb: 6,
  G: 7,  'G#': 8, Ab: 8,
  A: 9,  'A#': 10, Bb: 10,
  B: 11,
}

// Diatonic intervals for each supported scale type
export const SCALE_PATTERNS: Record<ScaleType, number[]> = {
  ionian:            [0, 2, 4, 5, 7, 9, 11],
  dorian:            [0, 2, 3, 5, 7, 9, 10],
  phrygian:          [0, 1, 3, 5, 7, 8, 10],
  lydian:            [0, 2, 4, 6, 7, 9, 11],
  mixolydian:        [0, 2, 4, 5, 7, 9, 10],
  aeolian:           [0, 2, 3, 5, 7, 8, 10],
  locrian:           [0, 1, 3, 5, 6, 8, 10],
  // Non-diatonic types use 7-note spellings where applicable
  'major-pentatonic':  [0, 2, 4, 7, 9],
  'minor-pentatonic':  [0, 3, 5, 7, 10],
  blues:               [0, 3, 5, 6, 7, 10],
  'harmonic-minor':    [0, 2, 3, 5, 7, 8, 11],
  'melodic-minor':     [0, 2, 3, 5, 7, 9, 11],
  'whole-tone':        [0, 2, 4, 6, 8, 10],
  'half-whole-dim':    [0, 1, 3, 4, 6, 7, 9, 10],
  'whole-half-dim':    [0, 2, 3, 5, 6, 8, 9, 11],
}

// Display names for the seven diatonic modes (used in the mode selector)
export const MODE_NAMES: ScaleType[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
]

export const MODE_DISPLAY_NAMES: Record<ScaleType, string> = {
  ionian:             'Ionian (Major)',
  dorian:             'Dorian',
  phrygian:           'Phrygian',
  lydian:             'Lydian',
  mixolydian:         'Mixolydian',
  aeolian:            'Aeolian (Minor)',
  locrian:            'Locrian',
  'major-pentatonic': 'Major Pentatonic',
  'minor-pentatonic': 'Minor Pentatonic',
  blues:              'Blues',
  'harmonic-minor':   'Harmonic Minor',
  'melodic-minor':    'Melodic Minor',
  'whole-tone':       'Whole Tone',
  'half-whole-dim':   'Half-Whole Dim',
  'whole-half-dim':   'Whole-Half Dim',
}

export const KEY_OPTIONS = [
  { label: 'C',      value: 'C'  },
  { label: 'C#/Db',  value: 'C#' },
  { label: 'D',      value: 'D'  },
  { label: 'D#/Eb',  value: 'Eb' },
  { label: 'E',      value: 'E'  },
  { label: 'F',      value: 'F'  },
  { label: 'F#/Gb',  value: 'F#' },
  { label: 'G',      value: 'G'  },
  { label: 'G#/Ab',  value: 'Ab' },
  { label: 'A',      value: 'A'  },
  { label: 'A#/Bb',  value: 'Bb' },
  { label: 'B',      value: 'B'  },
]

const LETTER_TO_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export const ENHARMONIC_OPTIONS: Record<number, { sharp: string; flat: string }> = {
  1:  { sharp: 'C#', flat: 'Db' },
  3:  { sharp: 'D#', flat: 'Eb' },
  6:  { sharp: 'F#', flat: 'Gb' },
  8:  { sharp: 'G#', flat: 'Ab' },
  10: { sharp: 'A#', flat: 'Bb' },
}

// -------------------- UTILITIES --------------------

export function wrap(value: number, size: number): number {
  return ((value % size) + size) % size
}

function accidentalSymbol(offset: number): string {
  if (offset === 0) return ''
  const char = offset > 0 ? '#' : 'b'
  return char.repeat(Math.abs(offset))
}

function biasFromName(name: string): 'sharp' | 'flat' | 'neutral' {
  if (name.includes('#')) return 'sharp'
  if (name.includes('b')) return 'flat'
  return 'neutral'
}

function spellScale(_tonicPc: number, tonicName: string, pitchClasses: number[]): string[] {
  const bias = biasFromName(tonicName)
  const tonicLetter = tonicName[0].toUpperCase()
  const startIdx = LETTERS.indexOf(tonicLetter)
  const spelled = pitchClasses.map((pc, i) => {
    const letter = LETTERS[(startIdx + i) % LETTERS.length]
    const basePc = LETTER_TO_PC[letter]
    const candidates: number[] = []
    for (let offset = -2; offset <= 2; offset++) {
      if (wrap(basePc + offset, 12) === pc) candidates.push(offset)
    }
    let chosen = candidates[0]
    if (candidates.length > 1) {
      candidates.sort((a, b) => {
        const score = (o: number) => {
          let s = Math.abs(o)
          if (bias === 'flat' && o > 0) s += 0.3
          if (bias === 'sharp' && o < 0) s += 0.3
          return s
        }
        return score(a) - score(b)
      })
      chosen = candidates[0]
    }
    if (chosen === undefined) {
      const rawDiff = wrap(pc - basePc, 12)
      chosen = rawDiff > 6 ? rawDiff - 12 : rawDiff
    }
    return `${letter}${accidentalSymbol(chosen)}`
  })
  return spelled
}

// Variant for non-diatonic scales (pentatonic, etc.) that don't guarantee 7 unique letters
function spellScaleChromatic(_tonicPc: number, tonicName: string, pitchClasses: number[]): string[] {
  const bias = biasFromName(tonicName)
  const sharpMap = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const flatMap  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
  return pitchClasses.map(pc => {
    return bias === 'flat' ? flatMap[wrap(pc, 12)] : sharpMap[wrap(pc, 12)]
  })
}

function buildScaleDataForType(keyName: string, scaleType: ScaleType): ScaleData {
  const tonicPc = NOTE_TO_INDEX[keyName]
  const pattern = SCALE_PATTERNS[scaleType]
  const pitchClasses = pattern.map(step => wrap(tonicPc + step, 12))
  // Only attempt diatonic letter-by-letter spelling for 7-note scales starting at known letters
  const isDiatonic = pattern.length === 7
  const spelled = isDiatonic
    ? spellScale(tonicPc, keyName, pitchClasses)
    : spellScaleChromatic(tonicPc, keyName, pitchClasses)
  return { pitchClasses, spelled }
}

function isEnharmonicPc(pc: number): boolean {
  return Boolean(ENHARMONIC_OPTIONS[wrap(pc, 12)])
}

function accidentalScore(spelled: string[]): number {
  return spelled.reduce((sum, note) => {
    const acc = (note.match(/[#b]/g) || []).length
    if (acc === 0) return sum
    if (acc === 1) return sum + 1
    return sum + 3
  }, 0)
}

function findKeyIndexForPc(pc: number, prefLabel = ''): number {
  const bias = biasFromName(prefLabel)
  const matches = KEY_OPTIONS
    .map((opt, idx) => ({ idx, pc: NOTE_TO_INDEX[opt.value], label: opt.label }))
    .filter(item => item.pc === pc)
  if (!matches.length) return 0
  matches.sort((a, b) => {
    const score = (item: typeof a) => {
      let s = 0
      if (bias === 'flat' && item.label.includes('b')) s -= 1
      if (bias === 'sharp' && item.label.includes('#')) s -= 1
      return s
    }
    return score(a) - score(b)
  })
  return matches[0].idx
}

export function keyLabel(idx: number): string {
  return KEY_OPTIONS[wrap(idx, KEY_OPTIONS.length)].label
}

export function keyValue(idx: number): string {
  return KEY_OPTIONS[wrap(idx, KEY_OPTIONS.length)].value
}

// -------------------- PUBLIC SCALE API --------------------

/**
 * Compute the display scale for a given tonic pitch class and scale type.
 * Handles enharmonic selection automatically (picks fewer accidentals).
 * Pass `forcedPreference: 'sharp' | 'flat'` to override.
 */
export function computeDisplayScale(
  tonicPc: number,
  scaleType: ScaleType,
  forcedPreference: 'sharp' | 'flat' | null = null,
): { tonicLabel: string; pitchClasses: number[]; spelled: string[]; keyIdx: number; preferenceUsed: 'sharp' | 'flat' | null } {
  let preferenceUsed: 'sharp' | 'flat' | null = forcedPreference
  let tonicLabel: string

  if (isEnharmonicPc(tonicPc)) {
    const { sharp, flat } = ENHARMONIC_OPTIONS[tonicPc]
    if (!preferenceUsed) {
      const sharpScale = buildScaleDataForType(sharp, scaleType)
      const flatScale  = buildScaleDataForType(flat, scaleType)
      if (accidentalScore(sharpScale.spelled) < accidentalScore(flatScale.spelled)) preferenceUsed = 'sharp'
      else if (accidentalScore(flatScale.spelled) < accidentalScore(sharpScale.spelled)) preferenceUsed = 'flat'
      else preferenceUsed = 'flat'
    }
    tonicLabel = preferenceUsed === 'sharp' ? sharp : flat
  } else {
    preferenceUsed = null
    const idx = findKeyIndexForPc(tonicPc)
    tonicLabel = keyValue(idx)
  }

  const scaleData = buildScaleDataForType(tonicLabel, scaleType)
  const keyIdx = findKeyIndexForPc(tonicPc, tonicLabel)
  return { tonicLabel, pitchClasses: scaleData.pitchClasses, spelled: scaleData.spelled, keyIdx, preferenceUsed }
}

// -------------------- CHORD ANALYSIS --------------------

export function intervalQuality(int3: number, int5: number): ChordQuality {
  if (int3 === 4 && int5 === 7) return { name: 'major',      suffix: '',    valid: true }
  if (int3 === 3 && int5 === 7) return { name: 'minor',      suffix: 'm',   valid: true }
  if (int3 === 3 && int5 === 6) return { name: 'diminished', suffix: 'dim', valid: true }
  if (int3 === 4 && int5 === 8) return { name: 'augmented',  suffix: 'aug', valid: true }
  return { name: 'unknown', suffix: '?', valid: false }
}

export function seventhQuality(triadQual: ChordQuality, int7: number): { label: string; valid: boolean } {
  if (triadQual.name === 'major') {
    if (int7 === 11) return { label: 'maj7',     valid: true }
    if (int7 === 10) return { label: '7',         valid: true }
  }
  if (triadQual.name === 'minor') {
    if (int7 === 10) return { label: 'm7',       valid: true }
    if (int7 === 11) return { label: 'm(maj7)',  valid: true }
  }
  if (triadQual.name === 'diminished') {
    if (int7 === 10) return { label: 'm7b5',     valid: true }
    if (int7 === 9)  return { label: 'dim7',     valid: true }
  }
  if (triadQual.name === 'augmented') {
    if (int7 === 10) return { label: '7#5',      valid: true }
    if (int7 === 11) return { label: 'maj7#5',   valid: true }
  }
  return { label: '?7', valid: false }
}

export function ninthQuality(
  seventhQual: { label: string; valid: boolean },
  int9: number,
): { label: string; valid: boolean } {
  const isMajorNine = int9 === 2 || int9 === 14
  const isFlatNine  = int9 === 1 || int9 === 13
  if (!seventhQual.valid) return { label: `${seventhQual.label || '?7'}9`, valid: false }

  if (isMajorNine) {
    switch (seventhQual.label) {
      case 'maj7':     return { label: 'maj9',      valid: true }
      case '7':        return { label: '9',          valid: true }
      case 'm7':       return { label: 'm9',         valid: true }
      case 'm(maj7)':  return { label: 'm(maj9)',    valid: true }
      case 'm7b5':     return { label: 'm9b5',       valid: true }
      case 'dim7':     return { label: 'dim9',       valid: true }
      case '7#5':      return { label: '9#5',        valid: true }
      case 'maj7#5':   return { label: 'maj9#5',     valid: true }
      default:         return { label: `${seventhQual.label}9`, valid: true }
    }
  }

  if (isFlatNine) {
    switch (seventhQual.label) {
      case 'maj7':     return { label: 'maj7(b9)',      valid: true }
      case '7':        return { label: '7(b9)',          valid: true }
      case 'm7':       return { label: 'm7(b9)',         valid: true }
      case 'm(maj7)':  return { label: 'm(maj7)(b9)',   valid: true }
      case 'm7b5':     return { label: 'm7b5(b9)',       valid: true }
      case 'dim7':     return { label: 'dim7(b9)',       valid: true }
      case '7#5':      return { label: '7#5(b9)',        valid: true }
      case 'maj7#5':   return { label: 'maj7#5(b9)',    valid: true }
      default:         return { label: `${seventhQual.label}(b9)`, valid: true }
    }
  }

  switch (seventhQual.label) {
    case 'maj7':    return { label: 'maj9?',       valid: false }
    case '7':       return { label: '9?',           valid: false }
    case 'm7':      return { label: 'm9?',          valid: false }
    case 'm(maj7)': return { label: 'm(maj9?)',     valid: false }
    case 'm7b5':    return { label: 'm9b5?',        valid: false }
    case 'dim7':    return { label: 'dim9?',        valid: false }
    case '7#5':     return { label: '9#5?',         valid: false }
    case 'maj7#5':  return { label: 'maj9#5?',      valid: false }
    default:        return { label: `${seventhQual.label}9?`, valid: false }
  }
}

// -------------------- ROMANS --------------------

export function computeRomans(pitchClasses: number[]): string[] {
  if (!pitchClasses || pitchClasses.length !== 7) {
    return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
  }
  return pitchClasses.map((root, i) => {
    const int3 = wrap(pitchClasses[(i + 2) % 7] - root, 12)
    const int5 = wrap(pitchClasses[(i + 4) % 7] - root, 12)
    const triad = intervalQuality(int3, int5)
    let numeral = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i]
    if (triad.name === 'minor')      numeral = numeral.toLowerCase()
    if (triad.name === 'diminished') numeral = numeral.toLowerCase() + '°'
    return numeral
  })
}

// -------------------- HARMONY ROWS --------------------

export function chordNotesStringForRow(row: HarmonyRow, maxDegree = 7): string {
  return (row?.notes ?? [])
    .filter(n => n.degree <= maxDegree)
    .map(n => n.note)
    .join(' - ')
}

export function chordNameForRow(row: HarmonyRow, maxDegree = 7): string {
  if (!row?.notes?.length) return ''
  const root  = row.notes.find(n => n.degree === 1)
  const third = row.notes.find(n => n.degree === 3)
  const fifth  = row.notes.find(n => n.degree === 5)
  if (!root || !third || !fifth) return root?.note ?? ''

  const thirdInt = wrap(third.pc - root.pc, 12)
  const fifthInt  = wrap(fifth.pc - root.pc, 12)
  const triad = intervalQuality(thirdInt, fifthInt)

  const seventhNote    = row.notes.find(n => n.degree === 7)
  const ninthNote      = row.notes.find(n => n.degree === 9)
  const eleventhNote   = row.notes.find(n => n.degree === 11)
  const thirteenthNote = row.notes.find(n => n.degree === 13)

  let seventhQual: { label: string; valid: boolean } | null = null
  if (maxDegree >= 7 && seventhNote) {
    const int7 = wrap(seventhNote.pc - root.pc, 12)
    seventhQual = seventhQuality(triad, int7)
  }

  const alterations: string[] = []
  let highestExt = ''

  if (maxDegree >= 9 && ninthNote) {
    const int9 = wrap(ninthNote.pc - root.pc, 12)
    if (int9 === 1) alterations.push('b9')
    else if (int9 === 3) alterations.push('#9')
    if (!highestExt) highestExt = '9'
  }

  if (maxDegree >= 11 && eleventhNote) {
    const int11 = wrap(eleventhNote.pc - root.pc, 12)
    if (int11 === 6) alterations.push('#11')
    else if (int11 !== 5) alterations.push('b11')
    highestExt = '11'
  }

  if (maxDegree >= 13 && thirteenthNote) {
    const int13 = wrap(thirteenthNote.pc - root.pc, 12)
    if (int13 === 8) alterations.push('b13')
    else if (int13 === 10) alterations.push('#13')
    highestExt = '13'
  }

  const qualityTag = (() => {
    if (!seventhQual) return triad.suffix
    const useCondensed = Boolean(highestExt)
    if (!useCondensed) return seventhQual.label
    switch (seventhQual.label) {
      case 'maj7':     return 'maj'
      case '7':        return ''
      case 'm7':       return 'm'
      case 'm7b5':     return 'm7b5'
      case 'dim7':     return 'dim'
      case 'm(maj7)':  return 'm(maj7)'
      case '7#5':      return '7#5'
      case 'maj7#5':   return 'maj#5'
      default:         return seventhQual.label.replace(/7$/, '')
    }
  })()

  const label = `${root.note}${qualityTag}`
  const altStr = alterations.length ? `(${alterations.join(',')})` : ''
  if (!highestExt) return label
  const hasAlt13 = alterations.some(a => a.includes('13'))
  if (highestExt === '13') return `${label}${hasAlt13 ? '' : '13'}${altStr}`
  if (highestExt === '11') return `${label}11${altStr}`
  return `${label}9${altStr}`
}

export function buildHarmonyRowsForScale(scale: ScaleData): HarmonyRow[] {
  if (!scale?.pitchClasses?.length) return []
  const { pitchClasses, spelled } = scale
  const len = pitchClasses.length
  if (len < 7) return []  // harmony grid only meaningful for 7-note scales
  const romans = computeRomans(pitchClasses)

  return pitchClasses.map((pc, idx) => {
    const rootNote = spelled[idx]
    const notes: HarmonyNote[] = [
      { label: 'Root', degree: 1,  pc, note: rootNote },
      { label: '3',    degree: 3,  pc: pitchClasses[(idx + 2) % 7], note: spelled[(idx + 2) % 7] },
      { label: '5',    degree: 5,  pc: pitchClasses[(idx + 4) % 7], note: spelled[(idx + 4) % 7] },
      { label: '7',    degree: 7,  pc: pitchClasses[(idx + 6) % 7], note: spelled[(idx + 6) % 7] },
      { label: '9',    degree: 9,  pc: pitchClasses[(idx + 1) % 7], note: spelled[(idx + 1) % 7] },
      { label: '11',   degree: 11, pc: pitchClasses[(idx + 3) % 7], note: spelled[(idx + 3) % 7] },
      { label: '13',   degree: 13, pc: pitchClasses[(idx + 5) % 7], note: spelled[(idx + 5) % 7] },
    ]
    return { index: idx, degree: romans[idx], rootNote, notes }
  })
}

// -------------------- PITCH CLASS HELPERS --------------------

export function noteNameToPc(note: string): number | null {
  if (!note) return null
  const match = note.trim().match(/^([A-Ga-g])([#bx♯♭]{0,2})/)
  if (!match) return null
  const letter = match[1].toUpperCase()
  const basePc = LETTER_TO_PC[letter]
  if (basePc === undefined) return null
  const accidentals = match[2].replace(/♯/g, '#').replace(/♭/g, 'b')
  let offset = 0
  for (const char of accidentals) {
    if (char === '#') offset += 1
    if (char === 'b') offset -= 1
    if (char === 'x') offset += 2
  }
  return wrap(basePc + offset, 12)
}

export function chordNotesToPcs(notes: string): number[] {
  if (!notes) return []
  return notes.split('-').map(n => n.trim()).map(noteNameToPc).filter((pc): pc is number => pc !== null)
}

export const pcColorVar = (pc: number): string => `var(--pc-${wrap(pc, 12)})`

// -------------------- SCALE FAMILIES --------------------

export const SCALE_FAMILIES: ScaleFamily[] = [
  {
    id: 'major', name: 'Major', tension: 0,
    intervals: [2, 2, 1, 2, 2, 2, 1],
    modes: [
      { name: 'Ionian',      lcdName: 'IONIAN',  brightness: 60 },
      { name: 'Dorian',      lcdName: 'DORIAN',  brightness: 43 },
      { name: 'Phrygian',    lcdName: 'PHRYG',   brightness: 28 },
      { name: 'Lydian',      lcdName: 'LYDIAN',  brightness: 75 },
      { name: 'Mixolydian',  lcdName: 'MIXOLYD', brightness: 52 },
      { name: 'Aeolian',     lcdName: 'AEOLIAN', brightness: 36 },
      { name: 'Locrian',     lcdName: 'LOCRIAN', brightness: 12 },
    ],
  },
  {
    id: 'melodic-minor', name: 'Melodic Minor', tension: 0,
    intervals: [2, 1, 2, 2, 2, 2, 1],
    modes: [
      { name: 'Melodic Minor',    lcdName: 'MEL MIN', brightness: 48 },
      { name: 'Dorian \u266d2',   lcdName: 'DOR b2',  brightness: 33 },
      { name: 'Lydian Aug.',      lcdName: 'LYD AUG', brightness: 82 },
      { name: 'Lydian Dom.',      lcdName: 'LYD DOM', brightness: 68 },
      { name: 'Mixolydian \u266d6', lcdName: 'MIX b6', brightness: 50 },
      { name: 'Locrian \u266f2',  lcdName: 'LOC #2',  brightness: 22 },
      { name: 'Altered',          lcdName: 'ALTERED', brightness: 6  },
    ],
  },
  {
    id: 'harmonic-minor', name: 'Harmonic Minor', tension: 1,
    intervals: [2, 1, 2, 2, 1, 3, 1],
    modes: [
      { name: 'Harmonic Minor',   lcdName: 'HRM MIN', brightness: 40 },
      { name: 'Locrian \u266f6',  lcdName: 'LOC #6',  brightness: 18 },
      { name: 'Ionian \u266f5',   lcdName: 'ION #5',  brightness: 64 },
      { name: 'Dorian \u266f4',   lcdName: 'DOR #4',  brightness: 46 },
      { name: 'Phrygian Dom.',    lcdName: 'PHRYG D', brightness: 34 },
      { name: 'Lydian \u266f2',   lcdName: 'LYD #2',  brightness: 72 },
      { name: 'Alt. Diminished',  lcdName: 'ALT DIM', brightness: 8  },
    ],
  },
  {
    id: 'harmonic-major', name: 'Harmonic Major', tension: 1,
    intervals: [2, 2, 1, 2, 1, 3, 1],
    modes: [
      { name: 'Harmonic Major',        lcdName: 'HRM MAJ', brightness: 57 },
      { name: 'Dorian \u266d5',        lcdName: 'DOR b5',  brightness: 38 },
      { name: 'Phrygian \u266d4',      lcdName: 'PHR b4',  brightness: 23 },
      { name: 'Lydian \u266d3',        lcdName: 'LYD b3',  brightness: 66 },
      { name: 'Mixolydian \u266d2',    lcdName: 'MIX b2',  brightness: 47 },
      { name: 'Lydian Aug. \u266f2',   lcdName: 'LA #2',   brightness: 80 },
      { name: 'Locrian \u266d\u266d7', lcdName: 'LOC bb7', brightness: 13 },
    ],
  },
  {
    id: 'double-harmonic', name: 'Double Harmonic', tension: 2,
    intervals: [1, 3, 1, 2, 1, 3, 1],
    modes: [
      { name: 'Double Harmonic',        lcdName: 'DBL HRM', brightness: 44 },
      { name: 'Lydian \u266f2 \u266f6', lcdName: 'LY#2#6',  brightness: 78 },
      { name: 'Ultraphrygian',          lcdName: 'UPHRYG',  brightness: 19 },
      { name: 'Hungarian Minor',        lcdName: 'HUNG',    brightness: 37 },
      { name: 'Oriental',               lcdName: 'ORIENT',  brightness: 41 },
      { name: 'Ionian Aug. \u266f2',    lcdName: 'ION A#2', brightness: 65 },
      { name: 'Locrian \u266d\u266d3',  lcdName: 'LC bb3',  brightness: 7  },
    ],
  },
]

// Rotate family interval array by modeIndex and return pitch-class offsets from 0.
export function getModeIntervals(family: ScaleFamily, modeIndex: number): number[] {
  const steps = family.intervals
  const pcs: number[] = [0]
  let acc = 0
  for (let i = 0; i < 6; i++) {
    acc += steps[(modeIndex + i) % 7]
    pcs.push(acc)
  }
  return pcs
}

// Internal: build ScaleData from pitch-class offsets (same as buildScaleDataForType but pattern-driven).
function buildScaleDataForPattern(keyName: string, pattern: number[]): ScaleData {
  const tonicPc = NOTE_TO_INDEX[keyName]
  const pitchClasses = pattern.map(step => wrap(tonicPc + step, 12))
  const spelled = spellScale(tonicPc, keyName, pitchClasses)
  return { pitchClasses, spelled }
}

// Family-aware analogue of computeDisplayScale.
export function computeDisplayScaleFromFamily(
  tonicPc: number,
  familyId: string,
  modeIndex: number,
  forcedPreference: 'sharp' | 'flat' | null = null,
): { tonicLabel: string; pitchClasses: number[]; spelled: string[]; keyIdx: number; preferenceUsed: 'sharp' | 'flat' | null } {
  const family = SCALE_FAMILIES.find(f => f.id === familyId) ?? SCALE_FAMILIES[0]
  const pattern = getModeIntervals(family, modeIndex)

  let preferenceUsed: 'sharp' | 'flat' | null = forcedPreference
  let tonicLabel: string

  if (isEnharmonicPc(tonicPc)) {
    const { sharp, flat } = ENHARMONIC_OPTIONS[tonicPc]
    if (!preferenceUsed) {
      const sharpData = buildScaleDataForPattern(sharp, pattern)
      const flatData  = buildScaleDataForPattern(flat, pattern)
      if (accidentalScore(sharpData.spelled) < accidentalScore(flatData.spelled)) preferenceUsed = 'sharp'
      else if (accidentalScore(flatData.spelled) < accidentalScore(sharpData.spelled)) preferenceUsed = 'flat'
      else preferenceUsed = 'flat'
    }
    tonicLabel = preferenceUsed === 'sharp' ? sharp : flat
  } else {
    preferenceUsed = null
    const idx = findKeyIndexForPc(tonicPc)
    tonicLabel = keyValue(idx)
  }

  const scaleData = buildScaleDataForPattern(tonicLabel, pattern)
  const keyIdx = findKeyIndexForPc(tonicPc, tonicLabel)
  return { tonicLabel, pitchClasses: scaleData.pitchClasses, spelled: scaleData.spelled, keyIdx, preferenceUsed }
}

// Returns semitone offset of mode root from family root (e.g. Dorian root is 2 semitones above Ionian root)
export function getModeRootOffset(family: ScaleFamily, modeIndex: number): number {
  return family.intervals.slice(0, modeIndex).reduce((s, v) => s + v, 0)
}

// Returns pitch classes for all 7 notes of the mode, starting from rootPc
export function getModeNotes(rootPc: number, family: ScaleFamily, modeIndex: number): number[] {
  const iv = getModeIntervals(family, modeIndex)
  const notes = [rootPc]
  let p = rootPc
  for (let i = 0; i < 6; i++) {
    p = (p + iv[i]) % 12
    notes.push(p)
  }
  return notes
}

// All 35 modes sorted by brightness ascending (darkest = index 0), indexed by familyIndex (number)
export const BRIGHTNESS_ORDER: Array<{ familyIndex: number; modeIndex: number; brightness: number }> =
  SCALE_FAMILIES.flatMap((f, fi) =>
    f.modes.map((m, mi) => ({ familyIndex: fi, modeIndex: mi, brightness: m.brightness }))
  ).sort((a, b) => a.brightness - b.brightness)

// All 35 modes sorted by brightness ascending (legacy: uses familyId string key)
export const GLOBAL_BRIGHTNESS_ORDER: BrightnessEntry[] = SCALE_FAMILIES
  .flatMap(f => f.modes.map((m, i) => ({ familyId: f.id, modeIndex: i, brightness: m.brightness })))
  .sort((a, b) => a.brightness - b.brightness)
