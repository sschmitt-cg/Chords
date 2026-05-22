// Zustand store — replaces 20+ global variables in script.js
// Single source of truth for all app state.

import { create } from 'zustand'
import {
  computeDisplayScaleFromFamily,
  buildHarmonyRowsForScale,
  SCALE_FAMILIES,
  BRIGHTNESS_ORDER,
  getModeRootOffset,
  getModeNotes,
  getModeIntervals,
  wrap,
} from '../theory/index'
import type { ScaleData, HarmonyRow, GuitarTuning, ScaleFamily, ScaleMode } from '../theory/types'
import { computeKeyboardVoicings, computeGuitarVoicings } from '../theory/voicings'
import type { KeyboardVoicing, GuitarVoicing } from '../theory/voicings'

// Standard tuning: high E → low E (MIDI 64, 59, 55, 50, 45, 40)
const STANDARD_TUNING: GuitarTuning = [64, 59, 55, 50, 45, 40]

function computeScaleForFamily(
  keyPc: number,
  familyId: string,
  modeIndex: number,
  preference: 'sharp' | 'flat' | null = null,
): { scale: ScaleData; harmonyRows: HarmonyRow[]; keyIdx: number; tonicLabel: string; preferenceUsed: 'sharp' | 'flat' | null } {
  // Scale must be rooted at the MODE root, not the family root.
  // keyPc is the family root; add the mode's offset to get the actual tonal center.
  const family = SCALE_FAMILIES.find(f => f.id === familyId) ?? SCALE_FAMILIES[0]
  const modeRootPc = wrap(keyPc + getModeRootOffset(family, modeIndex), 12)
  const display = computeDisplayScaleFromFamily(modeRootPc, familyId, modeIndex, preference)
  const scale: ScaleData = { pitchClasses: display.pitchClasses, spelled: display.spelled }
  return {
    scale,
    harmonyRows: buildHarmonyRowsForScale(scale),
    keyIdx: display.keyIdx,
    tonicLabel: display.tonicLabel,
    preferenceUsed: display.preferenceUsed,
  }
}

function computeVoicings(
  harmonyRows: HarmonyRow[],
  selectedChordIndex: number | null,
  globalHarmonyMax: number,
  rowHarmonyMaxOverrides: Map<number, number>,
  guitarTuning: GuitarTuning,
): { keyboardVoicings: KeyboardVoicing[]; guitarVoicings: GuitarVoicing[] } {
  if (selectedChordIndex === null) {
    return { keyboardVoicings: [], guitarVoicings: [] }
  }
  const row = harmonyRows.find(r => r.index === selectedChordIndex)
  if (!row) return { keyboardVoicings: [], guitarVoicings: [] }
  const effectiveMax = rowHarmonyMaxOverrides.get(row.index) ?? globalHarmonyMax
  return {
    keyboardVoicings: computeKeyboardVoicings(row, effectiveMax),
    guitarVoicings: computeGuitarVoicings(row, effectiveMax, guitarTuning),
  }
}

const initialFamilyIndex = 0
const initialModeIndex = 0
const initialKeyPc = 0
const initialFamily = SCALE_FAMILIES[initialFamilyIndex]
const {
  scale: initialScale,
  harmonyRows: initialHarmonyRows,
  keyIdx: initialKeyIdx,
  tonicLabel: initialTonicLabel,
} = computeScaleForFamily(initialKeyPc, initialFamily.id, initialModeIndex)

interface TonalStore {
  // Key
  currentKeyPc: number
  currentKeyIdx: number
  currentTonicLabel: string

  // Scale family + mode (new numeric indices)
  familyIndex: number
  modeIndex: number

  // Deprecated aliases kept for backward compat (HarmonyGrid etc still read these)
  familyId: string
  familyModeIndex: number

  // Derived values (recomputed on every relevant change)
  currentFamily: ScaleFamily
  currentMode: ScaleMode
  currentTension: 0 | 1 | 2
  currentBrightnessPosition: number     // index in BRIGHTNESS_ORDER (0–34)
  currentModeRootPc: number             // pitch class that sounds as the tonal center
  currentModeNotes: number[]            // 7 pitch classes of the current mode
  currentModeIntervals: number[]        // 7 pc offsets from mode root

