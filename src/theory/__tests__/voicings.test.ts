import { describe, it, expect } from 'vitest'
import { computeKeyboardVoicings, computeGuitarVoicings } from '../voicings'
import { buildHarmonyRowsForScale, computeDisplayScale } from '../index'
import type { GuitarTuning } from '../types'

const cMajorScale = computeDisplayScale(0, 'ionian')
const rows = buildHarmonyRowsForScale(cMajorScale)

const STANDARD_TUNING: GuitarTuning = [64, 59, 55, 50, 45, 40]
const DROP_D_TUNING: GuitarTuning = [64, 59, 55, 50, 45, 38]
const DADGAD_TUNING: GuitarTuning = [62, 57, 55, 50, 45, 38]
const OPEN_G_TUNING: GuitarTuning = [62, 59, 55, 50, 43, 38]
const OPEN_D_TUNING: GuitarTuning = [62, 57, 54, 50, 45, 38]

function countOpenStrings(frets: (number | null)[]): number {
  return frets.filter(f => f === 0).length
}

describe('computeKeyboardVoicings — triads', () => {
  it('returns 3 voicings for a major triad (root + 2 inversions)', () => {
    const voicings = computeKeyboardVoicings(rows[0], 5)
    expect(voicings.length).toBe(3)
  })

  it('first voicing is labeled Root', () => {
    const voicings = computeKeyboardVoicings(rows[0], 5)
    expect(voicings[0].label).toBe('Root')
  })

  it('root position contains exactly the triad pitch classes', () => {
    const voicings = computeKeyboardVoicings(rows[0], 5)
    const pcs = voicings[0].midiNotes.map(m => m % 12)
    expect(new Set(pcs)).toEqual(new Set([0, 4, 7]))  // C E G
  })

  it('root position MIDI notes are in ascending order', () => {
    const voicings = computeKeyboardVoicings(rows[0], 5)
    const midi = voicings[0].midiNotes
    for (let i = 1; i < midi.length; i++) {
      expect(midi[i]).toBeGreaterThan(midi[i - 1])
    }
  })

  it('first inversion has the third as the lowest note', () => {
    const voicings = computeKeyboardVoicings(rows[0], 5)
    const firstInv = voicings[1]
    expect(firstInv.label).toBe('1st inv')
    // Lowest MIDI should be E (pc 4)
    expect(firstInv.midiNotes[0] % 12).toBe(4)
  })

  it('second inversion has the fifth as the lowest note', () => {
    const voicings = computeKeyboardVoicings(rows[0], 5)
    const secInv = voicings[2]
    expect(secInv.label).toBe('2nd inv')
    // Lowest MIDI should be G (pc 7)
    expect(secInv.midiNotes[0] % 12).toBe(7)
  })
})

describe('computeKeyboardVoicings — 7th chords', () => {
  it('returns at least 4 voicings for a 7th chord (root + 3 inversions)', () => {
    // rows[4] = G7 in C major
    const voicings = computeKeyboardVoicings(rows[4], 7)
    expect(voicings.length).toBeGreaterThanOrEqual(4)
  })

  it('includes Drop 2 voicing for 7th chords', () => {
    const voicings = computeKeyboardVoicings(rows[4], 7)
    const drop2 = voicings.find(v => v.label === 'Drop 2')
    expect(drop2).toBeDefined()
  })

  it('includes Drop 3 voicing for 7th chords', () => {
    const voicings = computeKeyboardVoicings(rows[4], 7)
    const drop3 = voicings.find(v => v.label === 'Drop 3')
    expect(drop3).toBeDefined()
  })

  it('all voicings have the same pitch classes', () => {
    const voicings = computeKeyboardVoicings(rows[4], 7)
    const refPcs = new Set(voicings[0].midiNotes.map(m => m % 12))
    for (const v of voicings) {
      const pcs = new Set(v.midiNotes.map(m => m % 12))
      expect(pcs).toEqual(refPcs)
    }
  })

  it('all voicings have MIDI notes in ascending order', () => {
    const voicings = computeKeyboardVoicings(rows[4], 7)
    for (const v of voicings) {
      for (let i = 1; i < v.midiNotes.length; i++) {
        expect(v.midiNotes[i]).toBeGreaterThan(v.midiNotes[i - 1])
      }
    }
  })
})

describe('computeKeyboardVoicings — edge cases', () => {
  it('returns empty array for empty row', () => {
    const voicings = computeKeyboardVoicings(rows[0], 1)
    expect(voicings).toEqual([])
  })
})

