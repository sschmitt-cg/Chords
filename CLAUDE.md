# CLAUDE.md

Instructions for Claude Code when working in this repository.
These rules apply to all work unless a prompt explicitly overrides them.

---

## Project orientation

**Tonal Explorer** is a browser-based music theory tool for exploring scales,
modes, diatonic chords, and chord extensions through interactive visualizers
and a built-in Web Audio synth.

Read **`docs/product-vision.md`** for the full product goals, target audiences,
and design principles. Read **`BACKLOG.md`** for current development status and
upcoming work. Both files should be read at the start of any session.

### Delivery targets

The same codebase ships as:
1. A **progressive web app** (desktop + mobile browser)
2. A **native iOS app** via Capacitor wrapping WKWebView — chosen specifically
   because the Web Audio API (oscillators, autocorrelation, gain graph) runs
   natively in WKWebView. React Native cannot do this.

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

## Behavior rules

### Before writing any code
For any **significant design or architectural decision** (new component
structure, state shape change, audio API design, iOS navigation pattern, etc.),
propose **3 distinct options with tradeoffs** and wait for a choice before
writing code. For small, unambiguous tasks this step can be skipped.

### When requirements are unclear
Ask rather than assume. One short clarifying question is better than building
the wrong thing.

### TypeScript
- Never use `any` without a comment on the same line explaining why.
- Prefer explicit return types on exported functions.
- Prefix intentionally unused parameters with `_` (e.g., `_event`) to satisfy
  `noUnusedParameters` — do not disable the rule.

### Code style
- Comments explain *why*, never *what*.
- No boilerplate or generated comments.
- Favor naming clarity over inline documentation.
- Do not add comments or type annotations to code you didn't change.

### Scope discipline
- Only modify files relevant to the current task.
- Do not refactor surrounding code opportunistically.
- Do not add features, error handling, or validation beyond what was asked.

---

## Git workflow

### Branching
- All work happens on a feature or fix branch: `feature/<name>` or `fix/<name>`.
- Never commit directly to `main`.
- Never merge branches automatically.
- Never force-push.

### Commits
- Small, focused commits with present-tense messages
  (e.g., `feat: add HarmonyGrid component`, `fix: enharmonic pref not persisting`).
- One logical change per commit — don't batch unrelated edits.

### Pull requests
- Open PRs with `gh pr create` targeting `main`.
- PR description must include: what changed, why, and how to test it.
- Link any related GitHub issue in the body so it closes on merge.
- Do not create a PR for exploratory or review-only work.

### Validation before every commit
Run all three gates and confirm zero errors:
```
npm run typecheck
npm run lint
npm test
```

### Git safety
- If a git operation fails (conflict, missing remote, permissions), stop, report
  the issue, and suggest the minimal manual resolution.
- Do not attempt to resolve merge conflicts automatically.

---

## Key files

| Path | Purpose |
|---|---|
| `docs/product-vision.md` | Product goals, audiences, design principles — read first |
| `BACKLOG.md` | Phased feature backlog and current status — read at session start |
| `.claude/commands/next-step.md` | Slash command for picking and executing the next task |
| `v2.html` | Vite entry point for the React app |
| `src/theory/index.ts` | All music theory pure functions |
| `src/theory/types.ts` | TypeScript interfaces for the theory layer |
| `src/store/index.ts` | Zustand store — single source of truth |
| `src/index.css` | Global styles + `--pc-0` through `--pc-11` pitch class colors |
| `src/audio/index.ts` | Web Audio engine — oscillator synth, iOS unlock, mute, playback |
| `src/hooks/useAudio.ts` | React hook wrapping the audio engine |
| `index.html` | Legacy app — do not modify |
| `script.js` | Original source — reference only during migration |
