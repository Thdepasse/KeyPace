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
  return errs.length ? { ok: false, detail: errs.slice(0, 12).join('\n') } : { ok: true, detail: `${defs.length} dispositions` };
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

const GATES = process.env.GATES_FAKE_RED
  ? [{ id: 'GX', name: 'Gate rouge volontaire (auto-contrôle)', run: () => ({ ok: false, detail: 'rouge volontaire' }) }]
  : [
    { id: 'G8', name: 'Les gates savent échouer', run: g8 },
    { id: 'G0', name: 'Tests automatiques (api/*.test.js)', run: g0 },
    { id: 'G1', name: 'Dispositions de clavier valides', run: g1 },
  ];

let red = 0;
const rows = [];
for (const g of GATES) {
  const t0 = Date.now();
  let r;
  try { r = g.run(); } catch (e) { r = { ok: false, detail: `exception : ${e && e.message}` }; }
  rows.push({ g, r, ms: Date.now() - t0 });
  if (!r.ok) red++;
}
console.log('\nGATES AVANT DÉPLOIEMENT');
for (const { g, r, ms } of rows) {
  console.log(`  ${r.ok ? 'VERT ' : 'ROUGE'}  ${g.id}  ${g.name}  (${ms} ms)${r.detail ? ' : ' + r.detail.split('\n')[0] : ''}`);
  if (!r.ok) r.detail.split('\n').slice(1).forEach((l) => console.log(`            ${l}`));
}
console.log(red ? `\n${red} gate(s) ROUGE : ne pas déployer. Corriger puis relancer : npm run gates\n` : '\nTout est VERT. Le déploiement peut se faire.\n');
process.exit(red ? 1 : 0);
