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

test('gestes de frappe : aucun mot français ne reste après traduction, pour tous les gestes connus (AZERTY de la page et claviers QWERTY du cours)', () => {
  const { loadApp } = require('../scripts/engine-harness');
  const h = loadApp(); const how = JSON.parse(h.run('JSON.stringify(KB_HOW)'));
  const all = []; for (const l of Object.keys(how)) for (const c of Object.keys(how[l])) all.push(how[l][c]);
  const kb = require('../scripts/build-qwerty-keyboards').buildKeyboards('!@#$%^&*()_+-=[]{}|\\;:\'",.<>/?`~ é è ç ù');
  for (const k of Object.values(kb)) for (const c of Object.keys(k.how || {})) all.push(k.how[c]);
  assert.ok(all.length > 100);
  const bad = [...new Set(all)].map((v) => [v, I.howEn(v)]).filter(([, e]) => I.HOW_FR_LEFTOVER.test(e));
  assert.deepEqual(bad, []);
  assert.equal(I.howEn('touche ù (à droite du M)'), 'the ù key (to the right of M)');
  assert.equal(I.howEn('Maj + 1'), 'Shift + 1');
  assert.equal(I.howEn('AltGr + é, puis espace'), 'AltGr + é, then the space bar');
});
