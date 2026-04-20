# Tonal Explorer — Backlog

Items are grouped by phase. Within each phase, order is roughly priority/dependency order.
Check off items as they ship. Add new items anywhere — keep description concise.

---

## Legacy Parity Checklist

The original app (`index-legacy.html` + `styles.css` + `script.js`) is the
reference implementation and must remain untouched until the new app reaches full
parity. Open both side by side during testing.

- [ ] Key selector (all 12 keys, enharmonic toggle e.g. C# ↔ Db)
- [x] Mode/scale selector — ScaleNavigator covers all 7 diatonic modes + 4 extra families
- [x] Scale strip — correct note spelling for every key/mode combination
- [ ] Scale strip — swipe/drag gesture to change key (removed as buggy; needs redesign)
- [x] Harmony Grid — 7 rows, correct chord names at triads through 13ths (sus2/sus4/b5 added; exotic fallbacks show root only)
- [x] Harmony Grid — degree header buttons (3 5 7 9 11 13) filter extensions; header click resets per-row overrides
- [x] Harmony Grid — per-row extension: clicking ghost note extends that row; clicking active note reduces to that degree
- [x] Harmony Grid — selecting a chord highlights it and updates the visualizers
- [x] Piano keyboard — scale tones lit, tonic distinguished, chord tones highlighted
- [x] Guitar fretboard — scale tones lit, standard tuning correct across all 12 frets
- [x] Audio — synth plays on note/chord/scale selection
- [x] Audio — volume knob (ScaleNavigator, 6th knob) replaces mute toggle; click=toggle mute/unmute, drag=set volume 0–100%; iOS unlock flow works
- [x] Audio — scale playback (ascending arpeggio)
- [x] Audio — chord playback (arpeggiate then strum)
- [ ] Metronome — start/stop, BPM control, tap tempo, time signature, downbeat accent
- [ ] Chromatic tuner — microphone pitch detection, cents display, needle animation
- [x] Mobile layout — responsive: portrait stacks vertically, landscape uses side-by-side panels
- [x] Mobile layout — touch targets all ≥ 44pt (PR #89): HarmonyGrid columns, picker rows, reset button; LCD displays non-interactive; layout compacted (portrait 12px gaps, landscape 8px, max-width 1100px); keyboard/fretboard equal height in landscape; ScaleStrip flex layout in portrait eliminates tile overlap

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
- [ ] Metronome component (BPM, time signature, tap tempo, downbeat accent)
- [ ] Chromatic Tuner component (autocorrelation pitch detection, guided per-string mode)
- [ ] WheelModal (picker for key / mode / scale type selection)
- [ ] Shareable URLs (encode key + mode + scale type in query params)

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
- [ ] Roman numeral analysis in HarmonyGrid row headers
- [ ] Progression Builder component (4–8 chord slots, drag-to-reorder, loop playback)
- [ ] Common progressions library (I–V–vi–IV, ii–V–I, 12-bar blues, etc.)
- [ ] Parallel / relative mode panel (e.g. show C major ↔ A minor side by side)
- [ ] Theory tooltips (tap interval name to get explanation, e.g. "minor 7th")
- [ ] Chord inversion display option in HarmonyGrid

---

## Phase 4 — Guitar Features

- [ ] Alternative tunings — TuningSelector component:
  - [ ] Preset library (Open G, Open D, Drop D, DADGAD, Open E, Open A, Half-step down, Full-step down, etc.)
  - [ ] Custom tuning editor (tap each string to set note)
  - [ ] String tension warnings: +2 semi = caution, +3 = warning, +4+ = danger
  - [ ] Tension formula: `ratio = 2^(n/6)` where n = semitones above standard
  - [ ] Guided tuning mode in Tuner (reads active `guitarTuning`, shows per-string target)
- [ ] CAGED scale box positions on fretboard
- [ ] Guitar chord voicing suggestions (common fingerings for selected HarmonyGrid chord)
- [ ] Capo support (offset all fretboard display by n frets)

---

## Phase 5 — Ear Training

- [ ] Interval identification mode (play two notes, user identifies the interval)
- [ ] Chord quality identification (play chord, user identifies major / minor / dim / aug / etc.)
- [ ] Scale / mode identification (play ascending scale, user identifies the mode)
- [ ] "Sing back" mode (play note, user matches pitch via microphone)

---

## Phase 6 — iOS App (Capacitor)

- [ ] Install and configure Capacitor (`@capacitor/core`, `@capacitor/ios`)
- [ ] Bottom tab bar navigation (Explore / Practice / Visualize / Tools)
- [ ] Safe area insets (`env(safe-area-inset-*)`) applied throughout
- [ ] 44×44pt minimum touch targets audit (ongoing — enforce during component builds)
- [ ] Dynamic Type support (use `rem` / system font scaling)
- [ ] Web Audio unlock flow for iOS (already in legacy script.js — port to React)
- [ ] App icon + splash screen assets
- [ ] App Store submission prep (privacy manifest, entitlements, metadata)

---

## Bugs / Polish

- [ ] Enharmonic preference persistence (user picks C# vs Db — survives navigation)
- [x] ScaleStrip swipe/drag gesture (horizontal drag changes key)
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
- [ ] Scale strip — swipe/drag gesture redesign (horizontal drag to change key; deferred — 3 options proposed in session, user chose to defer)
- [ ] ScaleStrip — animate tile transitions when family or mode changes
- [ ] ScaleNavigator — haptic feedback on knob step (where supported)
- [ ] Scale strip tile visualization — consider alternatives to the colored underline bar
- [ ] Keyboard accessibility audit (all interactive elements focusable, ARIA labels)
- [x] iOS safe-area insets (`env(safe-area-inset-*)`) applied to header and all layout panels
