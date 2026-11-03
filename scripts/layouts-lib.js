// Format de disposition de clavier (schéma 1) : outils partagés par le script d'extraction, la
// validation et les tests. Voir docs/PLAN-clavier-qwerty.md, section 4.2.
//
// Une touche : { c: KeyboardEvent.code, l: caractère sans Maj (ou chiffre affiché), s: avec Maj,
//   g: AltGr/Option, gs: AltGr+Maj, f: doigt, home: touche de repos, nd: touche non numérique de la
//   rangée des chiffres }. `c` identifie la TOUCHE PHYSIQUE : c'est elle qui permet de partager le
//   programme entre claviers (voir le plan, 4.3).
const SCHEMA_VERSION = 1;
const FINGERS = ['lp', 'lr', 'lm', 'li', 'ri', 'rm', 'rr', 'rp', 'th'];

// Touches physiques d'un clavier ISO, rangée par rangée, dans l'ordre des tableaux de index.html.
const ROW_CODES = [
  ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
  ['IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
];
const EXTRA_CODES = { tlde: ['Backquote'], ae: ['Minus', 'Equal'], ad: ['BracketLeft', 'BracketRight'], ac: ['Quote', 'Backslash'] };

function validateLayout(def) {
  const errors = [];
  const err = (m) => errors.push(m);
  if (def.schemaVersion !== SCHEMA_VERSION) err(`schemaVersion ${def.schemaVersion} (attendu ${SCHEMA_VERSION})`);
  for (const k of ['id', 'family', 'variant', 'label']) if (typeof def[k] !== 'string' || !def[k]) err(`champ ${k} manquant`);
  if (!Array.isArray(def.rows) || def.rows.length !== 4) err('rows : 4 rangées attendues');
  const seen = new Set();
  const check = (key, where) => {
    if (typeof key.c !== 'string') return err(`${where} : code manquant`);
    if (seen.has(key.c)) err(`${where} : code ${key.c} en double`);
    seen.add(key.c);
    if (typeof key.l !== 'string' || !key.l) err(`${where} : caractère manquant`);
    if (!FINGERS.includes(key.f)) err(`${where} : doigt inconnu (${key.f})`);
  };
  (def.rows || []).forEach((row, r) => {
    if (row.length !== ROW_CODES[r].length) err(`rangée ${r} : ${row.length} touches (attendu ${ROW_CODES[r].length})`);
    row.forEach((k, i) => { check(k, `rangée ${r} touche ${i}`); if (k.c !== ROW_CODES[r][i]) err(`rangée ${r} touche ${i} : code ${k.c} (attendu ${ROW_CODES[r][i]})`); });
  });
  for (const [slot, codes] of Object.entries(EXTRA_CODES)) {
    const keys = (def.extra || {})[slot] || [];
    if (keys.length !== codes.length) err(`extra.${slot} : ${keys.length} touches (attendu ${codes.length})`);
    keys.forEach((k, i) => { check(k, `extra.${slot}[${i}]`); if (k.c !== codes[i]) err(`extra.${slot}[${i}] : code ${k.c} (attendu ${codes[i]})`); });
  }
  if (typeof def.how !== 'object' || !def.how) err('how : gestes manquants');
  return errors;
}

// Deux variantes peuvent partager un cours (même famille) seulement si leurs LETTRES de base
// sont identiques : mêmes lettres sur les mêmes touches physiques.
function letterMap(def) {
  const m = {};
  for (const row of def.rows) for (const k of row) if (/^[A-Za-z]$/.test(k.l)) m[k.c] = k.l;
  return m;
}
function sameLetters(a, b) {
  const x = letterMap(a), y = letterMap(b);
  const ks = Object.keys(x);
  return ks.length === Object.keys(y).length && ks.every((k) => x[k] === y[k]);
}

module.exports = { SCHEMA_VERSION, FINGERS, ROW_CODES, EXTRA_CODES, validateLayout, letterMap, sameLetters };
