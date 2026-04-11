// Zustand store — replaces 20+ global variables in script.js
// Single source of truth for all app state.

import { create } from 'zustand'
import {
  computeDisplayScale,
  buildHarmonyRowsForScale,
} from '../theory/index'
import type { ScaleData, HarmonyRow, ScaleType, GuitarTuning } from '../theory/types'

// Standard tuning: high E → low E (MIDI 64, 59, 55, 50, 45, 40)
const STANDARD_TUNING: GuitarTuning = [64, 59, 55, 50, 45, 40]

// Compute the initial scale on load (C Ionian)
function computeScale(
  keyPc: number,
  scaleType: ScaleType,
  preference: 'sharp' | 'flat' | null = null,
): { scale: ScaleData; harmonyRows: HarmonyRow[]; keyIdx: number; tonicLabel: string } {
  const display = computeDisplayScale(keyPc, scaleType, preference)
  const scale: ScaleData = { pitchClasses: display.pitchClasses, spelled: display.spelled }
  return {
    scale,
    harmonyRows: buildHarmonyRowsForScale(scale),
    keyIdx: display.keyIdx,
    tonicLabel: display.tonicLabel,
  }
}

const initialScaleType: ScaleType = 'ionian'
const initialKeyPc = 0
const { scale: initialScale, harmonyRows: initialHarmonyRows, keyIdx: initialKeyIdx, tonicLabel: initialTonicLabel } =
  computeScale(initialKeyPc, initialScaleType)

interface TonalStore {
  // Key & mode
  currentKeyPc: number
  currentKeyIdx: number
  currentTonicLabel: string
  currentModeIndex: number
  scaleType: ScaleType
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
  setMode: (index: number) => void
  setScaleType: (type: ScaleType) => void
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
  currentModeIndex: 0,
  scaleType: initialScaleType,
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
    const { scaleType, enharmonicPrefs } = get()
    const pref = enharmonicPrefs[pc] ?? null
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScale(pc, scaleType, pref)
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

  // --- Mode (index into the 7 diatonic modes) ---
  setMode: (index) => {
    const DIATONIC_TYPES: ScaleType[] = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']
    const scaleType = DIATONIC_TYPES[index] ?? 'ionian'
    const { currentKeyPc, enharmonicPrefs } = get()
    const pref = enharmonicPrefs[currentKeyPc] ?? null
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScale(currentKeyPc, scaleType, pref)
    set({
      currentModeIndex: index,
      scaleType,
      currentKeyIdx: keyIdx,
      currentTonicLabel: tonicLabel,
      currentScale: scale,
      harmonyRows,
      selectedChordIndex: null,
      selectedNotePc: null,
      rowHarmonyMaxOverrides: new Map(),
    })
  },

  // --- Scale type (non-diatonic modes) ---
  setScaleType: (type) => {
    const { currentKeyPc, enharmonicPrefs } = get()
    const pref = enharmonicPrefs[currentKeyPc] ?? null
    const { scale, harmonyRows, keyIdx, tonicLabel } = computeScale(currentKeyPc, type, pref)
    set({
      scaleType: type,
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
    const { enharmonicPrefs, currentKeyPc, scaleType } = get()
    const newPrefs = { ...enharmonicPrefs, [pc]: pref }
    set({ enharmonicPrefs: newPrefs })
    if (pc === currentKeyPc) {
      const { scale, harmonyRows, keyIdx, tonicLabel } = computeScale(currentKeyPc, scaleType, pref)
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
