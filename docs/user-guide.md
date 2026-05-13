# Tonal Explorer — User Guide

---

## Overview

Tonal Explorer is an interactive music theory tool for exploring keys, modes,
scales, and harmony. Every change you make — picking a root, switching modes,
selecting a chord — instantly updates the scale strip, harmony grid, keyboard,
fretboard, and circle of fifths, and routes through a built-in synthesizer so
theory is always connected to sound.

It is built for students, hobbyist musicians, songwriters, music teachers, and
anyone curious about how music fits together.

## Getting Started

1. Visit **tonalexplorer.com**.
2. Pick a root note and a mode using the Key & Mode knobs.
3. Tap a note on the scale strip or a chord in the harmony grid to hear it.
4. Use the menu (top right) to show or hide sections, and the share button to
   capture a snapshot of the current view.

Browsers require a user interaction before audio can play. The app starts
muted; tap the volume knob once to unmute and unlock sound for the session.
After that, scale tiles, chords, and the metronome all play through.

## Features

### Key & Mode

Three analog-style knobs: **ROOT** sets the tonal center, **FAMILY** chooses
the scale family (Major, Melodic Minor, Harmonic Minor, Harmonic Major, Double
Harmonic), and **MODE** picks one of the seven modes within that family. Drag
the knob, or tap its LCD to open a picker.

### Scale Explorer

Three exploratory knobs: **BRIGHTNESS** sorts the current family's modes from
darkest to brightest, **TENSION** reorders them by relative dissonance, and
**VOLUME** controls the synth output (tap to mute or unmute).

### Scale Strip

A chromatic row of twelve note tiles for the current key, with active scale
degrees highlighted and excluded notes dimmed. Roman numerals beneath each
active tile show the diatonic chord quality for that degree. Tap a tile to
play it; the description below the strip names the current mode in context.

### Harmony Grid

Seven rows — one per scale degree — with columns for triad, 7th, 9th, 11th,
and 13th extensions. Use the degree header buttons (3 5 7 9 11 13) to filter
how far chords extend globally. Within a row, tap a ghost note to extend just
that chord, or tap an active note to reduce the row to that degree. Selecting
any chord highlights it and updates every visualizer.

### Keyboard Visualizer

A piano keyboard that lights up scale tones, distinguishes the tonic, and
highlights chord tones for the currently selected chord. Use the voicing
navigator (prev/next arrows) to cycle through root position, inversions, and
Drop 2 / Drop 3 voicings for 7th chords.

### Fretboard Visualizer

A guitar fretboard showing the active scale and selected chord voicing across
twelve frets. **Tap any string label** on the left edge to open the tuning
selector and switch to a preset alternate tuning (Open G, Open D, Drop D,
DADGAD, and more). The voicing navigator cycles through curated open shapes
and algorithmically generated fingerings; in alternate tunings the app
favors voicings that ring as many open strings as the tuning allows.

### Circle of Fifths

An interactive circle showing all twelve keys. Tap a wedge to jump the whole
app to that key; the relative mode follows automatically.

### Metronome

Start and stop, set BPM directly, change the time signature, and use tap
tempo to find a feel. The downbeat is accented.

### Chromatic Tuner

Microphone-based pitch detection with a cents readout and an animated needle.
Useful for quick tuning checks alongside the fretboard's active tuning.

## Sharing

The share button (top right) captures the current view as a PNG. On devices
that support the native share sheet, the image is shared with the current URL;
otherwise it downloads directly. The URL itself encodes the key, family, and
mode, so pasting a link puts another viewer in the same state.

## FAQ

**Why don't I hear sound?**
The app starts muted. Tap the volume knob in the Scale Explorer to unmute —
this also unlocks the synth for the rest of the session.

**Why is /v2 redirecting?**
The React app is now the primary site at the root URL. The old `/v2.html`
address redirects to `/` so any saved links keep working.
