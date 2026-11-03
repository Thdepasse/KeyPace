#!/usr/bin/env node
// Gates avant déploiement (plan clavier/langues, section 4.16).
// Usage : npm run gates     (à relancer en boucle jusqu'à ce que tout soit vert, avant tout `git push` sur main)
// Code de sortie : 0 si tout est vert, 1 si un gate est rouge. Rien n'est écrit, rien n'est déployé.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const exists = (p) => fs.existsSync(path.join(root, p));

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: opts.cwd || root, encoding: 'utf8', env: { ...process.env, ...(opts.env || {}) } });
  return { code: r.status === null ? 1 : r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}
const tail = (out, n = 8) => out.split('\n').filter((l) => /^\s*✖/.test(l)).slice(0, n).map((l) => l.trim().slice(0, 160)).join('\n');

// ── G0 : tous les tests automatiques ──
function g0() {
  const files = fs.readdirSync(path.join(root, 'api')).filter((f) => f.endsWith('.test.js')).map((f) => path.join('api', f));
  const r = sh(process.execPath, ['--test', ...files]);
  const m = /ℹ pass (\d+)/.exec(r.out);
  return r.code === 0 ? { ok: true, detail: `${m ? m[1] : '?'} tests` } : { ok: false, detail: tail(r.out) || r.out.slice(-600) };
}

// ── G1 : dispositions de clavier (layouts-src/*.json) ──
function g1() {
  if (!exists('layouts-src')) return { ok: true, detail: 'aucune disposition en données (ignoré)' };
  const { validateLayout, sameLetters } = require('./layouts-lib');
  const dir = path.join(root, 'layouts-src');
  const defs = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => ({ f, d: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
  const errs = [];
  for (const { f, d } of defs) validateLayout(d).forEach((e) => errs.push(`${f} : ${e}`));
  const families = {};
  for (const { f, d } of defs) (families[d.family] = families[d.family] || []).push({ f, d });
  for (const [fam, list] of Object.entries(families)) {
    for (const x of list.slice(1)) if (!sameLetters(list[0].d, x.d)) errs.push(`${x.f} : lettres différentes de ${list[0].f} dans la famille ${fam} (regroupement refusé)`);
  }
  // Deux familles différentes ne doivent JAMAIS avoir les mêmes lettres aux mêmes touches physiques.
  const fams = Object.keys(families);
  for (let i = 0; i < fams.length; i++) for (let j = i + 1; j < fams.length; j++) {
    if (sameLetters(families[fams[i]][0].d, families[fams[j]][0].d)) errs.push(`les familles ${fams[i]} et ${fams[j]} ont les mêmes lettres : l'une est mal classée`);
  }
  return errs.length ? { ok: false, detail: errs.slice(0, 12).join('\n') } : { ok: true, detail: `${defs.length} dispositions, ${fams.length} familles (${fams.map((f) => f + ' ' + families[f].length).join(', ')})` };
}

// ── G8 : les gates eux-mêmes doivent savoir échouer ──
function g8() {
  const problems = [];
  // 1. Le lanceur sort en erreur quand un gate est rouge.
  const fake = sh(process.execPath, [__filename], { env: { GATES_FAKE_RED: '1' } });
  if (fake.code === 0 || !fake.out.includes('ROUGE')) problems.push('le lanceur ne passe pas au rouge quand un gate échoue');
  // 2. Le gate des tests détecte un test qui échoue.
  const tmp = path.join(require('os').tmpdir(), `gates-selftest-${process.pid}.test.js`);
  fs.writeFileSync(tmp, "require('node:test')('doit échouer',()=>{require('node:assert').equal(1,2)});\n");
  const bad = sh(process.execPath, ['--test', tmp]);
  fs.unlinkSync(tmp);
  if (bad.code === 0) problems.push('node --test ne détecte pas un test qui échoue');
  // 3. La validation des dispositions refuse des dispositions cassées.
  if (exists('layouts-src')) {
    const { validateLayout } = require('./layouts-lib');
    const base = JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', fs.readdirSync(path.join(root, 'layouts-src')).find((f) => f.endsWith('.json'))), 'utf8'));
    const clone = () => JSON.parse(JSON.stringify(base));
    const dup = clone(); dup.rows[0][1].c = dup.rows[0][0].c;
    const finger = clone(); finger.rows[1][0].f = 'xx';
    const short = clone(); short.rows[2].pop();
    const noCode = clone(); delete noCode.rows[3][0].c;
    const version = clone(); version.schemaVersion = 99;
    for (const [name, d] of Object.entries({ 'code en double': dup, 'doigt inconnu': finger, 'rangée incomplète': short, 'code manquant': noCode, 'version inconnue': version })) {
      if (validateLayout(d).length === 0) problems.push(`la validation accepte une disposition avec ${name}`);
    }
  }
  return problems.length ? { ok: false, detail: problems.join('\n') } : { ok: true, detail: 'le lanceur, les tests et la validation échouent bien sur des cas cassés' };
}


// ════════════════════════════════════════════════════════════════════════════════════════
// Gates de protection de la plateforme actuelle (plan, 4.18). Rien ne doit casser ce qui marche.
// ════════════════════════════════════════════════════════════════════════════════════════
const crypto = require('crypto');
const vm = require('vm');
const BASELINE_FILE = path.join(root, 'scripts', 'gates-baseline.json');
const readBaseline = () => (fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : {});
const writeBaseline = (b) => fs.writeFileSync(BASELINE_FILE, JSON.stringify(b, null, 1) + '\n');
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex').slice(0, 16);
const ACCEPT = process.argv.includes('--accept-protected');
const UPDATE = process.argv.includes('--update-baseline');
const git = (args) => sh('git', args);

// P1 : index.html doit se compiler (une erreur de syntaxe = site hors service)
function inlineScripts(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="(?:application\/ld\+json|text\/template|text\/x-[^"]*)")[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).filter((t) => t.trim());
}
function p1() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const errs = [];
  inlineScripts(html).forEach((code, i) => { try { new vm.Script(code, { filename: `index.html#script${i + 1}` }); } catch (e) { errs.push(`script ${i + 1} : ${e.message}`); } });
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: `${inlineScripts(html).length} scripts compilent` };
}

