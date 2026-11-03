// Parcours « authentification » : rotation, expiration et déconnexion des sessions (api/login.js + api/save-progress.js).
// C'est la classe de bug du boss de la semaine (« Session invalide » après une rotation de jeton).
// Lancer : node --test api/_session.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
delete process.env.RESEND_API_KEY;
const test = require('node:test');
const assert = require('node:assert');
const login = require('./login');
const saveProgress = require('./save-progress');

let USERS, PROGRESS, PATCHES;
global.fetch = async (url, opts = {}) => {
  const u = String(url); const method = opts.method || 'GET';
  let data = [];
  const tok = (/session_token=eq\.([^&]+)/.exec(u) || [])[1];
  const nowIso = (/session_expires_at\.gt\.([^)]+)\)/.exec(u) || [])[1];
  if (u.includes('/users?') && tok !== undefined && method === 'GET') {
    const t = decodeURIComponent(tok);
    data = USERS.filter((x) => x.session_token === t && (!x.session_expires_at || !nowIso || x.session_expires_at > decodeURIComponent(nowIso)));
  } else if (u.includes('/users?id=eq.') && method === 'PATCH') {
    const id = Number((/id=eq\.(\d+)/.exec(u) || [])[1]); const b = JSON.parse(opts.body);
    PATCHES.push({ id, body: b }); const user = USERS.find((x) => x.id === id); if (user) Object.assign(user, b); data = user ? [user] : [];
  } else if (u.includes('/progress?user_id=eq.') && method === 'GET') {
    const id = Number((/user_id=eq\.(\d+)/.exec(u) || [])[1]); data = PROGRESS[id] ? [{ data: PROGRESS[id], rev: 0 }] : [];
  } else if (u.includes('/progress?on_conflict') && method === 'POST') {
    const b = JSON.parse(opts.body); PROGRESS[b.user_id] = b.data;
  }
  return { ok: true, status: 200, text: async () => JSON.stringify(data) };
};
const call = async (handler, body) => {
  const out = { headers: {} };
  const res = { setHeader() {}, status: (c) => { out.status = c; return res; }, json: (o) => { out.status = out.status || 200; out.body = o; return res; }, end: () => res, send: (o) => { out.body = o; return res; } };
  await handler({ method: 'POST', headers: {}, body }, res);
  return out;
};
const fresh = () => { USERS = [{ id: 7, username: 'eleve', plan: 'free', role: 'eleve', session_token: 'ancien', session_expires_at: new Date(Date.now() + 86400000).toISOString() }]; PROGRESS = {}; PATCHES = []; };
const lesson = { bestWpm: 30, bestErr: 0, cleared: true };

test('session-login : renvoie un NOUVEAU jeton, enregistré en base', async () => {
  fresh();
  const r = await call(login, { action: 'session-login', token: 'ancien' });
  assert.equal(r.status, 200);
  assert.ok(r.body.token && r.body.token !== 'ancien');
  assert.equal(USERS[0].session_token, r.body.token);
  assert.equal(r.body.username, 'eleve');
});

test('après une rotation, l\'ancien jeton est refusé partout (le client doit adopter le nouveau)', async () => {
  fresh();
  const r = await call(login, { action: 'session-login', token: 'ancien' });
  assert.equal((await call(saveProgress, { token: 'ancien', data: { lessons: { a: lesson } } })).status, 401);
  assert.equal((await call(login, { action: 'session-login', token: 'ancien' })).status, 401);
  assert.equal((await call(saveProgress, { token: r.body.token, data: { lessons: { a: lesson } } })).body.ok, true);
});

test('la progression sauvegardée avec le nouveau jeton est relue par session-login', async () => {
  fresh();
  const r1 = await call(login, { action: 'session-login', token: 'ancien' });
  await call(saveProgress, { token: r1.body.token, data: { lessons: { a: lesson } } });
  const r2 = await call(login, { action: 'session-login', token: r1.body.token });
  assert.equal(r2.status, 200);
  assert.deepEqual(r2.body.data.lessons.a, lesson);
  assert.notEqual(r2.body.token, r1.body.token);
});

test('jeton inconnu : 401 et aucune modification de compte', async () => {
  fresh();
  const r = await call(login, { action: 'session-login', token: 'inconnu' });
  assert.equal(r.status, 401);
  assert.equal(PATCHES.length, 0);
});

test('jeton absent : 400', async () => {
  fresh();
  assert.equal((await call(login, { action: 'session-login' })).status, 400);
  assert.equal((await call(saveProgress, { data: {} })).status, 400);
});

test('jeton expiré : 401', async () => {
  fresh(); USERS[0].session_expires_at = new Date(Date.now() - 1000).toISOString();
  assert.equal((await call(login, { action: 'session-login', token: 'ancien' })).status, 401);
  assert.equal((await call(saveProgress, { token: 'ancien', data: { lessons: {} } })).status, 401);
});

test('une session sans date d\'expiration (émise avant la colonne) reste valide', async () => {
  fresh(); USERS[0].session_expires_at = null;
  assert.equal((await call(login, { action: 'session-login', token: 'ancien' })).status, 200);
});

test('la rotation prolonge la session d\'environ 30 jours', async () => {
  fresh();
  await call(login, { action: 'session-login', token: 'ancien' });
  const days = (new Date(USERS[0].session_expires_at) - Date.now()) / 86400000;
  assert.ok(days > 29 && days < 31, `durée ${days} jours`);
});

test('déconnexion : le jeton ne permet plus de sauvegarder', async () => {
  fresh();
  assert.equal((await call(login, { action: 'logout', token: 'ancien' })).body.ok, true);
  assert.equal(USERS[0].session_token, null);
  assert.equal((await call(saveProgress, { token: 'ancien', data: { lessons: {} } })).status, 401);
});

test('déconnexion avec un jeton inconnu : réponse normale, rien de modifié', async () => {
  fresh();
  const r = await call(login, { action: 'logout', token: 'inconnu' });
  assert.equal(r.body.ok, true);
  assert.equal(PATCHES.length, 0);
});
