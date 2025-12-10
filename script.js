// ideas:
// click on a chord and hear the chord
// diagrams showing voicings for guitar and piano
// 

// Mapping notes to indices and indices to notes
const noteToIndex = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11};

const sharpNotes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const flatNotes = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Major and minor scale patterns in intervals
// Major and minor scale patterns in intervals
const scalePatterns = {
    "Ionian (Major)": [0, 2, 4, 5, 7, 9, 11],
    "Dorian": [0, 2, 3, 5, 7, 9, 10],
    "Phrygian": [0, 1, 3, 5, 7, 8, 10],
    "Lydian": [0, 2, 4, 6, 7, 9, 11],
    "Mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "Aeolian (Minor)": [0, 2, 3, 5, 7, 8, 10],
    "Locrian": [0, 1, 3, 5, 6, 8, 10]
};

// Populating key dropdown
const keys = Object.keys(noteToIndex);
const keySelect = document.getElementById('key');
keys.forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = key;
    keySelect.appendChild(option);
});

// Populating mode dropdown
const modes = Object.keys(scalePatterns);
const modeSelect = document.getElementById('mode');
modes.forEach(mode => {
    const option = document.createElement('option');
    option.value = mode;
    option.textContent = mode;
    modeSelect.appendChild(option);
});

// Function to detect duplicate note letters
function hasDuplicateLetters(notes) {
    let noteLetters = notes.map(note => note[0]); // Extracts first character (note letter)
    let uniqueLetters = [...new Set(noteLetters)]; // Converts to Set to remove duplicates
    return noteLetters.length !== uniqueLetters.length; // If lengths differ, there are duplicates
}

function buildScale(key, scale) {
    let keyIndex = noteToIndex[key];
    let pattern = scalePatterns[scale];
    let scaleNotes = pattern.map(interval => sharpNotes[(keyIndex + interval) % 12]);

    if (hasDuplicateLetters(scaleNotes) && !key.includes('#')) {
        scaleNotes = pattern.map(interval => flatNotes[(keyIndex + interval) % 12]);
    }

    return scaleNotes;
}

function buildChords(scaleNotes) {
    let triads = [];
    let sevenths = [];
    let ninths = [];
    let suspended = [];

    for (let i = 0; i < scaleNotes.length; i++) {
        let root = scaleNotes[i];
        let second = scaleNotes[(i + 1) % scaleNotes.length];
        let third = scaleNotes[(i + 2) % scaleNotes.length];
        let fourth = scaleNotes[(i + 3) % scaleNotes.length];
        let fifth = scaleNotes[(i + 4) % scaleNotes.length];
        let seventh = scaleNotes[(i + 6) % scaleNotes.length];

        let rootIndex = noteToIndex[root];
        let thirdInterval = (noteToIndex[third] - rootIndex + 12) % 12;
        let fifthInterval = (noteToIndex[fifth] - rootIndex + 12) % 12;
        let seventhInterval = (noteToIndex[seventh] - rootIndex + 12) % 12;

        let triadQuality;
        let seventhQuality;
        let ninthQuality;

        if (thirdInterval === 4 && fifthInterval === 7) {
            triadQuality = "";
            seventhQuality = (seventhInterval === 11) ? "maj7" : "7";
            ninthQuality = (seventhInterval === 11) ? "maj9" : "9";
        } else if (thirdInterval === 3 && fifthInterval === 7) {
            triadQuality = "m";
            seventhQuality = (seventhInterval === 10) ? "m7" : "m(maj7)";
            ninthQuality = (seventhInterval === 10) ? "m9" : "m(maj9)";
        } else if (thirdInterval === 3 && fifthInterval === 6) {
            triadQuality = "dim";
            seventhQuality = (seventhInterval === 9) ? "m7b5" : "dim7";
            ninthQuality = (seventhInterval === 9) ? "m9b5" : "dim9";
        } else {
            triadQuality = "?";
            seventhQuality = "?7";
            ninthQuality = "?9";
        }

        triads.push("<b>" + root + triadQuality + "</b>&nbsp;&nbsp;&nbsp;" + [root, third, fifth].join(" - "));
        sevenths.push("<b>" + root + seventhQuality + "</b>&nbsp;&nbsp;&nbsp;" + [root, third, fifth, seventh].join(" - "));
        ninths.push("<b>" + root + ninthQuality + "</b>&nbsp;&nbsp;&nbsp;" + [root, third, fifth, seventh, second].join(" - "));
        suspended.push("<b>" + root + "sus2</b>&nbsp;&nbsp;&nbsp;" + [root, second, fifth].join(" - "));
        suspended.push("<b>" + root + "sus4</b>&nbsp;&nbsp;&nbsp;" + [root, fourth, fifth].join(" - "));

    }

    return {triads: triads, sevenths: sevenths, ninths: ninths, suspended: suspended};
}

