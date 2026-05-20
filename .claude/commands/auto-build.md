# /auto-build

Autonomous multi-phase build mode. Carries the project forward from its current
state as far as the user specifies, running the full implementation pipeline on
each backlog item and proceeding automatically when all quality gates pass. Stops
only when something is truly broken or a decision cannot be safely deferred.

---

## Pre-flight

### Pending items check

Before checking for a prior build plan, check whether persistent tracking files
exist with unresolved content:

- Run `ls .build/OPEN_QUESTIONS.md 2>/dev/null || echo absent` — if present, read
  the Unresolved section and count items
- Run `ls .build/TEST_TRACKER.md 2>/dev/null || echo absent` — if present, first
  run the "Pre-step — Sweep externally-checked items" procedure defined at the
  top of `.claude/commands/test-companion.md` to move any `- [x]` entries from
  Pending to Completed, then read the Pending section and count items

If either has content, report the count to the user:
> "X open questions and Y pending tests remain from a prior build."

Ask: "Would you like to review them now before starting, or carry them forward to
be addressed at the end of this build?"

- **Review now**: follow the `/test-companion` process to work through these
  items. When the session is complete, return here and continue with the prior
  build check below.
- **Carry forward**: proceed — the items will persist and be consolidated with new
  items at the end of this build.

### Prior build check

If `.build/BUILD_PLAN.md` exists, offer to resume the previous build or start
fresh. If resuming, skip to Phase 3 and continue from the first uncompleted item
in BUILD_PLAN.md.

---

## Phase 1 — Clarification

### 1a. Read project state

Read in full: `BACKLOG.md`, `docs/project-vision.md`, `docs/architecture.md`.
Run `gh pr list --state open` and `gh issue list --state open` to check for
in-flight work.

### 1b. Present scope options

