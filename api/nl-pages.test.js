// Pages /nl (interface en néerlandais, indexées le 2026-11-12) : acht routes, langue, réécritures, adresses de l'appli, plan du site. Lancer : node --test api/nl-pages.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { render, ROUTES } = require('./_page-render');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const BASE = 'https://keypace.be';
const NL = Object.keys(ROUTES).filter((k) => k.startsWith('nl-'));
const VIEW_OF = { 'nl-home': 'home', 'nl-test': 'test', 'nl-testtime': 'testtime', 'nl-testchoix': 'testchoix', 'nl-lessons': 'lessons', 'nl-games': 'games', 'nl-stats': 'stats', 'nl-classes': 'classes' };

test('huit pages /nl, toutes en néerlandais, titres et descriptions de longueur raisonnable et distincts', () => {
  assert.deepStrictEqual(NL.sort(), Object.keys(VIEW_OF).sort());
  const titles = new Set(); const descs = new Set();
  for (const k of NL) { const r = ROUTES[k]; assert.match(r.path, /^\/nl(\/[a-z-]+)?$/); assert.strictEqual(r.lang, 'nl'); assert.ok(r.title.length <= 75, k + ' : titre trop long'); assert.ok(r.description.length <= 200, k + ' : description trop longue'); assert.ok(!/—/.test(JSON.stringify(r)), k); titles.add(r.title); descs.add(r.description); }
  assert.strictEqual(titles.size, NL.length); assert.strictEqual(descs.size, NL.length);
});
const INDEXED = { 'nl-home': ['/', '/fr', '/en'], 'nl-test': ['/test-frappe-en-ligne', '/test-frappe-en-ligne', '/en/typing-test'], 'nl-testtime': ['/test-dactylographie-chronometre', '/test-dactylographie-chronometre', '/en/timed-typing-test'], 'nl-lessons': ['/cours-dactylo-en-ligne', '/fr/cours-dactylo-en-ligne', '/en/typing-lessons'], 'nl-games': ['/jeux-dactylo-en-ligne', '/jeux-dactylo-en-ligne', '/en/typing-games'] };
test('indexées (2026-11-12) : accueil, tests, cours et jeux ; choix du test, progrès et classe restent noindex comme leurs équivalents', () => {
  for (const k of NL) {
    const out = render(html, k);
    if (INDEXED[k]) { assert.strictEqual(ROUTES[k].index, true, k); assert.match(out, /<meta name="robots" content="index, follow, max-image-preview:large">/, k); }
    else { assert.strictEqual(ROUTES[k].index, false, k); assert.match(out, /<meta name="robots" content="noindex, follow">/, k); }
  }
});
test('hreflang réciproque : chaque page /nl indexée cite le français, l\'anglais et elle-même ; chacune de ces pages la cite en retour', () => {
  const FR_OF = { 'nl-home': 'fr-home', 'nl-test': 'test', 'nl-testtime': 'testtime', 'nl-lessons': 'lessons', 'nl-games': 'games' };
  for (const [k, [be, frfr, en]] of Object.entries(INDEXED)) {
    const nl = ROUTES[k].path; const alt = ROUTES[k].alternates;
    assert.deepStrictEqual([alt['nl-BE'], alt['fr-BE'], alt['fr-FR'], alt['en-GB'], alt['x-default']], [nl, be, frfr, en, be], k);
    const enr = Object.values(ROUTES).find((r) => r.path === en); assert.strictEqual(enr.alternates['nl-BE'], nl, en);
    const frr = ROUTES[FR_OF[k]]; assert.strictEqual(frr.alternates['nl-BE'], nl, FR_OF[k]);
  }
});
test('balises d\'une page /nl : langue, adresse canonique, hreflang avec elle-même, le français et l\'anglais, texte de référencement visible', () => {
  const out = render(html, 'nl-lessons');
  assert.match(out, /<html lang="nl"/);
  assert.ok(out.includes(`<link rel="canonical" href="${BASE}/nl/typlessen">`));
  const hl = [...out.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]*)">/g)].map((m) => m[1] + '=' + m[2]);
  assert.deepStrictEqual(hl, [`en-GB=${BASE}/en/typing-lessons`, `nl-BE=${BASE}/nl/typlessen`, `fr-BE=${BASE}/cours-dactylo-en-ligne`, `fr-FR=${BASE}/fr/cours-dactylo-en-ligne`, `x-default=${BASE}/cours-dactylo-en-ligne`]);
  assert.match(out, /<div class="seo-sec" data-route="nl-lessons">/);
  assert.match(out, /<div class="seo-sec" data-route="nl-games" hidden>/);
});
test('chaque adresse /nl a sa règle de réécriture vers api/track', () => {
  const rw = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).rewrites.map((r) => [r.source, r.destination]));
  for (const k of NL) assert.strictEqual(rw[ROUTES[k].path], '/api/track?r=' + k, k);
});
test('les adresses /nl de la page (NL_VIEW_PATHS) sont celles des routes', () => {
  const m = /const NL_VIEW_PATHS=\{([^}]*)\}/.exec(html);
  assert.ok(m);
  const tbl = Object.fromEntries([...m[1].matchAll(/(\w+):'([^']+)'/g)].map((x) => [x[1], x[2]]));
  for (const k of NL) assert.strictEqual(tbl[VIEW_OF[k]], ROUTES[k].path, k);
});
test('plan du site : les pages /nl indexées y sont avec leurs hreflang, les autres non', () => {
  const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const k of NL) {
    assert.strictEqual(sm.includes(`<loc>${BASE}${ROUTES[k].path}</loc>`), !!INDEXED[k], k);
    if (INDEXED[k]) for (const l of ['en-GB', 'nl-BE', 'fr-BE', 'fr-FR', 'x-default']) assert.ok(new RegExp(`<loc>${BASE}${ROUTES[k].path}</loc>[\\s\\S]*?hreflang="${l}"`).test(sm), k + ' ' + l);
  }
  for (const [k, [be]] of Object.entries(INDEXED)) { const blk = new RegExp(`<loc>${BASE}${be}</loc>[\\s\\S]*?</url>`).exec(sm)[0]; assert.ok(blk.includes(`hreflang="nl-BE" href="${BASE}${ROUTES[k].path}"`), be + ' ne cite pas ' + ROUTES[k].path); }
});
test('les pages /nl ont leur texte de référencement néerlandais (accueil, test, cours, jeux)', () => {
  for (const k of ['nl-home', 'nl-test', 'nl-lessons', 'nl-games']) assert.ok(html.includes(`<div class="seo-sec" data-route="${k}" hidden>`), k);
});
