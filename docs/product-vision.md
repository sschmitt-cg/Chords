# Tonal Explorer — Product Vision

Status: **living document**

This document captures the goals, audiences, and design principles that should
inform every feature and implementation decision. Any agent or collaborator
working on this project should read it before proposing or starting work.

---

## What it is

Tonal Explorer is an interactive music theory tool for anyone curious about how
music works — whether they are sitting at an instrument, teaching a lesson,
writing a song, or just exploring for the first time. It combines visual
representations of scales, modes, and harmony with a built-in synthesizer so
that theory is always connected to sound.

---

## Audiences

These audiences are not mutually exclusive. A single user might be all of them
at different moments.

| Audience | What they need |
|---|---|
| **Curious experimenters** | Low barrier to entry; immediate feedback; no assumed knowledge |
| **Students** | Clear labels; ability to understand *why* something sounds the way it does |
| **Teachers** | A reliable reference surface they can share with or demonstrate to students |
| **Instrument noodlers** | Tactile feel; quick key / mode changes; audio always available |
| **Serious practitioners** | Full harmonic depth (extensions, non-diatonic families, enharmonic precision) |

Musician-specific terminology (mode names, Roman numerals, chord extensions) is
appropriate throughout. Where a label might confuse a newcomer, the right
solution is explanation — an info panel, tooltip, or glossary — not
dumbing down the label.

---

## Platform goals

Every feature must work well on **both delivery surfaces**:

1. **Progressive web app** — desktop and mobile browser. The full experience,
   no installation required.
2. **Native iOS app** — Capacitor wrapping WKWebView. Chosen specifically because
   the Web Audio API (oscillators, autocorrelation, gain graph) runs natively in
   WKWebView; React Native cannot do this.

### Practical implications

- All touch targets must be ≥ 44×44pt (Apple HIG minimum).
- Use `env(safe-area-inset-*)` for bottom/top padding.
- Use `rem` units; avoid fixed `px` font sizes.
- Test layout in both portrait and landscape on a phone-sized viewport, not just
  a desktop browser.
- No feature that works on desktop but silently breaks on mobile.

---

## Design principles

### Exploration first, reference also

The primary mode is discovery: what happens when I move to this mode? What does
this chord sound like? How does the harmony change? Reference use (looking up a
specific scale or chord) is equally valid and should be fast, but the app should
always invite the user to go one step further.

### Tactile feel

Controls should feel like instruments, not forms. Knobs that rotate, strips that
respond to swipes, keys and frets that look like their physical counterparts.
This is a strong preference — revisit only if it materially compromises usability
on constrained screen sizes.

### Unified state as a differentiator

One action (changing key, mode, or chord selection) updates everything — scale
strip, harmony grid, keyboard, fretboard, and audio engine — simultaneously.
This is a structural advantage over siloed reference tools. Protect it: new
features should read from and write to the shared Zustand store, never maintain
their own parallel state.

### Depth without gatekeeping

A user who picks up the app for the first time should be able to do something
interesting within seconds. A user who comes back every day for a year should
still be finding new things. Complexity should reveal itself progressively, not
confront the user at the door.

---

## Non-goals (current phase)

- AI / generative composition assistance
- Multi-user or collaborative features
- Offline desktop app (beyond PWA caching)

These may become goals later. For now, they are out of scope so the core
exploration and reference surfaces can be built well.
