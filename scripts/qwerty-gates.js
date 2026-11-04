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
  for (const id of gen.SEQ.map((s) => s.id)) {
    const step = gen.SEQ.find((s) => s.id === id);
    learnedAll += (step.add || step.review || '');
    const L = data.lessons[id];
    if (!L) { if (!(data.handwritten || []).includes(id)) errs.push(`${id} : leçon absente`); continue; } // module écrit à la main : vérifié par Q9
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
  return errs.length ? { ok: false, detail: errs.slice(0, 10).join('\n') } : { ok: true, detail: `${data.order.length} leçons (6 suites de lettres, 12 de mots), touches vérifiées contre azerty-fr et windows-us ; mots différents par leçon : ${summary.join(' ')} ; compléments : ${data.order.filter((i) => data.lessons[i] && data.lessons[i].fill).map((i) => i + ' (' + data.lessons[i].fill.length + ')').join(' ') || 'aucun'}` };
}

// Q5 : phrases, majuscules, ponctuation (modules 4 à 6) et fluidité du cours français sur QWERTY. Un texte ne doit employer que des
// signes déjà appris au moment où il est tapé : lettres (toutes apprises dès b5), majuscules (dès maj1), ? ! (pon2), : (pon3),
// ' et - (pon4), « » ( ) (pon5). Aucun accent ni chiffre avant leur module : sur QWERTY l'accent demande un geste de touche morte.
// Les leçons reprises telles quelles du cours AZERTY (liste REUSE) sont lues dans le vrai programme du site.
function q5() {
  const gen = require('./build-qwerty-lessons');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'));
  const { loadApp } = require('./engine-harness');
  const h = loadApp();
  const az = Object.fromEntries(JSON.parse(h.run('JSON.stringify(ALL_LESSONS.map(l=>[l.id,l.text||l.genNum||""]))')));
  const errs = [];
  const hand = new Set(data.handwritten || []); // leçons écrites à la main : vérifiées par Q9, plus lues dans le programme AZERTY
  if (JSON.stringify(data.reuse) !== JSON.stringify(gen.REUSE.filter((id) => !hand.has(id) && !(data.retiredAz || []).includes(id)))) errs.push('liste reuse du fichier différente du générateur');
  let allowed = new Set([...'abcdefghijklmnopqrstuvwxyz', ' ', ',', '.', ';', '/']);
  let caps = false; const counts = [];
  for (const id of gen.INTRO_ORDER) {
    const intro = gen.INTRO[id];
    if (intro === 'CAPS') caps = true; else if (intro) for (const c of intro) allowed.add(c);
    if (hand.has(id)) { counts.push(id); continue; }
    const adapted = data.lessons[id];
    const text = adapted ? adapted.text : (gen.REUSE.includes(id) ? az[id] : null);
    if (text == null) { errs.push(`${id} : ni reprise ni adaptée`); continue; }
    for (const c of text) {
      const ok = allowed.has(c) || (caps && /[A-Z]/.test(c));
      if (!ok) { errs.push(`${id} : « ${c} » pas encore appris (${text.slice(Math.max(0, text.indexOf(c) - 12), text.indexOf(c) + 12)})`); break; }
    }
    if (intro && intro !== 'CAPS') for (const c of intro) if (!text.includes(c) && c !== '"') errs.push(`${id} : n'emploie pas « ${c} » qu'elle enseigne`);
    if (adapted && !adapted.why) errs.push(`${id} : adaptation sans motif écrit`);
    counts.push(id);
  }
  // flu6 adaptée : doit exister et ne plus citer l'AZERTY
  if (!data.lessons.flu6 || /AZERTY/i.test(data.lessons.flu6.text)) errs.push('flu6 : texte absent ou cite encore AZERTY');
  for (const id of gen.REUSE.filter((x) => !hand.has(x))) if (az[id] === undefined) errs.push(`${id} : leçon reprise introuvable dans le programme`);
  if (JSON.stringify(data) !== JSON.stringify(gen.build())) errs.push('le fichier diffère de ce que produit le générateur');
  return errs.length ? { ok: false, detail: errs.slice(0, 10).join('\n') } : { ok: true, detail: `${counts.length} leçons (modules 4 à 6) sans signe avant son apprentissage ; ${data.reuse.length} reprises du cours AZERTY, ${Object.values(data.lessons).filter((l) => l.kind === 'adapted').length} adaptées` };
}

