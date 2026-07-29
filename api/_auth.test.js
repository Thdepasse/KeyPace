// Tests du hachage des mots de passe (scrypt + sel) et de la migration.
// Lancer : node --test api/_auth.test.js
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('./_auth');

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

test('hashPassword produit le format scrypt$sel$hash', () => {
  const h = hashPassword(sha('secret'));
  assert.ok(h.startsWith('scrypt$'));
  assert.equal(h.split('$').length, 3);
});

test('verifyPassword : bon mot de passe accepté, mauvais rejeté', () => {
  const stored = hashPassword(sha('bon-mdp'));
  assert.equal(verifyPassword(sha('bon-mdp'), stored).ok, true);
  assert.equal(verifyPassword(sha('mauvais'), stored).ok, false);
});

test('deux hash du même mot de passe diffèrent (sel aléatoire)', () => {
  const a = hashPassword(sha('x'));
  const b = hashPassword(sha('x'));
  assert.notEqual(a, b);
  assert.equal(verifyPassword(sha('x'), a).ok, true);
  assert.equal(verifyPassword(sha('x'), b).ok, true);
});

test('migration : ancien SHA-256 brut accepté puis upgradé en scrypt', () => {
  const legacy = sha('ancien');
  const r = verifyPassword(sha('ancien'), legacy);
  assert.equal(r.ok, true);
  assert.ok(r.upgrade && r.upgrade.startsWith('scrypt$'));
  // l'upgrade est re-vérifiable
  assert.equal(verifyPassword(sha('ancien'), r.upgrade).ok, true);
});

test('migration : mauvais mot de passe sur ancien hash => pas d’upgrade', () => {
  const legacy = sha('ancien');
  const r = verifyPassword(sha('faux'), legacy);
  assert.equal(r.ok, false);
  assert.equal(r.upgrade, null);
});

test('entrées vides ou nulles ne cassent pas', () => {
  assert.equal(verifyPassword('x', null).ok, false);
  assert.equal(verifyPassword(null, hashPassword('x')).ok, false);
  assert.equal(verifyPassword('x', 'scrypt$deadbeef').ok, false); // format tronqué
});
