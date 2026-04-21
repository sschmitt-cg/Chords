# Pipeline Hardening Plan

Status: **proposal only — not yet implemented**
Owner: TBD
Target branch: a future `ci/<name>` branch per phase

This document proposes a staged plan for hardening the Tonal Explorer
testing, linting, and deployment pipeline. It takes the project from its
current state (a single deploy workflow with no gates) to a setup where
nothing reaches `main` or production without passing automated quality
checks.

Each phase is independently shippable. Later phases depend on earlier ones.

---

## 1. Current state (as of this branch)

### What exists

- **One workflow**: `.github/workflows/deploy.yml`
  - Trigger: push to `main` or manual dispatch
  - Steps: checkout → `setup-node@v4` (Node 25) → `npm install` → `npm run build` → copy legacy files into `dist/` → upload + deploy Pages artifact
  - Concurrency: `group: pages, cancel-in-progress: true`
- **`package.json` scripts** (after the three companion improvements on this branch):
  - `dev`, `build`, `preview`
  - `typecheck` (`tsc --noEmit`)
  - `lint` (`eslint src`)
  - `test` (`vitest run`), `test:watch`
- **TypeScript**: `tsconfig.json` is strict (`strict`, `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch`).
- **ESLint**: flat config in `eslint.config.js` with `typescript-eslint`,
  `react-hooks`, `react-refresh`.
- **Vitest**: config embedded in `vite.config.ts`; 47 tests covering the
  theory layer in `src/theory/__tests__/theory.test.ts`.

### Gaps

1. **No CI workflow.** Scripts exist locally but nothing runs them on PRs or
   on pushes. A broken typecheck, a failing test, or a lint error can all
   land on `main` and deploy to production.
2. **`npm install` (not `npm ci`)** in `deploy.yml` — reproducibility depends
   on the lockfile being respected, which `install` does not guarantee.
3. **Node 25 pinned** — an odd-numbered release with a short support window.
   Local dev likely runs on 20 or 22 LTS; a version drift bug could surface
   only in CI.
4. **No Dependabot or Renovate** — dependencies drift until someone
   notices a CVE advisory.
5. **No PR template** — CLAUDE.md requires "what / why / how to test" in PR
   descriptions, but nothing enforces it.
6. **No preview deploys** — reviewers can only see UI changes by checking
   the branch out locally.
7. **No branch protection** — assumed, should be verified and documented.
8. **No coverage reporting** — Vitest supports `--coverage` but nothing
   consumes it.

---

## 2. Goals

- Nothing reaches `main` without passing typecheck, lint, and tests.
- The deploy workflow is reproducible (`npm ci` from the lockfile) and
  runs on a long-term-supported Node version.
- Dependency updates are automated and reviewed, not forgotten.
- PR reviewers can see UI changes without checking out the branch.
- The legacy single-file app is validated too (at minimum HTML/JS syntax).
- Failures are noisy and easy to diagnose.

## 3. Non-goals

- **End-to-end / Playwright tests.** Out of scope until the app stabilizes
  post-migration. Component tests (React Testing Library) are a Phase 6
  candidate once UI code churn slows down.
- **Percy / visual regression tests.** Useful, but overkill for a solo
  project at this scale.
- **Monorepo / turbo / nx tooling.** The single-package setup is fine.
- **Self-hosted runners.** GitHub-hosted runners are free for public repos.

---

## 4. Phased rollout

Each phase below is a small, reviewable PR. Order matters — later phases
assume earlier ones are merged.

### Phase A — Baseline CI gate

**Goal**: Every PR and every push to `main` runs typecheck + lint + tests.

