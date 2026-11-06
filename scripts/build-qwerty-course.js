// Assemble le cours français sur QWERTY : courses-src/fr-qwerty.json (le fichier que le site charge) à partir des SOURCES ÉCRITES À LA MAIN
// dans course-src/fr-qwerty/NN-nom.json (un fichier par module). Rien n'est généré : les textes, les titres, les conseils et les tutoriels sont
// ceux des sources, relus par l'utilisateur. Le script ajoute seulement les 8 claviers QWERTY au format du site (scripts/build-qwerty-keyboards.js),
// la liste des leçons gratuites (les 10 premières) et la liste `handwritten`. Les gates (Q6 à Q9, U10, U12 à U14) lisent le résultat.
//
// Format d'un module source : { position (rang dans le programme, à partir de 1), name, kind?, row?, lessons: [ ... ] }
//   kind : accents | majuscules | ponctuation | symboles (règles propres de la gate Q9) ; row : rangée enseignée (repos, haut, bas, chiffres).
//   leçon : { id, title, keys, teaches, tip, tuto: { intro, rules[3 ou 4], tip }, text, maxLen?, hand?, fingers?, row?, howText? }
// Usage : node scripts/build-qwerty-course.js [langue]   (écrit le fichier et affiche le programme ; langue : fr par défaut, en pour l'anglais)
// La langue choisit le dossier des sources (course-src/<langue>-qwerty), le fichier produit (courses-src/<langue>-qwerty.json) et l'identifiant du cours (<langue>/qwerty).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const LANG = (process.argv[2] && /^[a-z]{2}$/.test(process.argv[2]) && require.main === module) ? process.argv[2] : 'fr';
const SRC = path.join(root, 'course-src', LANG + '-qwerty');
const OUT = path.join(root, 'courses-src', LANG + '-qwerty.json');

function loadSources() {
  const files = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => /^\d\d-.*\.json$/.test(f)).sort() : [];
  return files.map((f) => {
    const m = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
    const position = m.position !== undefined ? m.position : [].concat(m.replaces)[0];
    return { ...m, position, file: f };
  });
}

function build() {
  const sources = loadSources().sort((a, b) => a.position - b.position);
  sources.forEach((m, i) => { if (m.position !== i + 1) throw new Error(`${m.file} : position ${m.position}, attendu ${i + 1} (les positions doivent former la suite 1, 2, 3…)`); });
  const modules = sources.map((m) => ({ name: m.name, ...(m.row ? { row: m.row } : {}), ...(m.kind ? { kind: m.kind } : {}), lessons: m.lessons.map((l) => ({ ...l })) }));
  const lessons = modules.flatMap((m) => m.lessons);
  const curriculum = { modules, free: lessons.slice(0, 10).map((l) => l.id) };
  const keyboards = require('./build-qwerty-keyboards').buildKeyboards(lessons.flatMap((l) => [l.text || '', l.keys]));
  return {
    schema: 1, id: LANG + '/qwerty',
    note: `Généré par scripts/build-qwerty-course.js à partir de course-src/${LANG}-qwerty/ (textes écrits à la main, relus par l'utilisateur). Ne pas modifier à la main.`,
    handwritten: lessons.map((l) => l.id), keyboards, curriculum,
  };
}

if (require.main === module) {
  const out = build();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  out.curriculum.modules.forEach((m, i) => console.log(`${m.name} (${m.lessons.length} leçons : ${m.lessons.map((l) => l.id).join(' ')})`));
  console.log(`${out.handwritten.length} leçons, ${Object.keys(out.keyboards).length} claviers, ${(fs.statSync(OUT).size / 1024).toFixed(0)} Ko`);
}
module.exports = { build, loadSources, OUT, SRC };
