// Tests des essais (logique pure). `node --test api/`
const test = require('node:test');
const assert = require('node:assert');
const {
  ESSAY_TYPES, essayTypeDef, countWords, essayWordCount,
  sanitizeEssayContent, validateEssaySubmission, validateEssayBrief,
  essayWritingSignals, sanitizeEssayStats,
} = require('./_class-logic');

test('les 7 types sont définis avec des champs', () => {
  const attendus = ['mail', 'histoire', 'transcription', 'lettre', 'compte-rendu', 'dissertation', 'note'];
  assert.deepStrictEqual(Object.keys(ESSAY_TYPES).sort(), attendus.sort());
  for (const t of attendus) assert.ok(essayTypeDef(t).fields.length > 0, t);
});

test('countWords gère accents, apostrophes et traits d’union', () => {
  assert.strictEqual(countWords("L'élève a rendu l'essai aujourd'hui"), 5);
  assert.strictEqual(countWords('c’est-à-dire'), 1);
  assert.strictEqual(countWords('   '), 0);
  assert.strictEqual(countWords(null), 0);
});

test('seuls les champs comptés entrent dans le total', () => {
  // objet et destinataire d'un mail ne comptent pas
  assert.strictEqual(essayWordCount('mail', { to: 'a@b.c', subject: 'Trois mots ici', body: 'un deux' }), 2);
  // dissertation : intro + dev + ccl, pas le titre
  assert.strictEqual(essayWordCount('dissertation', { title: 'Titre long ignoré', intro: 'un deux', dev: 'trois', ccl: 'quatre' }), 4);
});

test('sanitizeEssayContent écarte les champs inconnus', () => {
  const c = sanitizeEssayContent('histoire', { title: 'T', body: 'B', hack: 'x', word_count: 999 });
  assert.deepStrictEqual(Object.keys(c).sort(), ['body', 'title']);
});

test('sanitizeEssayContent borne les champs trop longs', () => {
  const c = sanitizeEssayContent('note', { title: 'T', body: 'a'.repeat(50000) });
  assert.strictEqual(c.body.length, 20000);
});

test('validateEssaySubmission applique min/max et champs vides', () => {
  assert.strictEqual(validateEssaySubmission({ essay_type: 'histoire', min_words: 10 }, { title: 'T', body: 'trop court' }).ok, false);
  assert.strictEqual(validateEssaySubmission({ essay_type: 'histoire', max_words: 2 }, { title: 'T', body: 'un deux trois' }).ok, false);
  assert.strictEqual(validateEssaySubmission({ essay_type: 'mail' }, { to: 'a', subject: 'b', body: '  ' }).ok, false);
  const ok = validateEssaySubmission({ essay_type: 'histoire', min_words: 2 }, { title: 'T', body: 'un deux trois' });
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.words, 3);
});

test('validateEssayBrief refuse min > max et type inconnu', () => {
  assert.strictEqual(validateEssayBrief({ essayType: 'poeme' }).ok, false);
  assert.strictEqual(validateEssayBrief({ essayType: 'mail', minWords: 200, maxWords: 50 }).ok, false);
  const v = validateEssayBrief({ essayType: 'mail', minWords: '20', maxWords: '150', essayBrief: ' Contexte ' });
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.value.min_words, 20);
  assert.strictEqual(v.value.essay_brief, 'Contexte');
});

test('signaux : frappe honnête => aucun flag', () => {
  const s = essayWritingSignals({ typedChars: 1800, insertedChars: 0, activeMs: 25 * 60000, pasteAttempts: 0, bigInserts: 0 }, 300, { baselineWpm: 40 });
  assert.strictEqual(s.suspicion, 'none');
  assert.strictEqual(s.flags.length, 0);
});

test('signaux : collage massif => suspicion haute', () => {
  const s = essayWritingSignals({ typedChars: 20, insertedChars: 1800, activeMs: 60000, pasteAttempts: 3, bigInserts: 1 }, 300, { baselineWpm: 40 });
  assert.strictEqual(s.suspicion, 'high');
  assert.ok(s.flags.some((f) => f.code === 'paste'));
  assert.ok(s.flags.some((f) => f.code === 'ratio'));
});

test('signaux : élève rapide mais honnête n’est PAS signalé', () => {
  // 75 mpm avec une baseline à 70 : rapide, cohérent => aucun flag (anti faux positif)
  const s = essayWritingSignals({ typedChars: 1800, insertedChars: 0, activeMs: 4 * 60000, pasteAttempts: 0, bigInserts: 0 }, 300, { baselineWpm: 70 });
  assert.strictEqual(s.suspicion, 'none');
});

test('signaux : sans baseline, pas de flag de vitesse', () => {
  const s = essayWritingSignals({ typedChars: 1800, insertedChars: 0, activeMs: 2 * 60000 }, 300, {});
  assert.ok(!s.flags.some((f) => f.code === 'speed'));
});

test('signaux : stats absentes ou hostiles ne cassent rien', () => {
  assert.strictEqual(essayWritingSignals(null, 100, {}).suspicion, 'none');
  const c = sanitizeEssayStats({ pasteAttempts: -5, typedChars: 9e9, activeMs: 'x' });
  assert.strictEqual(c.pasteAttempts, 0);
  assert.strictEqual(c.typedChars, 200000);
  assert.strictEqual(c.activeMs, 0);
});
