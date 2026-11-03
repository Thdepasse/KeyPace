// Parcours « paiement » : règles du webhook Stripe (api/webhook.js), avec de vraies signatures Stripe de test.
// Lancer : node --test api/_webhook.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
// Fausse clé construite à l'exécution : aucun littéral qui ressemble à un secret dans le dépôt (gate P7).
process.env.STRIPE_SECRET_KEY = ['sk', 'test', '0'.repeat(24)].join('_');
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_testsecret';
delete process.env.RESEND_API_KEY;
const test = require('node:test');
const assert = require('node:assert');
const { Readable } = require('node:stream');
const Stripe = require('stripe');
const handler = require('./webhook');

let CALLS;
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  CALLS.push({ u, method: opts.method || 'GET', body: opts.body ? String(opts.body) : null });
  if (u.includes('api.stripe.com')) return { ok: true, status: 200, headers: new Map([['content-type', 'application/json']]), text: async () => '{"id":"cus_1","metadata":{}}', json: async () => ({ id: 'cus_1', metadata: {} }) };
  return { ok: true, status: 200, text: async () => '[]' };
};
const patches = () => CALLS.filter((c) => c.u.includes('supabase.test') && c.method === 'PATCH');
const post = async (event, { secret = process.env.STRIPE_WEBHOOK_SECRET, method = 'POST' } = {}) => {
  const payload = JSON.stringify(event);
  const sig = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  const req = Object.assign(Readable.from([Buffer.from(payload)]), { method, headers: { 'stripe-signature': sig } });
  const out = {};
  const res = { status: (c) => { out.status = c; return res; }, send: (b) => { out.body = b; return res; }, end: () => res, json: (b) => { out.status = out.status || 200; out.body = b; return res; } };
  await handler(req, res);
  return out;
};
const ev = (type, object) => ({ id: 'evt_1', object: 'event', type, data: { object } });
const bodyOf = (c) => JSON.parse(c.body);

test('une signature fausse est refusée (400) et ne change aucun compte', async () => {
  CALLS = [];
  const r = await post(ev('checkout.session.completed', { id: 'cs_1', customer: 'cus_1' }), { secret: 'whsec_autre' });
  assert.equal(r.status, 400);
  assert.equal(patches().length, 0);
});

test('une requête qui n\'est pas un POST est refusée (405)', async () => {
  CALLS = [];
  const r = await post(ev('checkout.session.completed', { customer: 'cus_1' }), { method: 'GET' });
  assert.equal(r.status, 405);
  assert.equal(patches().length, 0);
});

test('paiement réussi : le compte passe en Expert', async () => {
  CALLS = [];
  const r = await post(ev('checkout.session.completed', { id: 'cs_1', customer: 'cus_1' }));
  assert.equal(r.status, 200);
  const p = patches();
  assert.equal(p.length, 1);
  assert.ok(p[0].u.includes('stripe_customer_id=eq.cus_1'));
  assert.equal(bodyOf(p[0]).plan, 'expert');
  assert.ok(!p[0].u.includes('institution_id'), 'un paiement peut toujours activer Expert');
});

test('abonnement terminé : retour au gratuit, mais JAMAIS pour un compte d\'établissement', async () => {
  CALLS = [];
  await post(ev('customer.subscription.deleted', { customer: 'cus_1' }));
  const p = patches();
  assert.equal(p.length, 1);
  assert.equal(bodyOf(p[0]).plan, 'free');
  assert.ok(p[0].u.includes('institution_id=is.null'), 'le filtre qui protège les licences d\'établissement est absent');
});

for (const [status, plan] of [['active', 'expert'], ['trialing', 'expert'], ['canceled', 'free'], ['unpaid', 'free'], ['incomplete_expired', 'free'], ['paused', 'free']]) {
  test(`abonnement « ${status} » : le compte passe en ${plan}`, async () => {
    CALLS = [];
    await post(ev('customer.subscription.updated', { customer: 'cus_1', status }));
    const p = patches();
    assert.equal(p.length, 1);
    assert.equal(bodyOf(p[0]).plan, plan);
    assert.equal(p[0].u.includes('institution_id=is.null'), plan === 'free');
  });
}

for (const status of ['past_due', 'incomplete']) {
  test(`abonnement « ${status} » : aucun changement de compte (relance en cours, ou 3D Secure à confirmer)`, async () => {
    CALLS = [];
    await post(ev('customer.subscription.updated', { customer: 'cus_1', status }));
    assert.equal(patches().length, 0);
  });
}

test('un événement sans client ne modifie aucun compte', async () => {
  CALLS = [];
  await post(ev('customer.subscription.deleted', {}));
  assert.equal(patches().length, 0);
});

test('un événement inconnu est accepté sans rien modifier', async () => {
  CALLS = [];
  const r = await post(ev('invoice.paid', { customer: 'cus_1' }));
  assert.equal(r.status, 200);
  assert.equal(patches().length, 0);
});

test('le même événement rejoué deux fois donne le même résultat (idempotence)', async () => {
  CALLS = [];
  await post(ev('customer.subscription.updated', { customer: 'cus_1', status: 'active' }));
  await post(ev('customer.subscription.updated', { customer: 'cus_1', status: 'active' }));
  const p = patches();
  assert.equal(p.length, 2);
  assert.deepEqual(bodyOf(p[0]), bodyOf(p[1]));
});
