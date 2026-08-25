// localization.js
// Everything about language and note-name vocabulary. No knowledge of the quiz's
// screens, questions, or state — every function here is pure and takes the active
// language as an explicit argument, so it has no module-level mutable state.
// Exposed as window.MusicLocale so index.js (a plain script, no bundler) can use it.
(function(){
"use strict";

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Canonical (English/sharp) letter names are used internally for all matching and storage.
// Serbian practice uses H for natural B and B for A#/Bb — normalizeNote accepts both
// vocabularies depending on the active language, but always resolves to the canonical name.
const LETTER_BASE_EN = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
const LETTER_BASE_SR = { C:0, D:2, E:4, F:5, G:7, A:9, B:10, H:11 };
const NOTES_DISPLAY_SR = ['C','C#','D','D#','E','F','F#','G','G#','A','B','H'];

const labels = {
  en: {
    APP_TITLE: 'The Woodshed',
    APP_SUBTITLE: 'Scale & chord drill',
    FOOTER_NOTE: 'Notes are spelled with sharps only, to keep things simple.',
    LEGEND_TYPES: 'Question types', LEGEND_TYPES_SUB: 'Pick one or more.',
    LEGEND_INPUT: 'Answer input', LEGEND_INPUT_SUB: 'Type note names, or use the piano.',
    LEGEND_CHORDS: 'Chords', LEGEND_CHORDS_SUB: 'Used for "notes in a chord" questions.',
    LEGEND_SCALES: 'Scales', LEGEND_SCALES_SUB: 'Used for "notes in a scale" and "nth note" questions.',
    LEGEND_LENGTH: 'Length', LENGTH_UNIT: 'questions',
    MORE_CHORDS: 'More chords', MORE_SCALES: 'Other common scales',
    START_BTN: 'Start drill',
    INPUT_TYPE_LABEL: 'Type note names', INPUT_PIANO_LABEL: 'Piano keyboard',
    TYPE_HINT: 'Type one note per box — use # or b for sharp or flat.',
    CLEAR_BTN: 'Clear', SUBMIT_BTN: 'Submit', NEXT_BTN: 'Next question', RESULTS_BTN: 'See results',
    REVEAL_LABEL: 'On the keyboard:',
    CORRECT_FEEDBACK: 'Correct.', WRONG_FEEDBACK: 'Not quite.', ANSWER_IS_LABEL: 'The answer is',
    SCORE_LABEL: 'Score',
    QUESTION_OF: 'Question {i} / {n}',
    RESULTS_SUB: '{pct}% correct',
    RETRY_BTN: 'Same settings', NEW_QUIZ_BTN: 'New quiz',
    ERR_NO_TYPE: 'Pick at least one question type.',
    ERR_NO_CHORD: 'Pick at least one chord — "notes in a chord" needs one.',
    ERR_NO_SCALE: "Pick at least one scale — that's needed for scale and nth-note questions.",
    ERR_NOT_RECOGNIZED: "Didn't recognize: {list}",
    ERR_DUPLICATE_NOTE: 'The same note was entered twice.',
    SPELLING_PAIR: '{typed} is written as {canonical}',
    SPELLING_NOTE: "That's correct — though in this scale {pairs}.",
    GO_BACK_BTN: 'Back',
    NO_SELECTION: 'No notes selected yet',
    QTYPE_SCALE: 'Notes in a scale', QTYPE_CHORD: 'Notes in a chord', QTYPE_NTH: 'Note by scale degree',
    HINT_COUNT_ROOT: 'Counting the root as the 1st note.',
    SENTENCE_SCALE: 'Select all the notes in the {root} {label} scale.',
    SENTENCE_CHORD: 'Select all the notes in the {root} {label} chord.',
    SENTENCE_NTH: 'What is the {ord} note of the {root} {label} scale?',
    CHORD_MAJOR: 'Major', CHORD_MINOR: 'Minor', CHORD_DOMINANT7: 'Dominant 7th', CHORD_DIM: 'Diminished',
    CHORD_MAJOR7: 'Major 7th', CHORD_MINOR7: 'Minor 7th', CHORD_DIM7: 'Diminished 7th',
    SCALE_MAJOR: 'Major (Ionian)', SCALE_MINOR: 'Natural Minor (Aeolian)', SCALE_MIXOLYDIAN: 'Mixolydian',
    SCALE_BLUES: 'Blues', SCALE_ARABIC: 'Arabic (Double Harmonic)', SCALE_DORIAN: 'Dorian',
    SCALE_PHRYGIAN: 'Phrygian', SCALE_LYDIAN: 'Lydian', SCALE_LOCRIAN: 'Locrian',
    SCALE_HARMONIC_MINOR: 'Harmonic Minor', SCALE_MELODIC_MINOR: 'Melodic Minor',
    SCALE_MAJOR_PENTATONIC: 'Major Pentatonic', SCALE_MINOR_PENTATONIC: 'Minor Pentatonic',
  },
  sr: {
    APP_TITLE: 'Vežbaonica',
    APP_SUBTITLE: 'Vežba skala i akorda',
    FOOTER_NOTE: 'Note su zapisane samo pomoću povišilica (#), radi jednostavnosti.',
    LEGEND_TYPES: 'Tipovi pitanja', LEGEND_TYPES_SUB: 'Izaberi jedan ili više.',
    LEGEND_INPUT: 'Unos odgovora', LEGEND_INPUT_SUB: 'Otkucaj imena nota ili koristi klavijaturu.',
    LEGEND_CHORDS: 'Akordi', LEGEND_CHORDS_SUB: 'Koristi se za pitanja "note u akordu".',
    LEGEND_SCALES: 'Skale', LEGEND_SCALES_SUB: 'Koristi se za pitanja "note u skali" i "nota po stepenu skale".',
    LEGEND_LENGTH: 'Dužina', LENGTH_UNIT: 'pitanja',
    MORE_CHORDS: 'Više akorda', MORE_SCALES: 'Ostale uobičajene skale',
    START_BTN: 'Počni vežbu',
    INPUT_TYPE_LABEL: 'Otkucaj imena nota', INPUT_PIANO_LABEL: 'Klavijatura',
    TYPE_HINT: 'Upiši po jednu notu u svako polje — koristi # ili b za povišilicu ili snizilicu. Napomena: H je h-ton, a B je a#.',
    CLEAR_BTN: 'Obriši', SUBMIT_BTN: 'Potvrdi', NEXT_BTN: 'Sledeće pitanje', RESULTS_BTN: 'Prikaži rezultat',
    REVEAL_LABEL: 'Na klavijaturi:',
    CORRECT_FEEDBACK: 'Tačno.', WRONG_FEEDBACK: 'Nije tačno.', ANSWER_IS_LABEL: 'Tačan odgovor je',
    SCORE_LABEL: 'Rezultat',
    QUESTION_OF: 'Pitanje {i} / {n}',
    RESULTS_SUB: '{pct}% tačno',
    RETRY_BTN: 'Ista podešavanja', NEW_QUIZ_BTN: 'Novi kviz',
    ERR_NO_TYPE: 'Izaberi bar jedan tip pitanja.',
    ERR_NO_CHORD: 'Izaberi bar jedan akord — potreban je za pitanja "note u akordu".',
    ERR_NO_SCALE: 'Izaberi bar jednu skalu — potrebna je za pitanja o skali i o stepenu note.',
    ERR_NOT_RECOGNIZED: 'Nepoznato: {list}',
    ERR_DUPLICATE_NOTE: 'Ista nota je upisana dva puta.',
    SPELLING_PAIR: '{typed} se piše kao {canonical}',
    SPELLING_NOTE: 'Odgovor je tačan, ali u ovoj skali {pairs}.',
    GO_BACK_BTN: 'Nazad',
    NO_SELECTION: 'Još nije izabrana nijedna nota',
    QTYPE_SCALE: 'Note u skali', QTYPE_CHORD: 'Note u akordu', QTYPE_NTH: 'Nota po stepenu skale',
    HINT_COUNT_ROOT: 'Osnovni ton se računa kao prva nota.',
    SENTENCE_SCALE: 'Izaberi sve note u {root} {label} skali.',
    SENTENCE_CHORD: 'Izaberi sve note u {root} {label} akordu.',
    SENTENCE_NTH: 'Koja je {ord} nota {root} {label} skale?',
    CHORD_MAJOR: 'Dur', CHORD_MINOR: 'Mol', CHORD_DOMINANT7: 'Dominantni septakord', CHORD_DIM: 'Umanjeni',
    CHORD_MAJOR7: 'Veliki septakord', CHORD_MINOR7: 'Mali septakord', CHORD_DIM7: 'Umanjeni septakord',
    SCALE_MAJOR: 'Dur (jonski)', SCALE_MINOR: 'Prirodni mol (eolski)', SCALE_MIXOLYDIAN: 'Miksolidijski',
    SCALE_BLUES: 'Bluz', SCALE_ARABIC: 'Arapska (dvostruko harmonijska)', SCALE_DORIAN: 'Dorski',
    SCALE_PHRYGIAN: 'Frigijski', SCALE_LYDIAN: 'Lidijski', SCALE_LOCRIAN: 'Lokrijski',
    SCALE_HARMONIC_MINOR: 'Harmonijski mol', SCALE_MELODIC_MINOR: 'Melodijski mol',
    SCALE_MAJOR_PENTATONIC: 'Durska pentatonika', SCALE_MINOR_PENTATONIC: 'Molska pentatonika',
  },
};

function t(lang, key, vars){
  let str = (labels[lang] && labels[lang][key]) || labels.en[key] || key;
  if (vars){
    Object.keys(vars).forEach(k => { str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
  }
  return str;
}

function chordLabel(lang, key){ return t(lang, 'CHORD_' + key.toUpperCase()); }
function scaleLabel(lang, key){ return t(lang, 'SCALE_' + key.toUpperCase()); }
function questionTypeLabel(lang, key){ return t(lang, 'QTYPE_' + key.toUpperCase()); }

function ordinal(lang, n){
  if (lang === 'sr') return n + '.';
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

function displayNote(lang, note){
  if (lang !== 'sr') return note;
  return NOTES_DISPLAY_SR[NOTES.indexOf(note)];
}

function normalizeNote(lang, token){
  if (!token) return null;
  token = token.trim();
  if (!token) return null;
  const letterBase = lang === 'sr' ? LETTER_BASE_SR : LETTER_BASE_EN;
  const letter = token[0].toUpperCase();
  if (!(letter in letterBase)) return null;
  const rest = token.slice(1).toLowerCase();
  let accidental = 0;
  if (rest === '') accidental = 0;
  else if (rest === '#' || rest === 's' || rest === 'sharp') accidental = 1;
  else if (rest === 'b' || rest === 'f' || rest === 'flat') accidental = -1;
  else return null;
  const pitch = (letterBase[letter] + accidental + 12) % 12;
  return NOTES[pitch];
}

// Restricts what characters a note-input box will accept while typing, per language
// (Serbian typing allows the letter H in addition to A-G).
function sanitizeBoxValue(lang, raw){
  const letterChars = lang === 'sr' ? 'A-Ha-h' : 'A-Ga-g';
  const cleaned = raw.replace(new RegExp('[^' + letterChars + '#b]', 'g'), '');
  let letter = '', accidental = '';
  if (cleaned.length > 0) letter = cleaned[0].toUpperCase();
  if (cleaned.length > 1){
    const c1 = cleaned[1];
    if (c1 === '#') accidental = '#';
    else if (c1.toLowerCase() === 'b') accidental = 'b';
  }
  return letter + accidental;
}

window.MusicLocale = {
  NOTES, LETTER_BASE_EN, LETTER_BASE_SR, NOTES_DISPLAY_SR, labels,
  t, chordLabel, scaleLabel, questionTypeLabel, ordinal,
  displayNote, normalizeNote, sanitizeBoxValue,
};
})();
