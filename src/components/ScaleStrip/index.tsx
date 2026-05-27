// ScaleStrip — chromatic 12-position rotating carousel.
// Each cycle holds 12 chromatic slots. In portrait, the 7 scale-tone slots are
// wide enough to meet the 44pt touch-target minimum and the 5 non-scale slots
// collapse into narrow dotted spacers; in landscape the viewport is wide enough
// that every slot can be full-size, so the dashed-bordered ghost tiles return.
// Three cycles are rendered so a tile sliding off one edge is immediately
// replaced by its rotated copy from the opposite side.
//
// Gestures:
//   • Horizontal drag rotates the mode within the current family (same notes,
//     new tonal center). On release we snap to the scale tone whose center is
//     closest to the carousel anchor.
//   • Vertical drag transposes the root chromatically. The dominant axis is
//     detected from the first ~8 px of motion — no long-press required.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTonalStore } from '../../store/index'
import { useAudio } from '../../hooks/useAudio'
import { biasFromSpelling, computeRomans, pcColorVar, pcNameWithBias, wrap } from '../../theory/index'
import styles from './ScaleStrip.module.css'

const AXIS_LOCK_PX = 8
const SNAP_TRANSITION_MS = 260
const SEMITONE_PIXELS = 24

// Carousel layout
const CYCLE_SIZE = 12                                   // semitone slots per cycle
const CAROUSEL_CYCLES = 3                               // pre-render 3 cycles so wrap-around is seamless
const CAROUSEL_TILE_COUNT = CAROUSEL_CYCLES * CYCLE_SIZE // 36
const CAROUSEL_PRIMARY_OFFSET = CYCLE_SIZE              // primary cycle starts at slot index 12
const CAROUSEL_GAP_PX = 2

// Variable-width layout: scale-tone slots aim for the 44pt touch-target minimum
// (Apple HIG, see docs/architecture.md), non-scale slots collapse into thin dotted
// separators. Together with the gaps these must sum to exactly the viewport width
// so the carousel's 3-cycle wrap-around stays seamless.
//
// The ghost slot width is chosen responsively so scale tiles hit the 44pt target
// on a 375pt-wide viewport and above; on narrower devices the ghost width is
// floored and scale tiles fall slightly short — acceptable degradation.
const SCALE_TONE_TARGET_PX = 44
const GHOST_SLOT_MIN_PX = 4
const GHOST_SLOT_MAX_PX = 10

type Axis = 'horizontal' | 'vertical'

// Cycle layout: per-chromatic-offset left edge and width inside one cycle.
type CycleLayout = {
  leftWithinCycle: number[]   // length 12
  widthWithinCycle: number[]  // length 12
  cycleWidth: number
}

function buildCycleLayout(
  scaleToneOffsets: readonly number[],
  viewportWidth: number,
  isLandscape: boolean,
): CycleLayout {
  const totalGaps = (CYCLE_SIZE - 1) * CAROUSEL_GAP_PX
  const ghostCount = CYCLE_SIZE - scaleToneOffsets.length
  const scaleCount = scaleToneOffsets.length

  let widthForChromOffset: (c: number) => number

  if (isLandscape) {
    // Landscape: every slot is the same width — restores the pre-#141 look on
    // wider viewports where the 44pt rule isn't a binding constraint.
    const tileW = Math.max(1, (viewportWidth - totalGaps) / CYCLE_SIZE)
    widthForChromOffset = () => tileW
  } else {
    // Portrait: solve for the ghost width that gives scale tiles exactly the
    // 44pt target, then clamp ghosts into [MIN, MAX]. On narrow viewports the
    // clamp forces scale tiles below 44; on wide ones the clamp keeps ghosts
    // visually present.
    const targetGhostW = ghostCount > 0
      ? (viewportWidth - totalGaps - SCALE_TONE_TARGET_PX * scaleCount) / ghostCount
      : 0
    const ghostW = Math.max(GHOST_SLOT_MIN_PX, Math.min(GHOST_SLOT_MAX_PX, targetGhostW))
    const scaleW = Math.max(1, (viewportWidth - totalGaps - ghostCount * ghostW) / scaleCount)
    const scaleToneSet = new Set(scaleToneOffsets)
    widthForChromOffset = (c: number) => (scaleToneSet.has(c) ? scaleW : ghostW)
  }

  const widthWithinCycle: number[] = []
  const leftWithinCycle: number[] = []
  let cursor = 0
  for (let c = 0; c < CYCLE_SIZE; c++) {
    const w = widthForChromOffset(c)
    widthWithinCycle.push(w)
    leftWithinCycle.push(cursor)
    cursor += w + (c < CYCLE_SIZE - 1 ? CAROUSEL_GAP_PX : 0)
  }
  // Include a trailing gap so adjacent cycles in the rendered track tile cleanly
  // (matches the inter-slot gap inside a cycle).
  const cycleWidth = cursor + CAROUSEL_GAP_PX
  return { leftWithinCycle, widthWithinCycle, cycleWidth }
}

