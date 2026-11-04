// Générateur des leçons de lettres (modules 1 à 3 : r, h, b) pour un cours français sur clavier QWERTY.
// Les 18 leçons AZERTY enseignent les touches dans un ordre propre à l'AZERTY (le texte de h3 utilise le z, appris en b4 sur QWERTY).
// Ici l'ordre suit les MÊMES touches physiques, mais les textes sont recomposés avec les seules lettres déjà apprises.
//   - r (position de base) : suites de lettres à entraîner (aucun mot imposé) ;
//   - h, b : mots français filtrés (liste du site) ne contenant que des lettres apprises, avec les nouvelles lettres bien représentées.
// Sortie : courses-src/fr-qwerty.json (donnée, relue par un humain). Déterministe : même entrée = même sortie (gate Q4).
// Usage : node scripts/build-qwerty-lessons.js           (écrit le fichier)
const fs = require('fs');
const path = require('path');
const { loadApp } = require('./engine-harness');

const root = path.join(__dirname, '..');
const OUT = path.join(root, 'courses-src', 'fr-qwerty.json');
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

// Ordre = mêmes touches physiques que les leçons AZERTY (r4 : touches A-Q-M de l'AZERTY = A et ; en QWERTY, etc.)
// kind : 'drill' = suites de lettres ; 'words' = mots filtrés. punct : signe de ponctuation introduit par la leçon (ajouté au texte).
const SEQ = [
  { id: 'r1', kind: 'drill', add: 'fj' },
  { id: 'r2', kind: 'drill', add: 'dk' },
  { id: 'r3', kind: 'drill', add: 'sl' },
  { id: 'r4', kind: 'drill', add: 'a;', title: 'A et point-virgule, les auriculaires', keys: 'a ;', tip: "Les auriculaires (petits doigts) sont les moins forts, c'est normal. A à gauche, point-virgule à droite. Évite de tourner tout le poignet : laisse juste l'auriculaire s'étirer légèrement." },
  { id: 'r5', kind: 'drill', add: 'gh' },
  { id: 'r6', kind: 'drill', add: '', review: 'asdfghjkl;', title: 'Révision : toute la rangée de repos', keys: 'a s d f g h j k l ;', tip: "Révision complète de la rangée de repos. C'est ta base : tous tes doigts y reviennent après chaque frappe. Prends ton temps, la régularité compte plus que la vitesse." },
  { id: 'h1', kind: 'words', add: 'ru' },
  { id: 'h2', kind: 'words', add: 'ei' },
  { id: 'h3', kind: 'words', add: 'wo', title: 'W et O, des mots plus variés', keys: 'w o', tip: "W est à l'annulaire gauche (rangée du haut), O à l'annulaire droit. Tu commences à former des mots plus variés. Essaie de lire le mot suivant pendant que tu tapes le mot en cours : c'est ce qu'on appelle l'anticipation." },
  { id: 'h4', kind: 'words', add: 'qp', title: 'Q et P, les auriculaires du haut', keys: 'q p', tip: "Q est à l'auriculaire gauche (haut), P à l'auriculaire droit. Les auriculaires sur la rangée du haut demandent un léger étirement : garde le poignet stable et laisse le doigt faire le travail." },
  { id: 'h5', kind: 'words', add: 'ty' },
  { id: 'h6', kind: 'words', add: '', review: 'qwertyuiop', title: 'Révision : toute la rangée du haut', keys: 'q w e r t y u i o p', tip: null },
  { id: 'b1', kind: 'words', add: 'cm', title: 'C et M, la rangée du bas', keys: 'c m', tip: "Tu attaques la rangée du bas. C est au majeur gauche (un peu plus bas que D), M à l'index droit (en bas, sous J). Pour la rangée du bas, laisse les doigts descendre naturellement : le poignet peut légèrement s'abaisser." },
  { id: 'b2', kind: 'words', add: 'vn' },
  { id: 'b3', kind: 'words', add: 'x,', punct: ',', title: 'X et virgule', keys: 'x ,', tip: "X est à l'annulaire gauche bas : c'est un mouvement diagonal peu courant. La virgule se tape au majeur droit, en bas. Prends le temps de localiser chaque touche avant d'accélérer." },
  { id: 'b4', kind: 'words', add: 'z.', punct: '.', title: 'Z et point', keys: 'z .', tip: "Z est à l'auriculaire gauche bas, le point à l'annulaire droit, en bas à droite de la virgule. Tape le point sans regarder : c'est la touche qui termine chaque phrase." },
  { id: 'b5', kind: 'words', add: 'b/', punct: '/', title: 'B et barre oblique', keys: 'b /', tip: "B est à l'index gauche bas (côté centre) ; la barre oblique / est à l'auriculaire droit, en bas à droite du point. Tu couvres maintenant les 26 lettres de l'alphabet : c'est un cap important ! Chaque texte réel sera désormais accessible." },
  { id: 'b6', kind: 'words', add: '', review: ALPHA, title: null, keys: "tout l'alphabet", tip: null },
];
// Paires usuelles pour la barre oblique (b5) : uniquement des mots français réels.
const SLASH_PAIRS = ['oui/non', 'vrai/faux', 'haut/bas', 'jour/nuit', 'bon/mal', 'grand/petit', 'blanc/noir', 'sec/humide'];

