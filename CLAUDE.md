# CLAUDE.md

Instructions for Claude Code when working in this repository.
These rules apply to all work unless a prompt explicitly overrides them.

---

## Project Overview

**Tonal Explorer** is a browser-based music theory tool originally written as a
single-file vanilla HTML/CSS/JS app (`index-legacy.html` + `script.js`). It lets
musicians and students explore scales, modes, diatonic chords, and chord
extensions through interactive visualizers and a built-in Web Audio synth.

### Current state

The app is mid-migration to **React 18 + TypeScript + Vite + Zustand**. The
original app is preserved intact at `index-legacy.html` and remains fully
functional. The new app lives in `src/` and is served by Vite at `localhost:5173`
(or the next available port).

**Completed so far:**
- Full project scaffold (Vite, TypeScript, Zustand)
- Pure theory functions migrated to `src/theory/index.ts`
- Zustand store wired to recompute scale + harmony rows on every state change
- ScaleStrip, HarmonyGrid, KeyboardVisualizer, FretboardVisualizer components

**Still to do:** Web Audio engine, Metronome, Tuner, TuningSelector,
ProgressionBuilder, WheelModal, shareable URLs, and eventually the iOS app via
Capacitor. See `BACKLOG.md` for the full phased plan.

### Goal

Ship the same codebase as:
1. A **progressive web app** (desktop + mobile browser)
2. A **native iOS app** via Capacitor wrapping WKWebView — chosen specifically
   because Web Audio API (oscillators, autocorrelation, gain graph) runs natively
   in WKWebView. React Native was ruled out because it cannot use the Web Audio API.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| UI framework | React 18 + TypeScript | Type safety, component model, ecosystem |
| Build | Vite | Fast HMR, native ESM, simple config |
| State | Zustand | Lightweight, no boilerplate, works outside React |
| Styling | CSS Modules (`.module.css` per component) | Scoped, no runtime, co-located |
| Audio | Web Audio API (native browser) | Required for oscillators + tuner autocorrelation |
| iOS wrapper | Capacitor | WKWebView preserves Web Audio; React Native cannot |

---

## Architecture Decisions

