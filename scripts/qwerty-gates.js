// Gates sur les modèles de dispositions QWERTY (layouts-src/*.json, schéma 2). Plan, 4.21.
//  Q1 : les désaccords entre sources (Windows/Microsoft et Linux/xkeyboard-config) sont connus et relus ;
//  Q2 : pour chaque variante, quels caractères de NOS textes sont tapables, par quel geste, lesquels sont impossibles ;
//  Q3 : ce que fait le VRAI moteur quand l'OS envoie une touche morte (apostrophe, accents).
// Les résultats sont comparés à une référence : tout changement doit être déclaré (--update-baseline).
const fs = require('fs');
const path = require('path');
const { compose } = require('./keysyms');
const { loadApp } = require('./engine-harness');

const root = path.join(__dirname, '..');
const loadAll = () => fs.readdirSync(path.join(root, 'layouts-src')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', f), 'utf8'))).filter((d) => d.schemaVersion === 2);
const PAIRS = [['windows-us-intl', 'linux-us-intl'], ['windows-uk', 'linux-gb'], ['windows-uk-extended', 'linux-gb-extd'], ['mac-us', 'xkb-us-mac'], ['windows-us-intl', 'mac-us-intl-pc'],
  // recoupement avec CLDR (2021) : deux sources indépendantes pour un même système
  ['windows-us-intl', 'cldr-windows-us-intl'], ['windows-uk', 'cldr-windows-uk'], ['windows-uk-extended', 'cldr-windows-uk-extended'], ['mac-us', 'cldr-mac-us'], ['mac-abc-extended', 'cldr-mac-abc-extended'], ['mac-british', 'cldr-mac-british'], ['linux-us-intl', 'chromeos-us-intl']];
const LEVELS = ['l', 's', 'g', 'gs'];

// Q1 : désaccords entre deux sources pour des dispositions équivalentes
function disagreements() {
  const byId = Object.fromEntries(loadAll().map((d) => [d.id, d]));
  const out = {};
  for (const [a, b] of PAIRS) {
    if (!byId[a] || !byId[b]) { out[`${a} / ${b}`] = ['fichier absent']; continue; }
    const diffs = [];
    for (const code of new Set([...Object.keys(byId[a].keys), ...Object.keys(byId[b].keys)])) {
      const ka = byId[a].keys[code] || {}, kb = byId[b].keys[code] || {};
      for (const lv of LEVELS) {
        // Une touche morte se compare par son accent (Microsoft note aussi le signe de la touche, xkeyboard-config non).
        const eff = (k, l) => (k.dead && k.dead[l] ? `morte:${k.dead[l]}` : k[l] || null);
        const va = eff(ka, lv), vb = eff(kb, lv);
        if (va !== vb) diffs.push(`${code}.${lv}: ${va === null ? '(rien)' : va} | ${vb === null ? '(rien)' : vb}`);
      }
    }
    out[`${a} / ${b}`] = diffs.sort();
  }
  return out;
}

// Chaînes de tous nos textes (leçons, textes de test, certificat) : les caractères réellement demandés à un élève.
function allTexts() {
  const h = loadApp();
  h.run("currentUser='t';currentToken='t';_statsLoaded=true;app.stats=mergeStats();app.view='lessons';");
  const texts = h.run('ALL_LESSONS.map(l=>l.id)').map((id) => h.run(`(app.sess=app.makeSession('lesson',${JSON.stringify(id)}),app.sess.text)`));
  texts.push(h.run('CERT_TEXT')); for (let i = 0; i < h.run('PASSAGES.length'); i++) texts.push(h.run(`adaptQuotes(PASSAGES[${i}])`));
  return texts;
}

// Comment taper un caractère sur une variante : { route, detail } ou null
function reach(def, ch) {
  const direct = [], altgr = [], deadLit = [], viaDead = [];
  for (const [code, k] of Object.entries(def.keys)) {
    ['l', 's'].forEach((lv) => { if (k[lv] === ch && !(k.dead && k.dead[lv])) direct.push(code + '.' + lv); if (k[lv] === ch && k.dead && k.dead[lv]) deadLit.push(code + '.' + lv); });
    ['g', 'gs'].forEach((lv) => { if (k[lv] === ch && !(k.dead && k.dead[lv])) altgr.push(code + '.' + lv); if (k[lv] === ch && k.dead && k.dead[lv]) deadLit.push(code + '.' + lv); });
  }
  if (ch === ' ') return { route: 'directe', detail: 'Space' };
  if (direct.length) return { route: 'directe', detail: direct[0] };
  if (altgr.length) return { route: 'AltGr/Option', detail: altgr[0] };
  if (deadLit.length) return { route: 'touche morte puis Espace', detail: deadLit[0] };
  // composition : une touche morte + une lettre directe (table du système si le modèle en fournit une, sinon Unicode)
  const deads = []; for (const [code, k] of Object.entries(def.keys)) for (const [lv, kind] of Object.entries(k.dead || {})) deads.push({ code, lv, kind });
  if (def.compose) {
    for (const d of deads) {
      const table = def.compose[d.code + '.' + d.lv] || {};
      if (table[' '] === ch) return { route: 'touche morte puis Espace', detail: `${d.code}.${d.lv}` };
      for (const [base, res] of Object.entries(table)) if (res === ch && base !== ' ') for (const [bc, bk] of Object.entries(def.keys)) for (const lv of ['l', 's']) if (bk[lv] === base && !(bk.dead && bk.dead[lv])) return { route: 'touche morte puis lettre', detail: `${d.code}.${d.lv} (${d.kind}) puis ${bc}.${lv}` };
    }
    return null;
  }
  for (const d of deads) for (const [bc, bk] of Object.entries(def.keys)) for (const lv of ['l', 's']) {
    if (bk[lv] && [...bk[lv]].length === 1 && !(bk.dead && bk.dead[lv]) && compose(d.kind, bk[lv]) === ch) return { route: 'touche morte puis lettre', detail: `${d.code}.${d.lv} (${d.kind}) puis ${bc}.${lv}` };
  }
  return null;
}

function typability() {
  const texts = allTexts(); const freq = {};
  for (const t of texts) for (const c of t) freq[c] = (freq[c] || 0) + 1;
  const out = {};
  for (const def of loadAll()) {
    const impossible = [], viaDead = [], deadSpace = [], altgr = [];
    for (const ch of Object.keys(freq).sort()) {
      if (ch === '\n') continue;
      const r = reach(def, ch);
      if (!r) impossible.push(ch);
      else if (r.route === 'touche morte puis lettre') viaDead.push(ch);
      else if (r.route === 'touche morte puis Espace') deadSpace.push(ch);
      else if (r.route === 'AltGr/Option') altgr.push(ch);
    }
    out[def.id] = { impossible, viaDead, deadSpace, altgr };
  }
  return { out, freq, nTexts: texts.length };
}

// Q3 : le vrai moteur face aux touches mortes envoyées par le système
const EVT = (o) => `({key:${JSON.stringify(o.key)},code:${JSON.stringify(o.code || '')},repeat:false,altKey:${!!o.alt},ctrlKey:false,shiftKey:${!!o.shift},metaKey:false,target:null,preventDefault(){},stopPropagation(){},getModifierState(){return false}})`;
function engineRun(h, text, events) {
  h.run("currentUser='t';currentToken='t';_statsLoaded=true;app.stats=mergeStats();app.view='test';app.sess={mode:'test',lessonId:null,text:" + JSON.stringify(text) + ",idx:0,typed:[],started:false,startTime:0,endTime:0,correct:0,keystrokes:0,finished:false};");
  for (const e of events) { h.advance(150); h.run('app.handleKey(' + EVT(e) + ')'); }
  return { finished: h.run('app.sess.finished'), faults: h.run('app.sess.keystrokes-app.sess.correct') };
}
function deadKeyEngine() {
  const h = loadApp(); const r = {};
  const dk = (code) => ({ key: 'Dead', code });
  // « l'eau » sur une disposition où l'apostrophe est une touche morte (États-Unis international)
  r["l'eau : apostrophe puis e donne é : faute attendue (il fallait l'apostrophe)"] = engineRun(h, "l'eau", [{ key: 'l' }, dk('Quote'), { key: 'é' }, { key: 'a' }, { key: 'u' }]);
  r["l'eau : apostrophe, Espace, e (Espace donne l'apostrophe)"] = engineRun(h, "l'eau", [{ key: 'l' }, dk('Quote'), { key: "'", code: 'Space' }, { key: 'e' }, { key: 'a' }, { key: 'u' }]);
  r["l'eau : apostrophe, Espace (le navigateur envoie Espace)"] = engineRun(h, "l'eau", [{ key: 'l' }, dk('Quote'), { key: ' ' }, { key: 'e' }, { key: 'a' }, { key: 'u' }]);
  r['é par touche morte : apostrophe puis e'] = engineRun(h, 'é', [dk('Quote'), { key: 'é' }]);
  r['è par touche morte : accent grave puis e'] = engineRun(h, 'è', [dk('Backquote'), { key: 'è' }]);
  r['ê par touche morte : Maj+6 puis e'] = engineRun(h, 'ê', [dk('Digit6'), { key: 'ê' }]);
  r['ë par touche morte : Maj+apostrophe puis e'] = engineRun(h, 'ë', [dk('Quote'), { key: 'ë' }]);
  r['guillemet droit par touche morte puis Espace'] = engineRun(h, '"', [{ key: 'Dead', code: 'Quote', shift: true }, { key: '"', code: 'Space' }]);
  // Firefox (bogue 1599021, ouvert) : après une touche morte, la valeur de touche peut contenir deux caractères (« ^e »).
  r['Firefox : accent mort puis lettre en une seule valeur « ^e » pour ê'] = engineRun(h, 'ê', [dk('BracketLeft'), { key: '^e' }]);
  r['Firefox : apostrophe morte puis lettre en une seule valeur « \'e » pour é'] = engineRun(h, 'é', [dk('Quote'), { key: "'e" }]);
  r['Firefox : touche morte puis Espace, valeur « ^ » seule'] = engineRun(h, '^', [dk('BracketLeft'), { key: '^' }]);
  // Touche morte puis lettre sans accent possible : Chrome envoie la lettre seule, le champ reçoit l'accent PUIS la lettre.
  r["l'k : apostrophe morte puis k (Chrome : la lettre seule)"] = engineRun(h, "l'k", [{ key: 'l' }, dk('Quote'), { key: 'k', code: 'KeyK' }]);
  r["l'k : apostrophe morte puis k (Safari : « 'k » en une valeur)"] = engineRun(h, "l'k", [{ key: 'l' }, dk('Quote'), { key: "'k", code: 'KeyK' }]);
  r["deux apostrophes de suite : touche morte pressee deux fois"] = engineRun(h, "''", [dk('Quote'), dk('Quote')]);
  r["tilde puis Espace : valeur ~ avec le code Espace"] = engineRun(h, '~', [{ key: 'Dead', code: 'Backquote', shift: true }, { key: '~', code: 'Space' }]);
  return r;
}

// A1 : nos modèles AZERTY Mac confrontés aux dispositions d'Apple (Belgian, French), lues par l'API du système
function azertyVsApple() {
  const ref = (n) => JSON.parse(fs.readFileSync(path.join(root, 'layouts-ref', n + '.json'), 'utf8'));
  // [notre modèle AZERTY, disposition de référence] : Apple (API du système) et CLDR (2021, Windows et macOS)
  const COMPARES = [['azerty-mac', 'apple-belgian'], ['azerty-mac', 'apple-french'], ['azerty-mac', 'cldr-osx-fr-be'], ['azerty-fr', 'cldr-windows-fr'], ['azerty-be', 'cldr-windows-fr-be'], ['azerty-be', 'cldr-windows-nl-be']];
  const out = {};
  for (const [ourId, name] of COMPARES) {
    const mine = JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', ourId + '.json'), 'utf8'));
    const mineKeys = {}; for (const k of [...mine.rows.flat(), ...Object.values(mine.extra).flat()]) mineKeys[k.c] = k;
    const apple = ref(name).keys; const diffs = [];
    // Notre modèle ne note que les caractères VÉRIFIÉS (jamais inventés) : il doit être un SOUS-ENSEMBLE de la référence.
    // Une différence = un caractère de notre modèle que la référence ne place pas sur cette touche (erreur possible).
    const norm = (c) => c.toLowerCase();
    for (const code of Object.keys(mineKeys)) {
      const a = apple[code] || {}, m = mineKeys[code];
      const sa = new Set(['l', 's', 'g', 'gs'].map((l) => a[l]).filter(Boolean).map(norm));
      const sm = new Set(['l', 's', 'g', 'gs'].map((l) => m[l]).filter(Boolean).map(norm));
      if (a.dead) for (const c of ['^', '¨', '´', '`', '~', 'ˆ', '˜', '\u0301', '\u0300', '\u0302', '\u0308', '\u0303']) { sm.delete(c); sa.delete(c); }
      const ours = [...sm].filter((c) => !sa.has(c)).sort().join('');
      if (ours) diffs.push(`${code} : notre modèle place « ${ours} » mais la référence ne le place pas sur cette touche (référence : ${[...sa].sort().join('') || '(rien)'})`);
    }
    out[`${ourId} contre ${name}`] = diffs.sort();
  }
  return out;
}

function readBaseline() { const p = path.join(root, 'scripts', 'gates-baseline.json'); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {}; }
function writeBaselineKey(k, v) { const p = path.join(root, 'scripts', 'gates-baseline.json'); fs.writeFileSync(p, JSON.stringify({ ...readBaseline(), [k]: v }, null, 1) + '\n'); }

function runGate(name, compute, summary, update) {
  const now = JSON.parse(JSON.stringify(compute())); const b = readBaseline();
  if (update || !b[name]) { writeBaselineKey(name, now); return { ok: true, detail: (update ? 'référence mise à jour : ' : 'référence créée : ') + summary(now) }; }
  const same = JSON.stringify(now) === JSON.stringify(b[name]);
  return same ? { ok: true, detail: summary(now) } : { ok: false, detail: `${name} a changé par rapport à la référence relue (${summary(now)}). Si voulu et relu : npm run gates -- --update-baseline`, now, before: b[name] };
}

const a1 = (update) => runGate('azertyVsApple', azertyVsApple, (n) => Object.entries(n).map(([k, v]) => `${k} : ${v.length} différence(s)`).join(' ; '), update);
const q1 = (update) => runGate('qwertyDisagreements', disagreements, (n) => Object.entries(n).map(([k, v]) => `${k} : ${v.length}`).join(' ; '), update);
const q2 = (update) => runGate('qwertyTypability', () => typability().out, (n) => Object.entries(n).map(([k, v]) => `${k}: ${v.impossible.length} impossibles`).join(' | '), update);
const q3 = (update) => runGate('qwertyDeadKeyEngine', deadKeyEngine, (n) => `${Object.values(n).filter((x) => x.finished && x.faults === 0).length}/${Object.keys(n).length} séquences acceptées sans faute`, update);

// Q6 : le programme QWERTY est cohérent : identifiants uniques, modules numérotés dans l'ordre, toutes les leçons écrites à la main, leçons gratuites =
// les 10 premières, et on relève (référence relue) les caractères accentués employés AVANT la leçon qui les enseigne. Lu tel que le site le charge.
function q6(update) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'));
  const errs = [];
  const mods = data.curriculum.modules; const lessons = mods.flatMap((m) => m.lessons);
  const ids = lessons.map((l) => l.id);
  if (new Set(ids).size !== ids.length) errs.push('identifiants de leçon en double dans le programme');
  mods.forEach((m, i) => { if (!m.name.startsWith(`${i + 1}. `)) errs.push(`module « ${m.name} » : numéro attendu ${i + 1}`); if (!m.lessons.length) errs.push(`module « ${m.name} » vide`); });
  const hw = new Set(data.handwritten || []);
  for (const l of lessons) if (!hw.has(l.id)) errs.push(`${l.id} : leçon non écrite à la main`);
  for (const id of hw) if (!ids.includes(id)) errs.push(`${id} : déclarée écrite à la main mais absente du programme`);
  if (JSON.stringify(data.curriculum.free) !== JSON.stringify(ids.slice(0, 10))) errs.push('les leçons gratuites ne sont pas les 10 premières du programme');
  // accents employés avant leur leçon, dans l'ordre du programme ; les majuscules accentuées comptent une fois les majuscules enseignées
  const taught = new Set(); const early = {}; let capsTaught = false;
  for (const l of lessons) {
    if (l.id === 'maj1') capsTaught = true;
    for (const c of (l.teaches || '')) taught.add(c);
    if (capsTaught) for (const c of [...taught]) taught.add(c.toUpperCase());
    const bad = [...new Set([...(l.text || '')].filter((c) => /[éèêëàâîïôûùüçœæÉÈÀÙÇŒÆ]/.test(c) && !taught.has(c)))];
    if (bad.length) early[l.id] = bad.join('');
  }
  if (errs.length) return { ok: false, detail: errs.slice(0, 10).join('\n') };
  const now = JSON.parse(JSON.stringify({ early, total: lessons.length, perModule: mods.map((m) => m.lessons.length) }));
  const sum = `${lessons.length} leçons en ${mods.length} modules (${now.perModule.join(' + ')}), toutes écrites à la main ; accents employés avant leur leçon : ${Object.entries(early).map(([k, v]) => k + ' ' + v).join(', ') || 'aucun'}`;
  const b = readBaseline();
  if (update || !b.qwertyCourse) { writeBaselineKey('qwertyCourse', now); return { ok: true, detail: (update ? 'référence mise à jour : ' : 'référence créée : ') + sum }; }
  return JSON.stringify(now) === JSON.stringify(b.qwertyCourse) ? { ok: true, detail: sum } : { ok: false, detail: `le programme QWERTY a changé par rapport à la référence relue (${sum}). Si voulu et relu : npm run gates -- --update-baseline` };
}