List each backlog phase with a one-line summary of its contents. Ask the user
how far they want to build — they may choose a phase boundary (e.g., "through
Phase 1"), specific items by number, or the full backlog. Also offer a custom
option to exclude individual items.

For the selected scope, identify items that appear underspecified or have
implicit prerequisites not yet in the backlog. Flag these with a brief note.

### 1c. Recommend exclusions

Review each item in scope. If an item:
- Requires infrastructure or a dependency not established earlier in the sequence
- Has scope that would likely require revisiting other items
- Is marked as a stretch goal or clearly post-launch

— recommend excluding it and explain why. Present the recommended exclusion list
and ask the user to confirm or override each item.

### 1d. Clarifying questions

Generate the full list of questions needed to implement the selected scope
without interruption. For each question, note what decision it affects and what
the reasonable default is if the user does not specify.

Present all questions at once. Wait for answers before proceeding.

### 1e. Self-check before confirming

Before presenting the final plan, check the following against the answers and
selected scope:

- Is the development sequence dependency-clean? (infrastructure before features,
  data models before UI, auth before protected routes)
- Does every item have enough spec to implement with a reasonable default — i.e.,
  no item requires a cross-cutting design decision to proceed?
- Are there any environment variables, third-party services, or local setup steps
  that must happen before the first item can run?

If gaps are found, resolve them via additional questions before proceeding. If
clean, continue.

### 1f. Confirm with user

Present:
- The final numbered development sequence
- Key decisions made (one line each)
- Items excluded and why
- Prerequisites to run before the build starts (env setup, installs, etc.)

**Stop here and wait for explicit confirmation before proceeding.**

The user may adjust the sequence, swap items in or out, or override any decision.
Incorporate changes and confirm the final plan.

### 1g. Write `.build/BUILD_PLAN.md`

Create the `.build/` directory if it does not exist.

```markdown
# Build Plan

## Scope
[Selected phase(s) or item list]

## Development Sequence
1. [Item name] — [one-line description]
2. ...

## Key Decisions
- [Decision]: [choice made and why]

## Deferred Decisions
- [Decision]: [default chosen, revisit condition]

## Exclusions
- [Item]: [reason]

## Prerequisites
- [Any env setup, global installs, or manual steps to complete before starting]
```

---

## Phase 2 — Setup

### 2a. Front-load prerequisites

For each item in the Prerequisites list from BUILD_PLAN.md:
- Present all prerequisite commands as a grouped list
- Get one confirmation from the user
- Run them sequentially, stopping if any fails

These are the only commands that may operate outside the project directory
(e.g., `npm install -g`, `brew install`, database setup). All subsequent
commands are scoped to the project.

### 2b. Initialize tracking files

**Session artifacts** — create fresh each build:

Create `.build/BUILD_QUESTIONS.md`:

```markdown
# Build Questions

## Decisions Made

[Populated as the build proceeds — one entry per decision, in sequence.]

## Open Questions

[One-line pointers to questions deferred during the build. Full entries are
written to .build/OPEN_QUESTIONS.md in real time as each question arises.]
```

Create `.build/BUILD_SUMMARY.md`:

```markdown
# Build Summary

## Status: In Progress

## Items Completed
[Populated as each item merges.]

## Items Remaining
[Full sequence from BUILD_PLAN.md — items removed as they complete.]
```

**Persistent tracking files** — create only if absent:

Run `ls .build/OPEN_QUESTIONS.md 2>/dev/null || echo absent`:
- If absent, create `.build/OPEN_QUESTIONS.md`:

```markdown
# Open Questions

<!--
Entry format (Unresolved section):
- **Q**: [question text]
  **Default used**: [what was chosen to unblock the build]
  **Revisit condition**: [what would trigger revisiting this decision]
  **Added**: Build [YYYY-MM-DD]
-->

## Unresolved

## Resolved
```

Run `ls .build/TEST_TRACKER.md 2>/dev/null || echo absent`:
- If absent, create `.build/TEST_TRACKER.md`:

```markdown
# Test Tracker

<!-- Checkbox conventions: [ ] pending, [x] passed, [!] failed (known failure) -->

## Pending

## Completed
```

If either file has items in its Unresolved or Pending section when Phase 2 begins
(whether because the user chose "carry forward" in pre-flight, or chose "review now"
but didn't clear everything), append a note to the Status line in BUILD_SUMMARY.md:
`## Status: In Progress — N open questions and M pending tests carried forward`

---

## Phase 3 — Build loop

For each item in the development sequence from BUILD_PLAN.md:

### Per-item pipeline

**3a. Write `.build/session-plan.md`** for this item:

```
Task: [item name and one-sentence description]
Approach: [2–3 sentences on implementation strategy for this specific item]
Key files: [files most relevant to this item]
Decisions: [any decisions from BUILD_PLAN.md relevant to this item]
Open questions: [none, or any item-specific questions to resolve]
Verify: [a concrete, observable condition that is true when this task is complete — e.g., "PR is open, all CI checks pass, and the feature behaves as described in the task"]
```

**3b. Confirm the goal condition**

Present the `Verify:` field from `.build/session-plan.md` to the user:

> "Here's the goal condition I'll use to know when this task is done:
> [Verify: contents]
> Does this correctly capture done? Adjust if needed."

Update `.build/session-plan.md` if the user refines it.

**3c. Invoke /goal**

`/goal` is a Stop-hook wrapper — after each turn, a fast evaluator checks the condition against the conversation transcript. It does not add orchestration; the agent runs whatever the condition tells it to run. So bundle the full sequence into the condition itself.

Run `/goal` with this template (substitute `[Verify: contents]` from session-plan.md):

```
/goal Implement and ship the item described in .build/session-plan.md.
Sequence:
1. Read CLAUDE.md, docs/architecture.md, and docs/project-vision.md before any code changes.
2. Run typecheck, lint, and tests to establish a clean baseline.
3. Implement per the Approach in session-plan.md on branch feature/<item-slug>. Follow commit conventions from CLAUDE.md.
4. Re-run typecheck, lint, and tests; fix any failures introduced.
5. Update BACKLOG.md to mark the item complete; if user-visible behavior changed and docs/user-guide.md is populated (no "> **Template:**" marker), update it; same for docs/admin-guide.md on config/env/deploy changes; README.md if commands or structure changed.
6. If any open question arises that cannot be resolved autonomously, append it to .build/OPEN_QUESTIONS.md (Unresolved section) with question, default used, revisit condition, and today's date; also log a one-line pointer in .build/BUILD_QUESTIONS.md Open Questions section.
7. Spawn a review sub-agent: reads docs/architecture.md and every changed file, checks for violations of CLAUDE.md and architecture.md constraints. Fix autonomously for clear rule violations or mechanical style; stop only for genuine design decisions. Up to 5 rounds.
8. Spawn a security sub-agent: checks every changed file for exposed secrets, injection (SQL, shell, XSS, path traversal), sensitive data in logs, insecure defaults (TLS, CORS, auth), known CVEs (npm audit / pip-audit). Fix autonomously where unambiguous; stop and ask otherwise.
9. Open the PR: `gh pr create --base dev`, using the three-section test plan format from CLAUDE.md (CI / Automated / Manual).
10. Monitor CI with `gh pr checks <number>`; fix mechanical failures (type, lint, broken import, failing test from these changes) autonomously; stop only when root cause needs a design decision. Up to 5 rounds.

Stop and return control to the user any time a step requires a decision you cannot resolve autonomously.

Done when: [Verify: contents from session-plan.md]

Stop after 40 turns if the condition has not been met.
```

When the goal clears (condition met or turn cap hit), proceed to 3d.

**3d. Docs and stub check** (per Step 6 of `/next-step`).

**3e. Merge and continue.** Once CI passes:
- Run `gh pr merge <number> --merge --delete-branch`
- Run `git checkout dev`
- Run `git pull`
- Append to `.build/BUILD_SUMMARY.md`:
  ```
  ✓ [Item name] — [3-sentence summary] — PR #[n]
  ```
- Proceed to the next item

### Stop conditions

Stop the loop and report to the user when:
- CI fails and the fix requires a design decision (cannot be resolved with a
  reasonable default that is refactorable later without touching other items)
- Two items have a dependency conflict that makes safe ordering impossible
- A prerequisite from Phase 2 was skipped and is now blocking progress
- The build runner context approaches its limit (see Notes)

**Log and continue** (do not stop) when:
- An open question arises that has a reasonable default answer — the sub-agent
  handles this per instruction 6 above; the orchestrator does not need to act,
  just continue
- An item requires a minor refactor to a previously completed item that does
  not affect unrelated code — fold it into the current PR
- CI fails with a mechanical fix (type error, lint, broken import) — fix
  autonomously per the standard pipeline

### Context discipline

After each `/goal` completes for an item, write completion status to BUILD_SUMMARY.md
(branch name, PR number, 3-sentence summary) and treat the tracking files as the
source of truth. Re-read BUILD_PLAN.md and BUILD_SUMMARY.md from disk when needed
rather than relying on accumulated context. The orchestrator does not need to
carry forward implementation detail between items.

---

## Phase 4 — Wrap-up

### 4a. Finalize open questions

Open questions were written to `.build/OPEN_QUESTIONS.md` in real time during
Phase 3, so no migration is needed. Close out BUILD_QUESTIONS.md by replacing
the "Open Questions" section body with:
`[All items written to .build/OPEN_QUESTIONS.md in real time — see that file.]`

As a defensive check: read BUILD_QUESTIONS.md's Open Questions section. Pointer
entries are a single line (e.g., "Q: [title] → see OPEN_QUESTIONS.md"). If any
entry spans multiple lines — indicating it's a full question that wasn't written
to OPEN_QUESTIONS.md in real time — and the same question is not already present
in OPEN_QUESTIONS.md's Unresolved section, migrate it now with today's date.

### 4b. Spawn a test-plan sub-agent

Give it:
- The full item list from BUILD_SUMMARY.md
- The complete list of changed files across the build
- `docs/user-guide.md` if it exists and is populated (no `> **Template:**` stub
  marker) — for user-facing flow coverage

The sub-agent produces test entries in TEST_TRACKER.md format, grouped by app
location/screen. It should cover happy paths and key edge cases. Each entry must
follow this format:

```markdown
### [Area — e.g., "Login", "Dashboard", "Settings"]

- [ ] [Test title]
  **Steps:** 1. [step]. 2. [step].
  **Expected:** [what the user should see or experience]
  **Added:** Build [YYYY-MM-DD]
```

Append the output to the Pending section of `.build/TEST_TRACKER.md` — do not
replace existing entries.

### 4c. Consolidate tracking files

Spawn a consolidation sub-agent. Give it:
- Full contents of `.build/OPEN_QUESTIONS.md`
- Full contents of `.build/TEST_TRACKER.md`
- The list of items built in this build (from BUILD_SUMMARY.md Items Completed)

The sub-agent rewrites both files in place:

**For OPEN_QUESTIONS.md (Unresolved section only):**
- Merge duplicate or near-duplicate questions into a single entry, combining
  defaults and revisit conditions
- Remove any question that was definitively answered by the work in this build
- Do not touch the Resolved section

**For TEST_TRACKER.md (Pending section only):**
- Merge duplicate or overlapping tests into a single entry
- Group remaining tests by app location/screen/user flow (e.g., "Login",
  "Dashboard", "Settings"). Create a `### [Area]` heading for each group.
- Within each group, order tests to minimize back-and-forth navigation — complete
  everything testable in one location before moving to another
- Across groups, order groups by natural user flow sequence (onboarding before
  features, setup before use, happy path before edge cases)
- Honor explicit dependency notes — if a test says "requires X first," preserve
  that ordering even if it crosses group boundaries
- Do not touch the Completed section

### 4d. Complete BUILD_SUMMARY.md

```markdown
# Build Summary

## Status: Complete

## Items Built
[Full list with PR numbers]

## Items Excluded
[From BUILD_PLAN.md exclusions]

## Key Decisions
[From BUILD_QUESTIONS.md — decisions made]

## Open Questions
See `.build/OPEN_QUESTIONS.md` — [N] unresolved items

## Test Plan
See `.build/TEST_TRACKER.md` — [N] pending tests
```

### 4e. Final report

Report to the user:
- Build complete (or partial, with reason for stopping)
- PR list with merge status
- Link to `.build/BUILD_SUMMARY.md`
- Count of open questions and pending tests, with a prompt to run `/test-companion`

---

## Notes

- **Context budget:** Each sub-agent starts fresh. The orchestrator accumulates
  roughly one brief summary per item — for most projects (5–20 items) this is
  well within limits. For very large builds (30+ items), if the orchestrator
  context grows large, stop at a natural phase boundary, report status, and
  offer to continue in a new session (BUILD_PLAN.md and BUILD_SUMMARY.md
  preserve full state for resuming).
- **`.build/` is gitignored.** These files are session artifacts, not project
  history. Add `.build/` to `.gitignore` if not already present.
- **Persistent files survive builds.** OPEN_QUESTIONS.md and TEST_TRACKER.md
  accumulate across builds. BUILD_PLAN.md, BUILD_QUESTIONS.md, BUILD_SUMMARY.md,
  and session-plan.md are per-build artifacts and may be overwritten.
