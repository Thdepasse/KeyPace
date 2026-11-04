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

// Q4 : leçons de lettres du cours français sur QWERTY (courses-src/fr-qwerty.json, générées par scripts/build-qwerty-lessons.js).
// Ce qu'on prouve : (1) les touches enseignées sont bien AUX MÊMES TOUCHES PHYSIQUES que la leçon AZERTY correspondante,
// lues dans nos deux modèles (azerty-fr, windows-us), pas dans le générateur ; (2) chaque texte ne contient que des lettres et signes déjà appris ;
// (3) chaque nouvelle touche est bien travaillée ; (4) les mots viennent des listes du site ; (5) le fichier est exactement ce que
// le générateur produit (rien de modifié à la main sans le dire).
function q4() {
  const gen = require('./build-qwerty-lessons');
  const errs = [];
  const file = path.join(root, 'courses-src', 'fr-qwerty.json');
  if (!fs.existsSync(file)) return { ok: false, detail: 'courses-src/fr-qwerty.json absent : node scripts/build-qwerty-lessons.js' };
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (JSON.stringify(data) !== JSON.stringify(gen.build())) errs.push('le fichier diffère de ce que produit le générateur (relancer node scripts/build-qwerty-lessons.js, ou le dire)');
  const az = JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', 'azerty-fr.json'), 'utf8'));
  const us = JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', 'windows-us.json'), 'utf8'));
  const azCode = {}; for (const k of [...az.rows.flat(), ...Object.values(az.extra || {}).flat()]) azCode[k.l.toLowerCase()] = k.c;
  const usChar = (code) => ((us.keys[code] || {}).l || '').toLowerCase();
  const { loadApp } = require('./engine-harness');
  const h = loadApp();
  const azLessons = Object.fromEntries(JSON.parse(h.run('JSON.stringify(ALL_LESSONS.map(l=>[l.id,l.keys]))')));
  const pool = new Set(gen.wordPool(h));
  const PUNCT_AFTER = { ',': 'b3', '.': 'b4', '/': 'b5', ';': 'r4' };
  let learnedAll = '';
  const summary = [];
  for (const id of data.order) {
    const L = data.lessons[id]; if (!L) { errs.push(`${id} : leçon absente`); continue; }
    const step = gen.SEQ.find((s) => s.id === id);
    learnedAll += (step.add || step.review || '');
    // (1) mêmes touches physiques que la leçon AZERTY
    if (!step.review) {
      const want = String(azLessons[id]).split(/\s+/).filter((x) => x.length === 1).map((c) => azCode[c]).filter(Boolean).map(usChar).sort().join('');
      const got = step.add.split('').sort().join('');
      if (want !== got) errs.push(`${id} : enseigne « ${got} » mais les mêmes touches physiques que la leçon AZERTY donnent « ${want} » sur QWERTY`);
    }
    // (2) seulement des signes déjà appris
    const allowed = new Set([...learnedAll.split(''), ' ']);
    for (const c of L.text) if (!allowed.has(c)) { errs.push(`${id} : « ${c} » pas encore appris (${L.text.slice(0, 40)}…)`); break; }
    if (L.learned.split('').sort().join('') !== [...new Set(learnedAll)].sort().join('')) errs.push(`${id} : champ learned incohérent`);
    // (3) nouvelles touches travaillées
    const min = L.kind === 'drill' ? 6 : 3;
    for (const c of (L.newKeys || '')) { const n = [...L.text].filter((x) => x === c).length; if (n < (/[a-z]/.test(c) ? min : 2)) errs.push(`${id} : « ${c} » n'apparaît que ${n} fois`); }
    if (/^ | $|  /.test(L.text)) errs.push(`${id} : espaces en trop`);
    if (L.text.length < 60 || L.text.length > 170) errs.push(`${id} : longueur ${L.text.length} hors de 60 à 170`);
    // (4) mots tirés des listes du site (hors suites de lettres et paires à barre oblique)
    if (L.kind === 'words') {
      const toks = L.text.split(' ').map((t) => t.replace(/[,.]$/, ''));
      const pairs = new Set(gen.SLASH_PAIRS);
      const fill = new Set(L.fill || []);
      if (fill.size > 8) errs.push(`${id} : trop de suites de lettres de complément (${fill.size})`);
      for (const t of toks) { if (pairs.has(t) || fill.has(t)) continue; if (!pool.has(t)) errs.push(`${id} : « ${t} » n'est pas dans les listes de mots du site`); }
      const distinct = new Set(toks.filter((t) => !fill.has(t))).size; if (distinct < 6) errs.push(`${id} : seulement ${distinct} mots différents`);
      summary.push(`${id}:${distinct}`);
    }
  }
  return errs.length ? { ok: false, detail: errs.slice(0, 10).join('\n') } : { ok: true, detail: `${data.order.length} leçons (6 suites de lettres, 12 de mots), touches vérifiées contre azerty-fr et windows-us ; mots différents par leçon : ${summary.join(' ')} ; compléments : ${data.order.filter((i) => data.lessons[i].fill).map((i) => i + ' (' + data.lessons[i].fill.length + ')').join(' ') || 'aucun'}` };
}
module.exports = { q4, a1, azertyVsApple, q1, q2, q3, disagreements, typability, deadKeyEngine, reach };
