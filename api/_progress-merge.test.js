// Tests de la fusion de progression (étape 1b). Lancer : node --test api/_progress-merge.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
const test = require('node:test');
const assert = require('node:assert');
const { mergeProgress } = require('./_progress-merge');
const saveProgress = require('./save-progress');

const M = (prev, inc) => mergeProgress(prev, inc).data;

// ── Règles par champ ──
test('tests : union sans doublon, ordre chronologique', () => {
  const a = { t: 1, wpm: 40, acc: 90, mode: 'test' }, b = { t: 3, wpm: 50, acc: 95, mode: 'test' }, c = { t: 2, wpm: 45, acc: 92, mode: 'lesson' };
  assert.deepEqual(M({ tests: [a, b] }, { tests: [a, c] }).tests, [a, c, b]);
});

test('leçons : meilleur wpm, moins d\'erreurs, validée si l\'une l\'est, union des leçons', () => {
  const r = M({ lessons: { a: { bestWpm: 30, bestErr: 4, cleared: false }, z: { bestWpm: 10, bestErr: 1, cleared: true } } },
    { lessons: { a: { bestWpm: 25, bestErr: 2, cleared: true }, b: { bestWpm: 20, bestErr: 0, cleared: true } } }).lessons;
  assert.deepEqual(r.a, { bestWpm: 30, bestErr: 2, cleared: true });
  assert.ok(r.b && r.z);
});

test('leçon ancienne en nombre : normalisée, jamais de baisse', () => {
  assert.equal(M({ lessons: { a: 40 } }, { lessons: { a: { bestWpm: 30, bestErr: 1, cleared: false } } }).lessons.a.bestWpm, 40);
});

test('leçon reprise : importedFrom disparaît dès qu\'un vrai essai existe', () => {
  const r = M({ lessons: { a: { cleared: true, importedFrom: { course: 'nl/azerty' } } } }, { lessons: { a: { bestWpm: 30, bestErr: 1, cleared: true } } }).lessons.a;
  assert.equal('importedFrom' in r, false);
  const r2 = M({ lessons: { a: { cleared: true, importedFrom: { course: 'nl/azerty' } } } }, { lessons: { a: { cleared: true, importedFrom: { course: 'nl/azerty' } } } }).lessons.a;
  assert.ok(r2.importedFrom);
});

test('records : le plus haut garde', () => {
  const r = M({ gameBest: 100, sourisBest: 5, courseBest: { wpm: 60 }, ghostBest: { wpm: 30 }, simonBest: { score: 9 } },
    { gameBest: 80, sourisBest: 7, courseBest: { wpm: 55 }, ghostBest: { wpm: 70 }, simonBest: { score: 4 } });
  assert.equal(r.gameBest, 100); assert.equal(r.sourisBest, 7);
  assert.deepEqual(r.courseBest, { wpm: 60 }); assert.deepEqual(r.ghostBest, { wpm: 70 }); assert.deepEqual(r.simonBest, { score: 9 });
});

test('clavierBest : moins d\'erreurs, puis temps le plus bas', () => {
  assert.deepEqual(M({ clavierBest: { mistakes: 2, elapsed: 50 } }, { clavierBest: { mistakes: 3, elapsed: 10 } }).clavierBest, { mistakes: 2, elapsed: 50 });
  assert.deepEqual(M({ clavierBest: { mistakes: 2, elapsed: 50 } }, { clavierBest: { mistakes: 2, elapsed: 40 } }).clavierBest, { mistakes: 2, elapsed: 40 });
});

test('records à palier : palier le plus haut puis score, seul ou par sous-clé', () => {
  assert.deepEqual(M({ sourisHybridBest: { score: 10, tier: 'gold' } }, { sourisHybridBest: { score: 99, tier: 'silver' } }).sourisHybridBest, { score: 10, tier: 'gold' });
  const r = M({ sourisTilesBest: { s1: { score: 5, tier: 'bronze' }, s2: { score: 9, tier: 'gold' } } }, { sourisTilesBest: { s1: { score: 8, tier: 'bronze' }, s3: { score: 1, tier: 'bronze' } } }).sourisTilesBest;
  assert.equal(r.s1.score, 8); assert.equal(r.s2.tier, 'gold'); assert.ok(r.s3);
  assert.deepEqual(M({ sourisGridBest: { r1: { score: 3, tier: 'silver' } } }, { sourisGridBest: { r1: { score: 1, tier: 'bronze' } } }).sourisGridBest.r1, { score: 3, tier: 'silver' });
});

