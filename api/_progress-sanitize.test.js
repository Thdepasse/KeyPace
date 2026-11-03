// Tests du nettoyage de la progression (étape 1a). Lancer : node --test api/_progress-sanitize.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
const test = require('node:test');
const assert = require('node:assert');
const { sanitizeProgress, MAX_BYTES } = require('./_progress-sanitize');
const saveProgress = require('./save-progress');

const NOW = Date.UTC(2026, 10, 3, 12, 0, 0);
const S = (data, prev) => sanitizeProgress(data, prev, NOW);

test('un bloc normal passe tel quel', () => {
  const data = { tests: [{ t: NOW - 1000, wpm: 40, acc: 95, mode: 'test' }], lessons: { a: { bestWpm: 30, bestErr: 2, cleared: true }, b: 25 },
    goals: { minWpm: 20, maxErrors: 8 }, keyStats: { e: { n: 10, e: 1 } }, gameBest: 120, courseBest: { wpm: 50, acc: 96 }, sourisBest: 3 };
  const r = S(data, {});
  assert.deepEqual(r.data, data);
  assert.deepEqual(r.dropped, []);
  assert.deepEqual(r.unknownKeys, []);
});

test('role, classes et courses viennent du serveur, jamais du client', () => {
  const r = S({ role: 'admin', classes: [1], courses: { x: 1 } }, { role: 'prof', courses: { 'nl/azerty': { lessons: {} } } });
  assert.equal(r.data.role, 'prof');
  assert.equal('classes' in r.data, false);
  assert.deepEqual(r.data.courses, { 'nl/azerty': { lessons: {} } });
});

test('les cours déjà enregistrés sont conservés quand le client ne les envoie pas', () => {
  const r = S({ lessons: {} }, { courses: { 'nl/azerty': { lessons: { a: 1 } } } });
  assert.deepEqual(r.data.courses, { 'nl/azerty': { lessons: { a: 1 } } });
});

test('tests : valeurs impossibles et dates trop futures écartées, le reste gardé', () => {
  const ok = { t: NOW - 5, wpm: 60, acc: 90 };
  const r = S({ tests: [ok, { t: NOW, wpm: 9999, acc: 90 }, { t: NOW, wpm: 50, acc: 150 }, { t: NOW + 3 * 24 * 3600 * 1000, wpm: 50, acc: 90 }] }, {});
  assert.deepEqual(r.data.tests, [ok]);
  assert.equal(r.dropped.length, 3);
});

test('tests : une horloge en avance de quelques heures reste acceptée', () => {
  const t = { t: NOW + 5 * 3600 * 1000, wpm: 50, acc: 90 };
  assert.deepEqual(S({ tests: [t] }, {}).data.tests, [t]);
});

test('leçon impossible : l\'ancienne valeur est gardée, ou la leçon retirée si elle est nouvelle', () => {
  const prev = { lessons: { a: { bestWpm: 30, bestErr: 1, cleared: true } } };
  const r = S({ lessons: { a: { bestWpm: 5000, bestErr: 0, cleared: true }, b: { bestWpm: 9999 }, c: { bestWpm: 20, bestErr: 1 } } }, prev);
  assert.deepEqual(r.data.lessons.a, prev.lessons.a);
  assert.equal('b' in r.data.lessons, false);
  assert.deepEqual(r.data.lessons.c, { bestWpm: 20, bestErr: 1 });
});

test('record avec une vitesse impossible : ancien record conservé', () => {
  const r = S({ courseBest: { wpm: 9999 }, ghostBest: { wpm: 80, timeline: [] }, sprintBest: { wpm: -1 } }, { courseBest: { wpm: 55 } });
  assert.deepEqual(r.data.courseBest, { wpm: 55 });
  assert.deepEqual(r.data.ghostBest, { wpm: 80, timeline: [] });
  assert.equal('sprintBest' in r.data, false);
});

test('keyStats : compteurs incohérents écartés', () => {
  const r = S({ keyStats: { a: { n: 10, e: 2 }, b: { n: 1, e: 5 }, c: { n: -1, e: 0 }, d: { n: 1.5, e: 0 } } }, { keyStats: { b: { n: 4, e: 1 } } });
  assert.deepEqual(r.data.keyStats, { a: { n: 10, e: 2 }, b: { n: 4, e: 1 } });
});

