# Tonal Explorer — Admin Guide

Operational documentation for deploying and maintaining the site.

---

## Overview

Tonal Explorer is a fully client-side static web app — there is no backend
server, database, or user account system. All state lives in the browser, and
the site is hosted as static files on GitHub Pages at
[tonalexplorer.com](https://tonalexplorer.com). The custom domain is wired
through the `CNAME` file in the repository root.

The repository ships two coexisting entry points:

| Path | Served at | Source |
|---|---|---|
| React app (current) | `/` | `index.html` (Vite entry) |
| Legacy vanilla JS app | `/index-legacy.html` | `index-legacy.html` + `styles.css` + `script.js` |
| Legacy redirect | `/v2.html` | `v2.html` (meta refresh + JS redirect to `/`) |

## Requirements

- **Node.js** — `^20.19.0` or `>=22.13.0` (see `package.json` `engines` and
  `.nvmrc`, which pins 22.13.0 for local dev).
- **npm** — bundled with Node.
- **GitHub repository write access** — deploys are driven entirely by pushes to
  `main`, so the production permission is "merge to main."
- No database, no external service credentials, no API keys.

## Configuration

### Environment Variables

The app reads no environment variables at build time or runtime. There is no
`.env` file and `import.meta.env` / `process.env` are not referenced in `src/`.

### Custom Domain

The `CNAME` file at the repo root contains `tonalexplorer.com`. GitHub Pages
reads this file on every deploy to keep the custom domain bound to the site.
DNS for the apex domain is configured outside this repository.

### Content Security Policy

Production builds inject a strict CSP `<meta http-equiv>` tag into `index.html`
via a Vite plugin in `vite.config.ts`. The dev server is left untouched so HMR
keeps working.

Production directives:

- `default-src 'self'` — deny everything by default
- `img-src 'self' data: blob:` — allow data/blob URIs for ShareCard PNG export
- `style-src 'self' 'unsafe-inline'` — required because ~50 components use
  inline `style={{...}}` props for dynamic CSS custom properties
- `script-src 'self'` — no third-party scripts
- `connect-src 'self' data: blob:` — `fetch(dataUrl)` in ShareCard needs `data:`
- `media-src 'self' blob:` — defensive; Web Audio uses oscillators, not media
- `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'none'`,
  `base-uri 'self'` — lock down embedding, framing, form posts, base URI

If a new third-party resource is added (CDN font, analytics, error reporting,
etc.), update the relevant directive in `vite.config.ts` and verify production
preview loads cleanly with no console-blocked resources.

## Deployment

Deploys are fully automated by `.github/workflows/deploy.yml`:

- **Trigger:** any push to `main`, or manual `workflow_dispatch`.
- **Concurrency:** `group: pages, cancel-in-progress: true` — a new push
  cancels any in-progress deploy.
- **Steps:** install dependencies, `npm run build` (Vite emits the React app
  to `dist/`), copy `index-legacy.html`, `styles.css`, `script.js`, and
  `v2.html` into `dist/` so the legacy app and the redirect coexist with the
  React app, then upload and deploy via `actions/upload-pages-artifact@v3` and
  `actions/deploy-pages@v4`.

To deploy: merge a PR into `main` (or push a commit directly) and watch the
**Deploy to GitHub Pages** workflow under the repository's Actions tab.

### Local build (sanity check before merging)

```bash
nvm use            # picks up Node from .nvmrc
npm install
npm run build      # outputs dist/index.html (React entry) + assets
npm run preview    # serves dist/ locally on a Vite preview port
```

The preview command does **not** copy the legacy files or redirect stub into
`dist/` — that step only runs in CI. To test the legacy assets locally, copy
them manually after `npm run build`:

```bash
cp index-legacy.html styles.css script.js v2.html dist/
```

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request against `main`:

- `npm run typecheck` (`tsc --noEmit`)
- `npm run lint` (ESLint over `src/`)
- `npm test` (Vitest, run once)

All three must pass before merging. The CI workflow currently uses Node 22;
the deploy workflow uses Node 25. Both fall inside the supported `engines`
range and produce identical output.

## Database / Migrations

Not applicable — the app has no persistent server-side state. Shareable URLs
encode key/mode/scale parameters directly in query parameters, and any
in-browser state (section visibility, voicing position) is held in Zustand
stores that do not persist across sessions.

## Monitoring & Logs

GitHub Pages does not expose request logs to repository owners. Use the GitHub
**Actions** tab to monitor deploy success/failure. There is no application
telemetry, error tracking, or analytics wired into the app.

## Backup & Recovery

The site is stateless and rebuilt from source on every deploy. To recover from
a bad deploy, revert the offending commit on `main` — the next push triggers
a fresh build that supersedes the artifact GitHub Pages is serving.

The custom-domain binding (`CNAME`) is in the repository and survives reverts.
DNS for `tonalexplorer.com` is managed outside this repository; if the apex
record is changed externally, GitHub Pages may begin serving from
`<owner>.github.io/<repo>/` instead, until DNS is corrected.

## Troubleshooting

### Deploy workflow fails at the "Copy legacy app and v2 redirect into dist" step

**Symptom:** `cp: cannot stat 'index-legacy.html': No such file or directory`
(or one of the other files in the same `cp` line).
**Cause:** A legacy file was renamed or removed without updating the workflow.
**Resolution:** Update the `cp` line in `.github/workflows/deploy.yml` to match
the current set of legacy assets at the repo root.

### `/v2.html` no longer redirects to `/`

**Symptom:** Visiting `tonalexplorer.com/v2.html` shows a blank page or stale
content.
**Cause:** `v2.html` was not copied into `dist/` during deploy, or the
redirect stub was overwritten by an old build artifact.
**Resolution:** Confirm `v2.html` is present in the repo root and listed in
the workflow's `cp` step. The file should contain a `<meta http-equiv="refresh">`
plus a `window.location.replace('/')` script targeting `/` (hard-coded — no
query-param reads).

### Custom domain shows the legacy app at `/`

**Symptom:** `tonalexplorer.com` loads the old vanilla JS app instead of the
React app.
**Cause:** `index.html` in the repo root is the legacy file (not the React
Vite entry), or the `vite.config.ts` `rollupOptions.input` is pointing
elsewhere.
**Resolution:** Confirm `index.html` is the React entry (contains
`<div id="root"></div>` and the `/src/main.tsx` import), and that
`rollupOptions.input` in `vite.config.ts` is `'index.html'`.

### Audio doesn't play in a browser tab

**Symptom:** No sound when tapping notes or chords.
**Cause:** Browsers gate Web Audio behind a user gesture. The app boots muted,
and the unlock only fires when the user transitions from muted to unmuted via
the volume knob (or starts the metronome).
**Resolution:** End-user issue, not an admin issue — this is documented in the
[user guide](user-guide.md). No admin action required.
