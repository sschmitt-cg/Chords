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
const ITEM_STRIDE = 42; // item height + gap in wheel
const WHEEL_VIEW = 5;
const DRAG_THRESHOLD = 36;
const LETTER_TO_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTERS = ["C","D","E","F","G","A","B"];

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

// -------------------- CHORD ANALYSIS ------------------------

function triadQuality(int3, int5) {
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
  const hasMajorNine = int9 === 2 || int9 === 14;
  if (!seventhQual.valid) return { label: `${seventhQual.label || "?7"}9`, valid: false };

  switch (seventhQual.label) {
    case "maj7": return { label: hasMajorNine ? "maj9" : "maj9?", valid: hasMajorNine };
    case "7": return { label: hasMajorNine ? "9" : "9?", valid: hasMajorNine };
    case "m7": return { label: hasMajorNine ? "m9" : "m9?", valid: hasMajorNine };
    case "m(maj7)": return { label: hasMajorNine ? "m(maj9)" : "m(maj9?)", valid: hasMajorNine };
    case "m7b5": return { label: hasMajorNine ? "m9b5" : "m9b5?", valid: hasMajorNine };
    case "dim7": return { label: hasMajorNine ? "dim9" : "dim9?", valid: hasMajorNine };
    case "7#5": return { label: hasMajorNine ? "9#5" : "9#5?", valid: hasMajorNine };
    case "maj7#5": return { label: hasMajorNine ? "maj9#5" : "maj9#5?", valid: hasMajorNine };
    default: return { label: `${seventhQual.label}9`, valid: hasMajorNine };
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

    const triad = triadQuality(int3, int5);
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

// -------------------- STATE ------------------------

let currentKeyIndex = 0;
let currentModeIndex = 0;
let currentChords = { categories: { triads: [], sevenths: [], ninths: [], suspended: [] }, degrees: [] };

const keyLabel = (idx) => KEY_OPTIONS[wrap(idx, KEY_OPTIONS.length)].label;
const keyValue = (idx) => KEY_OPTIONS[wrap(idx, KEY_OPTIONS.length)].value;

// -------------------- WHEEL LOGIC ------------------------

function createWheel(containerId, trackId, items, onChange) {
  const container = document.getElementById(containerId);
  const track = document.getElementById(trackId);
  container.tabIndex = 0;

  let index = 0;
  let startY = 0;
  let dragging = false;

  function renderItems() {
    track.innerHTML = items.map((item, idx) =>
      `<button type="button" class="wheel-item" data-idx="${idx}">${item}</button>`
    ).join("");
    updateActive();
    applyTransform(0, true);
  }

  function offsetForIndex(idx, delta = 0) {
    return ((WHEEL_VIEW / 2 - 0.5 - idx) * ITEM_STRIDE) + delta;
  }

  function applyTransform(delta = 0, animate = false) {
    track.style.transition = animate ? "transform 0.18s ease" : "none";
    track.style.transform = `translateY(${offsetForIndex(index, delta)}px)`;
  }

  function updateActive() {
    const children = track.querySelectorAll(".wheel-item");
    children.forEach(btn => {
      btn.classList.toggle("active", Number(btn.dataset.idx) === index);
    });
  }

  function setIndex(idx, animate = true, notify = true) {
    index = wrap(idx, items.length);
    updateActive();
    applyTransform(0, animate);
    if (notify && onChange) onChange(index);
  }

  function startDrag(y) {
    startY = y;
    dragging = true;
    track.style.transition = "none";
  }

  function moveDrag(y) {
    if (!dragging) return;
    const delta = y - startY;
    applyTransform(delta, false);
  }

  function endDrag(y) {
    if (!dragging) return;
    dragging = false;
    const delta = y - startY;
    const steps = Math.round(delta / ITEM_STRIDE * -1);
    if (steps !== 0) {
      setIndex(index + steps, true);
    } else {
      applyTransform(0, true);
    }
  }

  container.addEventListener("pointerdown", (e) => {
    startDrag(e.clientY);
    container.setPointerCapture(e.pointerId);
  });
  container.addEventListener("pointermove", (e) => moveDrag(e.clientY));
  container.addEventListener("pointerup", (e) => {
    endDrag(e.clientY);
    container.releasePointerCapture(e.pointerId);
  });
  container.addEventListener("pointercancel", () => { dragging = false; applyTransform(0, true); });

  track.addEventListener("click", (e) => {
    const button = e.target.closest(".wheel-item");
    if (!button) return;
    const idx = Number(button.dataset.idx);
    setIndex(idx, true);
  });

  container.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex(index - 1, true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex(index + 1, true);
    }
  });

  renderItems();

  return { setIndex: (idx, animate = true, notify = true) => setIndex(idx, animate, notify), getIndex: () => index };
}

