// Gate Q10 : cours de LANGUE autres que le français (course-src/<langue>-qwerty et course-src/<langue>-azerty, hors fr-*).
// Les modules sont écrits à la main (par Claude, relus par l'utilisateur). Cette gate vérifie, sans jugement subjectif, tout ce qui peut l'être :
//   FORME      modules numérotés 1..N sans trou, ids de leçon uniques, titre, conseil, tutoriel complet (intro, 3 ou 4 règles icône/titre/texte, objectif),
//              aucun tiret cadratin dans les textes affichés.
//   ORDRE      chaque leçon qui existe dans le cours français du même clavier (mêmes ids) apporte EXACTEMENT les mêmes touches (`keys`) : l'ordre
//              d'apprentissage (ligne par ligne, doigt par doigt) est celui du cours français, seule la langue des textes change.
//   LETTRES    le texte d'une leçon ne contient que des lettres déjà apprises (cumul), l'espace, et les signes déjà enseignés ; les majuscules
//              seulement une fois le module de majuscules atteint ; chaque touche que la leçon enseigne (`teaches`) y est tapée assez souvent
//              (8 fois une lettre, 6 un signe) ; longueur 30 à 130 signes (`maxLen` pour aller plus loin), espaces propres.
//   VOCABULAIRE chaque mot (3 lettres ou plus, ou toute suite de plus de 4 lettres) est dans le lexique : course-src/en-words.json et
//              course-src/en-lexicon-extra*.json, dont chaque mot a été vérifié par scripts/check-en-words.js (fichier -check.json voisin). Une suite de
//              1 à 4 lettres qui n'est pas un mot est un exercice de doigts, admis seulement tant que moins de 15 mots sont possibles avec les lettres
//              apprises (ensuite, au plus un quart du texte). Aucun mot français, aucune orthographe américaine (anglais britannique).
//   CLAVIER    pas de mention du mauvais clavier dans les tutoriels (QWERTY dans un cours AZERTY, AZERTY dans un cours QWERTY).
// Sans dossier de cours de langue, la gate est verte (rien à vérifier).
const fs = require('fs');
const path = require('path');
const G = require('../game-levels.js');

const root = path.join(__dirname, '..');
const US_SPELLINGS = /^(colou?rs?|colored|colorful|favou?rites?|neighbou?rs?|gray|centers?|theaters?|labor|honor|humor|flavor|moms?|sidewalks?|elevators?|trucks?|cookies?|soccer|apartments?|traveling|organized?|realized?)$/;
const BRITISH_OK = new Set(['colour', 'colours', 'favourite', 'favourites', 'neighbour', 'neighbours']); // les formes britanniques ne sont pas refusées
const FR_ACCENTS = /[éèêëàâîïôûùçœæ]/i;
const TECH_TOKENS = new Set(['https']); // termes techniques admis tels quels dans les modules de symboles (adresses, code) ; un mot de plus de 4 lettres qui n'est pas anglais doit sinon être au lexique

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
const flatTuto = (t) => [t.intro, t.tip, ...(t.rules || []).flatMap((r) => [r.t, r.d])].join(' ');

