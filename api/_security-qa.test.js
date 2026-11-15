// Non-régression des trois failles « Bloquants / sécurité » du QA du 11/11/2026
// (corrigées dans 3fadbe5) : XSS sur ?reset=, rejeu de billing verify, pré-prise
// de contrôle via SSO.
// Lancer : node --test api/_security-qa.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
// Fausse clé construite à l'exécution : aucun littéral qui ressemble à un secret dans le dépôt (gate P7).
process.env.STRIPE_SECRET_KEY = ['sk', 'test', '0'.repeat(24)].join('_');
process.env.GOOGLE_CLIENT_ID = 'client-test';
process.env.GOOGLE_CLIENT_SECRET = 'secret-test';
delete process.env.RESEND_API_KEY;
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// ── Faux réseau : Supabase, Stripe et le token endpoint Google ──
let CALLS, ROUTES;
const jsonRes = (body, status = 200) => ({
  ok: status < 400, status,
  headers: new Map([['content-type', 'application/json']]),
  text: async () => JSON.stringify(body), json: async () => body,
});
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  CALLS.push({ u, method: opts.method || 'GET', body: opts.body ? String(opts.body) : null });
  for (const [match, reply] of ROUTES) if (u.includes(match)) return jsonRes(typeof reply === 'function' ? reply(u, opts) : reply);
  return jsonRes([]);
};
const supaPatches = () => CALLS.filter((c) => c.u.includes('supabase.test') && c.method === 'PATCH').map((c) => JSON.parse(c.body));

// ── 1. XSS ?reset= (index.html) ──
test('?reset= : jeton filtré (64 hex) et jamais interpolé dans le HTML de la modale', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const boot = html.match(/p\.get\('reset'\)[^\n]*/);
  assert.ok(boot, 'traitement du paramètre reset introuvable');
  assert.match(boot[0], /\/\^\[a-f0-9\]\{64\}\$\/i?\.test\(rt\)/, 'le jeton doit être validé avant d’ouvrir la modale');
  const start = html.indexOf('showResetPasswordModal(resetToken){');
  assert.ok(start > 0);
  const body = html.slice(start, html.indexOf('\n  }\n', start));
  assert.doesNotMatch(body, /\$\{\s*resetToken/, 'le jeton ne doit pas être injecté dans innerHTML');
});

// ── 2. billing verify rejouable ──
const billing = require('./billing');
const callBilling = async (body) => {
  const out = {};
  const res = {
    setHeader() {}, status(c) { out.status = c; return res; },
    json(b) { out.status = out.status || 200; out.body = b; return res; }, end() { return res; },
  };
  await billing({ method: 'POST', headers: {}, body }, res);
  return out;
};
const USER = { id: 'u1', username: 'alice', email: 'a@x.be', stripe_customer_id: 'cus_1' };
const checkoutSession = (subStatus) => ({
  id: 'cs_old', object: 'checkout.session', customer: 'cus_1', payment_status: 'paid',
  subscription: subStatus ? { id: 'sub_1', object: 'subscription', status: subStatus } : null,
});

test('verify : rejouer un ancien session_id après résiliation ne redonne pas Expert', async () => {
  CALLS = [];
  ROUTES = [['supabase.test/rest/v1/users?session_token', [USER]], ['api.stripe.com', checkoutSession('canceled')]];
  const r = await callBilling({ action: 'verify', token: 't', session_id: 'cs_old' });
  assert.equal(r.status, 200);
  assert.equal(r.body.plan, 'free');
  assert.equal(supaPatches().length, 0, 'aucun passage en Expert');
});

test('verify : abonnement impayé (past_due / unpaid) ne donne pas Expert', async () => {
  for (const s of ['past_due', 'unpaid', 'incomplete_expired']) {
    CALLS = [];
    ROUTES = [['supabase.test/rest/v1/users?session_token', [USER]], ['api.stripe.com', checkoutSession(s)]];
    const r = await callBilling({ action: 'verify', token: 't', session_id: 'cs_old' });
    assert.equal(r.body.plan, 'free', s);
    assert.equal(supaPatches().length, 0, s);
  }
});

test('verify : abonnement actif → Expert', async () => {
  CALLS = [];
  ROUTES = [['supabase.test/rest/v1/users?session_token', [USER]], ['api.stripe.com', checkoutSession('active')]];
  const r = await callBilling({ action: 'verify', token: 't', session_id: 'cs_new' });
  assert.equal(r.body.plan, 'expert');
  assert.deepEqual(supaPatches(), [{ plan: 'expert' }]);
});

test('verify : session Stripe d’un autre client refusée (403)', async () => {
  CALLS = [];
  ROUTES = [
    ['supabase.test/rest/v1/users?session_token', [USER]],
    ['supabase.test/rest/v1/users?stripe_customer_id', [{ id: 'u2' }]],
    ['api.stripe.com', { ...checkoutSession('active'), customer: 'cus_autre' }],
  ];
  const r = await callBilling({ action: 'verify', token: 't', session_id: 'cs_x' });
  assert.equal(r.status, 403);
  assert.equal(supaPatches().length, 0);
});

// ── 3. SSO : pré-prise de contrôle d'un compte non vérifié ──
const oauth = require('./oauth');
const b64url = (s) => Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fakeIdToken = (claims) => `${b64url('{"alg":"none"}')}.${b64url(JSON.stringify(claims))}.sig`;
const callOauth = async (url) => {
  const out = { headers: {} };
  const res = { setHeader(k, v) { out.headers[k.toLowerCase()] = v; }, end() { out.status = res.statusCode; } };
  await oauth({ method: 'GET', url, headers: { host: 'keypace.be' } }, res);
  return out;
};
const ssoLogin = async (existing) => {
  CALLS = [];
  ROUTES = [
    ['oauth2.googleapis.com/token', { id_token: fakeIdToken({ email: 'victime@x.be', email_verified: true, name: 'V' }) }],
    ['supabase.test/rest/v1/users?email=eq.', [existing]],
  ];
  const start = await callOauth('/api/oauth?provider=google');
  const state = new URL(start.headers.location).searchParams.get('state');
  const cb = await callOauth(`/api/oauth?code=c&state=${encodeURIComponent(state)}`);
  assert.match(cb.headers.location, /\?sso=/);
  const p = supaPatches();
  assert.equal(p.length, 1);
  return p[0];
};

test('SSO : un compte jamais confirmé n’est pas lié tel quel (mot de passe et reset invalidés)', async () => {
  const patch = await ssoLogin({ id: 'u9', email: 'victime@x.be', email_verified: false, password_hash: 'hash-attaquant', reset_token: 'tok', reset_expires_at: '2099-01-01' });
  assert.ok(patch.password_hash && patch.password_hash !== 'hash-attaquant', 'le mot de passe choisi à la création doit être remplacé');
  assert.equal(patch.reset_token, null);
  assert.equal(patch.reset_expires_at, null);
  assert.equal(patch.email_verified, true);
  assert.ok(patch.session_token, 'nouvelle session : celle de l’attaquant est écrasée');
});

test('SSO : un compte déjà confirmé garde son mot de passe', async () => {
  const patch = await ssoLogin({ id: 'u9', email: 'victime@x.be', email_verified: true, password_hash: 'hash-proprio' });
  assert.equal('password_hash' in patch, false);
});