test('sourisGridTop, sourisTiers, tutoriel vu', () => {
  const r = M({ sourisGridTop: { g1: 10 }, sourisTiers: { 1: 'gold', 2: 'bronze' }, sourisTilesTutorialSeen: true },
    { sourisGridTop: { g1: 7, g2: 3 }, sourisTiers: { 1: 'silver', 2: 'silver' }, sourisTilesTutorialSeen: false });
  assert.deepEqual(r.sourisGridTop, { g1: 10, g2: 3 });
  assert.deepEqual(r.sourisTiers, { 1: 'gold', 2: 'silver' });
  assert.equal(r.sourisTilesTutorialSeen, true);
});

test('keyStats : la paire {n, e} de la version qui a le plus grand n', () => {
  const r = M({ keyStats: { a: { n: 100, e: 5 }, b: { n: 3, e: 0 } } }, { keyStats: { a: { n: 40, e: 9 }, c: { n: 1, e: 1 } } }).keyStats;
  assert.deepEqual(r.a, { n: 100, e: 5 });
  assert.ok(r.b && r.c);
});

test('duelRecord : maximum de chaque compteur', () => {
  assert.deepEqual(M({ duelRecord: { wins: 5, losses: 1, draws: 0 } }, { duelRecord: { wins: 3, losses: 2, draws: 0 } }).duelRecord, { wins: 5, losses: 2, draws: 0 });
});

test('bossBest : une semaine plus ancienne ne remplace pas une plus récente', () => {
  assert.equal(M({ bossBest: { isoWeek: '2026-W44', score: 1 } }, { bossBest: { isoWeek: '2026-W43', score: 9 } }).bossBest.isoWeek, '2026-W44');
  assert.equal(M({ bossBest: { isoWeek: '2026-W43', score: 1 } }, { bossBest: { isoWeek: '2026-W44', score: 2 } }).bossBest.isoWeek, '2026-W44');
});

test('réglages : la valeur envoyée gagne, le serveur sert si le client n\'en envoie pas', () => {
  assert.deepEqual(M({ goals: { minWpm: 20 } }, { goals: { minWpm: 30 } }).goals, { minWpm: 30 });
  assert.deepEqual(M({ goals: { minWpm: 20 }, sourisHybridHand: 'l' }, {}).goals, { minWpm: 20 });
  assert.equal(M({ sourisHybridHand: 'l' }, {}).sourisHybridHand, 'l');
});

test('données héritées : valeur du serveur conservée', () => {
  assert.deepEqual(M({ tireurBest: { s: 1 } }, { tireurBest: { s: 99 } }).tireurBest, { s: 1 });
});

test('clé inconnue : la valeur envoyée gagne (comme avant)', () => {
  assert.deepEqual(M({ nouveau: 1 }, { nouveau: 2 }).nouveau, 2);
});

// ── Propriétés ──
const SAMPLES = [
  { tests: [{ t: 1, wpm: 40, acc: 90 }], lessons: { a: { bestWpm: 30, bestErr: 2, cleared: true } }, gameBest: 5, keyStats: { a: { n: 4, e: 1 } }, courseBest: { wpm: 50 } },
  { tests: [{ t: 2, wpm: 55, acc: 97 }], lessons: { a: { bestWpm: 25, bestErr: 1, cleared: false }, b: { bestWpm: 10, bestErr: 0, cleared: true } }, gameBest: 9, keyStats: { a: { n: 9, e: 2 } }, courseBest: { wpm: 45 } },
  { tests: [], lessons: {}, gameBest: 0, keyStats: {} },
];
test('propriété : fusionner deux fois donne le même résultat (idempotence)', () => {
  for (const a of SAMPLES) for (const b of SAMPLES) {
    const once = M(a, b);
    assert.deepEqual(M(a, once), once);
  }
});
test('propriété : l\'ordre n\'importe pas pour les champs qui se cumulent', () => {
  for (const a of SAMPLES) for (const b of SAMPLES) {
    const x = M(a, b), y = M(b, a);
    for (const k of ['tests', 'lessons', 'gameBest', 'courseBest', 'keyStats']) assert.deepEqual(x[k], y[k], k);
  }
});
test('propriété : le résultat ne perd jamais de leçon ni de test', () => {
  for (const a of SAMPLES) for (const b of SAMPLES) {
    const r = M(a, b);
    for (const id of Object.keys(a.lessons || {})) assert.ok(id in r.lessons);
    assert.ok(r.tests.length >= Math.max((a.tests || []).length, (b.tests || []).length));
  }
});