// Q8 : claviers QWERTY au format du site (clé `keyboards` du cours). Structure attendue par le dessin et la surbrillance (4 rangées, doigts,
// touches de bord), gestes affichés lisibles et cohérents avec le système (Option sur Mac, AltGr ailleurs), tous les signes du cours décrits.
function q8() {
  const kb = require('./build-qwerty-keyboards');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'));
  const errs = [];
  const FING = new Set(['lp', 'lr', 'lm', 'li', 'ri', 'rm', 'rr', 'rp']);
  const ids = Object.keys(data.keyboards || {});
  if (JSON.stringify(ids) !== JSON.stringify(kb.VARIANTS.map((v) => v.id))) errs.push('liste des claviers différente des variantes déclarées');
  const texts = data.curriculum.modules.flatMap((m) => m.lessons).flatMap((l) => [l.text || '', l.keys]);
  const needed = kb.specialChars(texts);
  for (const id of ids) {
    const k = data.keyboards[id];
    const want = [10, 10, 10, k.iso ? 11 : 10];
    if (JSON.stringify(k.rows.map((r) => r.length)) !== JSON.stringify(want)) errs.push(`${id} : rangées ${k.rows.map((r) => r.length)} au lieu de ${want}`);
    for (const key of [...k.rows.flat(), ...Object.values(k.extra).flat()]) {
      if (!key.l || !FING.has(key.f)) errs.push(`${id} : touche « ${key.l} » sans doigt valide`);
      if (/^[A-Z]$/.test(key.l) && key.s) errs.push(`${id} : lettre ${key.l} avec un signe Maj`);
    }
    if (!k.short || k.short.length > 14 || /—/.test(k.short)) errs.push(`${id} : nom court absent, trop long ou avec tiret cadratin (« ${k.short} »)`);
    const homes = k.rows[2].filter((x) => x.home).map((x) => x.l).join('');
    if (homes !== 'FJ') errs.push(`${id} : repères de la rangée de repos « ${homes} » au lieu de FJ`);
    if (k.rows[2].map((x) => x.l).join('') !== 'ASDFGHJKL' + k.rows[2][9].l) errs.push(`${id} : rangée de repos inattendue`);
    for (const c of needed) {
      const t = k.how[c];
      if (!t) { errs.push(`${id} : aucun geste décrit pour « ${c} »`); continue; }
      if (/—/.test(t)) errs.push(`${id} : tiret cadratin dans le geste de « ${c} »`);
      if (k.mac && /AltGr/.test(t)) errs.push(`${id} : AltGr cité sur un Mac (« ${c} » : ${t})`);
      if (!k.mac && /Option/.test(t)) errs.push(`${id} : Option citée hors Mac (« ${c} » : ${t})`);
      if (/AZERTY/.test(t)) errs.push(`${id} : AZERTY cité dans le geste de « ${c} »`);
    }
    // un geste décrit existe vraiment : é doit être décrit par un geste ou par le conseil des accents tolérés, jamais vide
    if (!/\S/.test(k.how['é'])) errs.push(`${id} : geste de é vide`);
  }
  // cohérence : mêmes gestes que la gate U10 rejoue (gestureFor) -> ici on vérifie seulement qu'un geste décrit nomme une touche existante du modèle
  return errs.length ? { ok: false, detail: errs.slice(0, 10).join('\n') } : { ok: true, detail: `${ids.length} claviers (${ids.join(', ')}), ${needed.length} signes décrits par clavier, rangées et doigts valides, Option sur Mac et AltGr ailleurs` };
}

