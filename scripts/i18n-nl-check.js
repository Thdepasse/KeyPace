// Contrôle d'un lot de textes néerlandais de l'interface : node scripts/i18n-nl-check.js docs/nl-interface/chunk-N-nl.json
// Le lot source est docs/nl-interface/chunk-N.json (clé -> { fr, en }). Le lot néerlandais est { clé: texte }.
// Règles (les mêmes que la gate I1 pour l'anglais) : toutes les clés du lot et rien de plus ; textes non vides ; mêmes paramètres {…} et mêmes balises HTML
// que le français ; aucun tiret long (— ou –) ; un texte de plus de 12 caractères identique au français ou à l'anglais est signalé (traduction oubliée).
const fs = require('fs');
const path = require('path');
const params = (s) => [...new Set((String(s).match(/\{(\w+)\}/g) || []))].sort().join(',');
const tags = (s) => (String(s).match(/<\/?[a-z][^>]*>/gi) || []).map((x) => (x[1] === '/' ? '/' : '') + x.replace(/[<\/>]/g, '').split(/\s/)[0].toLowerCase()).sort().join(',');
function check(nlFile) {
  const m = /chunk-(\d+)-nl\.json$/.exec(nlFile); if (!m) throw new Error('nom attendu : chunk-N-nl.json');
  const src = JSON.parse(fs.readFileSync(path.join(path.dirname(nlFile), `chunk-${m[1]}.json`), 'utf8'));
  const nl = JSON.parse(fs.readFileSync(nlFile, 'utf8')); const errs = []; const warn = [];
  for (const k of Object.keys(src)) if (!(k in nl)) errs.push(`clé « ${k} » absente`);
  for (const k of Object.keys(nl)) if (!(k in src)) errs.push(`clé « ${k} » inconnue du lot`);
  for (const k of Object.keys(src)) {
    if (!(k in nl)) continue; const v = String(nl[k]);
    if (!v.trim()) { errs.push(`texte vide pour « ${k} »`); continue; }
    if (params(src[k].fr) !== params(v)) errs.push(`paramètres différents pour « ${k} » (fr ${params(src[k].fr) || 'aucun'}, nl ${params(v) || 'aucun'})`);
    if (tags(src[k].fr) !== tags(v)) errs.push(`balises différentes pour « ${k} »`);
    if (/[—–]/.test(v)) errs.push(`tiret long dans « ${k} »`);
    if (v.length > 12 && (v === src[k].fr || v === src[k].en)) warn.push(`« ${k} » identique au ${v === src[k].fr ? 'français' : 'anglais'} : ${v.slice(0, 40)}`);
  }
  return { errs, warn, count: Object.keys(nl).length, expected: Object.keys(src).length };
}
if (require.main === module) {
  const r = check(path.resolve(process.argv[2] || ''));
  console.log(`${r.count}/${r.expected} textes`);
  r.warn.slice(0, 20).forEach((w) => console.log('à vérifier :', w));
  r.errs.slice(0, 30).forEach((e) => console.log('ERREUR :', e));
  console.log(r.errs.length ? `${r.errs.length} erreur(s)` : 'OK');
  process.exit(r.errs.length ? 1 : 0);
}
module.exports = { check };
