// Test du handler self-onboard avec une base simulée (fetch remplacé).
// Lancer : node --test api/_self-onboard-handler.test.js
const test = require('node:test');
const assert = require('node:assert');

process.env.SUPABASE_URL = 'http://db.test';
process.env.SUPABASE_SECRET_KEY = 'k';
process.env.APP_URL = 'https://keypace.test';
delete process.env.RESEND_API_KEY;

function fakeDb(opts = {}) {
  const calls = [];
  global.fetch = async (url, init = {}) => {
    const path = String(url).replace('http://db.test/rest/v1', '');
    calls.push({ path, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null });
    const reply = (status, data) => ({ ok: status < 300, status, text: async () => JSON.stringify(data) });
    if (path.startsWith('/institutions?onboarding_ip')) return reply(200, opts.byIp || []);
    if (path.startsWith('/institutions?contact_email')) return reply(200, opts.byEmail || []);
    if (path === '/institutions' && init.method === 'POST') return reply(201, [{ id: 'inst-1', name: JSON.parse(init.body).name }]);
    if (path === '/prof_invites' && init.method === 'POST') return reply(201, [{ id: 'inv-1' }]);
    return reply(404, null);
  };
  return calls;
}

function run(body) {
  delete require.cache[require.resolve('./institutions')];
  const handler = require('./institutions');
  const out = { status: 200, json: null, headers: {} };
  const res = {
    setHeader() {}, status(c) { out.status = c; return res; }, json(d) { out.json = d; return res; }, end() { return res; },
  };
  const req = { method: 'POST', headers: { 'x-real-ip': '1.2.3.4' }, body: { action: 'self-onboard', ...body }, url: '/api/institutions', query: {} };
  return handler(req, res).then(() => out);
}

const OK = { name: 'École Saint-Joseph', email: 'dir@ecole.be', seatCount: 120, level: 'secondaire', country: 'BE', consent: true };

test('crée établissement (essai 30 jours) et invitation admin', async () => {
  const calls = fakeDb();
  const r = await run(OK);
  assert.equal(r.status, 201);
  assert.equal(r.json.ok, true);
  assert.match(r.json.inviteToken, /^[A-Z2-9]{12}$/);
  const inst = calls.find((c) => c.path === '/institutions' && c.method === 'POST').body;
  assert.equal(inst.seat_count, 120);
  assert.equal(inst.self_onboarded, true);
  assert.equal(inst.contact_email, 'dir@ecole.be');
  assert.equal(inst.onboarding_ip, '1.2.3.4');
  const days = Math.round((new Date(inst.license_expires_at) - Date.now()) / 86400000);
  assert.equal(days, 30);
  const inv = calls.find((c) => c.path === '/prof_invites').body;
  assert.equal(inv.role, 'admin');
  assert.equal(inv.institution_id, 'inst-1');
});

test('refuse sans consentement et ne touche pas la base', async () => {
  const calls = fakeDb();
  const r = await run({ ...OK, consent: false });
  assert.equal(r.status, 400);
  assert.equal(calls.length, 0);
});

test('champ piège : réponse neutre, aucune création', async () => {
  const calls = fakeDb();
  const r = await run({ ...OK, website: 'http://spam' });
  assert.equal(r.json.ok, true);
  assert.equal(r.json.inviteToken, undefined);
  assert.equal(calls.length, 0);
});

test('limite par IP (3 par heure) et par adresse (1 par jour)', async () => {
  fakeDb({ byIp: [{}, {}, {}] });
  assert.equal((await run(OK)).status, 429);
  fakeDb({ byEmail: [{}] });
  assert.equal((await run(OK)).status, 409);
});