// P2 : nombre de fonctions Vercel (api/*.js sans « _ »), plafond de l'offre gratuite
const MAX_FUNCTIONS = 12;
function listFunctions() { return fs.readdirSync(path.join(root, 'api')).filter((f) => f.endsWith('.js') && !f.startsWith('_') && !f.endsWith('.test.js')); }
function p2() {
  const fns = listFunctions();
  const b = readBaseline();
  const errs = [];
  if (fns.length > MAX_FUNCTIONS) errs.push(`${fns.length} fonctions (plafond ${MAX_FUNCTIONS}) : le déploiement échouerait. Fichiers : ${fns.join(', ')}`);
  if (b.functions && JSON.stringify(b.functions) !== JSON.stringify(fns) && !UPDATE) errs.push(`liste de fonctions modifiée (avant : ${b.functions.join(', ')}). Si voulu : npm run gates -- --update-baseline`);
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: `${fns.length}/${MAX_FUNCTIONS} fonctions` };
}

// P3 : vercel.json cohérent (JSON valide, destinations existantes, aucun attrape-tout)
function p3() {
  const errs = [];
  let v;
  try { v = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')); } catch (e) { return { ok: false, detail: `vercel.json invalide : ${e.message}` }; }
  const apiExists = (u) => { const m = /^\/api\/([A-Za-z0-9_-]+)/.exec(u); return !m || fs.existsSync(path.join(root, 'api', `${m[1]}.js`)); };
  for (const r of v.rewrites || []) {
    if (!apiExists(r.destination)) errs.push(`rewrite ${r.source} -> ${r.destination} : fichier absent`);
    if (r.source === '/(.*)' || r.source === '/:path*' || r.source === '/(.*)/') errs.push(`rewrite attrape-tout ${r.source} : masquerait les fichiers statiques`);
  }
  for (const c of v.crons || []) if (!apiExists(c.path)) errs.push(`cron ${c.path} : fichier absent`);
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: `${(v.rewrites || []).length} rewrites, ${(v.crons || []).length} cron` };
}

