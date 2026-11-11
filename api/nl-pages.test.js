// Pages /nl (interface en néerlandais, bêta) : acht routes, non indexées, langue, réécritures, adresses de l'appli, plan du site. Lancer : node --test api/nl-pages.test.js
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
test('non indexées tant que le néerlandais est en bêta (passer index à true le jour de l\'ouverture)', () => {
  for (const k of NL) { assert.strictEqual(ROUTES[k].index, false, k); const out = render(html, k); assert.match(out, /<meta name="robots" content="noindex, follow">/, k); }
});
test('balises d\'une page /nl : langue, adresse canonique, hreflang avec elle-même seulement, texte de référencement visible', () => {
  const out = render(html, 'nl-lessons');
  assert.match(out, /<html lang="nl"/);
  assert.ok(out.includes(`<link rel="canonical" href="${BASE}/nl/typlessen">`));
  const hl = [...out.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]*)">/g)].map((m) => m[1] + '=' + m[2]);
  assert.deepStrictEqual(hl, [`nl-BE=${BASE}/nl/typlessen`]);
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
test('les pages /nl ne sont pas dans le plan du site tant qu\'elles ne sont pas indexées', () => {
  const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.ok(!/<loc>[^<]*\/nl(\/|<)/.test(sm));
});
test('les pages /nl ont leur texte de référencement néerlandais (accueil, test, cours, jeux)', () => {
  for (const k of ['nl-home', 'nl-test', 'nl-lessons', 'nl-games']) assert.ok(html.includes(`<div class="seo-sec" data-route="${k}" hidden>`), k);
});
