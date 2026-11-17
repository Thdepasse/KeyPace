/* Normes typographiques des textes à taper : française (par défaut) ou belge (secrétariat-bureautique, FWB).
   Fichier pur : chargé par index.html (balise script) et par les tests Node. Aucune dépendance, aucun accès à la page.

   Les textes du site sont écrits UNE seule fois, en norme française. applyTypoNorm(text, 'be') les ramène à la norme belge
   au moment où l'exercice est chargé, avant l'affichage ET la comparaison de frappe : ce qui est attendu = ce qui est affiché.
   applyTypoNorm(text, 'fr') rend le texte strictement inchangé (aucune régression pour les utilisateurs actuels).

   Référentiel belge (tableau « Les règles d'espacement », école pilote) comparé à la norme française du site :
     . ? ! , ; : point abréviatif, … en fin de mot   0 avant, 1 après   ->  DIFFÈRE pour ? ! ; : (espace avant en français)
     ( ) [ ] guillemets                              0 à l'intérieur    ->  DIFFÈRE pour « » (guillemets droits "…" sans espace intérieure)
     … remplaçant du texte, tiret, & § + - = x % :   1 avant, 1 après   ->  identique (le : arithmétique « 12 : 2 » garde ses espaces)
     °C                                              1 avant, 0 après   ->  identique
     ° seul, trait d'union, virgule décimale, @, ', sigle, /, angles     ->  identique
   Seules deux règles changent donc : l'espace avant ? ! ; : disparaît, « x » devient "x".

   Jamais touché : URL, adresses mail, chemins (C:\…, /var/log), code entre accents graves, objets {…}, balises <…>,
   heures (8h30, 12:30 : pas d'espace avant le deux-points, rien à faire) et calculs (12 : 2).
   Une leçon peut s'exclure entièrement de la transformation avec typoNorm:false (symboles, programmation, chiffres). */
(function (root) {
  const NORMS = ['fr', 'be'];
  const DEFAULT = 'fr';
  const SP = '[ \\u00A0\\u202F]'; // espace normale, insécable, fine insécable

  function normalizeNorm(v) { return NORMS.includes(v) ? v : DEFAULT; }

  // Segments protégés, remplacés le temps de la transformation par un repère sans espace ni ponctuation.
  // Chaque motif : [regex, groupe à protéger (0 = toute la correspondance)].
  const PROTECT = [
    [/`[^`]*`/g, 0],                                   // code entre accents graves
    [/\{[^{}]*\}/g, 0],                                // objets, JSON
    [/<[^<>\s][^<>]*>/g, 0],                           // balises HTML
    [/\b(?:https?|ftp):\/\/[^\s"«»]+/gi, 0],           // URL
    [/\bwww\.[^\s"«»]+/gi, 0],
    [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, 0],              // adresses mail
    [/\b[A-Za-z]:\\[^\s"«»]*/g, 0],                    // chemins Windows
    [/(^|[\s(])(~?\/[\w.~-]+(?:\/[\w.~-]*)*)/g, 2],    // chemins Unix (/var/log, ~/projet)
  ];

  function protect(text) {
    const saved = [];
    let out = text;
    for (const [re, group] of PROTECT) {
      out = out.replace(re, (...m) => {
        const whole = m[0]; const part = m[group];
        const i = saved.push(part) - 1;
        const mark = '\uE000' + i + '\uE001';
        return group === 0 ? mark : whole.slice(0, whole.length - part.length) + mark;
      });
    }
    return { out, saved };
  }
  function restore(text, saved) {
    // Repères imbriqués possibles (un motif peut englober un repère posé avant) : on restaure jusqu'à stabilité.
    let out = text; let guard = 0;
    while (/\uE000\d+\uE001/.test(out) && guard++ < 10) out = out.replace(/\uE000(\d+)\uE001/g, (_, i) => saved[+i]);
    return out;
  }

  // Espace avant ? ! ; : supprimée seulement quand le signe est de la ponctuation de phrase : suivi d'une espace, de la fin,
  // d'un guillemet, d'une parenthèse/crochet fermant ou d'un autre signe final (« vraiment ?! »). Les exercices de touches du
  // type « a; ;a » restent intacts (« ;a » : le signe est collé à la lettre suivante).
  const BEFORE_PUNCT = new RegExp('(\\S)' + SP + '+([?!;:])(?=' + SP + '|$|["»)\\]?!.…])', 'g');
  // Deux-points arithmétique (« 12 : 2 = 6 ») : division, garde ses espaces.
  const ARITH_COLON = new RegExp('(\\d)' + SP + '+:' + SP + '+(?=\\d)', 'g');

  function applyTypoNorm(text, norm) {
    if (typeof text !== 'string' || normalizeNorm(norm) !== 'be' || !text) return text;
    const { out, saved } = protect(text);
    let t = out;
    // Division protégée (repère) pour ne pas coller son deux-points.
    const arith = [];
    t = t.replace(ARITH_COLON, (m, d) => { arith.push(m.slice(1)); return d + '\uE002' + (arith.length - 1) + '\uE003'; });
    // Guillemets français -> droits, sans espace intérieure (l'espace extérieure est gardée).
    t = t.replace(new RegExp('«' + SP + '*', 'g'), '"').replace(new RegExp(SP + '*»', 'g'), '"');
    t = t.replace(BEFORE_PUNCT, '$1$2');
    t = t.replace(/\uE002(\d+)\uE003/g, (_, i) => arith[+i]);
    return restore(t, saved);
  }

  // Une leçon (objet du programme) accepte-t-elle la transformation ? Non si elle porte typoNorm:false.
  function lessonAllowsNorm(lesson) { return !(lesson && lesson.typoNorm === false); }

  const api = { NORMS, DEFAULT, normalizeNorm, applyTypoNorm, lessonAllowsNorm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KPTypoNorm = api;
})(typeof window !== 'undefined' ? window : globalThis);