// Leçons des modules 4 à 6 et 13 : phrases et ponctuation. Elles ne dépendent pas de l'ordre des touches (mêmes ensembles de lettres
// par main sur AZERTY et QWERTY), donc la plupart sont reprises telles quelles du cours AZERTY (liste REUSE, vérifiée par la gate Q5).
// Seuls les textes qui contiennent un accent AVANT le module des accents sont réécrits sans accent : sur AZERTY l'accent est une
// touche directe, sur QWERTY il demande un geste (touche morte) que l'élève n'a pas encore appris.
// Accents, circonflexes, tréma, chiffres, symboles (modules 7 à 12) : comme pour les 4 AZERTY (français, belge, Mac, NF), les leçons sont
// LES MÊMES pour toutes les variantes d'une famille ; seul le geste affiché change (KB_HOW par variante, lu dans le modèle de la variante).
// Ce qu'une variante ne sait pas taper est mesuré par la gate Q2 et se règle par les accents tolérés (D5).
const REUSE = ['w1', 'w2', 'w3', 'w4', 'w5', 'maj1', 'maj2', 'maj4', 'pon1',
  'acc4', 'cir1', 'cir2', 'cir3', 'cir4', 'tre1', 'tre2', 'tre3',
  'num1', 'num2', 'num3', 'num4', 'num5', 'num6', 'sym1', 'sym2', 'sym3', 'sym4', 'sym5', 'sym6', 'sym7', 'sym8', 'sym9',
  'flu1', 'flu2', 'flu3', 'flu4', 'flu5'];
// Caractères propres au français enseignés par chaque leçon (d'après son titre et ses touches) : sert à la gate Q6.
const ACCENT_TAUGHT = { acc1: 'éÉ', acc2: 'èÈ', acc3: 'àÀùÙ', acc4: 'ùÙçÇ', acc5: 'éèàùçÉÈÀÙÇ', cir1: 'âêÂÊ', cir2: 'îôÎÔ', cir3: 'ûÛ', cir4: 'âêîôûÂÊÎÔÛ', tre1: 'ëïËÏ', tre2: 'œŒæÆ', tre3: 'ëïœŒæÆ' };
const ADAPTED = {
  maj3: { text: 'Paris Lyon Bruxelles Berlin Tokyo Rome Marie Jean Sophie Pierre Hugo Luc Anna Emma Paul Clara', why: 'Genève (accent grave) retiré : accents appris au module 7' },
  pon2: { text: 'viens ici ! attention ! quel beau jour ! vraiment ? super ! bravo ! encore ? tu veux jouer ? oui ! allons vite !', why: 'où es-tu ? retiré (ù) ; fais-tu et c\'est retirés : tiret et apostrophe ne sont enseignés qu\'en pon4' },
  pon3: { text: 'voici la liste : pain, lait, riz ; beurre, sel, sucre ; eau, jus, miel. trois mots : calme, force, patience.', why: 'café, thé, règles, brièveté… remplacés par des mots sans accent' },
  pon4: { text: "c'est l'heure qu'il aime. l'ami de paul arrive tout seul. vingt-cinq enfants jouent dans la rue. peut-on y aller ?", why: "d'où, l'idée, d'aujourd'hui, élèves, présents retirés (accents)" },
  pon5: { text: 'il dit : « bonjour ». elle dit : « merci ». le total (trois) est juste. bonne nuit (enfin) !', why: 'répond, résultat, journée (accents) et (42) (chiffres, appris au module 10) retirés' },
  pon6: { text: "« Viens vite ! » dit-il. Elle dit : « J'arrive ; attends-moi. » Vingt-cinq minutes plus tard (enfin), elle arriva.", why: 'répondit (é) remplacé par dit' },
  acc1: { text: 'été café écran étoile étude écrire échec éclat réel série épée érable énergie café été', why: "élève et ébène (è) retirés : le è s'enseigne en acc2, et sur QWERTY son geste n'est pas encore connu" },
  acc2: { text: 'père mère frère très près après dès fière rivière lumière. été, très près. père préfère le café. très bien.', why: 'fenêtre (ê) retiré : le circonflexe s\'enseigne au module 8' },
  acc3: { text: 'voilà déjà là-bas à droite. où es-tu ? là-haut, à gauche. père et mère sont déjà là. voilà le café.', why: 'à côté (ô) remplacé par à droite : le circonflexe s\'enseigne au module 8' },
  acc5: { text: "déjà à l'été, le café et la façon d'écrire. très près de là où père et mère écrivent la leçon de français.", why: "d'être (ê) remplacé par d'écrire : le circonflexe s'enseigne au module 8" },
  flu6: { text: "Écrire vite s'apprend avec de la régularité ; entraîne-toi chaque jour, garde les yeux sur l'écran, et laisse tes doigts trouver leur place tout seuls sur le clavier QWERTY. Bonne chance !", why: 'le texte citait le clavier AZERTY' },
};
// Signes appris, de leçon en leçon, pour les modules 4 à 6 (vérifié par la gate Q5). Les lettres sont toutes apprises dès b5.
const INTRO_ORDER = ['w1', 'w2', 'w3', 'w4', 'w5', 'maj1', 'maj2', 'maj3', 'maj4', 'pon1', 'pon2', 'pon3', 'pon4', 'pon5', 'pon6'];
const INTRO = { maj1: 'CAPS', pon2: '?!', pon3: ':', pon4: "'-", pon5: '«»()"' }; // ',' '.' ';' viennent des leçons r4, b3, b4

