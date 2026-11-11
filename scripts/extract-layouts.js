// Extrait les 4 dispositions AZERTY de index.html (KB_LAYOUTS, KB_EXTRA, KB_HOW, étiquettes,
// notes) vers layouts-src/<famille>-<variante>.json, au format de scripts/layouts-lib.js.
// Usage : node scripts/extract-layouts.js [chemin/vers/index.html]
// Outil de reprise : tant que index.html contient encore ces constantes, api/_layouts.test.js
// vérifie que les fichiers restent identiques.
const fs = require('fs');
const path = require('path');
const { SCHEMA_VERSION, ROW_CODES, EXTRA_CODES, validateLayout } = require('./layouts-lib');

function pick(html, name) {
  const start = html.indexOf(`const ${name}=`);
  if (start < 0) throw new Error(`${name} introuvable`);
  // jusqu'à la fin de l'instruction : premier ";\n" suivi d'un début de ligne qui n'appartient pas au littéral
  const m = /\n\};?\n|\};\n/.exec(html.slice(start));
  if (!m) throw new Error(`fin de ${name} introuvable`);
  return html.slice(start, start + m.index + m[0].length).replace(/^const\s+\w+=/, '').replace(/;\s*$/, '');
}
function load(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  // kpT : certains textes de la page (notes des dispositions) passent par le dictionnaire ; ici on veut le français de référence
  const kpT = (k) => require('../i18n.js').dict.fr[k];
  const ev = (name) => new Function('kpT', `return (${pick(html, name)});`)(kpT);
  return { KB_LAYOUTS: ev('KB_LAYOUTS'), KB_EXTRA: ev('KB_EXTRA'), KB_HOW: ev('KB_HOW'), KB_LAYOUT_LABELS: ev('KB_LAYOUT_LABELS'), KB_LAYOUT_NOTES: ev('KB_LAYOUT_NOTES') };
}
function build(data) {
  const out = {};
  for (const variant of Object.keys(data.KB_LAYOUTS)) {
    const rows = data.KB_LAYOUTS[variant].map((row, r) => row.map((k, i) => ({ c: ROW_CODES[r][i], ...k })));
    const extra = {};
    for (const [slot, codes] of Object.entries(EXTRA_CODES)) extra[slot] = (data.KB_EXTRA[variant][slot] || []).map((k, i) => ({ c: codes[i], ...k }));
    out[variant] = {
      schemaVersion: SCHEMA_VERSION, id: `azerty-${variant}`, family: 'azerty', variant,
      label: data.KB_LAYOUT_LABELS[variant], note: data.KB_LAYOUT_NOTES[variant] || '',
      rows, extra, how: data.KB_HOW[variant],
    };
  }
  return out;
}
module.exports = { load, build };

if (require.main === module) {
  const htmlPath = process.argv[2] || path.join(__dirname, '..', 'index.html');
  const defs = build(load(htmlPath));
  const dir = path.join(__dirname, '..', 'layouts-src');
  fs.mkdirSync(dir, { recursive: true });
  for (const d of Object.values(defs)) {
    const errs = validateLayout(d);
    if (errs.length) { console.error(d.id, errs); process.exit(1); }
    fs.writeFileSync(path.join(dir, `${d.id}.json`), JSON.stringify(d, null, 1) + '\n');
    console.log(`layouts-src/${d.id}.json`);
  }
}
