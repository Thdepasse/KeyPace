// Claviers QWERTY proposés par le site, au FORMAT DU SITE (KB_LAYOUTS / KB_EXTRA / KB_HOW de index.html), produits depuis nos modèles
// vérifiés (layouts-src/*.json, schéma 2, par code physique). Sert à : la surbrillance de la prochaine touche, l'aperçu du clavier dans les
// Réglages, et le bloc « Sur ton clavier (…) » des leçons (geste exact de CETTE variante, déduit du modèle par scripts/gesture.js).
// Sortie : clé `keyboards` du fichier courses-src/fr-qwerty.json (voir build-qwerty-lessons.js).
const fs = require('fs');
const path = require('path');
const { gestureFor } = require('./gesture');

const root = path.join(__dirname, '..');
// Variantes proposées (choix fait par l'utilisateur : « tous les claviers dans les paramètres », sans les doublons de sources).
// iso : touche supplémentaire à gauche de W (UK, britannique). mac : Option au lieu d'AltGr.
const VARIANTS = [
  { id: 'windows-us', short: 'US', label: 'États-Unis (US)', iso: false, mac: false },
  { id: 'windows-us-intl', short: 'US intl', label: 'États-Unis international', iso: false, mac: false },
  { id: 'windows-uk', short: 'UK', label: 'Royaume-Uni (UK)', iso: true, mac: false },
  { id: 'windows-uk-extended', short: 'UK étendu', label: 'Royaume-Uni étendu', iso: true, mac: false },
  { id: 'mac-us', short: 'Mac US', label: 'Mac, États-Unis (ABC)', iso: false, mac: true },
  { id: 'mac-us-intl-pc', short: 'Mac US intl', label: 'Mac, États-Unis international PC', iso: false, mac: true },
  { id: 'mac-british', short: 'Mac UK', label: 'Mac, Royaume-Uni', iso: true, mac: true },
  { id: 'linux-us-intl', short: 'Linux US intl', label: 'Linux, États-Unis international', iso: false, mac: false },
];
const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
const TOP = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];
const HOME = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'];
const BOTTOM = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'];

// Une touche morte n'imprime pas toujours un signe seul dans le modèle (l = null) : on dessine le signe qui est gravé sur la touche.
const DEADSYM = { acute: "'", diaeresis: '"', grave: '`', tilde: '~', circumflex: '^' };
const key = (def, code, isHome) => {
  const k = def.keys[code]; if (!k) throw new Error(`${def.id} : touche ${code} absente`);
  let l = k.l, s = k.s;
  if (!l && k.dead && k.dead.l) l = DEADSYM[k.dead.l];
  if (!s && k.dead && k.dead.s) s = DEADSYM[k.dead.s];
  if (!l) throw new Error(`${def.id} : touche ${code} sans signe à dessiner`);
  const letter = /^[a-z]$/.test(l);
  const o = { l: letter ? l.toUpperCase() : l, f: k.f };
  if (!letter && s) o.s = s;
  if (k.g && k.g !== l) o.g = k.g;
  if (k.gs && k.gs !== s) o.gs = k.gs;
  if (isHome) o.home = true;
  return o;
};

// Nom d'une touche pour un humain : sa lettre ou son signe de base, jamais le code physique.
const label = (def, p) => {
  if (p.code === 'Space') return 'Espace';
  const k = def.keys[p.code]; const c = k.l;
  return /^[a-z]$/.test(c) ? c.toUpperCase() : c;
};
function describe(def, g, mac) {
  const isDead = (p) => { const k = def.keys[p.code]; const lv = p.alt ? (p.shift ? 'gs' : 'g') : (p.shift ? 's' : 'l'); return !!(k && k.dead && k.dead[lv]); };
  return g.map((p, i) => {
    const mods = (p.shift ? 'Maj + ' : '') + (p.alt ? (mac ? 'Option (⌥) + ' : 'AltGr + ') : '');
    const lab = label(def, p);
    // une lettre qui suit une touche morte : « la lettre E » plutôt que « touche E »
    const txt = p.code === 'Space' ? 'Espace' : (mods ? mods + lab : (i > 0 && /^[A-Z]$/.test(lab) ? 'la lettre ' + lab : 'touche ' + lab));
    return txt + (isDead(p) && g.length > 1 && i === 0 ? ' (touche morte)' : '');
  }).join(', puis ');
}

function howFor(def, mac, chars) {
  const how = {};
  for (const ch of chars) {
    const g = gestureFor(def, ch);
    if (g) how[ch] = describe(def, g, mac);
    else if (ch === '«' || ch === '»') how[ch] = 'Pas de touche pour ce signe : tape " à la place, c\'est accepté';
    else if (ch === 'œ' || ch === 'Œ') how[ch] = "Pas de touche pour ce signe : tape o puis e, c'est accepté";
    else if (ch === 'æ' || ch === 'Æ') how[ch] = "Pas de touche pour ce signe : tape a puis e, c'est accepté";
    else how[ch] = 'Aucun geste sur ce clavier. Dans Réglages, rubrique Accents, choisis « Tolérés » : la lettre sans accent sera acceptée';
  }
  return how;
}

// Signes à décrire : tout ce qui n'est ni lettre ni chiffre ni espace dans les textes et les touches du cours.
function specialChars(texts) {
  const set = new Set();
  for (const t of texts) for (const c of String(t || '')) if (!/[A-Za-z0-9 \n]/.test(c)) set.add(c);
  // majuscules accentuées et signes courants même s'ils ne sont pas dans les textes
  for (const c of 'ÉÈÀÇ²') set.add(c);
  return [...set].sort();
}

function buildKeyboards(texts) {
  const chars = specialChars(texts);
  const out = {};
  for (const v of VARIANTS) {
    const def = JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', v.id + '.json'), 'utf8'));
    const rows = [
      DIGITS.map((c) => key(def, c)),
      TOP.map((c) => key(def, c)),
      HOME.map((c) => key(def, c, c === 'KeyF' || c === 'KeyJ')),
      (v.iso ? ['IntlBackslash'] : []).concat(BOTTOM).map((c) => key(def, c)),
    ];
    const extra = {
      tlde: [key(def, 'Backquote')],
      ae: [key(def, 'Minus'), key(def, 'Equal')],
      ad: [key(def, 'BracketLeft'), key(def, 'BracketRight')].concat(v.iso ? [] : [key(def, 'Backslash')]),
      ac: [key(def, 'Quote')].concat(v.iso ? [key(def, 'Backslash')] : []),
    };
    out[v.id] = { label: v.label, short: v.short, os: def.os, iso: v.iso, mac: v.mac, status: def.status, rows, extra, how: howFor(def, v.mac, chars) };
  }
  return out;
}
module.exports = { buildKeyboards, VARIANTS, specialChars, describe };