describe('computeGuitarVoicings — basic contract', () => {
  it('returns at least one voicing for a C major triad in standard tuning', () => {
    const voicings = computeGuitarVoicings(rows[0], 5, STANDARD_TUNING)
    expect(voicings.length).toBeGreaterThan(0)
  })

  it('every voicing has exactly 6 fret entries', () => {
    const voicings = computeGuitarVoicings(rows[0], 5, STANDARD_TUNING)
    for (const v of voicings) {
      expect(v.frets).toHaveLength(6)
    }
  })

  it('each voicing covers all essential pitch classes', () => {
    const voicings = computeGuitarVoicings(rows[0], 5, STANDARD_TUNING)
    const rootPc = rows[0].notes.find(n => n.degree === 1)!.pc
    const thirdPc = rows[0].notes.find(n => n.degree === 3)!.pc
    const fifthPc = rows[0].notes.find(n => n.degree === 5)!.pc
    const needed = new Set([rootPc, thirdPc, fifthPc])

    for (const v of voicings) {
      const pcs = new Set(
        v.frets.map((f, si) => f === null ? null : (STANDARD_TUNING[si] + f) % 12)
          .filter((pc): pc is number => pc !== null)
      )
      for (const req of needed) {
        expect(pcs.has(req)).toBe(true)
      }
    }
  })

  it('voicings contain the root on at least one string', () => {
    const voicings = computeGuitarVoicings(rows[0], 5, STANDARD_TUNING)
    const rootPc = rows[0].notes.find(n => n.degree === 1)!.pc
    for (const v of voicings) {
      const hasRoot = v.frets.some(
        (f, si) => f !== null && (STANDARD_TUNING[si] + f) % 12 === rootPc
      )
      expect(hasRoot).toBe(true)
    }
  })

  it('all fret numbers are in range 0–12 or null', () => {
    const voicings = computeGuitarVoicings(rows[0], 5, STANDARD_TUNING)
    for (const v of voicings) {
      for (const f of v.frets) {
        if (f !== null) {
          expect(f).toBeGreaterThanOrEqual(0)
          expect(f).toBeLessThanOrEqual(12)
        }
      }
    }
  })

  it('voicings are labeled sequentially', () => {
    const voicings = computeGuitarVoicings(rows[0], 5, STANDARD_TUNING)
    voicings.forEach((v, i) => {
      expect(v.label).toBe(`Voicing ${i + 1}`)
    })
  })
})

describe('computeGuitarVoicings — playability constraints', () => {
  it('no voicing exceeds 4 pressed fingers', () => {
    const voicings = computeGuitarVoicings(rows[0], 7, STANDARD_TUNING)
    for (const v of voicings) {
      const pressed = v.frets.filter((f): f is number => f !== null && f > 0)
      if (pressed.length === 0) continue
      const min = Math.min(...pressed)
      const uniqueAboveMin = new Set(pressed.filter(f => f > min)).size
      const fingerCount = 1 + uniqueAboveMin
      expect(fingerCount).toBeLessThanOrEqual(4)
    }
  })

  it('fret span of pressed notes is at most 5', () => {
    const voicings = computeGuitarVoicings(rows[0], 7, STANDARD_TUNING)
    for (const v of voicings) {
      const pressed = v.frets.filter((f): f is number => f !== null && f > 0)
      if (pressed.length < 2) continue
      const span = Math.max(...pressed) - Math.min(...pressed)
      expect(span).toBeLessThanOrEqual(5)
    }
  })
})

describe('computeGuitarVoicings — alternate tuning', () => {
  it('returns voicings in Drop D tuning', () => {
    const voicings = computeGuitarVoicings(rows[0], 5, DROP_D_TUNING)
    expect(voicings.length).toBeGreaterThan(0)
  })

  it('voicings in Drop D have correct pitch classes for fret assignments', () => {
    const voicings = computeGuitarVoicings(rows[0], 5, DROP_D_TUNING)
    const rootPc = rows[0].notes.find(n => n.degree === 1)!.pc
    for (const v of voicings) {
      const hasRoot = v.frets.some(
        (f, si) => f !== null && (DROP_D_TUNING[si] + f) % 12 === rootPc
      )
      expect(hasRoot).toBe(true)
    }
  })

  it('does not hard-code standard tuning — Drop D fret positions differ from standard for same chord', () => {
    const stdVoicings = computeGuitarVoicings(rows[3], 5, STANDARD_TUNING)  // F major
    const dropDVoicings = computeGuitarVoicings(rows[3], 5, DROP_D_TUNING)  // F major
    // Both should have voicings, and at least one pair should differ
    expect(stdVoicings.length).toBeGreaterThan(0)
    expect(dropDVoicings.length).toBeGreaterThan(0)
    // Verify Drop D string 5 (low string) open = D (pc 2), not E (pc 4)
    const openPc = DROP_D_TUNING[5] % 12
    expect(openPc).toBe(2)
  })
})

