// Affiche les leçons du cours FRANÇAIS d'un clavier, en JSON, pour servir de modèle à un cours dans une autre langue (mêmes ids, mêmes touches).
//   node scripts/dump-fr-course.js qwerty   : lit course-src/fr-qwerty/ (sources écrites à la main)
//   node scripts/dump-fr-course.js azerty   : lit les leçons de la page (CURRICULUM de index.html)
// Chaque leçon : id, title, keys, tip, tuto, text (le texte français, à ne PAS traduire : en écrire un directement en anglais) et le module qui la contient.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const family = process.argv[2];
if (!/^(qwerty|azerty)$/.test(family || '')) { console.error('Usage : node scripts/dump-fr-course.js qwerty|azerty'); process.exit(1); }
let out;
if (family === 'qwerty') {
  const dir = path.join(root, 'course-src', 'fr-qwerty');
  out = fs.readdirSync(dir).filter((f) => /^\d\d-.*\.json$/.test(f)).sort().map((f) => { const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); return { file: f, name: m.name, row: m.row || null, kind: m.kind || null, lessons: m.lessons }; });
} else {
  const { loadApp } = require('./engine-harness');
  const app = loadApp();
  const lessons = JSON.parse(app.run('JSON.stringify(ALL_LESSONS.map(l=>({id:l.id,title:l.title,keys:l.keys,tip:l.tip,tuto:l.tuto,text:l.text,module:l.module})))'));
  const mods = []; for (const l of lessons) { let m = mods.find((x) => x.name === l.module); if (!m) { m = { name: l.module, lessons: [] }; mods.push(m); } const { module, ...rest } = l; m.lessons.push(rest); }
  out = mods;
}
console.log(JSON.stringify(out, null, 1));