  // Enharmonic preference per pitch class (user can flip C# ↔ Db, etc.)
  enharmonicPrefs: Record<number, 'sharp' | 'flat'>

  // Computed scale
  currentScale: ScaleData
  harmonyRows: HarmonyRow[]

  // Selection state
  selectedChordIndex: number | null
  selectedNotePc: number | null

  // Harmony explorer
  globalHarmonyMax: number
  rowHarmonyMaxOverrides: Map<number, number>

  // Progression builder (slots hold harmony row indices, null = empty)
  progressionSlots: (number | null)[]
  isLoopPlaying: boolean

  // Audio
  isMuted: boolean
  volume: number      // 0–100, 0 = muted
  lastVolume: number  // restored on unmute

  // Guitar tuning
  guitarTuning: GuitarTuning

  keyboardVoicingIndex: number
  guitarVoicingIndex: number

  keyboardVoicings: KeyboardVoicing[]
  guitarVoicings: GuitarVoicing[]

  // Actions
  setKey: (pc: number) => void
  setFamily: (familyIndex: number) => void
  setModeIndex: (modeIndex: number) => void
  setModeByBrightness: (position: number) => void
  setModeByTension: (tension: 0 | 1 | 2) => void
  // Mode change that preserves tonal center (used by picker; knob drag uses setModeIndex)
  setModeIndexPreservingTonic: (modeIndex: number) => void
  // Deprecated action aliases (HarmonyGrid/old callers still use these)
  setFamilyModeIndex: (index: number) => void
  setEnharmonicPref: (pc: number, pref: 'sharp' | 'flat') => void
  setSelectedChord: (index: number | null) => void
  setSelectedNote: (pc: number | null) => void
  setGlobalHarmonyMax: (max: number) => void
  setRowHarmonyMax: (rowIndex: number, max: number | null) => void
  setMuted: (muted: boolean) => void
  setVolume: (v: number) => void
  setGuitarTuning: (tuning: GuitarTuning) => void
  setKeyboardVoicingIndex: (index: number) => void
  setGuitarVoicingIndex: (index: number) => void
  setProgressionSlot: (slotIndex: number, chordIndex: number | null) => void
  setLoopPlaying: (playing: boolean) => void
  randomize: () => void
}

// Build the derived fields that the ScaleNavigator reads
function derivedFields(
  keyPc: number,
  familyIndex: number,
  modeIndex: number,
): {
  currentFamily: ScaleFamily
  currentMode: ScaleMode
  currentTension: 0 | 1 | 2
  currentBrightnessPosition: number
  currentModeRootPc: number
  currentModeNotes: number[]
  currentModeIntervals: number[]
} {
  const family = SCALE_FAMILIES[familyIndex]
  const mode = family.modes[modeIndex]
  const brightnessPosition = BRIGHTNESS_ORDER.findIndex(
    e => e.familyIndex === familyIndex && e.modeIndex === modeIndex
  )
  const modeRootPc = (keyPc + getModeRootOffset(family, modeIndex)) % 12
  return {
    currentFamily: family,
    currentMode: mode,
    currentTension: family.tension,
    currentBrightnessPosition: brightnessPosition === -1 ? 0 : brightnessPosition,
    currentModeRootPc: modeRootPc,
    currentModeNotes: getModeNotes(modeRootPc, family, modeIndex),
    currentModeIntervals: getModeIntervals(family, modeIndex),
  }
}

