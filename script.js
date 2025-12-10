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

const SHARP_NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_NOTES  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

// Interval patterns (in semitones) for common modes
const SCALE_PATTERNS = {
  "Ionian (Major)": [0,2,4,5,7,9,11],
  "Dorian":         [0,2,3,5,7,9,10],
  "Phrygian":       [0,1,3,5,7,8,10],
  "Lydian":         [0,2,4,6,7,9,11],
  "Mixolydian":     [0,2,4,5,7,9,10],
  "Aeolian (Minor)":[0,2,3,5,7,8,10],
  "Locrian":        [0,1,3,5,6,8,10]
};

// use sharps for keys with sharps, flats for flat keys
function chooseNoteNamesForKey(keyName) {
  const flatKeys  = ["F","Bb","Eb","Ab","Db","Gb","Cb"];
  const sharpKeys = ["G","D","A","E","B","F#","C#"];

  if (flatKeys.includes(keyName)) return FLAT_NOTES;
  if (sharpKeys.includes(keyName)) return SHARP_NOTES;
  // default: sharps are more common
  return SHARP_NOTES;
}

function buildScale(key, modeName) {
  const tonicIndex = NOTE_TO_INDEX[key];
  const pattern    = SCALE_PATTERNS[modeName];
  const noteNames  = chooseNoteNamesForKey(key);

  return pattern.map(step => noteNames[(tonicIndex + step) % 12]);
}

// -------------------- CHORD ANALYSIS ----------------------------

function intervalFrom(root, note) {
  const a = NOTE_TO_INDEX[root];
  const b = NOTE_TO_INDEX[note];
  return (b - a + 12) % 12;
}

function analyzeChords(scaleNotes) {
  const chords = [];
  const len = scaleNotes.length;

  for (let i = 0; i < len; i++) {
    const root  = scaleNotes[i];
    const third = scaleNotes[(i + 2) % len];
    const fifth = scaleNotes[(i + 4) % len];
    const seventh = scaleNotes[(i + 6) % len];
    const second  = scaleNotes[(i + 1) % len];
    const fourth  = scaleNotes[(i + 3) % len];

    const int3 = intervalFrom(root, third);
    const int5 = intervalFrom(root, fifth);
    const int7 = intervalFrom(root, seventh);

    let triadQuality, seventhSymbol, ninthSymbol;

    if (int3 === 4 && int5 === 7) {        // major triad
      triadQuality  = "";
      seventhSymbol = (int7 === 11) ? "maj7" : "7";
      ninthSymbol   = (int7 === 11) ? "maj9" : "9";
    } else if (int3 === 3 && int5 === 7) { // minor triad
      triadQuality  = "m";
      seventhSymbol = (int7 === 10) ? "m7" : "m(maj7)";
      ninthSymbol   = (int7 === 10) ? "m9" : "m(maj9)";
    } else if (int3 === 3 && int5 === 6) { // diminished
      triadQuality  = "dim";
      seventhSymbol = (int7 === 9) ? "m7b5" : "dim7";
      ninthSymbol   = (int7 === 9) ? "m9b5" : "dim9";
    } else {
      triadQuality  = "?";
      seventhSymbol = "?7";
      ninthSymbol   = "?9";
    }

    const triadName   = `${root}${triadQuality}`;
    const seventhName = `${root}${seventhSymbol}`;
    const ninthName   = `${root}${ninthSymbol}`;

    const triadNotes   = `${root} - ${third} - ${fifth}`;
    const seventhNotes = `${root} - ${third} - ${fifth} - ${seventh}`;
    const ninthNotes   = `${root} - ${third} - ${fifth} - ${seventh} - ${second}`;
    const sus2Notes    = `${root} - ${second} - ${fifth}`;
    const sus4Notes    = `${root} - ${fourth} - ${fifth}`;

    chords.push({
      degree: i + 1,
      root,
      triadName,
      triadNotes,
      seventhName,
      seventhNotes,
      ninthName,
      ninthNotes,
      sus2Name: `${root}sus2`,
      sus4Name: `${root}sus4`,
      sus2Notes,
      sus4Notes
    });
  }

  return chords;
}

// -------------------- UI HELPERS ----------------------------

function populateKeyAndModeDropdowns() {
  const keySelect  = document.getElementById("key");
  const modeSelect = document.getElementById("mode");

  // clear any existing options
  keySelect.innerHTML = "";
  modeSelect.innerHTML = "";

  const keyOrder = ["C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B"];

  keyOrder.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    keySelect.appendChild(opt);
  });

  Object.keys(SCALE_PATTERNS).forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modeSelect.appendChild(opt);
  });

  keySelect.value  = "C";
  modeSelect.value = "Ionian (Major)";
}

