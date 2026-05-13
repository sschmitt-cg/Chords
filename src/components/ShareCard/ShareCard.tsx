import { forwardRef } from 'react'
import type React from 'react'
import { useTonalStore } from '../../store/index'
import { chordNameForRow, pcName, wrap } from '../../theory/index'
import {
  computeKeyboardVoicings,
  computeGuitarVoicings,
  type KeyboardVoicing,
  type GuitarVoicing,
} from '../../theory/voicings'
import type { HarmonyRow, GuitarTuning } from '../../theory/types'
import styles from './ShareCard.module.css'

// html-to-image clones the element into a new document and can't follow nested
// CSS variable chains (--pc-color → var(--pc-N) → hex). Resolve to the actual
// hex value from :root so colors survive both PNG capture and print.
function resolvedPcColor(pc: number): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--pc-${wrap(pc, 12)}`)
    .trim()
}

const KEY_WHITE  = '#ffffff'
const KEY_BLACK  = '#3d4256'
const KEY_BORDER = '#0c1020'

// Two-octave keyboard layout. 14 white keys, 10 black keys.
const WHITE_PC_SEQUENCE = [0, 2, 4, 5, 7, 9, 11]
const BLACK_PC_OFFSETS  = [1, 3, 6, 8, 10]
// Per-octave black-key horizontal positions: each black key sits between white
// keys at indices (between, between+1).
const BLACK_KEY_BETWEEN = [0, 1, 3, 4, 5]

interface ChordRowData {
  row: HarmonyRow
  rootPc: number
  chordName: string
  keyboardVoicing: KeyboardVoicing | undefined
  guitarVoicing: GuitarVoicing | undefined
}

const ShareCard = forwardRef<HTMLDivElement>(
  function ShareCard(_props, ref) {
    const tonicLabel       = useTonalStore(s => s.currentTonicLabel)
    const currentMode      = useTonalStore(s => s.currentMode)
    const currentFamily    = useTonalStore(s => s.currentFamily)
    const currentScale     = useTonalStore(s => s.currentScale)
    const currentModeNotes = useTonalStore(s => s.currentModeNotes)
    const modeRootPc       = useTonalStore(s => s.currentModeRootPc)
    const harmonyRows      = useTonalStore(s => s.harmonyRows)
    const guitarTuning     = useTonalStore(s => s.guitarTuning)
    const enharmonicPrefs  = useTonalStore(s => s.enharmonicPrefs)
    const familyId         = useTonalStore(s => s.familyId)
    const modeIndex        = useTonalStore(s => s.modeIndex)

    // URL built from store state synchronously — replaceState effects run async,
    // so this avoids a stale window.location.search during off-screen capture.
    const params = new URLSearchParams({ root: String(modeRootPc), family: familyId, mode: String(modeIndex) })
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`

    const modeNoteSet = new Set(currentModeNotes)

    const chordRows: ChordRowData[] = harmonyRows.map(row => {
      const rootPc = row.notes.find(n => n.degree === 1)?.pc ?? 0
      return {
        row,
        rootPc,
        chordName: chordNameForRow(row, 5),
        keyboardVoicing: computeKeyboardVoicings(row, 5)[0],
        guitarVoicing: computeGuitarVoicings(row, 5, guitarTuning)[0],
      }
    })

    return (
      <div ref={ref} className={styles.card}>
        <header className={styles.cardHeader}>
          <h1 className={styles.title}>{tonicLabel} {currentMode.name}</h1>
          <p className={styles.subtitle}>{currentFamily.name}</p>
        </header>

        <section className={styles.section}>
          <div className={styles.sectionLabel}>Scale</div>
          <div className={styles.scaleRow}>
            {currentScale.spelled.map((note, i) => {
              const pc = currentScale.pitchClasses[i]
              const isRoot = pc === modeRootPc
              return (
                <span
                  key={`${pc}-${note}-${i}`}
                  className={isRoot ? styles.scalePillRoot : styles.scalePill}
                  style={{ background: resolvedPcColor(pc) }}
                >
                  {note}
                </span>
              )
            })}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionLabel}>Keyboard</div>
          <FullKeyboard modeNoteSet={modeNoteSet} modeRootPc={modeRootPc} />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionLabel}>Fretboard</div>
          <FullFretboard
            tuning={guitarTuning}
            modeNoteSet={modeNoteSet}
            modeRootPc={modeRootPc}
            enharmonicPrefs={enharmonicPrefs}
          />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionLabel}>Diatonic Triads</div>
          <div className={styles.triadTable}>
            {chordRows.map(cr => (
              <div key={cr.row.index} className={styles.triadRow}>
                <span
                  className={styles.roman}
                  style={{ color: resolvedPcColor(cr.rootPc) }}
                >
                  {cr.row.degree}
                </span>
                <span className={styles.chordName}>{cr.chordName}</span>
                <div className={styles.triadKeyboard}>
                  <MiniKeyboard voicing={cr.keyboardVoicing} rootPc={cr.rootPc} />
                </div>
                <div className={styles.triadFretboard}>
                  <MiniFretboard
                    voicing={cr.guitarVoicing}
                    tuning={guitarTuning}
                    rootPc={cr.rootPc}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <span className={styles.footerLabel}>Share</span>
          <span className={styles.footerUrl}>{shareUrl}</span>
        </footer>
      </div>
    )
  }
)

