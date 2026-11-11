// Tests des cours supplémentaires dans la progression (étape 2). Lancer : node --test api/_courses.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
const test = require('node:test');
const assert = require('node:assert');
const { sanitizeProgress } = require('./_progress-sanitize');
const { mergeProgress } = require('./_progress-merge');
const { COURSE_IDS, DEFAULT_COURSE, COURSE_ID_RE } = require('./_courses-registry');

const NOW = Date.UTC(2026, 10, 3, 12, 0, 0);
const IDS = ['nl/azerty'];
const L = { bestWpm: 30, bestErr: 1, cleared: true };

test('le registre ne contient que le cours QWERTY ; sans liste explicite rien n\'est accepté', () => {
  assert.deepEqual(COURSE_IDS, ['fr/qwerty', 'en/azerty', 'en/qwerty', 'nl/azerty', 'nl/qwerty']);
  assert.equal(DEFAULT_COURSE, 'fr/azerty');
  const r = sanitizeProgress({ lessons: {}, courses: { 'nl/azerty': { lessons: { a: L } } } }, {}, NOW);
  assert.equal('courses' in r.data, false);
  assert.ok(r.dropped.includes('courses[]'));
});

test('un cours du registre est accepté et nettoyé comme le bloc principal', () => {
  const r = sanitizeProgress({ courses: { 'nl/azerty': { lessons: { a: L, b: { bestWpm: 9999 } }, tests: [{ t: NOW, wpm: 9999, acc: 90 }, { t: NOW, wpm: 40, acc: 90 }] } } }, {}, NOW, IDS);
  const c = r.data.courses['nl/azerty'];
  assert.deepEqual(Object.keys(c.lessons), ['a']);
  assert.equal(c.tests.length, 1);
});

test('un identifiant hors registre ou mal formé est ignoré', () => {
  const r = sanitizeProgress({ courses: { 'es/azerty': { lessons: {} }, '../x': {}, 'nl/azerty': { lessons: {} } } }, {}, NOW, IDS);
  assert.deepEqual(Object.keys(r.data.courses), ['nl/azerty']);
  assert.equal(COURSE_ID_RE.test('de-BE/qwertz'), true);
  assert.equal(COURSE_ID_RE.test('nl/azerty/../x'), false);
});

test('les cours déjà enregistrés sont conservés quand le client ne les envoie pas', () => {
  const prev = { courses: { 'nl/azerty': { lessons: { a: L } }, 'es/qwerty': { lessons: { b: L } } } };
  const r = sanitizeProgress({ lessons: {} }, prev, NOW, IDS);
  assert.deepEqual(r.data.courses, prev.courses);
});

test('un cours ne contient pas de cours, ni de rôle', () => {
  const r = sanitizeProgress({ courses: { 'nl/azerty': { lessons: {}, role: 'admin', courses: { 'nl/azerty': {} } } } }, {}, NOW, IDS);
  const c = r.data.courses['nl/azerty'];
  assert.equal('role' in c, false);
  assert.equal('courses' in c, false);
});

test('fusion : chaque cours est fusionné avec les mêmes règles que le bloc principal', () => {
  const prev = { courses: { 'nl/azerty': { lessons: { a: L, b: L }, gameBest: 100, tests: [{ t: 1, wpm: 40, acc: 90 }] } } };
  const inc = { courses: { 'nl/azerty': { lessons: { a: L }, gameBest: 40, tests: [] } } };
  const { data, changes } = mergeProgress(prev, inc);
  const c = data.courses['nl/azerty'];
  assert.deepEqual(Object.keys(c.lessons).sort(), ['a', 'b']);
  assert.equal(c.gameBest, 100);
  assert.equal(c.tests.length, 1);
  assert.ok(changes.some((x) => x.startsWith('courses/nl/azerty/')));
});

test('fusion : un cours absent d\'un côté est gardé tel quel, et le cours par défaut reste indépendant', () => {
  const { data } = mergeProgress({ lessons: { a: L }, courses: { 'nl/azerty': { lessons: { x: L } } } }, { lessons: { a: L, b: L } });
  assert.deepEqual(Object.keys(data.lessons).sort(), ['a', 'b']);
  assert.deepEqual(Object.keys(data.courses['nl/azerty'].lessons), ['x']);
});

test('propriété : fusionner deux fois les cours donne le même résultat', () => {
  const a = { courses: { 'nl/azerty': { lessons: { a: L }, gameBest: 5 } } };
  const b = { courses: { 'nl/azerty': { lessons: { b: L }, gameBest: 9 } } };
  const once = mergeProgress(a, b).data;
  assert.deepEqual(mergeProgress(a, once).data, once);
});