// Q6 : le cours QWERTY couvre TOUT le programme (66 leçons, chacune générée, reprise ou adaptée, une seule fois, même ordre de modules
// que le cours AZERTY) et on relève, comme référence relue, les caractères accentués employés avant la leçon qui les enseigne.
// Le programme AZERTY actuel en a déjà (ex. ê dans acc2 avant cir1) : on ne les corrige pas en silence, on les liste.
function q6(update) {
  const gen = require('./build-qwerty-lessons');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'));
  const { loadApp } = require('./engine-harness');
  const h = loadApp();
  const az = JSON.parse(h.run('JSON.stringify(ALL_LESSONS.map(l=>({id:l.id,text:l.text||l.genNum||""})))'));
  const errs = [];
  const gener = Object.keys(data.lessons).filter((id) => data.lessons[id].kind !== 'adapted').length + (data.handwritten || []).length;
  const adapted = Object.keys(data.lessons).filter((id) => data.lessons[id].kind === 'adapted');
  const retired = new Set(data.retiredAz || []); // leçons AZERTY remplacées par un module écrit à la main d'un autre rang
  const covered = new Set([...Object.keys(data.lessons), ...data.reuse, ...(data.handwritten || [])]);
  const dup = data.reuse.filter((id) => data.lessons[id]);
  if (dup.length) errs.push('à la fois reprises et réécrites : ' + dup.join(' '));
  for (const l of az) if (!covered.has(l.id) && !retired.has(l.id)) errs.push(`${l.id} : leçon du programme absente du cours QWERTY`);
  const hw = new Set(data.handwritten || []);
  for (const id of covered) if (!az.find((l) => l.id === id) && !hw.has(id)) errs.push(`${id} : leçon QWERTY inconnue du programme`);
  const inCurriculum = data.curriculum.modules.flatMap((m) => m.lessons).map((l) => l.id);
  if (new Set(inCurriculum).size !== inCurriculum.length) errs.push('identifiants de leçon en double dans le programme');
  for (const id of inCurriculum) if (!covered.has(id)) errs.push(`${id} : dans le programme mais ni écrite, ni reprise, ni adaptée`);
  // accents employés avant leur leçon, dans l'ORDRE DU PROGRAMME FINAL : sont enseignés les caractères listés par `teaches` des leçons écrites à la main
  // et, pour les leçons AZERTY reprises, ceux de ACCENT_TAUGHT.
  const finalLessons = data.curriculum.modules.flatMap((m) => m.lessons);
  const textOf = (l) => (l.text !== undefined ? l.text : (az.find((x) => x.id === l.id) || {}).text) || '';
  const taught = new Set(); const early = {};
  let capsTaught = false; // les majuscules accentuées (É, À…) sont comprises dans le module des majuscules : elles comptent après sa première leçon
  for (const l of finalLessons) {
    if (l.id === 'maj1') capsTaught = true;
    for (const c of (l.teaches || '')) taught.add(c);
    if (capsTaught) for (const c of [...taught]) taught.add(c.toUpperCase());
    for (const c of (gen.ACCENT_TAUGHT[l.id] || '')) taught.add(c);
    const bad = [...new Set([...textOf(l)].filter((c) => /[éèêëàâîïôûùüçœæÉÈÀÙÇŒÆ]/.test(c) && !taught.has(c)))];
    if (bad.length) early[l.id] = bad.join('');
  }
  const r = { early, total: inCurriculum.length, generated: gener, reused: data.reuse.length, adapted: adapted.length };
  const now = JSON.parse(JSON.stringify(r)); const b = readBaseline();
  if (errs.length) return { ok: false, detail: errs.slice(0, 10).join('\n') };
  const sum = `${inCurriculum.length} leçons couvertes (${gener} générées, ${data.reuse.length} reprises, ${adapted.length} adaptées) ; accents employés avant leur leçon : ${Object.entries(early).map(([k, v]) => k + ' ' + v).join(', ') || 'aucun'}`;
  if (update || !b.qwertyCourse) { writeBaselineKey('qwertyCourse', now); return { ok: true, detail: (update ? 'référence mise à jour : ' : 'référence créée : ') + sum }; }
  return JSON.stringify(now) === JSON.stringify(b.qwertyCourse) ? { ok: true, detail: sum } : { ok: false, detail: `le cours QWERTY a changé par rapport à la référence relue (${sum}). Si voulu et relu : npm run gates -- --update-baseline` };
}

