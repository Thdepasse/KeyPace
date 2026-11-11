// Fusionne les six lots néerlandais (docs/nl-interface/chunk-N-nl.json) dans i18n.js : bloc `nl: { … }` entre les repères NL-BEGIN et NL-END (refait à l'identique à chaque lancement).
// Usage : node scripts/i18n-nl-merge.js   (échoue si un lot manque ou n'est pas conforme : scripts/i18n-nl-check.js)
const fs = require('fs');
const path = require('path');
const { check } = require('./i18n-nl-check');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'docs', 'nl-interface');
const I = require('../i18n.js');
const nl = {};
for (let n = 1; n <= 6; n++) {
  const f = path.join(dir, `chunk-${n}-nl.json`);
  if (!fs.existsSync(f)) { console.error(`lot ${n} absent`); process.exit(1); }
  const r = check(f);
  if (r.errs.length) { console.error(`lot ${n} : ${r.errs.length} erreur(s), voir node scripts/i18n-nl-check.js ${f}`); process.exit(1); }
  Object.assign(nl, JSON.parse(fs.readFileSync(f, 'utf8')));
}
const keys = Object.keys(I.dict.fr).filter((k) => k in nl); // l'ordre du français
const missing = Object.keys(I.dict.fr).filter((k) => !(k in nl));
if (missing.length) { console.error(`${missing.length} clé(s) françaises sans néerlandais : ${missing.slice(0, 5).join(', ')}`); process.exit(1); }
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const block = '    // NL-BEGIN (généré par scripts/i18n-nl-merge.js à partir de docs/nl-interface/ ; relire et corriger ICI, ce fichier est la source)\n    nl: {\n'
  + keys.map((k) => `      ${q(k)}: ${q(nl[k])},`).join('\n') + '\n    },\n    // NL-END\n';
const file = path.join(root, 'i18n.js');
let s = fs.readFileSync(file, 'utf8');
if (/\/\/ NL-BEGIN/.test(s)) s = s.replace(/    \/\/ NL-BEGIN[\s\S]*?\/\/ NL-END\n/, () => block);
else s = s.replace(/(\n    },\n)(  };\n\n  const LANGS)/, (m, a, b) => a + block + b);
fs.writeFileSync(file, s);
console.log(`${keys.length} textes néerlandais fusionnés dans i18n.js`);
