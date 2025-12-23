// -------------------- NOTE / SCALE LOGIC ------------------------

const NOTE_TO_INDEX = {
  "C": 0,  "C#": 1, "Db": 1,
  "D": 2,  "D#": 3, "Eb": 3,
  "E": 4,
  "F": 5,  "F#": 6, "Gb": 6,
  "G": 7,  "G#": 8, "Ab": 8,
  "A": 9,  "A#": 10, "Bb": 10,
  "B": 11
};

const SCALE_PATTERNS = {
  "Ionian (Major)": [0,2,4,5,7,9,11],
  "Dorian":         [0,2,3,5,7,9,10],
  "Phrygian":       [0,1,3,5,7,8,10],
  "Lydian":         [0,2,4,6,7,9,11],
  "Mixolydian":     [0,2,4,5,7,9,10],
  "Aeolian (Minor)":[0,2,3,5,7,8,10],
  "Locrian":        [0,1,3,5,6,8,10]
};

const MODE_NAMES = [
  "Ionian (Major)",
  "Dorian",
  "Phrygian",
  "Lydian",
  "Mixolydian",
  "Aeolian (Minor)",
  "Locrian"
];

const KEY_OPTIONS = [
  { label: "C", value: "C" },
  { label: "C#/Db", value: "C#" },
  { label: "D", value: "D" },
  { label: "D#/Eb", value: "Eb" },
  { label: "E", value: "E" },
  { label: "F", value: "F" },
  { label: "F#/Gb", value: "F#" },
  { label: "G", value: "G" },
  { label: "G#/Ab", value: "Ab" },
  { label: "A", value: "A" },
  { label: "A#/Bb", value: "Bb" },
  { label: "B", value: "B" }
];

const LETTER_TO_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTERS = ["C","D","E","F","G","A","B"];

// -------------------- STATE ------------------------

let currentKeyIndex = 0;   // tonic pitch class index in KEY_OPTIONS
let currentModeIndex = 0;  // mode index in MODE_NAMES
let currentKeyPc = 0;
let currentScale = { pitchClasses: [], spelled: [] };
let currentChords = { categories: { triads: [], sevenths: [], ninths: [], suspended: [] }, degrees: [] };
let filteredChords = null;
let selectedRootNote = null;
let activeScalePitchClasses = new Set();
let activeChordPitchClasses = null;
let selectedChordName = null;
let selectedChordNotes = null;
let activeChordCategory = null;
let selectedHarmonyChordIndex = null;
let selectedExplorerNotePc = null;
let harmonyRows = [];
let extensionState = { 7: true, 9: false, 11: false, 13: false };
let isMobile = false;
let mobileActivePanel = "keymode";
let globalHarmonyMax = 7;
const rowHarmonyMaxOverrides = new Map();
let stripDragging = false;
let tapStart = null;
const TAP_MOVE_THRESHOLD = 10;
let pillPreview = { keyPc: null, mode: null, forceNoRespell: false, spelledOverride: null, tonicLabelOverride: null };
let dragCooldown = false;
let tileMetrics = { gap: 6, width: 52, segmentWidth: 400, rowHeight: 88 };
const MAX_DRAG_STEPS = 12;
const enharmonicPreferenceByPc = {};
let previewScaleOverride = null;
let highlightRafPending = false;
let pendingHighlightScale = null;
let audioMuted = true;
let audioCtx = null;
let masterGain = null;
let limiter = null;
let mediaDest = null;
let audioOutEl = null;
let playbackToken = 0;
let activeVoices = [];
const AUDIO_MASTER_GAIN = 0.2;
const FLASH_DURATION = 140;
const SCALE_GAP = 0.22;
const SCALE_DUR = 0.32;
const NOTE_GAP  = 0.22;
const NOTE_DUR  = 0.32;
const CHORD_TONE_GAP = 0.18;
const CHORD_TONE_DUR = 0.30;
const STRUM_GAP = 0.02;
const STRUM_DUR = 0.9;
const MUTED_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8l4 4m0 0l-4 4m4-4H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const UNMUTED_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9c1.333 1 2 2.333 2 4s-.667 3-2 4M15 11.5c.667.5 1 1.333 1 2.5s-.333 2-1 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ENHARMONIC_OPTIONS = {
  1: { sharp: "C#", flat: "Db" },
  3: { sharp: "D#", flat: "Eb" },
  6: { sharp: "F#", flat: "Gb" },
  8: { sharp: "G#", flat: "Ab" },
  10: { sharp: "A#", flat: "Bb" }
};
const DEGREE_COLORS = [
  "#ff6f6f",
  "#ff9f43",
  "#ffd166",
  "#5cd39b",
  "#4cc9f0",
  "#7c6dff",
  "#b392f0"
];
const degreeColorByIndex = (idx) => DEGREE_COLORS[wrap(idx, 7)];
const degreeColorByDegree = (degree) => DEGREE_COLORS[wrap(degree - 1, 7)];
const degreeColorForColumn = (degree) => {
  // Map chord tone degrees to base scale degrees: 3->3,5->5,7->7,9->2,11->4,13->6
  const map = { 3: 3, 5: 5, 7: 7, 9: 2, 11: 4, 13: 6 };
  const base = map[degree] || degree;
  return degreeColorByDegree(base);
};

const CHORD_CATEGORIES = [
  { key: "triads", label: "Triads" },
  { key: "sevenths", label: "7ths" },
  { key: "ninths", label: "9ths" },
  { key: "suspended", label: "Suspended" },
  { key: "all", label: "All chords" }
];

// -------------------- AUDIO ------------------------

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function ensureAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!audioCtx) {
    if (!Ctx) return false;
    try {
      audioCtx = new Ctx({ latencyHint: "interactive" });
    } catch (_) {
      audioCtx = new Ctx();
    }
    masterGain = audioCtx.createGain();
    limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-18, audioCtx.currentTime);
    limiter.knee.setValueAtTime(18, audioCtx.currentTime);
    limiter.ratio.setValueAtTime(12, audioCtx.currentTime);
    limiter.attack.setValueAtTime(0.003, audioCtx.currentTime);
    limiter.release.setValueAtTime(0.25, audioCtx.currentTime);

    masterGain.connect(limiter).connect(audioCtx.destination);
  }

  // Keep gain in sync with mute state.
  if (masterGain) {
    const target = audioMuted ? 0 : AUDIO_MASTER_GAIN;
    masterGain.gain.setValueAtTime(target, audioCtx.currentTime);
  }
  return true;
}

async function ensureAudioRunning() {
  if (!ensureAudio()) return false;
  if (!audioCtx) return false;
  try {
    if (audioCtx.state !== "running") await audioCtx.resume();
  } catch (e) {
    console.warn("audioCtx.resume() failed", e);
    return false;
  }
  return true;
}


function stopPlayback() {
  playbackToken += 1;
  if (masterGain && audioCtx) {
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    masterGain.gain.exponentialRampToValueAtTime(AUDIO_MASTER_GAIN, now + 0.08);
  }
  activeVoices.forEach(v => {
    try { v.stop(); } catch (_) {}
  });
  activeVoices = [];
  return playbackToken;
}

const midiToFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function playSynthNote({ midi, when, dur = 0.18 }) {
  if (audioMuted) return;
  ensureAudio();
  try { if (audioCtx && audioCtx.state !== "running") audioCtx.resume(); } catch (_) {}
  if (!audioCtx || !masterGain) return;
  if (!Number.isFinite(midi)) return;
  const start = Math.max(when, audioCtx.currentTime);
  const end = start + dur;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, start);

  const osc = audioCtx.createOscillator();
  osc.frequency.setValueAtTime(midiToFreq(midi), start);

  const harmonic = audioCtx.createOscillator();
  harmonic.type = "sine";
  harmonic.frequency.setValueAtTime(midiToFreq(midi) * 2, start);
  const harmonicGain = audioCtx.createGain();
  harmonicGain.gain.setValueAtTime(0.2, start);
  harmonic.connect(harmonicGain).connect(gain);
  osc.connect(gain);

  gain.connect(masterGain);

  const attack = 0.01;
  const decay = 0.18;
  const sustainLevel = 0.35;
  gain.gain.linearRampToValueAtTime(0.9, start + attack);
  gain.gain.linearRampToValueAtTime(sustainLevel, start + attack + decay * 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.start(start);
  harmonic.start(start);
  osc.stop(end + 0.05);
  harmonic.stop(end + 0.05);

  const voice = {
    stop: () => {
      try { gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.01); } catch (_) {}
      [osc, harmonic, harmonicGain, gain].forEach(node => {
        try { node.stop?.(); } catch (_) {}
        try { node.disconnect?.(); } catch (_) {}
      });
    }
  };
  activeVoices.push(voice);
  setTimeout(() => {
    voice.stop();
    activeVoices = activeVoices.filter(v => v !== voice);
  }, Math.max(0, (end - audioCtx.currentTime + 0.2) * 1000));
}

function flashEl(el) {
  if (!el) return;
  el.classList.add("is-playing");
  setTimeout(() => el.classList.remove("is-playing"), FLASH_DURATION);
}

function spelledNoteForPc(pc) {
  const idx = currentScale.pitchClasses.findIndex(p => p === pc);
  if (idx === -1) return null;
  return currentScale.spelled[idx];
}

function flashPitchClass(pc) {
  const note = pcToSpelledFallback(pc);
  if (!note) return;
  const tiles = document.querySelectorAll(`.note-label[data-note="${note}"]`);
  tiles.forEach(flashEl);
}

function flashTargets(pc, elements = []) {
  flashPitchClass(pc);
  elements.forEach(flashEl);
}

function selectionPitchClass() {
  if (selectedChordName && activeChordPitchClasses && activeChordPitchClasses.size) return null;
  if (selectedRootNote) return noteNameToPc(selectedRootNote);
  return null;
}

function pcToSpelledFallback(pc) {
  const spelled = spelledNoteForPc(pc);
  if (spelled) return spelled;
  const preferFlat = enharmonicPreferenceByPc[currentKeyPc] === "flat";
  const sharpMap = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const flatMap  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  return preferFlat ? flatMap[wrap(pc, 12)] : sharpMap[wrap(pc, 12)];
}

function buildAscendingScaleMidis(pitchClasses) {
  if (!pitchClasses?.length) return [];
  const tonicPc = pitchClasses[0];
  let lastMidi = 60 + tonicPc;
  const midis = [lastMidi];
  for (let i = 1; i < pitchClasses.length; i += 1) {
    let midi = 60 + pitchClasses[i];
    while (midi < lastMidi) midi += 12;
    midis.push(midi);
    lastMidi = midi;
  }
  midis.push(midis[0] + 12);
  return midis;
}

function playSequence(notes, instrument, startTime, gap, token) {
  if (audioMuted) return startTime;
  ensureAudio();
  try { if (audioCtx && audioCtx.state !== "running") audioCtx.resume(); } catch (_) {}
  if (!audioCtx || !masterGain) return startTime;
  let current = startTime;
  notes.forEach((note, idx) => {
    if (token !== playbackToken) return;
    const when = startTime + gap * idx;
    const dur = note.dur || 0.2;
    playSynthNote({ midi: note.midi, when, dur });
    scheduleFlash(note.pc, note.targets || [], when, token);
    current = when;
  });
  return current + gap;
}

function playStrum(notes, instrument, startTime, gap, token) {
  if (audioMuted) return startTime;
  ensureAudio();
  try { if (audioCtx && audioCtx.state !== "running") audioCtx.resume(); } catch (_) {}
  if (!audioCtx || !masterGain) return startTime;
  let current = startTime;
  notes.forEach((note, idx) => {
    if (token !== playbackToken) return;
    const when = startTime + gap * idx;
    playSynthNote({ midi: note.midi, when, dur: note.dur || STRUM_DUR });
    scheduleFlash(note.pc, note.targets || [], when, token);
    current = when;
  });
  return current + gap;
}