export default ShareCard

// ---------- Full keyboard (two octaves) ----------

interface FullKeyboardProps {
  modeNoteSet: Set<number>
  modeRootPc: number
}

function FullKeyboard({ modeNoteSet, modeRootPc }: FullKeyboardProps): React.ReactElement {
  const WHITE_W = 40
  const WHITE_H = 78
  const BLACK_W = 24
  const BLACK_H = 50
  const totalWhites = 14
  const totalW = WHITE_W * totalWhites

  const whiteKeys: React.ReactElement[] = []
  for (let i = 0; i < totalWhites; i++) {
    const octave = Math.floor(i / 7)
    const pc = WHITE_PC_SEQUENCE[i % 7]
    const inScale = modeNoteSet.has(pc)
    const isRoot  = pc === modeRootPc
    whiteKeys.push(
      <div
        key={`w-${i}-${octave}`}
        className={styles.keyWhite}
        style={{
          left: i * WHITE_W,
          width: WHITE_W,
          height: WHITE_H,
          background: inScale ? resolvedPcColor(pc) : KEY_WHITE,
          borderColor: KEY_BORDER,
          borderWidth: isRoot ? 2.5 : 1,
          borderRadius: isRoot ? 0 : '0 0 4px 4px',
        }}
      />
    )
  }

  const blackKeys: React.ReactElement[] = []
  for (let octave = 0; octave < 2; octave++) {
    for (let bi = 0; bi < 5; bi++) {
      const pc = BLACK_PC_OFFSETS[bi]
      const inScale = modeNoteSet.has(pc)
      const isRoot  = pc === modeRootPc
      const between = BLACK_KEY_BETWEEN[bi]
      const leftWhiteIdx = octave * 7 + between
      const left = (leftWhiteIdx + 1) * WHITE_W - BLACK_W / 2
      blackKeys.push(
        <div
          key={`b-${octave}-${bi}`}
          className={styles.keyBlack}
          style={{
            left,
            width: BLACK_W,
            height: BLACK_H,
            background: inScale ? resolvedPcColor(pc) : KEY_BLACK,
            borderColor: KEY_BORDER,
            borderWidth: isRoot ? 2.5 : 1,
            borderRadius: isRoot ? 0 : '0 0 3px 3px',
          }}
        />
      )
    }
  }

  return (
    <div className={styles.fullKeyboard} style={{ width: totalW, height: WHITE_H }}>
      {whiteKeys}
      {blackKeys}
    </div>
  )
}

// ---------- Full fretboard ----------

interface FullFretboardProps {
  tuning: GuitarTuning
  modeNoteSet: Set<number>
  modeRootPc: number
  enharmonicPrefs: Record<number, 'sharp' | 'flat'>
}

