// Dispositions de clavier en données (étape 3 du plan). Lancer : node --test api/_layouts.test.js
// Vérifie que layouts-src/*.json restent identiques aux constantes de index.html (KB_LAYOUTS,
// KB_EXTRA, KB_HOW, étiquettes, notes) tant que le client les contient encore, et que le format
// (scripts/layouts-lib.js) est respecté.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { validateLayout, sameLetters, ROW_CODES } = require('../scripts/layouts-lib');
const { load, build } = require('../scripts/extract-layouts');

const root = path.join(__dirname, '..');
const VARIANTS = ['fr', 'be', 'mac', 'nf'];
const files = Object.fromEntries(VARIANTS.map((v) => [v, JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', `azerty-${v}.json`), 'utf8'))]));
const fromHtml = build(load(path.join(root, 'index.html')));

for (const v of VARIANTS) {
  test(`azerty-${v} : le fichier est identique aux constantes de index.html`, () => {
    assert.deepEqual(files[v], fromHtml[v]);
  });
  test(`azerty-${v} : format valide`, () => {
    assert.deepEqual(validateLayout(files[v]), []);
  });
}

test('chaque touche physique est unique dans une disposition (rangées et bords)', () => {
  for (const v of VARIANTS) {
    const codes = [...files[v].rows.flat(), ...Object.values(files[v].extra).flat()].map((k) => k.c);
    assert.equal(new Set(codes).size, codes.length, v);
    assert.equal(codes.length, ROW_CODES.flat().length + 7, v);
  }
});

test('les 4 variantes AZERTY ont les mêmes lettres aux mêmes touches physiques (même famille)', () => {
  for (const v of VARIANTS) assert.ok(sameLetters(files.fr, files[v]), v);
});

test('un clavier QWERTY ne se regroupe pas avec l\'AZERTY', () => {
  const qwerty = JSON.parse(JSON.stringify(files.fr));
  qwerty.rows[1][0].l = 'Q'; // KeyQ porte Q, pas A
  assert.equal(sameLetters(files.fr, qwerty), false);
});

test('la validation refuse un code en double, un doigt inconnu et une rangée incomplète', () => {
  const d = JSON.parse(JSON.stringify(files.fr));
  d.rows[0][1].c = 'Digit1';
  d.rows[1][0].f = 'xx';
  d.rows[2].pop();
  const errs = validateLayout(d);
  assert.ok(errs.some((e) => e.includes('en double')));
  assert.ok(errs.some((e) => e.includes('doigt inconnu')));
  assert.ok(errs.some((e) => e.includes('rangée 2')));
});

test('le geste « AltGr + 0 » pour @ est bien dans le fichier fr', () => {
  assert.equal(files.fr.how['@'], 'AltGr + 0');
});
