// Pages françaises (/fr) : balises pour Google, réciprocité hreflang avec la Belgique, texte d'accueil propre à la France, sitemap.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { render, ROUTES } = require('./_page-render');
const P = require('../programme-data.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const hreflangs = (out) => Object.fromEntries([...out.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]*)">/g)].map((m) => [m[1], m[2]]));
const BASE = 'https://keypace.be';

test('/fr : titre, adresse canonique, indexation et texte français visible', () => {
  const out = render(html, 'fr-home');
  assert.match(out, /<title>KeyPace France : apprendre à taper/);
  assert.ok(out.includes(`<link rel="canonical" href="${BASE}/fr">`));
  assert.ok(out.includes('content="index, follow'));
  assert.match(out, /<div class="seo-sec" data-route="fr-home">/);
  assert.match(out, /<div class="seo-sec" data-route="fr-lessons" hidden>/);
});

test('/fr/cours-dactylo-en-ligne : texte du programme visible, autre section cachée', () => {
  const out = render(html, 'fr-lessons');
  assert.ok(out.includes(`<link rel="canonical" href="${BASE}/fr/cours-dactylo-en-ligne">`));
  assert.match(out, /<div class="seo-sec" data-route="fr-lessons">/);
  assert.match(out, /<div class="seo-sec" data-route="fr-home" hidden>/);
});

test('hreflang : la France et la Belgique se déclarent mutuellement (accueil et cours)', () => {
  const fr = hreflangs(render(html, 'fr-home'));
  assert.deepStrictEqual(fr, { 'fr-FR': BASE + '/fr', 'fr-BE': BASE + '/', 'x-default': BASE + '/' });
  // la page d'accueil belge est le fichier statique index.html : elle doit renvoyer vers /fr
  const be = hreflangs(html);
  assert.strictEqual(be['fr-FR'], BASE + '/fr');
  assert.strictEqual(be['fr-BE'], BASE + '/');
  const frL = hreflangs(render(html, 'fr-lessons')), beL = hreflangs(render(html, 'lessons'));
  assert.strictEqual(frL['fr-BE'], BASE + ROUTES.lessons.path); assert.strictEqual(frL['fr-FR'], BASE + ROUTES['fr-lessons'].path);
  assert.strictEqual(beL['fr-FR'], BASE + ROUTES['fr-lessons'].path); assert.strictEqual(beL['fr-BE'], BASE + ROUTES.lessons.path);
});

test('Les pages belges sans équivalent français gardent leur hreflang d\'origine (leur propre adresse)', () => {
  for (const key of ['test', 'games', 'testtime']) {
    const h = hreflangs(render(html, key));
    for (const v of Object.values(h)) assert.strictEqual(v, BASE + ROUTES[key].path, key);
  }
});

test('Titres et descriptions de la France distincts de ceux de la Belgique (pas de doublon pour Google)', () => {
  const all = Object.entries(ROUTES);
  const titles = all.map(([, r]) => r.title), descs = all.map(([, r]) => r.description);
  assert.strictEqual(new Set(titles).size, titles.length, 'titres en double');
  assert.strictEqual(new Set(descs).size, descs.length, 'descriptions en double');
  for (const k of ['fr-home', 'fr-lessons']) { assert.ok(ROUTES[k].title.length <= 75, k + ' : titre trop long'); assert.ok(ROUTES[k].description.length <= 200, k + ' : description trop longue'); assert.ok(!/—/.test(JSON.stringify(ROUTES[k])), k + ' : tiret cadratin'); }
});

test('Le tableau « classe par classe » de /fr/cours-dactylo-en-ligne reprend exactement les jalons et les leçons des données', () => {
  const sec = html.slice(html.indexOf('data-route="fr-lessons"'));
  const table = sec.slice(0, sec.indexOf('</table>'));
  for (const y of P.FR.years) {
    assert.ok(table.includes(`<td>${y.l}</td><td>${P.FR.commun[y.l].jalon}</td>`), y.l + ' : jalon absent ou différent');
    const r = (P.FR.commun[y.l].lecons || []).map((l) => l.r);
    const txt = r.length ? 'Leçons ' + (r[0][0] === r[r.length - 1][1] ? r[0][0] : r[0][0] + ' à ' + r[r.length - 1][1]) : 'Consolidation : vitesse et fluidité';
    assert.ok(table.includes(`<td>${P.FR.commun[y.l].jalon}</td><td>${txt}</td>`), y.l + ' : leçons ' + txt);
  }
});

test('Pas de tiret cadratin dans les textes français de l\'accueil', () => {
  const a = html.indexOf('data-route="fr-home"'), b = html.indexOf('<footer>', a);
  assert.ok(!/—/.test(html.slice(a, b)));
});

test('Sitemap : les deux adresses françaises y sont, chacune avec ses alternatives', () => {
  const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const p of ['/fr', '/fr/cours-dactylo-en-ligne']) assert.ok(sm.includes(`<loc>${BASE}${p}</loc>`), p);
  assert.ok(sm.includes('xmlns:xhtml='));
  const n = (sm.match(/hreflang="fr-FR" href="https:\/\/keypace\.be\/fr(\/cours-dactylo-en-ligne)?"/g) || []).length;
  assert.strictEqual(n, 4, 'chaque page du couple déclare l\'autre (2 pages belges + 2 pages françaises)');
});