test('clé inconnue : acceptée comme avant, mais signalée', () => {
  const r = S({ lessons: {}, nouveauChamp: { a: 1 } }, {});
  assert.deepEqual(r.unknownKeys, ['nouveauChamp']);
  assert.deepEqual(r.data.nouveauChamp, { a: 1 });
});

// ── Bout en bout : save-progress ──
let PROGRESS, CALLS;
global.fetch = async (url, opts = {}) => {
  const u = String(url); const method = opts.method || 'GET';
  CALLS.push({ u, method });
  let data = [];
  if (u.includes('/users?session_token=')) data = [{ id: 7 }];
  else if (u.includes('/progress?user_id=') && method === 'GET') data = PROGRESS ? [{ data: PROGRESS }] : [];
  else if (u.includes('/progress?on_conflict') && method === 'POST') PROGRESS = JSON.parse(opts.body).data;
  return { ok: true, status: 200, text: async () => JSON.stringify(data) };
};
const call = async (body) => {
  const out = { headers: {} };
  const res = { setHeader() {}, status: (c) => { out.status = c; return res; }, json: (o) => { out.body = o; return res; }, end: () => res };
  await saveProgress({ method: 'POST', headers: {}, body }, res);
  return out;
};
const writes = () => CALLS.filter((c) => c.method === 'POST' && c.u.includes('on_conflict')).length;

test('save-progress : données non objet refusées (400), rien d\'écrit', async () => {
  PROGRESS = null; CALLS = [];
  for (const bad of ['texte', 12, [1, 2]]) assert.equal((await call({ token: 't', data: bad })).status, 400);
  assert.equal(writes(), 0);
});

test('save-progress : bloc trop gros refusé (413), rien d\'écrit', async () => {
  PROGRESS = null; CALLS = [];
  const r = await call({ token: 't', data: { lessons: {}, big: 'x'.repeat(MAX_BYTES + 10) } });
  assert.equal(r.status, 413);
  assert.equal(writes(), 0);
});

test('save-progress : un test impossible est écarté, le reste est enregistré', async () => {
  PROGRESS = null; CALLS = [];
  const good = { t: Date.now(), wpm: 45, acc: 92, mode: 'test' };
  const r = await call({ token: 't', data: { tests: [good, { t: Date.now(), wpm: 9999, acc: 90 }], lessons: { a: { bestWpm: 30, bestErr: 0, cleared: true } } } });
  assert.equal(r.body.ok, true);
  assert.deepEqual(PROGRESS.tests, [good]);
  assert.ok(PROGRESS.lessons.a);
});

test('save-progress : le garde-fou de régression de leçons reste actif', async () => {
  PROGRESS = { lessons: { a: { bestWpm: 30 }, b: { bestWpm: 30 } } }; CALLS = [];
  const r = await call({ token: 't', data: { lessons: { a: { bestWpm: 30 } } } });
  assert.equal(r.status, 409);
  assert.equal(writes(), 0);
});

test('save-progress : assignmentsDone du serveur toujours fusionné', async () => {
  PROGRESS = { lessons: {}, assignmentsDone: { x: { t: 1 } } }; CALLS = [];
  await call({ token: 't', data: { lessons: {}, assignmentsDone: { y: { t: 2 } } } });
  assert.deepEqual(Object.keys(PROGRESS.assignmentsDone).sort(), ['x', 'y']);
});

test('tests : une entrée ancienne sans date n\'est pas supprimée', () => {
  const old = { wpm: 30, acc: 88, mode: 'test' };
  assert.deepEqual(S({ tests: [old] }, {}).data.tests, [old]);
});

test('toutes les clés présentes en base le 2026-11-03 sont connues (rien de signalé)', () => {
  const inDb = ['courseBest', 'gameBest', 'lessons', 'goals', 'simonBest', 'tests', 'souris'.concat('Best'), 'keyStats', 'ghostBest',
    'sourisHybridBest', 'sourisTilesBest', 'sourisHybridHand', 'sourisGridBest', 'clavierBest', 'sprintBest', 'sourisTilesTutorialSeen',
    'duelRecord', 'sourisTiers', 'bossBest', 'tireurBest', 'assignmentsDone', 'sourisGridTop', 'sourisDuoBest', 'sourisSoloBest',
    'sourisWavesBest', 'sourisHub', 'sourisTilesGlossaryAutoSeen'];
  const data = {}; inDb.forEach((k) => { data[k] = {}; });
  assert.deepEqual(S(data, {}).unknownKeys, []);
});
