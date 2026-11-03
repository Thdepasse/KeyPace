// Construit les modèles de dispositions QWERTY (layouts-src/<id>.json, schéma 2) à partir de SOURCES LUES :
//  - Windows : fichiers Microsoft Learn <nom>.html (scripts/ms-layout-parse.js) ;
//  - Linux et Mac (émulation) : xkeyboard-config symbols/* (scripts/xkb-parse.js).
// Usage : node scripts/build-qwerty-layouts.js --xkb <dossier symbols> --ms <dossier des .html> [--out layouts-src]
// Les sources ne sont pas dans le dépôt : chaque fichier généré cite l'adresse, le commit ou la date de lecture.
const fs = require('fs');
const path = require('path');
const { resolve: xkbResolve } = require('./xkb-parse');
const { parse: msParse } = require('./ms-layout-parse');
const { keysym } = require('./keysyms');

const XKB_COMMIT = '2ec770a0085bf776de749e185ca40e50213fb21f';
const XKB_URL = 'https://gitlab.freedesktop.org/xkeyboard-config/xkeyboard-config';
const MS_URL = 'https://learn.microsoft.com/en-us/globalization/keyboards/';
const READ_DATE = '2026-11-03';

const XKB_CODES = { TLDE: 'Backquote', AE11: 'Minus', AE12: 'Equal', AD11: 'BracketLeft', AD12: 'BracketRight', AC10: 'Semicolon', AC11: 'Quote', BKSL: 'Backslash', LSGT: 'IntlBackslash', AB08: 'Comma', AB09: 'Period', AB10: 'Slash' };
'1234567890'.split('').forEach((d, i) => { XKB_CODES['AE' + String(i + 1).padStart(2, '0')] = 'Digit' + d; });
'QWERTYUIOP'.split('').forEach((c, i) => { XKB_CODES['AD' + String(i + 1).padStart(2, '0')] = 'Key' + c; });
'ASDFGHJKL'.split('').forEach((c, i) => { XKB_CODES['AC' + String(i + 1).padStart(2, '0')] = 'Key' + c; });
'ZXCVBNM'.split('').forEach((c, i) => { XKB_CODES['AB' + String(i + 1).padStart(2, '0')] = 'Key' + c; });

// Touches virtuelles Windows -> code physique (identique pour les chiffres, lettres et signes courants ; 4 touches changent entre US et UK).
const VK_COMMON = { OEM_MINUS: 'Minus', OEM_PLUS: 'Equal', OEM_4: 'BracketLeft', OEM_6: 'BracketRight', OEM_1: 'Semicolon', OEM_COMMA: 'Comma', OEM_PERIOD: 'Period', OEM_2: 'Slash' };
const VK_US = { ...VK_COMMON, OEM_3: 'Backquote', OEM_7: 'Quote', OEM_5: 'Backslash', OEM_102: 'IntlBackslash' };
const VK_UK = { ...VK_COMMON, OEM_8: 'Backquote', OEM_3: 'Quote', OEM_7: 'Backslash', OEM_5: 'IntlBackslash' };
const vkToCode = (vk, table) => { const n = vk.replace('VK_', ''); if (/^[0-9]$/.test(n)) return 'Digit' + n; if (/^[A-Z]$/.test(n)) return 'Key' + n; return table[n] || null; };
const DEAD_BY_CHAR = { '`': 'grave', "'": 'acute', '´': 'acute', '"': 'diaeresis', '¨': 'diaeresis', '~': 'tilde', '^': 'circumflex', '¸': 'cedilla', '˜': 'tilde' };

function fingers() {
  const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'layouts-src', 'azerty-fr.json'), 'utf8'));
  const f = {}; for (const k of [...fr.rows.flat(), ...Object.values(fr.extra).flat()]) f[k.c] = k.f;
  f.Backslash = f.Backslash || 'rp';
  return f;
}
const FING = fingers();
const emptyKey = (code) => ({ l: null, s: null, g: null, gs: null, f: FING[code] || 'rp', ...(code === 'KeyF' || code === 'KeyJ' ? { home: true } : {}) });

function fromMs(file, table) {
  const r = msParse(file); const keys = {};
  for (const [st, field] of [['normal', 'l'], ['shift', 's'], ['altgr', 'g'], ['altgrshift', 'gs']]) {
    for (const row of r[st]) for (const k of row) {
      if (!k.vk || !k.cp) continue;
      const code = vkToCode(k.vk, table); if (!code) continue;
      const ch = String.fromCodePoint(parseInt(k.cp, 16));
      keys[code] = keys[code] || emptyKey(code);
      keys[code][field] = ch;
      if (k.dead) { keys[code].dead = keys[code].dead || {}; keys[code].dead[field] = DEAD_BY_CHAR[ch] || 'autre'; }
    }
  }
  return keys;
}
function fromXkb(dir, file, section) {
  const r = xkbResolve(dir, file, section); const keys = {};
  for (const [xk, levels] of Object.entries(r.keys)) {
    const code = XKB_CODES[xk]; if (!code) continue;
    keys[code] = emptyKey(code);
    ['l', 's', 'g', 'gs'].forEach((field, i) => {
      if (levels[i] === undefined) return;
      const k = keysym(levels[i]);
      if (k.dead) { keys[code][field] = null; keys[code].dead = keys[code].dead || {}; keys[code].dead[field] = k.dead; }
      else keys[code][field] = k.ch;
    });
  }
  // xkeyboard-config répète le niveau 1 (resp. 2) aux niveaux 3 (resp. 4) quand AltGr ne change rien : ce n'est pas un caractère de plus.
  for (const k of Object.values(keys)) { if (k.g !== null && k.g === k.l) k.g = null; if (k.gs !== null && k.gs === k.s) k.gs = null; }
  return { keys, includes: [...new Set(r.includes)] };
}