test('vercel.json : les deux adresses françaises sont servies par la page de l\'appli', () => {
  const rw = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).rewrites;
  const get = (s) => (rw.find((r) => r.source === s) || {}).destination;
  assert.strictEqual(get('/fr'), '/api/track?r=fr-home');
  assert.strictEqual(get('/fr/cours-dactylo-en-ligne'), '/api/track?r=fr-lessons');
});

test('Les titres et descriptions que la page remet en place côté navigateur sont ceux du serveur (META_FR = routes)', () => {
  assert.deepStrictEqual(P.META_FR.home, [ROUTES['fr-home'].title, ROUTES['fr-home'].description]);
  assert.deepStrictEqual(P.META_FR.lessons, [ROUTES['fr-lessons'].title, ROUTES['fr-lessons'].description]);
});

// ── Pages d'établissement de la France (générées par scripts/build-france-pages.js) ──
const FR_PAGES = [
  ['ecoles-france.html', '/fr/ecoles'],
  ['dactylographie-college.html', '/fr/dactylographie-college'],
  ['dactylographie-lycee.html', '/fr/dactylographie-lycee'],
];
const visible = (t) => t.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');

test('Pages établissements France : adresse canonique, hreflang fr-FR, rewrite et sitemap', () => {
  const rw = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).rewrites;
  const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const [file, p] of FR_PAGES) {
    const t = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(t.includes(`<link rel="canonical" href="${BASE}${p}">`), file + ' : canonical');
    assert.ok(t.includes(`<link rel="alternate" hreflang="fr-FR" href="${BASE}${p}">`), file + ' : hreflang');
    assert.ok(t.includes('content="index, follow'), file + ' : indexation');
    assert.strictEqual((rw.find((r) => r.source === p) || {}).destination, '/' + file, file + ' : rewrite');
    assert.ok(sm.includes(`<loc>${BASE}${p}</loc>`), file + ' : sitemap');
  }
});

test('Pages établissements France : aucun texte propre à la Belgique ni tiret cadratin, pas de formulaire belge', () => {
  for (const [file] of FR_PAGES) {
    const v = visible(fs.readFileSync(path.join(root, file), 'utf8'));
    assert.ok(!/manolo|FWB|Wallonie|\/api\/institutions|ecoles\/creer|primaire|secondaire/i.test(v.replace(/Programme de français du cycle[^<]*/g, '')), file + ' : texte belge');
    assert.ok(!/—/.test(v), file + ' : tiret cadratin');
  }
});

test('Pages établissements France : les jalons et les leçons des tableaux sont ceux des données', () => {
  const grab = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const expect = { 'ecoles-france.html': ['CE2', 'CM1', 'CM2'], 'dactylographie-college.html': ['6e', '5e', '4e', '3e'], 'dactylographie-lycee.html': ['2de', '1re', 'Terminale', '2de pro', '1re pro', 'Tle pro', 'CAP 1re année', 'CAP 2e année'] };
  for (const [file, years] of Object.entries(expect)) {
    const t = grab(file);
    for (const l of years) {
      const y = P.FR.years.find((x) => x.l === l);
      assert.ok(t.includes(`<td>${l}</td><td>${P.FR.commun[l].jalon}</td><td>`), file + ' : jalon ' + l);
      const r = (P.FR.commun[l].lecons || []).map((z) => z.r);
      const txt = r.length ? 'Leçons ' + (r[0][0] === r[r.length - 1][1] ? r[0][0] : r[0][0] + ' à ' + r[r.length - 1][1]) : 'Consolidation : vitesse et fluidité';
      assert.ok(t.includes(`<td>${P.FR.commun[l].jalon}</td><td>${txt}</td>`), file + ' : leçons ' + l);
      assert.ok(y);
    }
  }
});

test('Pages établissements France : les fichiers correspondent à ce que génère le script', () => {
  const { PAGES, build } = require('../scripts/build-france-pages.js');
  for (const p of PAGES) assert.strictEqual(fs.readFileSync(path.join(root, p.file), 'utf8'), build(p), p.file + ' : relancer node scripts/build-france-pages.js');
});

test('Accueil France : liens vers les trois pages d\'établissement', () => {
  const a = html.indexOf('data-route="fr-home"'), seg = html.slice(a, html.indexOf('<footer>', a));
  for (const p of ['/fr/ecoles', '/fr/dactylographie-college', '/fr/dactylographie-lycee']) assert.ok(seg.includes(`href="${p}"`), p);
});