// Compute the chromatic offset (semitones from current root) for each mode delta in [-N, +N].
// Returns paired arrays for fast lookup during snap-target search.
function buildModeDeltaTable(
  intervals: readonly number[],
  currentModeIdx: number,
): { deltas: number[]; chromShifts: number[] } {
  const currentOffsetSum = intervals.slice(0, currentModeIdx).reduce((s, v) => s + v, 0)
  const deltas: number[] = []
  const chromShifts: number[] = []
  for (let delta = -intervals.length; delta <= intervals.length; delta++) {
    const wrappedIdx = wrap(currentModeIdx + delta, intervals.length)
    const cyclesAcross = Math.floor((currentModeIdx + delta) / intervals.length)
    const offsetSum = intervals.slice(0, wrappedIdx).reduce((s, v) => s + v, 0) + cyclesAcross * 12
    deltas.push(delta)
    chromShifts.push(offsetSum - currentOffsetSum)
  }
  return { deltas, chromShifts }
}

// Find the mode delta whose target scale-tone is visually closest to where the
// user's drag landed, given the current variable-width cycle layout. We align
// the left edge of the destination slot to viewport X = 0 (the same place the
// current root sits at anchor), so the post-commit reset to anchor is seamless.
function findClosestSnapTarget(
  intervals: readonly number[],
  currentModeIdx: number,
  layout: CycleLayout,
  trackTranslate: number,
  anchorTranslate: number,
): { delta: number; snapTranslate: number } {
  const primaryCycleStart = -anchorTranslate
  const { deltas, chromShifts } = buildModeDeltaTable(intervals, currentModeIdx)
  let best = { delta: 0, snapTranslate: anchorTranslate, dist: Infinity }
  for (let i = 0; i < deltas.length; i++) {
    const c = chromShifts[i]
    const cyclesAcross = Math.floor(c / 12)
    const cIn = c - cyclesAcross * 12
    const targetLeftTrackX = primaryCycleStart + cyclesAcross * layout.cycleWidth + layout.leftWithinCycle[cIn]
    const snapTranslate = -targetLeftTrackX
    const dist = Math.abs(snapTranslate - trackTranslate)
    if (dist < best.dist) best = { delta: deltas[i], snapTranslate, dist }
  }
  return best
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
  const gestureStartRef = useRef<{ x: number; y: number } | null>(null)
  const axisRef = useRef<Axis | null>(null)
  const suppressClickRef = useRef(false)
  const dragModeRef = useRef<{ startY: number; startRootPc: number; lastSemitones: number } | null>(null)
  const [isDragTransposing, setIsDragTransposing] = useState(false)
  const [transposeDelta, setTransposeDelta] = useState(0)

  // Horizontal-swipe / track state.
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const initialTranslateRef = useRef(0)
  const snapTimeoutRef = useRef<number | null>(null)
  const pendingSnapRef = useRef<{ modeDelta: number } | null>(null)
  const [isSnapping, setIsSnapping] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches,
  )

  // The mode's scale-tone offsets in chromatic terms relative to the current root.
  // These determine which slots are wide tiles vs narrow ghost spacers.
  const scaleToneOffsets = useMemo(
    () => currentModeNotes.map(pc => wrap(pc - currentModeRootPc, 12)).sort((a, b) => a - b),
    [currentModeNotes, currentModeRootPc],
  )

  const cycleLayout = useMemo(
    () => (viewportWidth > 0 ? buildCycleLayout(scaleToneOffsets, viewportWidth, isLandscape) : null),
    [scaleToneOffsets, viewportWidth, isLandscape],
  )

  // Measure the viewport; the cycle is sized to span exactly one viewport width.
  useLayoutEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const measure = () => {
      const w = vp.offsetWidth
      if (w <= 0) return
      setViewportWidth(w)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(vp)
    return () => ro.disconnect()
  }, [])

  // Track orientation so the carousel can swap between the portrait
  // collapsed-ghost layout and the landscape full-width layout.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(orientation: landscape)')
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Anchor the track so the middle (primary) cycle aligns with the viewport.
  // The track is laid out at translate=0 with cycle 0 at track-X 0, cycle 1
  // (primary) at track-X cycleWidth, cycle 2 at track-X 2*cycleWidth. So an
  // anchor translate of -cycleWidth puts slot 0 of the primary cycle at
  // viewport X = 0.
  useLayoutEffect(() => {
    if (!cycleLayout) return
    const anchor = -cycleLayout.cycleWidth
    initialTranslateRef.current = anchor
    if (trackRef.current && axisRef.current !== 'horizontal' && !pendingSnapRef.current) {
      trackRef.current.style.transform = `translateX(${anchor}px)`
    }
  }, [cycleLayout])

  // External mode/root changes (pickers, knobs, vertical-drag transpose) — reset
  // the carousel to anchor. If a snap is still pending when the change arrives,
  // it came from outside the snap pipeline, so abandon the snap to keep the
  // queued setModeIndex from overwriting the external change with a stale delta.
  useEffect(() => {
    if (pendingSnapRef.current) {
      if (snapTimeoutRef.current !== null) {
        clearTimeout(snapTimeoutRef.current)
        snapTimeoutRef.current = null
      }
      pendingSnapRef.current = null
      setIsSnapping(false)
    }
    if (trackRef.current && axisRef.current !== 'horizontal') {
      trackRef.current.style.transform = `translateX(${initialTranslateRef.current}px)`
    }
  }, [modeIndex, currentModeRootPc])

  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current !== null) clearTimeout(snapTimeoutRef.current)
    }
  }, [])

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
    gestureStartRef.current = { x: e.clientX, y: e.clientY }
    axisRef.current = null
    setIsSnapping(false)
  }

  function onPointerMove(e: React.PointerEvent) {
    const start = gestureStartRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y

    // Once transpose is armed, only vertical delta matters.
    const drag = dragModeRef.current
    if (drag) {
      e.currentTarget.setPointerCapture(e.pointerId)
      const semitones = -Math.round((e.clientY - drag.startY) / SEMITONE_PIXELS)
      if (semitones !== drag.lastSemitones) {
        drag.lastSemitones = semitones
        setKey(((drag.startRootPc + semitones) % 12 + 12) % 12)
        setTransposeDelta(semitones)
      }
      return
    }

    // Dominant-axis detection — once cumulative motion exceeds the lock threshold,
    // commit to whichever axis is currently larger.
    if (axisRef.current === null) {
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (absDx < AXIS_LOCK_PX && absDy < AXIS_LOCK_PX) return
      e.currentTarget.setPointerCapture(e.pointerId)
      if (absDx >= absDy) {
        axisRef.current = 'horizontal'
      } else {
        axisRef.current = 'vertical'
        dragModeRef.current = {
          startY: e.clientY,
          startRootPc: currentModeRootPc,
          lastSemitones: 0,
        }
        setIsDragTransposing(true)
        setTransposeDelta(0)
        return
      }
    }

    if (axisRef.current === 'horizontal') {
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

    if (dragModeRef.current) {
      dragModeRef.current = null
      setIsDragTransposing(false)
      setTransposeDelta(0)
      suppressClickRef.current = true
      axisRef.current = null
      return
    }

    if (!start) return
    if (axisRef.current !== 'horizontal' || !cycleLayout) {
      axisRef.current = null
      return
    }

    const dx = e.clientX - start.x
    const trackTranslate = initialTranslateRef.current + dx
    const { delta: modeDelta, snapTranslate } = findClosestSnapTarget(
      currentFamily.intervals,
      modeIndex,
      cycleLayout,
      trackTranslate,
      initialTranslateRef.current,
    )
    axisRef.current = null

    if (modeDelta === 0) {
      animateBackToAnchor()
      return
    }

    suppressClickRef.current = true

    // Animate the track to the target translate, then commit the mode change and
    // snap back to the anchor (which now renders identically because the new
    // mode rotation places the chosen scale tone at slot 0).
    pendingSnapRef.current = { modeDelta }
    setIsSnapping(true)
    applyTranslate(snapTranslate)
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
    if (dragModeRef.current) {
      dragModeRef.current = null
      setIsDragTransposing(false)
      setTransposeDelta(0)
    }
    if (axisRef.current === 'horizontal') {
      animateBackToAnchor()
    }
    axisRef.current = null
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

  // Build the 36-slot carousel. Slot widths come from the per-mode cycle layout.
  // Ghost names are needed in landscape (rendered as labeled dashed tiles) but
  // not in portrait (collapsed to a dotted spacer); we compute them either way.
  // Ghost tones inherit the scale's accidental bias so they don't visually clash
  // with scale tones (e.g. avoid showing Db alongside D# in the same row).
  const carouselSlots = useMemo(() => {
    const scaleBias = biasFromSpelling(currentScale.spelled)
    const out = []
    for (let i = 0; i < CAROUSEL_TILE_COUNT; i++) {
      const chromOffset = i % CYCLE_SIZE
      const pc = wrap(currentModeRootPc + chromOffset, 12)
      const scaleIdx = currentModeNotes.indexOf(pc)
      const isScaleTone = scaleIdx !== -1
      const isPrimary = i >= CAROUSEL_PRIMARY_OFFSET && i < CAROUSEL_PRIMARY_OFFSET + CYCLE_SIZE
      const isRoot = isPrimary && chromOffset === 0
      const name = isScaleTone
        ? currentScale.spelled[scaleIdx]
        : pcNameWithBias(pc, scaleBias, enharmonicPrefs)
      const roman = isScaleTone ? romans[scaleIdx] : ''
      out.push({ i, chromOffset, pc, name, roman, isScaleTone, isPrimary, isRoot })
    }
    return out
  }, [currentModeNotes, currentModeRootPc, currentScale, enharmonicPrefs, romans])

  const annotation = modeIndex === 0
    ? `Mode 1: ${currentMode.name} — root mode of the ${currentFamily.name} family.`
    : `Mode ${modeIndex + 1}: ${currentMode.name}. Same ${currentFamily.name} notes — tonal center shifts.`

  const transposeLabel = transposeDelta === 0
    ? '±0'
    : `${transposeDelta > 0 ? '+' : '−'}${Math.abs(transposeDelta)} st`

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
          {cycleLayout && carouselSlots.map(({ i, chromOffset, pc, name, roman, isScaleTone, isPrimary, isRoot }) => {
            const isSelected = isPrimary && isScaleTone && selectedNotePc === pc
            const slotWidth = cycleLayout.widthWithinCycle[chromOffset]
            const widthStyle: React.CSSProperties = isScaleTone
              ? { width: `${slotWidth}px`, '--pc-color': pcColorVar(pc) } as React.CSSProperties
              : { width: `${slotWidth}px` }

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

            // Primary-cycle ghost (chromatic non-scale tone) — full dashed
            // tile with note name in landscape, narrow dotted spacer in portrait.
            if (isPrimary) {
              return (
                <div key={i} className={styles.carouselGhostTile} style={widthStyle} aria-hidden="true">
                  {isLandscape
                    ? <span className={styles.inactiveName}>{name}</span>
                    : <span className={styles.ghostMark} />}
                </div>
              )
            }

            // Side-cycle copy — muted scale tile or muted ghost (full or collapsed
            // based on orientation, matching the primary cycle).
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
                ) : isLandscape ? (
                  <span className={styles.inactiveName}>{name}</span>
                ) : (
                  <span className={styles.ghostMark} />
                )}
              </div>
            )
          })}
        </div>
        {isDragTransposing && (
          <div className={styles.transposeDelta} aria-live="polite">{transposeLabel}</div>
        )}
      </div>

      <p className={styles.annotation}>{annotation}</p>
    </div>
  )
}
