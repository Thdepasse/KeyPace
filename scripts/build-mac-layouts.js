// Construit les modèles macOS (layouts-src/mac-*.json) et les références AZERTY d'Apple (layouts-ref/) à partir de la
// sortie de scripts/dump-mac-layouts.swift (données d'Apple, lues par l'API du système).
// Usage : node scripts/build-mac-layouts.js <macdump.json>
// ISO : sur un Mac à clavier ISO, la touche en haut à gauche envoie le code macOS 10 (« section ») et la touche à gauche
// du Z le code 50 ; Chrome rétablit la place physique (voir le plan, Q5). On range donc 10 sous Backquote et 50 sous
// IntlBackslash, comme sur le clavier d'un MacBook belge.
const fs = require('fs');
const path = require('path');
const { DEAD } = require('./keysyms');

const FING = (() => { const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'layouts-src', 'azerty-fr.json'), 'utf8')); const f = {}; for (const k of [...fr.rows.flat(), ...Object.values(fr.extra).flat()]) f[k.c] = k.f; f.Backslash = f.Backslash || 'rp'; return f; })();
const MODELS = { 'com.apple.keylayout.US': ['mac-us', 'us', 'macOS : U.S.'], 'com.apple.keylayout.USInternational-PC': ['mac-us-intl-pc', 'us-intl-pc', 'macOS : U.S. International – PC'], 'com.apple.keylayout.British': ['mac-british', 'uk', 'macOS : British'], 'com.apple.keylayout.British-PC': ['mac-british-pc', 'uk-pc', 'macOS : British – PC'], 'com.apple.keylayout.ABC': ['mac-abc', 'abc', 'macOS : ABC'], 'com.apple.keylayout.USExtended': ['mac-abc-extended', 'abc-extended', 'macOS : ABC – Extended'] };
const REFS = { 'com.apple.keylayout.Belgian': 'apple-belgian', 'com.apple.keylayout.French': 'apple-french', 'com.apple.keylayout.French-PC': 'apple-french-pc', 'com.apple.keylayout.Dutch': 'apple-dutch' };
const kindOf = (table) => {
  for (const base of ['e', 'a', 'o', 'u', 'n', 'i', 'c', 'y']) {
    const r = table[base]; if (!r) continue;
    const mark = [...r.normalize('NFD')].slice(1).join('');
    for (const [name, [, comb]] of Object.entries(DEAD)) if (mark === comb) return DEAD[name][0];
  }
  return 'autre';
};
function swapIso(keys) { const out = { ...keys }; const a = keys.IntlBackslash, b = keys.Backquote; delete out.IntlBackslash; delete out.Backquote; if (a) out.Backquote = a; if (b) out.IntlBackslash = b; return out; }

function main() {
  const file = process.argv[2]; if (!file) { console.error('usage : node scripts/build-mac-layouts.js <macdump.json>'); process.exit(1); }
  const dump = JSON.parse(fs.readFileSync(file, 'utf8'));
  const outDir = path.join(__dirname, '..', 'layouts-src'), refDir = path.join(__dirname, '..', 'layouts-ref');
  fs.mkdirSync(refDir, { recursive: true });
  for (const [lid, v] of Object.entries(dump)) {
    const model = MODELS[lid], ref = REFS[lid]; if (!model && !ref) continue;
    const swapped = swapIso(v.keys);
    const keys = {}, compose = {};
    for (const [code, e] of Object.entries(swapped)) {
      const k = { l: e.l || null, s: e.s || null, g: e.g || null, gs: e.gs || null, f: FING[code] || 'rp', ...(code === 'KeyF' || code === 'KeyJ' ? { home: true } : {}) };
      if (e.dead) {
        k.dead = {};
        for (const lv of Object.keys(e.dead)) {
          // la touche morte est repérée dans le dump sous son code Apple ; on retrouve sa table de composition
          const appleCode = code === 'Backquote' ? 'IntlBackslash' : code === 'IntlBackslash' ? 'Backquote' : code;
          const table = v.compose[appleCode + '.' + lv] || {};
          k.dead[lv] = kindOf(table); compose[code + '.' + lv] = table;
        }
      }
      keys[code] = k;
    }
    const note = 'Données lues le 2026-11-04 par l\'API d\'Apple sur macOS 15.8.1, clavier de type ISO (kbdType ' + v.kbdType + '). Les codes Backquote et IntlBackslash suivent la place physique d\'un clavier ISO (code Apple 10 = en haut à gauche) ; forme ANSI non lue.';
    if (model) {
      const doc = { schemaVersion: 2, id: model[0], family: 'qwerty', variant: model[1], os: 'macOS', label: model[2], status: 'brouillon', sources: [{ name: 'Apple macOS (UCKeyTranslate)', url: 'https://developer.apple.com/documentation/coreservices/1390584-uckeytranslate', file: lid, read: '2026-11-04' }], unverified: ['Essai sur matériel réel (règle 5 du plan) : aucune trace enregistrée.', 'Forme ANSI : non lue (voir note)'], note, keys, compose };
      fs.writeFileSync(path.join(outDir, model[0] + '.json'), JSON.stringify(doc, null, 1) + '\n'); console.log(model[0] + '.json', Object.keys(keys).length, 'touches,', Object.keys(compose).length, 'touches mortes');
    } else {
      fs.writeFileSync(path.join(refDir, ref + '.json'), JSON.stringify({ id: ref, source: lid, read: '2026-11-04', note, keys, compose }, null, 1) + '\n'); console.log('layouts-ref/' + ref + '.json', Object.keys(keys).length, 'touches');
    }
  }
}
module.exports = { kindOf, swapIso };
if (require.main === module) main();
