import { describe, it, expect } from 'vitest'
import {
  wrap,
  computeDisplayScale,
  computeDisplayScaleFromFamily,
  getModeIntervals,
  getModeRootOffset,
  getModeNotes,
  computeRomans,
  buildHarmonyRowsForScale,
  chordNameForRow,
  intervalQuality,
  noteNameToPc,
  chordNotesToPcs,
  SCALE_FAMILIES,
  BRIGHTNESS_ORDER,
  GLOBAL_BRIGHTNESS_ORDER,
  MODE_NAMES,
} from '../index'
import type { ScaleType } from '../types'

describe('wrap', () => {
  it('wraps positive values into [0, size)', () => {
    expect(wrap(0, 12)).toBe(0)
    expect(wrap(11, 12)).toBe(11)
    expect(wrap(12, 12)).toBe(0)
    expect(wrap(25, 12)).toBe(1)
  })

  it('wraps negative values into [0, size)', () => {
    expect(wrap(-1, 12)).toBe(11)
    expect(wrap(-13, 12)).toBe(11)
  })
})

describe('computeDisplayScale — diatonic modes in C', () => {
  const cases: Array<[ScaleType, string[]]> = [
    ['ionian',     ['C',  'D',  'E',  'F',  'G',  'A',  'B']],
    ['dorian',     ['C',  'D',  'Eb', 'F',  'G',  'A',  'Bb']],
    ['phrygian',   ['C',  'Db', 'Eb', 'F',  'G',  'Ab', 'Bb']],
    ['lydian',     ['C',  'D',  'E',  'F#', 'G',  'A',  'B']],
    ['mixolydian', ['C',  'D',  'E',  'F',  'G',  'A',  'Bb']],
    ['aeolian',    ['C',  'D',  'Eb', 'F',  'G',  'Ab', 'Bb']],
    ['locrian',    ['C',  'Db', 'Eb', 'F',  'Gb', 'Ab', 'Bb']],
  ]

  it.each(cases)('C %s spells as %j', (mode, expected) => {
    const { spelled } = computeDisplayScale(0, mode)
    expect(spelled).toEqual(expected)
  })
})

describe('computeDisplayScale — enharmonic selection', () => {
  it('picks the spelling with fewer accidentals for Eb Ionian (tonic pc 3)', () => {
    const { tonicLabel, spelled } = computeDisplayScale(3, 'ionian')
    expect(tonicLabel).toBe('Eb')
    expect(spelled).toEqual(['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'])
  })

  it('defaults to flat spelling when accidental count ties (F#/Gb Ionian)', () => {
    const { tonicLabel, spelled } = computeDisplayScale(6, 'ionian')
    expect(tonicLabel).toBe('Gb')
    expect(spelled).toEqual(['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'])
  })

  it('honors forced sharp preference (F# Ionian contains E#)', () => {
    const { tonicLabel, spelled, preferenceUsed } = computeDisplayScale(6, 'ionian', 'sharp')
    expect(tonicLabel).toBe('F#')
    expect(preferenceUsed).toBe('sharp')
    expect(spelled).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'])
    expect(spelled).toContain('E#')
  })

  it('honors forced sharp preference (C# Lydian contains B#)', () => {
    const { spelled } = computeDisplayScale(1, 'lydian', 'sharp')
    expect(spelled[0]).toBe('C#')
    expect(spelled).toContain('B#')
  })

  it('produces Cb in Gb Ionian', () => {
    const { spelled } = computeDisplayScale(6, 'ionian', 'flat')
    expect(spelled).toContain('Cb')
  })
})

