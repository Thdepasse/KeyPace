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

let USERS, PROGRESS, PATCHES, SESSIONS, TABLE;
global.fetch = async (url, opts = {}) => {
  const u = String(url); const method = opts.method || 'GET';
  let data = [];
  // Table user_sessions (sessions multi-appareils) : absente tant que TABLE est faux (migration pas passée).
  if (u.includes('/user_sessions')) {
    if (!TABLE) return { ok: false, status: 404, text: async () => JSON.stringify({ message: 'relation "user_sessions" does not exist' }) };
    const q = new URL(u).searchParams;
    const eq = (k) => { const v = q.get(k); return v && v.startsWith('eq.') ? decodeURIComponent(v.slice(3)) : undefined; };
    const nowGt = (q.get('expires_at') || '').startsWith('gt.') ? q.get('expires_at').slice(3) : null;
    const nowLt = (q.get('expires_at') || '').startsWith('lt.') ? q.get('expires_at').slice(3) : null;
    const match = (x) => (eq('token_hash') === undefined || x.token_hash === eq('token_hash'))
      && (eq('user_id') === undefined || String(x.user_id) === eq('user_id'))
      && (!nowGt || x.expires_at > nowGt) && (!nowLt || x.expires_at < nowLt);
    if (method === 'POST') { const row = JSON.parse(opts.body); SESSIONS.push(row); data = [row]; }
    else if (method === 'DELETE') { data = SESSIONS.filter(match); SESSIONS = SESSIONS.filter((x) => !match(x)); }
    else data = SESSIONS.filter(match).map((x) => ({ user_id: x.user_id, users: USERS.find((y) => y.id === x.user_id) || null }));
    return { ok: true, status: 200, text: async () => JSON.stringify(data) };
  }
  if (u.includes('/users?session_token=eq.') && method === 'PATCH') {
    const t = decodeURIComponent((/session_token=eq\.([^&]+)/.exec(u) || [])[1]); const b = JSON.parse(opts.body);
    const user = USERS.find((x) => x.session_token === t);
    if (user) { PATCHES.push({ id: user.id, body: b }); Object.assign(user, b); }
    return { ok: true, status: 200, text: async () => JSON.stringify(user ? [user] : []) };
  }
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
  } else if (u.includes('/progress?user_id=eq.') && method === 'PATCH') {
    const id = Number((/user_id=eq\.(\d+)/.exec(u) || [])[1]); PROGRESS[id] = JSON.parse(opts.body).data; data = [{ user_id: id }];
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
const fresh = (table = false) => { TABLE = table; SESSIONS = []; USERS = [{ id: 7, username: 'eleve', plan: 'free', role: 'eleve', session_token: 'ancien', session_expires_at: new Date(Date.now() + 86400000).toISOString() }]; PROGRESS = {}; PATCHES = []; };
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

/* ── Sessions multi-appareils (table user_sessions) ── */
const sessions = require('./_sessions');
const sbMock = async (path, opts = {}) => { const r = await global.fetch('http://supabase.test/rest/v1' + path, opts); const t = await r.text(); return { ok: r.ok, status: r.status, data: t ? JSON.parse(t) : null }; };

test('table présente : deux appareils ont chacun leur jeton, les deux restent valides', async () => {
  fresh(true);
  const a = await sessions.createSession(sbMock, 7);
  const b = await sessions.createSession(sbMock, 7);
  assert.deepEqual(a.legacyPatch, {});
  assert.notEqual(a.token, b.token);
  assert.equal((await call(saveProgress, { token: a.token, data: { lessons: { a: lesson } } })).body.ok, true);
  assert.equal((await call(saveProgress, { token: b.token, data: { lessons: { a: lesson, b: lesson } } })).body.ok, true);
  assert.equal(USERS[0].session_token, 'ancien', 'l\'ancienne colonne n\'est pas touchée');
  assert.ok(SESSIONS.every((x) => x.token_hash !== a.token && x.token_hash !== b.token), 'jamais de jeton en clair');
});

test('table présente : se déconnecter d\'un appareil ne déconnecte pas les autres', async () => {
  fresh(true);
  const a = await sessions.createSession(sbMock, 7);
  const b = await sessions.createSession(sbMock, 7);
  assert.equal((await call(login, { action: 'logout', token: a.token })).body.ok, true);
  assert.equal((await call(saveProgress, { token: a.token, data: { lessons: {} } })).status, 401);
  assert.equal((await call(saveProgress, { token: b.token, data: { lessons: { a: lesson } } })).body.ok, true);
  assert.equal((await call(saveProgress, { token: 'ancien', data: { lessons: { a: lesson } } })).body.ok, true, 'le jeton de l\'ancienne colonne reste valide');
});

test('table présente : session-login (retour SSO) remplace CE jeton seulement', async () => {
  fresh(true);
  const sso = await sessions.createSession(sbMock, 7, 120000);
  const other = await sessions.createSession(sbMock, 7);
  const r = await call(login, { action: 'session-login', token: sso.token });
  assert.equal(r.status, 200);
  assert.equal((await call(saveProgress, { token: sso.token, data: { lessons: {} } })).status, 401);
  assert.equal((await call(saveProgress, { token: r.body.token, data: { lessons: { a: lesson } } })).body.ok, true);
  assert.equal((await call(saveProgress, { token: other.token, data: { lessons: { a: lesson } } })).body.ok, true);
});

test('account-info (réglages) : renvoie le compte SANS changer le jeton', async () => {
  fresh();
  const r = await call(login, { action: 'account-info', token: 'ancien' });
  assert.equal(r.status, 200);
  assert.equal(r.body.token, 'ancien');
  assert.equal(r.body.username, 'eleve');
  assert.equal(USERS[0].session_token, 'ancien');
  assert.equal((await call(login, { action: 'account-info', token: 'inconnu' })).status, 401);
});

test('table absente : createSession retombe sur l\'ancienne colonne', async () => {
  fresh(false);
  const s = await sessions.createSession(sbMock, 7);
  assert.equal(s.legacyPatch.session_token, s.token);
});

test('session expirée dans la table : refusée', async () => {
  fresh(true);
  const s = await sessions.createSession(sbMock, 7, -1000);
  assert.equal(await sessions.userByToken(sbMock, s.token), null);
});

test('panne de la base : erreur levée plutôt qu\'une fausse « session invalide »', async () => {
  const down = async () => ({ ok: false, status: 503, data: null });
  await assert.rejects(() => sessions.userByToken(down, 'x'));
});
