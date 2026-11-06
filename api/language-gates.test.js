// Gate Q10 (cours de langue) : tests sur de petits cours fabriqués dans un dossier temporaire. Lancer : node --test api/language-gates.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { q10 } = require('../scripts/language-gates');

const TUTO = { intro: 'Introduction.', rules: [{ icon: 'a', t: 'Un', d: 'Texte un.' }, { icon: 'b', t: 'Deux', d: 'Texte deux.' }, { icon: 'c', t: 'Trois', d: 'Texte trois.' }], tip: 'Objectif : bien taper.' };
const L = (id, keys, teaches, text, extra) => ({ id, title: 'Titre ' + id, keys, teaches, tip: 'Conseil.', tuto: TUTO, text, ...(extra || {}) });
const WORDS = ['ad', 'as', 'sad', 'dad', 'fad', 'fads', 'dads', 'add', 'adds', 'ask', 'asks', 'lad', 'lads', 'lass', 'all', 'fall', 'falls', 'salad', 'flask'];
const L1 = L('r1', 'f j', 'fj', 'fj jf fj jf fjfj jfjf ffjj jjff fjf jfj ffj jjf fjfj jfjf');
const L2 = L('r2', 'a s d', 'asd', 'as ad sad dad fad add sas das fas ads adds dads fads ass daa sda fas asd');
const GOOD3 = 'sad dad ask lad fall add salad lass lads all as ad dads falls asks adds flask'; // 15+ mots
const L3 = L('r3', 'k l', 'l', GOOD3);

function mk({ en, fr, lexicon, extra, extraCheck, family }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kp-lang-'));
  const fam = family || 'qwerty';
  fs.mkdirSync(path.join(dir, 'fr-qwerty')); fs.mkdirSync(path.join(dir, 'en-' + fam));
  fs.writeFileSync(path.join(dir, 'fr-qwerty', '01-x.json'), JSON.stringify({ position: 1, name: '1. Position', row: 'repos', lessons: fr || [L1, L2, L3] }));
  fs.writeFileSync(path.join(dir, 'en-' + fam, '01-position.json'), JSON.stringify({ position: 1, name: '1. Position de base', row: 'repos', lessons: en || [L1, L2, L3] }));
  fs.writeFileSync(path.join(dir, 'en-words.json'), JSON.stringify({ words: lexicon || WORDS }));
  if (extra) fs.writeFileSync(path.join(dir, 'en-lexicon-extra-a.json'), JSON.stringify({ words: extra }));
  if (extraCheck) fs.writeFileSync(path.join(dir, 'en-lexicon-extra-a-check.json'), JSON.stringify({ results: extraCheck }));
  return dir;
}
const run = (o) => q10({ srcDir: mk(o) });
const has = (r, re) => !r.ok && re.test(r.detail);

test('aucun dossier de cours de langue : rien à vérifier', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kp-lang-'));
  assert.ok(q10({ srcDir: dir }).ok);
  assert.ok(q10({ srcDir: path.join(dir, 'absent') }).ok);
});

test('un cours conforme est accepté', () => {
  const r = run({});
  assert.ok(r.ok, r.detail);
  assert.match(r.detail, /en-qwerty : 3 leçons/);
});

test('touches différentes du cours français : refusé', () => {
  const r = run({ en: [L1, L('r2', 'a s', 'as', L2.text), L3] });
  assert.ok(has(r, /r2 : touches « a s » différentes du cours français/), r.detail);
});

test('teaches différent du cours français : refusé', () => {
  const r = run({ en: [L1, L('r2', 'a s d', 'ads', L2.text), L3] });
  assert.ok(has(r, /teaches « ads » différent/), r.detail);
});

