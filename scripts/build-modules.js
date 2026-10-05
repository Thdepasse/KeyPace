// Génère api/_module-<clé>.js à partir de module-src/<clé>.src.js.
// Le code des modules est ainsi embarqué avec la fonction (jamais servi en
// statique) et livré seulement aux comptes Expert, voir api/_module-gate.js.
// Usage : node scripts/build-modules.js   (à relancer après chaque modification d'un module)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const key of ['cv', 'mail']) {
  const src = fs.readFileSync(path.join(root, 'module-src', `${key}.src.js`), 'utf8');
  const out = `// GÉNÉRÉ par scripts/build-modules.js depuis module-src/${key}.src.js : ne pas modifier à la main.\nmodule.exports = ${JSON.stringify(src)};\n`;
  fs.writeFileSync(path.join(root, 'api', `_module-${key}.js`), out);
  console.log(`api/_module-${key}.js : ${out.length} octets`);
}