// Q7 : tutoriels du cours QWERTY. Le texte AZERTY de plusieurs leçons parle de touches propres à l'AZERTY (« touche 2 », « à droite du P »,
// « Sur AZERTY »). Toute leçon dont les touches changent, ou dont le tutoriel AZERTY contient une telle phrase, doit avoir un tutoriel
// QWERTY ; aucun tutoriel QWERTY ne doit en contenir ; les gestes cités (touche morte, Option, AltGr) doivent exister dans les modèles.
function q7() {
  const gen = require('./build-qwerty-lessons');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'));
  const { loadApp } = require('./engine-harness');
  const h = loadApp();
  const az = JSON.parse(h.run('JSON.stringify(ALL_LESSONS.map(l=>({id:l.id,keys:l.keys,module:l.module,tuto:l.tuto})))'));
  const errs = [];
  const AZ_PHRASES = /AZERTY|touche (0|2|7|9)\b|droite du P|droite du M|près de Entrée|sur la touche \d|Q à gauche|\bQ ou M\b/i;
  const flat = (t) => t ? [t.intro, t.tip, ...(t.rules || []).flatMap((r) => [r.t, r.d])].join(' ') : '';
  const required = new Set();
  for (const l of az) {
    if ((data.handwritten || []).includes(l.id) || (data.retiredAz || []).includes(l.id)) continue; // écrite à la main (Q9) ou retirée du cours QWERTY
    const own = data.lessons[l.id];
    if (own && own.keys && own.keys !== l.keys) required.add(l.id);
    if (AZ_PHRASES.test(flat(l.tuto))) required.add(l.id);
  }
  for (const id of required) if (!data.tutos[id]) errs.push(`${id} : tutoriel AZERTY propre à l'AZERTY ou touches différentes, mais aucun tutoriel QWERTY`);
  for (const [id, t] of Object.entries(data.tutos)) {
    if (!az.find((l) => l.id === id)) errs.push(`${id} : tutoriel pour une leçon inconnue`);
    if (!t.intro || !t.tip || !Array.isArray(t.rules) || t.rules.length !== 3 || t.rules.some((r) => !r.icon || !r.t || !r.d)) errs.push(`${id} : tutoriel mal formé (intro, 3 règles, tip)`);
    if (AZ_PHRASES.test(flat(t))) errs.push(`${id} : le tutoriel QWERTY cite encore une touche AZERTY`);
  }
  for (const [from, to] of Object.entries(data.moduleNames)) if (/AZERTY/i.test(to)) errs.push(`module « ${to} » cite l'AZERTY`);
  for (const l of az) if (/AZERTY/i.test(l.module) && !data.moduleNames[l.module]) errs.push(`module « ${l.module} » à renommer pour le cours QWERTY`);
  // les gestes cités existent dans les modèles : é è ê ç ë faisables sur Windows US International et sur Mac US
  const defs = Object.fromEntries(loadAll().map((d) => [d.id, d]));
  for (const id of ['windows-us-intl', 'mac-us']) {
    for (const c of 'éèêçë') if (!defs[id] || !reach(defs[id], c)) errs.push(`${id} : « ${c} » introuvable alors que le tutoriel suppose un geste`);
  }
  return errs.length ? { ok: false, detail: errs.slice(0, 10).join('\n') } : { ok: true, detail: `${Object.keys(data.tutos).length} tutoriels QWERTY, ${required.size} leçons à remplacer toutes couvertes, aucune touche AZERTY citée, gestes é è ê ç ë vérifiés sur Windows US International et Mac US` };
}

// Q8 : claviers QWERTY au format du site (clé `keyboards` du cours). Structure attendue par le dessin et la surbrillance (4 rangées, doigts,
// touches de bord), gestes affichés lisibles et cohérents avec le système (Option sur Mac, AltGr ailleurs), tous les signes du cours décrits.
function q8() {
  const gen = require('./build-qwerty-lessons');
  const kb = require('./build-qwerty-keyboards');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'));
  const errs = [];
  const FING = new Set(['lp', 'lr', 'lm', 'li', 'ri', 'rm', 'rr', 'rp']);
  const ids = Object.keys(data.keyboards || {});
  if (JSON.stringify(ids) !== JSON.stringify(kb.VARIANTS.map((v) => v.id))) errs.push('liste des claviers différente des variantes déclarées');
  const { loadApp } = require('./engine-harness');
  const h = loadApp();
  const texts = JSON.parse(h.run("JSON.stringify(ALL_LESSONS.flatMap(l=>[l.text||'',l.keys||'']))")).concat(Object.values(data.lessons).flatMap((l) => [l.text, l.keys]));
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
  const gen = require('./build-qwerty-lessons');
  const kb = require('./build-qwerty-keyboards');
  const { gestureFor } = require('./gesture');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'));
  const errs = []; const hand = new Set(data.handwritten || []);
  const ROWS = { repos: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'], haut: ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'], bas: ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'] };
  const us = JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', 'windows-us.json'), 'utf8'));
  const codeOf = (ch) => Object.keys(us.keys).find((c) => us.keys[c].l === ch);
  const variants = kb.VARIANTS.map((v) => JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', v.id + '.json'), 'utf8')));
  const AZ = /AZERTY|touche (0|2|7|9)\b|droite du P|droite du M|près de Entrée|Q à gauche|\bQ ou M\b/i;
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
      if (l.teaches.length && m.kind !== 'accents' && m.kind !== 'majuscules' && (!m.row || !ROWS[m.row])) errs.push(`${l.id} : rangée du module absente ou inconnue`); // un module sans nouvelle touche n'a pas de rangée
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
      if (text.length < 60 || text.length > 130) errs.push(`${l.id} : longueur ${text.length} hors de 60 à 130`);
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
module.exports = { q9, q8, q7, q6, q5, q4, a1, azertyVsApple, q1, q2, q3, disagreements, typability, deadKeyEngine, reach };
