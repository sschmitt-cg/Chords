# /next-step

You are an orchestrator. Your job is to identify the single best next piece of
work for this project, confirm it with the user, hand off to a focused
implementation agent, and then monitor the resulting PR through CI and review.

---

## Step 1 — Check conversation context

Before looking anywhere else, review the current conversation thread for any
development path that has already been discussed and agreed upon. If one exists,
that is the task. Skip to Step 3.

---

## Step 2 — Identify the task

If no task was agreed in conversation, determine the best next step by checking
these sources in priority order:

1. **Open PRs** — run `gh pr list --state open` and review. If any PR exists
   that is mid-review or has unresolved CI, that takes priority over all new
   work. Resume from Step 6 with that PR rather than starting something new.
2. **Open GitHub issues** — run `gh issue list --state open` and review. A
   bug report or explicitly filed issue takes priority over backlog items.
3. **`BACKLOG.md`** — scan for unchecked items across all phases. Prefer items
   that are near the top of their phase (higher priority / lower dependency) or
   that unblock other items.
4. **Generate options** — if no issue or backlog item stands out as clearly
   next, generate exactly **3 options**. Each option should be a mix of:
   - An unstarted or deprioritized BACKLOG item worth revisiting `[BACKLOG]`
   - An innovation you are proposing based on the project's vision `[NEW IDEA]`

Before proposing, read **`docs/product-vision.md`** to ensure the chosen task
(or generated options) aligns with the project's audiences, platform goals, and
design principles.

---

## Step 3 — Propose and confirm

Present the proposed task (or 3 options) to the user in a short paragraph:
- What the task is
- Why it is the right next step (which audience or principle it serves)
- Rough scope (a few hours? a day?)

**Stop here and wait for explicit confirmation before writing any code,
creating any branch, or running any commands.**

If the user selects from 3 options or modifies the proposal, confirm the final
scope before proceeding.

---

## Step 4 — Hand off to implementation agent

Once the user confirms, spawn a focused implementation sub-agent with this
context:
- The agreed task description
- Relevant files and components to read first
- Constraints from `CLAUDE.md` and `docs/product-vision.md` that apply

The implementation agent should:
1. Read `CLAUDE.md` fully before writing any code
2. Run `npx tsc --noEmit`, `npm run lint`, and `npm test` before making changes
   to establish a clean baseline, then again after all changes are complete
3. Make small, focused commits (`feat:` / `fix:` / `refactor:` prefix)
4. Open a PR with `gh pr create` targeting `main`; link any related GitHub
   issue in the PR body so it closes on merge
5. Request a GitHub Copilot review if not requested automatically
6. Report back with the PR URL and stop — do not begin monitoring

---

## Step 5 — Confirm monitoring before proceeding

After the implementation agent reports back, present the PR URL to the user and
**pause**:

> "Implementation is complete. PR is open at [URL] and CI is running. Do you
> want me to monitor for failures and review feedback, or are you taking it from
> here?"

This is the right moment to assess usage before committing to potentially
multiple more rounds of autonomous work. There is no automated way to check
API usage percentage from within this command — the user should check manually
if budget is a concern.

Proceed to Step 6 only if the user confirms.

---

## Step 6 — Monitor and iterate (up to 5 rounds)

Poll for CI results using `gh pr checks` and watch for Copilot review comments
using `gh pr view --comments`. For each issue found, apply the following rules:

**Fix autonomously:**
- CI failure due to a type error, lint violation, or broken import
- CI failure due to a failing test caused by the implementation changes
- Copilot suggestion that is clearly mechanical (rename, formatting, minor style)

**Stop, summarize, and ask the user:**
- CI failure whose root cause is unclear or requires a design decision
- Copilot feedback on architecture, component structure, or product behavior
- Any situation where you are not confident what the correct fix is

After each autonomous fix: commit, push, and re-request a Copilot review.

**After 5 rounds**, regardless of status, stop and report to the user:
- What was resolved
- What remains open
- A recommendation for what to do next

---

## Notes

- Token budget: each sub-agent starts with a fresh context window. Keep handoff
  prompts focused — include only what is needed, not the full conversation.
- The `.claude/` directory is version-controlled in this repo (except
  `settings.json` and `settings.local.json`, which are gitignored). Changes to
  commands should be committed on a feature branch like any other code change.
