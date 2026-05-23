import { useEffect, useRef } from 'react'

// Wires Escape-to-close and previously-focused-element-restoration for popovers
// and modals. Saves the focused element at mount and restores focus to it when
// `active` flips back to false (or the consumer unmounts).
//
// `onClose` may be a fresh function on every render — we stash it in a ref so a
// changing reference doesn't re-trigger the effect (which would prematurely
// restore focus and unbind/rebind the Escape listener on each parent render).
export function useDismissable(active: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!active) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      // Restore focus only if the previous element is still in the document.
      // If the user clicked elsewhere meanwhile, leave focus where the browser put it.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [active])
}
