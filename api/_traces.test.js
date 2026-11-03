// Gate G6 : rejeu des traces de matériel réel. Ici, des traces SYNTHÉTIQUES (jamais du vrai matériel) servent
// uniquement à prouver que le gate accepte une bonne trace et refuse une mauvaise. Lancer : node --test api/_traces.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateTrace, replayTrace, run } = require('../scripts/traces-gate');
const { loadApp } = require('../scripts/engine-harness');

const kd = (key, extra = {}) => ({ t: 0, type: 'keydown', key, code: '', location: 0, shift: false, ctrl: false, alt: false, meta: false, repeat: false, composing: false, altGraph: false, ...extra });
const meta = { schema: 1, capturedAt: '2026-11-03T00:00:00Z', os: 'Windows', layout: 'SYNTHÉTIQUE', form: 'ISO', userAgent: 'SYNTHETIC TEST FIXTURE (pas du matériel réel)' };
const trace = (steps) => ({ meta, steps });

test('une trace bien formée est valide', () => {
  assert.deepEqual(validateTrace(trace([{ target: 'é', produced: 'é', events: [kd('é')] }])), []);
});

test('une trace mal formée est refusée', () => {
  assert.ok(validateTrace({}).length);
  assert.ok(validateTrace({ meta: { ...meta, schema: 2 }, steps: [] }).some((e) => e.includes('schéma')));
  assert.ok(validateTrace(trace([{ target: 'é', produced: '', events: [] }])).some((e) => e.includes('ni texte produit')));
  assert.ok(validateTrace({ meta: { schema: 1 }, steps: [] }).some((e) => e.includes('meta.os')));
});

test('le moteur accepte les frappes réelles d\'une bonne trace (lettre accentuée, texte avec apostrophe)', () => {
  const t = trace([
    { target: 'é', produced: 'é', events: [kd('é')] },
    { target: "l'été", produced: "l'été", events: [kd('l'), kd("'"), kd('é'), kd('t'), kd('é')] },
    { target: 'â', produced: 'â', events: [kd('Dead', { code: 'BracketLeft' }), kd('â')] },
  ]);
  const r = replayTrace(t, loadApp());
  assert.deepEqual(r.problems, []);
  assert.equal(r.replayed, 3);
});

test('une trace dont les frappes ne donnent pas le caractère attendu est refusée', () => {
  const t = trace([{ target: 'é', produced: 'e', events: [kd('e')] }]);
  const r = replayTrace(t, loadApp());
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /é/);
});

test('une trace sans aucun événement de touche est refusée', () => {
  const r = replayTrace(trace([{ target: 'é', produced: 'é', events: [{ t: 0, type: 'input', data: 'é', value: 'é' }] }]), loadApp());
  assert.match(r.problems[0], /aucun événement de touche/);
});

test('les modificateurs seuls sont ignorés, et « impossible » est listé sans faire échouer', () => {
  const t = trace([
    { target: 'é', produced: 'é', events: [kd('Shift'), kd('AltGraph'), kd('é', { altGraph: true })] },
    { target: 'œ', produced: '', impossible: true, events: [] },
  ]);
  const r = replayTrace(t, loadApp());
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.impossible, ['œ']);
});

test('le gate lit un dossier de traces : vert si tout passe, rouge avec le nom du fichier sinon', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'traces-'));
  fs.writeFileSync(path.join(dir, 'bonne.json'), JSON.stringify(trace([{ target: 'é', produced: 'é', events: [kd('é')] }])));
  assert.equal(run(dir).ok, true);
  fs.writeFileSync(path.join(dir, 'mauvaise.json'), JSON.stringify(trace([{ target: 'é', produced: 'e', events: [kd('e')] }])));
  const r = run(dir);
  assert.equal(r.ok, false);
  assert.match(r.detail, /mauvaise\.json/);
  fs.writeFileSync(path.join(dir, 'cassee.json'), '{pas du json');
  assert.match(run(dir).detail, /JSON invalide/);
});

test('sans aucune trace, le gate le dit clairement', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'traces-vide-'));
  const r = run(dir);
  assert.equal(r.ok, true);
  assert.match(r.detail, /aucune trace/);
});
