// Chord voicing computation — keyboard inversions and guitar fingerings.
// All functions are pure with no DOM or React dependencies.

import type { HarmonyRow, GuitarTuning } from './types'
import { wrap } from './index'

// -------------------- TYPES --------------------

// A keyboard voicing is an ordered list of MIDI note numbers to display.
export interface KeyboardVoicing {
  label: string
  // MIDI notes in ascending order (lowest → highest)
  midiNotes: number[]
}

// A guitar voicing is a per-string assignment: null = muted, number = fret number (0 = open).
export interface GuitarVoicing {
  label: string
  // Index 0 = high-E (string 0 in store), index 5 = low-E (string 5 in store)
  frets: (number | null)[]
}

// -------------------- KEYBOARD VOICINGS --------------------

// Starting MIDI for the lowest note of root-position voicings.
const KEYBOARD_BASE_MIDI = 60  // C4

// Build an ascending stack of MIDI notes from given pitch classes.
// Each note is placed as low as possible while staying above the previous note.
function stackMidi(orderedPcs: number[], baseMidi: number): number[] {
  const notes: number[] = []
  let cursor = baseMidi
  for (const pc of orderedPcs) {
    const base = Math.floor(cursor / 12) * 12 + pc
    const note = base < cursor ? base + 12 : base
    notes.push(note)
    cursor = note + 1
  }
  return notes
}

// Drop-2: take close-position 4-note voicing and drop the second-highest note by an octave.
// Only defined for 4-note chords.
function buildDrop2(closeMidi: number[]): number[] | null {
  if (closeMidi.length !== 4) return null
  const sorted = [...closeMidi].sort((a, b) => a - b)
  const dropped = [...sorted]
  dropped[2] -= 12
  return dropped.sort((a, b) => a - b)
}

// Drop-3: take close-position 4-note voicing and drop the third-highest note by an octave.
// Only defined for 4-note chords.
function buildDrop3(closeMidi: number[]): number[] | null {
  if (closeMidi.length !== 4) return null
  const sorted = [...closeMidi].sort((a, b) => a - b)
  const dropped = [...sorted]
  dropped[1] -= 12
  return dropped.sort((a, b) => a - b)
}

