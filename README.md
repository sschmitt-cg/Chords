# Tonal Explorer

A browser-based music theory tool for exploring scales, modes, diatonic chords,
and chord extensions through interactive visualizers (piano keyboard, guitar
fretboard, harmony grid) and a built-in Web Audio synth.

Live: **[tonalexplorer.com](https://tonalexplorer.com)** (legacy app) and
**[tonalexplorer.com/v2.html](https://tonalexplorer.com/v2.html)** (new React app).

---

## Project layout

This repo currently ships **two apps from the same `dist/`**:

| Path | What it is |
|---|---|
| `index.html` + `styles.css` + `script.js` | Legacy single-file vanilla app. Fully functional, preserved as the reference implementation. Do not modify. |
| `v2.html` + `src/` | React 18 + TypeScript + Vite + Zustand rewrite. Active development. |

The `deploy.yml` workflow builds the React app with Vite, then copies the
legacy files into `dist/` so both are served from the same GitHub Pages site.

## Quick start

**Requires Node.js `^20.19.0` or `>=22.13.0`** (ESLint 10's engine floor
for Node 22 is stricter than Vite 8's, so the combined minimum is 22.13).
Node 22 LTS is recommended — a `.nvmrc` is pinned to `22.13.0`, so
`nvm use` picks the right version automatically.

```bash
npm install
npm run dev        # React app on http://localhost:5173
```

Open `index.html` directly in a browser (or via any static server) to run the
legacy app.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | `tsc --noEmit` — must pass before every commit |
| `npm run lint` | ESLint across `src/` |
| `npm test` | Vitest unit tests (theory layer) |

## Tech stack

- **React 18 + TypeScript** — component model, type safety
- **Vite** — build + HMR
- **Zustand** — single store in `src/store/index.ts`, no boilerplate
- **CSS Modules** — scoped styles, one `.module.css` per component
- **Web Audio API** — native synth (oscillators + gain graph). Chosen over
  React Native so the same code can ship to iOS via Capacitor WKWebView.

## Key files

| Path | Purpose |
|---|---|
| `src/theory/index.ts` | All music theory pure functions (scales, modes, chord analysis) |
| `src/theory/types.ts` | Theory-layer TypeScript interfaces |
| `src/store/index.ts` | Zustand store — single source of truth |
| `src/audio/index.ts` | Web Audio engine (oscillator synth, iOS unlock, mute, playback) |
| `src/hooks/useAudio.ts` | React hook wrapping the audio engine |
| `src/index.css` | Global styles + `--pc-0` … `--pc-11` pitch-class colors |

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — working agreements and architecture decisions
- **[BACKLOG.md](./BACKLOG.md)** — phased feature roadmap
- **[docs/](./docs/)** — deeper planning documents

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`, which builds the React
app and publishes `dist/` to GitHub Pages (custom domain `tonalexplorer.com`
via the `CNAME` file).

## Contributing

All work happens on a branch (`feature/<name>` or `fix/<name>`), never directly
on `main`. Before committing, run `npm run typecheck` and confirm zero errors.
See [CLAUDE.md](./CLAUDE.md) for the full workflow and code-style rules.