// -------------------- RENDERING ------------------------

function renderScaleStrip(scale) {
  const tiles = document.getElementById("scaleTiles");
  tiles.innerHTML = "";
  scale.forEach((note, idx) => {
    const tile = document.createElement("div");
    tile.className = "scale-tile" + (idx === 0 ? " tonic" : "");
    tile.innerHTML = `<div>${note}</div><small>${idx + 1}</small>`;
    tiles.appendChild(tile);
  });
}

function renderChordLists() {
  const { triads, sevenths, ninths, suspended } = currentChords.categories;
  const renderPanel = (elId, items) => {
    const el = document.getElementById(elId);
    el.innerHTML = items.map(ch => `
      <div class="chord-row${ch.valid ? "" : " warning"}">
        <div class="chord-name">${ch.name}</div>
        <div class="chord-notes">${ch.notes}</div>
      </div>
    `).join("");
  };

  renderPanel("triadsOutput", triads);
  renderPanel("seventhsOutput", sevenths);
  renderPanel("ninthsOutput", ninths);
  renderPanel("suspendedOutput", suspended);
}

function populateChordSelectors() {
  const selects = [
    document.getElementById("chord1"),
    document.getElementById("chord2"),
    document.getElementById("chord3")
  ];

  selects.forEach(sel => {
    sel.innerHTML = "";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "--";
    sel.appendChild(emptyOpt);

    currentChords.degrees.forEach((deg, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = deg.triad.name;
      sel.appendChild(opt);
    });
  });
}

function updateChordResult(selectEl, resultEl) {
  const idx = parseInt(selectEl.value, 10);
  if (isNaN(idx)) {
    resultEl.textContent = "";
    return;
  }
  const deg = currentChords.degrees[idx];
  resultEl.innerHTML =
    `<b>${deg.triad.name}</b>: ${deg.triad.notes}<br>` +
    `<b>${deg.seventh.name}</b>: ${deg.seventh.notes}<br>` +
    `<b>${deg.ninth.name}</b>: ${deg.ninth.notes}`;
}

function syncAccordion() {
  const accordion = document.getElementById("chordAccordion");
  if (!accordion) return;
  accordion.addEventListener("click", (e) => {
    const header = e.target.closest(".accordion-header");
    if (!header) return;
    const item = header.parentElement;
    const wasOpen = item.classList.contains("open");
    accordion.querySelectorAll(".accordion-item").forEach(el => el.classList.remove("open"));
    if (!wasOpen) item.classList.add("open");
  });
}

// -------------------- INTERACTION ------------------------

function drawFromState() {
  const keyName = keyValue(currentKeyIndex);
  const keyDisplay = keyLabel(currentKeyIndex);
  const modeName = MODE_NAMES[currentModeIndex];
  const { pitchClasses, spelled } = buildScaleData(keyName, modeName);

  document.getElementById("scaleOutput").innerHTML =
    `<h2>Scale:</h2> ${keyDisplay} ${modeName} - ${spelled.join(" - ")}`;

  currentChords = analyzeChords(spelled, pitchClasses);
  renderScaleStrip(spelled);
  renderChordLists();
  populateChordSelectors();

  document.getElementById("results1").textContent = "";
  document.getElementById("results2").textContent = "";
  document.getElementById("results3").textContent = "";
}

