// Lit les fichiers de dispositions de CLDR (consortium Unicode, version « release-40 » de 2021, la dernière qui contient
// les dispositions issues de Windows, macOS, ChromeOS et Android ; les versions récentes ne gardent que le nouveau format).
// Usage : node scripts/build-cldr-layouts.js <dossier keyboards de CLDR release-40>
// Produit : des modèles ChromeOS (layouts-src/chromeos-*.json), des modèles « cldr-* » de recoupement (Windows, macOS)
// et des références AZERTY belges et françaises (layouts-ref/cldr-*.json).
const fs = require('fs');
const path = require('path');
const { kindOf } = require('./build-mac-layouts');

const ISO = { E00: 'Backquote', E11: 'Minus', E12: 'Equal', D11: 'BracketLeft', D12: 'BracketRight', D13: 'Backslash', C10: 'Semicolon', C11: 'Quote', C12: 'Backslash', B00: 'IntlBackslash', B08: 'Comma', B09: 'Period', B10: 'Slash' };
for (let i = 1; i <= 9; i++) ISO['E0' + i] = 'Digit' + i; ISO.E10 = 'Digit0';
'QWERTYUIOP'.split('').forEach((c, i) => { ISO['D' + String(i + 1).padStart(2, '0')] = 'Key' + c; });
'ASDFGHJKL'.split('').forEach((c, i) => { ISO['C' + String(i + 1).padStart(2, '0')] = 'Key' + c; });
'ZXCVBNM'.split('').forEach((c, i) => { ISO['B' + String(i + 1).padStart(2, '0')] = 'Key' + c; });