function drawChords() {
    let key = document.getElementById('key').value;
    let scale = document.getElementById('mode').value;
    let scaleNotes = buildScale(key, scale);
    let chords = buildChords(scaleNotes);

    let scaleOutput = document.getElementById('scaleOutput');
    scaleOutput.innerHTML = scaleNotes.join(" - ");

    let triadsOutput = document.getElementById('triadsOutput');
    triadsOutput.innerHTML = "<h2>Triads:</h2> " + chords.triads.join("<br/>") + "<br/>";

    let seventhsOutput = document.getElementById('seventhsOutput');
    seventhsOutput.innerHTML = "<h2>Sevenths:</h2> " + chords.sevenths.join("<br/>") + "<br/>";

    let ninthsOutput = document.getElementById('ninthsOutput');
    ninthsOutput.innerHTML = "<h2>Ninths:</h2> " + chords.ninths.join("<br/>") + "<br/>";

    let suspendedOutput = document.getElementById('suspendedOutput');
    suspendedOutput.innerHTML = "<h2>Suspended:</h2> " + chords.suspended.join("<br/>") + "<br/>";
}

drawChords();

// Handle submit button click
document.getElementById('submit').addEventListener('click', function() {
    drawChords();
});

function setRandomKeyAndMode() {
    // Get a random key and mode
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const randomMode = modes[Math.floor(Math.random() * modes.length)];

    // Set the dropdowns to the random key and mode
    document.getElementById('key').value = randomKey;
    document.getElementById('mode').value = randomMode;
}

// Add a click event listener to the 'Random' button
document.getElementById('random').addEventListener('click', function() {
    setRandomKeyAndMode();
    document.getElementById('submit').click();
});

// Function to generate chord data for all keys and modes
function generateChordData() {
    let data = {};
    for (let key of keys) {
        data[key] = {};
        for (let mode of modes) {
            let scaleNotes = buildScale(key, mode);
            let chords = buildChords(scaleNotes);
            data[key][mode] = [].concat(chords.triads, chords.sevenths).map(chord => chord.split("&nbsp;&nbsp;&nbsp;")[0].replace("<b>", "").replace("</b>", ""));
        }
    }
    return data;
}

let chordData = generateChordData();

// Function to get available chords
function getAvailableChords(data) {
    let chords = new Set();
    for (let key in data) {
        for (let mode in data[key]) {
            for (let chord of data[key][mode]) {
                chords.add(chord);  // Now we have clean chord names
            }
        }
    }
    return Array.from(chords);
}

let availableChords = getAvailableChords(chordData).sort();

// Get the select elements
let selectChord1 = document.getElementById('chord1');
let selectChord2 = document.getElementById('chord2');
let selectChord3 = document.getElementById('chord3');

// Add options to the select elements
// Add options to the select elements
function populateChordSelect(selectElement, chords) {
    // Add default (null) option
    let defaultOption = document.createElement('option');
    defaultOption.text = 'Select a chord';
    defaultOption.value = '';
    selectElement.add(defaultOption);

    // Add other options
    for (let chord of chords) {
        let option = document.createElement('option');
        option.text = chord;
        option.value = chord;
        selectElement.add(option);
    }
}

// Populate the select elements with the available chords
populateChordSelect(selectChord1, availableChords);
populateChordSelect(selectChord2, availableChords);
populateChordSelect(selectChord3, availableChords);

// Function to find matching keys/modes for a chord
function matchChord(chord) {
    let matches = [];
    if (chord !== '') {  // Only proceed if a chord has been selected
        for (let key in chordData) {
            for (let mode in chordData[key]) {
                if (chordData[key][mode].includes(chord)) {
                    matches.push({key: key, mode: mode});
                }
            }
        }
    }
    return matches;
}

// Click event for the Match button
document.getElementById('match').addEventListener('click', function() {
    // Clear previous results
    document.getElementById('results1').innerText = '';
    document.getElementById('results2').innerText = '';
    document.getElementById('results3').innerText = '';

    let selectedChords = [selectChord1.value, selectChord2.value, selectChord3.value];
    let resultsElements = [document.getElementById('results1'), document.getElementById('results2'), document.getElementById('results3')];
    
    selectedChords.forEach(function(chord, i) {
        let matches = matchChord(chord);
        for (let match of matches) {
            let matchText = document.createElement('p');
            matchText.innerText = `${match.key} ${match.mode}`;
            resultsElements[i].appendChild(matchText);
        }
    });
});