function collectChordElements(chordSet) {
  const elements = Array.from(document.querySelectorAll("#keyboardVisualizer .key, #fretboardVisualizer .fret-note"))
    .filter(el => chordSet.has(Number(el.dataset.pc)));
  return elements
    .map(el => ({ el, midi: Number(el.dataset.midi || 0), pc: Number(el.dataset.pc || 0) }))
    .filter(item => !Number.isNaN(item.midi))
    .sort((a, b) => a.midi - b.midi);
}

function buildFretVoicing(chordSet) {
  const perString = new Map();
  const notes = Array.from(document.querySelectorAll("#fretboardVisualizer .fret-note"));
  notes.forEach(n => {
    const pc = Number(n.dataset.pc);
    if (!chordSet.has(pc)) return;
    const str = Number(n.dataset.string);
    const midi = Number(n.dataset.midi);
    if (Number.isNaN(str) || Number.isNaN(midi)) return;
    const existing = perString.get(str);
    if (!existing || midi < existing.midi) {
      perString.set(str, { el: n, midi, pc });
    }
  });
  const order = [5, 4, 3, 2, 1, 0];
  return order.map(str => perString.get(str)).filter(Boolean).sort((a, b) => a.midi - b.midi);
}

function buildKeyboardChordPlaybackList(chordSet, rootPc) {
  const chordKeys = Array.from(document.querySelectorAll("#keyboardVisualizer .key"))
    .filter(el => chordSet.has(Number(el.dataset.pc)))
    .map(el => ({ el, midi: Number(el.dataset.midi), pc: Number(el.dataset.pc) }))
    .filter(item => Number.isFinite(item.midi))
    .sort((a, b) => a.midi - b.midi);

  const seenMidi = new Set();
  const dedupedKeys = [];
  chordKeys.forEach(k => {
    if (seenMidi.has(k.midi)) return;
    seenMidi.add(k.midi);
    dedupedKeys.push(k);
  });

  let orderedKeys = dedupedKeys;
  if (rootPc !== null) {
    const roots = dedupedKeys.filter(k => k.pc === rootPc);
    const lowestRoot = roots.length ? roots[0] : null;
    if (lowestRoot) {
      orderedKeys = [
        lowestRoot,
        ...dedupedKeys.filter(k => k !== lowestRoot && k.midi > lowestRoot.midi)
      ];
      const maxInterval = Math.max(...Array.from(chordSet).map(pc => (pc - rootPc + 12) % 12));
      const trimmed = [];
      let reachedTop = false;
      orderedKeys.forEach(k => {
        if (reachedTop) return;
        trimmed.push(k);
        if ((k.pc - rootPc + 12) % 12 === maxInterval) reachedTop = true;
      });
      orderedKeys = trimmed;
    }
  }

  return orderedKeys.map(item => ({
    midi: item.midi,
    pc: item.pc,
    keyEl: item.el,
    fretEls: getFretsForPc(item.pc)
  }));
}

