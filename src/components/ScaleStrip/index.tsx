// ScaleStrip — chromatic 12-position rotating carousel.
// One cycle = 12 semitone slots (7 scale tones + 5 dotted ghost markers).
// Three cycles are rendered so a tile sliding off one edge is immediately replaced
// by its rotated copy from the opposite side. Horizontal drag rotates the mode
// within the current family; long-press + vertical drag transposes the root.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTonalStore } from '../../store/index'
import { useAudio } from '../../hooks/useAudio'
import { computeRomans, pcColorVar, wrap, pcName } from '../../theory/index'
import styles from './ScaleStrip.module.css'

// Horizontal swipe shifts the mode within the current family — same notes, new tonal center.
// Live drag follows the finger; on release we snap to the nearest scale tone (skipping
// ghost semitones), so dragging "one whole step" or "one half step" both feel correct.
const SWIPE_AXIS_LOCK_PX = 8
const SNAP_TRANSITION_MS = 260

// Long-press → drag-transpose: holding the strip in place for 250ms arms vertical drag.
// Drag-up raises the root by ~one semitone every 24px; horizontal drift is ignored once
// the mode is armed so transpose can't be hijacked by an accidental swipe.
const LONG_PRESS_MS = 250
const LONG_PRESS_CANCEL_PX = 8
const SEMITONE_PIXELS = 24

// Carousel layout
const CYCLE_SIZE = 12                                   // semitone slots per cycle
const CAROUSEL_CYCLES = 3                               // pre-render 3 cycles so wrap-around is seamless
const CAROUSEL_TILE_COUNT = CAROUSEL_CYCLES * CYCLE_SIZE // 36
const CAROUSEL_PRIMARY_OFFSET = CYCLE_SIZE              // middle cycle starts at index 12
const CAROUSEL_GAP_PX = 3

// Find the mode-index delta (within the current family) whose root lands closest to
// the user's chromatic-shift target. Returns both the integer modeIndex delta to
// commit and the exact semitone shift it represents — the snap animates the track
// by that many semitone slots before committing.
function findClosestModeShift(
  intervals: readonly number[],
  currentModeIdx: number,
  desiredShift: number,
): { delta: number; shift: number } {
  const currentOffset = intervals.slice(0, currentModeIdx).reduce((s, v) => s + v, 0)
  let best = { delta: 0, shift: 0, dist: Infinity }
  // Cover up to ±1 octave of mode movement — more than enough for any single swipe.
  for (let delta = -intervals.length; delta <= intervals.length; delta++) {
    const wrappedIdx = wrap(currentModeIdx + delta, intervals.length)
    const cyclesAcross = Math.floor((currentModeIdx + delta) / intervals.length)
    const offset = intervals.slice(0, wrappedIdx).reduce((s, v) => s + v, 0) + cyclesAcross * 12
    const shift = offset - currentOffset
    const dist = Math.abs(shift - desiredShift)
    if (dist < best.dist) best = { delta, shift, dist }
  }
  return { delta: best.delta, shift: best.shift }
}

