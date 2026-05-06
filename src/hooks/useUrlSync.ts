// Keeps the URL query string in sync with the current tonal state so users
// can share or bookmark a specific key/mode/scale combination.
//
// On mount: reads ?root=&family=&mode= from window.location.search and, if all
// three params are present and valid, hydrates the store before first render.
//
// On state change: calls history.replaceState to update the URL without a
// page reload. No router library — native browser history only.

import { useEffect } from 'react'
import { useTonalStore } from '../store/index'
import { SCALE_FAMILIES } from '../theory/index'

const PARAM_ROOT   = 'root'
const PARAM_FAMILY = 'family'
const PARAM_MODE   = 'mode'

/** Read URL params once at startup and hydrate the store if all three are valid. */
export function hydrateFromUrl(): void {
  const params = new URLSearchParams(window.location.search)
  const rawRoot   = params.get(PARAM_ROOT)
  const rawFamily = params.get(PARAM_FAMILY)
  const rawMode   = params.get(PARAM_MODE)

  if (rawRoot === null || rawFamily === null || rawMode === null) return

  const root      = parseInt(rawRoot, 10)
  const modeIndex = parseInt(rawMode, 10)

  if (!Number.isInteger(root) || root < 0 || root > 11) return
  if (!Number.isInteger(modeIndex) || modeIndex < 0 || modeIndex > 6) return

  const familyIndex = SCALE_FAMILIES.findIndex(f => f.id === rawFamily)
  if (familyIndex === -1) return

  const family = SCALE_FAMILIES[familyIndex]
  if (modeIndex >= family.modes.length) return

  // setFamily resets modeIndex to 0 and preserves the audible tonal center.
  // We call setModeIndex after to reach the desired mode, then setKey to
  // reach the desired tonal center (modeRootPc = root).
  const store = useTonalStore.getState()
  store.setFamily(familyIndex)
  store.setModeIndex(modeIndex)
  // setKey expects the desired tonal center (mode root pitch class).
  store.setKey(root)
}

/** Hook that watches tonal state and keeps the URL in sync via replaceState. */
export function useUrlSync(): void {
  const familyId   = useTonalStore(s => s.familyId)
  const modeIndex  = useTonalStore(s => s.modeIndex)
  const modeRootPc = useTonalStore(s => s.currentModeRootPc)

  useEffect(() => {
    const params = new URLSearchParams()
    // Encode the audible tonal center (mode root), not the family root,
    // so the URL reflects what the user hears as "home".
    params.set(PARAM_ROOT,   String(modeRootPc))
    params.set(PARAM_FAMILY, familyId)
    params.set(PARAM_MODE,   String(modeIndex))
    const newSearch = `?${params.toString()}`
    if (window.location.search !== newSearch) {
      history.replaceState(null, '', newSearch)
    }
  }, [familyId, modeIndex, modeRootPc])
}
