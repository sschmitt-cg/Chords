// --- Basic note utilities ---------------------------------------------------

const noteToIndex = {
  "C": 0, "C#": 1, "Db": 1,
  "D": 2, "D#": 3, "Eb": 3,
  "E": 4,
  "F": 5, "F#": 6, "Gb": 6,
  "G": 7, "G#": 8, "Ab": 8,
  "A": 9, "A#": 10, "Bb": 10,
  "B": 11
};

const sharpNotes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const flatNotes  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

// Mode interval patterns (in semitones from tonic)
const scalePatterns = {
  "Ionian (Major)": [0,2,4,5,7,9,11],
  "Dorian":         [0,2,3,5,7,9,10],
  "Phrygian":       [0,1,3,5,7,8,10],
  "Lydian":         [0,2,4,6,7,9,11],
  "Mixolydian":     [0,2,4,5,7,9,10],
  "Aeolian (Minor)":[0,2,3,5,7,8,10],
  "Locrian":        [0,1,3,5,6,8,10]
};

// --- Helper: choose sharps vs flats to avoid weird spellings ---------------

function hasDuplicateLetters(notes) {
  const letters = notes.map(n => n[0]);
  const uniq = new Set(letters);
  return letters.length !== uniq.size;
}

function buildScale(key, modeName) {
  const tonicIndex = noteToIndex[key];
  const pattern = scalePatterns[modeName];

  // Start with sharps
  let notes = pattern.map(
    step => sharpNotes[(tonicIndex + step) % 12]
  );

  // If we get duplicate letters (e.g. C, C#, D, D#...), try flats instead
  if (hasDuplicateLetters(notes) && !key.includes("#")) {
    notes = pattern.map(
      step => flatNotes[(tonicIndex + step) % 12]
    );
  }

  return notes;
}

// --- Chord building ---------------------------------------------------------

function buildChords(scaleNotes) {
  const triads    = [];
  const sevenths  = [];
  const ninths    = [];
  const suspended = [];

  const len = scaleNotes.length;

  for (let i = 0; i < len; i++) {
    const root  = scaleNotes[i];
    const second  = scaleNotes[(i + 1) % len];
    const third   = scaleNotes[(i + 2) % len];
    const fourth  = scaleNotes[(i + 3) % len];
    const fifth   = scaleNotes[(i + 4) % len];
    const seventh = scaleNotes[(i + 6) % len];

    const rootIdx = noteToIndex[root];
    const thirdInt   = (noteToIndex[third]   - rootIdx + 12) % 12;
    const fifthInt   = (noteToIndex[fifth]   - rootIdx + 12) % 12;
    const seventhInt = (noteToIndex[seventh] - rootIdx + 12) % 12;

    let triadQ, seventhQ, ninthQ;

    // basic quality detection
    if (thirdInt === 4 && fifthInt === 7) {
      triadQ   = "";
      seventhQ = (seventhInt === 11) ? "maj7" : "7";
      ninthQ   = (seventhInt === 11) ? "maj9" : "9";
    } else if (thirdInt === 3 && fifthInt === 7) {
      triadQ   = "m";
      seventhQ = (seventhInt === 10) ? "m7" : "m(maj7)";
      ninthQ   = (seventhInt === 10) ? "m9" : "m(maj9)";
    } else if (thirdInt === 3 && fifthInt === 6) {
      triadQ   = "dim";
      seventhQ = (seventhInt === 9) ? "m7b5" : "dim7";
      ninthQ   = (seventhInt === 9) ? "m9b5" : "dim9";
    } else {
      triadQ   = "?";
      seventhQ = "?7";
      ninthQ   = "?9";
    }

    triads.push(
      `<b>${root}${triadQ}</b>&nbsp;&nbsp;&nbsp;${[root, third, fifth].join(" - ")}`
    );
    sevenths.push(
      `<b>${root}${seventhQ}</b>&nbsp;&nbsp;&nbsp;${[root, third, fifth, seventh].join(" - ")}`
    );
    ninths.push(
      `<b>${root}${ninthQ}</b>&nbsp;&nbsp;&nbsp;${[root, third, fifth, seventh, second].join(" - ")}`
    );
    suspended.push(
      `<b>${root}sus2</b>&nbsp;&nbsp;&nbsp;${[root,  second, fifth].join(" - ")}`
    );
    suspended.push(
      `<b>${root}sus4</b>&nbsp;&nbsp;&nbsp;${[root,  fourth, fifth].join(" - ")}`
    );
  }

  return { triads, sevenths, ninths, suspended };
}

// --- UI wiring --------------------------------------------------------------

function populateDropdowns() {
  const keySelect  = document.getElementById("key");
  const modeSelect = document.getElementById("mode");

  // Keys: use the unique sorted list of note names from noteToIndex
  const keys = Object.keys(noteToIndex).filter(
    (v, i, arr) => arr.indexOf(v) === i
  ).sort((a, b) => noteToIndex[a] - noteToIndex[b]);

  keys.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    keySelect.appendChild(opt);
  });

  Object.keys(scalePatterns).forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modeSelect.appendChild(opt);
  });

  // Nice default
  keySelect.value  = "C";
  modeSelect.value = "Ionian (Major)";
}

function drawChords() {
  const key   = document.getElementById("key").value;
  const mode  = document.getElementById("mode").value;
  const scale = buildScale(key, mode);
  const chords = buildChords(scale);

  document.getElementById("scaleOutput").innerHTML = scale.join(" - ");

  document.getElementById("triadsOutput").innerHTML =
    "<h2>Triads:</h2> " + chords.triads.join("<br/>") + "<br/>";
  document.getElementById("seventhsOutput").innerHTML =
    "<h2>Sevenths:</h2> " + chords.sevenths.join("<br/>") + "<br/>";
  document.getElementById("ninthsOutput").innerHTML =
    "<h2>Ninths:</h2> " + chords.ninths.join("<br/>") + "<br/>";
  document.getElementById("suspendedOutput").innerHTML =
    "<h2>Suspended:</h2> " + chords.suspended.join("<br/>") + "<br/>";
}

function setRandomKeyAndMode() {
  const keySelect  = document.getElementById("key");
  const modeSelect = document.getElementById("mode");

  const keyOptions  = Array.from(keySelect.options);
  const modeOptions = Array.from(modeSelect.options);

  keySelect.value  = keyOptions[Math.floor(Math.random() * keyOptions.length)].value;
  modeSelect.value = modeOptions[Math.floor(Math.random() * modeOptions.length)].value;
}

// --- Initialise when DOM is ready ------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  populateDropdowns();
  drawChords(); // initial view

  document.getElementById("submit").addEventListener("click", drawChords);
  document.getElementById("random").addEventListener("click", () => {
    setRandomKeyAndMode();
    drawChords();
  });

  // Buttons "match", "clear", "generate" are present in your HTML;
  // for now we'll leave them inert so they don't throw errors.
});
