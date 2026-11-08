const test = require('node:test');
const assert = require('node:assert');
const I = require('../i18n.js');
const { i1 } = require('../scripts/i18n-gates.js');

test('le français est la langue par défaut', () => { I.setLang(null); assert.equal(I.lang(), 'fr'); assert.equal(I.t('test.restart'), 'Recommencer'); });
test('anglais : texte, paramètres et pluriel', () => {
  I.setLang('en');
  assert.equal(I.t('test.restart'), 'Restart');
  assert.equal(I.t('test.hint_done', { wpm: 42, acc: 97 }), 'Finished: 42 words/min at 97%');
  assert.equal(I.tn('test.faults', 1), '1 mistake'); assert.equal(I.tn('test.faults', 0), '0 mistakes'); assert.equal(I.tn('test.faults', 3), '3 mistakes');
  I.setLang(null);
  assert.equal(I.tn('test.faults', 1), '1 faute'); assert.equal(I.tn('test.faults', 0), '0 fautes');
});
test('clé absente en anglais : repli sur le français ; clé inconnue : la clé elle-même', () => {
  const saved = I.dict.en['test.restart']; delete I.dict.en['test.restart']; I.setLang('en');
  assert.equal(I.t('test.restart'), 'Recommencer'); assert.equal(I.t('nope.nope'), 'nope.nope');
  I.dict.en['test.restart'] = saved; I.setLang(null);
});
test('un paramètre non fourni reste visible', () => { I.setLang(null); assert.equal(I.t('test.counter', { n: 1 }), '1 / {total} caractères'); });
test('gate I1 : verte aujourd\'hui, rouge si l\'anglais manque, a un tiret long ou une clé de la page n\'existe pas', () => {
  assert.equal(i1().ok, true);
  const mk = (mut) => { const d = { fr: { ...I.dict.fr }, en: { ...I.dict.en } }; mut(d); return d; };
  assert.equal(i1({ i18n: { dict: mk((d) => delete d.en['test.speed']) } }).ok, false);
  assert.equal(i1({ i18n: { dict: mk((d) => { d.en['test.speed'] = 'SPEED — now'; }) } }).ok, false);
  assert.equal(i1({ i18n: { dict: mk((d) => { d.en['test.counter'] = '{n} characters'; }) } }).ok, false);
  assert.equal(i1({ html: kpFake() }).ok, false);
});
function kpFake() { return "kpT('test.speed') kpT('test.inconnue')"; }