function FullFretboard({ tuning, modeNoteSet, modeRootPc, enharmonicPrefs }: FullFretboardProps): React.ReactElement {
  const STRING_H = 18
  const LABEL_W  = 28
  const FRET_W   = 36
  const FRETS    = 12
  const totalW   = LABEL_W + (FRETS + 1) * FRET_W
  const totalH   = STRING_H * 6 + 8

  const markers: React.ReactElement[] = []
  for (const f of [3, 5, 7, 9]) {
    markers.push(
      <div
        key={`m-${f}`}
        className={styles.fretMarker}
        style={{
          left: LABEL_W + f * FRET_W + FRET_W / 2 - 4,
          top: totalH / 2 - 4,
        }}
      />
    )
  }
  markers.push(
    <div key="m-12a" className={styles.fretMarker} style={{ left: LABEL_W + 12 * FRET_W + FRET_W / 2 - 4, top: totalH / 2 - 14 }} />,
    <div key="m-12b" className={styles.fretMarker} style={{ left: LABEL_W + 12 * FRET_W + FRET_W / 2 - 4, top: totalH / 2 + 6 }} />,
  )

  const stringLines: React.ReactElement[] = []
  const stringLabels: React.ReactElement[] = []
  const noteDots: React.ReactElement[] = []

  for (let si = 0; si < 6; si++) {
    const y = STRING_H * si + STRING_H / 2 + 4
    stringLines.push(
      <div
        key={`s-${si}`}
        className={styles.stringLine}
        style={{ top: y, left: LABEL_W, width: totalW - LABEL_W }}
      />
    )
    const openMidi = tuning[si]
    stringLabels.push(
      <div
        key={`sl-${si}`}
        className={styles.stringLabel}
        style={{ top: y - 9, left: 0, width: LABEL_W - 4 }}
      >
        {pcName(wrap(openMidi, 12), enharmonicPrefs)}
      </div>
    )

    for (let f = 0; f <= FRETS; f++) {
      const pc = wrap(openMidi + f, 12)
      if (!modeNoteSet.has(pc)) continue
      const isRoot = pc === modeRootPc
      const cx = LABEL_W + f * FRET_W + FRET_W / 2
      noteDots.push(
        <div
          key={`d-${si}-${f}`}
          className={isRoot ? styles.fretRootDot : styles.fretDot}
          style={{
            left: cx - 7,
            top: y - 7,
            background: resolvedPcColor(pc),
          }}
        />
      )
    }
  }

  return (
    <div className={styles.fullFretboard} style={{ width: totalW, height: totalH }}>
      <div className={styles.nut} style={{ left: LABEL_W + FRET_W - 2, height: totalH - 4, top: 2 }} />
      {markers}
      {stringLines}
      {stringLabels}
      {noteDots}
    </div>
  )
}

// ---------- Mini keyboard (one octave) ----------

interface MiniKeyboardProps {
  voicing: KeyboardVoicing | undefined
  rootPc: number
}

function MiniKeyboard({ voicing, rootPc }: MiniKeyboardProps): React.ReactElement {
  const WHITE_W = 18
  const WHITE_H = 56
  const BLACK_W = 11
  const BLACK_H = 36
  const totalW = WHITE_W * 7

  if (!voicing || voicing.midiNotes.length === 0) {
    return <div className={styles.miniKeyboard} style={{ width: totalW, height: WHITE_H }} />
  }

  // Triads in root position span less than 12 semitones, so collapsing to a
  // single octave by pitch class keeps every voiced note visible.
  const voicedPcs = new Set(voicing.midiNotes.map(m => wrap(m, 12)))

  const whiteKeys: React.ReactElement[] = []
  for (let i = 0; i < 7; i++) {
    const pc = WHITE_PC_SEQUENCE[i]
    const isVoiced = voicedPcs.has(pc)
    const isRoot   = isVoiced && pc === rootPc
    whiteKeys.push(
      <div
        key={`mw-${i}`}
        className={styles.keyWhite}
        style={{
          left: i * WHITE_W,
          width: WHITE_W,
          height: WHITE_H,
          background: isVoiced ? resolvedPcColor(pc) : KEY_WHITE,
          borderColor: KEY_BORDER,
          borderWidth: isRoot ? 2 : 1,
          borderRadius: isRoot ? 0 : '0 0 2px 2px',
        }}
      />
    )
  }

  const blackKeys: React.ReactElement[] = []
  for (let bi = 0; bi < 5; bi++) {
    const pc = BLACK_PC_OFFSETS[bi]
    const isVoiced = voicedPcs.has(pc)
    const isRoot   = isVoiced && pc === rootPc
    const between = BLACK_KEY_BETWEEN[bi]
    const left = (between + 1) * WHITE_W - BLACK_W / 2
    blackKeys.push(
      <div
        key={`mb-${bi}`}
        className={styles.keyBlack}
        style={{
          left,
          width: BLACK_W,
          height: BLACK_H,
          background: isVoiced ? resolvedPcColor(pc) : KEY_BLACK,
          borderColor: KEY_BORDER,
          borderWidth: isRoot ? 2 : 1,
          borderRadius: isRoot ? 0 : '0 0 2px 2px',
        }}
      />
    )
  }

  return (
    <div className={styles.miniKeyboard} style={{ width: totalW, height: WHITE_H }}>
      {whiteKeys}
      {blackKeys}
    </div>
  )
}