const FING = (() => { const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'layouts-src', 'azerty-fr.json'), 'utf8')); const f = {}; for (const k of [...fr.rows.flat(), ...Object.values(fr.extra).flat()]) f[k.c] = k.f; f.Backslash = f.Backslash || 'rp'; return f; })();
const unescapeXml = (s) => s.replace(/\\u\{([0-9A-Fa-f]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Niveau d'une planche de touches d'après son attribut modifiers (les jetons suivis de ? sont facultatifs).
function levelOf(mods) {
  if (mods === undefined) return 'l';
  const alt = mods.split(/\s+/)[0].split('+').filter((t) => !t.endsWith('?'));
  const has = (t) => alt.includes(t);
  const altish = has('altR') || has('opt') || has('alt') || (has('ctrl') && has('alt'));
  if (has('caps') && !has('shift') && !altish) return null;
  if (has('ctrl') && !altish) return null;
  if (altish) return has('shift') ? 'gs' : 'g';
  return has('shift') ? 's' : 'l';
}
function parse(file) {
  const xml = fs.readFileSync(file, 'utf8');
  const name = (/<name value="([^"]*)"/.exec(xml) || [])[1];
  const keys = {};
  for (const km of xml.matchAll(/<keyMap(?: modifiers="([^"]*)")?>([\s\S]*?)<\/keyMap>/g)) {
    const lv = levelOf(km[1]); if (!lv) continue;
    for (const m of km[2].matchAll(/<map iso="([A-Z]\d\d)" to="([^"]*)"/g)) {
      const code = ISO[m[1]]; if (!code) continue;
      const ch = unescapeXml(m[2]);
      keys[code] = keys[code] || { l: null, s: null, g: null, gs: null, f: FING[code] || 'rp', ...(code === 'KeyF' || code === 'KeyJ' ? { home: true } : {}) };
      if (keys[code][lv] === null) keys[code][lv] = ch;
    }
  }
  // Touches mortes : un signe suivi de lettres dans les transformations (« ´e » donne « é »)
  const trans = [...xml.matchAll(/<transform from="([^"]*)" to="([^"]*)"/g)].map((t) => [unescapeXml(t[1]), unescapeXml(t[2])]).filter(([f]) => [...f].length === 2);
  const byDead = {}; for (const [f, t] of trans) { const [d, b] = [...f]; (byDead[d] = byDead[d] || {})[b === ' ' ? ' ' : b] = t; }
  const compose = {};
  for (const [code, k] of Object.entries(keys)) for (const lv of ['l', 's', 'g', 'gs']) {
    const ch = k[lv]; if (ch && byDead[ch] && Object.keys(byDead[ch]).length >= 3) { (k.dead = k.dead || {})[lv] = kindOf(byDead[ch]); compose[code + '.' + lv] = byDead[ch]; }
  }
  return { name, keys, compose };
}

const MODELS = [
  ['chromeos/en-t-k0-chromeos.xml', 'chromeos-us', 'us', 'ChromeOS', 'ChromeOS : États-Unis'],
  ['chromeos/en-t-k0-chromeos-extended.xml', 'chromeos-us-intl', 'us-intl', 'ChromeOS', 'ChromeOS : États-Unis international (touches mortes)'],
  ['chromeos/en-GB-t-k0-chromeos.xml', 'chromeos-uk', 'uk', 'ChromeOS', 'ChromeOS : Royaume-Uni étendu (Winkeys)'],
  ['windows/en-t-k0-windows.xml', 'cldr-windows-us', 'us', 'Windows', 'Windows : États-Unis (CLDR, recoupement)'],
  ['windows/en-t-k0-windows-extended.xml', 'cldr-windows-us-intl', 'us-intl', 'Windows', 'Windows : États-Unis international (CLDR, recoupement)'],
  ['windows/en-GB-t-k0-windows.xml', 'cldr-windows-uk', 'uk', 'Windows', 'Windows : Royaume-Uni (CLDR, recoupement)'],
  ['windows/en-GB-t-k0-windows-extended.xml', 'cldr-windows-uk-extended', 'uk-extended', 'Windows', 'Windows : Royaume-Uni étendu (CLDR, recoupement)'],
  ['osx/en-t-k0-osx.xml', 'cldr-mac-us', 'us', 'macOS', 'macOS : U.S. (CLDR, recoupement)'],
  ['osx/en-t-k0-osx-extended.xml', 'cldr-mac-abc-extended', 'abc-extended', 'macOS', 'macOS : ABC – Extended (CLDR, recoupement)'],
  ['osx/en-GB-t-k0-osx.xml', 'cldr-mac-british', 'uk', 'macOS', 'macOS : British (CLDR, recoupement)'],
];
const REFS = [['windows/fr-t-k0-windows.xml', 'cldr-windows-fr'], ['windows/fr-BE-t-k0-windows.xml', 'cldr-windows-fr-be'], ['windows/nl-BE-t-k0-windows.xml', 'cldr-windows-nl-be'], ['windows/de-BE-t-k0-windows.xml', 'cldr-windows-de-be'], ['osx/fr-BE-t-k0-osx.xml', 'cldr-osx-fr-be'], ['chromeos/fr-BE-t-k0-chromeos.xml', 'cldr-chromeos-fr-be']];

function main() {
  const dir = process.argv[2]; if (!dir) { console.error('usage : node scripts/build-cldr-layouts.js <dossier keyboards>'); process.exit(1); }
  const outDir = path.join(__dirname, '..', 'layouts-src'), refDir = path.join(__dirname, '..', 'layouts-ref');
  fs.mkdirSync(refDir, { recursive: true });
  for (const [rel, id, variant, os, label] of MODELS) {
    const p = parse(path.join(dir, rel));
    const doc = { schemaVersion: 2, id, family: 'qwerty', variant, os, label, status: 'brouillon', cldrName: p.name, sources: [{ name: 'CLDR (consortium Unicode), version release-40 de 2021', url: 'https://github.com/unicode-org/cldr/tree/release-40/keyboards', file: rel, read: '2026-11-04' }], unverified: ['Donnée de 2021 (CLDR release-40) : peut avoir changé depuis', 'Essai sur matériel réel (règle 5 du plan) : aucune trace enregistrée.'], keys: p.keys, compose: p.compose };
    fs.writeFileSync(path.join(outDir, id + '.json'), JSON.stringify(doc, null, 1) + '\n'); console.log(id + '.json', '« ' + p.name + ' »', Object.keys(p.keys).length, 'touches');
  }
  for (const [rel, id] of REFS) {
    const p = parse(path.join(dir, rel));
    fs.writeFileSync(path.join(refDir, id + '.json'), JSON.stringify({ id, source: 'CLDR release-40 : ' + rel, cldrName: p.name, read: '2026-11-04', keys: p.keys, compose: p.compose }, null, 1) + '\n'); console.log('layouts-ref/' + id + '.json', '« ' + p.name + ' »', Object.keys(p.keys).length, 'touches');
  }
}
module.exports = { parse, levelOf };
if (require.main === module) main();
