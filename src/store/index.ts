// Zustand store — replaces 20+ global variables in script.js
// Single source of truth for all app state.

import { create } from 'zustand'
import {
  computeDisplayScaleFromFamily,
  buildHarmonyRowsForScale,
  SCALE_FAMILIES,
  GLOBAL_BRIGHTNESS_ORDER,
  wrap,
} from '../theory/index'
import type { ScaleData, HarmonyRow, GuitarTuning } from '../theory/types'

// Standard tuning: high E → low E (MIDI 64, 59, 55, 50, 45, 40)
const STANDARD_TUNING: GuitarTuning = [64, 59, 55, 50, 45, 40]

function computeScaleForFamily(
  keyPc: number,
  familyId: string,
  modeIndex: number,
  preference: 'sharp' | 'flat' | null = null,
): { scale: ScaleData; harmonyRows: HarmonyRow[]; keyIdx: number; tonicLabel: string; preferenceUsed: 'sharp' | 'flat' | null } {
  const display = computeDisplayScaleFromFamily(keyPc, familyId, modeIndex, preference)
  const scale: ScaleData = { pitchClasses: display.pitchClasses, spelled: display.spelled }
  return {
    scale,
    harmonyRows: buildHarmonyRowsForScale(scale),
    keyIdx: display.keyIdx,
    tonicLabel: display.tonicLabel,
    preferenceUsed: display.preferenceUsed,
  }
}

const initialFamilyId = 'major'
const initialFamilyModeIndex = 0
const initialKeyPc = 0
const {
  scale: initialScale,
  harmonyRows: initialHarmonyRows,
  keyIdx: initialKeyIdx,
  tonicLabel: initialTonicLabel,
} = computeScaleForFamily(initialKeyPc, initialFamilyId, initialFamilyModeIndex)

interface TonalStore {
  // Key
  currentKeyPc: number
  currentKeyIdx: number
  currentTonicLabel: string
  // Scale family + mode
  familyId: string
  familyModeIndex: number
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

  // Guitar tuning
  guitarTuning: GuitarTuning

  // Actions
  setKey: (pc: number) => void
  setFamily: (id: string) => void
  setFamilyModeIndex: (index: number) => void
  setModeByBrightness: (delta: number) => void
  setEnharmonicPref: (pc: number, pref: 'sharp' | 'flat') => void
  setSelectedChord: (index: number | null) => void
  setSelectedNote: (pc: number | null) => void
  setGlobalHarmonyMax: (max: number) => void
  setRowHarmonyMax: (rowIndex: number, max: number | null) => void
  setMuted: (muted: boolean) => void
  setGuitarTuning: (tuning: GuitarTuning) => void
  setProgressionSlot: (slotIndex: number, chordIndex: number | null) => void
  setLoopPlaying: (playing: boolean) => void
}