// ---------- Mini fretboard ----------

interface MiniFretboardProps {
  voicing: GuitarVoicing | undefined
  tuning: GuitarTuning
  rootPc: number
}

function MiniFretboard({ voicing, tuning, rootPc }: MiniFretboardProps): React.ReactElement {
  const STRING_H = 9
  const FRET_W   = 22
  const HEAD_H   = 12
  const playedFrets = voicing ? voicing.frets.filter((f): f is number => f !== null && f > 0) : []
  const maxFret = playedFrets.length ? Math.max(...playedFrets) : 0
  const fretsShown = Math.max(5, maxFret + 1)
  const totalW = (fretsShown + 1) * FRET_W
  const totalH = HEAD_H + STRING_H * 6 + 4

  if (!voicing) {
    return <div className={styles.miniFretboard} style={{ width: totalW, height: totalH }} />
  }

  const stringLines: React.ReactElement[] = []
  const fretLines: React.ReactElement[] = []

  for (let f = 1; f <= fretsShown; f++) {
    fretLines.push(
      <div
        key={`f-${f}`}
        className={styles.miniFretLine}
        style={{ left: f * FRET_W, top: HEAD_H, height: STRING_H * 6 }}
      />
    )
  }
  for (let si = 0; si < 6; si++) {
    const y = HEAD_H + STRING_H * si + STRING_H / 2
    stringLines.push(
      <div key={`ms-${si}`} className={styles.miniStringLine} style={{ top: y, left: 0, width: totalW }} />
    )
  }

  const indicators: React.ReactElement[] = []
  for (let si = 0; si < 6; si++) {
    const y = HEAD_H + STRING_H * si + STRING_H / 2
    const f = voicing.frets[si]
    if (f === null) {
      indicators.push(
        <span
          key={`mute-${si}`}
          className={styles.headSymbol}
          style={{ left: 0, top: y - 6, width: FRET_W }}
        >×</span>
      )
      continue
    }
    const pc = wrap(tuning[si] + f, 12)
    const isRoot = pc === rootPc
    if (f === 0) {
      indicators.push(
        <span
          key={`open-${si}`}
          className={styles.headSymbol}
          style={{ left: 0, top: y - 6, width: FRET_W }}
        >○</span>
      )
      indicators.push(
        <div
          key={`open-dot-${si}`}
          className={isRoot ? styles.miniFretRootDot : styles.miniFretDot}
          style={{
            left: FRET_W / 2 - 4,
            top: y - 4,
            background: resolvedPcColor(pc),
          }}
        />
      )
      continue
    }
    const cx = f * FRET_W + FRET_W / 2
    indicators.push(
      <div
        key={`n-${si}-${f}`}
        className={isRoot ? styles.miniFretRootDot : styles.miniFretDot}
        style={{
          left: cx - 5,
          top: y - 5,
          background: resolvedPcColor(pc),
        }}
      />
    )
  }

  return (
    <div className={styles.miniFretboard} style={{ width: totalW, height: totalH }}>
      <div className={styles.miniNut} style={{ left: FRET_W - 1, top: HEAD_H, height: STRING_H * 6 }} />
      {fretLines}
      {stringLines}
      {indicators}
    </div>
  )
}
