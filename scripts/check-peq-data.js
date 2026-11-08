// Vérifie peq/peq-data.js :
//  - valeurs valides, références uniques, ids de leçons/modules existants ;
//  - début de chaque intitulé retrouvé dans le texte du PDF officiel (si les .txt sont présents) ;
//  - AUCUN intitulé officiel modifié par rapport à l'instantané peq/peq-textes.snapshot.json ;
//  - toute compétence non « hors » a une année conseillée (4, 5 ou 6), toute « hors » n'en a pas ;
//  - tout seuil et tout palier a une source ; toute progression est étiquetée « proposition KeyPace ».
const fs = require('fs');
const path = require('path');
const D = require('../peq/peq-data.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const OK = ['couvert', 'partiel', 'manquant', 'hors', 'a_verifier'];
const norm = (s) => s.replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').toLowerCase().trim();
const sources = {
  '7410': 'Programme PEQ/pc_collab.txt',
  'technicien-de-bureau': 'Programme PEQ/PF_CCPQ_Technicien_de_bureau.txt',
  'technicien-en-comptabilite': 'Programme PEQ/PF_CCPQ_Technicien_comptabilite.txt',
  'technicien-commercial': 'Programme PEQ/PF_CCPQ_Technicien_commercial.txt',
  'agent-accueil-tourisme': 'Programme PEQ/PC_Agent_accueil_tourisme.txt'
};
let snapshot = {};
try { snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, '../peq/peq-textes.snapshot.json'), 'utf8')); } catch (e) { console.warn('Avertissement : pas d’instantané des intitulés'); }
let errors = 0, total = 0;
const err = (m) => { errors++; console.error('ERREUR', m); };
for (const o of D.options) {
  const p = path.join(__dirname, '..', sources[o.id] || '');
  const txt = fs.existsSync(p) ? norm(fs.readFileSync(p, 'utf8')) : null;
  if (!txt) console.warn('Avertissement : pas de texte source pour', o.id);
  const seen = new Set();
  let anyYear = false;
  for (const u of o.uaa) for (const c of u.competences) {
    total++;
    if (seen.has(c.ref)) err(`${o.id} ref en double ${c.ref}`);
    seen.add(c.ref);
    if (!OK.includes(c.couverture)) err(`${o.id} ${c.ref} couverture invalide`);
    if (!c.texte) err(`${o.id} ${c.ref} sans texte`);
    if (snapshot[o.id] && snapshot[o.id][c.ref] !== undefined && snapshot[o.id][c.ref] !== c.texte) err(`${o.id} ${c.ref} intitulé officiel modifié`);
    for (const k of [].concat(c.kp.cours || [], c.kp.exercices || [])) {
      if (k.type === 'lecon' && !html.includes(`id:'${k.id}'`)) err(`${o.id} ${c.ref} leçon inconnue ${k.id}`);
      if (k.type === 'module' && !html.includes(`'${k.id}'`)) err(`${o.id} ${c.ref} module inconnu ${k.id}`);
    }
    if ((c.couverture === 'couvert' || c.couverture === 'partiel') && !(c.kp.cours || []).length && !(c.kp.exercices || []).length)
      err(`${o.id} ${c.ref} marqué ${c.couverture} sans contenu rattaché`);
    if (txt) {
      const head = norm(c.texte).slice(0, 26);
      if (!txt.includes(head)) err(`${o.id} ${c.ref} intitulé introuvable dans le PDF : « ${head} »`);
    }
    // année conseillée
    if (c.couverture === 'hors') {
      if (c.anneeConseillee) err(`${o.id} ${c.ref} « hors » ne doit pas avoir d'année`);
    } else if (o.progressionSource) {
      if (![4, 5, 6].includes(c.anneeConseillee)) err(`${o.id} ${c.ref} sans anneeConseillee`);
      else anyYear = true;
      (c.anneesConseillees || []).forEach((y) => { if (![4, 5, 6].includes(y)) err(`${o.id} ${c.ref} année invalide ${y}`); });
    }
    // seuils et paliers
    if (c.seuil && !c.seuil.source) err(`${o.id} ${c.ref} seuil sans source`);
    if (c.paliers) for (const [y, pl] of Object.entries(c.paliers)) {
      if (!pl.source) err(`${o.id} ${c.ref} palier ${y} sans source`);
      if (!['proposition KeyPace', 'a_verifier', 'officiel'].includes(pl.origine)) err(`${o.id} ${c.ref} palier ${y} origine invalide`);
    }
  }
  if (anyYear && o.progressionSource !== 'proposition KeyPace') err(`${o.id} progression non étiquetée « proposition KeyPace »`);
  if (snapshot[o.id]) for (const ref of Object.keys(snapshot[o.id])) if (!seen.has(ref)) err(`${o.id} compétence ${ref} disparue`);
}
console.log(`${total} compétences, ${errors} erreur(s)`);
const stats = {};
for (const o of D.options) for (const u of o.uaa) for (const c of u.competences) {
  const k = o.id + ' ' + c.couverture; stats[k] = (stats[k] || 0) + 1;
}
console.log(stats);
process.exit(errors ? 1 : 0);