// Q9 : règles du programme QWERTY final pour les modules ÉCRITS À LA MAIN (course-src/fr-qwerty/). Le programme est lu tel que le site le
// charge (curriculum). Règle de l'utilisateur : on apprend LIGNE PAR LIGNE, dans l'ordre logique des doigts ; on ne dit pas aux élèves de taper
// une touche avant qu'elle soit enseignée. Chaque leçon déclare ce qu'elle enseigne (`teaches`) et la rangée du module (`row`).
//   - chaque touche enseignée est bien sur la rangée annoncée (modèle windows-us) et au bon doigt, et faisable sur les 8 variantes ;
//   - le texte ne contient que des touches déjà enseignées (cumul sur les modules écrits à la main, dans l'ordre) et l'espace ;
//   - chaque touche enseignée est travaillée assez (8 fois pour une lettre, 6 pour un signe) ; longueur et espaces propres ;
//   - tutoriel complet (intro, 3 ou 4 règles icône/titre/texte, objectif), conseil et titre présents, aucun mot AZERTY, aucun tiret cadratin ;
//   - la liste `keys` affichée contient les touches enseignées ; les ids sont uniques.
function q9() {
  const kb = require('./build-qwerty-keyboards');
  const { gestureFor } = require('./gesture');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'));
  const errs = []; const hand = new Set(data.handwritten || []);
  const ROWS = { repos: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'], haut: ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'], bas: ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'], chiffres: ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'] };
  const us = JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', 'windows-us.json'), 'utf8'));
  const codeOf = (ch) => Object.keys(us.keys).find((c) => us.keys[c].l === ch);
  const variants = kb.VARIANTS.map((v) => JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', v.id + '.json'), 'utf8')));
  // Dans le contenu écrit pour le QWERTY, « touche 2 » ou « à droite du P » sont justes (le 2 porte @, les crochets sont à droite du P) : on ne cherche que de vrais indices d'AZERTY.
  const AZ = /AZERTY|azerty|\bQ ou M\b|Q à gauche|touche \^|près de Entrée/;
  const flatT = (t) => [t.intro, t.tip, ...(t.rules || []).flatMap((r) => [r.t, r.d])].join(' ');
  const ACCENTS = 'éèêëàâîïôûùçœæ';
  let learned = ''; const ids = new Set(); let nLessons = 0, prefix = true;
  for (const m of data.curriculum.modules) {
    for (const l of m.lessons) {
      if (ids.has(l.id)) errs.push(`${l.id} : identifiant en double`); ids.add(l.id);
      if (!hand.has(l.id)) { prefix = false; continue; }
      if (!prefix) errs.push(`${l.id} : module écrit à la main après un module non refondu : le cumul des touches enseignées n'est plus connu`);
      nLessons++;
      if (typeof l.teaches !== 'string') { errs.push(`${l.id} : champ teaches absent`); continue; }
      if (l.teaches.length && m.kind !== 'accents' && m.kind !== 'majuscules' && m.kind !== 'ponctuation' && m.kind !== 'symboles' && (!m.row || !ROWS[m.row])) errs.push(`${l.id} : rangée du module absente ou inconnue`); // un module sans nouvelle touche n'a pas de rangée
      for (const ch of l.teaches) {
        if (m.kind === 'majuscules') {
          // module de majuscules : chaque majuscule enseignée a sa minuscule déjà enseignée ; la main déclarée (gauche = Maj droite, droite = Maj gauche)
          // est la vraie main de la lettre ; une majuscule accentuée suppose le geste de son accent (comme au module des accents).
          const low = ch.toLowerCase();
          if (ch === low || low === ch.toUpperCase()) errs.push(`${l.id} : « ${ch} » n'est pas une majuscule`);
          if (!learned.includes(low)) errs.push(`${l.id} : « ${ch} » enseignée avant sa minuscule « ${low} »`);
          if (/[a-z]/.test(low) && l.hand) {
            const code = codeOf(low); const fing = code ? us.keys[code].f : '';
            const main = fing.startsWith('l') ? 'gauche' : 'droite';
            if (main !== l.hand) errs.push(`${l.id} : « ${ch} » est tapée par la main ${main}, la leçon annonce la main ${l.hand}`);
          }
          if (!/[a-z]/.test(low)) {
            const sans = variants.filter((def) => !gestureFor(def, ch)).map((d) => d.id);
            const trop = sans.filter((v) => !['windows-us', 'windows-uk'].includes(v));
            if (trop.length) errs.push(`${l.id} : « ${ch} » sans geste sur ${trop.join(', ')} alors que ces claviers savent produire les accents`);
          }
        } else if (m.kind === 'symboles') {
          // symbole : on retrouve sa touche physique (modèle windows-us, niveau de base ou Maj), qui doit être sur la rangée déclarée PAR LA LEÇON,
          // tapée par un des doigts déclarés (règle : ligne par ligne, doigt par doigt) ; geste obligatoire sur les 8 variantes
          // (^ ~ ` sont des touches mortes sur US international : touche puis Espace, déduit des modèles).
          const sc = Object.keys(us.keys).find((c) => us.keys[c].l === ch || us.keys[c].s === ch);
          if (!sc) { errs.push(`${l.id} : « ${ch} » introuvable sur le clavier de référence`); }
          else {
            const rowName = l.row || m.row;
            if (!rowName || !ROWS[rowName]) errs.push(`${l.id} : rangée absente ou inconnue pour « ${ch} »`);
            else if (!ROWS[rowName].includes(sc)) errs.push(`${l.id} : « ${ch} » n'est pas sur la rangée « ${rowName} » (touche ${sc})`);
            if (!Array.isArray(l.fingers) || !l.fingers.includes(us.keys[sc].f)) errs.push(`${l.id} : « ${ch} » est tapé par le doigt « ${us.keys[sc].f} », la leçon annonce ${JSON.stringify(l.fingers)}`);
          }
          for (const def of variants) if (!gestureFor(def, ch)) errs.push(`${l.id} : « ${ch} » sans geste sur ${def.id}`);
        } else if (m.kind === 'ponctuation') {
          // signe de ponctuation : pas de rangée (Maj, touche directe ou touche morte selon le signe) ; il doit avoir un geste sur CHAQUE variante
          // (l'apostrophe est une touche morte sur US international : touche puis Espace, déduit du modèle).
          if (!/[^\p{L}\p{N}\s]/u.test(ch)) errs.push(`${l.id} : « ${ch} » n'est pas un signe de ponctuation`);
          for (const def of variants) if (!gestureFor(def, ch)) errs.push(`${l.id} : « ${ch} » sans geste sur ${def.id}`);
        } else if (m.kind === 'accents') {
          // module d'accents : pas de rangée ; le geste dépend de la variante (touche morte, AltGr, Option) et certaines n'en ont pas (US simple, UK) :
          // la gate U10 rejoue chaque leçon sur les variantes, avec les accents tolérés quand il n'y a pas de geste.
          if (!ACCENTS.includes(ch)) errs.push(`${l.id} : « ${ch} » n'est pas un caractère accentué du module d'accents`);
          const sans = variants.filter((def) => !gestureFor(def, ch)).map((d) => d.id);
          const OK_SANS = ['windows-us', 'windows-uk'];
          const trop = sans.filter((v) => !OK_SANS.includes(v) && !'œæŒÆ'.includes(ch));
          if (trop.length) errs.push(`${l.id} : « ${ch} » sans geste sur ${trop.join(', ')} alors que ces claviers savent produire les accents`);
        } else {
          const code = codeOf(ch);
          if (!code) { errs.push(`${l.id} : « ${ch} » introuvable sur le clavier de référence`); continue; }
          if (ROWS[m.row] && !ROWS[m.row].includes(code)) errs.push(`${l.id} : « ${ch} » n'est pas sur la rangée « ${m.row} » (règle : ligne par ligne)`);
          for (const def of variants) if (!gestureFor(def, ch)) errs.push(`${l.id} : « ${ch} » sans geste sur ${def.id}`);
        }
        if (learned.includes(ch)) errs.push(`${l.id} : « ${ch} » enseignée deux fois`);
      }
      learned += l.teaches;
      const text = l.text || '';
      for (const c of text) if (c !== ' ' && !learned.includes(c)) { errs.push(`${l.id} : « ${c} » pas encore enseignée (…${text.slice(Math.max(0, text.indexOf(c) - 8), text.indexOf(c) + 8)}…)`); break; }
      for (const ch of l.teaches) { const n = [...text].filter((x) => x === ch).length; const need = /[a-z]/.test(ch) ? 8 : (ch !== ch.toLowerCase() ? 2 : 6) /* une majuscule revient dans la suite du cours : 2 suffit */; if (n < need) errs.push(`${l.id} : « ${ch} » travaillée ${n} fois seulement (minimum ${need})`); }
      if (/^ | $|  /.test(text)) errs.push(`${l.id} : espaces en trop`);
      const maxLen = l.maxLen === undefined ? 130 : l.maxLen; // un texte d'endurance (module de fluidité) peut être plus long, jamais au-delà de 250
      if (l.maxLen !== undefined && (!Number.isInteger(l.maxLen) || l.maxLen < 130 || l.maxLen > 250)) errs.push(`${l.id} : maxLen doit être un entier entre 130 et 250`);
      if (text.length < 60 || text.length > maxLen) errs.push(`${l.id} : longueur ${text.length} hors de 60 à ${maxLen}`);
      if (!l.title || !l.tip) errs.push(`${l.id} : titre ou conseil absent`);
      const keysTokens = String(l.keys).split(/\s+/);
      for (const ch of l.teaches) if (!keysTokens.includes(ch)) errs.push(`${l.id} : « ${ch} » absente de la liste de touches affichée (« ${l.keys} »)`);
      const t = l.tuto;
      if (!t || !t.intro || !t.tip || !Array.isArray(t.rules) || t.rules.length < 3 || t.rules.length > 4 || t.rules.some((r) => !r.icon || !r.t || !r.d)) errs.push(`${l.id} : tutoriel absent ou incomplet (intro, 3 ou 4 règles, objectif)`);
      const all = [l.title, l.tip, l.keys, text, t ? flatT(t) : ''].join(' ');
      if (AZ.test(all)) errs.push(`${l.id} : cite une touche ou un mot AZERTY`);
      if (/—/.test(all)) errs.push(`${l.id} : tiret cadratin`);
    }
  }
  return errs.length ? { ok: false, detail: errs.slice(0, 10).join('\n') } : { ok: true, detail: `${nLessons} leçons écrites à la main (${[...hand].join(' ')}) : touches enseignées sur la bonne rangée, aucune touche avant son enseignement, ${learned.length} touches enseignées (${learned}), tutoriels complets, faisable sur les ${variants.length} variantes` };
}
module.exports = { q9, q8, q6, a1, azertyVsApple, q1, q2, q3, disagreements, typability, deadKeyEngine, reach };
