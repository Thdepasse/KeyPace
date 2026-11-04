// Tests du self onboarding établissement (validation, slug, essai de 30 jours).
// Lancer : node --test api/_self-onboard.test.js
const test = require('node:test');
const assert = require('node:assert');
const { normalizeInput, slugify, trialEnd, daysLeft, TRIAL_DAYS, MAX_SEATS } = require('./_self-onboard');

const DAY = 24 * 60 * 60 * 1000;
const OK = { name: 'École Saint-Joseph', email: 'Direction@Ecole.be', seatCount: 120, level: 'secondaire', country: 'BE', consent: true };

test('normalizeInput : cas valide, e-mail en minuscules', () => {
  const r = normalizeInput(OK);
  assert.equal(r.ok, true);
  assert.equal(r.value.email, 'direction@ecole.be');
  assert.equal(r.value.seatCount, 120);
  assert.equal(r.value.country, 'BE');
});

test('normalizeInput : refuse sans consentement', () => {
  assert.equal(normalizeInput({ ...OK, consent: false }).ok, false);
  assert.equal(normalizeInput({ ...OK, consent: 'true' }).ok, false);
});

test('normalizeInput : refuse nom vide, e-mail invalide', () => {
  assert.equal(normalizeInput({ ...OK, name: ' ' }).ok, false);
  assert.equal(normalizeInput({ ...OK, email: 'pas-un-mail' }).ok, false);
});

test("normalizeInput : bornes du nombre d'élèves", () => {
  assert.equal(normalizeInput({ ...OK, seatCount: 0 }).ok, false);
  assert.equal(normalizeInput({ ...OK, seatCount: 12.5 }).ok, false);
  assert.equal(normalizeInput({ ...OK, seatCount: MAX_SEATS + 1 }).ok, false);
  assert.equal(normalizeInput({ ...OK, seatCount: MAX_SEATS }).ok, true);
  assert.equal(normalizeInput({ ...OK, seatCount: '40' }).value.seatCount, 40);
});

test('normalizeInput : niveau et pays inconnus retombent sur les valeurs par défaut', () => {
  const r = normalizeInput({ ...OK, level: 'maternelle', country: 'XX' });
  assert.equal(r.value.level, 'secondaire');
  assert.equal(r.value.country, 'BE');
});

test('slugify : accents, ponctuation, vide', () => {
  assert.equal(slugify('École Saint-Joseph'), 'ecole-saint-joseph');
  assert.equal(slugify("  Athénée royal d'Uccle !! "), 'athenee-royal-d-uccle');
  assert.equal(slugify('???'), 'etablissement');
});

test('trialEnd et daysLeft : 30 jours, jamais négatif', () => {
  const now = 1_700_000_000_000;
  assert.equal(new Date(trialEnd(now)).getTime(), now + TRIAL_DAYS * DAY);
  assert.equal(daysLeft(trialEnd(now), now), 30);
  assert.equal(daysLeft(trialEnd(now), now + 10 * DAY + 1000), 20);
  assert.equal(daysLeft(trialEnd(now), now + 99 * DAY), 0);
  assert.equal(daysLeft(null, now), null);
});
