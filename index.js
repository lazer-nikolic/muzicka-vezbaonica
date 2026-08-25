// index.js
// Program entry point: music theory data, question generation, and the Alpine
// component that drives every screen. All user-facing text goes through the
// helpers on window.MusicLocale (see localization.js) — nothing here is
// hardcoded to a language.
//
// Plain scripts, no bundler, no ES modules: localization.js and this file load
// as ordinary blocking <script> tags (so they run, in order, during HTML
// parsing), and alpine.min.js loads after them with `defer`. That ordering
// guarantees our `alpine:init` listener below is registered before Alpine's
// own script fires that event — using `type="module"` here previously lost
// that race, since deferred/module scripts don't have to finish before a
// classic deferred script's own top-level code (Alpine.start()) runs.
(function(){
"use strict";

const {
  NOTES, t, chordLabel, scaleLabel, questionTypeLabel, ordinal,
  displayNote, normalizeNote, sanitizeBoxValue,
} = window.MusicLocale;

/* ---------------- Music theory data ---------------- */
const CHORD_DEFS = {
  major:      [0,4,7],
  minor:      [0,3,7],
  dominant7:  [0,4,7,10],
  dim:        [0,3,6],
  major7:     [0,4,7,11],
  minor7:     [0,3,7,10],
  dim7:       [0,3,6,9],
};
const CHORD_PRIMARY = ['major','minor','dominant7','dim'];
const CHORD_MORE    = ['major7','minor7','dim7'];

const SCALE_DEFS = {
  major:            [0,2,4,5,7,9,11],
  minor:            [0,2,3,5,7,8,10],
  mixolydian:       [0,2,4,5,7,9,10],
  blues:            [0,3,5,6,7,10],
  arabic:           [0,1,4,5,7,8,11],
  dorian:           [0,2,3,5,7,9,10],
  phrygian:         [0,1,3,5,7,8,10],
  lydian:           [0,2,4,6,7,9,11],
  locrian:          [0,1,3,5,6,8,10],
  harmonic_minor:   [0,2,3,5,7,8,11],
  melodic_minor:    [0,2,3,5,7,9,11],
  major_pentatonic: [0,2,4,7,9],
  minor_pentatonic: [0,3,5,7,10],
};
const SCALE_PRIMARY = ['major','minor','major_pentatonic','minor_pentatonic','mixolydian','blues','arabic'];
const SCALE_MORE    = ['dorian','phrygian','lydian','locrian','harmonic_minor','melodic_minor'];

const QUESTION_TYPE_KEYS = ['scale','chord','nth'];
const BASIC_CHORDS = ['major','minor'];
const BASIC_SCALES = ['major','minor'];

const WHITE_NOTES = ['C','D','E','F','G','A','B'];
const BLACK_NOTES = ['C#','D#','F#','G#','A#'];
const BLACK_KEY_LEFT = { 'C#':'10%', 'D#':'24.29%', 'F#':'52.86%', 'G#':'67.14%', 'A#':'81.43%' };

function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

function setsEqual(a, b){
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/* ---------------- Question generation (pure functions, no Alpine state) ---------------- */
function buildQuestion(config){
  const availableTypes = config.types.filter(ty => {
    if (ty === 'chord') return config.chords.length > 0;
    return config.scales.length > 0; // scale or nth
  });
  const type = pick(availableTypes);
  const root = Math.floor(Math.random() * 12);
  const rootName = NOTES[root];

  if (type === 'chord'){
    const key = pick(config.chords);
    const answer = CHORD_DEFS[key].map(iv => NOTES[(root + iv) % 12]);
    return { type, root, rootName, defKey: key, answer: new Set(answer), mode: 'multi' };
  }
  if (type === 'scale'){
    const key = pick(config.scales);
    const answer = SCALE_DEFS[key].map(iv => NOTES[(root + iv) % 12]);
    return { type, root, rootName, defKey: key, answer: new Set(answer), mode: 'multi' };
  }
  // nth
  const key = pick(config.scales);
  const intervals = SCALE_DEFS[key];
  const n = 1 + Math.floor(Math.random() * intervals.length);
  const answerNote = NOTES[(root + intervals[n - 1]) % 12];
  return { type, root, rootName, defKey: key, n, answer: new Set([answerNote]), mode: 'single' };
}

function buildQuestions(config){
  const qs = [];
  for (let i = 0; i < config.count; i++) qs.push(buildQuestion(config));
  return qs;
}

/* ---------------- Alpine component ---------------- */
document.addEventListener('alpine:init', () => {
  Alpine.data('quizApp', () => ({
    // ----- static option lists (exposed for x-for in the template) -----
    questionTypeKeys: QUESTION_TYPE_KEYS,
    chordPrimary: CHORD_PRIMARY,
    chordMore: CHORD_MORE,
    scalePrimary: SCALE_PRIMARY,
    scaleMore: SCALE_MORE,
    whiteNotes: WHITE_NOTES,
    blackNotes: BLACK_NOTES,
    blackKeyLeft: BLACK_KEY_LEFT,
    notes: NOTES,

    // ----- language -----
    lang: 'en',

    // ----- setup screen state -----
    screen: 'setup', // 'setup' | 'quiz' | 'results'
    selectedTypes: ['scale'],
    selectedChords: [...BASIC_CHORDS],
    selectedScales: [...BASIC_SCALES],
    inputMode: 'type',
    questionCount: 10,
    setupError: '',

    // ----- quiz state -----
    questions: [],
    index: 0,
    score: 0,
    results: [],       // per-question true/false/null, drives the staff progress markers
    selected: new Set(), // piano-mode selection (canonical note names)
    noteBoxes: [],      // typed-mode box values (raw text as the user typed it)
    answered: false,
    typeError: '',
    _typedValid: false,
    _lastCorrect: null,

    // ===================================================================
    // Lifecycle
    // ===================================================================
    init(){
      this.$watch('lang', () => {
        document.documentElement.lang = this.lang;
        document.title = this.t('APP_TITLE') + ' — ' + this.t('APP_SUBTITLE');
      });
      document.documentElement.lang = this.lang;
      document.title = this.t('APP_TITLE') + ' — ' + this.t('APP_SUBTITLE');
    },

    setLocale(lang){
      this.lang = lang;
    },

    // ===================================================================
    // Localization helpers (thin wrappers binding the active language)
    // ===================================================================
    t(key, vars){ return t(this.lang, key, vars); },
    chordLabel(key){ return chordLabel(this.lang, key); },
    scaleLabel(key){ return scaleLabel(this.lang, key); },
    questionTypeLabel(key){ return questionTypeLabel(this.lang, key); },
    displayNote(note){ return displayNote(this.lang, note); },
    normalizeNote(token){ return normalizeNote(this.lang, token); },

    // ===================================================================
    // Setup screen
    // ===================================================================
    get showChordFieldset(){ return this.selectedTypes.includes('chord'); },
    get showScaleFieldset(){ return this.selectedTypes.includes('scale') || this.selectedTypes.includes('nth'); },

    startQuiz(){
      this.setupError = '';
      const count = Math.max(3, Math.min(30, parseInt(this.questionCount, 10) || 10));

      if (this.selectedTypes.length === 0){ this.setupError = this.t('ERR_NO_TYPE'); return; }
      if (this.selectedTypes.includes('chord') && this.selectedChords.length === 0){
        this.setupError = this.t('ERR_NO_CHORD'); return;
      }
      if ((this.selectedTypes.includes('scale') || this.selectedTypes.includes('nth')) && this.selectedScales.length === 0){
        this.setupError = this.t('ERR_NO_SCALE'); return;
      }

      const config = {
        types: this.selectedTypes, chords: this.selectedChords, scales: this.selectedScales,
        count, inputMode: this.inputMode,
      };
      this.questions = buildQuestions(config);
      this.index = 0;
      this.score = 0;
      this.results = this.questions.map(() => null);
      this.screen = 'quiz';
      this.renderQuestion();
    },

    // ===================================================================
    // Quiz flow
    // ===================================================================
    get currentQuestion(){ return this.questions[this.index]; },

    renderQuestion(){
      this.selected = new Set();
      this.answered = false;
      this.typeError = '';
      const q = this.currentQuestion;
      if (this.inputMode === 'type'){
        this.noteBoxes = Array(q.mode === 'single' ? 1 : q.answer.size).fill('');
        this.$nextTick(() => this.focusBox(0));
      }
    },

    // ----- question text -----
    get questionParts(){
      const q = this.currentQuestion;
      if (!q) return { text: '', hint: null };
      if (q.type === 'chord'){
        return { text: this.t('SENTENCE_CHORD', { root: this.displayNote(q.rootName), label: this.chordLabel(q.defKey) }), hint: null };
      }
      if (q.type === 'scale'){
        return { text: this.t('SENTENCE_SCALE', { root: this.displayNote(q.rootName), label: this.scaleLabel(q.defKey) }), hint: null };
      }
      return {
        text: this.t('SENTENCE_NTH', { ord: ordinal(this.lang, q.n), root: this.displayNote(q.rootName), label: this.scaleLabel(q.defKey) }),
        hint: this.t('HINT_COUNT_ROOT'),
      };
    },

    // Same sentence builder, usable for any question (e.g. the results review list).
    sentenceFor(q){
      if (q.type === 'chord'){
        return this.t('SENTENCE_CHORD', { root: this.displayNote(q.rootName), label: this.chordLabel(q.defKey) });
      }
      if (q.type === 'scale'){
        return this.t('SENTENCE_SCALE', { root: this.displayNote(q.rootName), label: this.scaleLabel(q.defKey) });
      }
      return this.t('SENTENCE_NTH', { ord: ordinal(this.lang, q.n), root: this.displayNote(q.rootName), label: this.scaleLabel(q.defKey) });
    },

    answerListFor(q){
      return [...q.answer].sort((a, b) => NOTES.indexOf(a) - NOTES.indexOf(b)).map(n => this.displayNote(n)).join(', ');
    },

    // ----- piano input -----
    onKeyClick(note){
      if (this.answered) return;
      const q = this.currentQuestion;
      if (q.mode === 'single'){
        this.selected = new Set([note]);
      } else if (this.selected.has(note)){
        const next = new Set(this.selected); next.delete(note); this.selected = next;
      } else {
        this.selected = new Set(this.selected).add(note);
      }
    },

    keyClasses(note){
      const classes = [];
      if (!this.answered){
        if (this.selected.has(note)) classes.push('selected');
        return classes;
      }
      const q = this.currentQuestion;
      if (q.answer.has(note)) classes.push(this.selected.has(note) ? 'correct' : 'missed');
      else if (this.selected.has(note)) classes.push('wrong');
      return classes;
    },

    // Notes currently selected on the piano, in pitch order — used for the chip preview.
    get selectedNotesOrdered(){
      return NOTES.filter(n => this.selected.has(n));
    },

    // ----- typed (note-box) input -----
    onBoxInput(e, idx){
      const clean = sanitizeBoxValue(this.lang, e.target.value);
      e.target.value = clean;
      this.noteBoxes[idx] = clean;
      if (clean.length === 2) this.focusBox(idx + 1);
      this.updateTypedValidity();
    },

    onBoxKeydown(e, idx){
      if (e.key === 'Backspace' && e.target.value === '' && idx > 0){
        e.preventDefault();
        this.noteBoxes[idx - 1] = '';
        this.focusBox(idx - 1);
        this.updateTypedValidity();
      } else if (e.key === ' ' || e.key === 'Enter'){
        e.preventDefault();
        if (e.target.value) this.focusBox(idx + 1);
        else if (e.key === 'Enter' && this.canSubmit) this.handleSubmitClick();
      } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0){
        e.preventDefault();
        this.focusBox(idx - 1);
      } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length){
        e.preventDefault();
        this.focusBox(idx + 1);
      }
    },

    focusBox(idx){
      const boxes = this.$refs.noteBoxesWrap ? [...this.$refs.noteBoxesWrap.querySelectorAll('.note-box')] : [];
      if (idx < 0){ boxes[0]?.focus(); return; }
      if (idx >= boxes.length){ if (this.canSubmit) this.$refs.submitBtn?.focus(); return; }
      boxes[idx]?.focus();
      boxes[idx]?.select();
    },

    updateTypedValidity(){
      const allFilled = this.noteBoxes.length > 0 && this.noteBoxes.every(v => v.length > 0);
      const parsedSet = new Set(this.noteBoxes.map(v => this.normalizeNote(v)).filter(Boolean));
      const hasDuplicate = allFilled && parsedSet.size < this.noteBoxes.length;
      this.typeError = hasDuplicate ? this.t('ERR_DUPLICATE_NOTE') : '';
      this.selected = parsedSet;
      this._typedValid = allFilled && !hasDuplicate;
    },

    get canSubmit(){
      if (this.answered) return true; // button becomes "Next" and is always clickable
      if (this.inputMode === 'type') return !!this._typedValid;
      return this.selected.size > 0;
    },

    clearAnswer(){
      if (this.answered) return;
      this.selected = new Set();
      if (this.inputMode === 'type'){
        this.noteBoxes = this.noteBoxes.map(() => '');
        this.typeError = '';
        this._typedValid = false;
        this.$nextTick(() => this.focusBox(0));
      }
    },

    // ----- submit / feedback -----
    get submitLabel(){
      if (!this.answered) return this.t('SUBMIT_BTN');
      return this.index === this.questions.length - 1 ? this.t('RESULTS_BTN') : this.t('NEXT_BTN');
    },

    handleSubmitClick(){
      if (this.answered){ this.advance(); return; }
      this.submitAnswer();
    },

    submitAnswer(){
      const q = this.currentQuestion;
      const correct = setsEqual(this.selected, q.answer);
      this.answered = true;
      if (correct) this.score++;
      this.results[this.index] = correct;
      this._lastCorrect = correct;
    },

    get lastCorrect(){ return this._lastCorrect; },

    get feedbackPrefix(){
      return this.lastCorrect ? this.t('CORRECT_FEEDBACK') : this.t('WRONG_FEEDBACK');
    },
    get feedbackRest(){
      const q = this.currentQuestion;
      if (!q) return '';
      const list = this.answerListFor(q);
      return this.lastCorrect ? list : `${this.t('ANSWER_IS_LABEL')} ${list}.`;
    },
    get spellingNoteText(){
      if (!this.answered || !this.lastCorrect || this.inputMode !== 'type') return '';
      const q = this.currentQuestion;
      const respellings = [];
      this.noteBoxes.forEach(raw => {
        const val = this.normalizeNote(raw);
        const canonicalDisplay = val ? this.displayNote(val) : null;
        if (val && q.answer.has(val) && raw !== canonicalDisplay){
          respellings.push(this.t('SPELLING_PAIR', { typed: raw, canonical: canonicalDisplay }));
        }
      });
      return respellings.length > 0 ? this.t('SPELLING_NOTE', { pairs: respellings.join(', ') }) : '';
    },

    boxClass(idx){
      if (!this.answered) return '';
      const q = this.currentQuestion;
      const val = this.normalizeNote(this.noteBoxes[idx]);
      return (val && q.answer.has(val)) ? 'box-correct' : 'box-wrong';
    },

    advance(){
      if (this.index < this.questions.length - 1){
        this.index++;
        this.renderQuestion();
      } else {
        this.showResults();
      }
    },

    goBack(){
      this.screen = 'setup';
      this.results = [];
    },

    // ===================================================================
    // Results
    // ===================================================================
    showResults(){
      this.screen = 'results';
    },
    get resultsPct(){
      if (!this.questions.length) return 0;
      return Math.round((this.score / this.questions.length) * 100);
    },

    retry(){ this.startQuiz(); },
    newQuiz(){
      this.screen = 'setup';
      this.results = [];
    },

    // ===================================================================
    // Staff progress SVG (built as markup since it's a handful of shapes
    // driven by an array — simpler than a deeply nested x-for of mixed tags)
    // ===================================================================
    get staffMarkup(){
      const W = 700;
      const lineYs = [20, 32, 44, 56, 68];
      let svg = '';
      lineYs.forEach(y => { svg += `<line class="staff-line" x1="20" y1="${y}" x2="${W-20}" y2="${y}"/>`; });
      svg += `<text x="26" y="66" class="clef" font-family="Fraunces, serif" font-size="58" font-weight="700">𝄞</text>`;

      const total = this.results.length;
      if (total > 0){
        const startX = 100, endX = W - 40;
        const spacing = total > 1 ? (endX - startX) / (total - 1) : 0;
        this.results.forEach((r, i) => {
          const x = total === 1 ? (startX + endX) / 2 : startX + spacing * i;
          const y = r === null ? 44 : (r ? 44 : 78);
          const color = r === null ? 'var(--line)' : (r ? 'var(--moss)' : 'var(--rust)');
          const opacity = r === null ? 0.35 : 1;
          svg += `<g class="note-mark" style="opacity:${opacity}"><ellipse cx="${x}" cy="${y}" rx="6" ry="4.6" fill="${color}" transform="rotate(-18 ${x} ${y})"/>`;
          if (r !== null) svg += `<line x1="${x+5.6}" y1="${y-2}" x2="${x+5.6}" y2="${y-26}" stroke="${color}" stroke-width="1.6"/>`;
          svg += `</g>`;
        });
      }
      return svg;
    },
  }));
});
})();