**New file**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
```

**Why one job, not three parallel jobs**: install is the slow step (~8s);
typecheck/lint/test together run in well under 10s on this repo. Parallel
matrix jobs would cost more minutes than they save. Revisit if the test
suite grows past ~30s.

**Branch protection rules** (set in GitHub settings, document here):
- Require PR review before merging
- Require `CI / verify` to pass before merging
- Dismiss stale reviews on new commits
- Disallow force-push to `main`

**Risk**: Nearly zero. Purely additive.

**Definition of done**: Opening a PR with a deliberately failing test
fails the `CI / verify` check and is blocked from merging.

### Phase B — Harden the deploy workflow

**Goal**: Deploys are reproducible, gated on CI passing, and run on LTS Node.

**Edit `.github/workflows/deploy.yml`**:

1. Change `node-version: 25` → `node-version: 22` (LTS).
2. Change `npm install` → `npm ci`.
3. Add a `needs`-style gate on CI. Two options:

   **Option B.1 — Merge into one workflow** (simpler):
   Move the deploy job into `ci.yml` as a second job with
   `needs: verify` and `if: github.ref == 'refs/heads/main'`. Delete
   `deploy.yml`.

   **Option B.2 — Keep separate, use `workflow_run`**:
   `deploy.yml` triggers on `workflow_run: { workflows: [CI], types:
   [completed], branches: [main] }` and guards with
   `if: github.event.workflow_run.conclusion == 'success'`. Preserves the
   current two-workflow mental model.

   **Recommendation**: Option B.1. One file is simpler and the log is in
   one place. The downside (a flaky test blocks a deploy) is a feature,
   not a bug.

4. Run `npm test` as a last safety net inside the deploy job too — cheap
   and catches the race where `main` is green but someone merges a PR
   that wasn't rebased onto latest main.

**Risk**: Medium — misconfiguring `workflow_run` or the job dependency can
prevent deploys entirely. Mitigation: verify with a no-op commit on a
throwaway branch first, or use `workflow_dispatch` to recover.

**Definition of done**: A push to `main` with a failing test does NOT
produce a new deploy.

### Phase C — Dependency management

**Goal**: Weekly PRs proposing dependency updates, grouped sensibly.

**New file**: `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      react:
        patterns: ["react", "react-dom", "@types/react*"]
      eslint:
        patterns: ["eslint*", "typescript-eslint", "@eslint/*"]
      vite:
        patterns: ["vite", "@vitejs/*", "vitest"]
      dnd-kit:
        patterns: ["@dnd-kit/*"]
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
```

Grouping avoids five separate React PRs when a single React minor drops.
Phase A gates those PRs on CI automatically.

**Optional**: `actions/dependency-review-action` as a CI step that blocks
PRs adding packages with known CVEs. Lightweight, ~1s added to CI.

**Risk**: Low. Worst case: PR spam; tune `open-pull-requests-limit`.

### Phase D — PR template + contribution scaffolding

**Goal**: Make the CLAUDE.md PR requirements automatic.

**New file**: `.github/pull_request_template.md`

```markdown
## What
<!-- What changed, in one or two sentences -->

## Why
<!-- Why this change — link issue or BACKLOG item -->

## How to test
<!-- Steps a reviewer can run locally -->

