// Tests de l'historique des progressions (étape 1c). Lancer : node --test api/_progress-history.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
const test = require('node:test');
const assert = require('node:assert');
const { archiveReasons, toEvict, alreadyKept } = require('./_progress-history');
const saveProgress = require('./save-progress');

const L = { bestWpm: 30, bestErr: 1, cleared: true };

test('rien à garder quand la sauvegarde ne fait rien reculer', () => {
  assert.deepEqual(archiveReasons({ lessons: { a: L }, tests: [{ t: 1 }] }, { lessons: { a: L, b: L }, tests: [{ t: 1 }, { t: 2 }] }), []);
});
test('une baisse de leçons, de tests ou un champ disparu déclenchent l\'archivage', () => {
  assert.deepEqual(archiveReasons({ lessons: { a: L, b: L } }, { lessons: { a: L } }), ['lecons']);
  assert.deepEqual(archiveReasons({ tests: [{ t: 1 }, { t: 2 }] }, { tests: [{ t: 1 }] }), ['tests']);
  assert.ok(archiveReasons({ keyStats: { a: { n: 1, e: 0 } }, lessons: {} }, { lessons: {} })[0].startsWith('champ:keyStats'));
});
test('role, classes et courses absents du client ne comptent pas comme une perte', () => {
  assert.deepEqual(archiveReasons({ role: 'eleve', classes: [], courses: {} }, {}), []);
});
test('on garde les versions les plus riches, pas les plus récentes', () => {
  const rows = [1, 2, 3, 4, 5, 6].map((i) => ({ id: i, lessons_count: i === 6 ? 0 : 10 + i, tests_count: 0, saved_at: `2026-11-0${i}` }));
  assert.deepEqual(toEvict(rows, 5), [6]);
});
test('une version identique déjà gardée n\'est pas recopiée', () => {
  assert.equal(alreadyKept([{ lessons_count: 2, tests_count: 1 }], { lessons: { a: L, b: L }, tests: [{ t: 1 }] }), true);
  assert.equal(alreadyKept([{ lessons_count: 2, tests_count: 1 }], { lessons: { a: L }, tests: [{ t: 1 }] }), false);
});

// ── Bout en bout ──
let ROW, HIST, NEXT_ID, FAIL_HISTORY;
global.fetch = async (url, opts = {}) => {
  const u = String(url); const method = opts.method || 'GET';
  let data = []; let ok = true;
  if (u.includes('/users?session_token=')) data = [{ id: 7 }];
  else if (u.includes('/progress_history')) {
    if (FAIL_HISTORY) return { ok: false, status: 404, text: async () => '{"message":"relation does not exist"}' };
    if (method === 'GET') data = HIST.map((h) => ({ ...h }));
    else if (method === 'POST') { const b = JSON.parse(opts.body); const row = { id: NEXT_ID++, saved_at: new Date().toISOString(), ...b }; HIST.push(row); data = [row]; }
    else if (method === 'DELETE') { const ids = (u.match(/id=in\.\(([^)]*)\)/) || [])[1].split(',').map(Number); HIST = HIST.filter((h) => !ids.includes(h.id)); data = ids.map((id) => ({ id })); }
  }
  else if (u.includes('/progress?user_id=') && method === 'GET') data = ROW ? [{ data: ROW.data, rev: ROW.rev }] : [];
  else if (u.includes('/progress?on_conflict') && method === 'POST') ROW = { data: JSON.parse(opts.body).data, rev: 0 };
  return { ok, status: 200, text: async () => JSON.stringify(data) };
};
const call = async (data) => {
  const out = {};
  const res = { setHeader() {}, status: (c) => { out.status = c; return res; }, json: (o) => { out.body = o; return res; }, end: () => res };
  await saveProgress({ method: 'POST', headers: {}, body: { token: 't', data } }, res);
  return out;
};

test('save-progress : une sauvegarde qui ferait reculer les tests garde l\'ancienne version', async () => {
  delete process.env.PROGRESS_MERGE_MODE;
  ROW = { data: { lessons: { a: L }, tests: [{ t: 1, wpm: 40, acc: 90 }, { t: 2, wpm: 41, acc: 91 }] }, rev: 0 };
  HIST = []; NEXT_ID = 1; FAIL_HISTORY = false;
  const r = await call({ lessons: { a: L }, tests: [{ t: 1, wpm: 40, acc: 90 }] });
  assert.equal(r.body.ok, true);
  assert.equal(HIST.length, 1);
  assert.equal(HIST[0].tests_count, 2);
  assert.equal(HIST[0].user_id, 7);
});

test('save-progress : une sauvegarde normale n\'écrit rien dans l\'historique', async () => {
  ROW = { data: { lessons: { a: L }, tests: [{ t: 1 }] }, rev: 0 }; HIST = []; NEXT_ID = 1; FAIL_HISTORY = false;
  await call({ lessons: { a: L }, tests: [{ t: 1 }, { t: 2 }] });
  assert.equal(HIST.length, 0);
});

test('save-progress : un onglet en retard qui sauvegarde 10 fois ne remplit pas l\'historique', async () => {
  HIST = []; NEXT_ID = 1; FAIL_HISTORY = false;
  for (let i = 0; i < 10; i++) {
    ROW = { data: { lessons: { a: L }, tests: [{ t: 1 }, { t: 2 }] }, rev: 0 };
    await call({ lessons: { a: L }, tests: [{ t: 1 }] });
  }
  assert.equal(HIST.length, 1);
});

test('save-progress : un échec de l\'historique ne bloque jamais la sauvegarde', async () => {
  ROW = { data: { lessons: { a: L }, tests: [{ t: 1 }, { t: 2 }] }, rev: 0 }; HIST = []; NEXT_ID = 1; FAIL_HISTORY = true;
  const r = await call({ lessons: { a: L }, tests: [{ t: 1 }] });
  assert.equal(r.body.ok, true);
  assert.equal(ROW.data.tests.length, 1);
});

test('save-progress : on ne garde que les 5 versions les plus riches', async () => {
  FAIL_HISTORY = false; NEXT_ID = 100;
  HIST = [1, 2, 3, 4, 5].map((i) => ({ id: i, user_id: 7, lessons_count: 10 + i, tests_count: 0, saved_at: '2026-11-01T00:00:00Z' }));
  ROW = { data: { lessons: { a: L, b: L }, tests: [] }, rev: 0 };
  await call({ lessons: { a: L } });
  assert.equal(HIST.length, 5);
  assert.equal(HIST.some((h) => h.lessons_count === 2), false);
});
