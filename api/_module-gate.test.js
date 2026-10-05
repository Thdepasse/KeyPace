// Tests de l'accès réservé aux comptes Expert (modules mail et CV).
// Lancer : node --test api/_module-gate.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
const test = require('node:test');
const assert = require('node:assert');
const { handle } = require('./_module-gate');

let USERS = {}, INST = {};
global.fetch = async (url) => {
  const u = String(url);
  let data = [];
  if (u.includes('/users?')) { const t = decodeURIComponent((u.match(/session_token=eq\.([^&]+)/) || [])[1] || ''); data = USERS[t] ? [USERS[t]] : []; }
  if (u.includes('/institutions?')) { const id = (u.match(/id=eq\.([^&]+)/) || [])[1]; data = INST[id] ? [INST[id]] : []; }
  return { ok: true, text: async () => JSON.stringify(data) };
};
const call = async (m, method, body, extra) => {
  const out = { headers: {} };
  const res = { setHeader: (k, v) => { out.headers[k] = v; }, status: (c) => { out.status = c; return res; }, json: (o) => { out.body = o; return res; }, send: (s) => { out.body = s; return res; } };
  await handle({ method, query: { m, ...(extra || {}) }, body }, res);
  return out;
};

test('GET refusé', async () => assert.equal((await call('cv', 'GET')).status, 405));
test('module inconnu', async () => assert.equal((await call('zzz', 'POST', { token: 'a' })).status, 404));
test('sans token : 401', async () => assert.equal((await call('cv', 'POST', {})).status, 401));
test('session inconnue : 401', async () => { USERS = {}; assert.equal((await call('cv', 'POST', { token: 'x' })).status, 401); });
test('compte gratuit : 403, rien du module', async () => {
  USERS = { t1: { id: 1, plan: 'free' } };
  const r = await call('cv', 'POST', { token: 't1' });
  assert.equal(r.status, 403); assert.ok(!String(r.body).includes('SIT_EX'));
});
test('compte Expert : 200 et code du module, sans cache', async () => {
  USERS = { t2: { id: 2, plan: 'expert' } };
  for (const m of ['cv', 'mail']) {
    const r = await call(m, 'POST', { token: 't2' });
    assert.equal(r.status, 200);
    assert.ok(typeof r.body === 'string' && r.body.length > 10000);
    assert.equal(r.headers['Cache-Control'], 'no-store');
    assert.match(r.headers['Content-Type'], /javascript/);
  }
});
test('Expert via établissement à licence expirée : 403', async () => {
  USERS = { t3: { id: 3, plan: 'expert', institution_id: 9 } };
  INST = { 9: { license_expires_at: '2020-01-01T00:00:00Z' } };
  assert.equal((await call('mail', 'POST', { token: 't3' })).status, 403);
  INST = { 9: { license_expires_at: '2099-01-01T00:00:00Z' } };
  assert.equal((await call('mail', 'POST', { token: 't3' })).status, 200);
});
test('contrôle de déploiement : tailles seulement, pas de contenu', async () => {
  const r = await call('cv', 'GET', undefined, { check: '1' });
  assert.equal(r.status, 200); assert.ok(r.body.sizes.cv > 10000 && r.body.sizes.mail > 10000);
  assert.ok(!JSON.stringify(r.body).includes('function'));
});
