// Réglages de classe (normes, accès libre) et devoirs individuels de remédiation, à travers le vrai handler api/classes.js.
// Lancer : node --test api/_class-settings-handler.test.js
process.env.SUPABASE_URL = 'http://db.test';
process.env.SUPABASE_SECRET_KEY = 'k';
const test = require('node:test');
const assert = require('node:assert');
const handler = require('./classes');

// Fausse base : un prof (p1) titulaire de la classe C1 où sont inscrits les élèves e1 et e2 ; un prof étranger (p9).
let CALLS, ASSIGNMENTS, CLASS;
const USERS = {
  prof: { id: 'p1', username: 'prof', plan: 'expert', role: 'prof' },
  autre: { id: 'p9', username: 'autre', plan: 'expert', role: 'prof' },
  e1: { id: 'e1', username: 'eleve1', plan: 'expert', role: 'eleve' },
  e2: { id: 'e2', username: 'eleve2', plan: 'expert', role: 'eleve' },
};
global.fetch = async (url, opt = {}) => {
  const u = decodeURIComponent(String(url)), m = (opt.method || 'GET').toUpperCase();
  CALLS.push({ m, u, body: opt.body ? JSON.parse(opt.body) : null });
  const ok = (data) => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });
  const tok = u.match(/session_token=eq\.([^&]+)/);
  if (tok) return ok(USERS[tok[1]] ? [USERS[tok[1]]] : []);
  if (u.includes('/classes?id=eq.C1') && m === 'GET') return ok([CLASS]);
  if (u.includes('/classes?id=eq.C1') && m === 'PATCH') { Object.assign(CLASS, JSON.parse(opt.body)); return ok([CLASS]); }
  if (u.includes('/class_teachers?')) return ok([{ teacher_id: 'p1' }]);
  if (u.includes('/class_members?') && u.includes('student_id=eq.')) {
    const sid = u.match(/student_id=eq\.([^&]+)/)[1];
    if (u.includes('classes(')) return ok(['e1', 'e2'].includes(sid) ? [{ class_id: 'C1', classes: CLASS }] : []);
    return ok(['e1', 'e2'].includes(sid) ? [{ student_id: sid }] : []);
  }
  if (u.includes('/class_members?')) return ok([{ student_id: 'e1', users: { id: 'e1', username: 'eleve1' } }, { student_id: 'e2', users: { id: 'e2', username: 'eleve2' } }]);
  if (u.includes('/assignments') && m === 'POST') { const row = { id: 'A' + (ASSIGNMENTS.length + 1), ...JSON.parse(opt.body) }; ASSIGNMENTS.push(row); return ok([row]); }
  if (u.includes('/assignments?')) return ok(ASSIGNMENTS);
  if (u.includes('/progress?')) return ok([]);
  return ok([]);
};
const call = async (body) => { let status = 200, out; const res = { status(c) { status = c; return res; }, json(o) { out = o; return res; }, setHeader() {}, end() { return res; } };
  await handler({ method: 'POST', body, headers: {}, query: {} }, res); return { status, out }; };
const reset = () => { CALLS = []; ASSIGNMENTS = []; CLASS = { id: 'C1', name: '6e', teacher_id: 'p1', institution_id: 'i1', archived: false, typo_norm: 'fr', free_access: false }; };

test('class-settings-set : le prof de la classe règle normes et accès libre ; les élèves les reçoivent', async () => {
  reset();
  const r = await call({ action: 'class-settings-set', token: 'prof', classId: 'C1', settings: { typoNorm: 'be', freeAccess: true } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.out.settings, { typoNorm: 'be', freeAccess: true });
  assert.deepEqual(CALLS.filter((c) => c.m === 'PATCH').map((c) => c.body), [{ typo_norm: 'be', free_access: true }]);
  const g = await call({ action: 'my-goals', token: 'e1' });
  assert.deepEqual(g.out.settings, { typoNorm: 'be', freeAccess: true });
});

test('class-settings-set : refusé aux élèves, aux profs d\'une autre classe, aux valeurs et clés inconnues', async () => {
  reset();
  assert.equal((await call({ action: 'class-settings-set', token: 'e1', classId: 'C1', settings: { freeAccess: true } })).status, 403);
  assert.equal((await call({ action: 'class-settings-set', token: 'autre', classId: 'C1', settings: { freeAccess: true } })).status, 403);
  assert.equal((await call({ action: 'class-settings-set', token: 'prof', classId: 'C1', settings: { freeAccess: 'oui' } })).status, 400);
  assert.equal((await call({ action: 'class-settings-set', token: 'prof', classId: 'C1', settings: { teacher_id: 'p9' } })).status, 400);
  assert.equal((await call({ action: 'class-settings-set', token: 'prof', classId: 'C1', settings: {} })).status, 400);
  assert.equal(CALLS.filter((c) => c.m === 'PATCH').length, 0);
});

test('devoir de remédiation : créé pour un élève de la classe, invisible pour les autres, compté pour lui seul', async () => {
  reset();
  const c = await call({ action: 'assignment-create', token: 'prof', classId: 'C1', lessonId: 'pon3', title: 'Deux-points', studentId: 'e2' });
  assert.equal(c.status, 200);
  assert.equal(ASSIGNMENTS[0].student_id, 'e2');
  await call({ action: 'assignment-create', token: 'prof', classId: 'C1', lessonId: 'pon1', title: 'Point et virgule' });
  assert.equal('student_id' in ASSIGNMENTS[1], false, 'un devoir de classe n\'écrit pas la colonne');
  const e1 = await call({ action: 'my-assignments', token: 'e1' });
  const e2 = await call({ action: 'my-assignments', token: 'e2' });
  assert.deepEqual(e1.out.assignments.map((a) => a.lessonId), ['pon1']);
  assert.deepEqual(e2.out.assignments.map((a) => [a.lessonId, a.personal]), [['pon3', true], ['pon1', false]]);
  const list = await call({ action: 'assignment-list', token: 'prof', classId: 'C1' });
  const perso = list.out.assignments.find((a) => a.lessonId === 'pon3');
  assert.equal(perso.total, 1);
  assert.equal(perso.studentId, 'e2');
  assert.equal(perso.studentName, 'eleve2');
  assert.equal(list.out.assignments.find((a) => a.lessonId === 'pon1').total, 2);
});

test('devoir de remédiation : élève hors classe ou essai individuel refusés', async () => {
  reset();
  assert.equal((await call({ action: 'assignment-create', token: 'prof', classId: 'C1', lessonId: 'pon3', title: 'x', studentId: 'intrus' })).status, 400);
  assert.equal((await call({ action: 'assignment-create', token: 'prof', classId: 'C1', mode: 'essay', title: 'x', essayType: 'mail', studentId: 'e1' })).status, 400);
  assert.equal((await call({ action: 'assignment-create', token: 'prof', classId: 'C1', mode: 'essay', title: 'x', essayType: 'mail' })).status, 200, 'le même essai pour la classe est accepté');
  ASSIGNMENTS.length = 0;
  assert.equal(ASSIGNMENTS.length, 0);
});
