// Duel 1v1 : texte proposé par celui qui crée le duel (niveau d'entraînement), validé côté serveur. Lancer : node --test api/_duel-text.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
const test = require('node:test');
const assert = require('node:assert');
const games = require('./games');
const { sanitizeDuelText, DUEL_TEXTS } = require('./_duel-shared');

let ROOM_BODIES;
global.fetch = async (url, opts = {}) => {
  const u = String(url); const method = opts.method || 'GET'; let data = [];
  if (u.includes('/users?')) data = [{ id: 7, username: 'eleve', display_name: null }];
  else if (u.includes('/duel_rooms') && method === 'POST') { const b = JSON.parse(opts.body); ROOM_BODIES.push(b); data = [{ id: 'room1', room_code: b.room_code, text: b.text }]; }
  return { ok: true, status: 200, text: async () => JSON.stringify(data) };
};
const call = async (body) => {
  const out = {}; const res = { setHeader() {}, status: (c) => { out.status = c; return res; }, json: (o) => { out.body = o; return res; }, end: () => res };
  await games({ method: 'POST', headers: { origin: 'https://keypace.be' }, body }, res); return out;
};

test('sanitizeDuelText : lettres, accents, espaces, apostrophes et traits d\'union seulement, 4 à 400 signes', () => {
  assert.strictEqual(sanitizeDuelText('  fj   dk sl  '), 'fj dk sl');
  assert.strictEqual(sanitizeDuelText("l'été très beau, non"), null, 'virgule refusée');
  assert.strictEqual(sanitizeDuelText("l'été très beau"), "l'été très beau");
  assert.strictEqual(sanitizeDuelText('arc-en-ciel œuvre'), 'arc-en-ciel œuvre');
  for (const bad of [null, undefined, 42, {}, [], '', 'abc', '<b>oups</b> texte', 'a'.repeat(401), 'texte avec 12 chiffres', 'javascript:alert(1)', 'ligne\nnouvelle ligne ok?']) assert.strictEqual(sanitizeDuelText(bad), null, String(bad).slice(0, 30));
  assert.strictEqual(sanitizeDuelText('a'.repeat(400)), 'a'.repeat(400));
  assert.strictEqual(sanitizeDuelText('ligne\nnouvelle ligne'), 'ligne nouvelle ligne', 'les retours à la ligne deviennent des espaces');
});

test('duel-create : le texte du niveau est enregistré dans la salle et renvoyé aux deux joueurs', async () => {
  ROOM_BODIES = [];
  const r = await call({ action: 'duel-create', token: 't', text: 'fj dk sl fjd ksl' });
  assert.strictEqual(r.body.text, 'fj dk sl fjd ksl');
  assert.strictEqual(ROOM_BODIES[0].text, 'fj dk sl fjd ksl');
  assert.strictEqual(r.body.role, 'host');
});

test('duel-create : sans texte, ou avec un texte refusé, la salle reçoit un texte habituel', async () => {
  for (const body of [{}, { text: '<script>alert(1)</script>' }, { text: 'a'.repeat(500) }, { text: 123 }]) {
    ROOM_BODIES = [];
    const r = await call({ action: 'duel-create', token: 't', ...body });
    assert.ok(DUEL_TEXTS.includes(r.body.text), JSON.stringify(body).slice(0, 40));
    assert.ok(DUEL_TEXTS.includes(ROOM_BODIES[0].text));
  }
});

test('duel-create : une session invalide est refusée', async () => {
  global.fetch = async (url, opts = {}) => { const u = String(url); return { ok: true, status: 200, text: async () => JSON.stringify(u.includes('/users?') ? [] : []) }; };
  const r = await call({ action: 'duel-create', token: 'faux', text: 'fj dk sl fjd' });
  assert.strictEqual(r.status, 401);
});