function shiftMode(delta, modeWheel) {
  currentModeIndex = wrap(currentModeIndex + delta, MODE_NAMES.length);
  modeWheel.setIndex(currentModeIndex, true, false);
  drawFromState();
}

function shiftKey(delta, keyWheel) {
  currentKeyIndex = wrap(currentKeyIndex + delta, KEY_OPTIONS.length);
  keyWheel.setIndex(currentKeyIndex, true, false);
  drawFromState();
}

function setupScaleStripDrag(modeWheel, keyWheel) {
  const strip = document.getElementById("scaleStrip");
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let claimed = false;

  function onStart(e) {
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    claimed = false;
    if (strip.setPointerCapture) strip.setPointerCapture(e.pointerId);
  }

  function onMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (!claimed && absX < DRAG_THRESHOLD && absY < DRAG_THRESHOLD) return;

    claimed = true;
    if (absX > absY) {
      shiftMode(dx > 0 ? 1 : -1, modeWheel);
    } else {
      shiftKey(dy < 0 ? 1 : -1, keyWheel);
    }
    startX = e.clientX;
    startY = e.clientY;
    if (e.cancelable) e.preventDefault();
  }

  function onEnd(e) {
    dragging = false;
    claimed = false;
    if (e && strip.releasePointerCapture) {
      try { strip.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  }

  strip.addEventListener("pointerdown", onStart);
  strip.addEventListener("pointermove", onMove);
  strip.addEventListener("pointerup", onEnd);
  strip.addEventListener("pointercancel", onEnd);
}

// -------------------- INIT ------------------------

document.addEventListener("DOMContentLoaded", () => {
  const keyWheel = createWheel("keyWheel", "keyWheelTrack", KEY_OPTIONS.map(o => o.label), (idx) => {
    currentKeyIndex = idx;
    drawFromState();
  });
  const modeWheel = createWheel("modeWheel", "modeWheelTrack", MODE_NAMES, (idx) => {
    currentModeIndex = idx;
    drawFromState();
  });

  setupScaleStripDrag(modeWheel, keyWheel);
  syncAccordion();

  document.getElementById("random").addEventListener("click", () => {
    currentKeyIndex = Math.floor(Math.random() * KEY_OPTIONS.length);
    currentModeIndex = Math.floor(Math.random() * MODE_NAMES.length);
    keyWheel.setIndex(currentKeyIndex, true, false);
    modeWheel.setIndex(currentModeIndex, true, false);
    drawFromState();
  });

  const chord1 = document.getElementById("chord1");
  const chord2 = document.getElementById("chord2");
  const chord3 = document.getElementById("chord3");
  const res1   = document.getElementById("results1");
  const res2   = document.getElementById("results2");
  const res3   = document.getElementById("results3");

  chord1.addEventListener("change", () => updateChordResult(chord1, res1));
  chord2.addEventListener("change", () => updateChordResult(chord2, res2));
  chord3.addEventListener("change", () => updateChordResult(chord3, res3));

  document.getElementById("clear").addEventListener("click", () => {
    [chord1, chord2, chord3].forEach(sel => sel.value = "");
    [res1, res2, res3].forEach(r => r.textContent = "");
  });

  document.getElementById("generate").addEventListener("click", () => {
    if (!currentChords.degrees.length) return;
    const n = currentChords.degrees.length;
    chord1.value = String(Math.floor(Math.random() * n));
    chord2.value = String(Math.floor(Math.random() * n));
    chord3.value = String(Math.floor(Math.random() * n));
    updateChordResult(chord1, res1);
    updateChordResult(chord2, res2);
    updateChordResult(chord3, res3);
  });

  document.getElementById("match").addEventListener("click", () => {
    drawFromState();
  });

  keyWheel.setIndex(currentKeyIndex, false, false);
  modeWheel.setIndex(currentModeIndex, false, false);
  drawFromState();
});