// Remove duplicate voicings that produce identical MIDI note sets.
function dedupeKeyboard(voicings: KeyboardVoicing[]): KeyboardVoicing[] {
  const seen = new Set<string>()
  return voicings.filter(v => {
    const key = v.midiNotes.join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function computeKeyboardVoicings(row: HarmonyRow, maxDegree: number): KeyboardVoicing[] {
  const notes = row.notes.filter(n => n.degree <= maxDegree)
  if (notes.length < 2) return []

  const rootNote = notes.find(n => n.degree === 1)
  if (!rootNote) return []

  const pcs = notes.map(n => n.pc)

  const voicings: KeyboardVoicing[] = []

  // Root position: root is the lowest note
  const rootMidi = KEYBOARD_BASE_MIDI + wrap(rootNote.pc - wrap(KEYBOARD_BASE_MIDI, 12), 12)
  const rootPos = stackMidi(pcs, rootMidi)
  voicings.push({ label: 'Root', midiNotes: rootPos })

  // Inversions: each successive chord tone takes the bass
  for (let i = 1; i < pcs.length; i++) {
    const bassPc = pcs[i]
    const bassMidi = KEYBOARD_BASE_MIDI + wrap(bassPc - wrap(KEYBOARD_BASE_MIDI, 12), 12)
    const rotated = [...pcs.slice(i), ...pcs.slice(0, i)]
    const midiNotes = stackMidi(rotated, bassMidi)
    const ordinal = ['1st', '2nd', '3rd', '4th', '5th', '6th'][i - 1] ?? `${i}th`
    voicings.push({ label: `${ordinal} inv`, midiNotes })
  }

  // Drop voicings add timbral variety for 7th chords without changing the pitch-class set
  if (pcs.length === 4) {
    const d2 = buildDrop2(rootPos)
    if (d2) voicings.push({ label: 'Drop 2', midiNotes: d2 })

    const d3 = buildDrop3(rootPos)
    if (d3) voicings.push({ label: 'Drop 3', midiNotes: d3 })
  }

  return dedupeKeyboard(voicings)
}

// -------------------- GUITAR VOICINGS --------------------

// Standard tuning MIDI values (high E → low E) — used only to gate curated shapes.
const STANDARD_TUNING: GuitarTuning = [64, 59, 55, 50, 45, 40]

function isStandardTuning(tuning: GuitarTuning): boolean {
  return tuning.every((v, i) => v === STANDARD_TUNING[i])
}

// ---------- Note omission rules ----------

// Returns pitch classes partitioned into essential (must appear) and optional (may be omitted).
// Follows the spec's rules by chord size.
function partitionEssential(
  row: HarmonyRow,
  maxDegree: number,
): { essential: number[]; optional: number[] } {
  const notes = row.notes.filter(n => n.degree <= maxDegree)
  const root = notes.find(n => n.degree === 1)
  const third = notes.find(n => n.degree === 3)
  const fifth = notes.find(n => n.degree === 5)
  const seventh = notes.find(n => n.degree === 7)
  const ninth = notes.find(n => n.degree === 9)
  const eleventh = notes.find(n => n.degree === 11)
  const thirteenth = notes.find(n => n.degree === 13)

  if (!root || !third || !fifth) {
    return { essential: notes.map(n => n.pc), optional: [] }
  }

  // Triads: all three tones essential
  if (!seventh) {
    return { essential: [root.pc, third.pc, fifth.pc], optional: [] }
  }

  // 7th chords: 3rd + 7th essential; root + 5th optional
  if (!ninth) {
    return { essential: [third.pc, seventh.pc], optional: [root.pc, fifth.pc] }
  }

  // 9th chords: 3rd + 7th + 9th essential; root + 5th optional
  if (!eleventh) {
    return { essential: [third.pc, seventh.pc, ninth.pc], optional: [root.pc, fifth.pc] }
  }

  // 11th chords: 3rd + 7th + 11th essential; root + 5th + 9th optional
  if (!thirteenth) {
    return { essential: [third.pc, seventh.pc, eleventh.pc], optional: [root.pc, fifth.pc, ninth.pc] }
  }

  // 13th chords: 3rd + 7th + 13th essential; root + 5th + 9th + 11th optional
  return {
    essential: [third.pc, seventh.pc, thirteenth.pc],
    optional: [root.pc, fifth.pc, ninth.pc, eleventh.pc],
  }
}

// ---------- Curated shapes ----------

// Curated open-chord templates for standard tuning.
// Each template specifies fret numbers per string (index 0 = high E, index 5 = low E).
// null = muted string. These are validated against actual pitch classes before use.
interface CuratedShape {
  label: string
  // Absolute fret numbers for a specific root pitch class.
  rootPc: number
  frets: (number | null)[]
}

// Open-position shapes for standard tuning, specific to each root pc.
// Only the most common open shapes are included; barre shapes are handled algorithmically.
const CURATED_SHAPES: CuratedShape[] = [
  // C major open
  { label: 'Open C', rootPc: 0,  frets: [null, 3, 2, 0, 1, 0] },
  // G major open
  { label: 'Open G', rootPc: 7,  frets: [3, 2, 0, 0, 0, 3] },
  // D major open
  { label: 'Open D', rootPc: 2,  frets: [2, 3, 2, 0, null, null] },
  // A major open
  { label: 'Open A', rootPc: 9,  frets: [0, 2, 2, 2, 0, null] },
  // E major open
  { label: 'Open E', rootPc: 4,  frets: [0, 0, 1, 2, 2, 0] },
  // Am open
  { label: 'Open Am', rootPc: 9,  frets: [0, 1, 2, 2, 0, null] },
  // Em open
  { label: 'Open Em', rootPc: 4,  frets: [0, 0, 0, 2, 2, 0] },
  // Dm open
  { label: 'Open Dm', rootPc: 2,  frets: [1, 3, 2, 0, null, null] },
  // E7 open
  { label: 'Open E7', rootPc: 4,  frets: [0, 3, 1, 2, 2, 0] },
  // A7 open
  { label: 'Open A7', rootPc: 9,  frets: [0, 2, 0, 2, 0, null] },
  // G7 open
  { label: 'Open G7', rootPc: 7,  frets: [1, 0, 0, 0, 2, 3] },
  // D7 open
  { label: 'Open D7', rootPc: 2,  frets: [2, 1, 2, 0, null, null] },
  // C7 open
  { label: 'Open C7', rootPc: 0,  frets: [null, 3, 2, 3, 1, 0] },
  // Emaj7 open
  { label: 'Open Emaj7', rootPc: 4,  frets: [0, 0, 1, 1, 2, 0] },
  // Amaj7 open
  { label: 'Open Amaj7', rootPc: 9,  frets: [0, 2, 1, 2, 0, null] },
  // Em7 open
  { label: 'Open Em7', rootPc: 4,  frets: [0, 3, 0, 2, 2, 0] },
  // Am7 open
  { label: 'Open Am7', rootPc: 9,  frets: [0, 1, 0, 2, 0, null] },
  // Dm7 open
  { label: 'Open Dm7', rootPc: 2,  frets: [1, 1, 2, 0, null, null] },
]

// Validate that a curated shape's fret assignments actually produce only chord-tone pitch classes.
function validateShape(
  shape: CuratedShape,
  chordPcs: Set<number>,
  essentialPcs: Set<number>,
  rootPc: number,
  tuning: GuitarTuning,
): boolean {
  const playedPcs = new Set<number>()
  let hasRoot = false

  for (let si = 0; si < 6; si++) {
    const f = shape.frets[si]
    if (f === null) continue
    const pc = wrap(tuning[si] + f, 12)
    if (!chordPcs.has(pc)) return false  // non-chord tone on a played string
    playedPcs.add(pc)
    if (pc === rootPc) hasRoot = true
  }

  if (!hasRoot) return false

  // All essential pitch classes must be covered
  for (const pc of essentialPcs) {
    if (!playedPcs.has(pc)) return false
  }

  // Must have at least 2 played strings
  const playedCount = shape.frets.filter(f => f !== null).length
  if (playedCount < 2) return false

  return true
}

// ---------- Algorithmic voicing generator ----------

// Generate all size-k subsets of arr.
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [head, ...tail] = arr
  const withHead = combinations(tail, k - 1).map(c => [head, ...c])
  return [...withHead, ...combinations(tail, k)]
}

// Check physical playability:
// - At most 4 individually-fretting fingers (barre at the minimum fret covers multiple strings
//   at cost of 1 finger; strings at that minimum fret count as 1 total).
// - Fret span of pressed notes ≤ 4 (or ≤ 5 if a barre is present).
function isPlayable(frets: (number | null)[]): boolean {
  const pressed = frets.filter((f): f is number => f !== null && f > 0)
  if (pressed.length === 0) return false  // all open or muted — technically playable but uninteresting

  const min = Math.min(...pressed)
  const max = Math.max(...pressed)
  const span = max - min

  // Count "finger positions": the minimum fret is potentially a barre (1 finger),
  // then one additional finger per unique fret above the minimum.
  const uniqueFretsAboveMin = new Set(pressed.filter(f => f > min)).size
  // Barre at min (1 finger) + fingers for each higher fret
  const fingerCount = 1 + uniqueFretsAboveMin

  if (fingerCount > 4) return false

  // Span: standard ≤ 4, barre position allows ≤ 5
  const hasMultipleAtMin = pressed.filter(f => f === min).length > 1
  const maxSpan = hasMultipleAtMin ? 5 : 4

  return span <= maxSpan
}

// Recursive search that finds fret assignments covering all essential pitch classes.
type StringOption = { fret: number | null; pc: number | null }

function searchAssignments(
  optionsForSet: StringOption[][],
  essentialSet: Set<number>,
  depth: number,
  current: (number | null)[],
  coveredEssential: Set<number>,
  results: (number | null)[][],
): void {
  if (results.length >= 12) return

  if (depth === optionsForSet.length) {
    if ([...essentialSet].every(pc => coveredEssential.has(pc))) {
      results.push([...current])
    }
    return
  }

  const remaining = optionsForSet.length - depth - 1
  const stillNeeded = [...essentialSet].filter(pc => !coveredEssential.has(pc)).length

  for (const opt of optionsForSet[depth]) {
    // Prune: not enough strings left to cover remaining essential pcs
    if (stillNeeded > remaining + (opt.pc !== null && essentialSet.has(opt.pc) ? 1 : 0)) {
      // Recalculate: if this option covers one more essential, we need stillNeeded - 1 from remaining
      const wouldCover = opt.pc !== null && essentialSet.has(opt.pc) && !coveredEssential.has(opt.pc)
      const afterThis = stillNeeded - (wouldCover ? 1 : 0)
      if (afterThis > remaining) continue
    }

    const newCovered = new Set(coveredEssential)
    if (opt.pc !== null && essentialSet.has(opt.pc)) {
      newCovered.add(opt.pc)
    }

    current.push(opt.fret)
    searchAssignments(optionsForSet, essentialSet, depth + 1, current, newCovered, results)
    current.pop()

    if (results.length >= 12) return
  }
}

function computeAlgorithmicVoicings(
  row: HarmonyRow,
  maxDegree: number,
  tuning: GuitarTuning,
): GuitarVoicing[] {
  const notes = row.notes.filter(n => n.degree <= maxDegree)
  if (notes.length < 2) return []

  const rootNote = notes.find(n => n.degree === 1)
  if (!rootNote) return []

  const rootPc = rootNote.pc
  const { essential, optional } = partitionEssential(row, maxDegree)
  const allPcs = new Set([...essential, ...optional])
  const essentialSet = new Set(essential)

  // Per-string: compute all fret assignments (0–12) that land on chord tones + the muted option
  const stringOptions: StringOption[][] = tuning.map(openMidi => {
    const opts: StringOption[] = [{ fret: null, pc: null }]
    for (let fret = 0; fret <= 12; fret++) {
      const pc = wrap(openMidi + fret, 12)
      if (allPcs.has(pc)) {
        opts.push({ fret, pc })
      }
    }
    return opts
  })

  const voicings: GuitarVoicing[] = []
  const minStrings = Math.min(6, Math.max(2, essential.length))

  for (let numStrings = 6; numStrings >= minStrings; numStrings--) {
    const stringSets = combinations(Array.from({ length: 6 }, (_, i) => i), numStrings)

    for (const stringSet of stringSets) {
      const optionsForSet = stringSet.map(si => stringOptions[si])
      const found: (number | null)[][] = []
      searchAssignments(optionsForSet, essentialSet, 0, [], new Set(), found)

      for (const assignment of found) {
        const frets: (number | null)[] = [null, null, null, null, null, null]
        stringSet.forEach((si, ai) => { frets[si] = assignment[ai] })

        if (!isPlayable(frets)) continue

        // Must include the root pitch class on at least one played string
        const hasRoot = frets.some((f, si) => f !== null && wrap(tuning[si] + f, 12) === rootPc)
        if (!hasRoot) continue

        voicings.push({ label: 'Voicing', frets })
        if (voicings.length >= 20) break
      }
      if (voicings.length >= 20) break
    }
    if (voicings.length >= 6) break
  }

  return voicings
}

// Remove guitar voicings with identical fret patterns.
function dedupeGuitar(voicings: GuitarVoicing[]): GuitarVoicing[] {
  const seen = new Set<string>()
  return voicings.filter(v => {
    const key = v.frets.map(f => f === null ? 'x' : String(f)).join('-')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function labelGuitarVoicings(voicings: GuitarVoicing[]): GuitarVoicing[] {
  return voicings.map((v, i) => ({ ...v, label: `Voicing ${i + 1}` }))
}

export function computeGuitarVoicings(
  row: HarmonyRow,
  maxDegree: number,
  tuning: GuitarTuning,
): GuitarVoicing[] {
  const notes = row.notes.filter(n => n.degree <= maxDegree)
  if (notes.length < 2) return []

  const rootNote = notes.find(n => n.degree === 1)
  if (!rootNote) return []

  const rootPc = rootNote.pc
  const { essential, optional } = partitionEssential(row, maxDegree)
  const chordPcs = new Set([...essential, ...optional])
  const essentialSet = new Set(essential)

  const voicings: GuitarVoicing[] = []

  // Curated shapes only for standard tuning — they are validated before inclusion
  if (isStandardTuning(tuning)) {
    for (const shape of CURATED_SHAPES) {
      if (shape.rootPc !== rootPc) continue
      if (validateShape(shape, chordPcs, essentialSet, rootPc, tuning)) {
        voicings.push({ label: shape.label, frets: shape.frets })
      }
    }
  }

  // Algorithmic layer always runs — covers all tunings and supplemental voicings
  const algorithmic = computeAlgorithmicVoicings(row, maxDegree, tuning)
  voicings.push(...algorithmic)

  return labelGuitarVoicings(dedupeGuitar(voicings))
}
