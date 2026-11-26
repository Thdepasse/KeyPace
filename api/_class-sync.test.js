// Lot 2 de l'audit synchro élève/prof : journal des entrées et sorties de classe, annulation d'un
// retrait, inscription par code vérifiée, devoirs des classes archivées, activité des autres cours.
// Lancer : node --test api/_class-sync.test.js
process.env.SUPABASE_URL = 'http://db.test';
process.env.SUPABASE_SECRET_KEY = 'k';
const test = require('node:test');
const assert = require('node:assert');
const handler = require('./classes');
const { buildClassFeed } = require('./_class-feed');
const { allTests, studentSummary, assignmentDone, detectAlerts } = require('./_class-logic');

const DAY = 24 * 60 * 60 * 1000;

/* ── Fausse base ── */
let DB, CALLS, JOURNAL_TABLE;
const USERS = {
  prof: { id: 'p1', username: 'prof', role: 'prof', institution_id: 'i1' },
  autre: { id: 'p9', username: 'autre', role: 'prof', institution_id: 'i1' },
  e1: { id: 'e1', username: 'eleve1', role: 'eleve', institution_id: 'i1' },
  e2: { id: 'e2', username: 'eleve2', role: 'eleve', institution_id: 'i1' },
  ext: { id: 'x1', username: 'externe', role: 'eleve', institution_id: 'i2' },
};
const byId = (id) => Object.values(USERS).find((u) => u.id === id);
const reset = (journal = true) => {
  JOURNAL_TABLE = journal; CALLS = [];
  DB = {
    classes: [{ id: 'C1', name: '6e', teacher_id: 'p1', institution_id: 'i1', archived: false, invite_code: 'ABC234' },
      { id: 'C2', name: '5e', teacher_id: 'p1', institution_id: 'i1', archived: true, invite_code: 'OLD234' }],
    members: [{ id: 1, class_id: 'C1', student_id: 'e1', joined_at: '2026-09-01T08:00:00Z' }, { id: 2, class_id: 'C1', student_id: 'e2', joined_at: '2026-09-02T08:00:00Z' }],
    events: [],
    assignments: [{ id: 'A1', class_id: 'C1', title: 'Leçon r1', lesson_id: 'r1' }, { id: 'A2', class_id: 'C2', title: 'Vieux devoir', lesson_id: 'r2' }],
  };
};
const q = (u) => new URL(u).searchParams;
const eqv = (sp, k) => { const v = sp.get(k); return v && v.startsWith('eq.') ? v.slice(3) : undefined; };
global.fetch = async (url, opt = {}) => {
  const u = decodeURIComponent(String(url)); const m = (opt.method || 'GET').toUpperCase(); const body = opt.body ? JSON.parse(opt.body) : null;
  CALLS.push({ m, u, body });
  const ok = (data) => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });
  const sp = q(u);
  if (u.includes('/user_sessions')) return { ok: false, status: 404, text: async () => '{}' };
  const tok = u.match(/session_token=eq\.([^&]+)/);
  if (tok && m === 'GET') return ok(USERS[tok[1]] ? [USERS[tok[1]]] : []);
  if (u.includes('/users?id=eq.')) { const x = byId(eqv(sp, 'id')); return ok(x ? [x] : []); }
  if (u.includes('/users?id=in.')) { const ids = sp.get('id').slice(4, -1).split(','); return ok(ids.map(byId).filter(Boolean)); }
  if (u.includes('/users?id=eq.') && m === 'PATCH') return ok([]);
  if (u.includes('/class_teachers?')) return ok([{ teacher_id: 'p1' }]);
  if (u.includes('/classes?')) {
    let rows = DB.classes;
    if (eqv(sp, 'id')) rows = rows.filter((c) => c.id === eqv(sp, 'id'));
    if (eqv(sp, 'invite_code')) rows = rows.filter((c) => c.invite_code === eqv(sp, 'invite_code') && String(c.archived) === (eqv(sp, 'archived') || String(c.archived)));
    return ok(rows);
  }
  if (u.includes('/class_member_events')) {
    if (!JOURNAL_TABLE) return { ok: false, status: 404, text: async () => '{}' };
    if (m === 'POST') { (Array.isArray(body) ? body : [body]).forEach((e) => DB.events.push({ id: DB.events.length + 1, created_at: new Date().toISOString(), ...e })); return ok([]); }
    let rows = DB.events.filter((e) => (!eqv(sp, 'class_id') || e.class_id === eqv(sp, 'class_id')) && (!eqv(sp, 'student_id') || e.student_id === eqv(sp, 'student_id')) && (!eqv(sp, 'action') || e.action === eqv(sp, 'action')));
    rows = rows.slice().reverse();
    return ok(sp.get('limit') ? rows.slice(0, Number(sp.get('limit'))) : rows);
  }
  if (u.includes('/class_members')) {
    if (m === 'POST') {
      const rows = (Array.isArray(body) ? body : [body]);
      const added = [];
      rows.forEach((r) => { if (!DB.members.some((x) => x.class_id === r.class_id && x.student_id === r.student_id)) { const row = { id: DB.members.length + 10, joined_at: new Date().toISOString(), ...r }; DB.members.push(row); added.push(row); } });
      return ok(added);
    }
    const match = (x) => (!eqv(sp, 'class_id') || x.class_id === eqv(sp, 'class_id')) && (!eqv(sp, 'student_id') || x.student_id === eqv(sp, 'student_id'))
      && (!(sp.get('class_id') || '').startsWith('in.') || sp.get('class_id').slice(4, -1).split(',').includes(x.class_id));
    if (m === 'DELETE') { const gone = DB.members.filter(match); DB.members = DB.members.filter((x) => !match(x)); return ok(gone); }
    return ok(DB.members.filter(match).map((x) => ({ ...x, users: byId(x.student_id), classes: DB.classes.find((c) => c.id === x.class_id) })));
  }
  if (u.includes('/assignments?')) {
    const ids = (sp.get('class_id') || '').startsWith('in.') ? sp.get('class_id').slice(4, -1).split(',') : [eqv(sp, 'class_id')];
    return ok(DB.assignments.filter((a) => ids.includes(a.class_id)));
  }
  return ok([]);
};
const call = async (body) => { let status = 200, out; const res = { status(c) { status = c; return res; }, json(o) { out = o; return res; }, setHeader() {}, end() { return res; } };
  await handler({ method: 'POST', body, headers: {}, query: {} }, res); return { status, out }; };

