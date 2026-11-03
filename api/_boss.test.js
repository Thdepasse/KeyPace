// Parcours « jeu » : le défi hebdomadaire (Boss) de bout en bout côté serveur (api/games.js).
// Lancer : node --test api/_boss.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
const test = require('node:test');
const assert = require('node:assert');
const games = require('./games');

let CHALLENGES, SCORES, POSTS, NEXT;
const USER = { id: 7, username: 'eleve', display_name: null, session_token: 'tok', session_expires_at: null };
global.fetch = async (url, opts = {}) => {
  const u = String(url); const method = opts.method || 'GET'; let data = [];
  if (u.includes('/users?')) { const t = decodeURIComponent((/session_token=eq\.([^&]+)/.exec(u) || [])[1] || ''); data = t === USER.session_token ? [USER] : []; }
  else if (u.includes('/weekly_challenges')) {
    if (method === 'GET') { const w = decodeURIComponent((/iso_week=eq\.([^&]+)/.exec(u) || [])[1] || ''); data = CHALLENGES.filter((c) => c.iso_week === w); }
    else if (method === 'POST') { const b = JSON.parse(opts.body); if (!CHALLENGES.some((c) => c.iso_week === b.iso_week)) CHALLENGES.push({ id: 'ch1', ...b }); data = [CHALLENGES.find((c) => c.iso_week === b.iso_week)]; POSTS.push('challenge'); }
  } else if (u.includes('/weekly_scores')) {
    if (method === 'GET') data = SCORES.filter((s) => String(s.user_id) === (/user_id=eq\.(\d+)/.exec(u) || [])[1]);
    else if (method === 'POST') { const b = JSON.parse(opts.body); SCORES.push({ id: ++NEXT, ...b }); POSTS.push('score'); }
    else if (method === 'PATCH') { const id = Number((/id=eq\.(\d+)/.exec(u) || [])[1]); Object.assign(SCORES.find((s) => s.id === id), JSON.parse(opts.body)); POSTS.push('patch'); }
  }
  return { ok: true, status: 200, text: async () => JSON.stringify(data) };
};
const call = async (body) => {
  const out = {};
  const res = { setHeader() {}, status: (c) => { out.status = c; return res; }, json: (o) => { out.status = out.status || 200; out.body = o; return res; }, end: () => res };
  await games({ method: 'POST', headers: {}, body }, res);
  return out;
};
const reset = () => { CHALLENGES = []; SCORES = []; POSTS = []; NEXT = 0; };
const submitFor = async (chText, extra = {}) => ({ token: 'tok', wpm: 60, accuracy: 100, timeMs: 60000, ...extra });

test('le défi de la semaine est créé une seule fois et renvoie son texte', async () => {
  reset();
  const a = await call({ action: 'boss-challenge' });
  const b = await call({ action: 'boss-challenge' });
  assert.ok(a.body.text && a.body.text.length > 50);
  assert.match(a.body.isoWeek, /^\d{4}-W\d{2}$/);
  assert.equal(a.body.id, b.body.id);
  assert.equal(CHALLENGES.length, 1);
  assert.ok(a.body.secondsLeft >= 0);
});

test('un résultat valide est enregistré, avec le score wpm x précision au carré', async () => {
  reset();
  await call({ action: 'boss-challenge' });
  const r = await call({ action: 'boss-submit', ...(await submitFor(null, { wpm: 60, accuracy: 90 })) });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.score, 48.6); // 60 x 0,9 x 0,9
  assert.equal(SCORES.length, 1);
  assert.equal(SCORES[0].username, 'eleve');
});

test('session invalide : 401 et aucun score écrit', async () => {
  reset();
  const r = await call({ action: 'boss-submit', token: 'faux', wpm: 60, accuracy: 100, timeMs: 60000 });
  assert.equal(r.status, 401);
  assert.equal(SCORES.length, 0);
});

test('sans jeton : 400', async () => {
  reset();
  assert.equal((await call({ action: 'boss-submit', wpm: 60, accuracy: 100, timeMs: 60000 })).status, 400);
});

test('temps trop court pour la longueur du texte, ou absent : refusé (anti-triche)', async () => {
  reset();
  const ch = (await call({ action: 'boss-challenge' })).body;
  const tooFast = Math.round(ch.text.length / ((300 * 5) / 60000)) - 50;
  assert.equal((await call({ action: 'boss-submit', token: 'tok', wpm: 200, accuracy: 100, timeMs: tooFast })).status, 400);
  assert.equal((await call({ action: 'boss-submit', token: 'tok', wpm: 200, accuracy: 100 })).status, 400);
  assert.equal(SCORES.length, 0);
});

test('un second essai moins bon ne baisse pas le meilleur score ; un meilleur le remplace', async () => {
  reset();
  await call({ action: 'boss-challenge' });
  await call({ action: 'boss-submit', token: 'tok', wpm: 80, accuracy: 100, timeMs: 60000 });
  const worse = await call({ action: 'boss-submit', token: 'tok', wpm: 40, accuracy: 100, timeMs: 60000 });
  assert.equal(worse.body.best, 80);
  assert.equal(SCORES.length, 1); assert.equal(SCORES[0].score, 80);
  const better = await call({ action: 'boss-submit', token: 'tok', wpm: 100, accuracy: 100, timeMs: 60000 });
  assert.equal(better.body.best, 100);
  assert.equal(SCORES.length, 1); assert.equal(SCORES[0].score, 100);
});

test('une vitesse déclarée au-delà du plafond est plafonnée à 220', async () => {
  reset();
  await call({ action: 'boss-challenge' });
  const r = await call({ action: 'boss-submit', token: 'tok', wpm: 9999, accuracy: 100, timeMs: 600000 });
  assert.equal(r.body.score, 220);
  assert.equal(SCORES[0].wpm, 220);
});

test('une précision hors bornes est ramenée entre 0 et 100', async () => {
  reset();
  await call({ action: 'boss-challenge' });
  const r = await call({ action: 'boss-submit', token: 'tok', wpm: 50, accuracy: 500, timeMs: 600000 });
  assert.equal(SCORES[0].accuracy, 100);
  assert.equal(r.body.score, 50);
});
