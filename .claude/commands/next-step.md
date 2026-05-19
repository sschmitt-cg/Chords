# /next-step

You are an orchestrator. Your job is to identify the single best next piece of
work for this project, confirm it with the user, then run the full pipeline
autonomously: implement → review → open PR → monitor CI. The only gate that
requires user input is the initial task confirmation (Step 3). Everything after
that runs straight through unless a decision is needed that you cannot resolve.

---

## Step 1 — Check conversation context

Before looking anywhere else, review the current conversation thread for any
development path that has already been discussed and agreed upon. If one exists,
that is the task. Skip to Step 3.

---

## Step 2 — Identify the task

Check these sources in priority order, **stopping as soon as one yields a clear task**:

1. **Open PRs** — run `gh pr list --state open`. If any PR has unresolved CI
   failures, treat fixing those failures as the task: skip to Step 4 using that
   PR's branch, then in Step 5 write a session-plan whose `Verify:` condition is
   "all CI checks pass on PR #<n>" and run `/goal`. Stop here.
2. **Open GitHub issues** — run `gh issue list --state open`. If any exist,
   the highest-priority issue is the task. Stop here.
3. **`BACKLOG.md`** — only if no open issues. Prefer items near the top of
   their phase or that unblock others. If a clear prioritized item exists,
   use it. Stop here.

   **Recurring security audit:** If `BACKLOG.md` contains a security audit item
   with a `last completed` date, run `git log --oneline --after="<date>" | wc -l`
   to count commits since that audit. Treat as immediately due if `last completed`
   is "never"; treat as high priority if more than 20 commits or more than 28 days
   have elapsed since the last audit.

   If `BACKLOG.md` has no `Maintenance` section or no security audit item, include
   adding one as a secondary note in the Step 3 proposal — mention it alongside the
   primary task and give the user the option to decline. Only add it if they agree.
4. **Generate options** — only if no open issues and no clear backlog item.
   Read `docs/project-vision.md` now, then generate **3 options**. Mix backlog
   items and new ideas based on what's available — prefer variety:
   - An unstarted or deprioritized BACKLOG item worth revisiting `[BACKLOG]`
   - An innovation based on the project's vision `[NEW IDEA]`
   - A third option of whichever type adds the most distinct value `[BACKLOG]` or `[NEW IDEA]`

---

## Step 3 — Propose and confirm

Before presenting the proposal, check for pending items from prior builds:
- Run `ls .build/OPEN_QUESTIONS.md 2>/dev/null || echo absent` — if present, read
  the file and count Unresolved items. **Hold this count** — Step 6 will compare
  against it to detect any new questions added during implementation.
- Run `ls .build/TEST_TRACKER.md 2>/dev/null || echo absent` — if present, first
  run the "Pre-step — Sweep externally-checked items" procedure defined at the
  top of `.claude/commands/test-companion.md` to move any `- [x]` entries from
  Pending to Completed, then count items in the Pending section

If either has content, include a brief note alongside the proposal:
> "Note: X open questions and Y pending tests remain from prior builds.
> Run `/test-companion` to address them."

Present the proposed task (or 3 options) to the user in a short paragraph:
- What the task is
- Why it is the right next step (which audience or principle it serves)
- Rough scope (a few hours? a day?)

**Stop here and wait for explicit confirmation before writing any code,
creating any branch, or running any commands.**

If the user modifies the proposal, confirm the adjusted scope before proceeding.

---

## Step 4 — Resolve or create the working branch

Before creating any branch, check for an existing one:

1. Run `git branch --show-current` — if not on `main` or `dev`, you are already on a
   working branch; use it.
2. Run `git fetch` then `git branch -r --no-merged dev` to list all remote
   branches ahead of dev. If any appear, present them to the user and ask
   whether one should be used for this task.
3. Run `gh pr list --state open` and check whether any open PR already targets
   this task's scope.

If an existing branch is identified, check it out (`git checkout <branch>`) rather
than creating a new one.

If no matching branch exists, ensure dev is current before branching:
- Run `git checkout dev`
- Run `git pull`
- Run `git checkout -b feature/<name>`

Never create a branch from any base other than an up-to-date dev.

---

## Step 5 — Hand off to `/goal`

Once the user confirms and the branch is resolved:

**5a. Write `.build/session-plan.md`** (create the `.build/` directory if it does not exist):

