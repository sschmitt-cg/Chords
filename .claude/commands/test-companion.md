# /test-companion

Guide the user through pending manual tests and open questions from prior builds.
Reads `.build/TEST_TRACKER.md` and `.build/OPEN_QUESTIONS.md`, walks through each
item interactively, and updates both files in real time after each response.

---

## Step 1 — Load pending items

Check whether actionable content exists:
- Run `ls .build/TEST_TRACKER.md 2>/dev/null || echo absent` — if present, read the
  Pending section and count items
- Run `ls .build/OPEN_QUESTIONS.md 2>/dev/null || echo absent` — if present, read the
  Unresolved section and count items

If neither file exists or both sections are empty: report "Nothing pending — all
clear." and stop.

---

## Step 2 — Report scope and ask for order

Present a summary of what's pending (omit any line that has zero items):
- "X pending tests across Y groups"
- "Z unresolved questions"

If only one type of content exists, skip the order question and proceed directly
to the relevant step (Step 3 for tests, Step 4 for questions).

If both exist, ask: "Start with **tests**, **questions**, or **both interleaved**?"
(Interleaved means: tests and questions are interspersed throughout the session.
Where a question is clearly related to a test area by topic, present it after that
area's tests. Otherwise, distribute questions evenly across the session. This is
best-effort — questions are not area-tagged.)

---

## Step 3 — Manual testing session

Work through the Pending section of TEST_TRACKER.md one test at a time, in the
order they appear (the consolidation phase has already optimized this order —
do not re-sort).

For each test:

1. Show the area heading and test title
2. Show the numbered steps and expected result
3. Ask: **Pass / Fail / Skip**

**Pass:**
- Remove the entry from the Pending section
- Append it to the Completed section as `[x] [title] — passed [today's date]`
- Write the update to TEST_TRACKER.md immediately
- Proceed to the next test

**Fail:**
- Ask the user to briefly describe what actually happened
- Record the failure note on the entry
- Offer three options (pick one):
  1. Log as a GitHub issue (`gh issue create`)
  2. Add to `BACKLOG.md` as a bug — append under a `## Bugs` section (create it
     at the top of the file, before Phase sections, if it doesn't exist)
  3. Just note the failure and continue
- Take the chosen action, then write the update to TEST_TRACKER.md
- Leave the entry in Pending, changing `[ ]` to `[!]` (known failure awaiting fix)
- Proceed to the next test

**Skip:**
- Ask for a brief reason (e.g., "can't test locally", "waiting on data", "not yet built")
- Append `— skipped [today's date]: [reason]` to the entry
- Leave the entry in Pending
- Write the update to TEST_TRACKER.md immediately
- Proceed to the next test

---

## Step 4 — Open questions session

Work through the Unresolved section of OPEN_QUESTIONS.md one question at a time.

For each question:

1. Show the question, current default used, revisit condition, and which build added it
2. Ask for a response — the user may **answer**, **defer**, or **dismiss**

**Answered:**
- Move the entry from Unresolved to the Resolved section with:
  - The answer
  - `Resolved: [today's date]`
- If the answer differs from the default used, add: `Note: default was [X] —
  code may need updating.` Then ask the user: "Should I add a BACKLOG.md item to
  implement this correction?" If yes, append it as a bug/task item.
- Write the update to OPEN_QUESTIONS.md immediately

**Deferred:**
- Leave the entry in Unresolved
- Append `Last reviewed: [today's date]` to the entry
- Write the update to OPEN_QUESTIONS.md immediately

**Dismissed:**
- Remove the entry from Unresolved entirely
- Write the update to OPEN_QUESTIONS.md immediately

---

## Step 5 — Session summary

When all items have been addressed (or the user stops early):

Report:
- **Tests:** X passed, Y failed (with issue/backlog links if created), Z skipped
- **Questions:** X answered, Y deferred, Z dismissed
- If any items remain pending: "Run `/test-companion` again to continue."
- If any answered question flagged a code update: list those questions and what
  to revisit

---

## Notes

- Write every update immediately after the user responds — do not batch changes.
  If the session is interrupted, files reflect the state up to the last completed item.
- The Completed section of TEST_TRACKER.md and the Resolved section of
  OPEN_QUESTIONS.md are append-only — never remove or modify entries there.
- Do not re-sort or regroup tests during a session. If consolidation is needed
  after adding new tests, it happens during the auto-build wrap-up phase (Phase 4c),
  not here.
- TEST_TRACKER.md checkbox conventions: `[ ]` pending, `[x]` passed, `[!]` failed
  (known failure awaiting a fix — still in Pending until resolved).
