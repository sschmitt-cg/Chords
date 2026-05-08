import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SectionId = 'scale-logical' | 'scale-exploratory' | 'circle' | 'strip' | 'keyboard' | 'fretboard' | 'harmony' | 'metronome' | 'tuner' | 'tuning-selector'

export const SECTION_LABELS: Record<SectionId, string> = {
  'scale-logical':     'Key & Mode',
  'scale-exploratory': 'Scale Explorer',
  circle:              'Circle of Fifths',
  strip:               'Scale Strip',
  keyboard:            'Keyboard',
  fretboard:           'Fretboard',
  harmony:             'Harmony Grid',
  metronome:           'Metronome',
  tuner:               'Chromatic Tuner',
  'tuning-selector':   'Tuning Selector',
}

// Sections that appear in the menu but are positionally fixed (not drag-reorderable).
// Rendered at a fixed position relative to their coupled component (e.g. tuning-selector below fretboard).
export const PINNED_SECTIONS: SectionId[] = ['tuning-selector']

export const DEFAULT_ORDER: SectionId[] = ['scale-logical', 'scale-exploratory', 'circle', 'strip', 'keyboard', 'fretboard', 'harmony', 'metronome', 'tuner']

interface LayoutStore {
  sectionOrder: SectionId[]
  sectionVisible: Record<SectionId, boolean>
  setSectionOrder: (order: SectionId[]) => void
  setSectionVisible: (id: SectionId, visible: boolean) => void
  resetLayout: () => void
}

// This default applies only on first install (no persisted state) or after resetLayout —
// not on every load (zustand/persist restores the saved value after that).
// On mobile portrait the logical group (ROOT/FAMILY/MODE) overflows a 6-knob row;
// hiding it by default leaves only 3 knobs which fit comfortably.
function defaultVisible(): Record<SectionId, boolean> {
  const isLandscape = typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches
  return {
    'scale-logical':     isLandscape,
    'scale-exploratory': true,
    circle:              true,
    strip:               true,
    keyboard:            true,
    fretboard:           true,
    harmony:             true,
    metronome:           false,
    tuner:               true,
    'tuning-selector':   false,
  }
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      sectionOrder: [...DEFAULT_ORDER],
      sectionVisible: defaultVisible(),
      setSectionOrder: (order) => set({ sectionOrder: order }),
      setSectionVisible: (id, visible) =>
        set((state) => ({ sectionVisible: { ...state.sectionVisible, [id]: visible } })),
      resetLayout: () => set({
        sectionOrder: [...DEFAULT_ORDER],
        sectionVisible: defaultVisible(),
      }),
    }),
    {
      name: 'tonal-layout',
      version: 3,
      migrate(persisted, version) {
        const state = persisted as { sectionOrder: SectionId[]; sectionVisible: Record<SectionId, boolean> }
        if (version < 1) {
          // Add sections introduced after initial release to existing saved layouts
          for (const id of DEFAULT_ORDER) {
            if (!state.sectionOrder.includes(id)) state.sectionOrder.push(id)
            if (state.sectionVisible[id] === undefined) state.sectionVisible[id] = false
          }
        }
        if (version < 2) {
          // Add tuner section; visible by default as a parity item
          if (!state.sectionOrder.includes('tuner')) state.sectionOrder.push('tuner')
          if (state.sectionVisible['tuner'] === undefined) state.sectionVisible['tuner'] = true
        }
        if (version < 3) {
          // Add tuning-selector as a pinned section (not in sectionOrder); hidden by default
          if (state.sectionVisible['tuning-selector'] === undefined) {
            state.sectionVisible['tuning-selector'] = false
          }
        }
        return state
      },
      partialize: (state) => ({
        sectionOrder: state.sectionOrder,
        sectionVisible: state.sectionVisible,
      }),
    }
  )
)
