// Met à jour les <lastmod> de sitemap.xml d'après la date du dernier commit de
// chaque page statique (ou aujourd'hui si le fichier est modifié, non commité).
// Les adresses de l'appli (/, /test-frappe-en-ligne…) servies par api/track
// gardent leur date : elles changent à chaque déploiement de l'appli.
// Usage : node scripts/gen-sitemap.js   (puis committer sitemap.xml)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const git = process.env.GIT || 'git';
const run = (...a) => execFileSync(git, a, { cwd: root, encoding: 'utf8' }).trim();

const rewrites = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).rewrites;
const fileOf = {};
for (const r of rewrites) if (r.destination.endsWith('.html')) fileOf[r.source] = r.destination.replace(/^\//, '');

const dirty = new Set(run('status', '--porcelain').split('\n').map((l) => l.slice(3).trim()).filter(Boolean));
const today = new Date().toISOString().slice(0, 10);

const smPath = path.join(root, 'sitemap.xml');
let xml = fs.readFileSync(smPath, 'utf8');
let changed = 0;
xml = xml.replace(/(<loc>https:\/\/keypace\.be([^<]*)<\/loc>\s*<lastmod>)([^<]*)(<\/lastmod>)/g, (m, a, p, old, b) => {
  const file = fileOf[p];
  if (!file) return m;
  const date = dirty.has(file) ? today : run('log', '-1', '--format=%cs', '--', file) || old;
  if (date !== old) { changed++; console.log(`${p}: ${old} -> ${date}`); }
  return a + date + b;
});
fs.writeFileSync(smPath, xml);
console.log(`${changed} lastmod mis à jour`);
