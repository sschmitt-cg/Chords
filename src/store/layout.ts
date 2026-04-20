import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SectionId = 'navigator' | 'strip' | 'keyboard' | 'fretboard' | 'harmony'

export const SECTION_LABELS: Record<SectionId, string> = {
  navigator: 'Scale Controls',
  strip: 'Scale Strip',
  keyboard: 'Keyboard',
  fretboard: 'Fretboard',
  harmony: 'Harmony Grid',
}

export const DEFAULT_ORDER: SectionId[] = ['navigator', 'strip', 'keyboard', 'fretboard', 'harmony']

interface LayoutStore {
  sectionOrder: SectionId[]
  sectionVisible: Record<SectionId, boolean>
  setSectionOrder: (order: SectionId[]) => void
  setSectionVisible: (id: SectionId, visible: boolean) => void
  resetLayout: () => void
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      sectionOrder: [...DEFAULT_ORDER],
      sectionVisible: {
        navigator: true,
        strip: true,
        keyboard: true,
        fretboard: true,
        harmony: true,
      },
      setSectionOrder: (order) => set({ sectionOrder: order }),
      setSectionVisible: (id, visible) =>
        set((state) => ({ sectionVisible: { ...state.sectionVisible, [id]: visible } })),
      resetLayout: () => set({
        sectionOrder: [...DEFAULT_ORDER],
        sectionVisible: { navigator: true, strip: true, keyboard: true, fretboard: true, harmony: true },
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
