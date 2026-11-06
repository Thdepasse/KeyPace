/* Niveaux des jeux : à partir des lettres apprises dans le cours actif (AZERTY ou QWERTY).
   Fichier pur : chargé par index.html (balise script) et par les tests Node. Il ne contient AUCUNE lettre écrite en dur :
   les lettres connues à chaque étape sont lues dans les leçons du cours (champ `keys`), donc le cours QWERTY (F J en premier,
   rangée par rangée) fonctionne sans réécriture.

   Un niveau = un ensemble de lettres connues. Les niveaux proposés à l'élève :
     auto      « Mon niveau » : les lettres des leçons déjà validées (calculé, jamais choisi en dur)
     repos     fin du module « Position de base »
     haut      fin du module « Rangée du haut »
     alphabet  fin du module « Rangée du bas » (les 26 lettres)
     accents   fin de la dernière leçon qui apporte une lettre accentuée
     tout      aucun filtre : l'expérience actuelle des jeux (seul niveau qui compte pour les records)
   Un niveau absent du cours n'est pas proposé. */
(function (root) {
  const LETTER = /^[a-zàâçèéêëîïôùûœæ]$/;

  // Lettres qu'une leçon présente : les éléments du champ `keys` qui sont UNE lettre (« f j », « é », « â ê î ô û »).
  // Les mots du champ (« toutes lettres », « fluidité », « puis ») ne comptent pas.
  function lettersOf(lesson) {
    return String((lesson && lesson.keys) || '').toLowerCase().split(/\s+/).filter((t) => LETTER.test(t));
  }

  // Ensembles cumulés : sets[i] = lettres connues une fois la leçon i (0-based) terminée.
  function cumulative(lessons) {
    const out = []; const cur = new Set();
    for (const l of lessons) { lettersOf(l).forEach((c) => cur.add(c)); out.push(new Set(cur)); }
    return out;
  }

  const inModule = (l, re) => re.test(String((l && l.module) || ''));
  function lastIndexWhere(lessons, pred) { for (let i = lessons.length - 1; i >= 0; i--) if (pred(lessons[i], i)) return i; return -1; }

  // Les niveaux fixes du cours : { id, label, lesson (index de la dernière leçon incluse), letters (Set) }
  function levels(lessons) {
    const sets = cumulative(lessons); const out = [];
    const add = (id, label, idx) => { if (idx >= 0) out.push({ id, label, lesson: idx, letters: sets[idx] }); };
    add('repos', 'Rangée de repos', lastIndexWhere(lessons, (l) => inModule(l, /Position de base/i)));
    add('haut', 'Rangée du haut', lastIndexWhere(lessons, (l) => inModule(l, /Rang[ée]e du haut/i)));
    add('alphabet', 'Alphabet complet', lastIndexWhere(lessons, (l) => inModule(l, /Rang[ée]e du bas/i)));
    // accents : première leçon qui apporte une lettre accentuée, jusqu'à la dernière qui en apporte une
    let last = -1; const seen = new Set();
    lessons.forEach((l, i) => { if (lettersOf(l).some((c) => /[^a-z]/.test(c) && !seen.has(c))) last = i; lettersOf(l).forEach((c) => seen.add(c)); });
    add('accents', 'Avec les accents', last);
    return out;
  }

  // « Mon niveau » : lettres des leçons terminées d'affilée depuis la première (au moins la première leçon : l'élève la travaille).
  function myLevel(lessons, isCleared) {
    let n = 0; while (n < lessons.length && isCleared(lessons[n])) n++;
    const sets = cumulative(lessons);
    const idx = Math.max(n, 1) - 1;
    return { id: 'auto', label: 'Mon niveau', lesson: idx, done: n, letters: sets[idx] || new Set() };
  }

  // Suites de lettres pour les niveaux où il n'existe presque aucun mot (avant la leçon 7 : 0 mot jouable). Règles : 2 à 4 lettres tirées
  // des lettres connues, jamais trois fois la même d'affilée, pas deux fois la même suite de suite. `rnd` : générateur injectable (tests).
  function suites(letters, count, rnd) {
    const L = [...letters].filter((c) => LETTER.test(c)); const r = rnd || Math.random; const out = [];
    if (L.length < 2) return out;
    const longMax = L.length >= 6 ? 4 : 3; let prev = ''; let guard = 0;
    while (out.length < count && guard++ < count * 50) { // garde : un tirage constant ne doit jamais bloquer la page
      const len = 2 + Math.floor(r() * (longMax - 1)); let s = '';
      while (s.length < len) {
        let i = Math.floor(r() * L.length) % L.length;
        if (s.length >= 2 && s[s.length - 1] === L[i] && s[s.length - 2] === L[i]) i = (i + 1) % L.length; // pas trois fois la même lettre
        s += L[i];
      }
      if (s !== prev) { out.push(s); prev = s; }
    }
    return out;
  }

  // Contenu d'un jeu de mots pour un ensemble de lettres : les vrais mots dont toutes les lettres sont connues ; s'il y en a moins que
  // `minWords`, on complète avec des suites de lettres. Un mot avec un signe (trait d'union, apostrophe) n'est jamais proposé ici.
  function contentFor(vocab, letters, opts) {
    const o = Object.assign({ minWords: 15, suitesCount: 40, rnd: null }, opts || {});
    const set = letters instanceof Set ? letters : new Set(letters);
    const words = [...new Set(vocab.filter((w) => w.length >= 2 && [...w.toLowerCase()].every((c) => set.has(c))))];
    if (words.length >= o.minWords) return { words, suites: [], pool: words, mixed: false };
    const s = suites(set, o.suitesCount, o.rnd);
    return { words, suites: s, pool: words.concat(s), mixed: true };
  }

  // Tirage déterministe (même graine, même suite) : sert à fixer le texte du Fantôme à un niveau donné.
  function seededRnd(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

  // Texte de `count` mots (ou suites) tirés du contenu d'un niveau, séparés par des espaces, jamais deux fois le même d'affilée.
  function textFor(vocab, letters, count, opts) {
    const o = Object.assign({ rnd: null, minWords: 15 }, opts || {}); const r = o.rnd || Math.random;
    const pool = contentFor(vocab, letters, { minWords: o.minWords, rnd: r }).pool;
    if (!pool.length) return '';
    const out = []; let prev = null; let guard = 0;
    while (out.length < count && guard++ < count * 30) { const w = pool[Math.floor(r() * pool.length)]; if (w !== prev || pool.length === 1) { out.push(w); prev = w; } }
    return out.join(' ');
  }

  const api = { lettersOf, cumulative, levels, myLevel, suites, contentFor, seededRnd, hash, textFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KPGameLevels = api;
})(typeof window !== 'undefined' ? window : globalThis);
