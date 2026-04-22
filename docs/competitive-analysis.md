# Competitive Analysis

Status: **research — April 2026**
Scope: browser-based music theory / tonal exploration tools in the same
category as Tonal Explorer.

This document surveys three web apps that overlap meaningfully with
Tonal Explorer's goals (interactive exploration of scales, modes, and
chords with visual and audio feedback), summarizes each, and identifies
concrete features Tonal Explorer should consider adding based on
observed competitive gaps.

---

## Summary

| App | Category focus | Free? | Closest overlap with Tonal Explorer |
|---|---|---|---|
| **[muted.io](https://muted.io)** | General music theory learning | Yes | Highest — interactive piano + fretboard + scale/chord references |
| **[Hooktheory / Hookpad](https://www.hooktheory.com)** | Songwriting with theory-aware analysis | Freemium | Chord-progression / Roman numeral analysis |
| **[Oolimo](https://www.oolimo.com)** | Guitar-focused chord / scale reference | Yes (ad-supported) | Fretboard + chord / scale reference, ear training |

Tonal Explorer's unique strengths (deep mode-family exploration, tactile
ScaleNavigator, brightness ordering) aren't directly matched by any of
the three. Its biggest visible gaps are **shareable state**, a **Circle
of Fifths** visualizer, **MIDI input**, and **ear training**.

---

## The landscape

The "interactive music theory webapp" category splits into three rough
clusters:

1. **Reference tools** — visual lookups for scales / chords / intervals
   across piano and fretboard. Examples: muted.io, Oolimo, scales-chords.com.
2. **Songwriting tools** — scratchpads that let you place chords on a
   timeline with theory-aware annotation. Example: Hooktheory / Hookpad.
3. **Learning tools** — narrative lessons, quizzes, ear training.
   Examples: musictheory.net, teoria.com, LightNote.

**Tonal Explorer sits primarily in cluster 1** (reference / exploration)
but has ambitions into cluster 2 (progression builder in BACKLOG Phase 3)
and cluster 3 (ear training in BACKLOG Phase 5). The three competitors
below were chosen because they represent best-in-class examples from
each cluster that Tonal Explorer overlaps with.

---

## 1. muted.io

**What it is.** A free, ad-free collection of interactive music theory
tools, covering almost everything under the "reference" umbrella:
circle of fifths, piano chords, guitar chords, scales, modes, intervals,
chromatic tuner, voice tuner, virtual piano, virtual fretboard (guitar /
bass / ukulele), chord transposer, cheat sheet.

**Core features relevant to Tonal Explorer.**

- **Interactive Circle of Fifths.** Click a key to select it; toggle
  between major (Ionian) and minor (Aeolian) views. The outer ring
  shows Roman numeral degrees; the main ring shows the 12 keys; the
  inner ring shows relative keys. This is muted.io's signature tool.
- **Virtual piano + virtual fretboards** (guitar, bass, ukulele). Click
  notes to hear and see them.
- **Scale references** across piano and guitar, including modes.
- **Chord references** with shape diagrams.
- **Chromatic and voice tuners** using microphone input.
- **Desktop version** (paid, optional) — packages the tools offline.

**Strengths.**

- Breadth: covers basically every classical reference a student might
  want, each rendered as its own interactive widget.
- Visual design is clean, modern, mobile-friendly.
- Free and ad-free. Donation-funded, with an optional paid desktop app.

**Gaps (relative to what they could offer).**

- Tools are **siloed** — each widget has its own page and does not
  share state with the others. Picking a key on the circle of fifths
  does not update the scale page.
- No **progression builder** / compositional surface.
- No **modes beyond Ionian and Aeolian** on the circle of fifths itself
  (there's a separate modes page).
- No **MIDI input**.
- Shareable URLs are not a prominent feature.

**Business model.** Donations + paid desktop app.

**Takeaway for Tonal Explorer.** muted.io is the closest direct
competitor; it has a much broader tool suite but a much shallower
treatment of modes and harmony. Tonal Explorer's unified store
(everything recomputes together) is a quiet structural advantage we
should lean into. The biggest single thing we're missing from muted.io's
kit is the **Circle of Fifths**.

---

## 2. Hooktheory / Hookpad

**What it is.** A web-based songwriting tool with deep theory awareness.
The main product is **Hookpad**, a chord-and-melody sketchpad where you
write progressions using **Roman numerals / Nashville numbers** in a
chosen key. Supplemented by **TheoryTab** — a database of ~50,000
community-transcribed popular songs, each annotated with chords, melody,
and mode, so you can see exactly how a hit is built harmonically. A
2024 addition, **Aria**, is a generative AI feature that writes chords
for a melody or melody for chords.

**Core features relevant to Tonal Explorer.**

- **Roman-numeral-native chord entry.** You don't write "C → F → G",
  you write "I → IV → V" in the key of C. Change the key and everything
  transposes.
- **Smart chord palette** that adapts to the chosen key + mode, with
  one-click chord entry.
- **Trends tool** — shows, statistically, which chords commonly come
  next in the song database given your current progression.
- **Supports modes** — not just major and minor.
- **Shareable URLs / project links** (a core part of how TheoryTab works).
- **Embedded TheoryTab widgets** — blog posts and lessons can embed
  interactive chord/melody players pointing at a specific song.

**Strengths.**

- Best-in-class for **progression-level** work. Every chord is
  theory-aware by construction.
- The TheoryTab corpus is a durable moat — you cannot replicate 50k+
  annotated transcriptions quickly.
- Aria AI adds a generative hook that none of the other three have.

**Gaps.**

- Heavy focus on **composition**; weaker on pure **exploration** (if
  you just want to see what the 9th chord in C Lydian looks like, it's
  fast to do in Tonal Explorer, slower in Hookpad).
- No **fretboard visualizer** as a primary surface.
- No tuner, no circle of fifths.
- **Paid**: Hookpad requires a subscription for full use. TheoryTab is
  free to read; writing tabs requires an account.

**Business model.** Freemium. Hookpad and full TheoryTab write access
are paid; reading TheoryTab + limited Hookpad are free.

**Takeaway for Tonal Explorer.** The planned Progression Builder
(BACKLOG Phase 3) is trying to reach this territory. Two features
Hookpad has that Tonal Explorer should adopt regardless of when
Progression Builder lands are **shareable URLs** (so any
key+mode+progression combo has a link) and **functional harmony labels**
(T / S / D), which are already in BACKLOG as a small item.

---

## 3. Oolimo

**What it is.** A guitar-centric chord and scale toolkit. Free web
version with a companion mobile app (iOS + Android). Its interactive
fretboard is the centerpiece.

**Core features relevant to Tonal Explorer.**

- **Interactive fretboard** with note + interval display and audio
  playback (single notes or full chord).
- **Chord Analyzer.** Place finger positions on the fretboard; Oolimo
  names the chord, lists its notes and intervals, and offers inversions.
- **Chord Progression Matrix.** For any key, shows the main chord types
  available for every possible scale degree — similar to Tonal Explorer's
  HarmonyGrid but optimized for guitar chord selection.
- **Scale analyzer** across the fretboard.
- **Ear training and quizzes** — intervals, chord construction, voicings,
  tensions, harmonic context. Play-based learning.
- **Alternative tunings** — preset library plus a custom tuning manager.
- **Day/night mode**, left-handed mode.

**Strengths.**

- The **chord analyzer** (fretboard → chord name) is a real
  differentiator. Tonal Explorer currently only goes the other direction
  (chord name → fretboard positions).
- **Ear training** is integrated with the reference material — you learn
  while you're exploring.
- **Alternative tunings** are first-class, not bolted on.

**Gaps.**

- Guitar-first. Piano users get less.
- No progression sketchpad / composition surface.
- No circle of fifths.
- No shareable URLs for specific fretboard states.
- The ear-training surface is structured as quizzes, not free
  exploration.

**Business model.** Ad-supported web, paid mobile apps.

**Takeaway for Tonal Explorer.** Oolimo validates two BACKLOG items as
high-value: **alternative tunings** (Phase 4) and **ear training**
(Phase 5). It also points at a feature Tonal Explorer doesn't have
anywhere on its roadmap — a **chord analyzer** (reverse lookup from a
user-placed note set to a chord name). That's a natural extension of
the existing `chordNameForRow` logic.

---

## Feature matrix

Best-guess as of April 2026. "—" = not a primary feature.

| Feature | Tonal Explorer | muted.io | Hookpad | Oolimo |
|---|---|---|---|---|
| Piano visualizer | ✅ | ✅ | ✅ | — |
| Guitar fretboard | ✅ | ✅ | — | ✅ |
| Scale / mode reference | ✅ (35 modes × 5 families) | ✅ (modes page) | ✅ | ✅ |
| Harmony grid / chord extensions | ✅ | partial | ✅ (chord palette) | ✅ (matrix) |
| Web Audio synth | ✅ | ✅ | ✅ | ✅ |
| **Circle of Fifths** | ❌ | ✅ | — | — |
| **Shareable URLs** | ❌ | — | ✅ | — |
| **MIDI input** | ❌ | — | ✅ | — |
| Metronome | planned | — | ✅ | — |
| Chromatic tuner | planned | ✅ | — | ✅ |
| Progression builder | planned | — | ✅ (Hookpad) | partial |
| Ear training | planned | — | — | ✅ |
| Alternative tunings | planned | partial | — | ✅ |
| Chord identifier (reverse lookup) | ❌ | — | — | ✅ |
| AI / generative assist | ❌ | — | ✅ (Aria) | — |
| Embed / iframe widgets | ❌ | — | ✅ (TheoryTab) | — |
| Offline desktop app | ❌ | ✅ | — | — |
| Mobile app | planned (iOS) | — | — | ✅ (iOS + Android) |
| Dark mode | partial (dark theme only) | ✅ | ✅ | ✅ |
| Left-handed fretboard | ❌ | partial | — | ✅ |

---

## Where Tonal Explorer already stands out

These are real differentiators we should not lose sight of:

- **Brightness-ordered mode exploration across 5 scale families × 7 modes
  (35 total).** No competitor offers this. muted.io covers modes as a
  flat list; Hookpad focuses on major/minor + a few modes; Oolimo is
  scale-name driven.
- **Tactile ScaleNavigator** (analog knobs + LCD displays + brightness /
  tension wheels). None of the three competitors try this kind of
  instrument metaphor — they default to dropdowns and buttons.
- **Proportional chromatic ScaleStrip with correct enharmonic spelling.**
  Tonal Explorer respects Cb, E#, B# in context; most competitors fall
  back to a single sharp-or-flat spelling.
- **Unified store.** One source of truth — picking a key updates the
  scale, harmony grid, keyboard, fretboard, and audio engine all in one
  recompute. muted.io's siloed widgets can't do this.
- **Light cards on a dark blue gradient** visual language is distinctive;
  most competitors use flat white backgrounds or generic dark themes.

## Where Tonal Explorer lags

Ordered roughly by impact × effort (high impact, low effort first):

1. **No shareable URLs.** This is a ~one-afternoon feature that
   Hookpad has turned into a viral loop. Biggest quick win.
2. **No Circle of Fifths visualizer.** Category-table-stakes among
   reference tools. muted.io's most recognizable surface.
3. **No MIDI input.** Uniquely differentiating — none of the three
   competitors offer it as a primary feature. Biggest "wow" potential
   for the effort involved.
4. **No ear training.** Oolimo has this and it's a natural fit for the
   existing scale/key context. BACKLOG Phase 5.
5. **No progression builder.** Hookpad's core. BACKLOG Phase 3.
6. **No chord identifier (reverse lookup).** Oolimo's sharpest
   differentiator. Not currently on BACKLOG.
7. **No AI / generative assistance.** Hookpad's Aria. Heavy lift;
   probably premature for a solo project.
8. **No embeddable widgets.** Hookpad does this via TheoryTab. Would
   unlock blog / lesson distribution. Medium lift.

---

## Recommended next moves

Based on the analysis above, three features have the best
impact-per-effort ratio and fill the sharpest competitive gaps. Each
is being proposed as a separate GitHub issue with a detailed
implementation plan:

1. **Shareable URLs.** Encode key + family + mode + enharmonic
   preferences (and eventually progression) in the URL hash so any
   screen state has a permanent link. Low effort, wide reach.
2. **Interactive Circle of Fifths.** A new top-level visualizer
   section that mirrors muted.io's signature tool but leans into Tonal
   Explorer's unified store — clicking a wedge drives the entire app.
3. **Web MIDI input support.** Let users play their connected MIDI
   controller and see notes light up on the keyboard + fretboard +
   scale strip, with chord detection from simultaneous notes. Unique
   among the competitors.

These three deliberately mix different surfaces (routing, new
component, new input modality) so they can ship in parallel without
stepping on each other.

### Features intentionally deferred

- **Progression Builder** and **Ear Training** are already on BACKLOG
  (Phase 3 and 5); this analysis confirms they are well-aimed but does
  not change their priority.
- **Chord identifier** (Oolimo's reverse lookup) is attractive but
  fights for the same UI surface as the existing HarmonyGrid — worth a
  dedicated design pass before committing, so it's not proposed here.
- **AI / generative assist** is premature until the core
  exploration + progression surfaces are solid.

---

## Sources

- [muted.io — Magical Music Theory Tools](https://muted.io/)
- [muted.io — Interactive Circle of Fifths](https://muted.io/circle-of-fifths/)
- [muted.io — Interactive References to Musical Scales & Modes](https://muted.io/scales/)
- [muted.io — Tools index](https://muted.io/tools/)
- [Hooktheory — home](https://www.hooktheory.com/)
- [Hooktheory — Hookpad](https://www.hooktheory.com/hookpad)
- [Hooktheory — TheoryTab](https://www.hooktheory.com/theorytab)
- [Hooktheory — Free resources blog post](https://www.hooktheory.com/blog/free-hooktheory-resources/)
- [Oolimo — home](https://www.oolimo.com/en/)
- [Oolimo — Chord Progression Matrix](https://www.oolimo.com/en/chord-progressions/matrix)
- [Oolimo — Guitar Chord Analyzer](https://www.oolimo.com/en/guitar-chords/analyze)
- [Can I Use — Web MIDI API](https://caniuse.com/midi)
- [MDN — Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
