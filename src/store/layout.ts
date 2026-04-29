import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SectionId = 'scale-logical' | 'scale-exploratory' | 'circle' | 'strip' | 'keyboard' | 'fretboard' | 'harmony'

export const SECTION_LABELS: Record<SectionId, string> = {
  'scale-logical':     'Key & Mode',
  'scale-exploratory': 'Scale Explorer',
  circle:              'Circle of Fifths',
  strip:               'Scale Strip',
  keyboard:            'Keyboard',
  fretboard:           'Fretboard',
  harmony:             'Harmony Grid',
}

export const DEFAULT_ORDER: SectionId[] = ['scale-logical', 'scale-exploratory', 'circle', 'strip', 'keyboard', 'fretboard', 'harmony']

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
      partialize: (state) => ({
        sectionOrder: state.sectionOrder,
        sectionVisible: state.sectionVisible,
      }),
    }
  )
)