test('lettre tapée avant d\'être apprise : refusé', () => {
  const r = run({ en: [L('r1', 'f j', 'fj', 'fj jf fj jf fjfj jfjf ffjj jjff fjf jfj ffj jjf fjfj jfjf ak'), L2, L3], fr: [L('r1', 'f j', 'fj', 'x'), L2, L3] });
  assert.ok(has(r, /« k » tapée avant d'être apprise/), r.detail);
});

test('mot inconnu du lexique (plus de 4 lettres) : refusé', () => {
  const r = run({ en: [L1, L2, L('r3', 'k l', 'l', GOOD3 + ' salads')] });
  assert.ok(has(r, /« salads » n'est pas dans le lexique/), r.detail);
});

test('suites de lettres : admises quand peu de mots existent, refusées quand de vrais mots sont possibles', () => {
  // leçon 2 : 5 lettres apprises (f j a s d), moins de 15 mots possibles : des suites sont admises
  assert.ok(run({ en: [L1, L('r2', 'a s d', 'asd', 'sas das fas dfa afs sda fda asd sfd dsa fas das afd sad dad ad as'), L3], fr: [L1, L('r2', 'a s d', 'asd', 'x'), L3] }).ok);
  // leçon 3 : 15 mots ou plus possibles : plus d'un quart de suites refusé
  const r = run({ en: [L1, L2, L('r3', 'k l', 'l', 'kl lk kls lkd lak all ask lad dak lak ksl kla sad dad lads asks fall')] });
  assert.ok(has(r, /suites de lettres sur .* alors que \d+ mots sont possibles/), r.detail);
});

test('touche enseignée trop peu travaillée : refusé', () => {
  const r = run({ en: [L1, L2, L('r3', 'k l', 'l', 'sad dad ask add as ad dads asks adds dad sad ask add')] });
  assert.ok(has(r, /« l » enseignée mais tapée \d fois/), r.detail);
});

test('longueur : trop court, trop long, espaces', () => {
  assert.ok(has(run({ en: [L('r1', 'f j', 'fj', 'fj jf'), L2, L3] }), /texte trop court/));
  assert.ok(has(run({ en: [L1, L2, L('r3', 'k l', 'l', GOOD3 + ' ' + GOOD3)] }), /texte trop long/));
  assert.ok(has(run({ en: [L1, L2, L('r3', 'k l', 'l', GOOD3 + '  ask')] }), /espaces en double/));
});

test('lettre accentuée, orthographe américaine, tiret cadratin, mauvais clavier : refusés', () => {
  assert.ok(has(run({ en: [L1, L2, L('r3', 'k l', 'l', GOOD3 + ' élan')] }), /accentuée/));
  assert.ok(has(run({ en: [L1, L2, L('r3', 'k l', 'l', GOOD3 + ' color')] }), /orthographe américaine/));
  assert.ok(has(run({ en: [L1, L2, { ...L3, tip: 'Un conseil — avec un tiret.' }] }), /tiret cadratin/));
  assert.ok(has(run({ en: [L1, L2, { ...L3, tip: 'Sur ton clavier AZERTY.' }] }), /mauvais clavier/));
});

test('forme : tutoriel incomplet, module mal numéroté, id en double', () => {
  assert.ok(has(run({ en: [L1, L2, { ...L3, tuto: { ...TUTO, rules: TUTO.rules.slice(0, 2) } }] }), /tutoriel incomplet/));
  assert.ok(has(run({ en: [L1, L2, { ...L3, id: 'r2' }] }), /identifiant en double/));
  const dir = mk({}); fs.writeFileSync(path.join(dir, 'en-qwerty', '01-position.json'), JSON.stringify({ position: 1, name: 'Position', lessons: [L1, L2, L3] }));
  assert.ok(has(q10({ srcDir: dir }), /doit commencer par/));
});

test('lexique complémentaire : un mot non vérifié ou non confirmé est refusé, un mot vérifié est accepté', () => {
  const en = [L1, L2, L('r3', 'k l', 'l', GOOD3 + ' salads')];
  assert.ok(has(run({ en, extra: ['salads'] }), /n'a pas été vérifié/));
  assert.ok(has(run({ en, extra: ['salads'], extraCheck: [{ w: 'salads', dict: 'non', wik: 'non', freq: 0.1 }] }), /n'est confirmé par aucun dictionnaire/));
  assert.ok(run({ en, extra: ['salads'], extraCheck: [{ w: 'salads', dict: 'oui', wik: 'erreur 429', freq: 0.1 }] }).ok);
  assert.ok(has(run({ en, extra: ['Color'], extraCheck: [{ w: 'Color', dict: 'oui', wik: 'oui', freq: 9 }] }), /pas un mot en minuscules/));
  assert.ok(has(run({ en, extra: ['color'], extraCheck: [{ w: 'color', dict: 'oui', wik: 'oui', freq: 9 }] }), /orthographe américaine/));
});

test('cours AZERTY : refuse une mention de QWERTY', () => {
  const dir = mk({ family: 'azerty', en: [L1, L2, { ...L3, tip: 'Sur ton clavier QWERTY.' }] });
  // la référence AZERTY est celle de la page : les ids r1.. y existent avec leurs touches ; le test vérifie surtout le mauvais clavier
  const r = q10({ srcDir: dir });
  assert.ok(has(r, /mauvais clavier/), r.detail);
});

test('majuscules : refusées avant le module des majuscules, admises après', () => {
  assert.ok(has(run({ en: [L1, L2, L('r3', 'k l', 'l', 'Sad dad ask lad fall add salad lass lads all as ad dads falls asks adds flask')] }), /majuscule « S » avant le module des majuscules/));
  const dir = mk({});
  const L4 = L('maj1', 'Maj', '', 'Sad Dad ask Lad fall Add salad Lass lads All as ad dads falls asks adds flask');
  fs.writeFileSync(path.join(dir, 'fr-qwerty', '02-m.json'), JSON.stringify({ position: 2, name: '2. Majuscules', kind: 'majuscules', lessons: [L4] }));
  fs.writeFileSync(path.join(dir, 'en-qwerty', '02-m.json'), JSON.stringify({ position: 2, name: '2. Majuscules', kind: 'majuscules', lessons: [L4] }));
  const r = q10({ srcDir: dir }); assert.ok(r.ok, r.detail);
});