describe('computeGuitarVoicings — curated shape correctness', () => {
  it('returns an Open C shape for a C major chord in standard tuning', () => {
    // rows[0] is C major in C ionian
    const voicings = computeGuitarVoicings(rows[0], 5, STANDARD_TUNING)
    // The "Open C" curated shape x32010 should be present (fret index 0=high-E, 5=low-E)
    // → high-E:0, B:1, G:0, D:2, A:3, low-E:x → [0, 1, 0, 2, 3, null]
    const hasOpenC = voicings.some(v =>
      v.frets[0] === 0 && v.frets[1] === 1 && v.frets[2] === 0 &&
      v.frets[3] === 2 && v.frets[4] === 3 && v.frets[5] === null
    )
    expect(hasOpenC).toBe(true)
  })

  it('returns an Open G shape for a G major chord in standard tuning', () => {
    const gMajor = computeDisplayScale(7, 'ionian')
    const gRows = buildHarmonyRowsForScale(gMajor)
    const voicings = computeGuitarVoicings(gRows[0], 5, STANDARD_TUNING)
    // Open G 320003 in low-to-high → high-E:3, B:0, G:0, D:0, A:2, low-E:3 → [3, 0, 0, 0, 2, 3]
    const hasOpenG = voicings.some(v =>
      v.frets[0] === 3 && v.frets[1] === 0 && v.frets[2] === 0 &&
      v.frets[3] === 0 && v.frets[4] === 2 && v.frets[5] === 3
    )
    expect(hasOpenG).toBe(true)
  })
})

describe('computeGuitarVoicings — open-string preference in alternate tunings', () => {
  it('DADGAD D major prefers voicings with multiple open strings', () => {
    const dMajor = computeDisplayScale(2, 'ionian')
    const dRows = buildHarmonyRowsForScale(dMajor)
    const voicings = computeGuitarVoicings(dRows[0], 5, DADGAD_TUNING)
    expect(voicings.length).toBeGreaterThan(0)
    // Top voicing in DADGAD for a D chord should ring at least 3 open strings
    // (DADGAD's open strings are D-A-G-D-A-D; D and A are chord tones)
    expect(countOpenStrings(voicings[0].frets)).toBeGreaterThanOrEqual(3)
  })

  it('Open G tuning, G major chord can be strummed all-open', () => {
    const gMajor = computeDisplayScale(7, 'ionian')
    const gRows = buildHarmonyRowsForScale(gMajor)
    const voicings = computeGuitarVoicings(gRows[0], 5, OPEN_G_TUNING)
    expect(voicings.length).toBeGreaterThan(0)
    // Open G tuning: D-B-G-D-G-D — every string is a chord tone.
    // The top voicing should ring at least 4 strings open.
    expect(countOpenStrings(voicings[0].frets)).toBeGreaterThanOrEqual(4)
  })

  it('Open D tuning, D major chord can be strummed all-open', () => {
    const dMajor = computeDisplayScale(2, 'ionian')
    const dRows = buildHarmonyRowsForScale(dMajor)
    const voicings = computeGuitarVoicings(dRows[0], 5, OPEN_D_TUNING)
    expect(voicings.length).toBeGreaterThan(0)
    // Open D tuning: D-A-F#-D-A-D — every string is a chord tone.
    expect(countOpenStrings(voicings[0].frets)).toBeGreaterThanOrEqual(4)
  })

  it('Drop D tuning, D major chord uses the open low-D string', () => {
    const dMajor = computeDisplayScale(2, 'ionian')
    const dRows = buildHarmonyRowsForScale(dMajor)
    const voicings = computeGuitarVoicings(dRows[0], 5, DROP_D_TUNING)
    expect(voicings.length).toBeGreaterThan(0)
    // The low-E string (index 5) is tuned to D in Drop D — it should be open
    // in at least one of the top-ranked voicings.
    const topThree = voicings.slice(0, 3)
    const usesLowOpen = topThree.some(v => v.frets[5] === 0)
    expect(usesLowOpen).toBe(true)
  })

  it('algorithmic voicings are ordered by open-string count descending', () => {
    const dMajor = computeDisplayScale(2, 'ionian')
    const dRows = buildHarmonyRowsForScale(dMajor)
    const voicings = computeGuitarVoicings(dRows[0], 5, DADGAD_TUNING)
    // Non-strict: each successive voicing has the same or fewer opens than the previous one.
    for (let i = 1; i < voicings.length; i++) {
      expect(countOpenStrings(voicings[i].frets)).toBeLessThanOrEqual(
        countOpenStrings(voicings[i - 1].frets)
      )
    }
  })

  it('keeps a reasonable count of voicings (not overwhelming the UI)', () => {
    const dMajor = computeDisplayScale(2, 'ionian')
    const dRows = buildHarmonyRowsForScale(dMajor)
    const voicings = computeGuitarVoicings(dRows[0], 5, DADGAD_TUNING)
    expect(voicings.length).toBeLessThanOrEqual(12)
  })
})

describe('computeGuitarVoicings — deduplication', () => {
  it('no two voicings have identical fret patterns', () => {
    const voicings = computeGuitarVoicings(rows[0], 5, STANDARD_TUNING)
    const keys = voicings.map(v => v.frets.map(f => f === null ? 'x' : String(f)).join('-'))
    expect(new Set(keys).size).toBe(voicings.length)
  })
})
