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
let currentScale = { pitchClasses: [], spelled: [] };
let currentChords = { categories: { triads: [], sevenths: [], ninths: [], suspended: [] }, degrees: [] };
let pillPreview = { key: null, mode: null };
let dragCooldown = false;
let tileMetrics = { gap: 6, width: 52, segmentWidth: 400, rowHeight: 88 };

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

function buildScaleFromPc(pc, modeIdx, biasName) {
  const keyIdx = findKeyIndexForPc(pc, biasName);
  const keyName = keyValue(keyIdx);
  const modeName = MODE_NAMES[modeIdx];
  return buildScaleData(keyName, modeName);
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

// -------------------- RENDERING ------------------------

function renderScaleStrip(scale) {
  const track = document.getElementById("scaleTiles");
  track.classList.remove("vertical-track");
  track.style.transition = "none";
  track.style.transform = "translate3d(0,0,0)";
  const romans = computeRomans(currentScale.pitchClasses);
  const notes = scale.map((note, idx) =>
    `<div class="note-label${idx === 0 ? " tonic" : ""}"><div>${note}</div><small>${romans[idx] || ""}</small></div>`
  ).join("");
  track.innerHTML = `<div class="notes-layer" id="notesLayer">${notes}</div>`;
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
  const prevSet = rotateArray(scale, -1);
  const nextSet = rotateArray(scale, 1);
  const prevRomans = rotateArray(romans, -1);
  const nextRomans = rotateArray(romans, 1);
  const extended = [...prevSet, ...scale, ...nextSet];
  const extendedRomans = [...prevRomans, ...romans, ...nextRomans];
  const notes = extended.map((note, idx) => {
    const inCenter = idx >= scale.length && idx < scale.length * 2;
    const isTonic = inCenter && idx === scale.length;
    return `<div class="note-label${isTonic ? " tonic" : ""}"><div>${note}</div><small>${extendedRomans[idx] || ""}</small></div>`;
  }).join("");
  track.innerHTML = `<div class="notes-layer" id="notesLayer">${notes}</div>`;
}

function renderVerticalRows() {
  const track = document.getElementById("scaleTiles");
  track.classList.add("vertical-track");
  track.style.transition = "none";
  const plusOne = buildScaleFromPc(wrap(currentScale.pitchClasses[0] + 1, 12), currentModeIndex, currentScale.spelled[0]).spelled;
  const minusOne = buildScaleFromPc(wrap(currentScale.pitchClasses[0] - 1, 12), currentModeIndex, currentScale.spelled[0]).spelled;
  const rows = [
    { notes: plusOne, tag: "plus" },
    { notes: currentScale.spelled, tag: "current" },
    { notes: minusOne, tag: "minus" }
  ];
  const romans = computeRomans(currentScale.pitchClasses);
  const rowsHtml = rows.map(row =>
    `<div class="tile-row" style="height:${tileMetrics.rowHeight}px">${row.notes.map((note, idx) =>
      `<div class="note-label${idx === 0 && row.tag === "current" ? " tonic" : ""}"><div>${note}</div><small>${romans[idx] || ""}</small></div>`
    ).join("")}</div>`
  ).join("");
  track.innerHTML = `<div class="notes-layer vertical" id="notesLayer">${rowsHtml}</div>`;
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

function updatePills() {
  const keyIdx = pillPreview.key ?? currentKeyIndex;
  const modeIdx = pillPreview.mode ?? currentModeIndex;
  document.getElementById("keyPillValue").textContent = keyLabel(keyIdx);
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

function drawFromState() {
  const keyName = keyValue(currentKeyIndex);
  const keyDisplay = keyLabel(currentKeyIndex);
  const modeName = MODE_NAMES[currentModeIndex];
  const { pitchClasses, spelled } = buildScaleData(keyName, modeName);
  currentScale = { pitchClasses, spelled };

  document.getElementById("scaleOutput").innerHTML =
    `<h2>Scale:</h2> ${keyDisplay} ${modeName} - ${spelled.join(" - ")}`;

  currentChords = analyzeChords(spelled, pitchClasses);
  renderScaleStrip(spelled);
  setTileMetrics();
  updatePills();
  renderChordLists();
  populateChordSelectors();

  document.getElementById("results1").textContent = "";
  document.getElementById("results2").textContent = "";
  document.getElementById("results3").textContent = "";
}

function rotateDegree(dir) {
  if (!currentScale.pitchClasses.length) return;
  const newPitchClasses = dir > 0
    ? [...currentScale.pitchClasses.slice(1), currentScale.pitchClasses[0]]
    : [currentScale.pitchClasses[currentScale.pitchClasses.length - 1], ...currentScale.pitchClasses.slice(0, -1)];
  const newTonicPc = newPitchClasses[0];
  currentModeIndex = wrap(currentModeIndex + dir, MODE_NAMES.length);
  currentKeyIndex = findKeyIndexForPc(newTonicPc, currentScale.spelled[0]);
  drawFromState();
}

function transposeSemitone(delta) {
  if (!currentScale.pitchClasses.length) return;
  const newPc = wrap(currentScale.pitchClasses[0] + delta, 12);
  currentKeyIndex = findKeyIndexForPc(newPc, currentScale.spelled[0]);
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
    const items = kind === "key" ? KEY_OPTIONS.map(o => o.label) : MODE_NAMES;
    const currentIdx = kind === "key" ? currentKeyIndex : currentModeIndex;
    title.textContent = kind === "key" ? "Select key" : "Select mode";
    list.innerHTML = items.map((label, idx) =>
      `<button type="button" role="option" data-idx="${idx}" class="${idx === currentIdx ? "active" : ""}">${label}</button>`
    ).join("");
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
    } else if (activeKind === "mode") {
      currentModeIndex = idx;
    }
    pillPreview = { key: null, mode: null };
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

  const commitThreshold = 110;
  const lockThreshold = 16;

  const resetTransforms = () => {
    const notesLayer = document.getElementById("notesLayer");
    if (!notesLayer) return;
    notesLayer.style.transition = "none";
    notesLayer.style.transform = "translate3d(0,0,0)";
  };

  const applyPreview = (dir, delta) => {
    if (dir === "x") {
      const previewMode = wrap(currentModeIndex + (delta > 0 ? -1 : 1), MODE_NAMES.length);
      pillPreview.mode = Math.abs(delta) > commitThreshold / 2 ? previewMode : null;
    } else if (dir === "y") {
      const previewKeyPc = wrap(currentScale.pitchClasses[0] + (delta > 0 ? 1 : -1), 12);
      const keyIdx = findKeyIndexForPc(previewKeyPc, currentScale.spelled[0]);
      pillPreview.key = Math.abs(delta) > commitThreshold / 2 ? keyIdx : null;
    }
    updatePills();
  };

  const finishAnimation = (action) => {
    const notesLayer = document.getElementById("notesLayer");
    if (!notesLayer) {
      action();
      resetTransforms();
      pillPreview = { key: null, mode: null };
      updatePills();
      dragCooldown = true;
      setTimeout(() => { dragCooldown = false; }, 150);
      return;
    }
    const handle = () => {
      notesLayer.removeEventListener("transitionend", handle);
      action();
      resetTransforms();
      pillPreview = { key: null, mode: null };
      updatePills();
      dragCooldown = true;
      setTimeout(() => { dragCooldown = false; }, 150);
    };
    notesLayer.addEventListener("transitionend", handle);
  };

  function onStart(e) {
    if (dragCooldown) return;
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    lockedDir = null;
    lastDx = 0;
    lastDy = 0;
    track.style.transition = "none";
    setTileMetrics();
    if (strip.setPointerCapture) strip.setPointerCapture(e.pointerId);
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
        renderVerticalRows();
        stepY = calcTileStep("y");
        baseY = -stepY;
        const notesLayer = document.getElementById("notesLayer");
        if (notesLayer) notesLayer.style.transform = `translate3d(0,${baseY}px,0)`;
      }
    }
    if (!lockedDir) return;

    const notesLayer = document.getElementById("notesLayer");
    if (!notesLayer) return;

    if (lockedDir === "x") {
      notesLayer.style.transform = `translate3d(${baseX + Math.max(-180, Math.min(180, dx))}px,0,0)`;
      applyPreview("x", dx);
    } else {
      track.classList.add("vertical-track");
      notesLayer.style.transform = `translate3d(0,${baseY + Math.max(-180, Math.min(180, dy))}px,0)`;
      applyPreview("y", dy);
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

    if (lockedDir === "x" && absX >= commitThreshold) {
      const dir = lastDx < 0 ? 1 : -1;
      const targetX = baseX + (lastDx < 0 ? -stepX : stepX);
      notesLayer.style.transition = "transform 0.2s ease";
      notesLayer.style.transform = `translate3d(${targetX}px,0,0)`;
      finishAnimation(() => rotateDegree(dir));
    } else if (lockedDir === "y" && absY >= commitThreshold) {
      const sign = lastDy > 0 ? 1 : -1;
      const targetY = baseY + (lastDy > 0 ? stepY : -stepY);
      notesLayer.style.transition = "transform 0.2s ease";
      notesLayer.style.transform = `translate3d(0,${targetY}px,0)`;
      finishAnimation(() => transposeSemitone(sign));
    } else {
      notesLayer.style.transition = "transform 0.18s ease";
      notesLayer.style.transform = lockedDir === "x"
        ? `translate3d(${baseX}px,0,0)`
        : lockedDir === "y"
          ? `translate3d(0,${baseY}px,0)`
          : "translate3d(0,0,0)";
      const resetAfter = () => {
        notesLayer.removeEventListener("transitionend", resetAfter);
        renderScaleStrip(currentScale.spelled);
        resetTransforms();
        pillPreview = { key: null, mode: null };
        updatePills();
        dragCooldown = true;
        setTimeout(() => { dragCooldown = false; }, 150);
      };
      notesLayer.addEventListener("transitionend", resetAfter, { once: true });
    }
    lockedDir = null;
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
  document.getElementById("keyPill").addEventListener("click", () => modal.open("key"));
  document.getElementById("modePill").addEventListener("click", () => modal.open("mode"));

  setupScaleStripDrag();
  syncAccordion();

  document.getElementById("random").addEventListener("click", () => {
    currentKeyIndex = Math.floor(Math.random() * KEY_OPTIONS.length);
    currentModeIndex = Math.floor(Math.random() * MODE_NAMES.length);
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

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setTileMetrics();
    }, 150);
  });

  drawFromState();
});