describe('computeDisplayScaleFromFamily — family × mode coverage', () => {
  it('C Major family mode 0 (Ionian) matches diatonic C major', () => {
    const { spelled } = computeDisplayScaleFromFamily(0, 'major', 0)
    expect(spelled).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
  })

  it('A Melodic Minor mode 0 spells as A B C D E F# G#', () => {
    const { spelled } = computeDisplayScaleFromFamily(9, 'melodic-minor', 0, 'sharp')
    expect(spelled).toEqual(['A', 'B', 'C', 'D', 'E', 'F#', 'G#'])
  })

  it('A Harmonic Minor mode 0 spells as A B C D E F G#', () => {
    const { spelled } = computeDisplayScaleFromFamily(9, 'harmonic-minor', 0, 'sharp')
    expect(spelled).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G#'])
  })

  it('every family × every mode rooted at C produces 7 unique pitch classes', () => {
    for (const family of SCALE_FAMILIES) {
      for (let mi = 0; mi < 7; mi++) {
        const { pitchClasses, spelled } = computeDisplayScaleFromFamily(0, family.id, mi)
        expect(pitchClasses).toHaveLength(7)
        expect(new Set(pitchClasses).size).toBe(7)
        expect(spelled).toHaveLength(7)
      }
    }
  })

  it('unknown familyId falls back to the major family', () => {
    const { spelled } = computeDisplayScaleFromFamily(0, 'not-a-family', 0)
    expect(spelled).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
  })
})

describe('getModeIntervals / getModeRootOffset / getModeNotes', () => {
  const major = SCALE_FAMILIES[0]

  it('returns [0,2,4,5,7,9,11] for Major mode 0 (Ionian)', () => {
    expect(getModeIntervals(major, 0)).toEqual([0, 2, 4, 5, 7, 9, 11])
  })

  it('returns [0,2,3,5,7,9,10] for Major mode 1 (Dorian)', () => {
    expect(getModeIntervals(major, 1)).toEqual([0, 2, 3, 5, 7, 9, 10])
  })

  it('returns correct mode root offset', () => {
    expect(getModeRootOffset(major, 0)).toBe(0)
    expect(getModeRootOffset(major, 1)).toBe(2)
    expect(getModeRootOffset(major, 5)).toBe(9)
  })

  it('getModeNotes rooted at A for Major mode 5 (Aeolian) = A B C D E F G', () => {
    expect(getModeNotes(9, major, 5)).toEqual([9, 11, 0, 2, 4, 5, 7])
  })
})

