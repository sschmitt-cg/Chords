import type { HarmonyRow, GuitarTuning } from './types'
import { wrap } from './index'

export interface KeyboardVoicing {
  label: string
  midiNotes: number[]
}

export interface GuitarVoicing {
  label: string
  frets: (number | null)[]
}

const KEYBOARD_BASE_MIDI = 60  // C4

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

// Drop-2: swap the second-highest note down an octave. Only defined for 4-note chords.
function buildDrop2(closeMidi: number[]): number[] | null {
  if (closeMidi.length !== 4) return null
  const sorted = [...closeMidi].sort((a, b) => a - b)
  const dropped = [...sorted]
  dropped[2] -= 12
  return dropped.sort((a, b) => a - b)
}

// Drop-3: swap the third-highest note down an octave. Only defined for 4-note chords.
function buildDrop3(closeMidi: number[]): number[] | null {
  if (closeMidi.length !== 4) return null
  const sorted = [...closeMidi].sort((a, b) => a - b)
  const dropped = [...sorted]
  dropped[1] -= 12
  return dropped.sort((a, b) => a - b)
}

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

  const rootMidi = KEYBOARD_BASE_MIDI + wrap(rootNote.pc - wrap(KEYBOARD_BASE_MIDI, 12), 12)
  const rootPos = stackMidi(pcs, rootMidi)
  voicings.push({ label: 'Root', midiNotes: rootPos })

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

const STANDARD_TUNING: GuitarTuning = [64, 59, 55, 50, 45, 40]

function isStandardTuning(tuning: GuitarTuning): boolean {
  return tuning.every((v, i) => v === STANDARD_TUNING[i])
}

// Note omission rules by chord size: for larger chords the 3rd, 7th, and the
// characteristic upper extension are essential; the root and 5th are optional.
// This follows standard jazz voicing practice where the 3rd/7th define quality
// and the 5th is typically redundant.
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

  if (!seventh) {
    return { essential: [root.pc, third.pc, fifth.pc], optional: [] }
  }

  if (!ninth) {
    return { essential: [third.pc, seventh.pc], optional: [root.pc, fifth.pc] }
  }

  if (!eleventh) {
    return { essential: [third.pc, seventh.pc, ninth.pc], optional: [root.pc, fifth.pc] }
  }

  if (!thirteenth) {
    return { essential: [third.pc, seventh.pc, eleventh.pc], optional: [root.pc, fifth.pc, ninth.pc] }
  }

  return {
    essential: [third.pc, seventh.pc, thirteenth.pc],
    optional: [root.pc, fifth.pc, ninth.pc, eleventh.pc],
  }
}

interface CuratedShape {
  label: string
  rootPc: number
  frets: (number | null)[]
}

const CURATED_SHAPES: CuratedShape[] = [
  { label: 'Open C',     rootPc: 0,  frets: [null, 3, 2, 0, 1, 0] },
  { label: 'Open G',     rootPc: 7,  frets: [3, 2, 0, 0, 0, 3] },
  { label: 'Open D',     rootPc: 2,  frets: [2, 3, 2, 0, null, null] },
  { label: 'Open A',     rootPc: 9,  frets: [0, 2, 2, 2, 0, null] },
  { label: 'Open E',     rootPc: 4,  frets: [0, 0, 1, 2, 2, 0] },
  { label: 'Open Am',    rootPc: 9,  frets: [0, 1, 2, 2, 0, null] },
  { label: 'Open Em',    rootPc: 4,  frets: [0, 0, 0, 2, 2, 0] },
  { label: 'Open Dm',    rootPc: 2,  frets: [1, 3, 2, 0, null, null] },
  { label: 'Open E7',    rootPc: 4,  frets: [0, 3, 1, 2, 2, 0] },
  { label: 'Open A7',    rootPc: 9,  frets: [0, 2, 0, 2, 0, null] },
  { label: 'Open G7',    rootPc: 7,  frets: [1, 0, 0, 0, 2, 3] },
  { label: 'Open D7',    rootPc: 2,  frets: [2, 1, 2, 0, null, null] },
  { label: 'Open C7',    rootPc: 0,  frets: [null, 3, 2, 3, 1, 0] },
  { label: 'Open Emaj7', rootPc: 4,  frets: [0, 0, 1, 1, 2, 0] },
  { label: 'Open Amaj7', rootPc: 9,  frets: [0, 2, 1, 2, 0, null] },
  { label: 'Open Em7',   rootPc: 4,  frets: [0, 3, 0, 2, 2, 0] },
  { label: 'Open Am7',   rootPc: 9,  frets: [0, 1, 0, 2, 0, null] },
  { label: 'Open Dm7',   rootPc: 2,  frets: [1, 1, 2, 0, null, null] },
]

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
    if (!chordPcs.has(pc)) return false
    playedPcs.add(pc)
    if (pc === rootPc) hasRoot = true
  }

  if (!hasRoot) return false

  for (const pc of essentialPcs) {
    if (!playedPcs.has(pc)) return false
  }

  const playedCount = shape.frets.filter(f => f !== null).length
  if (playedCount < 2) return false

  return true
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [head, ...tail] = arr
  const withHead = combinations(tail, k - 1).map(c => [head, ...c])
  return [...withHead, ...combinations(tail, k)]
}

// Playability: at most 4 fingers (barre at the minimum fret counts as 1),
// fret span ≤ 4 (or ≤ 5 when a barre is present).
function isPlayable(frets: (number | null)[]): boolean {
  const pressed = frets.filter((f): f is number => f !== null && f > 0)
  if (pressed.length === 0) return false

  const min = Math.min(...pressed)
  const max = Math.max(...pressed)
  const span = max - min

  const uniqueFretsAboveMin = new Set(pressed.filter(f => f > min)).size
  const fingerCount = 1 + uniqueFretsAboveMin

  if (fingerCount > 4) return false

  const hasMultipleAtMin = pressed.filter(f => f === min).length > 1
  const maxSpan = hasMultipleAtMin ? 5 : 4

  return span <= maxSpan
}

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
    if (stillNeeded > remaining + (opt.pc !== null && essentialSet.has(opt.pc) ? 1 : 0)) {
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
