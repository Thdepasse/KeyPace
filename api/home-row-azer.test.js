// Méthode AZER-UIOP (home-row-azer.js) : progression cohérente, textes faisables avec les seules lettres déjà enseignées,
// chaque doigt garde sa colonne, leçons AZER avec leurs propres identifiants (progression distincte), consignes de la suite adaptées.
const test = require('node:test');
const assert = require('node:assert');
const H = require('../home-row-azer.js');

const ORDER = ['ar1', 'ar2', 'ar3', 'ar4', 'ar5', 'ar6', 'am1', 'am2', 'am3', 'am4', 'am5', 'am6'];

test('réglage : valeurs admises, défaut QSDF', () => {
  assert.strictEqual(H.normalizeHomeRow('azer'), 'azer');
  for (const v of [undefined, null, '', 'AZER', 'asdf']) assert.strictEqual(H.normalizeHomeRow(v), 'qsdf');
  assert.deepEqual(H.REST.qsdf.letters, 'QSDFGHJKLM');
  assert.deepEqual(H.REST.azer.letters, 'AZERTYUIOP');
});

test('progression : modules 1 et 2, rangée du haut puis du milieu, chaque lettre une seule fois', () => {
  assert.deepEqual(Object.keys(H.LESSONS), ORDER);
  assert.deepEqual(H.ORDER, ORDER);
  assert.deepEqual(Object.values(H.REPLACES), ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  const keys = ORDER.filter((id) => !/6$/.test(id)).flatMap((id) => H.LESSONS[id].keys.split(' '));
  assert.deepEqual([...keys].sort().join(''), 'adefghijklmopqrstuyz');
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(ORDER.slice(0, 5).flatMap((id) => H.LESSONS[id].keys.split(' ')).sort().join(''), 'aeioprtuyz', 'module 1 = rangée du haut');
});

test('chaque doigt garde sa colonne : la touche du milieu est sous la touche de repos du même doigt', () => {
  const top = 'azertyuiop', mid = 'qsdfghjklm';
  const pairs = [['ar1', 'am1'], ['ar2', 'am2'], ['ar3', 'am3'], ['ar4', 'am4'], ['ar5', 'am5']];
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

test('applyAzer : nouvelles leçons ar*/am* (progression distincte), objets d\'origine intacts, leçons gratuites, consignes de la suite', () => {
  const mkL = (id, module, extra) => Object.assign({ id, module, title: id, keys: 'x', tip: '', tuto: {}, text: 'xx' }, extra || {});
  const m1 = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((id) => mkL(id, 'M1')), m2 = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((id) => mkL(id, 'M2'));
  const b2 = mkL('b2', 'M3', { tip: 'sans perdre la position de référence sur F et J.', tuto: { rules: [{ d: 'sans perdre F et J de référence.' }] } });
  const num1 = mkL('num1', 'M10', { tuto: { intro: 'ancien' } }), pon1 = mkL('pon1', 'M6', { tip: 'sur F et J' });
  const lessons = [...m1, ...m2, b2, num1, pon1];
  const modules = [{ name: 'M1', lessons: m1 }, { name: 'M2', lessons: m2 }, { name: 'M3', lessons: [b2] }];
  const free = ['r1', 'r2'];
  const origR1 = JSON.stringify(m1[0]);
  H.applyAzer(lessons, modules, free);
  assert.deepEqual(lessons.map((l) => l.id), [...ORDER, 'b2', 'num1', 'pon1']);
  assert.equal(JSON.stringify(m1[0]), origR1, 'la leçon QSDF d\'origine n\'est pas modifiée');
  assert.deepEqual(modules.map((m) => m.name), [H.MODULE_NAMES[0], H.MODULE_NAMES[1], 'M3']);
  assert.deepEqual(modules[0].lessons.map((l) => l.id), ORDER.slice(0, 6));
  assert.equal(lessons[0].keys, 'r u'); assert.equal(lessons[0].moduleIdx, 0); assert.equal(lessons[6].module, H.MODULE_NAMES[1]);
  assert.deepEqual(free, ORDER.slice(0, 10), 'les 10 premières leçons restent gratuites');
  assert.match(b2.tip, /sur R et U/); assert.match(b2.tuto.rules[0].d, /R et U de référence/);
  assert.equal(num1.tuto, H.TUTOS.num1);
  assert.equal(pon1.tip, 'sur F et J', 'une leçon sans adaptation ne change pas');
});

test('chiffres en AZER-UIOP : tutoriels complets, plus de repère F/J', () => {
  for (const id of ['num1', 'num2', 'num3', 'num4', 'num5', 'num6']) {
    const t = H.TUTOS[id];
    assert.ok(t && t.intro && t.tip && t.rules.length >= 3, id);
    assert.doesNotMatch(JSON.stringify(t), /F (et|ou) J|rangée du milieu après/, id);
  }
});

test('liste des leçons pour une classe : AZER remplace les modules 1 et 2', () => {
  const base = [{ id: 'r1', title: 'F et J' }, { id: 'h6', title: 'Révision haut' }, { id: 'b1', title: 'C et virgule' }];
  assert.equal(H.lessonListFor('qsdf', base), base);
  assert.deepEqual(H.lessonListFor('azer', base).map((l) => l.id), [...ORDER, 'b1']);
});