// ── Bout en bout : save-progress ──
let ROW, CALLS, ON_PATCH;
global.fetch = async (url, opts = {}) => {
  const u = String(url); const method = opts.method || 'GET';
  CALLS.push({ u, method });
  let data = [];
  if (u.includes('/users?session_token=')) data = [{ id: 7 }];
  else if (u.includes('/progress?user_id=') && method === 'GET') data = ROW ? [{ data: ROW.data, rev: ROW.rev }] : [];
  else if (u.includes('/progress?user_id=') && method === 'PATCH') {
    if (ON_PATCH) { const f = ON_PATCH; ON_PATCH = null; f(); }
    const want = Number((u.match(/rev=eq\.(\d+)/) || [])[1]);
    if (ROW && ROW.rev === want) { const b = JSON.parse(opts.body); ROW = { data: b.data, rev: b.rev }; data = [{ ok: 1 }]; }
  } else if (u.includes('/progress?on_conflict') && method === 'POST') ROW = { data: JSON.parse(opts.body).data, rev: (ROW && ROW.rev) || 0 };
  return { ok: true, status: 200, text: async () => JSON.stringify(data) };
};
const call = async (data) => {
  const out = {};
  const res = { setHeader() {}, status: (c) => { out.status = c; return res; }, json: (o) => { out.body = o; return res; }, end: () => res };
  await saveProgress({ method: 'POST', headers: {}, body: { token: 't', data } }, res);
  return out;
};
const LESSON = { bestWpm: 30, bestErr: 1, cleared: true };

test('mode observe (par défaut) : l\'écriture reste celle du client, la fusion est seulement journalisée', async () => {
  delete process.env.PROGRESS_MERGE_MODE;
  ROW = { data: { lessons: { a: LESSON }, gameBest: 100 }, rev: 3 }; CALLS = [];
  await call({ lessons: { a: LESSON }, gameBest: 40 });
  assert.equal(ROW.data.gameBest, 40);
  assert.equal(ROW.rev, 3);
});

test('mode active : le record du serveur n\'est pas écrasé par un onglet en retard', async () => {
  process.env.PROGRESS_MERGE_MODE = 'active';
  ROW = { data: { lessons: { a: LESSON }, gameBest: 100, tests: [{ t: 5, wpm: 50, acc: 90 }] }, rev: 3 }; CALLS = [];
  const r = await call({ lessons: { a: LESSON }, gameBest: 40, tests: [] });
  assert.equal(r.body.ok, true);
  assert.equal(ROW.data.gameBest, 100);
  assert.equal(ROW.data.tests.length, 1);
  assert.equal(ROW.rev, 4);
});

test('mode active : un onglet en retard avec moins de leçons est fusionné au lieu d\'être refusé', async () => {
  process.env.PROGRESS_MERGE_MODE = 'active';
  ROW = { data: { lessons: { a: LESSON, b: LESSON } }, rev: 1 }; CALLS = [];
  const r = await call({ lessons: { a: LESSON } });
  assert.equal(r.body.ok, true);
  assert.deepEqual(Object.keys(ROW.data.lessons).sort(), ['a', 'b']);
});

test('mode active : une écriture concurrente entre la lecture et l\'écriture est relue puis fusionnée', async () => {
  process.env.PROGRESS_MERGE_MODE = 'active';
  ROW = { data: { lessons: { a: LESSON }, gameBest: 10 }, rev: 1 }; CALLS = [];
  ON_PATCH = () => { ROW = { data: { lessons: { a: LESSON, c: LESSON }, gameBest: 10 }, rev: 2 }; };
  const r = await call({ lessons: { a: LESSON }, gameBest: 20 });
  assert.equal(r.body.ok, true);
  assert.deepEqual(Object.keys(ROW.data.lessons).sort(), ['a', 'c']);
  assert.equal(ROW.data.gameBest, 20);
  assert.equal(ROW.rev, 3);
});

test('mode active : conflit persistant après 3 essais => 409, rien d\'écrasé', async () => {
  process.env.PROGRESS_MERGE_MODE = 'active';
  ROW = { data: { lessons: { a: LESSON } }, rev: 1 }; CALLS = [];
  const orig = global.fetch;
  global.fetch = async (url, opts = {}) => {
    if (String(url).includes('/progress?user_id=') && opts.method === 'PATCH') return { ok: true, status: 200, text: async () => '[]' };
    return orig(url, opts);
  };
  const r = await call({ lessons: { a: LESSON } });
  global.fetch = orig;
  assert.equal(r.status, 409);
  assert.equal(ROW.rev, 1);
});

test('mode active, premier enregistrement : écriture normale', async () => {
  process.env.PROGRESS_MERGE_MODE = 'active';
  ROW = null; CALLS = [];
  const r = await call({ lessons: { a: LESSON } });
  assert.equal(r.body.ok, true);
  assert.ok(ROW.data.lessons.a);
});

test('mode off : comportement d\'avant', async () => {
  process.env.PROGRESS_MERGE_MODE = 'off';
  ROW = { data: { lessons: { a: LESSON }, gameBest: 100 }, rev: 3 }; CALLS = [];
  await call({ lessons: { a: LESSON }, gameBest: 40 });
  assert.equal(ROW.data.gameBest, 40);
  delete process.env.PROGRESS_MERGE_MODE;
});