/* ── Journal et annulation ── */
test('retirer un élève : le retrait est noté (qui, quand, date d\'arrivée) et apparaît dans l\'historique, annulable', async () => {
  reset();
  const r = await call({ action: 'class-remove-student', token: 'prof', classId: 'C1', studentId: 'e1' });
  assert.equal(r.status, 200); assert.equal(r.out.removed, true);
  assert.deepEqual(DB.members.map((x) => x.student_id), ['e2']);
  assert.equal(DB.events.length, 1);
  assert.deepEqual({ a: DB.events[0].action, by: DB.events[0].actor_id, j: DB.events[0].joined_at, s: DB.events[0].source }, { a: 'remove', by: 'p1', j: '2026-09-01T08:00:00Z', s: 'teacher' });
  const f = await call({ action: 'class-feed', token: 'prof', classId: 'C1' });
  const ev = f.out.feed.find((e) => e.type === 'member_remove');
  assert.ok(ev, 'retrait visible dans l\'historique');
  assert.equal(ev.restorable, true); assert.equal(ev.act, true); assert.equal(ev.studentId, 'e1');
});

test('annuler un retrait : l\'élève revient avec sa date d\'arrivée d\'origine, l\'historique ne propose plus l\'annulation', async () => {
  reset();
  await call({ action: 'class-remove-student', token: 'prof', classId: 'C1', studentId: 'e1' });
  const r = await call({ action: 'class-restore-student', token: 'prof', classId: 'C1', studentId: 'e1' });
  assert.equal(r.status, 200);
  const back = DB.members.find((x) => x.student_id === 'e1');
  assert.ok(back); assert.equal(back.joined_at, '2026-09-01T08:00:00Z');
  assert.equal(DB.events[1].action, 'add'); assert.equal(DB.events[1].source, 'restore');
  const f = await call({ action: 'class-feed', token: 'prof', classId: 'C1' });
  assert.equal(f.out.feed.some((e) => e.restorable), false);
});

test('annulation refusée : élève jamais retiré, prof d\'une autre classe, table absente', async () => {
  reset();
  assert.equal((await call({ action: 'class-restore-student', token: 'prof', classId: 'C1', studentId: 'x1' })).status, 404);
  await call({ action: 'class-remove-student', token: 'prof', classId: 'C1', studentId: 'e1' });
  // p9 n'est pas prof de C1 (class_teachers ne contient que p1)
  assert.equal((await call({ action: 'class-restore-student', token: 'autre', classId: 'C1', studentId: 'e1' })).status, 403);
  reset(false);
  assert.equal((await call({ action: 'class-restore-student', token: 'prof', classId: 'C1', studentId: 'e1' })).status, 503);
});

