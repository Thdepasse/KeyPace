// Pages /en (interface en anglais) : balises, indexation (2026-11-11), hreflang réciproques, routes, adresses de l'appli.
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
const INDEXED = { 'en-home': ['/', '/fr'], 'en-test': ['/test-frappe-en-ligne', '/test-frappe-en-ligne'], 'en-testtime': ['/test-dactylographie-chronometre', '/test-dactylographie-chronometre'], 'en-lessons': ['/cours-dactylo-en-ligne', '/fr/cours-dactylo-en-ligne'], 'en-games': ['/jeux-dactylo-en-ligne', '/jeux-dactylo-en-ligne'] };
const FR_OF = { 'en-test': 'test', 'en-testtime': 'testtime', 'en-lessons': 'lessons', 'en-games': 'games', 'en-home': 'fr-home' };
test('indexées : accueil, tests, cours et jeux (équivalents français indexés) ; progrès, classe et choix du test restent noindex comme leurs équivalents français', () => {
  for (const k of EN) {
    const out = render(html, k);
    if (INDEXED[k]) { assert.strictEqual(ROUTES[k].index, true, k); assert.match(out, /<meta name="robots" content="index, follow, max-image-preview:large">/, k); }
    else { assert.strictEqual(ROUTES[k].index, false, k); assert.match(out, /<meta name="robots" content="noindex, follow">/, k); }
  }
});
test('hreflang réciproque : chaque page /en indexée cite son équivalent français et chaque équivalent français la cite en retour', () => {
  for (const [k, [be, frfr]] of Object.entries(INDEXED)) {
    const en = ROUTES[k].path; const alt = ROUTES[k].alternates;
    assert.deepStrictEqual([alt['en-GB'], alt['fr-BE'], alt['fr-FR'], alt['x-default']], [en, be, frfr, be], k);
    const fr = ROUTES[FR_OF[k]]; assert.ok(fr, k); assert.ok(fr.index, FR_OF[k] + ' doit être indexée');
    assert.strictEqual(fr.alternates['en-GB'], en, FR_OF[k] + ' ne cite pas ' + en);
  }
});
test('balises d\'une page /en : langue, adresse canonique, hreflang avec elle-même et ses équivalents français, texte de référencement visible', () => {
  const out = render(html, 'en-lessons');
  assert.match(out, /<html lang="en"/);
  assert.ok(out.includes(`<link rel="canonical" href="${BASE}/en/typing-lessons">`));
  const hl = [...out.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]*)">/g)].map((m) => m[1] + '=' + m[2]);
  assert.deepStrictEqual(hl, [`en-GB=${BASE}/en/typing-lessons`, `fr-BE=${BASE}/cours-dactylo-en-ligne`, `fr-FR=${BASE}/fr/cours-dactylo-en-ligne`, `x-default=${BASE}/cours-dactylo-en-ligne`]);
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
test('plan du site : les pages /en indexées y sont avec leurs hreflang, les autres non', () => {
  const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const k of EN) {
    const has = sm.includes(`<loc>${BASE}${ROUTES[k].path}</loc>`);
    assert.strictEqual(has, !!INDEXED[k], k);
    if (INDEXED[k]) for (const l of ['en-GB', 'fr-BE', 'fr-FR', 'x-default']) assert.ok(new RegExp(`<loc>${BASE}${ROUTES[k].path}</loc>[\\s\\S]*?hreflang="${l}"`).test(sm), k + ' ' + l);
  }
  for (const [k, [be]] of Object.entries(INDEXED)) { const blk = new RegExp(`<loc>${BASE}${be === '/' ? '/' : be}</loc>[\\s\\S]*?</url>`).exec(sm)[0]; assert.ok(blk.includes(`hreflang="en-GB" href="${BASE}${ROUTES[k].path}"`), be + ' ne cite pas ' + ROUTES[k].path); }
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
