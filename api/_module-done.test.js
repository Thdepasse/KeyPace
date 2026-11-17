// Devoirs « module » : marque de fin posée par le serveur, lue par assignmentDone.
// Lancer : node --test api/_module-done.test.js
process.env.SUPABASE_URL = 'http://db.test';
process.env.SUPABASE_SECRET_KEY = 'k';
const test = require('node:test');
const assert = require('node:assert');
const handler = require('./classes');
const { assignmentDone } = handler;

let PROGRESS, CALLS;
global.fetch = async (url, opt = {}) => {
  const u = String(url), m = (opt.method || 'GET').toUpperCase();
  CALLS.push({ m, u, body: opt.body });
  const ok = (data) => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });
  if (u.includes('/users?session_token=eq.good')) return ok([{ id: 'u1', username: 'eleve', plan: 'expert', role: 'student' }]);
  if (u.includes('/users?')) return ok([]);
  if (u.includes('/progress?') && m === 'GET') return ok([{ data: PROGRESS, updated_at: 't0' }]);
  if (u.includes('/progress?') && m === 'PATCH') { PROGRESS = JSON.parse(opt.body).data; return ok([{ ok: 1 }]); }
  return ok([]);
};
const call = async (body) => { let status = 200, out; const res = { status(c) { status = c; return res; }, json(o) { out = o; return res; }, setHeader() {}, end() { return res; } };
  await handler({ method: 'POST', body, headers: {}, query: {} }, res); return { status, out }; };

test('module-done : pose la marque mod:<clé> sans toucher au reste', async () => {
  PROGRESS = { lessons: { a: { cleared: true } }, assignmentsDone: { x: { t: 1 } } }; CALLS = [];
  const r = await call({ action: 'module-done', token: 'good', moduleKey: 'mail' });
  assert.equal(r.status, 200);
  assert.ok(PROGRESS.assignmentsDone['mod:mail'].module);
  assert.ok(PROGRESS.assignmentsDone.x);
  assert.ok(PROGRESS.lessons.a.cleared);
});
test('module-done : refuse une clé inconnue et une session invalide', async () => {
  PROGRESS = {}; CALLS = [];
  assert.equal((await call({ action: 'module-done', token: 'good', moduleKey: 'nimporte' })).status, 400);
  assert.equal((await call({ action: 'module-done', token: 'bad', moduleKey: 'mail' })).status, 401);
  assert.equal(CALLS.filter((c) => c.m === 'PATCH').length, 0);
});
test('assignmentDone : devoir module fait seulement si la marque existe', () => {
  const a = { id: 'A', mode: 'module', lesson_id: 'cv' };
  assert.equal(assignmentDone({}, a), false);
  assert.equal(assignmentDone({ assignmentsDone: { 'mod:mail': { t: 1 } } }, a), false);
  assert.equal(assignmentDone({ assignmentsDone: { 'mod:cv': { t: 1 } } }, a), true);
  assert.equal(assignmentDone({ lessons: { cv: { cleared: true } } }, a), false);
});
