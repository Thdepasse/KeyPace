// Pages /en (interface en anglais) : balises, non-indexation tant que le cours d'anglais est en bêta, routes, adresses de l'appli.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { render, ROUTES } = require('./_page-render');
const I = require('../i18n.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const BASE = 'https://keypace.be';
const EN = Object.keys(ROUTES).filter((k) => k.startsWith('en-'));
const VIEW_OF = { 'en-home': 'home', 'en-test': 'test', 'en-testtime': 'testtime', 'en-testchoix': 'testchoix', 'en-lessons': 'lessons', 'en-games': 'games', 'en-stats': 'stats', 'en-classes': 'classes' };

test('huit pages /en, toutes en anglais', () => {
  assert.deepStrictEqual(EN.sort(), Object.keys(VIEW_OF).sort());
  for (const k of EN) { const r = ROUTES[k]; assert.match(r.path, /^\/en(\/[a-z-]+)?$/); assert.strictEqual(r.lang, 'en'); assert.ok(r.title.length <= 75, k + ' : titre trop long'); assert.ok(r.description.length <= 200, k + ' : description trop longue'); assert.ok(!/[—–éèêàùç]/.test(r.title + r.description), k + ' : tiret long ou accent'); }
});
test('non indexées tant que le cours d\'anglais est en bêta (passer index à true le jour de l\'ouverture)', () => {
  for (const k of EN) { assert.strictEqual(ROUTES[k].index, false, k); const out = render(html, k); assert.match(out, /<meta name="robots" content="noindex, follow">/, k); }
});
test('balises d\'une page /en : langue, adresse canonique, hreflang réciproque avec elle-même seulement, texte de référencement visible', () => {
  const out = render(html, 'en-lessons');
  assert.match(out, /<html lang="en"/);
  assert.ok(out.includes(`<link rel="canonical" href="${BASE}/en/typing-lessons">`));
  const hl = [...out.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]*)">/g)].map((m) => m[1] + '=' + m[2]);
  assert.deepStrictEqual(hl, [`en-GB=${BASE}/en/typing-lessons`]);
  assert.match(out, /<div class="seo-sec" data-route="en-lessons">/);
  assert.match(out, /<div class="seo-sec" data-route="en-games" hidden>/);
});
test('chaque adresse /en a sa règle de réécriture vers api/track', () => {
  const rw = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).rewrites.map((r) => [r.source, r.destination]));
  for (const k of EN) assert.strictEqual(rw[ROUTES[k].path], '/api/track?r=' + k, k);
});
test('les adresses /en de la page (EN_VIEW_PATHS) sont celles des routes', () => {
  const m = /const EN_VIEW_PATHS=\{([^}]*)\}/.exec(html);
  assert.ok(m);
  const tbl = Object.fromEntries([...m[1].matchAll(/(\w+):'([^']+)'/g)].map((x) => [x[1], x[2]]));
  for (const k of EN) assert.strictEqual(tbl[VIEW_OF[k]], ROUTES[k].path, k);
});
test('les pages /en ne sont pas dans le plan du site tant qu\'elles ne sont pas indexées', () => {
  const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.ok(!/<loc>[^<]*\/en(\/|<)/.test(sm));
});
test('langue de l\'interface : une adresse /en passe en anglais, sans rien retenir', () => {
  const saved = globalThis.location; I.setLang(null);
  try {
    globalThis.location = { pathname: '/en/typing-games', search: '' }; assert.strictEqual(I.lang(), 'en');
    globalThis.location = { pathname: '/en', search: '' }; assert.strictEqual(I.lang(), 'en');
    globalThis.location = { pathname: '/entreprise', search: '' }; assert.strictEqual(I.lang(), 'fr');
    globalThis.location = { pathname: '/cours-dactylo-en-ligne', search: '' }; assert.strictEqual(I.lang(), 'fr');
  } finally { globalThis.location = saved; if (saved === undefined) delete globalThis.location; }
});
