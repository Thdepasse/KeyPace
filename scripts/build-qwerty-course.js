// Assemble le cours français sur QWERTY : courses-src/fr-qwerty.json (le fichier que le site charge) à partir des SOURCES ÉCRITES À LA MAIN
// dans course-src/fr-qwerty/NN-nom.json (un fichier par module). Rien n'est généré : les textes, les titres, les conseils et les tutoriels sont
// ceux des sources, relus par l'utilisateur. Le script ajoute seulement les 8 claviers QWERTY au format du site (scripts/build-qwerty-keyboards.js),
// la liste des leçons gratuites (les 10 premières) et la liste `handwritten`. Les gates (Q6 à Q9, U10, U12 à U14) lisent le résultat.
//
// Format d'un module source : { position (rang dans le programme, à partir de 1), name, kind?, row?, lessons: [ ... ] }
//   kind : accents | majuscules | ponctuation | symboles (règles propres de la gate Q9) ; row : rangée enseignée (repos, haut, bas, chiffres).
//   leçon : { id, title, keys, teaches, tip, tuto: { intro, rules[3 ou 4], tip }, text, maxLen?, hand?, fingers?, row?, howText? }
// Usage : node scripts/build-qwerty-course.js [langue] [clavier]   (langue : fr par défaut, en pour l'anglais ; clavier : qwerty par défaut, ou azerty)
// La langue et le clavier choisissent le dossier des sources (course-src/<langue>-<clavier>), le fichier produit (courses-src/<langue>-<clavier>.json) et l'identifiant
// du cours (<langue>/<clavier>). Un cours azerty n'apporte pas de claviers (les 4 dispositions AZERTY existent déjà dans le site).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const CLI = require.main === module;
const LANG = (CLI && /^[a-z]{2}$/.test(process.argv[2] || '')) ? process.argv[2] : 'fr';
const FAMILY = (CLI && /^(qwerty|azerty)$/.test(process.argv[3] || '')) ? process.argv[3] : 'qwerty';
const SRC = path.join(root, 'course-src', `${LANG}-${FAMILY}`);
const OUT = path.join(root, 'courses-src', `${LANG}-${FAMILY}.json`);

function loadSources(lang = LANG, family = FAMILY) {
  const SRC = path.join(root, 'course-src', `${lang}-${family}`);
  const files = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => /^\d\d-.*\.json$/.test(f)).sort() : [];
  return files.map((f) => {
    const m = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
    const position = m.position !== undefined ? m.position : [].concat(m.replaces)[0];
    return { ...m, position, file: f };
  });
}

function build(LANG_ = LANG, FAMILY_ = FAMILY) {
  const sources = loadSources(LANG_, FAMILY_).sort((a, b) => a.position - b.position);
  sources.forEach((m, i) => { if (m.position !== i + 1) throw new Error(`${m.file} : position ${m.position}, attendu ${i + 1} (les positions doivent former la suite 1, 2, 3…)`); });
  const modules = sources.map((m) => ({ name: m.name, ...(m.row ? { row: m.row } : {}), ...(m.kind ? { kind: m.kind } : {}), lessons: m.lessons.map((l) => ({ ...l })) }));
  const lessons = modules.flatMap((m) => m.lessons);
  const curriculum = { modules, free: lessons.slice(0, 10).map((l) => l.id) };
  const keyboards = FAMILY_ === 'qwerty' ? require('./build-qwerty-keyboards').buildKeyboards(lessons.flatMap((l) => [l.text || '', l.keys])) : {};
  // Cours dans une autre langue : noms des claviers et gestes de frappe dans la langue du cours (l'interface suit le cours).
  if (LANG_ === 'en' || LANG_ === 'nl') {
    const I = require('../i18n.js');
    const NAMES_BY_LANG = {
      en: {
        'windows-us': ['United States (US)', 'US'], 'windows-us-intl': ['United States international', 'US intl'], 'windows-uk': ['United Kingdom (UK)', 'UK'],
        'windows-uk-extended': ['United Kingdom extended', 'UK extended'], 'mac-us': ['Mac, United States (ABC)', 'Mac US'], 'mac-us-intl-pc': ['Mac, United States international PC', 'Mac US intl'],
        'mac-british': ['Mac, United Kingdom', 'Mac UK'], 'linux-us-intl': ['Linux, United States international', 'Linux US intl'],
      },
      nl: {
        'windows-us': ['Verenigde Staten (US)', 'US'], 'windows-us-intl': ['Verenigde Staten internationaal', 'US intl'], 'windows-uk': ['Verenigd Koninkrijk (UK)', 'UK'],
        'windows-uk-extended': ['Verenigd Koninkrijk uitgebreid', 'UK uitgebreid'], 'mac-us': ['Mac, Verenigde Staten (ABC)', 'Mac US'], 'mac-us-intl-pc': ['Mac, Verenigde Staten internationaal pc', 'Mac US intl'],
        'mac-british': ['Mac, Verenigd Koninkrijk', 'Mac UK'], 'linux-us-intl': ['Linux, Verenigde Staten internationaal', 'Linux US intl'],
      },
    };
    const NAMES = NAMES_BY_LANG[LANG_]; const how = LANG_ === 'en' ? I.howEn : I.howNl;
    for (const [id, k] of Object.entries(keyboards)) {
      if (!NAMES[id]) throw new Error(`clavier « ${id} » sans nom ${LANG_ === 'en' ? 'anglais' : 'néerlandais'} (scripts/build-qwerty-course.js)`);
      k.label = NAMES[id][0]; k.short = NAMES[id][1];
      for (const c of Object.keys(k.how || {})) k.how[c] = how(k.how[c]);
    }
  }
  // Cours dans une autre langue : le vocabulaire des jeux (mots d'entraînement filtrés par les lettres apprises) = lexique vérifié de la langue (les deux claviers partagent le même vocabulaire), mots en minuscules
  // de 2 à 12 lettres sans signe. Le français garde ses propres listes (dans la page).
  let vocab;
  if (LANG_ !== 'fr') {
    const set = new Set(); const dirC = path.join(root, 'course-src');
    const base = path.join(dirC, `${LANG_}-words.json`);
    if (fs.existsSync(base)) JSON.parse(fs.readFileSync(base, 'utf8')).words.forEach((w) => set.add(w));
    for (const f of fs.readdirSync(dirC).filter((x) => new RegExp(`^${LANG_}-lexicon-extra-.*\\.json$`).test(x) && !/-check\.json$/.test(x))) JSON.parse(fs.readFileSync(path.join(dirC, f), 'utf8')).words.forEach((w) => set.add(w));
    vocab = [...set].filter((w) => /^[a-z]{2,12}$/.test(w)).sort();
  }
  return {
    schema: 1, id: `${LANG_}/${FAMILY_}`,
    note: `Généré par scripts/build-qwerty-course.js à partir de course-src/${LANG_}-${FAMILY_}/ (textes écrits à la main, relus par l'utilisateur). Ne pas modifier à la main.`,
    handwritten: lessons.map((l) => l.id), keyboards, curriculum, ...(vocab ? { vocab } : {}),
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
