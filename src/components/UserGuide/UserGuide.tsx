import type React from 'react'
import styles from './UserGuide.module.css'

interface UserGuideProps {
  onBack: () => void
}

export default function UserGuide({ onBack }: UserGuideProps): React.ReactElement {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          aria-label="Back to app"
          onClick={onBack}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12.5 4L6.5 10l6 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className={styles.title}>User Guide</h1>
      </header>

      <main className={styles.content}>
        <section>
          <h2>Overview</h2>
          <p>
            Tonal Explorer is an interactive music theory tool for exploring
            keys, modes, scales, and harmony. Every change you make — picking a
            root, switching modes, selecting a chord — instantly updates the
            scale strip, harmony grid, keyboard, fretboard, and circle of fifths,
            and routes through a built-in synthesizer so theory is always
            connected to sound.
          </p>
          <p>
            It is built for students, hobbyist musicians, songwriters, music
            teachers, and anyone curious about how music fits together.
          </p>
        </section>

        <section>
          <h2>Getting Started</h2>
          <ol>
            <li>Visit <strong>tonalexplorer.com</strong>.</li>
            <li>Pick a root note and a mode using the Key &amp; Mode knobs.</li>
            <li>Tap a note on the scale strip or a chord in the harmony grid to hear it.</li>
            <li>Use the menu (top right) to show or hide sections, and the share button to capture a snapshot of the current view.</li>
          </ol>
          <p>
            Browsers require a user interaction before audio can play. The app
            starts muted; tap the volume knob once to unmute and unlock sound
            for the session. After that, scale tiles, chords, and the metronome
            all play through.
          </p>
        </section>

        <section>
          <h2>Features</h2>

          <h3>Key &amp; Mode</h3>
          <p>
            Three analog-style knobs: <strong>ROOT</strong> sets the tonal
            center, <strong>FAMILY</strong> chooses the scale family (Major,
            Melodic Minor, Harmonic Minor, Harmonic Major, Double Harmonic), and
            <strong> MODE</strong> picks one of the seven modes within that
            family. Drag the knob, or tap it to open a picker.
          </p>

          <h3>Scale Explorer</h3>
          <p>
            Three exploratory knobs: <strong>BRIGHTNESS</strong> scans every
            mode across all scale families from darkest to brightest and can
            shift the family as well as the mode. Modes are ordered by their
            sharp-vs-flat balance (the canonical fifth-cycle brightness
            measure), then by 3rd quality within a tier. Modes with the same
            net sharp/flat balance appear in the same group; the picker shows
            a thin divider between groups so you can feel one "step in
            brightness" vs. moving between flavors at the same brightness
            level. <strong>TENSION</strong> steps between three settings based
            on the number of augmented 2nds (unusually large gaps between
            adjacent scale notes), and <strong>VOLUME</strong> controls the
            synth output (tap to mute or unmute).
          </p>

          <h3>Scale Strip</h3>
          <p>
            A row of note tiles for the current key. The seven scale tones
            are full-sized buttons. In portrait orientation, the five
            non-scale chromatic positions collapse into narrow dotted
            separators that visually mark the half-step gaps between
            adjacent scale tones; in landscape there is room for every
            chromatic position, so non-scale notes return as full-width
            dashed-border tiles with their note names. Roman numerals
            beneath each active tile show the diatonic chord quality for
            that degree. Tap a tile to play it; the description below the
            strip names the current mode in context.
          </p>
          <p>
            Swipe the strip horizontally to rotate the tonal center across
            the scale's notes — same seven pitches, different note as "home."
            This is the mobile equivalent of the <strong>MODE</strong> knob
            in the Scale Explorer.
          </p>
          <p>
            Drag the strip vertically to retune the root chromatically — the
            strip outlines in the accent color and a chip shows how many
            half-steps you've shifted. Drag up to raise, down to lower; all
            notes move together with intervals preserved. This is the mobile
            equivalent of the <strong>ROOT</strong> knob.
          </p>

          <h3>Harmony Grid</h3>
          <p>
            Seven rows — one per scale degree — with columns for triad, 7th,
            9th, 11th, and 13th extensions. Use the degree header buttons
            (3 5 7 9 11 13) to filter how far chords extend globally. Within a
            row, tap a ghost note to extend just that chord, or tap an active
            note to reduce the row to that degree. Selecting any chord
            highlights it and updates every visualizer.
          </p>

          <h3>Keyboard Visualizer</h3>
          <p>
            A piano keyboard that lights up scale tones, distinguishes the
            tonic, and highlights chord tones for the currently selected chord.
            Use the voicing navigator (prev/next arrows) to cycle through root
            position, inversions, and Drop 2 / Drop 3 voicings for 7th chords.
          </p>

          <h3>Fretboard Visualizer</h3>
          <p>
            A guitar fretboard showing the active scale and selected chord
            voicing across twelve frets. <strong>Tap any string label</strong>
            on the left edge to open the tuning selector and switch to a
            preset alternate tuning (Open G, Open D, Drop D, DADGAD, and
            more). The voicing navigator cycles through curated open shapes
            and algorithmically generated fingerings.
          </p>

          <h3>Circle of Fifths</h3>
          <p>
            An interactive circle showing all twelve keys. Tap a wedge to jump
            the whole app to that key; the relative mode follows automatically.
          </p>

          <h3>Metronome</h3>
          <p>
            Start and stop, set BPM directly, change the time signature, and
            use tap tempo to find a feel. The downbeat is accented.
          </p>

          <h3>Chromatic Tuner</h3>
          <p>
            Microphone-based pitch detection with a cents readout and an
            animated needle. Useful for quick tuning checks alongside the
            fretboard's active tuning.
          </p>
        </section>

        <section>
          <h2>Sharing</h2>
          <p>
            The share button (top right) captures the current view as a PNG.
            On devices that support the native share sheet, the image is shared
            with the current URL; otherwise it downloads directly. The URL
            itself encodes the key, family, and mode, so pasting a link puts
            another viewer in the same state.
          </p>

          <h3>Printing</h3>
          <p>
            Use your browser's <strong>Print</strong> command (Cmd+P on macOS,
            Ctrl+P on Windows) for a single-page handout that mirrors the share
            image — title, scale notes, a full keyboard and fretboard with the
            scale color-coded, and one row per diatonic triad with a mini
            keyboard and fretboard showing the chord shape.
          </p>
        </section>

        <section>
          <h2>FAQ</h2>

          <h3>Why don't I hear sound?</h3>
          <p>
            The app starts muted. Tap the volume knob in the Scale Explorer to
            unmute — this also unlocks the synth for the rest of the session.
          </p>

          <h3>Why is /v2 redirecting?</h3>
          <p>
            The React app is now the primary site at the root URL. The old
            <code> /v2.html</code> address redirects to <code>/</code> so any
            saved links keep working.
          </p>
        </section>
      </main>
    </div>
  )
}