export const useTonalStore = create<TonalStore>((set, get) => ({
  currentKeyPc: initialKeyPc,
  currentKeyIdx: initialKeyIdx,
  currentTonicLabel: initialTonicLabel,

  familyIndex: initialFamilyIndex,
  modeIndex: initialModeIndex,

  // deprecated aliases
  familyId: initialFamily.id,
  familyModeIndex: initialModeIndex,

  ...derivedFields(initialKeyPc, initialFamilyIndex, initialModeIndex),

  enharmonicPrefs: {},

  currentScale: initialScale,
  harmonyRows: initialHarmonyRows,

  selectedChordIndex: null,
  selectedNotePc: null,

  globalHarmonyMax: 7,
  rowHarmonyMaxOverrides: new Map(),

  progressionSlots: [null, null, null, null],
  isLoopPlaying: false,

  isMuted: true,
  volume: 0,
  lastVolume: 75,
  guitarTuning: STANDARD_TUNING,

  keyboardVoicingIndex: -1,
  guitarVoicingIndex: -1,

  keyboardVoicings: [],
  guitarVoicings: [],

  // --- Key ---
  // pc is the desired tonal center (mode root); back-compute family root
  setKey: (pc) => {
    const { familyIndex, modeIndex, enharmonicPrefs } = get()
    const family = SCALE_FAMILIES[familyIndex]
    const newKeyPc = wrap(pc - getModeRootOffset(family, modeIndex), 12)
    const pref = enharmonicPrefs[pc] ?? null
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(newKeyPc, family.id, modeIndex, pref)
    set({
      currentKeyPc: newKeyPc,
      currentKeyIdx: keyIdx,
      currentTonicLabel: tonicLabel,
      currentScale: scale,
      harmonyRows,
      selectedChordIndex: null,
      selectedNotePc: null,
      rowHarmonyMaxOverrides: new Map(),
      keyboardVoicings: [],
      guitarVoicings: [],
      ...derivedFields(newKeyPc, familyIndex, modeIndex),
    })
  },

  // setFamily now accepts numeric index; preserves audible tonal center
  setFamily: (newFamilyIndex) => {
    const { currentKeyPc, familyIndex, modeIndex, enharmonicPrefs } = get()
    const oldFamily = SCALE_FAMILIES[familyIndex]
    const newFamily = SCALE_FAMILIES[newFamilyIndex] ?? SCALE_FAMILIES[0]
    const safeNewFamilyIndex = SCALE_FAMILIES.indexOf(newFamily)

    // Preserve modeRootPc by adjusting keyPc so (keyPc + offset_of_mode0_in_newFamily) = modeRootPc
    const modeRootPc = (currentKeyPc + getModeRootOffset(oldFamily, modeIndex)) % 12
    const newOffset = getModeRootOffset(newFamily, 0)
    const newKeyPc = wrap(modeRootPc - newOffset, 12)

    const pref = enharmonicPrefs[newKeyPc] ?? null
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(newKeyPc, newFamily.id, 0, pref)
    set({
      familyIndex: safeNewFamilyIndex,
      modeIndex: 0,
      familyId: newFamily.id,
      familyModeIndex: 0,
      currentKeyPc: newKeyPc,
      currentKeyIdx: keyIdx,
      currentTonicLabel: tonicLabel,
      currentScale: scale,
      harmonyRows,
      selectedChordIndex: null,
      selectedNotePc: null,
      rowHarmonyMaxOverrides: new Map(),
      keyboardVoicings: [],
      guitarVoicings: [],
      ...derivedFields(newKeyPc, safeNewFamilyIndex, 0),
    })
  },

  // setModeIndex: wraps mod 7, stays within current family
  setModeIndex: (newModeIndex) => {
    const { currentKeyPc, familyIndex, enharmonicPrefs } = get()
    const family = SCALE_FAMILIES[familyIndex]
    const safeIndex = wrap(newModeIndex, 7)
    const modeRootPc = wrap(currentKeyPc + getModeRootOffset(family, safeIndex), 12)
    const pref = enharmonicPrefs[modeRootPc] ?? null
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(currentKeyPc, family.id, safeIndex, pref)
    set({
      modeIndex: safeIndex,
      familyModeIndex: safeIndex,
      currentKeyIdx: keyIdx,
      currentTonicLabel: tonicLabel,
      currentScale: scale,
      harmonyRows,
      selectedChordIndex: null,
      selectedNotePc: null,
      rowHarmonyMaxOverrides: new Map(),
      keyboardVoicings: [],
      guitarVoicings: [],
      ...derivedFields(currentKeyPc, familyIndex, safeIndex),
    })
  },

  // setModeByBrightness: absolute position in BRIGHTNESS_ORDER (0–34)
  setModeByBrightness: (position) => {
    const { currentKeyPc, familyIndex, modeIndex, enharmonicPrefs } = get()
    const safePos = wrap(position, BRIGHTNESS_ORDER.length)
    const entry = BRIGHTNESS_ORDER[safePos]
    const oldFamily = SCALE_FAMILIES[familyIndex]
    const newFamily = SCALE_FAMILIES[entry.familyIndex]

    // Preserve modeRootPc across the change
    const modeRootPc = (currentKeyPc + getModeRootOffset(oldFamily, modeIndex)) % 12
    const newOffset = getModeRootOffset(newFamily, entry.modeIndex)
    const newKeyPc = wrap(modeRootPc - newOffset, 12)

    const pref = enharmonicPrefs[modeRootPc] ?? null
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(newKeyPc, newFamily.id, entry.modeIndex, pref)
    set({
      familyIndex: entry.familyIndex,
      modeIndex: entry.modeIndex,
      familyId: newFamily.id,
      familyModeIndex: entry.modeIndex,
      currentKeyPc: newKeyPc,
      currentKeyIdx: keyIdx,
      currentTonicLabel: tonicLabel,
      currentScale: scale,
      harmonyRows,
      selectedChordIndex: null,
      selectedNotePc: null,
      rowHarmonyMaxOverrides: new Map(),
      keyboardVoicings: [],
      guitarVoicings: [],
      ...derivedFields(newKeyPc, entry.familyIndex, entry.modeIndex),
    })
  },

  // setModeByTension: cross-family jump; picks mode closest in brightness to current
  setModeByTension: (tension) => {
    const { currentKeyPc, familyIndex, modeIndex, enharmonicPrefs } = get()
    const oldFamily = SCALE_FAMILIES[familyIndex]
    const currentEntry = BRIGHTNESS_ORDER.find(
      e => e.familyIndex === familyIndex && e.modeIndex === modeIndex
    )
    const currentBrightness = currentEntry?.tieredBrightness ?? 0

    // All BRIGHTNESS_ORDER entries that belong to the target tension group
    const candidates = BRIGHTNESS_ORDER.filter(
      e => SCALE_FAMILIES[e.familyIndex].tension === tension
    )
    if (!candidates.length) return

    // Pick the candidate whose brightness is closest to current
    const best = candidates.reduce((prev, cur) =>
      Math.abs(cur.tieredBrightness - currentBrightness) < Math.abs(prev.tieredBrightness - currentBrightness)
        ? cur : prev
    )
    const newFamily = SCALE_FAMILIES[best.familyIndex]

    // Preserve audible tonal center
    const modeRootPc = (currentKeyPc + getModeRootOffset(oldFamily, modeIndex)) % 12
    const newOffset = getModeRootOffset(newFamily, best.modeIndex)
    const newKeyPc = wrap(modeRootPc - newOffset, 12)

    const pref = enharmonicPrefs[modeRootPc] ?? null
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(newKeyPc, newFamily.id, best.modeIndex, pref)
    set({
      familyIndex: best.familyIndex,
      modeIndex: best.modeIndex,
      familyId: newFamily.id,
      familyModeIndex: best.modeIndex,
      currentKeyPc: newKeyPc,
      currentKeyIdx: keyIdx,
      currentTonicLabel: tonicLabel,
      currentScale: scale,
      harmonyRows,
      selectedChordIndex: null,
      selectedNotePc: null,
      rowHarmonyMaxOverrides: new Map(),
      keyboardVoicings: [],
      guitarVoicings: [],
      ...derivedFields(newKeyPc, best.familyIndex, best.modeIndex),
    })
  },

  // Mode picker: change mode within family, keep tonal center (modeRootPc) fixed
  setModeIndexPreservingTonic: (newModeIndex) => {
    const { familyIndex, enharmonicPrefs, currentModeRootPc } = get()
    const family = SCALE_FAMILIES[familyIndex]
    const safeIndex = wrap(newModeIndex, 7)
    const newKeyPc = wrap(currentModeRootPc - getModeRootOffset(family, safeIndex), 12)
    const pref = enharmonicPrefs[currentModeRootPc] ?? null
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(newKeyPc, family.id, safeIndex, pref)
    set({
      modeIndex: safeIndex,
      familyModeIndex: safeIndex,
      currentKeyPc: newKeyPc,
      currentKeyIdx: keyIdx,
      currentTonicLabel: tonicLabel,
      currentScale: scale,
      harmonyRows,
      selectedChordIndex: null,
      selectedNotePc: null,
      rowHarmonyMaxOverrides: new Map(),
      keyboardVoicings: [],
      guitarVoicings: [],
      ...derivedFields(newKeyPc, familyIndex, safeIndex),
    })
  },

  // deprecated alias — kept so any old callers (HarmonyGrid tests etc) don't break
  setFamilyModeIndex: (index) => {
    get().setModeIndex(index)
  },

  // --- Navigate across global brightness order (legacy delta-based; kept for old callers) ---
  // NOTE: old code called setModeByBrightness(+1/-1) as delta — that is no longer supported.
  // New callers pass an absolute position. Old callers that passed delta will get wrong results;
  // the old ScaleNavigator is gone so this is safe.

  // --- Enharmonic preference (e.g. user chose Db over C#) ---
  setEnharmonicPref: (pc, pref) => {
    const { enharmonicPrefs, currentKeyPc, familyIndex, modeIndex } = get()
    const family = SCALE_FAMILIES[familyIndex]
    const modeRootPc = wrap(currentKeyPc + getModeRootOffset(family, modeIndex), 12)
    const newPrefs = { ...enharmonicPrefs, [pc]: pref }
    set({ enharmonicPrefs: newPrefs })
    if (pc === modeRootPc) {
      const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(currentKeyPc, family.id, modeIndex, pref)
      set({ currentScale: scale, harmonyRows, currentKeyIdx: keyIdx, currentTonicLabel: tonicLabel })
    }
  },

  setSelectedChord: (index) =>
    set((state) => {
      const { keyboardVoicings, guitarVoicings } = computeVoicings(
        state.harmonyRows, index, state.globalHarmonyMax, state.rowHarmonyMaxOverrides, state.guitarTuning,
      )
      return { selectedChordIndex: index, selectedNotePc: null, keyboardVoicingIndex: -1, guitarVoicingIndex: -1, keyboardVoicings, guitarVoicings }
    }),
  setSelectedNote: (pc) => set({ selectedNotePc: pc, selectedChordIndex: null }),

  setGlobalHarmonyMax: (max) =>
    set((state) => {
      const newOverrides = new Map<number, number>()
      const { keyboardVoicings, guitarVoicings } = computeVoicings(
        state.harmonyRows, state.selectedChordIndex, max, newOverrides, state.guitarTuning,
      )
      return { globalHarmonyMax: max, rowHarmonyMaxOverrides: newOverrides, keyboardVoicings, guitarVoicings }
    }),
  setRowHarmonyMax: (rowIndex, max) =>
    set((state) => {
      const overrides = new Map(state.rowHarmonyMaxOverrides)
      if (max === null) overrides.delete(rowIndex)
      else overrides.set(rowIndex, max)
      const { keyboardVoicings, guitarVoicings } = computeVoicings(
        state.harmonyRows, state.selectedChordIndex, state.globalHarmonyMax, overrides, state.guitarTuning,
      )
      return { rowHarmonyMaxOverrides: overrides, keyboardVoicings, guitarVoicings }
    }),

  setMuted: (muted) => set({ isMuted: muted }),
  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(100, v))
    const updates: Partial<TonalStore> = { volume: clamped, isMuted: clamped === 0 }
    if (clamped > 0) updates.lastVolume = clamped
    set(updates)
  },
  setGuitarTuning: (tuning) =>
    set((state) => {
      const { keyboardVoicings, guitarVoicings } = computeVoicings(
        state.harmonyRows, state.selectedChordIndex, state.globalHarmonyMax, state.rowHarmonyMaxOverrides, tuning,
      )
      return { guitarTuning: tuning, keyboardVoicings, guitarVoicings }
    }),

  setKeyboardVoicingIndex: (index) => set({ keyboardVoicingIndex: index }),
  setGuitarVoicingIndex: (index) => set({ guitarVoicingIndex: index }),

  setProgressionSlot: (slotIndex, chordIndex) =>
    set((state) => {
      const slots = [...state.progressionSlots]
      slots[slotIndex] = chordIndex
      return { progressionSlots: slots }
    }),

  setLoopPlaying: (playing) => set({ isLoopPlaying: playing }),

  randomize: () => {
    const familyIndex = Math.floor(Math.random() * SCALE_FAMILIES.length)
    const family      = SCALE_FAMILIES[familyIndex]
    const modeIndex   = Math.floor(Math.random() * family.modes.length)
    const root        = Math.floor(Math.random() * 12)
    const store = get()
    store.setFamily(familyIndex)
    store.setModeIndex(modeIndex)
    store.setKey(root)
  },
}))