### State management
All app state lives in `src/store/index.ts`. Calling `setKey(pc)`, `setMode(index)`,
or `setScaleType(type)` immediately recomputes `currentScale` and `harmonyRows` —
components never compute these themselves. Enharmonic preferences (C# vs Db) are
also stored so the user's choice persists across navigation.

### Theory layer
`src/theory/index.ts` contains only pure functions with no DOM or React
dependencies. It can be tested independently with plain `console.log` calls.
`src/theory/types.ts` holds all TypeScript interfaces. Nothing outside `theory/`
should reimplement music theory logic.

### Guitar tuning
`GuitarTuning` is a 6-tuple of MIDI values `[number,number,number,number,number,number]`,
index 0 = high E, index 5 = low E. This is the canonical representation throughout
the app. The hard-coded `openStrings`/`openMidis` arrays in `script.js` line 2020
were the specific pain point this solves. FretboardVisualizer reads `guitarTuning`
directly from the store.

### Pitch class colors
12 CSS custom properties `--pc-0` through `--pc-11` are defined in `src/index.css`
and map each chromatic pitch to a unique hue. Components access them via
`pcColorVar(pc)` from `src/theory/index.ts`, which returns `var(--pc-N)`.
Never hard-code colors for notes — always go through this system.

### Apple HIG compliance (ongoing)
- All interactive elements must have a minimum **44×44pt touch target**
- Use `env(safe-area-inset-*)` for bottom/top padding on iOS
- Use `rem` units and avoid fixed `px` font sizes to support Dynamic Type
- Bottom tab bar navigation pattern (not hamburger menus) for the iOS app

### CSS Modules pattern
Each component has a co-located `ComponentName.module.css` file. Import as
`styles` and compose class names inline. Use `color-mix()` for tinted surfaces
derived from pitch class colors — it keeps the palette consistent without
hard-coding opacity variants.

---

## Behavior Rules

### Before writing any code
For any **significant design or architectural decision** (new component structure,
state shape change, audio API design, iOS navigation pattern, etc.), propose
**3 distinct options with tradeoffs** and wait for a choice before writing code.
For small, unambiguous tasks this step can be skipped.

### When requirements are unclear
Ask rather than assume. One short clarifying question is better than building the
wrong thing.

### TypeScript
- Never use `any` without a comment on the same line explaining why it's necessary.
- Prefer explicit return types on exported functions.
- Prefix intentionally unused parameters with `_` (e.g., `_event`) to satisfy
  `noUnusedParameters` — do not disable the rule.

### Code style
- Code comments should be short, purposeful, and explain *why* not *what*.
- No boilerplate or generated comments.
- Favor naming clarity over inline documentation.
- Do not add docstrings, comments, or type annotations to code you didn't change.

### Scope discipline
- Only modify files relevant to the current task.
- Do not refactor surrounding code opportunistically.
- Do not add features, error handling, or validation beyond what was asked.

---

## Git Workflow

### Branching
- All work happens on a feature or fix branch: `feature/<name>` or `fix/<name>`.
- Never commit directly to `main`.
- Never merge branches automatically.
- Never force-push.

### Commits
- Make **small, focused commits** with clear, present-tense messages
  (e.g., `feat: add HarmonyGrid component`, `fix: enharmonic pref not persisting`).
- Commit message body is optional but encouraged for non-obvious changes.
- One logical change per commit — don't batch unrelated edits.

### Pull requests
- After pushing a feature branch, open an actual PR with `gh pr create`.
- The PR description must include: what changed, why, and how to test it.
- Do not create a PR for exploratory, conceptual, or review-only work.

### Validation before committing
Run `npx tsc --noEmit` and confirm zero errors before every commit.
If the project gains a lint script (`npm run lint`) or test script (`npm test`),
run those too. Report anything that cannot be verified.

### Git safety
- If a git operation fails (conflict, missing remote, permissions), stop, report
  the issue, and suggest the minimal manual resolution.
- Do not attempt to resolve merge conflicts automatically.

---

## Feature Backlog

All planned work is tracked in `BACKLOG.md` at the project root.
Read it at the start of each session to understand current status.
Update checkboxes as items ship. Add new items the user mentions during
conversation — don't lose ideas to chat history.

### Key upcoming features (summarized)
- **Web Audio engine** — migrate `ensureAudio`, `playSynthNote`, `playSequence`,
  metronome scheduler, and tuner autocorrelation into `src/audio/index.ts`
- **Scale type expansion** — Harmonic Major, Phrygian Dominant, Lydian Dominant,
  Super Locrian/Altered, Double Harmonic, Hungarian Minor, Neapolitan Major/Minor,
  Chromatic; grouped picker UI
- **Alternative guitar tunings** — preset library (Open G/D/E/A, Drop D, DADGAD,
  half/full-step down, etc.), custom tuning editor, string tension warnings using
  `ratio = 2^(n/6)` (+2 semi = caution, +3 = warning, +4+ = danger)
- **Progression Builder** — chord slot sequencer with loop playback
- **Ear training modes** — interval, chord quality, scale/mode identification
- **iOS app** — Capacitor setup, bottom tab bar, safe area insets, App Store prep

---

## Key Files Reference

| Path | Purpose |
|---|---|
| `index.html` | Legacy app — do not modify (served at root URL) |
| `styles.css` | Stylesheet for the legacy app — do not modify |
| `script.js` | Original source — reference only during migration |
| `v2.html` | Vite entry point for the React app |
| `src/theory/index.ts` | All music theory pure functions |
| `src/theory/types.ts` | TypeScript interfaces for the theory layer |
| `src/store/index.ts` | Zustand store — single source of truth |
| `src/index.css` | Global styles + `--pc-0` through `--pc-11` color palette |
| `src/audio/index.ts` | Web Audio engine (stub — not yet migrated) |
| `BACKLOG.md` | Phased feature backlog — read at session start |