test('sans la table du journal, retirer un élève fonctionne comme avant', async () => {
  reset(false);
  const r = await call({ action: 'class-remove-student', token: 'prof', classId: 'C1', studentId: 'e1' });
  assert.equal(r.status, 200);
  assert.deepEqual(DB.members.map((x) => x.student_id), ['e2']);
});

test('rejoindre par code : l\'inscription est vérifiée et notée', async () => {
  reset();
  DB.members = DB.members.filter((x) => x.student_id !== 'e2');
  const r = await call({ action: 'join-code', token: 'e2', code: 'abc234' });
  assert.equal(r.status, 200);
  assert.ok(DB.members.some((x) => x.student_id === 'e2' && x.class_id === 'C1'));
  assert.equal(DB.events.at(-1).source, 'join-code');
});

test('devoirs : ceux d\'une classe archivée ne sont plus proposés à l\'élève', async () => {
  reset();
  DB.members.push({ id: 3, class_id: 'C2', student_id: 'e1', joined_at: '2025-09-01T08:00:00Z' });
  const r = await call({ action: 'my-assignments', token: 'e1' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.out.assignments.map((a) => a.id), ['A1']);
});

/* ── Activité des autres cours (logique pure) ── */
test('allTests : cours par défaut et autres cours, dans l\'ordre chronologique', () => {
  const d = { tests: [{ t: 3, wpm: 30 }], courses: { 'nl/azerty': { tests: [{ t: 1, wpm: 20 }, { t: 5, wpm: 25 }] }, 'en/azerty': 'abîmé' } };
  assert.deepEqual(allTests(d).map((t) => t.t), [1, 3, 5]);
  assert.equal(allTests(d)[0].course, 'nl/azerty');
  assert.deepEqual(allTests({}), []);
});

test('un élève qui travaille seulement dans un autre cours n\'est plus vu comme inactif', () => {
  const now = Date.UTC(2026, 10, 26, 12);
  const d = { tests: [], lessons: {}, courses: { 'nl/azerty': { tests: [{ t: now - DAY, wpm: 24, acc: 95, mode: 'lesson', lessonId: 'r1' }], lessons: { r1: { bestWpm: 24, cleared: true } } } } };
  const s = studentSummary(d, now);
  assert.equal(s.sessions, 1); assert.equal(s.daysSinceActive, 1); assert.equal(s.clearedLessons, 1);
  assert.equal(detectAlerts([{ username: 'a', data: d }], now).inactive.length, 0);
});

test('devoir « test de vitesse » : un test fait dans un autre cours compte', () => {
  const d = { courses: { 'nl/azerty': { tests: [{ t: 1, wpm: 41, mode: 'test' }] } } };
  assert.equal(assignmentDone(d, { target_wpm: 40 }), true);
  assert.equal(assignmentDone(d, { target_wpm: 45 }), false);
});

test('historique : entrée par code, retrait par l\'établissement, nom de l\'auteur', () => {
  const now = Date.UTC(2026, 10, 26, 12);
  const iso = (h) => new Date(now - h * 3600000).toISOString();
  const evs = [
    { id: 1, student_id: 's1', actor_id: 's1', action: 'add', source: 'join-code', created_at: iso(5), student: { username: 's1', full_name: 'Léa Martin' }, actor: { username: 's1', role: 'eleve' } },
    { id: 2, student_id: 's2', actor_id: 'a1', action: 'remove', source: 'admin', created_at: iso(2), student: { username: 's2', full_name: 'Tom Petit' }, actor: { username: 'direction', role: 'admin' } },
  ];
  const f = buildClassFeed({ members: [{ student_id: 's1', username: 's1', fullName: 'Léa Martin', joined_at: iso(5) }], dataById: {}, assignments: [], goals: { minWpm: 20 }, now, memberEvents: evs });
  const add = f.find((e) => e.type === 'member_add'), rem = f.find((e) => e.type === 'member_remove');
  assert.equal(add.name, 'Léa M.'); assert.equal(add.by, null); assert.equal(add.source, 'join-code');
  assert.equal(rem.name, 'Tom P.'); assert.equal(rem.by, "l'établissement"); assert.equal(rem.restorable, true);
});