function renderChordColumns(chords) {
  const triadsDiv     = document.getElementById("triadsOutput");
  const seventhsDiv   = document.getElementById("seventhsOutput");
  const ninthsDiv     = document.getElementById("ninthsOutput");
  const suspendedDiv  = document.getElementById("suspendedOutput");

  triadsDiv.innerHTML    = "<h2>Triads:</h2>";
  seventhsDiv.innerHTML  = "<h2>Sevenths:</h2>";
  ninthsDiv.innerHTML    = "<h2>Ninths:</h2>";
  suspendedDiv.innerHTML = "<h2>Suspended:</h2>";

  chords.forEach(ch => {
    triadsDiv.innerHTML   += `${ch.triadName}&nbsp;&nbsp; ${ch.triadNotes}<br>`;
    seventhsDiv.innerHTML += `${ch.seventhName}&nbsp;&nbsp; ${ch.seventhNotes}<br>`;
    ninthsDiv.innerHTML   += `${ch.ninthName}&nbsp;&nbsp; ${ch.ninthNotes}<br>`;
    suspendedDiv.innerHTML +=
      `${ch.sus2Name}&nbsp;&nbsp; ${ch.sus2Notes}<br>` +
      `${ch.sus4Name}&nbsp;&nbsp; ${ch.sus4Notes}<br>`;
  });
}

function populateChordSelectors(chords) {
  const selects = [
    document.getElementById("chord1"),
    document.getElementById("chord2"),
    document.getElementById("chord3")
  ];

  selects.forEach(sel => {
    sel.innerHTML = ""; // clear
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "--";
    sel.appendChild(emptyOpt);

    chords.forEach((ch, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = ch.triadName;
      sel.appendChild(opt);
    });
  });
}

function updateChordResult(selectEl, resultEl, chords) {
  const idx = parseInt(selectEl.value, 10);
  if (isNaN(idx)) {
    resultEl.textContent = "";
    return;
  }
  const ch = chords[idx];
  resultEl.innerHTML =
    `<b>${ch.triadName}</b>: ${ch.triadNotes}<br>` +
    `<b>${ch.seventhName}</b>: ${ch.seventhNotes}<br>` +
    `<b>${ch.ninthName}</b>: ${ch.ninthNotes}`;
}

// -------------------- MAIN DRAW FUNCTION ----------------------------

let currentChords = [];

function drawForCurrentSelection() {
  const key  = document.getElementById("key").value;
  const mode = document.getElementById("mode").value;

  const scale = buildScale(key, mode);
  currentChords = analyzeChords(scale);

  document.getElementById("scaleOutput").innerHTML =
    `<h2>Scale:</h2> ${scale.join(" - ")}`;

  renderChordColumns(currentChords);
  populateChordSelectors(currentChords);

  // clear chord results
  document.getElementById("results1").textContent = "";
  document.getElementById("results2").textContent = "";
  document.getElementById("results3").textContent = "";
}

// -------------------- INIT & EVENT WIRING ----------------------------

document.addEventListener("DOMContentLoaded", () => {
  populateKeyAndModeDropdowns();
  drawForCurrentSelection(); // initial C Ionian display

  const keySelect  = document.getElementById("key");
  const modeSelect = document.getElementById("mode");

  document.getElementById("submit").addEventListener("click", drawForCurrentSelection);
  document.getElementById("random").addEventListener("click", () => {
    const keyOpts  = Array.from(keySelect.options);
    const modeOpts = Array.from(modeSelect.options);
    keySelect.value  = keyOpts[Math.floor(Math.random() * keyOpts.length)].value;
    modeSelect.value = modeOpts[Math.floor(Math.random() * modeOpts.length)].value;
    drawForCurrentSelection();
  });

  // chord selector behaviour
  const chord1 = document.getElementById("chord1");
  const chord2 = document.getElementById("chord2");
  const chord3 = document.getElementById("chord3");
  const res1   = document.getElementById("results1");
  const res2   = document.getElementById("results2");
  const res3   = document.getElementById("results3");

  chord1.addEventListener("change", () => updateChordResult(chord1, res1, currentChords));
  chord2.addEventListener("change", () => updateChordResult(chord2, res2, currentChords));
  chord3.addEventListener("change", () => updateChordResult(chord3, res3, currentChords));

  // Match / Clear / Generate controls:
  document.getElementById("clear").addEventListener("click", () => {
    [chord1, chord2, chord3].forEach(sel => sel.value = "");
    [res1, res2, res3].forEach(r => r.textContent = "");
  });

  document.getElementById("generate").addEventListener("click", () => {
    if (!currentChords.length) return;
    const n = currentChords.length;
    chord1.value = String(Math.floor(Math.random() * n));
    chord2.value = String(Math.floor(Math.random() * n));
    chord3.value = String(Math.floor(Math.random() * n));
    updateChordResult(chord1, res1, currentChords);
    updateChordResult(chord2, res2, currentChords);
    updateChordResult(chord3, res3, currentChords);
  });

  // For now, Match just re-draws based on current key/mode;
  // you can later extend it to do whatever matching logic you had in mind.
  document.getElementById("match").addEventListener("click", drawForCurrentSelection);
});
