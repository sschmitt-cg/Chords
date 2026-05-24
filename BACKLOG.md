# Tonal Explorer — Backlog

Items are grouped by phase. Within each phase, order is roughly priority/dependency order.
Check off items as they ship. Add new items anywhere — keep description concise.

---

## Legacy Parity Checklist

The original app (`index-legacy.html` + `styles.css` + `script.js`) is the
reference implementation and must remain untouched until the new app reaches full
parity. Open both side by side during testing.

- [x] Key selector (all 12 keys, enharmonic toggle e.g. C# ↔ Db) — auto-handled: `computeDisplayScaleFromFamily` picks sharp vs flat by accidental count; diatonic spelling assigns unique letters per degree; no manual toggle needed
- [x] Mode/scale selector — ScaleNavigator covers all 7 diatonic modes + 4 extra families
- [x] Scale strip — correct note spelling for every key/mode combination
- [x] Scale strip — swipe/drag gestures: horizontal swipe rotates tonal center across scale degrees, long-press (~250ms) + vertical drag transposes root chromatically (~24px/semitone)
- [x] Harmony Grid — 7 rows, correct chord names at triads through 13ths (sus2/sus4/b5 added; exotic stacks fall back to closest tertian name + parenthetical 7th, e.g. `Dm(bb7)`, `Adim(bb7)`)
- [x] Harmony Grid — degree header buttons (3 5 7 9 11 13) filter extensions; header click resets per-row overrides
- [x] Harmony Grid — per-row extension: clicking ghost note extends that row; clicking active note reduces to that degree
- [x] Harmony Grid — selecting a chord highlights it and updates the visualizers
- [x] Piano keyboard — scale tones lit, tonic distinguished, chord tones highlighted
- [x] Guitar fretboard — scale tones lit, standard tuning correct across all 12 frets
- [x] Audio — synth plays on note/chord/scale selection
- [x] Audio — volume knob (ScaleNavigator, 6th knob) replaces mute toggle; click=toggle mute/unmute, drag=set volume 0–100%; iOS unlock flow works
- [x] Audio — scale playback (ascending arpeggio)
- [x] Audio — chord playback (arpeggiate then strum)
- [x] Metronome — start/stop, BPM control, tap tempo, time signature, downbeat accent
- [x] Chromatic tuner — microphone pitch detection, cents display, needle animation
- [x] Mobile layout — responsive: portrait stacks vertically, landscape uses side-by-side panels
- [x] Mobile layout — touch targets all ≥ 44pt (PR #89): HarmonyGrid columns, picker rows, reset button; LCD displays non-interactive; layout compacted (portrait 12px gaps, landscape 8px, max-width 1100px); keyboard/fretboard equal height in landscape; ScaleStrip flex layout in portrait eliminates tile overlap
- [x] ScaleNavigator — split into two independent first-class sections: "Key & Mode" (`scale-logical`: ROOT/FAMILY/MODE knobs) and "Scale Explorer" (`scale-exploratory`: BRIGHTNESS/TENSION/VOLUME knobs); each has its own `SectionId`, visibility toggle, and drag-reorder slot in SectionMenu; "Key & Mode" hidden by default on mobile portrait, "Scale Explorer" visible by default

---

## App Store Launch — Active Milestone

All items in this section must be complete before running `npx cap add ios`.
Phase 7 (below) covers the Capacitor build and submission steps that follow.

### Pre-Capacitor Polish

- [x] **Tuner — stability pass:** 5-sample median-hold window (~80ms at 60fps RAF)
  applied to cents readings; buffer resets on note transition (different name+octave)
  or silence so attacks and string changes stay responsive; visible needle/cents
  flutter on held notes is suppressed without lag.
- [x] **Tuner — YIN pitch detection:** replaced unnormalized autocorrelation with the
  YIN algorithm (cumulative-mean-normalized difference function, 0.15 absolute
  threshold, parabolic interpolation around the chosen minimum). Fixes residual
  needle jitter on clean held tones caused by the previous detector picking a
  different correlation peak each frame.
- [x] **ScaleStrip — horizontal swipe to shift mode** — pointer-event gesture on the
  strip rotates the tonal center across scale degrees (same notes, new root).
  Threshold 40px, max 800ms, dominant-axis gate; the synthetic click is swallowed
  when the gesture qualifies as a swipe so tile taps remain reliable.
- [x] **ScaleStrip — vertical drag to transpose root chromatically** — long-press
  (~250ms) arms transpose mode (highlighted with an action-primary outline);
  vertical drag then shifts root by `setKey(startRoot ± semitones)` at ~24px/semitone.
  Horizontal motion ignored once armed; pre-arm motion past 8px cancels and falls
  back to the swipe-or-tap path.
- [ ] **General polish pass:** review all open Bugs/Polish items; decide what ships
  at launch vs. what defers. Minimum bar: nothing broken or visually jarring on an
  iPhone 15 Pro in both orientations.

### Notes on remaining Bugs/Polish items

Some open Bugs/Polish items below are quick wins that should be folded into the
general polish pass before launch. Others (animated tile transitions, haptic
feedback, knob SVG colors) are cosmetic and deferrable. The general polish pass
item above is the gate.

---

## Phase 1 — Core Migration (React + TypeScript)

- [x] Scaffold React + Vite + TypeScript + Zustand project
- [x] Migrate pure theory functions → `src/theory/index.ts`
- [x] Wire Zustand store to recompute scale + harmony rows on key/mode change
- [x] ScaleStrip component (note tiles + key/mode navigation)
- [x] HarmonyGrid component (chord matrix, 7 rows × degree columns)
- [x] KeyboardVisualizer component (piano keys, highlights scale/chord/note)
- [x] FretboardVisualizer component (guitar fretboard, reads `guitarTuning` from store)
- [x] Migrate Web Audio engine → `src/audio/index.ts` + `useAudio` hook
- [x] Metronome component (BPM, time signature, tap tempo, downbeat accent)
- [x] Chromatic Tuner component (autocorrelation pitch detection, guided per-string mode)
- [ ] WheelModal (picker for key / mode / scale type selection) — deprioritized; may be superseded by swipe gestures on ScaleStrip; retain as accessibility fallback candidate
- [x] Shareable URLs (encode key + mode + scale type in query params)
- [x] Randomize button — pick a random root, family, and mode; wires into existing store actions
- [x] Circle of Fifths visualizer — interactive; clicking a wedge drives the full app state (key, relative mode); integrated with the unified store

---

## Phase 2 — Scale Type Expansion

- [x] 5 scale families × 7 modes (35 total) in `SCALE_FAMILIES` — Major, Melodic Minor,
  Harmonic Minor, Harmonic Major, Double Harmonic
- [x] `getModeIntervals`, `computeDisplayScaleFromFamily`, `GLOBAL_BRIGHTNESS_ORDER` in theory layer
- [x] ScaleNavigator component — analog knob controls (circular + bounded wheels), LCD displays, tap picker with brightness sun icons, exploratory brightness + tension wheels
- [x] Store migrated: `scaleType`/`currentModeIndex` → `familyId`/`familyModeIndex`; new actions
  `setFamily`, `setFamilyModeIndex`, `setModeByBrightness`, `setModeByTension`; derived fields `currentFamily`, `currentMode`, `currentTension`, `currentBrightnessPosition`, `currentModeRootPc`, `currentModeNotes`, `currentModeIntervals`
- [x] Chromatic ScaleStrip — proportional 12-position layout, active/inactive tiles same size (52×72px), dotted border for excluded notes, swipe-to-change-key, Roman numerals with chord quality, scale description annotation
- [ ] Pentatonic / blues / whole-tone / diminished scale families (non-7-note with HarmonyGrid fallback)
- [ ] HarmonyGrid graceful fallback for non-7-note scales (show available stacked intervals)
- [ ] "Compatible scales" panel — show other scale types that share the same pitch classes

---

## Phase 3 — Harmony & Theory Features

- [ ] Functional harmony labels on HarmonyGrid rows (T / S / D — Tonic / Subdominant / Dominant)
- [x] Roman numeral analysis shown in ScaleStrip (chord quality: uppercase major, lowercase minor, °dim)
- [x] Roman numeral analysis in HarmonyGrid row headers
- [ ] Progression Builder component (4–8 chord slots, drag-to-reorder, loop playback)
- [ ] Common progressions library (I–V–vi–IV, ii–V–I, 12-bar blues, etc.)
- [ ] Parallel / relative mode panel (e.g. show C major ↔ A minor side by side)
- [ ] Theory tooltips (tap interval name to get explanation, e.g. "minor 7th")
- [x] Chord inversion display — voicing navigator added to KeyboardVisualizer and FretboardVisualizer (prev/next, shows current voicing label)

---

## Phase 4 — Guitar Features

- [ ] Alternative tunings — TuningSelector component:
  - [x] Preset library (Open G, Open D, Drop D, DADGAD, Open E, Open A, Half-step down, Full-step down, etc.)
  - [ ] Custom tuning editor (tap each string to set note)
  - [ ] String tension warnings: +2 semi = caution, +3 = warning, +4+ = danger
  - [ ] Tension formula: `ratio = 2^(n/6)` where n = semitones above standard
  - [ ] Guided tuning mode in Tuner (reads active `guitarTuning`, shows per-string target)
- [ ] CAGED scale box positions on fretboard
- [x] Guitar chord voicing suggestions — `computeGuitarVoicings` in `src/theory/voicings.ts`; curated open shapes for standard tuning + algorithmic layer for all tunings; prev/next navigator in FretboardVisualizer; state in Zustand store (`guitarVoicingIndex`)
- [x] Keyboard chord inversions — `computeKeyboardVoicings` in `src/theory/voicings.ts`; root position + inversions + Drop 2/3 for 7th chords; prev/next navigator in KeyboardVisualizer; state in Zustand store (`keyboardVoicingIndex`)
- [ ] Capo support (offset all fretboard display by n frets)

---

## Phase 5 — Layout Configuration

- [ ] **User-configurable named layouts** — let users save named presets that record which sections
  are visible and how they are arranged for each orientation (portrait vs landscape). Switching
  presets instantly reconfigures the view without requiring manual toggle-and-drag each time.
  Example presets: "Instrument Practice" (keyboard + fretboard + tuner + metronome), "Theory Study"
  (harmony grid + scale strip + circle of fifths), "Compose" (harmony + scale explorer + metronome).
  Design questions to resolve: preset storage (localStorage vs cloud), conflict-resolution when a
  section added in a future update doesn't exist in a saved preset, and a discoverable UI surface
  (bottom sheet, gear panel, or dedicated Layout screen).

---

## Phase 6 — Ear Training

- [ ] Interval identification mode (play two notes, user identifies the interval)
- [ ] Chord quality identification (play chord, user identifies major / minor / dim / aug / etc.)
- [ ] Scale / mode identification (play ascending scale, user identifies the mode)
- [ ] "Sing back" mode (play note, user matches pitch via microphone)

---

## Phase 7 — iOS App (Capacitor)

*Prerequisite: all "App Store Launch — Active Milestone" items above are complete.*

- [ ] Install and configure Capacitor (`@capacitor/core`, `@capacitor/ios`)
- [ ] Bottom tab bar navigation (Explore / Practice / Visualize / Tools)
- [ ] Safe area insets (`env(safe-area-inset-*)`) applied throughout
- [ ] 44×44pt minimum touch targets audit (ongoing — enforce during component builds)
- [ ] Dynamic Type support (use `rem` / system font scaling)
- [ ] Web Audio unlock flow for iOS (already in legacy script.js — port to React)
- [ ] App icon + splash screen assets
- [ ] App Store submission prep (privacy manifest, entitlements, metadata)

---

## Phase 8 — Input Modalities

- [ ] **Web MIDI input** — detect connected MIDI controllers; incoming notes light up
  keyboard, fretboard, and scale strip; simultaneous notes trigger chord detection
- [ ] **Audio pitch detection** — listen via microphone; detect the pitch being played
  and highlight it across visualizers; detect key/scale from a phrase (autocorrelation
  or ML-based); complements the Chromatic Tuner's per-string mode
- [ ] **Chord identifier** — reverse lookup: user places notes on keyboard or fretboard,
  app names the chord and shows its harmonic context in the current key; needs design
  exploration before committing to implementation

---

## CI / Tooling (follow-ups from PR #90)

- [ ] Vitest config uses `/// <reference types="vitest" />` triple-slash pattern (older); migrate to `import type { UserConfig } from 'vitest/config'` when upgrading Vitest
- [ ] `computeRomans` test for non-7-note input tests an undocumented fallback — if the fallback behavior ever changes, this test will give a false signal; revisit when expanding theory test coverage
- [ ] Voicing computation (`computeKeyboardVoicings` / `computeGuitarVoicings`) is recomputed on each chord/tuning/maxDegree change. Fast enough now, but not free. If profiling ever shows it as a bottleneck, consider a `Map` keyed by `(rootPc, quality, maxDegree, tuningSignature)` for memoization.
- [x] Promote React app to root URL; legacy redirect stub at `/v2.html`; in-app User Guide page reachable via info icon in AppHeader

---

## Bugs / Polish

- [x] ScaleStrip — scale description annotation below strip (mode name + family context)
- [x] ScaleStrip active tiles now use diatonic spelling (`currentScale.spelled`) so Cb/E#/B# render correctly instead of falling back to chromatic names
- [x] Fretboard + keyboard visualizers now respect per-row harmony extension overrides (previously only used `globalHarmonyMax`)
- [x] Visual theme — unified blue-tinted color language: `--surface-1` shifted to `#eef0ff`, ScaleNavigator panel lightened to `#1a2660`; all components share same blue palette family
- [x] ScaleStrip active tiles — white background lifts clearly off tinted card surface
- [x] HarmonyGrid — chord cells and note cells use more vivid `color-mix` percentages for clearer pitch-class coloring
- [x] Keyboard — lighter key surface, scale tones 42% and chord tones 68% color-mix; black keys also more vivid
- [x] Fretboard — lighter board surface, nut rendered as distinct 4px dark bar (separate class, no conflict with fretWire), uniform 1px string weight, fret position markers corrected (were off by one fret)
- [x] ScaleNavigator ROOT knob/LCD — now tracks tonal center (modeRootPc) rather than family root; all navigation actions preserve the audible tonic
- [x] ScaleNavigator MODE picker — selecting from popup preserves tonal center; knob drag still shifts root chromatically
- [x] ScaleNavigator pickers — all popups scroll to center the current selection on open
- [x] ScaleStrip — horizontal swipe to shift mode (same scale notes, new root — like sliding along the strip to reframe which note is home; replaces MODE knob on mobile) — shipped: pointer-event gesture, snap-to-closest scale-tone on release; variable-width carousel layout (PR after #141)
- [x] ScaleStrip — vertical drag to transpose root chromatically (all notes move together, intervals preserved — like sliding a capo; replaces ROOT knob on mobile) — shipped: dominant-axis detection arms vertical drag immediately, ~24px/semitone, floating semitone-delta indicator (PR after #141)
- [x] ScaleStrip — mobile gesture & touch-target fixes (#141): vertical drag transposes immediately via dominant-axis detection (no long-press); `touch-action: none` stops page-scroll hijack; scale tiles widened to ≥44pt by collapsing non-scale slots into 10pt dotted spacers; floating "+N st" chip visualizes the half-step movement during drag.
- [x] ScaleNavigator knob labels hidden on desktop — `@media (orientation: landscape)` always fires on desktop (window is always wider than tall); scope to narrow/touch viewports only
- [ ] ScaleStrip — animate tile transitions when family or mode changes
- [x] ScaleNavigator — haptic feedback on knob step (where supported) — `navigator.vibrate(10)` fires on each step crossing in KnobUnit/WheelUnit/VolumeKnobUnit; no-op on devices without the API
- [x] ScaleNavigator — persist navigator group visibility independently of orientation changes — handled by shareable URL encoding app state
- [ ] Scale strip tile visualization — consider alternatives to the colored underline bar
- [x] ScaleNavigator knob SVG colors (accent ticks, indicator dot) use hard-coded hex values — replaced with `--knob-accent`, `--knob-accent-bright`, `--knob-tick-inactive`, `--knob-body`, `--knob-body-border`, `--knob-pivot` tokens defined in `src/index.css`
- [x] Keyboard accessibility audit (all interactive elements focusable, ARIA labels) — modal Escape + focus return (Share popover, ScaleNavigator picker, Tuning modal); LCDs converted to focusable buttons; knobs given `role=slider` with arrow-key support; SectionMenu got @dnd-kit `KeyboardSensor` for keyboard reordering; shared `useDismissable` hook handles Escape + focus restoration
- [x] iOS safe-area insets (`env(safe-area-inset-*)`) applied to header and all layout panels

---

## Maintenance

- [ ] Security audit (last completed: 2026-05-13)
