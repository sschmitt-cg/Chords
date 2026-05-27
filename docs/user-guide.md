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
the knob, or tap it to open a picker.

### Scale Explorer

Three exploratory knobs: **BRIGHTNESS** scans every mode across all scale
families from darkest to brightest and can shift the family as well as the
mode. Modes are ordered by their sharp-vs-flat balance (the canonical
fifth-cycle brightness measure), then by 3rd quality within a tier. Modes with
the same net sharp/flat balance appear in the same group; the picker shows a
thin divider between groups so you can feel one "step in brightness" vs. moving
between flavors at the same brightness level. **TENSION** steps between three
settings based on the number of augmented 2nds (unusually large gaps between
adjacent scale notes), and **VOLUME** controls the synth output (tap to mute or
unmute).

### Scale Strip

A row of note tiles for the current key. The seven scale tones are
full-sized buttons. In portrait orientation, the five non-scale chromatic
positions collapse into narrow dotted separators that visually mark the
half-step gaps between adjacent scale tones; in landscape there is room
for every chromatic position, so non-scale notes return as full-width
dashed-border tiles with their note names. Roman numerals beneath each
active tile show the diatonic chord quality for that degree. Tap a tile
to play it; the description below the strip names the current mode in
context.

Swipe the strip horizontally to rotate the tonal center across the scale's
notes — same seven pitches, different note as "home." This is the mobile
equivalent of the **MODE** knob in the Scale Explorer.

Drag the strip vertically to retune the root chromatically — the strip
outlines in the accent color and a chip shows how many half-steps you've
shifted. Drag up to raise the root, drag down to lower it; all notes move
together with intervals preserved. This is the mobile equivalent of the
**ROOT** knob.

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

### Printing

Use your browser's **Print** command (Cmd+P on macOS, Ctrl+P on Windows) for
a single-page handout that mirrors the share image — title, scale notes, a
full keyboard and fretboard with the scale color-coded, and one row per
diatonic triad with a mini keyboard and fretboard showing the chord shape.

## FAQ

**Why don't I hear sound?**
The app starts muted. Tap the volume knob in the Scale Explorer to unmute —
this also unlocks the synth for the rest of the session.

## Open-source licenses

Tonal Explorer is built with open-source software. Attribution and license
text for every bundled third-party package are listed in
[NOTICE.md](../NOTICE.md) in the repository.