function rngFor(seedStr) {
  let h = 2166136261 >>> 0; for (const c of seedStr) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Réserve de mots : listes de mots du site (jeux, tous niveaux) + textes des leçons de mots AZERTY (h, b, w : textes relus à la main),
// sans accent ni trait d'union, avec une voyelle. On N'utilise PAS les textes des modules 5 et suivants : ils contiennent des noms
// propres, des sigles et des fragments (Maj + lettres, adresses, « aujourd » coupé à l'apostrophe).
function wordPool(h) {
  const lists = JSON.parse(h.run('JSON.stringify([...WORDS,...SPRINT_WORDS,...GAME_TIERS.flatMap(t=>t.words)])'));
  const lessonTexts = JSON.parse(h.run("JSON.stringify(ALL_LESSONS.filter(l=>/^(h|b|w)\\d/.test(l.id)).map(l=>l.text||''))"));
  const set = new Set();
  for (const w of lists) set.add(String(w).toLowerCase());
  for (const t of lessonTexts) for (const w of t.toLowerCase().match(/[a-z]+/g) || []) set.add(w);
  return [...set].filter((w) => /^[a-z]{2,9}$/.test(w) && /[aeiouy]/.test(w)).sort();
}

function learnedAfter(i) { let s = ''; for (let k = 0; k <= i; k++) s += SEQ[k].add || SEQ[k].review || ''; return s; }

function drillText(step, learned, rnd) {
  const isNew = step.review ? step.review.split('') : step.add.split('');
  const letters = learned.split('');
  const tokens = [];
  // Une paire des nouvelles touches en miroir, comme les leçons actuelles (fj jf fjfj jfjf ffjj jjff).
  if (!step.review && isNew.length === 2) { const [a, b] = isNew; tokens.push(a + b, b + a, a + b + a + b, b + a + b + a, a + a + b + b, b + b + a + a); }
  let guard = 0;
  while (tokens.length < 18 && guard++ < 500) {
    const len = 2 + Math.floor(rnd() * 3); // 2 à 4 touches
    let tok = ''; const pos = Math.floor(rnd() * len);
    for (let i = 0; i < len; i++) tok += (i === pos ? isNew[Math.floor(rnd() * isNew.length)] : letters[Math.floor(rnd() * letters.length)]);
    if (tokens.includes(tok) || /^(.)\1+$/.test(tok)) continue;
    tokens.push(tok);
  }
  return shuffle(tokens, rnd).join(' ');
}

function wordsText(step, learned, pool, rnd) {
  const L = new Set(learned.split(''));
  const isNew = new Set((step.review ? step.review : step.add).split('').filter((c) => /[a-z]/.test(c)));
  const cand = pool.filter((w) => [...w].every((c) => L.has(c)));
  const perLetter = step.review ? 2 : 4;
  const chosen = [];
  const take = (w) => { if (!chosen.includes(w)) chosen.push(w); };
  for (const n of isNew) {
    const withN = shuffle(cand.filter((w) => w.includes(n)), rnd)
      .sort((a, b) => ([...b].filter((c) => isNew.has(c)).length - [...a].filter((c) => isNew.has(c)).length) || (a.length - b.length) || 0);
    let got = chosen.filter((w) => w.includes(n)).length;
    for (const w of withN) { if (got >= perLetter) break; if (!chosen.includes(w)) { take(w); got++; } }
  }
  const target = step.review ? 24 : 20;
  for (const w of shuffle(cand.filter((w) => [...w].some((c) => isNew.has(c))), rnd)) { if (chosen.length >= target) break; take(w); }
  for (const w of shuffle(cand, rnd)) { if (chosen.length >= target) break; take(w); }
  // Peu de mots disponibles (début du cours) : on répète les mots déjà choisis, comme les leçons actuelles.
  let guard = 0;
  while (chosen.length >= 6 && chosen.length < target && guard++ < 200) chosen.push(shuffle(chosen.filter((w) => [...w].some((c) => isNew.has(c))).concat(chosen), rnd)[0]);
  let words = shuffle(chosen, rnd);
  // Longueur plafonnée (comme les leçons actuelles) : on retire les derniers mots en trop.
  while (words.join(' ').length > 160 && words.length > 8) words.pop();
  // Pas assez de mots pour une nouvelle lettre (ex. w à l'étape h3 : seul « kiwi » est tapable) : on complète par de courtes
  // suites de lettres contenant cette lettre, signalées dans `fill` (la gate Q4 les distingue des mots).
  const fill = [];
  const vowels = learned.split('').filter((c) => 'aeiou'.includes(c));
  for (const n of isNew) {
    let cnt = [...words.join(' ')].filter((c) => c === n).length;
    let tries = 0;
    const want = step.review ? 1 : 4; // en révision, une lettre déjà présente dans un vrai mot ne reçoit pas de complément
    while (cnt < want && tries++ < 20) {
      const v = vowels[Math.floor(rnd() * vowels.length)];
      const tok = rnd() < 0.5 ? n + v : v + n + (rnd() < 0.5 ? v : '');
      if (fill.includes(tok) || words.includes(tok)) continue;
      fill.push(tok); words.splice(Math.floor(rnd() * (words.length + 1)), 0, tok); cnt += [...tok].filter((c) => c === n).length;
    }
  }
  if (step.punct === ',') words = words.map((w, i) => (i % 3 === 2 && i < words.length - 1 ? w + ',' : w));
  if (step.punct === '.') words = words.map((w, i) => (i % 4 === 3 && i < words.length - 1 ? w + '.' : w));
  if (step.punct === '/') { const pairs = shuffle(SLASH_PAIRS, rnd).slice(0, 3); const out = words.slice(0, 14); pairs.forEach((p, k) => out.splice(2 + k * 5, 0, p)); words = out; }
  return { text: words.join(' '), fill };
}

function build() {
  const h = loadApp();
  const az = JSON.parse(h.run("JSON.stringify(ALL_LESSONS.map(l=>({id:l.id,title:l.title,keys:l.keys,tip:l.tip,module:l.module,moduleIdx:l.moduleIdx})))"));
  const azById = Object.fromEntries(az.map((l) => [l.id, l]));
  const azCourseOrder = az.map((l) => l.id);
  const pool = wordPool(h);
  const lessons = {};
  SEQ.forEach((step, i) => {
    const learned = [...new Set(learnedAfter(i))].join('');
    const rnd = rngFor('fr-qwerty/' + step.id);
    const src = azById[step.id];
    let text, fill = [];
    if (step.kind === 'drill') text = drillText(step, learned, rnd); else ({ text, fill } = wordsText(step, learned, pool, rnd));
    lessons[step.id] = {
      title: step.title || src.title,
      keys: step.keys || src.keys,
      tip: step.tip || src.tip,
      module: src.module, moduleIdx: src.moduleIdx,
      kind: step.kind,
      learned, // lettres et signes appris à la fin de cette leçon (vérifié par la gate Q4)
      newKeys: (step.review ? '' : step.add),
      ...(fill.length ? { fill } : {}),
      text,
    };
  });
  for (const [id, a] of Object.entries(ADAPTED)) {
    const src = azById[id];
    lessons[id] = { title: src.title, keys: src.keys, tip: src.tip, module: src.module, moduleIdx: src.moduleIdx, kind: 'adapted', text: a.text, why: a.why };
  }
  const T = require('./qwerty-tutos');
  // Forme « programme complet » (le cours apporte ses modules et ses leçons) : le cours actuel y est matérialisé tel qu'il est, leçon par leçon.
  const azFull = JSON.parse(h.run("JSON.stringify(ALL_MODULES.map(m=>({name:m.name,lessons:m.lessons.map(l=>({id:l.id,title:l.title,keys:l.keys,tip:l.tip,tuto:l.tuto,text:l.text,genNum:l.genNum,neu:l.neu,review:l.review}))})))"));
  const howText = new Set(JSON.parse(h.run('JSON.stringify(KB_HOW_TEXT_LESSONS)')));
  const curriculum = {
    modules: azFull.map((m) => ({
      name: T.moduleNames[m.name] || m.name,
      lessons: m.lessons.map((l) => {
        const o = lessons[l.id]; const out = { id: l.id, title: (o && o.title) || l.title, keys: (o && o.keys) || l.keys };
        const tip = o && typeof o.tip === 'string' ? o.tip : l.tip; if (tip !== undefined) out.tip = tip;
        const text = o && typeof o.text === 'string' ? o.text : l.text; if (text !== undefined) out.text = text;
        const tuto = T.tutos[l.id] || l.tuto; if (tuto !== undefined) out.tuto = tuto;
        for (const f of ['genNum', 'neu', 'review']) if (l[f] !== undefined) out[f] = l[f];
        if (howText.has(l.id)) out.howText = true;
        return out;
      }),
    })),
  };
  // Modules ÉCRITS À LA MAIN (course-src/fr-qwerty/NN-nom.json) : ils remplacent le module AZERTY de même rang (« replaces »). Leurs leçons ne
  // passent plus par le générateur ni par les tables lessons/tutos ci-dessus (retirées), mais par les gates sur le programme final (Q9).
  const handwritten = [];
  const srcDir = path.join(root, 'course-src', 'fr-qwerty');
  const srcFiles = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter((x) => /^\d\d-.*\.json$/.test(x)).sort() : [];
  const tutos = { ...T.tutos };
  for (const f of srcFiles) {
    const m = JSON.parse(fs.readFileSync(path.join(srcDir, f), 'utf8'));
    curriculum.modules[m.replaces - 1] = { name: m.name, row: m.row, lessons: m.lessons.map((l) => ({ ...l })) };
    for (const l of m.lessons) { handwritten.push(l.id); delete lessons[l.id]; delete tutos[l.id]; }
  }
  curriculum.free = curriculum.modules.flatMap((m) => m.lessons).slice(0, 10).map((l) => l.id);
  const allTexts = JSON.parse(h.run("JSON.stringify(ALL_LESSONS.flatMap(l=>[l.text||'',l.keys||'']))")).concat(curriculum.modules.flatMap((m) => m.lessons).flatMap((l) => [l.text || '', l.keys]));
  const keyboards = require('./build-qwerty-keyboards').buildKeyboards(allTexts);
  return {
    schema: 1, id: 'fr/qwerty',
    note: 'Généré par scripts/build-qwerty-lessons.js (mots filtrés, aucun texte écrit à la main sauf titres et conseils des leçons qui changent). À relire avant ouverture du cours.',
    order: SEQ.map((s) => s.id), courseOrder: azCourseOrder, reuse: REUSE, introOrder: INTRO_ORDER, moduleNames: T.moduleNames, tutos, keyboards, handwritten, curriculum, lessons,
  };
}

if (require.main === module) {
  const out = build();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  for (const l of out.curriculum.modules.flatMap((m) => m.lessons)) console.log(l.id.padEnd(5), String(l.keys).padEnd(24), (l.text || '(chiffres générés)').slice(0, 80));
}
module.exports = { ACCENT_TAUGHT, build, SEQ, SLASH_PAIRS, OUT, wordPool, REUSE, ADAPTED, INTRO_ORDER, INTRO };