// P4 : budget de poids de index.html (le site est un fichier unique de 1,3 Mo)
const SIZE_TOLERANCE = 0.02;
function p4() {
  const bytes = fs.statSync(path.join(root, 'index.html')).size;
  const b = readBaseline();
  if (!b.indexBytes) return { ok: false, detail: 'aucune référence : lancer npm run gates -- --update-baseline' };
  const max = Math.round(b.indexBytes * (1 + SIZE_TOLERANCE));
  return bytes > max && !UPDATE
    ? { ok: false, detail: `index.html pèse ${bytes} octets (référence ${b.indexBytes}, plafond ${max}). Si voulu : npm run gates -- --update-baseline` }
    : { ok: true, detail: `${bytes} octets (référence ${b.indexBytes}, plafond +${SIZE_TOLERANCE * 100} %)` };
}

// P5 : zones sensibles de index.html (frappe, sauvegarde, résultats). Toute modification doit être consciente.
const PROTECTED = {
  methods: ['typeKey', 'handleKey', 'computeResult', 'recordResult', '_recordKey', '_ttFinish'],
  functions: ['flushStats', 'saveStats', 'mergeStats', 'loadStats', 'kpTypable', 'kbKeyMatch', 'applyKbLayout', 'getKbLayoutId'],
};
function extractRegion(html, name, kind) {
  if (kind === 'method') {
    const start = html.search(new RegExp(`\\n  ${name}\\(`));
    if (start < 0) throw new Error(`méthode ${name} introuvable`);
    const end = html.indexOf('\n  },', start);
    const text = html.slice(start + 1, end + 5).replace(/,\s*$/, '');
    new vm.Script(`({${text}})`);
    return text;
  }
  const start = html.search(new RegExp(`\\n(?:async )?function ${name}\\(`));
  if (start < 0) throw new Error(`fonction ${name} introuvable`);
  const rest = html.slice(start + 1);
  const firstLine = rest.slice(0, rest.indexOf('\n'));
  try { new vm.Script(firstLine); return firstLine; } catch { /* fonction sur plusieurs lignes */ }
  const m = /\n\}\n/.exec(rest);
  const text = rest.slice(0, m.index + 2);
  new vm.Script(text);
  return text;
}
function protectedHashes() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const out = {};
  for (const n of PROTECTED.methods) out[n] = sha(extractRegion(html, n, 'method'));
  for (const n of PROTECTED.functions) out[n] = sha(extractRegion(html, n, 'function'));
  return out;
}
function p5() {
  const now = protectedHashes();
  const b = readBaseline();
  if (ACCEPT || !b.protected) { writeBaseline({ ...readBaseline(), protected: now }); return { ok: true, detail: ACCEPT ? 'zones sensibles acceptées (référence mise à jour)' : 'référence créée' }; }
  const changed = Object.keys(now).filter((k) => b.protected[k] !== now[k]);
  const missing = Object.keys(b.protected).filter((k) => !(k in now));
  const errs = [...changed.map((k) => `${k} modifiée`), ...missing.map((k) => `${k} disparue`)];
  return errs.length ? { ok: false, detail: `zone sensible touchée : ${errs.join(', ')}\nSi voulu et relu : npm run gates -- --accept-protected` } : { ok: true, detail: `${Object.keys(now).length} zones inchangées` };
}

// P6 : migrations SQL sûres (rien de destructif, rien de non relançable) dans les fichiers suivis par git
function p6() {
  const files = git(['ls-files', '*.sql']).out.split('\n').filter(Boolean);
  const b = readBaseline();
  const allow = new Set(b.sqlAllow || []);
  const errs = [], seen = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, f), 'utf8').split('\n');
    text.forEach((line, i) => {
      const code = line.replace(/--.*$/, '').trim();
      if (!code) return;
      const bad = [
        [/\bdrop\s+(table|column|schema|database)\b/i, 'DROP destructif'],
        [/\btruncate\b/i, 'TRUNCATE'],
        [/\bdelete\s+from\b(?![^;]*\bwhere\b)/i, 'DELETE sans WHERE'],
        [/\bcreate\s+table\s+(?!if\s+not\s+exists)/i, 'CREATE TABLE sans IF NOT EXISTS'],
        [/\badd\s+column\s+(?!if\s+not\s+exists)/i, 'ADD COLUMN sans IF NOT EXISTS'],
      ].find(([re]) => re.test(code));
      if (!bad) return;
      const key = `${f}|${sha(code)}`;
      seen.push(key);
      if (!allow.has(key) && !UPDATE) errs.push(`${f}:${i + 1} ${bad[1]} : ${code.slice(0, 80)}`);
    });
  }
  if (UPDATE) writeBaseline({ ...readBaseline(), sqlAllow: [...new Set(seen)] });
  return errs.length ? { ok: false, detail: errs.slice(0, 8).join('\n') + '\nSi voulu et relu : npm run gates -- --update-baseline' } : { ok: true, detail: `${files.length} fichiers SQL, ${seen.length} instructions déjà connues` };
}

