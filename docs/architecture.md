# Tonal Explorer — Architecture

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| UI framework | React 18 + TypeScript | Type safety, component model, ecosystem |
| Build | Vite | Fast HMR, native ESM, simple config |
| State | Zustand | Lightweight, no boilerplate, works outside React |
| Styling | CSS Modules (`.module.css` per component) | Scoped, no runtime, co-located |
| Audio | Web Audio API (native browser) | Required for oscillators + tuner autocorrelation |
| iOS wrapper | Capacitor | WKWebView preserves Web Audio; React Native cannot |

---

## Architectural rules

These are constraints that are not derivable from reading the code. Violating
them will cause hard-to-detect bugs or architectural drift.

### State — components never compute, always read
All derived state (`currentScale`, `harmonyRows`, etc.) is computed inside the
Zustand store in `src/store/index.ts` and recomputed automatically on every
state change. Components read from the store; they never recompute theory
results themselves.

### Theory — one layer, no reimplementation
All music theory logic lives in `src/theory/index.ts` as pure functions with no
DOM or React dependencies. Nothing outside `theory/` should reimplement theory
logic — not components, not the store, not the audio engine.

### Colors — always via the pitch class system
12 CSS custom properties `--pc-0` through `--pc-11` are defined in
`src/index.css`. Use `pcColorVar(pc)` from `src/theory/index.ts` to reference
them. Never hard-code colors for notes or pitch classes.

### CSS — Modules with color-mix for tinted surfaces
Each component has a co-located `ComponentName.module.css`. Use
`color-mix(in srgb, var(--pc-color) N%, #ffffff)` for surfaces tinted by pitch
class color — never hard-code opacity variants.

### Mobile — Apple HIG compliance is non-negotiable
Every interactive element must meet these requirements, always:
- Minimum **44×44pt touch target**
- `env(safe-area-inset-*)` for bottom/top padding
- `rem` units — no fixed `px` font sizes (supports Dynamic Type)
- Test in both portrait and landscape at phone-sized viewport

---

## Key files

| Path | Purpose |
|---|---|
| `docs/product-vision.md` | Product goals, audiences, design principles |
| `BACKLOG.md` | Phased feature backlog and current status |
| `v2.html` | Vite entry point for the React app |
| `src/theory/index.ts` | All music theory pure functions |
| `src/theory/types.ts` | TypeScript interfaces for the theory layer |
| `src/store/index.ts` | Zustand store — single source of truth |
| `src/index.css` | Global styles + `--pc-0` through `--pc-11` pitch class colors |
| `src/audio/index.ts` | Web Audio engine — oscillator synth, iOS unlock, mute, playback |
| `src/hooks/useAudio.ts` | React hook wrapping the audio engine |
| `index.html` | Legacy app — do not modify |
| `script.js` | Original source — reference only during migration |
