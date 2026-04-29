import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SectionId = 'navigator' | 'circle' | 'strip' | 'keyboard' | 'fretboard' | 'harmony'

export const SECTION_LABELS: Record<SectionId, string> = {
  navigator: 'Scale Controls',
  circle: 'Circle of Fifths',
  strip: 'Scale Strip',
  keyboard: 'Keyboard',
  fretboard: 'Fretboard',
  harmony: 'Harmony Grid',
}

export const DEFAULT_ORDER: SectionId[] = ['navigator', 'circle', 'strip', 'keyboard', 'fretboard', 'harmony']

export interface NavigatorGroups {
  logical: boolean
  exploratory: boolean
}

// This default applies only on first install (no persisted state) or after resetLayout —
// not on every load (zustand/persist restores the saved value after that).
// On mobile portrait the logical group (ROOT/FAMILY/MODE) overflows the 6-knob row;
// hiding it by default leaves only 3 knobs which fit comfortably.
function defaultNavigatorGroups(): NavigatorGroups {
  const isLandscape = typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches
  return { logical: isLandscape, exploratory: true }
}

interface LayoutStore {
  sectionOrder: SectionId[]
  sectionVisible: Record<SectionId, boolean>
  navigatorGroups: NavigatorGroups
  setSectionOrder: (order: SectionId[]) => void
  setSectionVisible: (id: SectionId, visible: boolean) => void
  setNavigatorGroup: (group: keyof NavigatorGroups, visible: boolean) => void
  resetLayout: () => void
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      sectionOrder: [...DEFAULT_ORDER],
      sectionVisible: {
        navigator: true,
        circle: true,
        strip: true,
        keyboard: true,
        fretboard: true,
        harmony: true,
      },
      navigatorGroups: defaultNavigatorGroups(),
      setSectionOrder: (order) => set({ sectionOrder: order }),
      setSectionVisible: (id, visible) =>
        set((state) => ({ sectionVisible: { ...state.sectionVisible, [id]: visible } })),
      setNavigatorGroup: (group, visible) =>
        set((state) => ({ navigatorGroups: { ...state.navigatorGroups, [group]: visible } })),
      resetLayout: () => set({
        sectionOrder: [...DEFAULT_ORDER],
        sectionVisible: { navigator: true, circle: true, strip: true, keyboard: true, fretboard: true, harmony: true },
        navigatorGroups: defaultNavigatorGroups(),
      }),
    }),
    {
      name: 'tonal-layout',
      partialize: (state) => ({
        sectionOrder: state.sectionOrder,
        sectionVisible: state.sectionVisible,
        navigatorGroups: state.navigatorGroups,
      }),
    }
  )
)
