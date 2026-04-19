# Current Task: ScaleNavigator Redesign + Chromatic ScaleStrip

**Branch:** `feature/scale-navigator`
**Status:** In progress — theory layer and basic ScaleNavigator are built; full redesign per spec below is NOT YET DONE.

Read `CLAUDE.md` and `BACKLOG.md` before starting.

---

## What already exists on this branch

### Already merged theory additions (`src/theory/index.ts`)
- `SCALE_FAMILIES` constant — 5 families × 7 modes. **BUT** the `ScaleMode` interface is missing `lcdName`. The spec below requires adding it.
- `getModeIntervals(family, modeIndex): number[]` — rotates interval array, returns pitch-class offsets ✓
- `computeDisplayScaleFromFamily(...)` — family-aware scale computation ✓
- `GLOBAL_BRIGHTNESS_ORDER` — exported as `BrightnessEntry[]` ✓
- `getModeRootOffset` and `getModeNotes` are **NOT YET ADDED**
- `BRIGHTNESS_ORDER` (the spec's name) is **NOT YET ADDED** (currently named `GLOBAL_BRIGHTNESS_ORDER`)

### Already in store (`src/store/index.ts`)
- `familyId: string` and `familyModeIndex: number` fields exist
- `setFamily(id: string)`, `setFamilyModeIndex(index)`, `setModeByBrightness(delta)` exist
- **BUT** the spec uses `familyIndex: number` (not `familyId: string`) and `modeIndex: number`
- `setModeByTension` is **NOT YET ADDED**
- Derived values (`currentFamily`, `currentMode`, `currentTension`, `currentBrightnessPosition`, `currentModeRootPc`, `currentModeNotes`, `currentModeIntervals`) are **NOT YET ADDED**

### Already in place
- `src/components/ScaleNavigator/` — basic drum UI exists but **must be completely replaced**
- `src/components/ScaleStrip/` — 7-tile diatonic strip; **must be replaced** with chromatic 12-position strip
- `src/App.tsx` — already has `<ScaleNavigator />` above `<ScaleStrip />`

---

## Full Task Spec

### Section 1 — Theory layer additions (`src/theory/index.ts`)

Update `ScaleMode` interface to add `lcdName`:

```ts
export interface ScaleMode {
  name: string;
  lcdName: string;   // max 7 chars, uppercase, for the LCD display
  brightness: number; // 0–100
}
```

Replace the existing `SCALE_FAMILIES` constant with this updated version (adds `lcdName` to every mode):

```ts
export const SCALE_FAMILIES: ScaleFamily[] = [
  {
    id: 'major', name: 'Major', tension: 0,
    intervals: [2,2,1,2,2,2,1],
    modes: [
      { name:'Ionian',      lcdName:'IONIAN',  brightness:60 },
      { name:'Dorian',      lcdName:'DORIAN',  brightness:43 },
      { name:'Phrygian',    lcdName:'PHRYG',   brightness:28 },
      { name:'Lydian',      lcdName:'LYDIAN',  brightness:75 },
      { name:'Mixolydian',  lcdName:'MIXOLYD', brightness:52 },
      { name:'Aeolian',     lcdName:'AEOLIAN', brightness:36 },
      { name:'Locrian',     lcdName:'LOCRIAN', brightness:12 },
    ],
  },
  {
    id: 'melodic-minor', name: 'Melodic Minor', tension: 0,
    intervals: [2,1,2,2,2,2,1],
    modes: [
      { name:'Melodic Minor',    lcdName:'MEL MIN', brightness:48 },
      { name:'Dorian \u266d2',   lcdName:'DOR b2',  brightness:33 },
      { name:'Lydian Aug.',      lcdName:'LYD AUG', brightness:82 },
      { name:'Lydian Dom.',      lcdName:'LYD DOM', brightness:68 },
      { name:'Mixolydian \u266d6', lcdName:'MIX b6', brightness:50 },
      { name:'Locrian \u266f2',  lcdName:'LOC #2',  brightness:22 },
      { name:'Altered',          lcdName:'ALTERED', brightness:6  },
    ],
  },
  {
    id: 'harmonic-minor', name: 'Harmonic Minor', tension: 1,
    intervals: [2,1,2,2,1,3,1],
    modes: [
      { name:'Harmonic Minor',   lcdName:'HRM MIN', brightness:40 },
      { name:'Locrian \u266f6',  lcdName:'LOC #6',  brightness:18 },
      { name:'Ionian \u266f5',   lcdName:'ION #5',  brightness:64 },
      { name:'Dorian \u266f4',   lcdName:'DOR #4',  brightness:46 },
      { name:'Phrygian Dom.',    lcdName:'PHRYG D', brightness:34 },
      { name:'Lydian \u266f2',   lcdName:'LYD #2',  brightness:72 },
      { name:'Alt. Diminished',  lcdName:'ALT DIM', brightness:8  },
    ],
  },
  {
    id: 'harmonic-major', name: 'Harmonic Major', tension: 1,
    intervals: [2,2,1,2,1,3,1],
    modes: [
      { name:'Harmonic Major',        lcdName:'HRM MAJ', brightness:57 },
      { name:'Dorian \u266d5',        lcdName:'DOR b5',  brightness:38 },
      { name:'Phrygian \u266d4',      lcdName:'PHR b4',  brightness:23 },
      { name:'Lydian \u266d3',        lcdName:'LYD b3',  brightness:66 },
      { name:'Mixolydian \u266d2',    lcdName:'MIX b2',  brightness:47 },
      { name:'Lydian Aug. \u266f2',   lcdName:'LA #2',   brightness:80 },
      { name:'Locrian \u266d\u266d7', lcdName:'LOC bb7', brightness:13 },
    ],
  },
  {
    id: 'double-harmonic', name: 'Double Harmonic', tension: 2,
    intervals: [1,3,1,2,1,3,1],
    modes: [
      { name:'Double Harmonic',        lcdName:'DBL HRM', brightness:44 },
      { name:'Lydian \u266f2 \u266f6', lcdName:'LY#2#6',  brightness:78 },
      { name:'Ultraphrygian',          lcdName:'UPHRYG',  brightness:19 },
      { name:'Hungarian Minor',        lcdName:'HUNG',    brightness:37 },
      { name:'Oriental',               lcdName:'ORIENT',  brightness:41 },
      { name:'Ionian Aug. \u266f2',    lcdName:'ION A#2', brightness:65 },
      { name:'Locrian \u266d\u266d3',  lcdName:'LC bb3',  brightness:7  },
    ],
  },
];
```

Add these pure helper functions:

```ts
// Returns semitone offset of mode root from family root
export function getModeRootOffset(family: ScaleFamily, modeIndex: number): number {
  return family.intervals.slice(0, modeIndex).reduce((s, v) => s + v, 0);
}

// Returns pitch classes for all 7 notes of the mode
export function getModeNotes(rootPc: number, family: ScaleFamily, modeIndex: number): number[] {
  const iv = getModeIntervals(family, modeIndex);
  const notes = [rootPc];
  let p = rootPc;
  for (let i = 0; i < 6; i++) {
    p = (p + iv[i]) % 12;
    notes.push(p);
  }
  return notes;
}

// All 35 modes sorted by brightness ascending (darkest = index 0)
// Named BRIGHTNESS_ORDER (the existing GLOBAL_BRIGHTNESS_ORDER can remain as alias)
export const BRIGHTNESS_ORDER: Array<{ familyIndex: number; modeIndex: number; brightness: number }> =
  SCALE_FAMILIES.flatMap((f, fi) =>
    f.modes.map((m, mi) => ({ familyIndex: fi, modeIndex: mi, brightness: m.brightness }))
  ).sort((a, b) => a.brightness - b.brightness);
```

Note: keep `GLOBAL_BRIGHTNESS_ORDER` as-is (it uses `familyId` string keys, still referenced by the old store). `BRIGHTNESS_ORDER` uses numeric `familyIndex`. Both can coexist.

---

### Section 2 — Store additions (`src/store/index.ts`)

Add to state (alongside the existing `familyId`/`familyModeIndex` which can remain for backward compat):

```ts
familyIndex: number;   // index into SCALE_FAMILIES, default 0
modeIndex: number;     // 0–6 within current family, default 0
```

Keep `familyId` / `familyModeIndex` but derive them from `familyIndex` / `modeIndex` so HarmonyGrid doesn't break. Add a comment that `familyId`/`familyModeIndex` are deprecated aliases.

Add these derived values to the store state (computed and stored on every change):

```ts
currentFamily: ScaleFamily        // SCALE_FAMILIES[familyIndex]
currentMode: ScaleMode            // currentFamily.modes[modeIndex]
currentTension: 0 | 1 | 2        // currentFamily.tension
currentBrightnessPosition: number // index in BRIGHTNESS_ORDER
currentModeRootPc: number         // (rootPc + getModeRootOffset(family, modeIndex)) % 12
currentModeNotes: number[]        // getModeNotes(rootPc, family, modeIndex)
currentModeIntervals: number[]    // getModeIntervals(family, modeIndex)
```

Add/update these actions:

```ts
// setKey already exists — no change needed
// setFamily: update to accept index (number), keep old string overload if needed
setFamily(familyIndex: number): void   // preserves audible tonal center

// setModeIndex: replaces setFamilyModeIndex, wraps mod 7
setModeIndex(modeIndex: number): void

// setModeByBrightness: update to use BRIGHTNESS_ORDER position (absolute, not delta)
setModeByBrightness(position: number): void

// NEW: finds mode in target tension group closest in brightness to current
setModeByTension(tension: 0 | 1 | 2): void
```

`setFamily` must preserve the audible tonal center:
- modeRootPc = (currentKeyPc + getModeRootOffset(currentFamily, modeIndex)) % 12
- After switching family, set rootPc so that (rootPc + getModeRootOffset(newFamily, 0)) % 12 === modeRootPc

`setModeByTension` logic:
- Find current brightness score
- Find all modes in the target tension group
- Pick the one whose brightness is closest to current
- Preserve audible tonal center (same modeRootPc adjustment as setFamily)

---

### Section 3 — ScaleNavigator component (complete rewrite)

**File:** `src/components/ScaleNavigator/ScaleNavigator.tsx` (rename from `index.tsx` or keep as `index.tsx`)
**CSS:** `src/components/ScaleNavigator/ScaleNavigator.module.css`

#### 3a — Overall layout

Two regions side by side inside a dark panel, plus note row and annotation below:

```
┌─────────────────────────────────────────────────────────────────┐
│  LOGICAL ↺ (label)          │  EXPLORATORY (label)              │
│  [Root knob][Family knob][Mode knob]  │  [Brightness slider]    │
│                              │  [Tension slider + hint]          │
└─────────────────────────────────────────────────────────────────┘
  [● C ● D ● E ● F ● G ● A ● B]   ← note pills with H/W/aug labels
  Annotation line text (italic, 11px)
```

Panel CSS:
- `background: #0e1538`
- `border-radius: 14px`
- `border: 0.5px solid #1e2a58`
- `padding: 18px 20px 20px`
- Inner layout: `display: flex; gap: 16px`

Left region (flex: 3): labeled "LOGICAL ↺" in 9px `#6070a0` uppercase
Right region (flex: 2): labeled "EXPLORATORY" in 9px `#6070a0` uppercase

Note row and annotation live **outside** the dark panel, in the normal app surface.

#### 3b — Knob units

Each knob unit: vertical flex column, centered, containing:
1. SVG knob 72×72
2. LCD display box
3. Small label below (10px, `#8090c0`, uppercase, letter-spacing 0.1em)

**SVG knob** — implement as `drawKnob(step, total)`:
- cx=36, cy=36
- Tick marks at radius 26–32 (6px long), one per selectable position
- Positions: angle = -135 + (i / (total-1)) * 270 degrees (from 12 o'clock)
- Non-current ticks: `stroke: #1e2858`, stroke-width 1.5, round caps
- Current tick only: `stroke: #6670e8`, stroke-width 3
- Knob body: `circle r=22, fill: #1a2350`
- Inner ring: `circle r=21, fill: none, stroke: #2e3a70, stroke-width: 0.5`
- Center dot: `circle r=3, fill: #0e1538`
- Indicator line: center → r=18 at current angle, `stroke: #6670e8`, stroke-width 2, round cap
- Indicator dot: `circle r=2.5` at end of line, `fill: #9098f8`

**LCD display box:**
- `background: #080e28`
- `border: 1px solid #1e2a58`
- `border-radius: 4px; padding: 5px 6px; width: 100%`
- `font-family: 'Courier New', Courier, monospace`
- `font-size: 11px; font-weight: bold; letter-spacing: 0.07em`
- `color: #ffffff; text-align: center; min-height: 26px`

**Three knobs:**

Root knob: total=12, step=currentKeyPc, LCD=note name (use enharmonic pref), onChange→`setKey(newPc)`

Family knob: total=5, step=familyIndex, LCD=family LCD name:
- major → "MAJOR"
- melodic-minor → "MEL MIN"
- harmonic-minor → "HRM MIN"
- harmonic-major → "HRM MAJ"
- double-harmonic → "DBL HRM"
onChange → `setFamily(newIndex)`

Mode knob: total=7, step=modeIndex, LCD=`currentMode.lcdName`, onChange→`setModeIndex(newIndex)` (circular)

#### 3c — Knob interactions (pointer events, works on mouse + touch)

```ts
const DRAG_THRESHOLD_PX = 22  // declare at top of file

// onPointerDown:
//   record clientY as dragStartY, current value as dragStartValue
//   set dragged = false
//   call e.setPointerCapture(e.pointerId)
//   call e.preventDefault() only while actively dragging (not on pointerdown itself)

// onPointerMove:
//   if dragStartY === null, return
//   delta = dragStartY - clientY  (up = increase)
//   if |delta| > 4, set dragged = true
//   steps = Math.round(delta / DRAG_THRESHOLD_PX)
//   newValue = ((dragStartValue + steps) % total + total) % total
//   if newValue !== currentValue, call onChange(newValue)

// onPointerUp:
//   if !dragged: call openPicker(type)
//   reset dragStartY, dragStartValue, dragged
```

#### 3d — Tap picker (shared popover)

One shared popover element, repositioned per knob tap.
Anchor: below the tapped knob, left-aligned to it.
Use `getBoundingClientRect()` relative to ScaleNavigator container.

Popover CSS:
- `background: #111a40`
- `border: 0.5px solid #2e3870`
- `border-radius: 10px; padding: 4px 0`
- `position: absolute; z-index: 20; min-width: 150px`

Each row:
- `padding: 9px 14px; font-size: 12px`
- Default: `color: #7080b8`
- Current: `color: #ffffff; font-weight: 500`
- Hover: `background: #1a2450; color: #c0cce8`
- Mode picker only: 3px-tall brightness bar on right, `width = mode.brightness * 0.35px`, `background: #6670e8`, `opacity: 0.6`. **Do NOT show the raw number.**

Close: selecting an item closes + applies. Clicking outside closes.

#### 3e — Exploratory sliders

Each slider:
- Label: 10px, `#8090c0`, uppercase, letter-spacing 0.1em, margin-bottom 7px
- Track height: 3px
- Track fill: CSS custom property `--pct` updated on every `input` event:
  `pct = ((value - min) / (max - min) * 100).toFixed(1) + '%'`
  Filled portion `#6670e8`, empty portion `#1e2858`
- Thumb: 16px circle, `background: #6670e8`, `border: 2px solid #9098f0`
- Endpoint labels: 9px, `#5060a0`, space-between below the slider

**Brightness slider:** min=0, max=34, step=1
- Value = `currentBrightnessPosition` from store (do NOT use local state)
- onChange → `setModeByBrightness(value)`
- Labels: "darker" / "brighter"

**Tension slider:** min=0, max=2, step=1
- Value = `currentTension` from store
- onChange → `setModeByTension(value)`
- Labels: "smoother" / "crunchier"
- Below tension slider — hint text (10px, `#6070a0`, italic):
  - 0: "Fully diatonic — no augmented leaps."
  - 1: "One augmented 2nd — the exotic leap that defines Harmonic Minor and Phrygian Dominant."
  - 2: "Two augmented 2nds — the Double Harmonic universe. Intensely colorful."

#### 3f — Note display row (below dark panel)

Seven note pills with interval labels between them.

Root pill: 30px circle, `background: #0c1020` (text-primary), `color: #ffffff`, 10px, font-weight 500
Other pills: 30px circle, `background: #ffffff`, `border: 0.5px solid #d9def2`, `color: #0c1020`, 10px, font-weight 500

Interval label between each consecutive pair:
- `font-family: monospace; font-size: 8px`
- 1 semitone → "H", color `#7c86ac`
- 2 semitones → "W", color `#7c86ac`
- 3 semitones → "aug", color `#c07820`, font-weight 700, font-size 9px

Use `currentModeNotes` from store for pitch classes.
Use enharmonic preference for note name spelling.

#### 3g — Annotation line (below note row)

`font-size: 11px; font-style: italic; color: #7c86ac; min-height: 16px`

Initial: "Select any control to explore."

Templates (update on interaction, use local `useState` for this string):
- Root change: `"Root → Bb. Transposed down a half-step."`
- Family change: `"Family → Harmonic Minor. One augmented 2nd."`
- Mode change: `"Mode 5: Phrygian Dominant. Same Harmonic Minor notes — tonal center shifts to E."`
- Brightness: `"Brightness → Lydian Augmented (Melodic Minor)."`
- Tension add: `"Added an aug. 2nd → Harmonic Minor (nearest brightness match)."`
- Tension remove: `"Removed an aug. 2nd → Dorian (Major)."`

---

### Section 4 — Chromatic ScaleStrip (complete rewrite)

**File:** `src/components/ScaleStrip/index.tsx`
**CSS:** `src/components/ScaleStrip/ScaleStrip.module.css`

All 12 chromatic positions shown. Active scale tones are full-height tiles; inactive chromatic positions are reduced grey tiles. Tile horizontal center is proportional to semitone distance from the mode root.

**Container:** `position: relative; height: 88px; overflow: hidden; width: 100%`
All tiles: `position: absolute`, centered at `(semitoneFromRoot / 12) * containerWidth`

**Active tile (scale tone):**
- `width: 52px; height: 72px`
- `background: #ffffff; border: 0.5px solid #d9def2; border-radius: 10px`
- Contents (top to bottom):
  - Roman numeral: 10px, `#7c86ac`, top 6px, centered
  - Note name: 14px, font-weight 500, vertically centered
  - Color bar: 4px tall, full width, bottom, `border-radius: 0 0 10px 10px`, background from `pcColorVar(pc)`
- Root tile: additionally apply `border: 2px solid var(--pc-color)` using root's pc color

**Inactive tile (chromatic non-scale tone):**
- `width: 32px; height: 44px`
- `background: transparent; no border`
- Vertically centered in 88px container (`top: 22px`)
- Note name: 11px, `#7c86ac`, centered
- No color bar, no Roman numeral

**Aug 2nd bracket:**
When two consecutive active scale tones have 3 semitones between them:
- `position: absolute; top: 2px`
- `left`: right edge of first active tile
- `width`: left edge of second active tile - right edge of first
- `border-top: 2px solid #c07820` (warning color)
- `border-left: 2px solid #c07820`
- `border-right: 2px solid #c07820`
- `border-radius: 2px 2px 0 0; height: 6px`

Use `currentModeNotes` from store for which 7 pitch classes are active.
Use `currentModeRootPc` as the root for semitone-distance calculations.
Use enharmonic preference for all tile names.
Use `computeRomans(currentModeNotes)` for roman numerals.

Preserve existing tap-to-select behavior (play note/scale on tap).
Swipe/drag gesture: add `onPointerDown/Move/Up` on the container to change key.

---

### Section 5 — Integration

`src/App.tsx` already has `<ScaleNavigator />` above `<ScaleStrip />` — no change needed.
Do NOT modify HarmonyGrid, KeyboardVisualizer, FretboardVisualizer, audio engine, or useAudio hook.

---

### Section 6 — Validation checklist

1. `npx tsc --noEmit` passes zero errors
2. Knob drag works on desktop mouse and mobile touch
3. Drag up increases value, drag down decreases, all three knobs wrap circularly
4. Tap (no drag) opens picker popover; clicking outside closes it
5. Brightness and tension sliders update immediately when any knob changes
6. Aug interval labels ("aug") appear in note row for Harmonic Minor, Harmonic Major, Double Harmonic; absent for Major and Melodic Minor
7. Aug 2nd bracket appears in chromatic strip for tension > 0 families; absent for tension 0
8. Changing family preserves the audible tonal center pitch class
9. Changing mode does NOT change any pitch — only the tonal center shifts within the same note set
10. HarmonyGrid still renders correctly for all 5 families
11. Swipe gesture on ScaleStrip still changes key

---

### BACKLOG updates when done

Check off in BACKLOG.md:
```
[x] ScaleNavigator — analog knob controls with hold-drag and tap picker, brightness + tension sliders
[x] Chromatic ScaleStrip — proportional 12-position layout with active/inactive tiles and aug 2nd bracket
```

Add under Bugs/Polish:
```
[ ] ScaleStrip — animate tile transitions when family or mode changes
[ ] ScaleNavigator — haptic feedback on knob step (where supported)
```

Delete `TASK.md` from the project root once the PR is merged.