function loadLexicon(srcDir, errs, only) {
  const words = new Set();
  const base = path.join(srcDir, 'en-words.json');
  if (fs.existsSync(base)) readJson(base).words.forEach((w) => words.add(w));
  // `only` (ex. « en-azerty ») : ne charge que le lexique complémentaire de ce cours (en-lexicon-extra-azerty.json), pour qu'un agent ne soit pas gêné par le travail en cours d'un autre
  for (const f of fs.readdirSync(srcDir).filter((x) => /^en-lexicon-extra.*\.json$/.test(x) && !/-check\.json$/.test(x) && (!only || x === `en-lexicon-extra-${only.split('-')[1]}.json`))) {
    const list = readJson(path.join(srcDir, f)).words || [];
    const checkFile = path.join(srcDir, f.replace(/\.json$/, '-check.json'));
    const checked = fs.existsSync(checkFile) ? Object.fromEntries(readJson(checkFile).results.map((r) => [r.w, r])) : {};
    for (const w of list) {
      const c = checked[w];
      if (!/^[a-z]+('[a-z]+)?$/.test(w)) { errs.push(`${f} : « ${w} » n'est pas un mot en minuscules (une apostrophe est admise : don't)`); continue; }
      if (US_SPELLINGS.test(w) && !BRITISH_OK.has(w)) { errs.push(`${f} : « ${w} » est une orthographe américaine (anglais britannique attendu)`); continue; }
      if (!c) { errs.push(`${f} : « ${w} » n'a pas été vérifié (lancer scripts/check-en-words.js --in ${f})`); continue; }
      const ok = c.dict === 'oui' || c.wik === 'oui' || (c.freq !== null && c.freq >= 1 && w.length <= 3);
      if (!ok) errs.push(`${f} : « ${w} » n'est confirmé par aucun dictionnaire (dict ${c.dict}, wiktionary ${c.wik})`);
      else words.add(w);
    }
  }
  return words;
}

// Cours de référence (français) du même clavier : id de leçon -> { keys, teaches }.
function referenceFor(family, srcDir) {
  const ref = {};
  if (family === 'qwerty') {
    const dir = path.join(srcDir, 'fr-qwerty');
    for (const f of fs.readdirSync(dir).filter((x) => /^\d\d-.*\.json$/.test(x))) for (const l of readJson(path.join(dir, f)).lessons) ref[l.id] = { keys: l.keys, teaches: l.teaches };
  } else {
    const { loadApp } = require('./engine-harness');
    const app = loadApp();
    JSON.parse(app.run('JSON.stringify(ALL_LESSONS.map(l=>({id:l.id,keys:l.keys||""})))')).forEach((l) => { ref[l.id] = { keys: l.keys }; });
  }
  return ref;
}

// Mots français courants (mots entiers, majuscules admises en début de phrase) : leur présence dans un titre, un conseil ou un tutoriel montre qu'il reste du français.
const FR_WORDS = /(^|[^\p{L}'])(le|la|les|des|du|une|est|sont|pour|avec|dans|tu|ton|ta|tes|sur|qui|que|pas|et|ou|vos|votre|ce|cette|ces|ses|aux|au)(?![\p{L}'])/iu;
// `keys` mêle les touches enseignées (« f j », « é », « ; ») et, parfois, une étiquette en mots (« toutes lettres »). L'étiquette est dans la langue du cours ;
// seules les touches doivent rester identiques à celles du cours français (ordre d'apprentissage).
const keysCore = (k) => String(k).split(/\s+/).filter((t) => !/^[\p{L}'’-]{2,}$/u.test(t)).join(' ');
function checkCourse(dirName, srcDir, lexicon, errs) {
  const [lang, family] = dirName.split('-');
  const dir = path.join(srcDir, dirName);
  const files = fs.readdirSync(dir).filter((f) => /^\d\d-.*\.json$/.test(f)).sort();
  if (!files.length) return { lessons: 0 };
  const ref = referenceFor(family, srcDir);
  const mods = files.map((f) => ({ ...readJson(path.join(dir, f)), file: f }));
  mods.forEach((m, i) => {
    const pos = m.position !== undefined ? m.position : [].concat(m.replaces)[0];
    if (pos !== i + 1) errs.push(`${dirName}/${m.file} : position ${pos}, attendu ${i + 1}`);
    if (!/^\d+\. /.test(m.name || '')) errs.push(`${dirName}/${m.file} : le nom du module doit commencer par « ${i + 1}. »`);
    // l'interface suit la langue du cours : le nom du module est dans la langue du cours, et les trois premiers gardent un nom que les niveaux des jeux reconnaissent (game-levels.js)
    if (FR_WORDS.test(m.name || '') || FR_ACCENTS.test(m.name || '')) errs.push(`${dirName}/${m.file} : nom du module en français (« ${m.name} »)`);
    const ROW_NAME = { repos: /^\d+\. Home row$/, haut: /^\d+\. Top row$/, bas: /^\d+\. Bottom row$/ };
    if (m.row && ROW_NAME[m.row] && !ROW_NAME[m.row].test(m.name || '')) errs.push(`${dirName}/${m.file} : le module « ${m.row} » doit s'appeler « ${i + 1}. ${{ repos: 'Home row', haut: 'Top row', bas: 'Bottom row' }[m.row]} » (les niveaux des jeux le reconnaissent par ce nom)`);
  });
  const lessons = mods.flatMap((m) => m.lessons.map((l) => ({ ...l, _m: m })));
  const ids = new Set(); const cum = new Set(); let majOn = false; const signs = new Set(); const digits = new Set(); let n = 0;
  const wrong = family === 'azerty' ? /QWERTY|qwerty/ : /AZERTY|azerty/;
  for (const l of lessons) {
    const where = `${dirName} ${l.id}`; n++;
    if (ids.has(l.id)) errs.push(`${where} : identifiant en double`); ids.add(l.id);
    for (const f of ['title', 'keys', 'tip', 'text']) if (typeof l[f] !== 'string' || !l[f].trim()) errs.push(`${where} : champ ${f} absent`);
    if (typeof l.teaches !== 'string') errs.push(`${where} : champ teaches absent`);
    const t = l.tuto;
    if (!t || !t.intro || !t.tip || !Array.isArray(t.rules) || t.rules.length < 3 || t.rules.length > 4 || t.rules.some((r) => !r.icon || !r.t || !r.d)) errs.push(`${where} : tutoriel incomplet (intro, 3 ou 4 règles icône/titre/texte, objectif)`);
    const shown = [l.title, l.tip, l.keys, t ? flatTuto(t) : ''].join(' ');
    if (/—/.test(shown) || /—/.test(l.text || '')) errs.push(`${where} : tiret cadratin`);
    if (FR_ACCENTS.test(shown) || FR_WORDS.test(shown)) errs.push(`${where} : titre, conseil ou tutoriel en français (l'interface d'un cours en anglais est en anglais) : « ${(shown.match(FR_WORDS) || shown.match(FR_ACCENTS) || [''])[0]} »`);
    if (wrong.test(shown)) errs.push(`${where} : mention du mauvais clavier dans un cours ${family.toUpperCase()}`);
    const r = ref[l.id];
    if (r && keysCore(r.keys) !== keysCore(l.keys)) errs.push(`${where} : touches « ${l.keys} » différentes du cours français (« ${r.keys} ») : l'ordre d'apprentissage doit rester le même`);
    if (r && r.teaches !== undefined && r.teaches !== l.teaches) errs.push(`${where} : teaches « ${l.teaches} » différent du cours français (« ${r.teaches} »)`);
    // touches apprises (cumul) : lettres de `keys`, signes de `keys`
    G.lettersOf(l).forEach((c) => cum.add(c));
    String(l.keys).split(/\s+/).filter((k) => k.length === 1 && !/[\p{L}\p{N}]/u.test(k)).forEach((k) => signs.add(k));
    String(l.keys).split(/\s+/).filter((k) => k.length === 1 && /\p{N}/u.test(k)).forEach((k) => digits.add(k));
    if (l._m.kind === 'majuscules') majOn = true;
    const text = l.text || '';
    if (text.length < 30) errs.push(`${where} : texte trop court (${text.length})`);
    if (text.length > (l.maxLen || 130)) errs.push(`${where} : texte trop long (${text.length} signes, maximum ${l.maxLen || 130})`);
    if (/  |^ | $/.test(text)) errs.push(`${where} : espaces en double ou en bordure`);
    if (FR_ACCENTS.test(text)) errs.push(`${where} : lettre accentuée dans un texte anglais`);
    for (const ch of text) {
      if (ch === ' ') continue;
      const lower = ch.toLowerCase();
      const isUpper = ch !== lower;
      if (/\p{L}/u.test(ch)) { if (!cum.has(lower)) errs.push(`${where} : « ${ch} » tapée avant d'être apprise`); else if (isUpper && !majOn) errs.push(`${where} : majuscule « ${ch} » avant le module des majuscules`); }
      else if (/\p{N}/u.test(ch)) { if (!digits.has(ch)) errs.push(`${where} : chiffre « ${ch} » tapé avant d'être enseigné`); }
      else if (!signs.has(ch)) errs.push(`${where} : signe « ${ch} » tapé avant d'être enseigné`);
    }
    for (const ch of String(l.teaches || '')) {
      const cnt = [...text].filter((c) => c === ch).length; const need = /\p{L}/u.test(ch) ? 8 : 6;
      if (cnt < need) errs.push(`${where} : « ${ch} » enseignée mais tapée ${cnt} fois (minimum ${need})`);
    }
    // vocabulaire
    const playable = [...lexicon].filter((w) => w.length >= 2 && [...w].every((c) => cum.has(c))).length;
    const toks = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)*/g) || []; let suites = 0;
    for (const w of toks) {
      if (w.includes("'")) { // contraction (don't, it's) : toujours un mot du lexique, jamais un exercice de doigts
        if (!lexicon.has(w)) errs.push(`${where} : « ${w} » n'est pas dans le lexique vérifié (ajouter la contraction à course-src/en-lexicon-extra-*.json)`);
        continue;
      }
      if (US_SPELLINGS.test(w) && !BRITISH_OK.has(w)) { errs.push(`${where} : « ${w} » est une orthographe américaine`); continue; }
      if (lexicon.has(w) || (l._m.kind === 'symboles' && TECH_TOKENS.has(w))) continue;
      if (w.length <= 4 && playable < 15) { suites++; continue; }
      if (w.length <= 4) { suites++; continue; }
      errs.push(`${where} : « ${w} » n'est pas dans le lexique vérifié (ajouter au fichier course-src/en-lexicon-extra-*.json puis lancer scripts/check-en-words.js)`);
    }
    // les modules de symboles (adresses, prix, code) mêlent des éléments qui ne sont pas des mots : pas de limite de proportion pour eux
    if (l._m.kind !== 'symboles' && playable >= 15 && toks.length && suites / toks.length > 0.25) errs.push(`${where} : ${suites} suites de lettres sur ${toks.length} éléments alors que ${playable} mots sont possibles : écrire de vrais mots`);
  }
  return { lessons: n, letters: cum.size, signs: signs.size };
}

function q10(opts) {
  const srcDir = (opts && opts.srcDir) || path.join(root, 'course-src');
  const only = (opts && opts.only) || process.env.LANG_COURSE || ''; // ex. LANG_COURSE=en-qwerty : ne vérifier que ce cours
  const dirs = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter((d) => /^[a-z]{2}-(qwerty|azerty)$/.test(d) && !d.startsWith('fr-') && (!only || d === only) && fs.statSync(path.join(srcDir, d)).isDirectory()) : [];
  if (!dirs.length) return { ok: true, detail: 'aucun cours de langue à vérifier' };
  const errs = []; const lexicon = loadLexicon(srcDir, errs, only); const done = [];
  for (const d of dirs) { const r = checkCourse(d, srcDir, lexicon, errs); if (r.lessons) done.push(`${d} : ${r.lessons} leçons`); }
  // Le fichier que le site charge (courses-src/<langue>-<clavier>.json), s'il existe, est EXACTEMENT ce que produit l'assembleur : jamais périmé, jamais écrit à la main.
  if (!(opts && opts.srcDir)) {
    const { build } = require('./build-qwerty-course');
    for (const d of dirs) {
      const [lang, family] = d.split('-'); const file = path.join(root, 'courses-src', `${d}.json`);
      if (!fs.existsSync(file)) continue;
      let built; try { built = build(lang, family); } catch (e) { continue; }
      if (JSON.stringify(readJson(file)) !== JSON.stringify(JSON.parse(JSON.stringify(built)))) errs.push(`courses-src/${d}.json n'est pas à jour avec ses sources (relancer node scripts/build-qwerty-course.js ${lang} ${family})`);
    }
  }
  return errs.length ? { ok: false, detail: `${errs.length} problème(s) :\n` + errs.slice(0, 15).join('\n') } : { ok: true, detail: `${done.join(' ; ') || 'dossiers vides'} (lexique de ${lexicon.size} mots)` };
}
module.exports = { q10 };
