// Gate I1 : textes de l'interface (i18n.js). Le français est la référence, l'anglais doit le couvrir exactement.
//  - chaque clé française existe en anglais et inversement ; mêmes paramètres {…} des deux côtés ; aucun texte vide
//  - l'anglais n'a aucun tiret long, et reste du HTML valide (balises équilibrées)
//  - chaque clé appelée par la page (kpT / kpTn) existe ; aucune clé du dictionnaire n'est inutilisée
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function i1(opts) {
  const I = (opts && opts.i18n) || require('../i18n.js');
  const html = (opts && opts.html !== undefined) ? opts.html : fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const errs = [];
  const fr = I.dict.fr; const en = I.dict.en;
  const params = (s) => [...new Set((String(s).match(/\{(\w+)\}/g) || []))].sort().join(',');
  const tags = (s) => (String(s).match(/<\/?[a-z][^>]*>/gi) || []).map((x) => (x[1] === '/' ? '/' : '') + x.replace(/[<\/>]/g, '').split(/\s/)[0].toLowerCase()).sort().join(',');
  for (const k of Object.keys(fr)) if (!(k in en)) errs.push(`clé « ${k} » absente en anglais`);
  for (const k of Object.keys(en)) if (!(k in fr)) errs.push(`clé « ${k} » anglaise sans équivalent français`);
  for (const k of Object.keys(fr)) {
    if (!(k in en)) continue;
    if (!String(fr[k]).trim() || !String(en[k]).trim()) errs.push(`texte vide pour « ${k} »`);
    if (params(fr[k]) !== params(en[k])) errs.push(`paramètres différents pour « ${k} » (fr ${params(fr[k]) || 'aucun'}, en ${params(en[k]) || 'aucun'})`);
    if (tags(fr[k]) !== tags(en[k])) errs.push(`balises différentes pour « ${k} »`);
    if (/[—–]/.test(en[k])) errs.push(`tiret long dans « ${k} » (anglais)`);
  }
  // clés plurielles : _one et _other ensemble
  for (const d of [fr, en]) for (const k of Object.keys(d)) { const m = /^(.*)_(one|other)$/.exec(k); if (m && !(m[1] + (m[2] === 'one' ? '_other' : '_one') in d)) errs.push(`pluriel incomplet pour « ${m[1]} »`); }
  // usage dans la page
  const used = new Set();
  for (const m of html.matchAll(/\bkpT(n?)\(/g)) { // arguments lus jusqu'à la parenthèse fermante (les appels peuvent contenir des parenthèses)
    let d = 1; let i = m.index + m[0].length; const start = i;
    while (i < html.length && d > 0) { const c = html[i++]; if (c === '(') d++; else if (c === ')') d--; }
    const args = html.slice(start, i - 1);
    for (const q of args.matchAll(/'([a-z0-9]+\.[a-z0-9_]+)'/g)) {
      if (m[1] === 'n') { used.add(q[1] + '_one'); used.add(q[1] + '_other'); } else used.add(q[1]);
    }
  }
  for (const k of used) if (!(k in fr)) errs.push(`la page appelle « ${k} » qui n'existe pas`);
  for (const k of Object.keys(fr)) if (!used.has(k)) errs.push(`« ${k} » n'est utilisée par aucun écran`);
  return errs.length ? { ok: false, detail: errs.slice(0, 8).join('\n') } : { ok: true, detail: `${Object.keys(fr).length} textes, anglais complet, toutes les clés de la page existent` };
}
module.exports = { i1 };
