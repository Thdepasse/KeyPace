// Niveaux des jeux : paliers lus dans le programme (AZERTY et QWERTY), « Mon niveau », suites de lettres, filtre du vocabulaire.
const test = require('node:test');
const assert = require('node:assert');
const G = require('../game-levels.js');
const { loadApp } = require('../scripts/engine-harness.js');

// AZERTY : les leçons réelles de la page ; QWERTY : le cours écrit à la main (courses-src), avec le nom de module comme la page le fait.
const app = loadApp();
const AZ = JSON.parse(app.run('JSON.stringify(ALL_LESSONS.map(l=>({id:l.id,keys:l.keys||"",module:l.module})))'));
const VOCAB = JSON.parse(app.run('JSON.stringify([...new Set([...WORDS,...SPRINT_WORDS,...GAME_TIERS.flatMap(t=>t.words),...TIREUR_ACCENTS])])'));
const qc = require('../courses-src/fr-qwerty.json');
const QW = qc.curriculum.modules.flatMap((m) => m.lessons.map((l) => ({ id: l.id, keys: l.keys || '', module: m.name })));
let _seed = 11; const lcg = () => { _seed = (_seed * 16807) % 2147483647; return _seed / 2147483647; };
const str = (set) => [...set].sort().join('');
const byId = (lv, id) => lv.find((x) => x.id === id);

test('lettersOf : seules les lettres comptent, pas les mots du champ keys', () => {
  assert.deepStrictEqual(G.lettersOf({ keys: 'f j' }), ['f', 'j']);
  assert.deepStrictEqual(G.lettersOf({ keys: 'é è à ù ç' }), ['é', 'è', 'à', 'ù', 'ç']);
  assert.deepStrictEqual(G.lettersOf({ keys: 'toutes lettres' }), []);
  assert.deepStrictEqual(G.lettersOf({ keys: 'fluidité' }), []);
  assert.deepStrictEqual(G.lettersOf({ keys: '^ puis a ou e' }), ['a', 'e']);
  assert.deepStrictEqual(G.lettersOf({ keys: 'œ æ' }), ['œ', 'æ']);
  assert.deepStrictEqual(G.lettersOf({}), []);
});

test('AZERTY : niveaux repos, haut, alphabet, accents, dans cet ordre, avec les bonnes lettres', () => {
  const lv = G.levels(AZ);
  assert.deepStrictEqual(lv.map((x) => x.id), ['repos', 'haut', 'alphabet', 'accents']);
  assert.strictEqual(str(byId(lv, 'repos').letters), 'dfghjklmqs');
  assert.strictEqual(byId(lv, 'haut').letters.size, 20);
  assert.strictEqual(byId(lv, 'alphabet').letters.size, 26);
  assert.ok(byId(lv, 'accents').letters.size > 26 && byId(lv, 'accents').letters.has('é') && byId(lv, 'accents').letters.has('ç'));
  for (let i = 1; i < lv.length; i++) assert.ok(lv[i].lesson > lv[i - 1].lesson && lv[i].letters.size > lv[i - 1].letters.size, lv[i].id);
});

test('QWERTY : la rangée de repos commence par F J, A S D F G H J K L, et l\'ordre des niveaux suit le cours', () => {
  const lv = G.levels(QW);
  assert.deepStrictEqual(lv.map((x) => x.id), ['repos', 'haut', 'alphabet', 'accents']);
  assert.strictEqual(str(byId(lv, 'repos').letters), 'adfghjkls');
  assert.deepStrictEqual([...G.cumulative(QW)[0]], ['f', 'j']);
  assert.deepStrictEqual([...G.cumulative(AZ)[0]], ['f', 'j']);
  assert.strictEqual(byId(lv, 'alphabet').letters.size, 26);
  // en QWERTY les accents sont enseignés AVANT les majuscules : le niveau « accents » est atteint dès la leçon 32
  assert.ok(byId(lv, 'accents').lesson < QW.findIndex((l) => /Majuscules/.test(l.module)) + 1);
});