describe('computeRomans', () => {
  it('C major → I ii iii IV V vi vii°', () => {
    const cMajor = [0, 2, 4, 5, 7, 9, 11]
    expect(computeRomans(cMajor)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
  })

  it('A natural minor → i ii° III iv v VI VII', () => {
    const aMinor = [9, 11, 0, 2, 4, 5, 7]
    expect(computeRomans(aMinor)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'])
  })

  it('returns neutral uppercase numerals for non-7-note input', () => {
    expect(computeRomans([0, 2, 4])).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'])
  })
})

describe('intervalQuality', () => {
  it('identifies major / minor / diminished / augmented triads', () => {
    expect(intervalQuality(4, 7).name).toBe('major')
    expect(intervalQuality(3, 7).name).toBe('minor')
    expect(intervalQuality(3, 6).name).toBe('diminished')
    expect(intervalQuality(4, 8).name).toBe('augmented')
  })

  it('identifies sus2 / sus4 / flat-five', () => {
    expect(intervalQuality(2, 7).name).toBe('sus2')
    expect(intervalQuality(5, 7).name).toBe('sus4')
    expect(intervalQuality(4, 6).name).toBe('flat-five')
  })

  it('returns invalid quality for unrecognized intervals', () => {
    const q = intervalQuality(1, 2)
    expect(q.valid).toBe(false)
  })
})

describe('buildHarmonyRowsForScale + chordNameForRow', () => {
  const cMajor = computeDisplayScale(0, 'ionian')
  const rows = buildHarmonyRowsForScale(cMajor)

  it('produces 7 harmony rows for a diatonic scale', () => {
    expect(rows).toHaveLength(7)
  })

  it('names triads of C major correctly at maxDegree=5', () => {
    expect(chordNameForRow(rows[0], 5)).toBe('C')
    expect(chordNameForRow(rows[1], 5)).toBe('Dm')
    expect(chordNameForRow(rows[2], 5)).toBe('Em')
    expect(chordNameForRow(rows[3], 5)).toBe('F')
    expect(chordNameForRow(rows[4], 5)).toBe('G')
    expect(chordNameForRow(rows[5], 5)).toBe('Am')
    expect(chordNameForRow(rows[6], 5)).toBe('Bdim')
  })

  it('names sevenths of C major correctly at maxDegree=7', () => {
    expect(chordNameForRow(rows[0], 7)).toBe('Cmaj7')
    expect(chordNameForRow(rows[1], 7)).toBe('Dm7')
    expect(chordNameForRow(rows[4], 7)).toBe('G7')
    expect(chordNameForRow(rows[6], 7)).toBe('Bm7b5')
  })

  it('returns [] for non-7-note input', () => {
    expect(buildHarmonyRowsForScale({ pitchClasses: [0, 2, 4], spelled: ['C', 'D', 'E'] })).toEqual([])
  })
})

describe('noteNameToPc / chordNotesToPcs', () => {
  it('parses natural notes', () => {
    expect(noteNameToPc('C')).toBe(0)
    expect(noteNameToPc('F')).toBe(5)
    expect(noteNameToPc('B')).toBe(11)
  })

  it('parses sharps and flats (ascii and unicode)', () => {
    expect(noteNameToPc('C#')).toBe(1)
    expect(noteNameToPc('Db')).toBe(1)
    expect(noteNameToPc('C♯')).toBe(1)
    expect(noteNameToPc('D♭')).toBe(1)
    expect(noteNameToPc('Fx')).toBe(7)
  })

  it('returns null for empty or malformed input', () => {
    expect(noteNameToPc('')).toBeNull()
    expect(noteNameToPc('H')).toBeNull()
  })

  it('chordNotesToPcs splits and parses a dash-joined chord string', () => {
    expect(chordNotesToPcs('C - E - G')).toEqual([0, 4, 7])
    expect(chordNotesToPcs('')).toEqual([])
  })
})

describe('SCALE_FAMILIES structural invariants', () => {
  it('has 5 families', () => {
    expect(SCALE_FAMILIES).toHaveLength(5)
  })

  it.each(SCALE_FAMILIES.map(f => [f.id, f]))('%s: intervals sum to 12 and has 7 modes', (_id, family) => {
    const sum = family.intervals.reduce((a, b) => a + b, 0)
    expect(sum).toBe(12)
    expect(family.modes).toHaveLength(7)
  })

  it('every mode has an lcdName of at most 7 characters', () => {
    for (const family of SCALE_FAMILIES) {
      for (const mode of family.modes) {
        expect(mode.lcdName.length).toBeLessThanOrEqual(7)
      }
    }
  })
})

describe('BRIGHTNESS_ORDER / GLOBAL_BRIGHTNESS_ORDER', () => {
  it('BRIGHTNESS_ORDER contains 35 entries sorted ascending', () => {
    expect(BRIGHTNESS_ORDER).toHaveLength(35)
    for (let i = 1; i < BRIGHTNESS_ORDER.length; i++) {
      expect(BRIGHTNESS_ORDER[i].brightness).toBeGreaterThanOrEqual(BRIGHTNESS_ORDER[i - 1].brightness)
    }
  })

  it('GLOBAL_BRIGHTNESS_ORDER mirrors BRIGHTNESS_ORDER length', () => {
    expect(GLOBAL_BRIGHTNESS_ORDER).toHaveLength(BRIGHTNESS_ORDER.length)
  })
})

describe('MODE_NAMES', () => {
  it('exports the 7 diatonic modes in canonical order', () => {
    expect(MODE_NAMES).toEqual([
      'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian',
    ])
  })
})