export default function ScaleStrip() {
  const {
    currentScale,
    currentModeNotes,
    currentModeRootPc,
    modeIndex,
    currentMode,
    currentFamily,
    enharmonicPrefs,
    selectedNotePc,
    selectedChordIndex,
    setSelectedNote,
    setSelectedChord,
    setModeIndex,
    setKey,
  } = useTonalStore()
  const { playScale, playNote } = useAudio()

  // Gesture state — refs so renders don't churn and handlers can read/write freely.
  const gestureStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const suppressClickRef = useRef(false)
  const longPressTimerRef = useRef<number | null>(null)
  const dragModeRef = useRef<{ startY: number; startRootPc: number; lastSemitones: number } | null>(null)
  const [isDragTransposing, setIsDragTransposing] = useState(false)

  // Horizontal-swipe state.
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const isHorizontalSwipeRef = useRef(false)
  const slotPitchRef = useRef(0)
  const initialTranslateRef = useRef(0)
  const snapTimeoutRef = useRef<number | null>(null)
  const pendingSnapRef = useRef<{ modeDelta: number } | null>(null)
  const [isSnapping, setIsSnapping] = useState(false)
  const [carouselTileWidth, setCarouselTileWidth] = useState(0)

  // Measure the carousel: tile width = (viewport - 11 gaps) / 12, anchor the track so
  // the middle cycle (slots 12..23) sits exactly within the viewport.
  useLayoutEffect(() => {
    const vp = viewportRef.current
    if (!vp) return

    const measure = () => {
      const w = vp.offsetWidth
      if (w <= 0) return
      const tileW = (w - (CYCLE_SIZE - 1) * CAROUSEL_GAP_PX) / CYCLE_SIZE
      const slotPitch = tileW + CAROUSEL_GAP_PX
      const anchor = -CAROUSEL_PRIMARY_OFFSET * slotPitch
      setCarouselTileWidth(tileW)
      slotPitchRef.current = slotPitch
      initialTranslateRef.current = anchor
      if (trackRef.current && !isHorizontalSwipeRef.current && !pendingSnapRef.current) {
        trackRef.current.style.transform = `translateX(${anchor}px)`
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(vp)
    return () => ro.disconnect()
  }, [])

  // External mode/root changes (pickers, knobs, etc.) — reset the carousel to anchor.
  useEffect(() => {
    if (trackRef.current && !isHorizontalSwipeRef.current && !pendingSnapRef.current) {
      trackRef.current.style.transform = `translateX(${initialTranslateRef.current}px)`
    }
  }, [modeIndex, currentModeRootPc])

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) clearTimeout(longPressTimerRef.current)
      if (snapTimeoutRef.current !== null) clearTimeout(snapTimeoutRef.current)
    }
  }, [])

  function clearLongPress() {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function applyTranslate(px: number) {
    const t = trackRef.current
    if (t) t.style.transform = `translateX(${px}px)`
  }

  // If the user starts a new gesture during an in-flight snap, commit the pending
  // mode change immediately and reset the track so the new gesture starts clean.
  function finalizePendingSnap() {
    const pending = pendingSnapRef.current
    if (!pending) return
    if (snapTimeoutRef.current !== null) {
      clearTimeout(snapTimeoutRef.current)
      snapTimeoutRef.current = null
    }
    pendingSnapRef.current = null
    flushSync(() => {
      setIsSnapping(false)
      setModeIndex(modeIndex + pending.modeDelta)
    })
    applyTranslate(initialTranslateRef.current)
  }

  function onPointerDown(e: React.PointerEvent) {
    finalizePendingSnap()
    gestureStartRef.current = { x: e.clientX, y: e.clientY, time: performance.now() }
    isHorizontalSwipeRef.current = false
    setIsSnapping(false)
    const startRootPc = currentModeRootPc
    const startY = e.clientY
    longPressTimerRef.current = window.setTimeout(() => {
      dragModeRef.current = { startY, startRootPc, lastSemitones: 0 }
      setIsDragTransposing(true)
      longPressTimerRef.current = null
    }, LONG_PRESS_MS)
  }

  function onPointerMove(e: React.PointerEvent) {
    const start = gestureStartRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y

    // Once the long-press has armed transpose mode, ignore everything except vertical delta.
    const drag = dragModeRef.current
    if (drag) {
      e.currentTarget.setPointerCapture(e.pointerId)
      const semitones = -Math.round((e.clientY - drag.startY) / SEMITONE_PIXELS)
      if (semitones !== drag.lastSemitones) {
        drag.lastSemitones = semitones
        setKey(((drag.startRootPc + semitones) % 12 + 12) % 12)
      }
      return
    }

    // Pre-arm phase: any non-trivial motion cancels the long-press timer.
    if (longPressTimerRef.current !== null &&
        (Math.abs(dx) > LONG_PRESS_CANCEL_PX || Math.abs(dy) > LONG_PRESS_CANCEL_PX)) {
      clearLongPress()
    }

    if (!isHorizontalSwipeRef.current &&
        Math.abs(dx) > SWIPE_AXIS_LOCK_PX &&
        Math.abs(dx) > Math.abs(dy)) {
      e.currentTarget.setPointerCapture(e.pointerId)
      isHorizontalSwipeRef.current = true
    }

    if (isHorizontalSwipeRef.current) {
      applyTranslate(initialTranslateRef.current + dx)
    }
  }

  function animateBackToAnchor() {
    setIsSnapping(true)
    applyTranslate(initialTranslateRef.current)
    if (snapTimeoutRef.current !== null) clearTimeout(snapTimeoutRef.current)
    snapTimeoutRef.current = window.setTimeout(() => {
      setIsSnapping(false)
      snapTimeoutRef.current = null
    }, SNAP_TRANSITION_MS)
  }

  function onPointerUp(e: React.PointerEvent) {
    const start = gestureStartRef.current
    gestureStartRef.current = null
    clearLongPress()

    if (dragModeRef.current) {
      dragModeRef.current = null
      setIsDragTransposing(false)
      suppressClickRef.current = true
      return
    }

    if (!start) return
    if (!isHorizontalSwipeRef.current) return

    const dx = e.clientX - start.x
    const slotPitch = slotPitchRef.current
    if (slotPitch <= 0) {
      isHorizontalSwipeRef.current = false
      animateBackToAnchor()
      return
    }

    // Translate the drag pixels into semitones of root shift. Drag-LEFT (dx<0) means
    // the track moved left, so what was at slot +k is now at slot 0 — the new root is
    // k semitones above the current one. Hence the sign flip.
    const desiredShift = -Math.round(dx / slotPitch)
    const { delta: modeDelta, shift: validShift } = findClosestModeShift(
      currentFamily.intervals,
      modeIndex,
      desiredShift,
    )
    isHorizontalSwipeRef.current = false

    if (modeDelta === 0) {
      animateBackToAnchor()
      return
    }

    suppressClickRef.current = true

    // Snap target: translate the track to where the new root visually sits at slot 0.
    // Because the track is rotation-invariant (3 identical cycles), the new mode at
    // anchor renders identically to the old mode at this offset — so resetting the
    // translate to anchor after committing the mode change is seamless.
    pendingSnapRef.current = { modeDelta }
    setIsSnapping(true)
    applyTranslate(initialTranslateRef.current - validShift * slotPitch)
    snapTimeoutRef.current = window.setTimeout(() => {
      snapTimeoutRef.current = null
      const pending = pendingSnapRef.current
      if (!pending) return
      pendingSnapRef.current = null
      flushSync(() => {
        setIsSnapping(false)
        setModeIndex(modeIndex + pending.modeDelta)
      })
      const t = trackRef.current
      if (t) t.style.transform = `translateX(${initialTranslateRef.current}px)`
    }, SNAP_TRANSITION_MS)
  }

  function onPointerCancel() {
    gestureStartRef.current = null
    clearLongPress()
    if (dragModeRef.current) {
      dragModeRef.current = null
      setIsDragTransposing(false)
    }
    if (isHorizontalSwipeRef.current) {
      isHorizontalSwipeRef.current = false
      animateBackToAnchor()
    }
  }

  function onClickCapture(e: React.MouseEvent) {
    if (suppressClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressClickRef.current = false
    }
  }

  const romans = computeRomans(currentModeNotes)

  function handleTileTap(pc: number, isRoot: boolean) {
    if (selectedNotePc === pc) {
      setSelectedNote(null)
    } else {
      setSelectedNote(pc)
      if (selectedChordIndex !== null) setSelectedChord(null)
      if (isRoot) playScale()
      else playNote(pc)
    }
  }

  // Build the 36-slot carousel. Each slot is a chromatic position relative to the
  // current modeRootPc; scale tones get full styling, non-scale tones become dotted
  // ghosts. Only the middle (primary) cycle is interactive — side cycles are visual
  // fillers for the rotation.
  const carouselSlots = useMemo(() => {
    const out = []
    for (let i = 0; i < CAROUSEL_TILE_COUNT; i++) {
      const chromOffset = i % CYCLE_SIZE
      const pc = wrap(currentModeRootPc + chromOffset, 12)
      const scaleIdx = currentModeNotes.indexOf(pc)
      const isScaleTone = scaleIdx !== -1
      const isPrimary = i >= CAROUSEL_PRIMARY_OFFSET && i < CAROUSEL_PRIMARY_OFFSET + CYCLE_SIZE
      const isRoot = isPrimary && chromOffset === 0
      const name = isScaleTone ? currentScale.spelled[scaleIdx] : pcName(pc, enharmonicPrefs)
      const roman = isScaleTone ? romans[scaleIdx] : ''
      out.push({ i, pc, name, roman, isScaleTone, isPrimary, isRoot })
    }
    return out
  }, [currentModeNotes, currentModeRootPc, currentScale, enharmonicPrefs, romans])

  const annotation = modeIndex === 0
    ? `Mode 1: ${currentMode.name} — root mode of the ${currentFamily.name} family.`
    : `Mode ${modeIndex + 1}: ${currentMode.name}. Same ${currentFamily.name} notes — tonal center shifts.`

  return (
    <div
      className={[styles.strip, isDragTransposing ? styles.transposing : ''].join(' ').trim()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
    >
      <div ref={viewportRef} className={styles.viewport}>
        <div
          ref={trackRef}
          className={[styles.carouselTrack, isSnapping ? styles.snapping : ''].join(' ').trim()}
        >
          {carouselTileWidth > 0 && carouselSlots.map(({ i, pc, name, roman, isScaleTone, isPrimary, isRoot }) => {
            const isSelected = isPrimary && isScaleTone && selectedNotePc === pc
            const widthStyle: React.CSSProperties = isScaleTone
              ? { width: `${carouselTileWidth}px`, '--pc-color': pcColorVar(pc) } as React.CSSProperties
              : { width: `${carouselTileWidth}px` }

            if (isPrimary && isScaleTone) {
              return (
                <button
                  key={i}
                  className={[
                    styles.carouselTile,
                    isRoot ? styles.carouselTileRoot : '',
                    isSelected ? styles.carouselTileSelected : '',
                  ].join(' ').trim()}
                  style={widthStyle}
                  aria-label={`${name}, ${roman}`}
                  aria-pressed={isSelected}
                  onClick={() => handleTileTap(pc, isRoot)}
                >
                  <span className={styles.roman}>{roman}</span>
                  <span className={styles.noteName}>{name}</span>
                  <span className={styles.colorBar} />
                </button>
              )
            }

            // Primary-cycle ghost (chromatic non-scale tone) — dotted, no interaction.
            if (isPrimary) {
              return (
                <div
                  key={i}
                  className={styles.carouselGhostTile}
                  style={widthStyle}
                  aria-hidden="true"
                >
                  <span className={styles.inactiveName}>{name}</span>
                </div>
              )
            }

            // Side-cycle copy — same look as primary but muted, no interaction.
            return (
              <div
                key={i}
                className={[
                  isScaleTone ? styles.carouselTile : styles.carouselGhostTile,
                  styles.carouselTileMuted,
                ].join(' ').trim()}
                style={widthStyle}
                aria-hidden="true"
              >
                {isScaleTone ? (
                  <>
                    <span className={styles.roman}>{roman}</span>
                    <span className={styles.noteName}>{name}</span>
                    <span className={styles.colorBar} />
                  </>
                ) : (
                  <span className={styles.inactiveName}>{name}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className={styles.annotation}>{annotation}</p>
    </div>
  )
}