test('Un cours sans module de rangée n\'invente aucun niveau', () => {
  assert.deepStrictEqual(G.levels([{ id: 'a', keys: 'a b', module: 'Autre' }]), []);
  assert.deepStrictEqual(G.levels([]), []);
});

test('Mon niveau : lettres des leçons terminées d\'affilée, au moins la première leçon', () => {
  const none = G.myLevel(AZ, () => false);
  assert.strictEqual(str(none.letters), 'fj'); assert.strictEqual(none.done, 0);
  const upTo8 = G.myLevel(AZ, (l) => AZ.indexOf(l) < 8);
  assert.strictEqual(upTo8.done, 8); assert.strictEqual(upTo8.letters.size, 14);
  // un trou : seules les leçons d'affilée comptent
  const gap = G.myLevel(AZ, (l) => AZ.indexOf(l) !== 3 && AZ.indexOf(l) < 8);
  assert.strictEqual(gap.done, 3); assert.strictEqual(gap.letters.size, 6);
  assert.strictEqual(G.myLevel(QW, (l) => QW.indexOf(l) < 6).letters.size, 9);
});

test('contentFor : jamais un mot avec une lettre inconnue ; moins de 15 mots = complété par des suites', () => {
  for (const [name, lessons] of [['AZ', AZ], ['QW', QW]]) {
    G.levels(lessons).forEach((lv) => {
      const c = G.contentFor(VOCAB, lv.letters, { rnd: lcg });
      for (const w of c.pool) assert.ok([...w.toLowerCase()].every((ch) => lv.letters.has(ch)), `${name} ${lv.id} : « ${w} » a une lettre inconnue`);
      assert.ok(c.pool.length >= 15, `${name} ${lv.id} : ${c.pool.length} éléments`);
    });
  }
  const repos = G.contentFor(VOCAB, G.levels(AZ)[0].letters);
  assert.strictEqual(repos.words.length, 0); assert.ok(repos.mixed && repos.suites.length === 40);
  const lesson8 = G.contentFor(VOCAB, G.myLevel(AZ, (l) => AZ.indexOf(l) < 8).letters);
  assert.ok(lesson8.words.length >= 15 && !lesson8.mixed, 'élève en leçon 8 : de vrais mots, sans suites (' + lesson8.words.length + ')');
  assert.ok(lesson8.words.length < 40);
});

test('contentFor : aucun mot avec un signe, aucune lettre accentuée avant son enseignement', () => {
  const upTo38 = G.cumulative(AZ)[AZ.findIndex((l) => l.id === 'acc1') - 1];
  const before = G.contentFor(VOCAB, upTo38).pool;
  assert.ok(before.every((w) => /^[a-z]+$/.test(w)), 'accent proposé avant la leçon du é');
  const full = G.contentFor(VOCAB, G.levels(AZ)[3].letters).pool;
  assert.ok(full.some((w) => /é/.test(w)) && full.every((w) => /^[a-zàâçèéêëîïôùûœæ]+$/.test(w)));
});

test('suites : règles de forme, déterministes avec un tirage fixe, vides si moins de 2 lettres', () => {
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const s = G.suites(new Set('fjdk'), 200, rnd);
  assert.strictEqual(s.length, 200);
  for (let i = 0; i < s.length; i++) {
    assert.ok(/^[fjdk]{2,3}$/.test(s[i]), s[i]);
    assert.ok(!/(.)\1\1/.test(s[i]), 'trois fois la même lettre : ' + s[i]);
    if (i) assert.notStrictEqual(s[i], s[i - 1]);
  }
  assert.deepStrictEqual(G.suites(new Set('f'), 5), []);
  assert.ok(G.suites(new Set('dfghjklmqs'), 100).some((x) => x.length === 4));
});

test('suites : un tirage constant ne bloque jamais (garde contre les boucles infinies)', () => {
  const t0 = Date.now();
  const s = G.suites(new Set('fjdk'), 40, () => 0.37);
  assert.ok(Date.now() - t0 < 500);
  assert.ok(s.length >= 1 && s.length <= 40);
});
