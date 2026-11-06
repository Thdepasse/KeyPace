// Tests de parité du programme (Belgique / France). La Belgique ne doit pas changer d'un octet : ses données sont comparées à un instantané pris
// AVANT l'extraction dans programme-data.js. La France est dérivée de la Belgique : mêmes leçons, mêmes modules, année par année.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const P = require('../programme-data.js');
const snap = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'fixtures', 'programme-be.snapshot.json'), 'utf8'));
const { BE, FR } = P;

test('Belgique : les données sont identiques à l\'instantané d\'avant la France', () => {
  const now = { NETS: BE.nets, YEARS: BE.years, PROGRAMME_COMMUN: BE.commun, PROGRAMME_RESEAU: BE.reseau, NET_CHECK: BE.check, PENDING_USER: BE.pendingUser, PENDING_SUP: BE.pendingSup, PROG_ITEMS: BE.items };
  for (const k of Object.keys(now)) assert.deepStrictEqual(JSON.parse(JSON.stringify(now[k])), snap[k], k);
});

const lessonsOf = (c) => JSON.stringify((c.lecons || []).map((l) => ({ r: l.r, tag: l.tag })));

test('France : pour chaque année, les leçons sont celles de l\'année belge équivalente (seule la raison peut différer)', () => {
  for (const y of FR.years) {
    const be = BE.commun[y.be];
    assert.ok(be, `${y.l} : année belge ${y.be} introuvable`);
    assert.strictEqual(lessonsOf(FR.commun[y.l]), lessonsOf(be), y.l);
    assert.strictEqual(!!FR.commun[y.l].kp, !!be.kp, y.l + ' (sélection KeyPace)');
    assert.strictEqual(FR.commun[y.l].note, be.note, y.l + ' (note)');
  }
});

test('France : pour chaque année, les modules sont ceux de l\'année belge équivalente dans le référentiel commun', () => {
  for (const y of FR.years) {
    const expected = [];
    BE.items.forEach((it) => { if (it.sources.some((s) => s.reseaux === 'tous' && s.annees.includes(y.be)) && !expected.includes(it.mod)) expected.push(it.mod); });
    for (const n of FR.nets) assert.deepStrictEqual(P.modulesFor('fr', n.id, y), expected, `${y.l} / ${n.id}`);
  }
});

test('France : un module propre à un réseau belge n\'apparaît jamais', () => {
  // le CECP/WBE/SeGEC n'existent pas en France : même en forçant un identifiant de réseau belge, seules les sources « tous » comptent
  for (const y of FR.years) assert.deepStrictEqual(P.modulesFor('fr', 'fwb', y), P.modulesFor('fr', 'public', y), y.l);
});

test('Les leçons de la 3e primaire à la 2e secondaire couvrent exactement 1 à 66, sans trou ni doublon', () => {
  const seen = [];
  for (const y of BE.years) for (const l of (BE.commun[y.l].lecons || [])) for (let n = l.r[0]; n <= l.r[1]; n++) seen.push(n);
  assert.deepStrictEqual(seen, Array.from({ length: 66 }, (_, i) => i + 1));
});

test('France : toute source française porte une référence de BO (dom) et une citation non vide', () => {
  for (const [id, list] of Object.entries(FR.srcFr)) {
    assert.ok(BE.items.some((it) => it.id === id), 'point de programme inconnu : ' + id);
    for (const s of list) { assert.ok(/BO|Note de service/.test(s.dom), id + ' : référence de BO manquante'); assert.ok(s.cite && s.cite.trim().length > 20, id + ' : citation vide'); assert.ok(s.annees.every((a) => FR.years.some((y) => y.l === a)), id + ' : année inconnue'); }
  }
  for (const [yl, list] of Object.entries(FR.anchors)) {
    assert.ok(FR.years.some((y) => y.l === yl), 'année inconnue : ' + yl);
    for (const a of list) { assert.ok(/BO|Note de service/.test(a.src), yl + ' : référence de BO manquante'); assert.ok(a.q.length > 20, yl + ' : citation vide'); }
  }
});

test('Années antérieures : la Belgique garde le découpage d\'origine, la France se range sur l\'année belge', () => {
  BE.years.forEach((y, i) => assert.deepStrictEqual(P.priorYears('be', y).map((x) => x.l), BE.years.slice(0, i).map((x) => x.l), y.l));
  const get = (l) => FR.years.find((y) => y.l === l);
  assert.deepStrictEqual(P.priorYears('fr', get('CE2')), []);
  assert.deepStrictEqual(P.priorYears('fr', get('2de pro')).map((x) => x.l), ['CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e']);
  // une filière parallèle ne compte pas comme « avant » une autre filière de la même année belge
  assert.ok(!P.priorYears('fr', get('2de')).some((y) => y.l === '2de pro' || y.l === 'CAP 1re année'));
  assert.ok(P.priorYears('fr', get('1re')).some((y) => y.l === '2de pro'));
});

test('France : chaque année a un jalon, un calendrier et une classe distincte ; les voies sont celles du document', () => {
  assert.strictEqual(FR.years.length, 15);
  assert.strictEqual(new Set(FR.years.map((y) => y.l)).size, 15);
  assert.deepStrictEqual(FR.nets.map((n) => n.id), ['public', 'prive', 'agri', 'etranger']);
  for (const y of FR.years) { assert.ok(FR.commun[y.l].jalon, y.l + ' : jalon'); assert.ok(FR.commun[y.l].cal, y.l + ' : calendrier'); assert.ok(y.disp, y.l + ' : affichage'); }
});

test('Le pays par défaut est la Belgique ; la langue du navigateur ne le change pas', () => {
  assert.strictEqual(P.getCountry(), 'be');
  assert.strictEqual(P.setCountry('xx'), false);
});

test('Pas de tiret cadratin dans les textes de la France (règle des textes du site)', () => {
  assert.ok(!/—/.test(JSON.stringify({ n: FR.nets, y: FR.years, c: FR.commun, k: FR.check, a: FR.anchors, s: FR.srcFr, p: FR.pendingUser })));
  // y compris les textes écrits dans les fonctions (étiquette « Choix KeyPace »…) : toute la partie France du fichier
  const src = fs.readFileSync(path.join(__dirname, '..', 'programme-data.js'), 'utf8');
  assert.ok(!/—/.test(src.slice(src.indexOf('FRANCE : dérivée de la Belgique'))));
});
