import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SectionId = 'scale-logical' | 'scale-exploratory' | 'circle' | 'strip' | 'keyboard' | 'fretboard' | 'harmony' | 'metronome'

export const SECTION_LABELS: Record<SectionId, string> = {
  'scale-logical':     'Key & Mode',
  'scale-exploratory': 'Scale Explorer',
  circle:              'Circle of Fifths',
  strip:               'Scale Strip',
  keyboard:            'Keyboard',
  fretboard:           'Fretboard',
  harmony:             'Harmony Grid',
  metronome:           'Metronome',
}

export const DEFAULT_ORDER: SectionId[] = ['scale-logical', 'scale-exploratory', 'circle', 'strip', 'keyboard', 'fretboard', 'harmony', 'metronome']

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
      version: 1,
      migrate(persisted, version) {
        const state = persisted as { sectionOrder: SectionId[]; sectionVisible: Record<SectionId, boolean> }
        if (version < 1) {
          // Add sections introduced after initial release to existing saved layouts
          for (const id of DEFAULT_ORDER) {
            if (!state.sectionOrder.includes(id)) state.sectionOrder.push(id)
            if (state.sectionVisible[id] === undefined) state.sectionVisible[id] = false
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
