// Le cours QWERTY est OUVERT à tous les comptes connectés (statut 'en ligne' du registre, 2026-11-06). Le mécanisme bêta reste testé dans
// _courses-access.test.js. Lancer : node --test api/_courses-open.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
process.env.KEYPACE_BETA_TESTERS = 'testeur1'; // sans effet : le cours n'est plus réservé
const test = require('node:test');
const assert = require('node:assert');
const saveProgress = require('./save-progress');
const { COURSE_ACCESS, courseIdsFor } = require('./_courses-registry');

let USER, PROGRESS;
global.fetch = async (url, opts = {}) => {
  const u = String(url); const method = opts.method || 'GET'; let data = [];
  if (u.includes('/users?session_token=')) data = [USER];
  else if (u.includes('/progress?user_id=') && method === 'GET') data = PROGRESS ? [{ data: PROGRESS, rev: 1 }] : [];
  else if (u.includes('/progress?on_conflict') && method === 'POST') PROGRESS = JSON.parse(opts.body).data;
  return { ok: true, status: 200, text: async () => JSON.stringify(data) };
};
const call = async (body) => {
  const out = {}; const res = { setHeader() {}, status: (c) => { out.status = c; return res; }, json: (o) => { out.body = o; return res; }, end: () => res };
  await saveProgress({ method: 'POST', headers: {}, body }, res); return out;
};
const R1 = { bestWpm: 30, bestErr: 1, cleared: true };
const blob = () => ({ lessons: { r1: R1 }, courses: { 'fr/qwerty': { lessons: { r1: R1 }, tests: [], keyStats: {} } } });

test('le registre déclare le cours QWERTY en ligne', () => {
  assert.deepEqual(COURSE_ACCESS['fr/qwerty'], { status: 'en ligne' });
});

test('tout compte connecté a accès au cours QWERTY, quel que soit son rôle ; sans compte, rien', () => {
  for (const role of ['eleve', 'prof', 'etablissement', 'admin']) assert.deepEqual(courseIdsFor({ username: 'quelquun', role }), ['fr/qwerty', 'en/azerty', 'en/qwerty'], role);
  assert.deepEqual(courseIdsFor(null), []);
  assert.deepEqual(courseIdsFor(undefined), []);
});

test('requête access : un compte ordinaire reçoit le cours QWERTY', async () => {
  USER = { id: 9, role: 'eleve', username: 'eleve-ordinaire' };
  const r = await call({ token: 't', access: true });
  assert.deepEqual(r.body, { ok: true, coursAcces: ['fr/qwerty', 'en/azerty', 'en/qwerty'] });
});

test('un compte ordinaire enregistre la progression du cours QWERTY, sans écraser la progression AZERTY', async () => {
  USER = { id: 9, role: 'eleve', username: 'eleve-ordinaire' }; PROGRESS = null;
  await call({ token: 't', data: blob() });
  assert.ok(PROGRESS.courses['fr/qwerty'].lessons.r1);
  assert.ok(PROGRESS.lessons.r1);
});

test('un cours qui n\'est pas au registre reste refusé', async () => {
  USER = { id: 9, role: 'eleve', username: 'eleve-ordinaire' }; PROGRESS = null;
  await call({ token: 't', data: { lessons: { r1: R1 }, courses: { 'nl/azerty': { lessons: { r1: R1 } } } } });
  assert.equal(PROGRESS.courses && PROGRESS.courses['nl/azerty'], undefined);
});

test('les cours d\'anglais sont en ligne : tout compte connecté les reçoit, sans compte rien', () => {
  assert.deepEqual(COURSE_ACCESS['en/qwerty'], { status: 'en ligne' });
  assert.deepEqual(COURSE_ACCESS['en/azerty'], { status: 'en ligne' });
  for (const role of ['eleve', 'prof', 'etablissement', 'admin']) assert.deepEqual(courseIdsFor({ username: 'autre', role }), ['fr/qwerty', 'en/azerty', 'en/qwerty'], role);
  assert.deepEqual(courseIdsFor(null), []);
});

test('le néerlandais (nl/azerty) est en bêta : un testeur le reçoit, un compte ordinaire non', () => {
  assert.deepEqual(COURSE_ACCESS['nl/azerty'], { status: 'bêta' }); assert.deepEqual(COURSE_ACCESS['nl/qwerty'], { status: 'bêta' });
  assert.deepEqual(courseIdsFor({ username: 'testeur1', role: 'eleve' }), ['fr/qwerty', 'en/azerty', 'en/qwerty', 'nl/azerty', 'nl/qwerty']);
  for (const role of ['eleve', 'prof', 'etablissement', 'admin']) assert.ok(!courseIdsFor({ username: 'autre', role }).some((id) => id.startsWith('nl/')), role);
  assert.ok(!courseIdsFor(null).includes('nl/azerty'));
});