## Checklist
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Tested in the browser (or noted why not, e.g. pure-theory change)
- [ ] Screenshot attached for UI changes
```

**Optional add-ons**:
- `CONTRIBUTING.md` pointing at CLAUDE.md for the full playbook.
- `CODEOWNERS` if a second maintainer joins.
- Issue templates (`.github/ISSUE_TEMPLATE/bug.md`, `feature.md`).

**Risk**: None. Pure documentation.

### Phase E — Preview deploys per PR

**Goal**: Reviewers can click a URL in the PR to see the UI.

**Three viable options**:

| Option | How | Cost | Notes |
|---|---|---|---|
| **E.1 Cloudflare Pages** | Separate Cloudflare project watching the repo, deploys every branch | Free tier | Zero config in the repo; requires CF account. Preview URLs are stable per branch. |
| **E.2 GitHub Pages `pr-preview-action`** | Workflow pushes PR builds to a `gh-pages-previews` branch under `/pr-N/` | Free | Stays on GitHub infra; slightly clunky URLs. |
| **E.3 Vercel / Netlify** | Similar to Cloudflare but more mainstream | Free tier | Same tradeoffs as E.1. |

**Recommendation**: E.1 (Cloudflare Pages). Fastest previews, no repo
changes required, generous free tier. The existing GitHub Pages deploy
stays on the custom domain `tonalexplorer.com`; previews live on a
subdomain like `pr-42.tonal-explorer.pages.dev`.

**Note**: PR previews currently only make sense for the React app.
Legacy app previews would need the same `cp index.html styles.css script.js`
step run before upload.

**Risk**: Low; previews are independent of production. Only risk is
accidentally shipping secrets in a preview build — there are currently
none, but revisit when auth or API keys enter the app.

**Definition of done**: Opening a PR produces a comment with a preview
URL that loads the built app.

### Phase F — Coverage + test expansion

**Goal**: Measure theory-layer coverage, expand tests to store + audio.

1. Enable `vitest --coverage` via `@vitest/coverage-v8`. Add
   `"test:coverage": "vitest run --coverage"` script.
2. Display coverage in CI log (no upload service needed for a solo repo).
   Optionally publish to Codecov if a badge is desired.
3. Add a coverage floor in `vite.config.ts`:
   ```ts
   test: {
     coverage: { thresholds: { lines: 80, functions: 80 } },
   }
   ```
   Start low (theory is already near-covered), raise as coverage grows.
4. Add tests for **`src/store/index.ts`** — it's a Zustand store of pure
   functions, ideal for unit testing. Start with the derived fields
   (`currentModeNotes`, `currentTension`, `currentBrightnessPosition`).
5. Defer `src/audio/index.ts` tests — Web Audio is hard to mock; low ROI
   until a bug actually bites.

**Risk**: Thresholds set too high block legitimate work. Mitigation: start
loose, tighten only after stable green.

### Phase G — Legacy app validation

**Goal**: Prevent `script.js` / `index.html` regressions from deploying.

The legacy app has no test harness. Minimum viable validation:

1. **HTML validation**: add `html-validate` on `index.html`.
2. **JS syntax check**: `node --check script.js` (catches the obvious
   class of typo that would break the page).
3. **Optional later**: a single Playwright smoke test that loads the
   legacy app and verifies the key selector renders. Skippable if PR
   traffic into legacy files remains ~zero.

Add a `legacy-verify` job to `ci.yml` — or skip this phase entirely if
the legacy app is considered frozen. Worth confirming with the maintainer.

**Risk**: Low; changes only touch CI.

### Phase H — Release & changelog hygiene (optional)

Only worth doing once there's a meaningful install base:

- `CHANGELOG.md` maintained by Changesets or release-please.
- Tag-based releases (`v0.2.0`) triggered manually on `workflow_dispatch`.
- Semantic commit conventions enforced by commitlint.

Defer until post-v1 of the React app.

---

## 5. Sequencing recommendation

| Order | Phase | Effort | Unlocks |
|---|---|---|---|
| 1 | **A** — CI gate | 1 PR, ~30 min | All later phases |
| 2 | **B** — Harden deploy | 1 PR, ~30 min | Safe production |
| 3 | **D** — PR template | 1 PR, ~10 min | Better reviews |
| 4 | **C** — Dependabot | 1 PR, ~15 min | Long-term health |
| 5 | **E** — Preview deploys | 1 PR + Cloudflare setup, ~1 hr | Faster UI review |
| 6 | **F** — Coverage | 1–2 PRs, ~1 hr | Regression confidence |
| 7 | **G** — Legacy validation | 1 PR, ~30 min | Legacy safety net |
| 8 | **H** — Release hygiene | Deferred | When needed |

Phases A → D cover ~90% of the value in under two hours of total work.

## 6. Risks to watch across all phases

- **CI minute budget**: Public repos on GitHub-hosted runners are free.
  Stays relevant only if the repo goes private.
- **Node version drift between local dev and CI**: document the LTS
  version (Node 22) in `README.md` and optionally add a `.nvmrc` / `engines`
  field to `package.json`.
- **Flaky tests**: the theory layer is pure, so zero flakiness expected.
  If store or audio tests get flaky later, quarantine with `.skip` + an
  issue; don't disable the CI gate.
- **Pages deploy race**: existing `concurrency: pages, cancel-in-progress`
  is correct; keep it when reshuffling workflows.

## 7. Open questions

1. **Does the maintainer want branch protection on `main`?** Without it,
   the CI gate is advisory, not enforcing.
2. **Is the legacy app frozen?** Determines whether Phase G is worth doing
   or can be skipped.
3. **Is a preview URL needed now, or is it nice-to-have?** Determines
   Phase E priority.
4. **Does the maintainer use `gh` CLI for releases, or would release-please
   automation be welcome?** Determines whether Phase H ever lands.

These questions can all be answered with a one-line Slack / PR comment;
none block Phase A.
