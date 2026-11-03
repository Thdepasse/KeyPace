// G6 : rejeu des traces enregistrées sur du matériel réel (labo-clavier/capture.html, fichiers dans traces/).
// Pour chaque étape où le clavier réel a produit un caractère, on rejoue ses événements keydown dans le VRAI moteur
// et on vérifie qu'il accepte ce que le clavier a réellement envoyé, sans faute. Les étapes « impossible » sont listées.
const fs = require('fs');
const path = require('path');
const { loadApp } = require('./engine-harness');

const root = path.join(__dirname, '..');
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'OS']);

function validateTrace(t) {
  const errs = [];
  if (!t || t.meta === undefined || !Array.isArray(t.steps)) return ['structure : meta et steps attendus'];
  if (t.meta.schema !== 1) errs.push(`schéma ${t.meta.schema} inconnu`);
  for (const k of ['os', 'layout', 'form', 'userAgent', 'capturedAt']) if (!t.meta[k]) errs.push(`meta.${k} manquant`);
  t.steps.forEach((s, i) => {
    if (typeof s.target !== 'string' || !Array.isArray(s.events)) errs.push(`étape ${i} : forme invalide`);
    else if (!s.impossible && !s.produced) errs.push(`étape ${i} (${s.target}) : ni texte produit ni « impossible »`);
  });
  return errs;
}

const EVT = (e) => `({key:${JSON.stringify(e.key)},code:${JSON.stringify(e.code || '')},repeat:false,altKey:${!!e.alt},ctrlKey:${!!e.ctrl},shiftKey:${!!e.shift},metaKey:${!!e.meta},target:null,preventDefault(){},stopPropagation(){},getModifierState(m){return m==='AltGraph'?${!!e.altGraph}:false}})`;

// Rejoue une trace ; retourne { problems, impossible, replayed }
function replayTrace(t, h) {
  const problems = [], impossible = []; let replayed = 0;
  for (const s of t.steps) {
    if (s.impossible) { impossible.push(s.target); continue; }
    const keydowns = s.events.filter((e) => e.type === 'keydown' && !e.repeat && !MODIFIER_KEYS.has(e.key));
    if (!keydowns.length) { problems.push(`${s.target} : aucun événement de touche enregistré`); continue; }
    // Le moteur reçoit exactement les frappes du clavier réel et doit aboutir au texte attendu `target`.
    h.run("currentUser='tester';currentToken='tok';currentUserId='uid';_statsLoaded=true;app.stats=mergeStats();app.view='test';app.sess={mode:'test',lessonId:null,text:" + JSON.stringify(s.target) + ",idx:0,typed:[],started:false,startTime:0,endTime:0,correct:0,keystrokes:0,finished:false};");
    for (const e of keydowns) { h.advance(150); h.run('app.handleKey(' + EVT(e) + ')'); }
    replayed++;
    const fin = h.run('app.sess.finished'), ks = h.run('app.sess.keystrokes'), co = h.run('app.sess.correct');
    const prod = s.produced;
    if (!fin) problems.push(`${s.target} : le clavier a produit « ${prod} » mais le moteur n'a pas terminé (${h.run('app.sess.idx')}/${[...s.target].length})`);
    else if (ks !== co) problems.push(`${s.target} : le moteur compte ${ks - co} faute(s) sur les frappes réelles (produit : « ${prod} »)`);
  }
  return { problems, impossible, replayed };
}

function run(dir = path.join(root, 'traces')) {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  if (!files.length) return { ok: true, detail: 'aucune trace enregistrée : aucune disposition hors AZERTY ne peut dépasser le statut brouillon (plan, règle 5)' };
  const errs = []; let steps = 0; const imp = {};
  for (const f of files) {
    let t; try { t = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { errs.push(`${f} : JSON invalide`); continue; }
    const v = validateTrace(t); if (v.length) { v.forEach((x) => errs.push(`${f} : ${x}`)); continue; }
    const h = loadApp(); if (h.errors.length) { errs.push(`${f} : chargement du site : ${h.errors[0]}`); continue; }
    const r = replayTrace(t, h); steps += r.replayed; r.problems.forEach((p) => errs.push(`${f} : ${p}`));
    if (r.impossible.length) imp[`${t.meta.layout}/${t.meta.os}`] = r.impossible.join(' ');
  }
  const impTxt = Object.entries(imp).map(([k, v]) => `${k} impossibles : ${v}`).join(' ; ');
  return errs.length ? { ok: false, detail: errs.slice(0, 8).join('\n') } : { ok: true, detail: `${files.length} trace(s), ${steps} étapes rejouées${impTxt ? ' | ' + impTxt : ''}` };
}
module.exports = { run, validateTrace, replayTrace };