function main() {
  const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
  const xkb = arg('--xkb'), ms = arg('--ms'), out = arg('--out') || path.join(__dirname, '..', 'layouts-src');
  if (!xkb || !ms) { console.error('usage : --xkb <symbols> --ms <dossier html>'); process.exit(1); }
  const HW = 'Essai sur matériel réel (règle 5 du plan) : aucune trace enregistrée.';
  const defs = [];
  const msSrc = (n) => ({ name: 'Microsoft Learn', url: MS_URL + n, file: n + '.html', read: READ_DATE });
  const xkSrc = (f, s) => ({ name: 'xkeyboard-config', url: XKB_URL, commit: XKB_COMMIT, file: 'symbols/' + f, section: s, read: READ_DATE });
  defs.push({ id: 'windows-us-intl', os: 'Windows', variant: 'us-intl', label: 'Windows : États-Unis international', keys: fromMs(path.join(ms, 'kbdusx.html'), VK_US), sources: [msSrc('kbdusx')], unverified: [HW], klid: '00020409' });
  defs.push({ id: 'windows-uk', os: 'Windows', variant: 'uk', label: 'Windows : Royaume-Uni', keys: fromMs(path.join(ms, 'kbduk.html'), VK_UK), sources: [msSrc('kbduk')], unverified: [HW], klid: '00000809' });
  defs.push({ id: 'windows-uk-extended', os: 'Windows', variant: 'uk-extended', label: 'Windows : Royaume-Uni étendu', keys: fromMs(path.join(ms, 'kbdukx.html'), VK_UK), sources: [msSrc('kbdukx')], unverified: [HW], klid: '00000452' });
  const x = (f, s) => fromXkb(xkb, f, s);
  const usBasic = x('us', 'basic');
  defs.push({ id: 'windows-us', os: 'Windows', variant: 'us', label: 'Windows : États-Unis', keys: usBasic.keys, sources: [xkSrc('us', 'basic')], unverified: ['Microsoft : la page kbdus n\'existe pas (404), donnée issue de xkeyboard-config us(basic), identique à la disposition standard', HW] });
  const usIntl = x('us', 'intl');
  defs.push({ id: 'linux-us-intl', os: 'Linux', variant: 'us-intl', label: 'Linux : États-Unis international (touches mortes)', keys: usIntl.keys, sources: [xkSrc('us', 'intl')], unverified: [HW] });
  defs.push({ id: 'linux-us-altgr-intl', os: 'Linux', variant: 'us-altgr-intl', label: 'Linux : États-Unis international, touches mortes par AltGr', keys: x('us', 'altgr-intl').keys, sources: [xkSrc('us', 'altgr-intl')], unverified: [HW] });
  defs.push({ id: 'linux-gb', os: 'Linux', variant: 'uk', label: 'Linux : Royaume-Uni', keys: x('gb', 'basic').keys, sources: [xkSrc('gb', 'basic')], unverified: [HW] });
  defs.push({ id: 'linux-gb-extd', os: 'Linux', variant: 'uk-extended', label: 'Linux : Royaume-Uni étendu', keys: x('gb', 'extd').keys, sources: [xkSrc('gb', 'extd')], unverified: [HW] });
  defs.push({ id: 'mac-us', os: 'macOS', variant: 'us', label: 'macOS : U.S. (émulation xkeyboard-config)', keys: x('us', 'mac').keys, sources: [xkSrc('us', 'mac')], unverified: ['Apple : le Visualiseur de clavier n\'a pas été lu ; ces données sont l\'émulation « English (Macintosh) » de xkeyboard-config, pas la donnée d\'Apple', HW] });

  fs.mkdirSync(out, { recursive: true });
  for (const d of defs) {
    // Une touche absente de la source reste absente du modèle (jamais inventée).
    const keys = {}; for (const [c, k] of Object.entries(d.keys)) if (k.l || k.s || k.g || k.gs || k.dead) keys[c] = k;
    const doc = { schemaVersion: 2, id: d.id, family: 'qwerty', variant: d.variant, os: d.os, label: d.label, status: 'brouillon', ...(d.klid ? { klid: d.klid } : {}), sources: d.sources, unverified: d.unverified, keys };
    fs.writeFileSync(path.join(out, d.id + '.json'), JSON.stringify(doc, null, 1) + '\n');
    console.log(`${d.id}.json : ${Object.keys(keys).length} touches`);
  }
}
module.exports = { fromMs, fromXkb, VK_US, VK_UK };
if (require.main === module) main();