function parseChordRootPc() {
  if (!selectedChordName) return null;
  const m = selectedChordName.match(/^([A-G][b#x♯♭]{0,2})/);
  if (m) {
    const pc = noteNameToPc(m[1]);
    if (pc !== null) return pc;
  }
  return null;
}

function scheduleFlash(pc, targets = [], when, token) {
  if (!audioCtx) return;
  const delayMs = Math.max(0, (when - audioCtx.currentTime) * 1000);
  setTimeout(() => {
    if (token !== playbackToken) return;
    flashTargets(pc, targets);
  }, delayMs);
}

function maybePlayCurrentSelection(reason = "") {
  if (audioMuted || stripDragging) return;
  ensureAudio();
  if (!audioCtx || !masterGain) return;
  const token = stopPlayback();
  const type = getSelectionType();
  const baseStart = audioCtx.currentTime + 0.05;

  if (type === "scale") {
    const pcs = currentScale.pitchClasses;
    const midis = buildAscendingScaleMidis(pcs);
    const notes = midis.map((midi, idx) => ({
      midi,
      pc: pcs[idx % pcs.length],
      dur: SCALE_DUR,
      targets: getKeysByMidi(midi)
    }));
    playSequence(notes, "piano", baseStart, SCALE_GAP, token);
    return;
  }

  if (type === "note") {
    const pc = selectionPitchClass();
    if (pc === null) return;
    let start = baseStart;
    const fretsForPc = getFretsForPc(pc);
    const keys = getKeysForPc(pc).map(el => ({
      midi: Number(el.dataset.midi),
      pc,
      targets: [el, ...fretsForPc],
      dur: NOTE_DUR
    }));
    if (keys.length) playSequence(keys, "piano", start, NOTE_GAP, token);
    return;
  }

  if (type === "chord") {
    const chordNotes = selectedChordNotes
      ? buildChordPlaybackMidisFromNotes(selectedChordNotes)
      : [];
    const seqNotes = chordNotes.map(item => ({
      midi: item.midi,
      pc: item.pc,
      targets: item.targets || [],
      dur: CHORD_TONE_DUR
    }));

    let start = baseStart;
    if (seqNotes.length) start = playSequence(seqNotes, "piano", start, CHORD_TONE_GAP, token);

    if (seqNotes.length) {
      const strumNotes = seqNotes.map(item => ({ ...item, dur: STRUM_DUR }));
      playStrum(strumNotes, "piano", start + 0.08, STRUM_GAP, token);
    }
  }
}

function updateSoundToggleUI() {
  const btn = document.getElementById("soundToggle");
  if (!btn) return;
  btn.classList.toggle("is-unmuted", !audioMuted);
  btn.classList.toggle("is-muted", audioMuted);
  btn.setAttribute("aria-label", audioMuted ? "Unmute" : "Mute");
  btn.innerHTML = audioMuted ? MUTED_ICON : UNMUTED_ICON;
}

// -------------------- HELPERS ------------------------

function wrap(value, size) {
  return (value % size + size) % size;
}

function accidentalSymbol(offset) {
  if (offset === 0) return "";
  const char = offset > 0 ? "#" : "b";
  return char.repeat(Math.abs(offset));
}

function biasFromName(name) {
  if (name.includes("#")) return "sharp";
  if (name.includes("b")) return "flat";
  return "neutral";
}

function spellScale(tonicPc, tonicName, pitchClasses) {
  const bias = biasFromName(tonicName);
  const tonicLetter = tonicName[0].toUpperCase();
  const startIdx = LETTERS.indexOf(tonicLetter);
  const spelled = pitchClasses.map((pc, i) => {
    const letter = LETTERS[(startIdx + i) % LETTERS.length];
    const basePc = LETTER_TO_PC[letter];
    const candidates = [];
    for (let offset = -2; offset <= 2; offset++) {
      if (wrap(basePc + offset, 12) === pc) candidates.push(offset);
    }
    let chosen = candidates[0];
    if (candidates.length > 1) {
      candidates.sort((a, b) => {
        const score = (o) => {
          let s = Math.abs(o);
          if (bias === "flat" && o > 0) s += 0.3;
          if (bias === "sharp" && o < 0) s += 0.3;
          return s;
        };
        return score(a) - score(b);
      });
      chosen = candidates[0];
    }
    if (chosen === undefined) {
      const rawDiff = wrap(pc - basePc, 12);
      const alt = rawDiff > 6 ? rawDiff - 12 : rawDiff;
      chosen = alt;
    }
    return `${letter}${accidentalSymbol(chosen)}`;
  });
  verifyDiatonic(spelled);
  return spelled;
}

function verifyDiatonic(spelled) {
  const letters = spelled.map(n => n[0].toUpperCase());
  const unique = new Set(letters);
  if (spelled.length !== 7 || unique.size !== 7) {
    console.warn("Diatonic spelling failed", spelled);
  }
}

function buildScaleData(keyName, modeName) {
  const tonicIndex = NOTE_TO_INDEX[keyName];
  const pattern    = SCALE_PATTERNS[modeName];
  const pitchClasses = pattern.map(step => wrap(tonicIndex + step, 12));
  const spelled = spellScale(tonicIndex, keyName, pitchClasses);
  return { pitchClasses, spelled };
}

function findKeyIndexForPc(pc, biasName = "") {
  const bias = biasFromName(biasName);
  const matches = KEY_OPTIONS
    .map((opt, idx) => ({ idx, pc: NOTE_TO_INDEX[opt.value], label: opt.label }))
    .filter(item => item.pc === pc);
  if (!matches.length) return wrap(currentKeyIndex, KEY_OPTIONS.length);
  matches.sort((a, b) => {
    const score = (item) => {
      let s = 0;
      if (bias === "flat" && item.label.includes("b")) s -= 1;
      if (bias === "sharp" && item.label.includes("#")) s -= 1;
      return s;
    };
    return score(a) - score(b);
  });
  return matches[0].idx;
}

const keyLabel = (idx) => KEY_OPTIONS[wrap(idx, KEY_OPTIONS.length)].label;
const keyValue = (idx) => KEY_OPTIONS[wrap(idx, KEY_OPTIONS.length)].value;
const keyIndexFromPc = (pc, prefLabel = "") => findKeyIndexForPc(pc, prefLabel);

function isEnharmonicPc(pc) {
  return Boolean(ENHARMONIC_OPTIONS[wrap(pc, 12)]);
}

function accidentalScore(spelled) {
  return spelled.reduce((sum, note) => {
    const acc = (note.match(/[#b]/g) || []).length;
    if (acc === 0) return sum;
    if (acc === 1) return sum + 1;
    return sum + 3;
  }, 0);
}

function bestEnharmonicLabel(pc, modeIdx) {
  if (!isEnharmonicPc(pc)) {
    const idx = findKeyIndexForPc(pc);
    return { preferred: null, combinedLabel: keyLabel(idx) };
  }
  const { sharp, flat } = ENHARMONIC_OPTIONS[pc];
  const sharpScale = computeDisplayScale(pc, modeIdx, "sharp");
  const flatScale = computeDisplayScale(pc, modeIdx, "flat");
  const sharpScore = accidentalScore(sharpScale.spelled);
  const flatScore = accidentalScore(flatScale.spelled);
  let preferred = "flat";
  if (sharpScore < flatScore) preferred = "sharp";
  else if (flatScore < sharpScore) preferred = "flat";
  else preferred = enharmonicPreferenceByPc[pc] || "flat";
  const first = preferred === "sharp" ? sharp : flat;
  const second = preferred === "sharp" ? flat : sharp;
  return { preferred, combinedLabel: `${first}/${second}` };
}

function computeDisplayScale(pc, modeIdx, forcedPreference = null) {
  const modeName = MODE_NAMES[modeIdx];
  let preferenceUsed = forcedPreference;
  let tonicLabel;
  if (isEnharmonicPc(pc)) {
    const { sharp, flat } = ENHARMONIC_OPTIONS[pc];
    if (!preferenceUsed) {
      const sharpScale = buildScaleData(sharp, modeName);
      const flatScale = buildScaleData(flat, modeName);
      const sharpScore = accidentalScore(sharpScale.spelled);
      const flatScore = accidentalScore(flatScale.spelled);
      if (sharpScore < flatScore) preferenceUsed = "sharp";
      else if (flatScore < sharpScore) preferenceUsed = "flat";
      else preferenceUsed = enharmonicPreferenceByPc[pc] || "flat";
    }
    tonicLabel = preferenceUsed === "sharp" ? sharp : flat;
  } else {
    preferenceUsed = null;
    const idx = findKeyIndexForPc(pc);
    tonicLabel = keyValue(idx);
  }
  const scaleData = buildScaleData(tonicLabel, modeName);
  const keyIdx = findKeyIndexForPc(pc, tonicLabel);
  return {
    tonicLabel,
    pitchClasses: scaleData.pitchClasses,
    spelled: scaleData.spelled,
    keyIdx,
    preferenceUsed
  };
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function noteNameToPc(note) {
  if (!note) return null;
  const match = note.trim().match(/^([A-Ga-g])([#bx♯♭]{0,2})/);
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const basePc = LETTER_TO_PC[letter];
  if (basePc === undefined) return null;
  const accidentals = match[2]
    .replace(/♯/g, "#")
    .replace(/♭/g, "b");
  let offset = 0;
  for (const char of accidentals) {
    if (char === "#") offset += 1;
    if (char === "b") offset -= 1;
    if (char === "x") offset += 2;
  }
  return wrap(basePc + offset, 12);
}

function chordNotesToPcs(notes) {
  if (!notes) return [];
  return notes.split("-")
    .map(note => note.trim())
    .map(noteNameToPc)
    .filter(pc => pc !== null);
}

function getDegreeColorMap(pitchClasses = currentScale.pitchClasses) {
  const map = new Map();
  pitchClasses.forEach((pc, idx) => {
    map.set(pc, DEGREE_COLORS[idx]);
  });
  return map;
}

const pcColor = (pc) => `var(--pc-${wrap(pc, 12)})`;

function getHighlightSet(scalePitchClasses = currentScale.pitchClasses) {
  if (selectedExplorerNotePc !== null) {
    return { set: new Set([selectedExplorerNotePc]), isolation: false };
  }
  const scaleSet = new Set(scalePitchClasses);
  return { set: scaleSet, isolation: false };
}

function getSelectionType() {
  if (selectedChordName && activeChordPitchClasses) return "chord";
  if (selectedRootNote) return "note";
  return "scale";
}

function getKeysForPc(pc) {
  const keys = Array.from(document.querySelectorAll(`#keyboardVisualizer .key[data-pc="${pc}"]`));
  return keys.sort((a, b) => Number(a.dataset.midi || 0) - Number(b.dataset.midi || 0));
}

function getFretsForPc(pc) {
  const frets = Array.from(document.querySelectorAll(`#fretboardVisualizer .fret-note[data-pc="${pc}"]`));
  return frets.sort((a, b) => Number(a.dataset.midi || 0) - Number(b.dataset.midi || 0));
}

const getKeysByMidi = (midi) => Array.from(document.querySelectorAll(`#keyboardVisualizer .key[data-midi="${midi}"]`));
const getFretsByMidi = (midi) => Array.from(document.querySelectorAll(`#fretboardVisualizer .fret-note[data-midi="${midi}"]`));
const getLowestVisibleKeyboardMidiForPc = (pc) => {
  const keys = getKeysForPc(pc);
  if (!keys.length) return null;
  const midi = Number(keys[0].dataset.midi);
  return Number.isFinite(midi) ? midi : null;
};

function nextMidiAbove(prevMidi, pc) {
  const start = prevMidi + 1;
  const startPc = wrap(start, 12);
  const delta = wrap(pc - startPc, 12);
  return start + delta;
}

function getNearestVisibleKeyboardKeyForPc(pc, targetMidi) {
  const keys = getKeysForPc(pc);
  if (!keys.length) return null;
  let best = keys[0];
  let bestDiff = Math.abs(Number(best.dataset.midi) - targetMidi);
  keys.forEach(k => {
    const midi = Number(k.dataset.midi);
    if (!Number.isFinite(midi)) return;
    if (midi === targetMidi) {
      best = k;
      bestDiff = 0;
      return;
    }
    const diff = Math.abs(midi - targetMidi);
    if (diff < bestDiff) {
      best = k;
      bestDiff = diff;
    }
  });
  return best;
}

function buildChordPlaybackMidisFromNotes(notesString) {
  const pcsOrdered = chordNotesToPcs(notesString);
  if (!pcsOrdered.length) return [];
  const rootPc = pcsOrdered[0];
  const rootVisibleMidi = getLowestVisibleKeyboardMidiForPc(rootPc);
  const rootMidi = rootVisibleMidi !== null ? rootVisibleMidi : 60 + rootPc;
  const result = [];
  const usedMidis = new Set();

  let prevMidi = rootMidi - 1;
  pcsOrdered.forEach((pc, idx) => {
    let midi = nextMidiAbove(prevMidi, pc);
    const toneCount = pcsOrdered.length;
    const isExtension = (toneCount === 5 && idx === 4) || (toneCount === 6 && idx === 5) || (toneCount === 7 && idx === 6);
    if (isExtension) {
      const minExt = rootMidi + 12;
      while (midi < minExt) midi += 12;
      while (midi <= prevMidi) midi += 12;
    }
    while (usedMidis.has(midi)) midi += 12;
    prevMidi = midi;
    usedMidis.add(midi);
    const keyEl = getNearestVisibleKeyboardKeyForPc(pc, midi);
    const targets = [];
    if (keyEl) targets.push(keyEl);
    targets.push(...getFretsForPc(pc));
    result.push({ midi, pc, targets, dur: CHORD_TONE_DUR });
  });

  return result;
}

const getEnabledExtensions = () => [7, 9, 11, 13].filter(level => extensionState[level]);

function enforceExtensionLadder(level, on) {
  const next = { ...extensionState };
  if (on) {
    if (level === 13) { next[13] = next[11] = next[9] = next[7] = true; }
    else if (level === 11) { next[11] = next[9] = next[7] = true; }
    else if (level === 9) { next[9] = next[7] = true; }
    else if (level === 7) { next[7] = true; }
  } else {
    if (level === 7) { next[7] = next[9] = next[11] = next[13] = false; }
    if (level === 9) { next[9] = next[11] = next[13] = false; }
    if (level === 11) { next[11] = next[13] = false; }
    if (level === 13) { next[13] = false; }
  }
  extensionState = next;
}

function buildHarmonyRows() {
  if (!currentScale.pitchClasses.length) {
    harmonyRows = [];
    return;
  }
  const romans = computeRomans(currentScale.pitchClasses);
  harmonyRows = currentScale.pitchClasses.map((pc, idx) => {
    const rowNotes = [];
    const rootNote = currentScale.spelled[idx];
    rowNotes.push({ label: "Root", degree: 1, pc, note: rootNote });
    const thirdIdx = (idx + 2) % 7;
    rowNotes.push({ label: "3", degree: 3, pc: currentScale.pitchClasses[thirdIdx], note: currentScale.spelled[thirdIdx] });
    const fifthIdx = (idx + 4) % 7;
    rowNotes.push({ label: "5", degree: 5, pc: currentScale.pitchClasses[fifthIdx], note: currentScale.spelled[fifthIdx] });
    const seventhIdx = (idx + 6) % 7;
    rowNotes.push({ label: "7", degree: 7, pc: currentScale.pitchClasses[seventhIdx], note: currentScale.spelled[seventhIdx] });
    const ninthIdx = (idx + 1) % 7;
    rowNotes.push({ label: "9", degree: 9, pc: currentScale.pitchClasses[ninthIdx], note: currentScale.spelled[ninthIdx] });
    const eleventhIdx = (idx + 3) % 7;
    rowNotes.push({ label: "11", degree: 11, pc: currentScale.pitchClasses[eleventhIdx], note: currentScale.spelled[eleventhIdx] });
    const thirteenthIdx = (idx + 5) % 7;
    rowNotes.push({ label: "13", degree: 13, pc: currentScale.pitchClasses[thirteenthIdx], note: currentScale.spelled[thirteenthIdx] });
    return {
      index: idx,
      degree: romans[idx],
      rootNote,
      notes: rowNotes
    };
  });
}

const degreeOrder = [1, 3, 5, 7, 9, 11, 13];
const resolveMaxDegree = (val) => (val === 3 ? 5 : val);

function chordNotesStringForRow(row, maxDegree = 7) {
  const notes = row?.notes || [];
  return notes
    .filter(n => n.degree <= maxDegree)
    .map(n => n.note)
    .join(" - ");
}

function chordNameForRow(row, maxDegree = 7) {
  if (!row?.notes?.length) return "";
  const root = row.notes.find(n => n.degree === 1);
  const third = row.notes.find(n => n.degree === 3);
  const fifth = row.notes.find(n => n.degree === 5);
  if (!root || !third || !fifth) return root?.note || "";
  const thirdInt = wrap(third.pc - root.pc, 12);
  const fifthInt = wrap(fifth.pc - root.pc, 12);
  const triad = intervalQuality(thirdInt, fifthInt);
  const seventhNote = row.notes.find(n => n.degree === 7);
  const ninthNote = row.notes.find(n => n.degree === 9);
  const eleventhNote = row.notes.find(n => n.degree === 11);
  const thirteenthNote = row.notes.find(n => n.degree === 13);
  let seventhQual = null;
  if (maxDegree >= 7 && seventhNote) {
    const int7 = wrap(seventhNote.pc - root.pc, 12);
    seventhQual = seventhQuality(triad, int7);
  }

  const alterations = [];
  let highestExt = "";

  if (maxDegree >= 9 && ninthNote) {
    const int9 = wrap(ninthNote.pc - root.pc, 12);
    if (int9 === 1) alterations.push("b9");
    else if (int9 === 3) alterations.push("#9");
    if (!highestExt) highestExt = "9";
  }

  if (maxDegree >= 11 && eleventhNote) {
    const int11 = wrap(eleventhNote.pc - root.pc, 12);
    if (int11 === 6) alterations.push("#11");
    else if (int11 !== 5) alterations.push("b11");
    highestExt = "11";
  }

  if (maxDegree >= 13 && thirteenthNote) {
    const int13 = wrap(thirteenthNote.pc - root.pc, 12);
    if (int13 === 8) alterations.push("b13");
    else if (int13 === 10) alterations.push("#13");
    highestExt = "13";
  }

  const qualityTag = (() => {
    if (!seventhQual) return triad.suffix;
    const useCondensed = Boolean(highestExt);
    if (!useCondensed) return seventhQual.label;
    switch (seventhQual.label) {
      case "maj7": return "maj";
      case "7": return "";
      case "m7": return "m";
      case "m7b5": return "m7b5";
      case "dim7": return "dim";
      case "m(maj7)": return "m(maj7)";
      case "7#5": return "7#5";
      case "maj7#5": return "maj#5";
      default: return seventhQual.label.replace(/7$/, "");
    }
  })();

  let label = `${root.note}${qualityTag}`;

  const altStr = alterations.length ? `(${alterations.join(",")})` : "";
  if (!highestExt) return label;
  const hasAlt13 = alterations.some(a => a.includes("13"));
  if (highestExt === "13") {
    const baseExt = hasAlt13 ? "" : "13";
    return `${label}${baseExt}${altStr}`;
  }
  if (highestExt === "11") return `${label}11${altStr}`;
  return `${label}9${altStr}`;
}

const getRowMax = (rowIndex) => {
  const override = rowHarmonyMaxOverrides.get(rowIndex);
  if (override && override <= globalHarmonyMax) return override;
  return globalHarmonyMax;
};

function playTestPing() {
  if (!audioCtx || !masterGain) return;
  const token = stopPlayback();
  const when = audioCtx.currentTime + 0.02;
  playSynthNote({ midi: 69, when, dur: 0.05, instrument: "piano" });
  playbackToken = token;
}

function playChordTonesThenStrum(rowIndex, maxDegree) {
  if (audioMuted || stripDragging) return;
  ensureAudio();
  try { if (audioCtx && audioCtx.state !== "running") audioCtx.resume(); } catch (_) {}
  const row = harmonyRows[rowIndex];
  if (!row) return;
  const effectiveMax = resolveMaxDegree(maxDegree);
  const notesStr = chordNotesStringForRow(row, effectiveMax);
  if (!notesStr) return;
  const notes = buildChordPlaybackMidisFromNotes(notesStr);
  if (!notes.length) return;
  const token = stopPlayback();
  const start = audioCtx?.currentTime ? audioCtx.currentTime + 0.05 : 0;
  const seqNotes = notes.map(n => ({ ...n, dur: CHORD_TONE_DUR }));
  const lastTime = playSequence(seqNotes, "piano", start, CHORD_TONE_GAP, token);
  const strumNotes = notes.map(n => ({ ...n, dur: STRUM_DUR }));
  playStrum(strumNotes, "piano", lastTime + 0.08, STRUM_GAP, token);
}

function playStrumOnly(rowIndex, maxDegree) {
  if (audioMuted || stripDragging) return;
  ensureAudio();
  try { if (audioCtx && audioCtx.state !== "running") audioCtx.resume(); } catch (_) {}
  const row = harmonyRows[rowIndex];
  if (!row) return;
  const effectiveMax = resolveMaxDegree(maxDegree);
  const notesStr = chordNotesStringForRow(row, effectiveMax);
  if (!notesStr) return;
  const notes = buildChordPlaybackMidisFromNotes(notesStr);
  if (!notes.length) return;
  const token = stopPlayback();
  const start = audioCtx?.currentTime ? audioCtx.currentTime + 0.05 : 0;
  const strumNotes = notes.map(n => ({ ...n, dur: STRUM_DUR }));
  playStrum(strumNotes, "piano", start, STRUM_GAP, token);
}

function renderHarmonyGrid() {
  const headerEl = document.getElementById("harmonyGridHeader");
  const bodyEl = document.getElementById("harmonyGridBody");
  if (!headerEl || !bodyEl) return;
  buildHarmonyRows();
  const toneColumns = [
    { label: "3", degree: 3 },
    { label: "5", degree: 5 },
    { label: "7", degree: 7 },
    { label: "9", degree: 9 },
    { label: "11", degree: 11 },
    { label: "13", degree: 13 }
  ];
  const toneCount = toneColumns.length;
  headerEl.style.setProperty("--tone-count", toneCount);
  bodyEl.style.setProperty("--tone-count", toneCount);
  headerEl.innerHTML = [
    `<div class="h-cell sticky-col rn-head" role="columnheader" aria-label="Roman numeral"></div>`,
    `<div class="h-cell sticky-col chord-head" role="columnheader">Chord</div>`,
    ...toneColumns.map(col => {
      const active = globalHarmonyMax === col.degree;
      return `<div class="h-cell tone-head ${active ? "is-active" : ""}" data-degree="${col.degree}" role="columnheader" tabindex="0" aria-pressed="${active ? "true" : "false"}">${col.label}</div>`;
    })
  ].join("");

  bodyEl.innerHTML = harmonyRows.map(row => {
    const isSelected = selectedExplorerNotePc === null && row.index === selectedHarmonyChordIndex;
    const rowMaxSetting = rowHarmonyMaxOverrides.get(row.index) ?? globalHarmonyMax;
    const rowMax = resolveMaxDegree(rowMaxSetting);
    const topPc = (() => {
      const filtered = row.notes.filter(n => n.degree <= rowMax);
      return filtered.length ? filtered[filtered.length - 1].pc : null;
    })();
    const root = row.notes[0];
    const chordLabel = chordNameForRow(row, rowMax);
    const chordColor = degreeColorByDegree(row.index + 1);
    const chordPcStyle = `style="--pc-color:${chordColor}; --deg-color:${chordColor}"`;
    const cells = [
      `<div class="harmony-cell sticky-col rn-cell" data-row-index="${row.index}" role="gridcell"><span class="degree">${row.degree}</span></div>`,
      `<div class="harmony-cell sticky-col chord-cell tone-cell pc-${root?.pc ?? 0}" data-row-index="${row.index}" data-pc="${root?.pc ?? ""}" data-degree="3" role="gridcell" ${chordPcStyle}><div class="pc-band tone-root">${chordLabel}</div></div>`,
      ...toneColumns.map((col) => {
        const note = row.notes.find(n => n.label === col.label) || null;
        const targetDegree = col.degree;
        if (!note) {
          return `<div class="harmony-cell tone-cell" data-row-index="${row.index}" data-degree="${targetDegree}" role="gridcell"></div>`;
        }
        const cellColor = degreeColorForColumn(targetDegree);
        const pcStyle = `style="--pc-color:${cellColor}; --deg-color:${cellColor}"`;
        const isVisible = targetDegree <= rowMax;
        const visibilityClass = isVisible ? "is-visible" : "is-ghost";
        const isNoteSelected = selectedExplorerNotePc !== null && selectedExplorerNotePc === note.pc;
        const isActiveRow = selectedHarmonyChordIndex === row.index;
        const bandToneClass = isActiveRow
          ? (topPc !== null && note.pc === topPc ? "tone-top" : (note.pc === root.pc ? "tone-root" : "tone-tone"))
          : "";
        const cellClasses = `harmony-cell tone-cell ${visibilityClass} pc-${note.pc} ${isNoteSelected ? "is-note-selected" : ""}`;
        return `<div class="${cellClasses}" data-row-index="${row.index}" data-pc="${note.pc}" data-degree="${targetDegree}" role="gridcell" ${pcStyle}>
          <div class="pc-band ${bandToneClass}" data-row-index="${row.index}" data-pc="${note.pc}">${note.note}</div>
        </div>`;
      })
    ].join("");
    return `<div class="harmony-row${isSelected ? " is-selected" : ""}" data-row-index="${row.index}" role="row">${cells}</div>`;
  }).join("");
}

function selectHarmonyChord(rowIndex) {
  const row = harmonyRows.find(r => r.index === rowIndex);
  if (!row) return;
  selectedHarmonyChordIndex = rowIndex;
  const rowMaxSetting = getRowMax(rowIndex);
  const rowMax = resolveMaxDegree(rowMaxSetting);
  selectedChordName = chordNameForRow(row, rowMax);
  selectedChordNotes = chordNotesStringForRow(row, rowMax);
  activeChordPitchClasses = new Set(row.notes.filter(n => n.degree <= rowMax).map(n => n.pc));
  renderHarmonyGrid();
  scheduleHighlightUpdate();
  updateChordHighlightUI();
  maybePlayCurrentSelection("harmony-chord");
}

function selectHarmonyNote(pc, rowIndex = null) {
  selectedExplorerNotePc = pc;
  if (selectedHarmonyChordIndex === null && rowIndex !== null) {
    selectHarmonyChord(rowIndex);
  } else {
    renderHarmonyGrid();
    scheduleHighlightUpdate();
  }
}

function clearHarmonySelection() {
  selectedHarmonyChordIndex = null;
  selectedExplorerNotePc = null;
  selectedChordName = null;
  selectedChordNotes = null;
  activeChordPitchClasses = null;
  renderHarmonyGrid();
  scheduleHighlightUpdate();
}

function selectExplorerNote(pc) {
  if (!Number.isFinite(pc)) return;
  if (!harmonyRows.length) buildHarmonyRows();
  const row = harmonyRows.find(r => r.notes?.[0]?.pc === pc);
  selectedExplorerNotePc = pc;
  selectedHarmonyChordIndex = row ? row.index : null;
  selectedChordName = null;
  selectedChordNotes = null;
  activeChordPitchClasses = null;
  renderHarmonyGrid();
  scheduleHighlightUpdate();
}

function applyMobilePanelState() {
  if (!isMobile) {
    document.body.classList.remove("mobile-panel-keymode", "mobile-panel-harmony");
    return;
  }
  document.body.classList.remove("mobile-panel-keymode", "mobile-panel-harmony");
  document.body.classList.add(mobileActivePanel === "harmony" ? "mobile-panel-harmony" : "mobile-panel-keymode");
}

function setMobilePanel(panel) {
  if (!isMobile) return;
  mobileActivePanel = panel === "harmony" ? "harmony" : "keymode";
  applyMobilePanelState();
}

function updateHarmonyKeyModeLabel() {
  const labelEl = document.getElementById("harmonyKeyMode");
  const stripEl = document.getElementById("harmonyStripLabel");
  const modeName = MODE_NAMES[currentModeIndex] || "";
  const keyLabelStr = keyLabel(currentKeyIndex);
  const text = `${keyLabelStr} ${modeName}`;
  if (labelEl) labelEl.textContent = text;
  if (stripEl) stripEl.textContent = text;
}

// -------------------- CHORD ANALYSIS ------------------------

function intervalQuality(int3, int5) {
  if (int3 === 4 && int5 === 7) return { name: "major", suffix: "", valid: true };
  if (int3 === 3 && int5 === 7) return { name: "minor", suffix: "m", valid: true };
  if (int3 === 3 && int5 === 6) return { name: "diminished", suffix: "dim", valid: true };
  if (int3 === 4 && int5 === 8) return { name: "augmented", suffix: "aug", valid: true };
  return { name: "unknown", suffix: "?", valid: false };
}

function seventhQuality(triadQual, int7) {
  if (triadQual.name === "major") {
    if (int7 === 11) return { label: "maj7", valid: true };
    if (int7 === 10) return { label: "7", valid: true };
  }
  if (triadQual.name === "minor") {
    if (int7 === 10) return { label: "m7", valid: true };
    if (int7 === 11) return { label: "m(maj7)", valid: true };
  }
  if (triadQual.name === "diminished") {
    if (int7 === 10) return { label: "m7b5", valid: true };
    if (int7 === 9) return { label: "dim7", valid: true };
  }
  if (triadQual.name === "augmented") {
    if (int7 === 10) return { label: "7#5", valid: true };
    if (int7 === 11) return { label: "maj7#5", valid: true };
  }
  return { label: "?7", valid: false };
}

function ninthQuality(seventhQual, int9) {
  const isMajorNine = int9 === 2 || int9 === 14;
  const isFlatNine = int9 === 1 || int9 === 13;
  if (!seventhQual.valid) return { label: `${seventhQual.label || "?7"}9`, valid: false };

  if (isMajorNine) {
    switch (seventhQual.label) {
      case "maj7": return { label: "maj9", valid: true };
      case "7": return { label: "9", valid: true };
      case "m7": return { label: "m9", valid: true };
      case "m(maj7)": return { label: "m(maj9)", valid: true };
      case "m7b5": return { label: "m9b5", valid: true };
      case "dim7": return { label: "dim9", valid: true };
      case "7#5": return { label: "9#5", valid: true };
      case "maj7#5": return { label: "maj9#5", valid: true };
      default: return { label: `${seventhQual.label}9`, valid: true };
    }
  }

  if (isFlatNine) {
    switch (seventhQual.label) {
      case "maj7": return { label: "maj7(b9)", valid: true };
      case "7": return { label: "7(b9)", valid: true };
      case "m7": return { label: "m7(b9)", valid: true };
      case "m(maj7)": return { label: "m(maj7)(b9)", valid: true };
      case "m7b5": return { label: "m7b5(b9)", valid: true };
      case "dim7": return { label: "dim7(b9)", valid: true };
      case "7#5": return { label: "7#5(b9)", valid: true };
      case "maj7#5": return { label: "maj7#5(b9)", valid: true };
      default: return { label: `${seventhQual.label}(b9)`, valid: true };
    }
  }

  switch (seventhQual.label) {
    case "maj7": return { label: "maj9?", valid: false };
    case "7": return { label: "9?", valid: false };
    case "m7": return { label: "m9?", valid: false };
    case "m(maj7)": return { label: "m(maj9?)", valid: false };
    case "m7b5": return { label: "m9b5?", valid: false };
    case "dim7": return { label: "dim9?", valid: false };
    case "7#5": return { label: "9#5?", valid: false };
    case "maj7#5": return { label: "maj9#5?", valid: false };
    default: return { label: `${seventhQual.label}9?`, valid: false };
  }
}

function analyzeChords(scaleNames, pitchClasses) {
  const len = scaleNames.length;
  const categories = {
    triads: [],
    sevenths: [],
    ninths: [],
    suspended: []
  };
  const degrees = [];

  for (let i = 0; i < len; i++) {
    const root  = scaleNames[i];
    const third = scaleNames[(i + 2) % len];
    const fifth = scaleNames[(i + 4) % len];
    const seventhNote = scaleNames[(i + 6) % len];
    const second  = scaleNames[(i + 1) % len];
    const fourth  = scaleNames[(i + 3) % len];

    const rootPc = pitchClasses[i];
    const int3 = wrap(pitchClasses[(i + 2) % len] - rootPc, 12);
    const int5 = wrap(pitchClasses[(i + 4) % len] - rootPc, 12);
    const int7 = wrap(pitchClasses[(i + 6) % len] - rootPc, 12);
    const int2 = wrap(pitchClasses[(i + 1) % len] - rootPc, 12);
    const int4 = wrap(pitchClasses[(i + 3) % len] - rootPc, 12);

    const triad = intervalQuality(int3, int5);
    const seventh = seventhQuality(triad, int7);
    const ninth = ninthQuality(seventh, int2);

    const triadName = `${root}${triad.suffix}`;
    const seventhName = `${root}${seventh.label}`;
    const ninthName = `${root}${ninth.label}`;

    const triadNotes = `${root} - ${third} - ${fifth}`;
    const seventhNotes = `${root} - ${third} - ${fifth} - ${seventhNote}`;
    const ninthNotes = `${root} - ${third} - ${fifth} - ${seventhNote} - ${second}`;

    categories.triads.push({ name: triadName, notes: triadNotes, valid: triad.valid });
    categories.sevenths.push({ name: seventhName, notes: seventhNotes, valid: seventh.valid });
    categories.ninths.push({ name: ninthName, notes: ninthNotes, valid: ninth.valid });
    categories.suspended.push({ name: `${root}sus2`, notes: `${root} - ${second} - ${fifth}`, valid: int2 === 2 });
    categories.suspended.push({ name: `${root}sus4`, notes: `${root} - ${fourth} - ${fifth}`, valid: int4 === 5 });

    degrees.push({
      triad: { name: triadName, notes: triadNotes },
      seventh: { name: seventhName, notes: seventhNotes },
      ninth: { name: ninthName, notes: ninthNotes }
    });
  }

  return { categories, degrees };
}

function filterChordsByRoot(chordsObj, rootLabel) {
  if (!rootLabel) return chordsObj;
  const filtered = {};
  Object.entries(chordsObj.categories).forEach(([cat, items]) => {
    filtered[cat] = items.filter(ch => {
      const m = ch.name.match(/^([A-G][b#x♯♭]{0,2})/);
      return m && m[1] === rootLabel;
    });
  });
  return { categories: filtered, degrees: chordsObj.degrees };
}

// -------------------- RENDERING ------------------------

function renderScaleStrip(scale) {
  const track = document.getElementById("scaleTiles");
  track.classList.remove("vertical-track");
  track.style.transition = "none";
  track.style.transform = "translate3d(0,0,0)";
  const romans = computeRomans(currentScale.pitchClasses);
  const slots = romans.map(r => `<div class="slot">${r}</div>`).join("");
  const notes = scale.map((note, idx) =>
    `<div class="note-label${idx === 0 ? " tonic" : ""}${selectedRootNote === note ? " root-selected" : ""}" data-note="${note}" style="--deg-color:${degreeColorByIndex(idx)}"><div>${note}</div></div>`
  ).join("");
  track.innerHTML = `<div class="slots-row">${slots}</div><div class="notes-layer" id="notesLayer">${notes}</div>`;
}

function rotateArray(arr, dir) {
  if (!arr.length) return arr;
  const copy = [...arr];
  if (dir > 0) {
    copy.push(copy.shift());
  } else {
    copy.unshift(copy.pop());
  }
  return copy;
}

function renderHorizontalWithWrap(scale) {
  const track = document.getElementById("scaleTiles");
  track.classList.remove("vertical-track");
  track.style.transition = "none";
  const romans = computeRomans(currentScale.pitchClasses);
  const slots = romans.map(r => `<div class="slot">${r}</div>`).join("");
  const extended = [...scale, ...scale, ...scale];
  const notes = extended.map((note, idx) => {
    const isTonic = idx === scale.length;
    const isSelected = selectedRootNote === note && idx >= scale.length && idx < scale.length * 2;
    const color = degreeColorByIndex(idx % scale.length);
    return `<div class="note-label${isTonic ? " tonic" : ""}${isSelected ? " root-selected" : ""}" data-note="${note}" style="--deg-color:${color}"><div>${note}</div></div>`;
  }).join("");
  track.innerHTML = `<div class="slots-row">${slots}</div><div class="notes-layer" id="notesLayer">${notes}</div>`;
}

function renderVerticalRows() {
  const track = document.getElementById("scaleTiles");
  track.classList.add("vertical-track");
  track.style.transition = "none";
  const range = MAX_DRAG_STEPS;
  const viewport = document.querySelector(".tile-viewport");
  const rowHeight = viewport?.clientHeight || tileMetrics.rowHeight;
  const rows = [];
  for (let i = range; i >= -range; i--) {
    let notes = currentScale.spelled;
    if (i !== 0) {
      const shiftedPc = wrap(currentScale.pitchClasses[0] + i, 12);
      const pref = enharmonicPreferenceByPc[shiftedPc] || null;
      notes = computeDisplayScale(shiftedPc, currentModeIndex, pref).spelled;
    }
    rows.push({ shift: i, notes });
  }
  const romans = computeRomans(currentScale.pitchClasses);
  const slots = romans.map(r => `<div class="slot">${r}</div>`).join("");
  const rowsHtml = rows.map(row =>
    `<div class="tile-row" style="height:${rowHeight}px;flex:0 0 auto">${row.notes.map((note, idx) =>
      `<div class="note-label${idx === 0 && row.shift === 0 ? " tonic" : ""}${selectedRootNote === note && row.shift === 0 ? " root-selected" : ""}" data-note="${note}" style="--deg-color:${degreeColorByIndex(idx)}"><div>${note}</div></div>`
    ).join("")}</div>`
  ).join("");
  track.innerHTML = `<div class="slots-row">${slots}</div><div class="notes-layer vertical" id="notesLayer" style="height:${rowHeight * rows.length}px">${rowsHtml}</div>`;
}

function renderChordRow(chord) {
  const isSelected = selectedChordName === chord.name;
  const noteMarkup = formatChordNotes(chord.notes);
  return `
    <div class="chord-row${chord.valid ? "" : " warning"}${isSelected ? " selected" : ""}"
      data-chord-name="${escapeAttr(chord.name)}"
      data-notes="${escapeAttr(chord.notes)}">
      <div class="chord-name">${chord.name}</div>
      <div class="chord-notes">${noteMarkup}</div>
    </div>
  `;
}

function renderKeyboardVisualizer() {
  const container = document.getElementById("keyboardVisualizer");
  if (!container) return;
  container.innerHTML = "";

  const shell = document.createElement("div");
  shell.className = "keyboard-shell";

  const whiteRow = document.createElement("div");
  whiteRow.className = "keyboard-white";

  const blackRow = document.createElement("div");
  blackRow.className = "keyboard-black";

  const whitePcs = [0, 2, 4, 5, 7, 9, 11, 0, 2, 4, 5, 7, 9, 11];
  const whiteMidis = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83];
  const whiteCount = whitePcs.length;
  whitePcs.forEach((pc, idx) => {
    const key = document.createElement("div");
    key.className = "key white";
    key.dataset.pc = pc;
    key.dataset.midi = whiteMidis[idx];
    key.dataset.order = idx;
    whiteRow.appendChild(key);
  });

  const blackKeys = [
    { pc: 1, whiteIndex: 0 },
    { pc: 3, whiteIndex: 1 },
    { pc: 6, whiteIndex: 3 },
    { pc: 8, whiteIndex: 4 },
    { pc: 10, whiteIndex: 5 },
    { pc: 1, whiteIndex: 7 },
    { pc: 3, whiteIndex: 8 },
    { pc: 6, whiteIndex: 10 },
    { pc: 8, whiteIndex: 11 },
    { pc: 10, whiteIndex: 12 }
  ];
  blackKeys.forEach(({ pc, whiteIndex }, idx) => {
    const key = document.createElement("div");
    key.className = "key black";
    key.dataset.pc = pc;
    key.dataset.midi = (whiteMidis[whiteIndex] || 60) + 1;
    key.dataset.order = whiteIndex + 0.5 + idx * 0.001;
    const left = ((whiteIndex + 1) / whiteCount) * 100;
    key.style.left = `${left}%`;
    blackRow.appendChild(key);
  });

  shell.appendChild(whiteRow);
  shell.appendChild(blackRow);
  container.appendChild(shell);
}

function renderFretboardVisualizer() {
  const container = document.getElementById("fretboardVisualizer");
  if (!container) return;
  container.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "fretboard-shell";
  shell.style.setProperty("--string-count", "6");
  shell.style.setProperty("--fret-count", "13");

  const lineLayer = document.createElement("div");
  lineLayer.className = "fretboard-lines";

  for (let s = 0; s < 6; s += 1) {
    const stringLine = document.createElement("div");
    stringLine.className = "string-line";
    stringLine.style.setProperty("--string-index", s);
    lineLayer.appendChild(stringLine);
  }

  for (let f = 0; f <= 12; f += 1) {
    const fretLine = document.createElement("div");
    fretLine.className = "fret-line";
    fretLine.style.setProperty("--fret-index", f);
    if (f === 0) fretLine.classList.add("nut");
    lineLayer.appendChild(fretLine);
  }

  const markerLayer = document.createElement("div");
  markerLayer.className = "fretboard-markers";
  const markerFrets = [3, 5, 7, 9, 12];
  markerFrets.forEach((fret) => {
    const markerIndex = fret === 12 ? 11.5 : fret - 0.5;
    if (fret === 12) {
      ["35%", "65%"].forEach(y => {
        const marker = document.createElement("div");
        marker.className = "fret-marker";
        marker.style.setProperty("--marker-index", markerIndex);
        marker.style.setProperty("--marker-y", y);
        markerLayer.appendChild(marker);
      });
    } else {
      const marker = document.createElement("div");
      marker.className = "fret-marker";
      marker.style.setProperty("--marker-index", markerIndex);
      marker.style.setProperty("--marker-y", "50%");
      markerLayer.appendChild(marker);
    }
  });

  const noteLayer = document.createElement("div");
  noteLayer.className = "fretboard-notes";
  // High E to low E to match top-to-bottom visual order.
  const openStrings = [4, 11, 7, 2, 9, 4];
  const openMidis = [64, 59, 55, 50, 45, 40];
  openStrings.forEach((openPc, stringIdx) => {
    for (let fret = 0; fret <= 12; fret += 1) {
      const note = document.createElement("div");
      note.className = "fret-note";
      note.dataset.pc = wrap(openPc + fret, 12);
      note.dataset.midi = openMidis[stringIdx] + fret;
      note.dataset.string = stringIdx;
      note.dataset.fret = fret;
      note.style.setProperty("--string-index", stringIdx);
      note.style.setProperty("--fret-index", fret);
      noteLayer.appendChild(note);
    }
  });

  shell.appendChild(lineLayer);
  shell.appendChild(markerLayer);
  shell.appendChild(noteLayer);
  container.appendChild(shell);
}

function updateInstrumentHighlights(options = {}) {
  const overrideScale = options.scaleOverride || previewScaleOverride || null;
  const scalePcs = overrideScale?.pitchClasses || currentScale.pitchClasses;
  const { set: highlightSet, isolation } = getHighlightSet(scalePcs);
  const elements = document.querySelectorAll("#keyboardVisualizer .key, #fretboardVisualizer .fret-note");
  elements.forEach(el => {
    el.classList.remove("tone-root", "tone-top", "tone-tone", "tone-selected");
  });
  const chordPcs = activeChordPitchClasses && activeChordPitchClasses.size ? activeChordPitchClasses : null;
  const chordRootPc = chordPcs && selectedChordNotes ? chordNotesToPcs(selectedChordNotes)[0] ?? null : null;
  const chordTopPc = chordPcs && selectedChordNotes ? (() => {
    const pcs = chordNotesToPcs(selectedChordNotes);
    return pcs.length ? pcs[pcs.length - 1] : null;
  })() : null;

  elements.forEach(el => {
    const pc = Number(el.dataset.pc);
    const color = pcColor(pc);
    el.style.setProperty("--pc-color", color);
    el.style.setProperty("--deg-color", color);
    if (highlightSet && highlightSet.has(pc)) {
      el.classList.add("lit");
      if (chordPcs && chordPcs.has(pc)) {
        if (chordTopPc !== null && pc === chordTopPc && !(chordRootPc !== null && pc === chordRootPc)) el.classList.add("tone-top");
        else if (chordRootPc !== null && pc === chordRootPc) el.classList.add("tone-root");
        else el.classList.add("tone-tone");
      } else if (selectedExplorerNotePc !== null && pc === selectedExplorerNotePc) {
        el.classList.add("tone-selected");
      }
      el.classList.remove("dim");
    } else {
      el.classList.remove("lit");
      if (isolation) el.classList.add("dim");
      else el.classList.remove("dim");
    }
  });
  document.querySelectorAll("#keyboardVisualizer .key, #fretboardVisualizer .fret-note").forEach(el => {
    el.classList.remove("spotlit", "emphasis");
  });
  if (selectedExplorerNotePc !== null) {
    const spot = document.querySelectorAll(`#keyboardVisualizer .key[data-pc="${selectedExplorerNotePc}"], #fretboardVisualizer .fret-note[data-pc="${selectedExplorerNotePc}"]`);
    spot.forEach(el => el.classList.add("spotlit"));
  }
  if (selectedChordNotes) {
    const pcs = chordNotesToPcs(selectedChordNotes);
    if (pcs.length) {
      const firstPc = pcs[0];
      const lastPc = pcs[pcs.length - 1];
      const targetsRoot = document.querySelectorAll(`#keyboardVisualizer .key[data-pc="${firstPc}"], #fretboardVisualizer .fret-note[data-pc="${firstPc}"]`);
      targetsRoot.forEach(el => el.classList.add("tone-root"));
      if (lastPc !== firstPc) {
        const targetsTop = document.querySelectorAll(`#keyboardVisualizer .key[data-pc="${lastPc}"], #fretboardVisualizer .fret-note[data-pc="${lastPc}"]`);
        targetsTop.forEach(el => el.classList.add("tone-top"));
      }
    }
  }
}

function scheduleHighlightUpdate(scaleOverride = null) {
  pendingHighlightScale = scaleOverride;
  if (highlightRafPending) return;
  highlightRafPending = true;
  requestAnimationFrame(() => {
    highlightRafPending = false;
    const useScale = pendingHighlightScale || previewScaleOverride || null;
    pendingHighlightScale = null;
    updateInstrumentHighlights({ scaleOverride: useScale });
  });
}

function updateChordHighlightUI() {
  scheduleHighlightUpdate();
  document.querySelectorAll(".chord-row").forEach(row => {
    row.classList.toggle("selected", row.dataset.chordName === selectedChordName);
  });
}

function formatChordNotes(notes) {
  if (!notes) return "";
  const parts = notes.split("-").map(note => note.trim());
  return parts.map((note, idx) => {
    const pc = noteNameToPc(note);
    const color = pc === null ? "#7c6dff" : pcColor(pc);
    const noteSpan = `<span class="chord-note" style="--pc-color:${color}; --deg-color:${color}">${note}</span>`;
    if (idx === parts.length - 1) return noteSpan;
    return `${noteSpan}<span class="chord-sep">-</span>`;
  }).join("");
}

function renderChordLists() {
  const allBtn = document.getElementById("allChordsBtn");
  const headingDesc = document.getElementById("chordHeadingDesc");
  const tabsEl = document.getElementById("chordCategoryTabs");
  const panelEl = document.getElementById("chordCategoryPanel");
  const statusEl = document.getElementById("rootFilterStatus");
  if (!tabsEl || !panelEl) return;
  const data = filteredChords || currentChords;
  const isFiltered = Boolean(selectedRootNote);
  const availableNames = new Set();
  if (allBtn) {
    allBtn.style.display = isFiltered ? "" : "none";
    allBtn.disabled = !isFiltered;
  }
  if (headingDesc) headingDesc.textContent = isFiltered ? `Chords rooted on ${selectedRootNote}` : "";
  if (statusEl) statusEl.textContent = "";

  const categoryCounts = {};
  CHORD_CATEGORIES.forEach(cat => {
    if (cat.key === "all") return;
    categoryCounts[cat.key] = data?.categories?.[cat.key]?.length || 0;
  });

  if (activeChordCategory && activeChordCategory !== "all" && !categoryCounts[activeChordCategory]) {
    const fallback = CHORD_CATEGORIES.find(cat => cat.key !== "all" && categoryCounts[cat.key]);
    activeChordCategory = fallback ? fallback.key : null;
  }

  tabsEl.innerHTML = CHORD_CATEGORIES.map(cat => {
    const isActive = cat.key === activeChordCategory;
    const disabled = cat.key !== "all" && !categoryCounts[cat.key];
    const attrs = [
      `class="chord-tab${isActive ? " is-active" : ""}${disabled ? " is-disabled" : ""}"`,
      `data-category="${cat.key}"`,
      'role="tab"',
      `tabindex="0"`,
      `aria-selected="${isActive ? "true" : "false"}"`,
      `aria-controls="chordCategoryPanel"`
    ];
    if (disabled) attrs.push("disabled");
    return `<button ${attrs.join(" ")}>${cat.label}</button>`;
  }).join("");

  const items = (() => {
    if (!activeChordCategory) return [];
    if (activeChordCategory === "all") {
      return CHORD_CATEGORIES
        .filter(cat => cat.key !== "all")
        .flatMap(cat => data.categories[cat.key] || []);
    }
    return data.categories[activeChordCategory] || [];
  })();

  if (items.length && activeChordCategory) {
    panelEl.innerHTML = items.map(ch => {
      availableNames.add(ch.name);
      return renderChordRow(ch);
    }).join("");
  } else {
    const hint = activeChordCategory ? "No chords available." : "Select a category.";
    panelEl.innerHTML = `<p class="filter-status">${hint}</p>`;
  }

  if (selectedChordName && !availableNames.has(selectedChordName)) {
    activeChordPitchClasses = null;
    selectedChordName = null;
    updateInstrumentHighlights();
  }
  updateChordHighlightUI();
}

function clearRootFilter() {
  selectedRootNote = null;
  filteredChords = null;
  selectedChordName = null;
  selectedChordNotes = null;
  selectedExplorerNotePc = null;
  selectedHarmonyChordIndex = null;
  activeChordPitchClasses = null;
  renderScaleStrip(currentScale.spelled);
  setTileMetrics();
  renderHarmonyGrid();
  renderChordLists();
  scheduleHighlightUpdate();
  maybePlayCurrentSelection("note-clear");
}

function handleRootTap(note) {
  selectedRootNote = note;
  filteredChords = filterChordsByRoot(currentChords, selectedRootNote);
  selectedChordName = null;
  selectedChordNotes = null;
  activeChordPitchClasses = null;
  selectExplorerNote(noteNameToPc(note));
  renderScaleStrip(currentScale.spelled);
  setTileMetrics();
  renderChordLists();
  scheduleHighlightUpdate();
  maybePlayCurrentSelection("note-select");
}

function clearChordHighlight() {
  activeChordPitchClasses = null;
  selectedChordName = null;
  selectedChordNotes = null;
  updateChordHighlightUI();
  maybePlayCurrentSelection("chord-clear");
}

function setChordHighlight(name, notes) {
  if (!name || !notes) return;
  if (selectedChordName === name) {
    clearChordHighlight();
    return;
  }
  const pcs = chordNotesToPcs(notes);
  if (!pcs.length) return;
  activeChordPitchClasses = new Set(pcs);
  selectedChordName = name;
  selectedChordNotes = notes;
  updateChordHighlightUI();
  maybePlayCurrentSelection("chord-select");
}

function updatePills() {
  const pc = pillPreview.keyPc ?? currentKeyPc;
  const modeIdx = pillPreview.mode ?? currentModeIndex;
  const pref = enharmonicPreferenceByPc[pc] || null;
  const display = computeDisplayScale(pc, modeIdx, pref);
  const keyValueEl = document.getElementById("keyPillValue");
  if (isEnharmonicPc(pc)) {
    const labels = ENHARMONIC_OPTIONS[pc];
    const isSharp = display.tonicLabel.includes("#");
    keyValueEl.innerHTML = `
      <span class="key-dual" role="button" tabindex="0" aria-label="Toggle enharmonic spelling">
        <span class="key-opt key-opt--sharp ${isSharp ? "is-active" : ""}">${labels.sharp}</span>
        <span class="key-slash">/</span>
        <span class="key-opt key-opt--flat ${!isSharp ? "is-active" : ""}">${labels.flat}</span>
      </span>
    `;
  } else {
    keyValueEl.textContent = display.tonicLabel;
  }
  document.getElementById("modePillValue").textContent = MODE_NAMES[modeIdx];
}

// -------------------- ROMAN NUMERALS ------------------------

function computeRomans(pitchClasses) {
  if (!pitchClasses || pitchClasses.length !== 7) {
    return ["I","II","III","IV","V","VI","VII"];
  }
  const romans = [];
  for (let i = 0; i < pitchClasses.length; i++) {
    const root = pitchClasses[i];
    const int3 = wrap(pitchClasses[(i + 2) % 7] - root, 12);
    const int5 = wrap(pitchClasses[(i + 4) % 7] - root, 12);
    const triad = intervalQuality(int3, int5);
    let numeral = ["I","II","III","IV","V","VI","VII"][i];
    if (triad.name === "minor") numeral = numeral.toLowerCase();
    if (triad.name === "diminished") numeral = numeral.toLowerCase() + "°";
    romans.push(numeral);
  }
  return romans;
}

// -------------------- STATE UPDATES ------------------------

function drawFromState(options = {}) {
  const { forcedSpelled, forcedPitchClasses, forcedTonicLabel, skipRespell } = options;
  let display;
  if (forcedSpelled && forcedPitchClasses && forcedTonicLabel && skipRespell) {
    currentScale = { pitchClasses: forcedPitchClasses, spelled: forcedSpelled };
    currentKeyPc = forcedPitchClasses[0];
    currentKeyIndex = findKeyIndexForPc(currentKeyPc, forcedTonicLabel);
    display = {
      tonicLabel: forcedTonicLabel,
      spelled: forcedSpelled,
      pitchClasses: forcedPitchClasses,
      preferenceUsed: null,
      keyIdx: currentKeyIndex
    };
  } else {
    const pref = enharmonicPreferenceByPc[currentKeyPc] || null;
    display = computeDisplayScale(currentKeyPc, currentModeIndex, pref);
    currentKeyIndex = display.keyIdx;
    currentKeyPc = display.pitchClasses[0];
    currentScale = { pitchClasses: display.pitchClasses, spelled: display.spelled };
  }
  const modeName = MODE_NAMES[currentModeIndex];

  currentChords = analyzeChords(display.spelled, display.pitchClasses);
  renderScaleStrip(display.spelled);
  setTileMetrics();
  updatePills();
  selectedRootNote = null;
  filteredChords = null;
  activeScalePitchClasses = new Set(display.pitchClasses);
  activeChordPitchClasses = null;
  selectedChordName = null;
  selectedChordNotes = null;
  selectedHarmonyChordIndex = null;
  selectedExplorerNotePc = null;
  globalHarmonyMax = 7;
  rowHarmonyMaxOverrides.clear();
  activeChordCategory = null;
  updateHarmonyKeyModeLabel();
  renderHarmonyGrid();
  renderChordLists();
  scheduleHighlightUpdate();
  maybePlayCurrentSelection("state-change");

  const r1 = document.getElementById("results1");
  const r2 = document.getElementById("results2");
  const r3 = document.getElementById("results3");
  if (r1) r1.textContent = "";
  if (r2) r2.textContent = "";
  if (r3) r3.textContent = "";
}

function rotateDegree(dir) {
  if (!currentScale.pitchClasses.length) return;
  rotateDegrees(dir);
}

function rotateDegrees(steps) {
  if (!currentScale.pitchClasses.length) return;
  const len = currentScale.pitchClasses.length;
  const n = ((steps % len) + len) % len;
  if (n === 0) return;
  const newPitchClasses = [...currentScale.pitchClasses.slice(n), ...currentScale.pitchClasses.slice(0, n)];
  currentModeIndex = wrap(currentModeIndex + n, MODE_NAMES.length);
  currentKeyPc = newPitchClasses[0];
  drawFromState();
}

function transposeSemitone(delta) {
  if (!currentScale.pitchClasses.length) return;
  transposeSemitoneBy(delta);
}

function transposeSemitoneBy(delta) {
  if (!currentScale.pitchClasses.length || delta === 0) return;
  const newPc = wrap(currentScale.pitchClasses[0] + delta, 12);
  currentKeyPc = newPc;
  drawFromState();
}

// -------------------- MODALS ------------------------

function setupPickerModal() {
  const modal = document.getElementById("wheelModal");
  const title = document.getElementById("wheelModalTitle");
  const list = document.getElementById("wheelModalList");
  const closeBtn = document.getElementById("closeWheelModal");
  const backdrop = modal.querySelector(".wheel-modal-backdrop");
  let activeKind = null;

  const close = () => {
    modal.classList.add("hidden");
    activeKind = null;
  };

  const open = (kind) => {
    activeKind = kind;
    const currentIdx = kind === "key" ? currentKeyIndex : currentModeIndex;
    title.textContent = kind === "key" ? "Select key" : "Select mode";
    if (kind === "key") {
      const items = KEY_OPTIONS.map((opt, idx) => {
        const pc = NOTE_TO_INDEX[opt.value];
        if (isEnharmonicPc(pc)) {
          const { preferred, combinedLabel } = bestEnharmonicLabel(pc, currentModeIndex);
          return { label: combinedLabel, idx, pref: preferred };
        }
        return { label: opt.label, idx, pref: null };
      });
      list.innerHTML = items.map(({ label, idx, pref }) =>
        `<button type="button" role="option" data-idx="${idx}" data-pref="${pref ?? ""}" class="${idx === currentIdx ? "active" : ""}">${label}</button>`
      ).join("");
    } else {
      list.innerHTML = MODE_NAMES.map((label, idx) =>
        `<button type="button" role="option" data-idx="${idx}" class="${idx === currentModeIndex ? "active" : ""}">${label}</button>`
      ).join("");
    }
    modal.classList.remove("hidden");
    list.focus();
  };

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-idx]");
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    if (Number.isNaN(idx)) return;
    if (activeKind === "key") {
      currentKeyIndex = idx;
      currentKeyPc = NOTE_TO_INDEX[keyValue(idx)];
      const pref = btn.dataset.pref;
      if (pref) {
        const pc = currentKeyPc;
        if (isEnharmonicPc(pc)) enharmonicPreferenceByPc[pc] = pref;
      }
    } else if (activeKind === "mode") {
      currentModeIndex = idx;
    }
    pillPreview = { keyPc: null, mode: null, forceNoRespell: false, spelledOverride: null, tonicLabelOverride: null };
    drawFromState();
    close();
  });

  [closeBtn, backdrop].forEach(el => el.addEventListener("click", close));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      close();
    }
  });

  return { open };
}

// -------------------- METRICS ------------------------

function setTileMetrics() {
  const viewport = document.querySelector(".tile-viewport");
  const track = document.getElementById("scaleTiles");
  if (!viewport || !track) return;
  const style = getComputedStyle(track);
  const gap = parseFloat(style.gap) || 6;
  const rawWidth = (viewport.clientWidth - gap * 6) / 7;
  const tileWidth = Math.max(40, Math.floor(rawWidth));
  viewport.style.setProperty("--tile-gap", `${gap}px`);
  viewport.style.setProperty("--tile-width", `${tileWidth}px`);
  const rowHeight = viewport.clientHeight || tileWidth + 24;
  tileMetrics = {
    gap,
    width: tileWidth,
    segmentWidth: tileWidth * 7 + gap * 6,
    rowHeight
  };
}

// -------------------- DRAG / SWIPE ------------------------

function calcTileStep(axis) {
  if (axis === "x") return tileMetrics.width + tileMetrics.gap;
  return tileMetrics.rowHeight;
}

function previewRotateState(steps) {
  const len = currentScale.pitchClasses.length;
  if (!len) return { keyPc: currentKeyPc, modeIdx: currentModeIndex };
  const n = ((steps % len) + len) % len;
  const rotated = [...currentScale.pitchClasses.slice(n), ...currentScale.pitchClasses.slice(0, n)];
  const tonicPc = rotated[0];
  const modeIdx = wrap(currentModeIndex + n, MODE_NAMES.length);
  return { keyPc: tonicPc, modeIdx };
}

function setupScaleStripDrag() {
  const strip = document.getElementById("scaleStrip");
  const track = document.getElementById("scaleTiles");
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let lockedDir = null;
  let lastDx = 0;
  let lastDy = 0;
  let baseX = 0;
  let baseY = 0;
  let stepX = 0;
  let stepY = 0;
  let moveListener = null;
  let upListener = null;
  let verticalRange = MAX_DRAG_STEPS;

  const lockThreshold = 16;

  const resetTransforms = () => {
    const notesLayer = document.getElementById("notesLayer");
    if (!notesLayer) return;
    notesLayer.style.transition = "none";
    notesLayer.style.transform = "translate3d(0,0,0)";
  };

  const applyPreview = (dir, steps) => {
    let previewKeyPc = currentKeyPc;
    let previewModeIdx = currentModeIndex;
    if (dir === "x") {
      const { keyPc, modeIdx } = previewRotateState(steps);
      pillPreview.mode = modeIdx;
      pillPreview.keyPc = keyPc;
      previewKeyPc = keyPc;
      previewModeIdx = modeIdx;
      pillPreview.forceNoRespell = false;
      pillPreview.spelledOverride = null;
      pillPreview.tonicLabelOverride = null;
    } else if (dir === "y") {
      previewKeyPc = wrap(currentScale.pitchClasses[0] + steps, 12);
      pillPreview.keyPc = previewKeyPc;
      pillPreview.forceNoRespell = false;
      pillPreview.spelledOverride = null;
      pillPreview.tonicLabelOverride = null;
    }
    const pref = enharmonicPreferenceByPc[previewKeyPc] || null;
    const previewScale = computeDisplayScale(previewKeyPc, previewModeIdx, pref);
    previewScaleOverride = previewScale;
    updatePills();
    scheduleHighlightUpdate(previewScale);
  };

  const finishAnimation = (action) => {
    const notesLayer = document.getElementById("notesLayer");
    if (!notesLayer) {
      action();
      resetTransforms();
      pillPreview = { keyPc: null, mode: null, forceNoRespell: false, spelledOverride: null, tonicLabelOverride: null };
      updatePills();
      dragCooldown = true;
      setTimeout(() => { dragCooldown = false; }, 150);
      return;
    }
    const handle = () => {
      notesLayer.removeEventListener("transitionend", handle);
      action();
      resetTransforms();
      pillPreview = { keyPc: null, mode: null, forceNoRespell: false, spelledOverride: null, tonicLabelOverride: null };
      previewScaleOverride = null;
      updatePills();
      dragCooldown = true;
      setTimeout(() => { dragCooldown = false; }, 150);
    };
    notesLayer.addEventListener("transitionend", handle);
  };

  function onStart(e) {
    if (dragCooldown) return;
    stripDragging = true;
    tapStart = { x: e.clientX, y: e.clientY, time: performance.now() };
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    lockedDir = null;
    lastDx = 0;
    lastDy = 0;
    track.style.transition = "none";
    setTileMetrics();
    if (strip.setPointerCapture) strip.setPointerCapture(e.pointerId);
    moveListener = (ev) => onMove(ev);
    upListener = (ev) => onEnd(ev);
    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
    window.addEventListener("pointercancel", upListener);
  }

  function onMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    lastDx = dx;
    lastDy = dy;
    if (!lockedDir && (Math.abs(dx) > lockThreshold || Math.abs(dy) > lockThreshold)) {
      lockedDir = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (lockedDir === "x") {
        renderHorizontalWithWrap(currentScale.spelled);
        stepX = calcTileStep("x");
        const segmentWidth = tileMetrics.segmentWidth;
        baseX = -segmentWidth;
        const notesLayer = document.getElementById("notesLayer");
        if (notesLayer) notesLayer.style.transform = `translate3d(${baseX}px,0,0)`;
      } else {
        verticalRange = MAX_DRAG_STEPS;
        renderVerticalRows();
        const viewport = document.querySelector(".tile-viewport");
        const viewportH = viewport?.clientHeight || tileMetrics.rowHeight;
        stepY = viewportH;
        baseY = -viewportH * verticalRange;
        const notesLayer = document.getElementById("notesLayer");
        if (notesLayer) notesLayer.style.transform = `translate3d(0,${baseY}px,0)`;
      }
    }
    if (!lockedDir) return;

    const notesLayer = document.getElementById("notesLayer");
    if (!notesLayer) return;

    if (lockedDir === "x") {
      const maxDx = stepX * MAX_DRAG_STEPS;
      const clampedDx = Math.max(-maxDx, Math.min(maxDx, dx));
      notesLayer.style.transform = `translate3d(${baseX + clampedDx}px,0,0)`;
      const rawSteps = clampedDx / stepX;
      const previewSteps = Math.max(-MAX_DRAG_STEPS, Math.min(MAX_DRAG_STEPS, Math.round(rawSteps)));
      applyPreview("x", -previewSteps);
    } else {
      track.classList.add("vertical-track");
      const maxDy = stepY * MAX_DRAG_STEPS;
      const clampedDy = Math.max(-maxDy, Math.min(maxDy, dy));
      notesLayer.style.transform = `translate3d(0,${baseY + clampedDy}px,0)`;
      const rawSteps = clampedDy / stepY;
      const previewSteps = Math.max(-MAX_DRAG_STEPS, Math.min(MAX_DRAG_STEPS, Math.round(rawSteps)));
      applyPreview("y", previewSteps);
    }
    if (e.cancelable) e.preventDefault();
  }

  function onEnd(e) {
    if (strip.releasePointerCapture && e) {
      try { strip.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    if (!dragging) return;
    dragging = false;
    const absX = Math.abs(lastDx);
    const absY = Math.abs(lastDy);
    const notesLayer = document.getElementById("notesLayer");
    if (!notesLayer) return;

    if (lockedDir === "x") {
      const finalStepsRaw = lastDx / stepX;
      const finalSteps = Math.max(-MAX_DRAG_STEPS, Math.min(MAX_DRAG_STEPS, Math.round(finalStepsRaw)));
      const targetX = baseX + finalSteps * stepX;
      notesLayer.style.transition = "transform 0.2s ease";
      notesLayer.style.transform = `translate3d(${targetX}px,0,0)`;
      if (finalSteps !== 0) {
        finishAnimation(() => rotateDegrees(-finalSteps));
      } else {
        const resetAfter = () => {
          notesLayer.removeEventListener("transitionend", resetAfter);
          renderScaleStrip(currentScale.spelled);
          resetTransforms();
          pillPreview = { keyPc: null, mode: null, forceNoRespell: false, spelledOverride: null, tonicLabelOverride: null };
          previewScaleOverride = null;
          updatePills();
          dragCooldown = true;
          setTimeout(() => { dragCooldown = false; }, 150);
          scheduleHighlightUpdate();
        };
        notesLayer.addEventListener("transitionend", resetAfter, { once: true });
      }
    } else if (lockedDir === "y") {
      const finalStepsRaw = lastDy / stepY;
      const finalSteps = Math.max(-MAX_DRAG_STEPS, Math.min(MAX_DRAG_STEPS, Math.round(finalStepsRaw)));
      const targetY = baseY + finalSteps * stepY;
      notesLayer.style.transition = "transform 0.2s ease";
      notesLayer.style.transform = `translate3d(0,${targetY}px,0)`;
      if (finalSteps !== 0) {
        finishAnimation(() => transposeSemitoneBy(finalSteps));
      } else {
        const resetAfter = () => {
          notesLayer.removeEventListener("transitionend", resetAfter);
          renderScaleStrip(currentScale.spelled);
          resetTransforms();
          pillPreview = { keyPc: null, mode: null, forceNoRespell: false, spelledOverride: null, tonicLabelOverride: null };
          previewScaleOverride = null;
          updatePills();
          dragCooldown = true;
          setTimeout(() => { dragCooldown = false; }, 150);
          scheduleHighlightUpdate();
        };
        notesLayer.addEventListener("transitionend", resetAfter, { once: true });
      }
    }
    lockedDir = null;
    stripDragging = false;
    window.removeEventListener("pointermove", moveListener);
    window.removeEventListener("pointerup", upListener);
    window.removeEventListener("pointercancel", upListener);

    // Tap detection for root filtering
    const movedFar = Math.abs(lastDx) > TAP_MOVE_THRESHOLD || Math.abs(lastDy) > TAP_MOVE_THRESHOLD || lockedDir !== null;
    if (tapStart && !movedFar) {
      const dx = Math.abs((e ? e.clientX : tapStart.x) - tapStart.x);
      const dy = Math.abs((e ? e.clientY : tapStart.y) - tapStart.y);
      if (dx < TAP_MOVE_THRESHOLD && dy < TAP_MOVE_THRESHOLD) {
        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const noteEl = targetEl ? targetEl.closest(".note-label") : null;
        if (noteEl && noteEl.dataset.note) {
          handleRootTap(noteEl.dataset.note);
        }
      }
    }
    tapStart = null;
  }

  strip.addEventListener("pointerdown", onStart);
  strip.addEventListener("pointermove", onMove);
  strip.addEventListener("pointerup", onEnd);
  strip.addEventListener("pointercancel", onEnd);
  strip.addEventListener("touchmove", (e) => {
    if (dragging && e.cancelable) e.preventDefault();
  }, { passive: false });
}

// -------------------- INIT ------------------------

document.addEventListener("DOMContentLoaded", () => {
  const modal = setupPickerModal();
  const keyPillEl = document.getElementById("keyPill");
  keyPillEl.addEventListener("click", (e) => {
    if (e.target.closest(".key-dual")) return;
    modal.open("key");
  });
  keyPillEl.addEventListener("keydown", (e) => {
    if (e.target.closest(".key-dual")) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      modal.open("key");
    }
  });
  document.getElementById("modePill").addEventListener("click", () => modal.open("mode"));

  currentKeyPc = NOTE_TO_INDEX[keyValue(currentKeyIndex)];
  const handleDualToggle = (e) => {
    const dual = e.target.closest(".key-dual");
    if (!dual) return;
    e.stopPropagation();
    e.preventDefault();
    if (!isEnharmonicPc(currentKeyPc)) return;
    const currentPref = enharmonicPreferenceByPc[currentKeyPc];
    const nextPref = currentPref === "sharp" ? "flat" : "sharp";
    enharmonicPreferenceByPc[currentKeyPc] = nextPref;
    drawFromState();
  };
  document.addEventListener("click", (e) => {
    if (e.target.closest(".key-dual")) handleDualToggle(e);
  });
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.closest(".key-dual")) {
      handleDualToggle(e);
    }
  });

  const allChordsBtn = document.getElementById("allChordsBtn");
  if (allChordsBtn) {
    allChordsBtn.addEventListener("click", () => clearRootFilter());
  }

  const scaleTiles = document.getElementById("scaleTiles");
  if (scaleTiles) {
    scaleTiles.addEventListener("click", (e) => {
      if (stripDragging) return;
      const noteEl = e.target.closest(".note-label");
      if (!noteEl) return;
      const note = noteEl.textContent.trim();
      if (!note) return;
      handleRootTap(note);
    });
  }
  setupScaleStripDrag();
  const chordTabs = document.getElementById("chordCategoryTabs");
  if (chordTabs) {
    chordTabs.addEventListener("click", (e) => {
      const tab = e.target.closest(".chord-tab");
      if (!tab || tab.disabled) return;
      const nextCategory = tab.dataset.category;
      if (!nextCategory || nextCategory === activeChordCategory) return;
      activeChordCategory = nextCategory;
      renderChordLists();
    });
  }

  const chordPanel = document.getElementById("chordCategoryPanel");
  if (chordPanel) {
    chordPanel.addEventListener("click", (e) => {
      const row = e.target.closest(".chord-row");
      if (!row) return;
      const name = row.dataset.chordName;
      const notes = row.dataset.notes;
      setChordHighlight(name, notes);
    });
  }

  const harmonyBody = document.getElementById("harmonyGridBody");
  if (harmonyBody) {
    harmonyBody.addEventListener("click", (e) => {
      const cell = e.target.closest(".harmony-cell");
      const rowEl = e.target.closest(".harmony-row");
      const rowIdx = rowEl ? Number(rowEl.dataset.rowIndex) : null;
      if (!cell || rowIdx === null || Number.isNaN(rowIdx)) return;
      const targetDegree = Number(cell.dataset.degree);
      if (!targetDegree) return;
      const targetMax = resolveMaxDegree(targetDegree);
      const currentMax = resolveMaxDegree(getRowMax(rowIdx));
      if (targetMax === currentMax) {
        selectHarmonyChord(rowIdx);
        if (!audioMuted) playStrumOnly(rowIdx, currentMax);
        return;
      }
      rowHarmonyMaxOverrides.set(rowIdx, targetMax);
      selectHarmonyChord(rowIdx);
      if (!audioMuted) playChordTonesThenStrum(rowIdx, targetMax);
    });
  }

  const harmonyHeader = document.getElementById("harmonyGridHeader");
  const setGlobalDepth = (level) => {
    if (!level) return;
    const next = resolveMaxDegree(level);
    if (globalHarmonyMax === next) return;
    globalHarmonyMax = next;
    rowHarmonyMaxOverrides.clear();
    renderHarmonyGrid();
    const playRow = selectedHarmonyChordIndex ?? 0;
    if (!audioMuted && harmonyRows[playRow]) {
      playChordTonesThenStrum(playRow, getRowMax(playRow));
    }
  };
  if (harmonyHeader) {
    harmonyHeader.addEventListener("click", (e) => {
      const head = e.target.closest(".tone-head[data-degree]");
      if (!head) return;
      const level = Number(head.dataset.degree) || 3;
      setGlobalDepth(level);
    });
    harmonyHeader.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const head = e.target.closest(".tone-head[data-degree]");
      if (!head) return;
      e.preventDefault();
      const level = Number(head.dataset.degree) || 3;
      setGlobalDepth(level);
    });
  }

  const harmonyCardHeader = document.querySelector(".harmony-header");
  if (harmonyCardHeader) {
    harmonyCardHeader.addEventListener("click", () => setMobilePanel("harmony"));
  }
  const harmonyStrip = document.getElementById("harmonyStrip");
  if (harmonyStrip) {
    harmonyStrip.addEventListener("click", () => setMobilePanel("keymode"));
    harmonyStrip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setMobilePanel("keymode");
      }
    });
  }

  const soundToggle = document.getElementById("soundToggle");
  updateSoundToggleUI();
  if (soundToggle) {
    soundToggle.addEventListener("click", async () => {
      if (audioMuted) {
        // Unmute: must be a user gesture to unlock audio.
        const ok = await ensureAudioRunning();
        if (!ok) {
          audioMuted = true;
          updateSoundToggleUI();
          return;
        }
        audioMuted = false;
        // Sync gain now that we're unmuted.
        if (masterGain) masterGain.gain.setValueAtTime(AUDIO_MASTER_GAIN, audioCtx.currentTime);
        updateSoundToggleUI();
        playTestPing();
        maybePlayCurrentSelection("unmute");
      } else {
        // Mute
        audioMuted = true;
        stopPlayback();
        if (masterGain && audioCtx) masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
        updateSoundToggleUI();
      }
    });
  }

  document.getElementById("random").addEventListener("click", () => {
    currentKeyIndex = Math.floor(Math.random() * KEY_OPTIONS.length);
    currentKeyPc = NOTE_TO_INDEX[keyValue(currentKeyIndex)];
    currentModeIndex = Math.floor(Math.random() * MODE_NAMES.length);
    drawFromState();
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setTileMetrics();
    }, 150);
  });

  // Info modal wiring
  const infoBtn = document.getElementById("infoButton");
  const infoModal = document.getElementById("infoModal");
  const infoBackdrop = infoModal?.querySelector(".wheel-modal-backdrop");
  const closeInfo = document.getElementById("closeInfoModal");
  const openInfo = () => {
    if (infoModal) infoModal.classList.remove("hidden");
  };
  const closeInfoModal = () => {
    if (infoModal) infoModal.classList.add("hidden");
  };
  if (infoBtn) infoBtn.addEventListener("click", openInfo);
  if (closeInfo) closeInfo.addEventListener("click", closeInfoModal);
  if (infoBackdrop) infoBackdrop.addEventListener("click", closeInfoModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && infoModal && !infoModal.classList.contains("hidden")) {
      closeInfoModal();
    }
  });

  renderKeyboardVisualizer();
  renderFretboardVisualizer();
  const mobileQuery = window.matchMedia("(max-width: 768px)");
  const handleViewportChange = (mq) => {
    isMobile = mq.matches;
    if (!isMobile) mobileActivePanel = "keymode";
    applyMobilePanelState();
  };
  handleViewportChange(mobileQuery);
  if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", handleViewportChange);
  else mobileQuery.addListener(handleViewportChange);
  updateHarmonyKeyModeLabel();
  renderHarmonyGrid();
  drawFromState();
});
