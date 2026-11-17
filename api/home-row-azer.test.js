// Méthode AZER-UIOP (home-row-azer.js) : progression cohérente, textes faisables avec les seules lettres déjà enseignées,
// chaque doigt garde sa colonne, surcouche appliquée sans toucher aux identifiants.
const test = require('node:test');
const assert = require('node:assert');
const H = require('../home-row-azer.js');

const ORDER = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

test('réglage : valeurs admises, défaut QSDF', () => {
  assert.strictEqual(H.normalizeHomeRow('azer'), 'azer');
  for (const v of [undefined, null, '', 'AZER', 'asdf']) assert.strictEqual(H.normalizeHomeRow(v), 'qsdf');
  assert.deepEqual(H.REST.qsdf.letters, 'QSDFGHJKLM');
  assert.deepEqual(H.REST.azer.letters, 'AZERTYUIOP');
});

test('progression : modules 1 et 2, rangée du haut puis du milieu, chaque lettre une seule fois', () => {
  assert.deepEqual(Object.keys(H.LESSONS), ORDER);
  const keys = ORDER.filter((id) => !/6$/.test(id)).flatMap((id) => H.LESSONS[id].keys.split(' '));
  assert.deepEqual([...keys].sort().join(''), 'adefghijklmopqrstuyz');
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(ORDER.slice(0, 5).flatMap((id) => H.LESSONS[id].keys.split(' ')).sort().join(''), 'aeioprtuyz', 'module 1 = rangée du haut');
});

test('chaque doigt garde sa colonne : la touche du milieu est sous la touche de repos du même doigt', () => {
  const top = 'azertyuiop', mid = 'qsdfghjklm';
  const pairs = [['r1', 'h1'], ['r2', 'h2'], ['r3', 'h3'], ['r4', 'h4'], ['r5', 'h5']];
  for (const [r, h] of pairs) {
    const rk = H.LESSONS[r].keys.split(' '), hk = H.LESSONS[h].keys.split(' ');
    rk.forEach((k, i) => assert.equal(mid[top.indexOf(k)], hk[i], `${h} : ${hk[i]} devrait être sous ${k}`));
  }
});

test('textes : seulement des lettres déjà enseignées, chaque nouvelle touche employée, tutoriels complets', () => {
  const known = new Set();
  for (const id of ORDER) {
    const l = H.LESSONS[id]; const keys = l.keys.split(' ');
    keys.forEach((k) => known.add(k));
    const bad = [...new Set([...l.text].filter((c) => /[a-zà-ÿ]/i.test(c) && !known.has(c)))];
    assert.deepEqual(bad, [], `${id} : lettres pas encore enseignées`);
    assert.deepEqual(keys.filter((k) => !l.text.includes(k)), [], `${id} : nouvelle touche absente`);
    assert.ok(l.text.length >= 60, `${id} : texte trop court`);
    assert.ok(l.title && l.tip && l.tuto && l.tuto.intro && l.tuto.tip && l.tuto.rules.length >= 3, `${id} : consignes incomplètes`);
  }
});

test('applyAzer : remplace modules 1-2, adapte les consignes de la suite, garde les identifiants', () => {
  const lessons = [{ id: 'r1', module: 'M1', title: 'F et J', keys: 'f j', tip: 't', tuto: {}, text: 'fj' },
    { id: 'h1', module: 'M2', title: 'R et U', keys: 'r u', tip: 't', tuto: {}, text: 'ru' },
    { id: 'b2', module: 'M3', title: 'V et N', keys: 'v n', tip: 'sans perdre la position de référence sur F et J.', tuto: { rules: [{ d: "sans perdre F et J de référence." }] }, text: 'vn' },
    { id: 'pon1', module: 'M6', title: 'x', keys: '.', tip: 'sur F et J', tuto: null, text: 'a.' }];
  const modules = [{ name: 'M1' }, { name: 'M2' }, { name: 'M3' }];
  H.applyAzer(lessons, modules);
  assert.deepEqual(lessons.map((l) => l.id), ['r1', 'h1', 'b2', 'pon1']);
  assert.equal(lessons[0].keys, 'r u'); assert.equal(lessons[0].module, H.MODULE_NAMES[0]);
  assert.equal(lessons[1].keys, 'f j'); assert.equal(lessons[1].module, H.MODULE_NAMES[1]);
  assert.equal(modules[2].name, 'M3'); assert.equal(lessons[2].module, 'M3');
  assert.match(lessons[2].tip, /sur R et U/); assert.match(lessons[2].tuto.rules[0].d, /R et U de référence/);
  assert.equal(lessons[3].tip, 'sur F et J', 'une leçon sans patch ne change pas');
});