export const useTonalStore = create<TonalStore>((set, get) => ({
  currentKeyPc: initialKeyPc,
  currentKeyIdx: initialKeyIdx,
  currentTonicLabel: initialTonicLabel,
  familyId: initialFamilyId,
  familyModeIndex: initialFamilyModeIndex,
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
  guitarTuning: STANDARD_TUNING,

  // --- Key ---
  setKey: (pc) => {
    const { familyId, familyModeIndex, enharmonicPrefs } = get()
    const pref = enharmonicPrefs[pc] ?? null
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(pc, familyId, familyModeIndex, pref)
    set({
      currentKeyPc: pc,
      currentKeyIdx: keyIdx,
      currentTonicLabel: tonicLabel,
      currentScale: scale,
      harmonyRows,
      selectedChordIndex: null,
      selectedNotePc: null,
      rowHarmonyMaxOverrides: new Map(),
    })
  },

  // --- Scale family ---
  setFamily: (id) => {
    const { currentKeyPc, enharmonicPrefs } = get()
    const pref = enharmonicPrefs[currentKeyPc] ?? null
    // Validate family id; fall back to first family
    const family = SCALE_FAMILIES.find(f => f.id === id) ?? SCALE_FAMILIES[0]
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(currentKeyPc, family.id, 0, pref)
    set({
      familyId: family.id,
      familyModeIndex: 0,
      currentKeyIdx: keyIdx,
      currentTonicLabel: tonicLabel,
      currentScale: scale,
      harmonyRows,
      selectedChordIndex: null,
      selectedNotePc: null,
      rowHarmonyMaxOverrides: new Map(),
    })
  },

  // --- Mode within current family ---
  setFamilyModeIndex: (index) => {
    const { currentKeyPc, familyId, enharmonicPrefs } = get()
    const pref = enharmonicPrefs[currentKeyPc] ?? null
    const safeIndex = wrap(index, 7)
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(currentKeyPc, familyId, safeIndex, pref)
    set({
      familyModeIndex: safeIndex,
      currentKeyIdx: keyIdx,
      currentTonicLabel: tonicLabel,
      currentScale: scale,
      harmonyRows,
      selectedChordIndex: null,
      selectedNotePc: null,
      rowHarmonyMaxOverrides: new Map(),
    })
  },

  // --- Navigate across global brightness order ---
  setModeByBrightness: (delta) => {
    const { familyId, familyModeIndex, currentKeyPc, enharmonicPrefs } = get()
    const currentIdx = GLOBAL_BRIGHTNESS_ORDER.findIndex(
      e => e.familyId === familyId && e.modeIndex === familyModeIndex
    )
    if (currentIdx === -1) return
    const nextIdx = wrap(currentIdx + delta, GLOBAL_BRIGHTNESS_ORDER.length)
    const next = GLOBAL_BRIGHTNESS_ORDER[nextIdx]
    const pref = enharmonicPrefs[currentKeyPc] ?? null
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(currentKeyPc, next.familyId, next.modeIndex, pref)
    set({
      familyId: next.familyId,
      familyModeIndex: next.modeIndex,
      currentKeyIdx: keyIdx,
      currentTonicLabel: tonicLabel,
      currentScale: scale,
      harmonyRows,
      selectedChordIndex: null,
      selectedNotePc: null,
      rowHarmonyMaxOverrides: new Map(),
    })
  },

  // --- Enharmonic preference (e.g. user chose Db over C#) ---
  setEnharmonicPref: (pc, pref) => {
    const { enharmonicPrefs, currentKeyPc, familyId, familyModeIndex } = get()
    const newPrefs = { ...enharmonicPrefs, [pc]: pref }
    set({ enharmonicPrefs: newPrefs })
    if (pc === currentKeyPc) {
      const { scale, harmonyRows, keyIdx, tonicLabel } = computeScaleForFamily(currentKeyPc, familyId, familyModeIndex, pref)
      set({ currentScale: scale, harmonyRows, currentKeyIdx: keyIdx, currentTonicLabel: tonicLabel })
    }
  },

  setSelectedChord: (index) => set({ selectedChordIndex: index, selectedNotePc: null }),
  setSelectedNote: (pc) => set({ selectedNotePc: pc, selectedChordIndex: null }),

  setGlobalHarmonyMax: (max) => set({ globalHarmonyMax: max }),
  setRowHarmonyMax: (rowIndex, max) =>
    set((state) => {
      const overrides = new Map(state.rowHarmonyMaxOverrides)
      if (max === null) overrides.delete(rowIndex)
      else overrides.set(rowIndex, max)
      return { rowHarmonyMaxOverrides: overrides }
    }),

  setMuted: (muted) => set({ isMuted: muted }),
  setGuitarTuning: (tuning) => set({ guitarTuning: tuning }),

  setProgressionSlot: (slotIndex, chordIndex) =>
    set((state) => {
      const slots = [...state.progressionSlots]
      slots[slotIndex] = chordIndex
      return { progressionSlots: slots }
    }),

  setLoopPlaying: (playing) => set({ isLoopPlaying: playing }),
}))