// P7 : aucun secret dans ce qui va partir (fichiers modifiés par rapport à origin/main, y compris non commités)
const SECRET_PATTERNS = [
  [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, 'jeton JWT'],
  [/\bsk_(live|test)_[A-Za-z0-9]{16,}/, 'clé Stripe'],
  [/\bwhsec_[A-Za-z0-9]{16,}/, 'secret de webhook Stripe'],
  [/\bre_[A-Za-z0-9_]{24,}/, 'clé Resend'],
  [/(SUPABASE_SECRET_KEY|SERVICE_ROLE_KEY|CRON_SECRET|OAUTH_STATE_SECRET)\s*[=:]\s*['"]?[A-Za-z0-9._-]{16,}/, 'secret en clair'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'clé privée'],
];
function p7() {
  const files = new Set();
  const base = git(['rev-parse', '--verify', '-q', 'origin/main']);
  if (base.code === 0) git(['diff', '--name-only', 'origin/main']).out.split('\n').filter(Boolean).forEach((f) => files.add(f));
  git(['ls-files', '--others', '--exclude-standard']).out.split('\n').filter(Boolean).forEach((f) => files.add(f));
  const errs = [];
  for (const f of files) {
    const full = path.join(root, f);
    if (!fs.existsSync(full) || fs.statSync(full).size > 3_000_000 || /\.(png|jpe?g|webp|gif|pdf|zip|xlsx|ico|woff2?)$/i.test(f)) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const [re, label] of SECRET_PATTERNS) if (re.test(text)) errs.push(`${f} : ${label}`);
    if (/(^|\/)\.env/.test(f)) errs.push(`${f} : fichier d'environnement`);
  }
  return errs.length ? { ok: false, detail: errs.slice(0, 8).join('\n') } : { ok: true, detail: `${files.size} fichiers modifiés ou nouveaux examinés` };
}

// Information (jamais rouge) : ce qui va partir
function info() {
  const out = git(['diff', '--stat', 'origin/main']).out.trim().split('\n').slice(-1)[0];
  const sensitive = ['index.html', 'vercel.json', 'supabase-schema.sql', 'api/save-progress.js', 'api/login.js', 'api/classes.js', 'api/webhook.js', 'api/billing.js'];
  const touched = git(['diff', '--name-only', 'origin/main']).out.split('\n').filter((f) => sensitive.includes(f));
  return `${out || 'aucune différence avec origin/main'}${touched.length ? ' | fichiers sensibles touchés : ' + touched.join(', ') : ''}`;
}


// ── B1 : vrai navigateur (Chrome sans interface), voir scripts/browser-gates.js ──
const NO_BROWSER = process.argv.includes('--no-browser');
async function b1() {
  if (NO_BROWSER) return { ok: true, detail: 'ignoré (--no-browser demandé explicitement)' };
  const { run } = require('./browser-gates');
  const r = await run({ screenshotDir: path.join(require('os').tmpdir(), 'keypace-gates-shots') });
  const errs = [...r.problems];
  const b = readBaseline();
  if (r.info.preview) {
    const now = Object.fromEntries(Object.entries(r.info.preview).map(([k, v]) => [k, `${v.keys}:${v.sig}`]));
    if (UPDATE || !b.kbPreview) writeBaseline({ ...readBaseline(), kbPreview: now });
    else {
      const diff = [...new Set([...Object.keys(now), ...Object.keys(b.kbPreview)])].filter((k) => now[k] !== b.kbPreview[k]);
      if (diff.length) errs.push(`dessin du clavier modifié pour ${diff.length} configuration(s) : ${diff.slice(0, 6).join(', ')}. Si voulu et relu : npm run gates -- --update-baseline`);
    }
  }
  return errs.length ? { ok: false, detail: errs.slice(0, 8).join('\n') } : { ok: true, detail: `${r.info.views} écrans, ${r.info.configs} claviers dessinés, vraies frappes terminées, capture ${r.info.shotBytes} octets` };
}

const usage = () => require('./usage-gates');
const GATES = process.env.GATES_FAKE_RED
  ? [{ id: 'GX', name: 'Gate rouge volontaire (auto-contrôle)', run: () => ({ ok: false, detail: 'rouge volontaire' }) }]
  : [
    { id: 'G8', name: 'Les gates savent échouer', run: g8 },
    { id: 'G0', name: 'Tests automatiques (api/*.test.js)', run: g0 },
    { id: 'G1', name: 'Dispositions de clavier valides', run: g1 },
    { id: 'P1', name: 'index.html se compile (site non cassé)', run: p1 },
    { id: 'P2', name: 'Fonctions Vercel sous le plafond', run: p2 },
    { id: 'P3', name: 'vercel.json cohérent', run: p3 },
    { id: 'P4', name: 'Poids de index.html sous le budget', run: p4 },
    { id: 'P5', name: 'Zones sensibles de index.html inchangées', run: p5 },
    { id: 'P6', name: 'Migrations SQL sûres', run: p6 },
    { id: 'P7', name: 'Aucun secret dans ce qui part', run: p7 },
    { id: 'Q1', name: 'QWERTY : désaccords entre Microsoft et xkeyboard-config connus et relus', run: () => require('./qwerty-gates').q1(UPDATE) },
    { id: 'Q2', name: 'QWERTY : caractères de nos textes tapables ou impossibles, par variante', run: () => require('./qwerty-gates').q2(UPDATE) },
    { id: 'Q3', name: 'QWERTY : le vrai moteur face aux touches mortes (apostrophe, accents)', run: () => require('./qwerty-gates').q3(UPDATE) },
    { id: 'U1', name: 'Chaque leçon se termine sur chaque disposition (66 x 4)', run: () => usage().u1() },
    { id: 'U2', name: 'Ce que le client envoie est accepté tel quel par le serveur', run: () => usage().u2() },
    { id: 'U3', name: 'Un visiteur sans compte peut taper, rien n\'est envoyé', run: () => usage().u3() },
    { id: 'U4', name: 'Les comptes existants se rechargent (vides, anciens formats)', run: () => usage().u4() },
    { id: 'U5', name: 'Tous les textes de test et du certificat se terminent (4 dispositions)', run: () => usage().u5() },
    { id: 'U6', name: 'Les gestes sans touche sont découverts par le moteur, pas supposés', run: () => usage().u6() },
    { id: 'U7', name: 'Chaque écran s\'affiche pour chaque type de compte', run: () => usage().u7() },
    { id: 'T1', name: 'Traces de matériel réel rejouées dans le moteur (G6)', run: () => require('./traces-gate').run() },
    { id: 'B1', name: 'Vrai navigateur : chargement, écrans, 26 claviers, vraies frappes', run: b1 },
  ];

if (UPDATE) {
  const b = readBaseline();
  writeBaseline({ ...b, indexBytes: fs.statSync(path.join(root, 'index.html')).size, functions: listFunctions() });
}
if (process.env.GATES_ONLY) { const only = process.env.GATES_ONLY.split(','); for (let i = GATES.length - 1; i >= 0; i--) if (!only.includes(GATES[i].id)) GATES.splice(i, 1); }
(async () => {
let red = 0;
const rows = [];
for (const g of GATES) {
  const t0 = Date.now();
  let r;
  try { r = await g.run(); } catch (e) { r = { ok: false, detail: `exception : ${e && e.message}` }; }
  rows.push({ g, r, ms: Date.now() - t0 });
  if (!r.ok) red++;
}
console.log('\nGATES AVANT DÉPLOIEMENT');
for (const { g, r, ms } of rows) {
  console.log(`  ${r.ok ? 'VERT ' : 'ROUGE'}  ${g.id}  ${g.name}  (${ms} ms)${r.detail ? ' : ' + r.detail.split('\n')[0] : ''}`);
  if (!r.ok) r.detail.split('\n').slice(1).forEach((l) => console.log(`            ${l}`));
}
try { console.log(`\nÀ pousser : ${info()}`); } catch {}
console.log(red ? `\n${red} gate(s) ROUGE : ne pas déployer. Corriger puis relancer : npm run gates\n` : '\nTout est VERT. Le déploiement peut se faire.\n');
process.exit(red ? 1 : 0);
})();