```
Task: [one sentence]
Approach: [2–3 sentences on implementation strategy]
Key files: [list files most relevant to this task]
Open questions: [any unresolved questions, or "none"]
Verify: [a concrete, observable condition that is true when this task is complete — e.g., "PR is open, all CI checks pass, and the feature behaves as described in the task"]
```

**5b. Confirm the goal condition**

Present the `Verify:` field from `.build/session-plan.md` to the user:

> "Here's the goal condition I'll use to know when this task is done:
> [Verify: contents]
> Does this correctly capture done? Adjust if needed."

Update `.build/session-plan.md` if the user refines it.

**5c. Invoke /goal**

`/goal` is a Stop-hook wrapper — after each turn, a fast evaluator checks the condition against the conversation transcript. It does not add orchestration; the agent runs whatever the condition tells it to run. So bundle the full sequence into the condition itself.

Run `/goal` with this template (substitute `[Verify: contents]` from session-plan.md):

```
/goal Implement and ship the task described in .build/session-plan.md.
Sequence:
1. Read CLAUDE.md, docs/architecture.md, and docs/project-vision.md before any code changes.
2. Run typecheck, lint, and tests (per CLAUDE.md) to establish a clean baseline.
3. Implement per the Approach in session-plan.md. Follow commit conventions from CLAUDE.md.
4. Re-run typecheck, lint, and tests; fix any failures introduced.
5. Update BACKLOG.md (check off completed items, add emergent ones); update docs/project-vision.md or docs/architecture.md if new principles or constraints were established; append any unresolvable open questions to .build/OPEN_QUESTIONS.md (Unresolved section) with question, default used, revisit condition, and today's date.
6. If user-visible behavior changed and docs/user-guide.md is populated (no "> **Template:**" marker), update it. Same check for docs/admin-guide.md if config/env/deployment changed. README.md if commands or structure changed.
7. Spawn a review sub-agent: it reads docs/architecture.md and every changed file, checks for violations of CLAUDE.md and architecture.md constraints. Fix autonomously for clear rule violations or mechanical style; stop and ask the user only for genuine design decisions. Up to 5 rounds, with each follow-up scoped to files changed in the prior round.
8. Spawn a security sub-agent: it reads every changed file and checks for exposed secrets/credentials, injection vulnerabilities (SQL, shell, XSS, path traversal), sensitive data in logs or error responses, insecure defaults (disabled TLS, permissive CORS, missing auth), and known CVEs (npm audit / pip-audit). Fix autonomously where the correct fix is unambiguous; stop and ask the user otherwise.
9. Open the PR: `gh pr create --base dev`, using the three-section test plan format from CLAUDE.md (CI / Automated / Manual). Report the URL.
10. Monitor CI with `gh pr checks <number>`; for failures, fix autonomously when mechanical (type error, lint, broken import, failing test caused by these changes); stop and ask the user when root cause requires a design decision. Up to 5 rounds.

Stop and return control to the user any time a step requires a decision you cannot resolve autonomously.

Done when: [Verify: contents from session-plan.md]

Stop after 40 turns if the condition has not been met.
```

When the goal clears (condition met or turn cap hit), proceed to Step 6.

---

## Step 6 — Docs update and cleanup

**Stub check:** Review the list of files changed in this session's PR.

- If any changed file implements user-visible behavior and `docs/user-guide.md`
  still contains the `> **Template:**` stub marker: propose a dedicated follow-on
  docs task to the user. Do not attempt to populate it inline.
- If any changed file touches config, environment variables, or deployment and
  `docs/admin-guide.md` still contains the stub marker: same.
- If the guide docs are already populated, they were updated during the
  `/goal`-driven implementation in Step 5 — no action needed here.
- If neither condition applies (pure refactor, tooling, infrastructure): skip.

Mention any stub docs that need a dedicated pass alongside the PR URL and let the
user decide whether to act now or defer.

**Cleanup:** Delete `.build/session-plan.md` if it exists.

**Pending items:** Re-read `.build/OPEN_QUESTIONS.md` and count Unresolved items.
If the count is higher than it was in Step 3 (or greater than zero if the file
didn't exist in Step 3), report the delta in the final summary alongside the PR URL
(e.g., "1 new open question added — run `/test-companion` to address it").

---

## Notes

- Token budget: each sub-agent starts with a fresh context window and has no memory of prior sub-agent runs.
- The `.claude/` directory is version-controlled in this repo (except
  `settings.json` and `.build/`, which are gitignored).
  Changes to commands should be committed on a feature branch like any other code change.
