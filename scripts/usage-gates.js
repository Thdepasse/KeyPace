// Gates de « logique d'utilisation » (plan, 4.19) : ils font tourner le VRAI code de index.html
// (scripts/engine-harness.js) comme le ferait un élève, et vérifient que le parcours aboutit.
const fs = require('fs');
const path = require('path');
const { loadApp } = require('./engine-harness');
const { sanitizeProgress, KNOWN_KEYS } = require('../api/_progress-sanitize');
const { mergeProgress } = require('../api/_progress-merge');

const root = path.join(__dirname, '..');
const LAYOUTS = ['fr', 'be', 'mac', 'nf'];
const loadLayout = (v) => JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', `azerty-${v}.json`), 'utf8'));

// Tolérances déjà documentées (KB_HOW, mémoire « keyboard-compat ») : caractère sans touche -> frappes acceptées.
const TOLERANCE = { '«': ['"'], '»': ['"'], 'œ': ['o', 'e'], 'Œ': ['O', 'e'], 'æ': ['a', 'e'], 'Æ': ['A', 'e'], 'É': ['2'] };
// Touches mortes : comment l'obtenir selon la disposition (code physique, avec Maj ou non).
const DEAD_KEYS = (layout) => (layout === 'nf' ? { '^': { code: 'Equal', shift: false }, '¨': { code: 'Equal', shift: true } } : { '^': { code: 'BracketLeft', shift: false }, '¨': { code: 'BracketLeft', shift: true } });

function typableSet(def) {
  const set = new Set([' ']);
  for (const k of [...def.rows.flat(), ...Object.values(def.extra).flat()]) {
    for (const f of ['l', 's', 'g', 'gs']) if (k[f]) set.add(k[f]);
    if (/^[A-Za-z]$/.test(k.l)) { set.add(k.l.toLowerCase()); set.add(k.l.toUpperCase()); }
  }
  return set;
}

const EV = (o) => `({key:${JSON.stringify(o.key)},code:${JSON.stringify(o.code || '')},repeat:false,altKey:${!!o.alt},ctrlKey:false,shiftKey:${!!o.shift},metaKey:false,target:null,preventDefault(){},stopPropagation(){},getModifierState(){return false}})`;
function press(h, o, ms = 150) { h.advance(ms); h.run('app.handleKey(' + EV(o) + ')'); }

// Frappes d'un élève pour un caractère, sur une disposition. Retourne null si c'est impossible.
function plan(ch, layout, direct, dead) {
  if (direct.has(ch)) return [{ key: ch, shift: ch !== ch.toLowerCase() && /[A-Z]/.test(ch) }];
  if (dead[ch] && direct.has(dead[ch][0])) { const d = DEAD_KEYS(layout)[dead[ch][0]]; return d ? [{ key: 'Dead', code: d.code, shift: d.shift }, { key: ch }] : null; }
  if (TOLERANCE[ch]) return TOLERANCE[ch].map((k) => ({ key: k }));
  return null;
}
function login(h) { h.run("currentUser='tester';currentToken='tok';currentUserId='uid';_statsLoaded=true;app.stats=mergeStats();"); }
function startLesson(h, id) { h.run("app.stats=app.stats||mergeStats();app.view='lessons';app.sess=app.makeSession('lesson'," + JSON.stringify(id) + ');'); return h.run('app.sess.text'); }

// U1 : chaque leçon se termine, sans faute, sur chaque disposition
function u1() {
  const h = loadApp(); if (h.errors.length) return { ok: false, detail: 'chargement : ' + h.errors[0] };
  login(h);
  const ids = h.run('ALL_LESSONS.map(l=>l.id)'); const dead = h.run('KB_DEAD_DECOMP');
  const errs = []; let sessions = 0;
  for (const lay of LAYOUTS) {
    const direct = typableSet(loadLayout(lay));
    h.store.kp_kb_layout = lay; h.run(`applyKbLayout('${lay}')`);
    for (const id of ids) {
      const text = startLesson(h, id); sessions++;
      let impossible = null;
      for (const ch of text) {
        const steps = plan(ch, lay, direct, dead);
        if (!steps) { impossible = ch; break; }
        steps.forEach((s) => press(h, s));
      }
      if (impossible) { errs.push(`${lay}/${id} : « ${impossible} » impossible à taper`); continue; }
      const fin = h.run('app.sess.finished'), ks = h.run('app.sess.keystrokes'), co = h.run('app.sess.correct');
      if (!fin) errs.push(`${lay}/${id} : leçon non terminée (${h.run('app.sess.idx')}/${text.length})`);
      else if (ks !== co) errs.push(`${lay}/${id} : ${ks - co} faute(s) en tapant juste`);
    }
  }
  return errs.length ? { ok: false, detail: errs.slice(0, 10).join('\n') } : { ok: true, detail: `${sessions} leçons terminées sans faute (${ids.length} leçons x ${LAYOUTS.length} dispositions)` };
}

// U2 : ce que le vrai client envoie est accepté tel quel par le serveur
async function u2() {
  const h = loadApp(); login(h);
  const ids = h.run('ALL_LESSONS.map(l=>l.id)').slice(0, 8);
  const dead = h.run('KB_DEAD_DECOMP'); const direct = typableSet(loadLayout('fr'));
  for (const id of ids) { const t = startLesson(h, id); for (const ch of t) (plan(ch, 'fr', direct, dead) || []).forEach((s) => press(h, s)); }
  h.run("app.sess=app.makeSession('test');"); const tt = h.run('app.sess.text'); h.run("app.view='test'");
  for (const ch of tt) (plan(ch, 'fr', direct, dead) || [{ key: ch }]).forEach((s) => press(h, s));
  h.fetchCalls.length = 0;
  await h.run('flushStats()');
  const call = h.fetchCalls.find((c) => c.url.includes('/api/save-progress'));
  if (!call) return { ok: false, detail: "aucune requête vers /api/save-progress après une session terminée" };
  const data = call.body.data; const errs = [];
  const cleaned = sanitizeProgress(data, {});
  if (cleaned.dropped.length) errs.push(`le serveur écarterait : ${[...new Set(cleaned.dropped)].join(', ')}`);
  if (cleaned.unknownKeys.length) errs.push(`clés inconnues du serveur : ${cleaned.unknownKeys.join(', ')}`);
  const stable = JSON.stringify(sanitizeProgress(data, data).data) === JSON.stringify(Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'role' && k !== 'classes' && k !== 'courses')));
  if (!stable) errs.push('le nettoyage serveur modifie le bloc envoyé');
  const m = mergeProgress(data, data);
  if (JSON.stringify(m.data) !== JSON.stringify(data) || m.changes.length) errs.push(`fusionner le bloc avec lui-même change ${m.changes.join(', ')}`);
  const lessons = Object.keys(data.lessons || {});
  if (lessons.length !== ids.length) errs.push(`${lessons.length} leçons enregistrées au lieu de ${ids.length}`);
  if (!(data.tests || []).length) errs.push('aucun test enregistré');
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: `${lessons.length} leçons et ${data.tests.length} tests acceptés tels quels par le serveur` };
}

// U3 : un visiteur sans compte peut taper un test, sans rien envoyer au serveur
async function u3() {
  const h = loadApp(); h.run("currentUser=null;currentToken=null;_statsLoaded=true;app.stats=mergeStats();_statsDirty=true;");
  h.run("app.view='test';app.sess=app.makeSession('test');"); const t = h.run('app.sess.text');
  for (const ch of t) press(h, { key: ch });
  const errs = [];
  if (!h.run('app.sess.finished')) errs.push(`test non terminé (${h.run('app.sess.idx')}/${t.length})`);
  h.fetchCalls.length = 0; try { await h.run('flushStats()'); } catch (e) { errs.push('flushStats plante sans compte : ' + e.message); }
  if (h.fetchCalls.some((c) => c.url.includes('/api/save-progress'))) errs.push('une progression est envoyée sans compte');
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: 'test terminé, rien envoyé' };
}

// U4 : tout compte existant se recharge sans erreur (comptes vides, anciens formats)
function u4() {
  const h = loadApp(); const errs = [];
  const cases = {
    'compte vide {}': {}, 'ancien format de leçon (nombre)': { lessons: { r1: 42 } }, 'sans objectifs': { tests: [{ t: 1, wpm: 30, acc: 90 }], lessons: {} },
    'null': null, 'clés héritées': { tireurBest: { s: 1 }, sourisHub: 1, lessons: { r1: { bestWpm: 30, bestErr: 1, cleared: true } } },
  };
  for (const [name, blob] of Object.entries(cases)) {
    try {
      const r = h.run(`mergeStats(${JSON.stringify(blob)})`);
      if (!Array.isArray(r.tests) || typeof r.lessons !== 'object' || typeof r.goals !== 'object') errs.push(`${name} : forme invalide`);
      if (typeof r.goals.minWpm !== 'number' || typeof r.goals.maxErrors !== 'number') errs.push(`${name} : objectifs absents`);
      if (blob && blob.lessons && blob.lessons.r1 === 42 && !(r.lessons.r1 && r.lessons.r1.cleared === true && r.lessons.r1.bestWpm === 42)) errs.push(`${name} : leçon non convertie`);
      const san = sanitizeProgress(JSON.parse(JSON.stringify(r)), {});
      if (san.dropped.length) errs.push(`${name} : le serveur écarterait ${san.dropped.join(', ')}`);
    } catch (e) { errs.push(`${name} : plante (${e.message})`); }
  }
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: `${Object.keys(cases).length} formes de comptes se rechargent` };
}

// U5 : TOUS les textes de test (et celui du certificat) se terminent sur chaque disposition
function u5() {
  const h = loadApp(); login(h);
  const dead = h.run('KB_DEAD_DECOMP'); const errs = []; let n = 0;
  const count = h.run('PASSAGES.length');
  for (const lay of LAYOUTS) {
    const direct = typableSet(loadLayout(lay)); h.store.kp_kb_layout = lay; h.run(`applyKbLayout('${lay}')`);
    for (let i = -1; i < count; i++) {
      h.run("app.view='test';app.sess=app.makeSession('test');" + (i < 0 ? 'app.sess.text=CERT_TEXT;' : `app.sess.text=adaptQuotes(PASSAGES[${i}]);`));
      const t = h.run('app.sess.text'); n++;
      const name = i < 0 ? 'texte du certificat' : `texte ${i}`;
      let bad = null;
      for (const ch of t) { const st = plan(ch, lay, direct, dead); if (!st) { bad = ch; break; } st.forEach((s) => press(h, s)); }
      if (bad) { errs.push(`${lay}/${name} : « ${bad} » impossible à taper`); continue; }
      if (!h.run('app.sess.finished') || h.run('app.sess.keystrokes') !== h.run('app.sess.correct')) errs.push(`${lay}/${name} : non terminé ou fautif`);
    }
  }
  return errs.length ? { ok: false, detail: errs.slice(0, 8).join('\n') } : { ok: true, detail: `${n} textes terminés (${count} textes de test + certificat, ${LAYOUTS.length} dispositions)` };
}

// U6 : les tolérances sont DÉCOUVERTES par le moteur, pas supposées par moi.
// Pour chaque caractère de nos textes qu'une disposition ne sait pas taper directement, on cherche, en essayant
// des séquences de 1 ou 2 touches tapables, ce que le VRAI moteur accepte. Rouge si le moteur n'en accepte aucune
// (vraie impossibilité) ou si une tolérance documentée n'est pas acceptée.
function u6() {
  const h = loadApp(); login(h);
  const ids = h.run('ALL_LESSONS.map(l=>l.id)'); const dead = h.run('KB_DEAD_DECOMP');
  const texts = [];
  for (const id of ids) texts.push(startLesson(h, id));
  texts.push(h.run('CERT_TEXT')); for (let i = 0; i < h.run('PASSAGES.length'); i++) texts.push(h.run(`adaptQuotes(PASSAGES[${i}])`));
  const chars = [...new Set(texts.join(''))];
  const errs = []; const found = {};
  for (const lay of LAYOUTS) {
    const direct = typableSet(loadLayout(lay));
    h.store.kp_kb_layout = lay; h.run(`applyKbLayout('${lay}')`);
    const keys = [...direct].filter((c) => c.length === 1);
    for (const ch of chars) {
      if (plan(ch, lay, direct, dead) && direct.has(ch)) continue;           // tapable directement
      if (dead[ch] && direct.has(dead[ch][0])) continue;                       // touche morte puis lettre
      // recherche : séquences de 1 puis 2 touches, la bonne = le moteur avance d'un caractère sans faute
      let seq = null;
      const tryseq = (keysSeq) => {
        h.run("app.view='test';app.sess={mode:'test',lessonId:null,text:" + JSON.stringify(ch + 'x') + ",idx:0,typed:[],started:false,startTime:0,endTime:0,correct:0,keystrokes:0,finished:false};");
        keysSeq.forEach((k) => press(h, { key: k }));
        press(h, { key: 'x' }); // le caractère suivant doit être accepté ensuite, sans faute (sinon la séquence n'est pas complète)
        return h.run('app.sess.finished') === true && h.run('app.sess.keystrokes') === h.run('app.sess.correct');
      };
      const t0 = Date.now(); const BUDGET_MS = 1500; let cut = false;
      for (const k of keys) if (tryseq([k])) { seq = [k]; break; }
      const second = keys.filter((c) => /^[a-z ]$/.test(c));
      if (!seq) outer: for (const a of keys) for (const b of second) { if (Date.now() - t0 > BUDGET_MS) { cut = true; break outer; } if (tryseq([a, b])) { seq = [a, b]; break outer; } }
      (found[lay] = found[lay] || {})[ch] = seq;
      const documented = TOLERANCE[ch];
      if (!seq) errs.push(`${lay} : « ${ch} » n'a aucun geste de 1 ou 2 touches accepté par le moteur${cut ? ' (recherche arrêtée à 1,5 s)' : ''}`);
      else if (documented && !tryseq(documented)) errs.push(`${lay} : la tolérance documentée pour « ${ch} » n'est pas acceptée par le moteur`);
    }
  }
  const summary = Object.entries(found).map(([l, o]) => `${l}: ${Object.entries(o).map(([c, s]) => c + '←' + (s || []).join('+')).join(' ')}`).join(' | ');
  return errs.length ? { ok: false, detail: errs.slice(0, 8).join('\n') } : { ok: true, detail: `gestes découverts par le moteur : ${summary || 'aucun caractère sans touche'}` };
}

// U7 : chaque écran s'affiche, sans erreur et en produisant du contenu, pour chaque type de compte
async function u7() {
  const roles = {
    'visiteur': "currentUser=null;currentToken=null;app.stats=null;",
    'élève gratuit': "currentUser='eleve';currentPlan='free';currentToken='t';currentUserId='u';_statsLoaded=true;app.stats=mergeStats({role:'eleve'});",
    'élève Expert': "currentUser='eleve';currentPlan='expert';currentToken='t';currentUserId='u';_statsLoaded=true;app.stats=mergeStats({role:'eleve'});",
    'enseignant': "currentUser='prof';currentPlan='free';currentToken='t';currentUserId='u';_statsLoaded=true;app.stats=mergeStats({role:'prof'});",
    'établissement': "currentUser='adm';currentPlan='free';currentToken='t';currentUserId='u';_statsLoaded=true;app.stats=mergeStats({role:'admin'});",
  };
  // Un compte riche : leçons, tests, records, touches difficiles, anciens champs
  const rich = { role: 'eleve', lessons: { r1: { bestWpm: 40, bestErr: 1, cleared: true }, h1: 25 }, tests: [{ t: 1, wpm: 35, acc: 94, mode: 'test' }, { t: 2, wpm: 41, acc: 96, mode: 'lesson', lessonId: 'r1' }],
    gameBest: 120, courseBest: { wpm: 45, acc: 95, rank: 2, date: 1 }, ghostBest: { wpm: 40, acc: 95, date: 1, timeline: [] }, simonBest: { score: 9, maxSeq: 9, date: 1 },
    clavierBest: { elapsed: 30, mistakes: 1, date: 1 }, sprintBest: { wpm: 50, correct: 20, errors: 1, date: 1 }, sourisBest: 3, keyStats: { e: { n: 100, e: 4 }, a: { n: 80, e: 1 } },
    duelRecord: { wins: 2, losses: 1, draws: 0 }, bossBest: { rank: 3, score: 100, wpm: 44, isoWeek: '2026-W44' }, tireurBest: { s: 1 } };
  const errs = []; let n = 0; const rejections = [];
  const onRej = (e) => rejections.push(String(e && e.message || e).slice(0, 90)); process.on('unhandledRejection', onRej);
  const flush = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };
  for (const [name, setup] of Object.entries(roles)) {
    for (const withData of [false, true]) {
      const h = loadApp(); h.run(setup);
      if (withData && name !== 'visiteur') h.run(`app.stats=mergeStats(${JSON.stringify({ ...rich, role: /enseignant/.test(name) ? 'prof' : /établissement/.test(name) ? 'admin' : 'eleve' })})`);
      const views = Object.keys(h.run('VIEW_PATHS'));
      for (const v of views) {
        n++; const before = h.html.length;
        try { await h.run('app.renderView(' + JSON.stringify(v) + ')'); await flush(); } catch (e) { errs.push(`${name}${withData ? ' (compte rempli)' : ''} / ${v} : ${String(e.message).slice(0, 90)}`); continue; }
        const produced = h.html.slice(before).join('').length;
        if (produced < 50) errs.push(`${name}${withData ? ' (compte rempli)' : ''} / ${v} : écran vide (${produced} caractères)`);
        if (rejections.length) { errs.push(`${name}${withData ? ' (compte rempli)' : ''} / ${v} : erreur asynchrone : ${rejections.splice(0).join(' ; ')}`); }
      }
    }
  }
  process.removeListener('unhandledRejection', onRej);
  return errs.length ? { ok: false, detail: errs.slice(0, 8).join('\n') } : { ok: true, detail: `${n} affichages (écrans x types de compte x compte vide ou rempli) sans erreur` };
}


// U8 : accents (D5). Exigés par défaut ; au 3e échec sur la même lettre le bandeau est proposé ; en mode toléré la lettre nue passe
// (test marqué tolerant:true) sauf au certificat ; une mauvaise lettre accentuée reste une faute.
function u8() {
  const errs = [];
  const start = (h, text, extra) => { h.run("currentUser='t';currentToken='t';currentUserId='u';_statsLoaded=true;app.stats=mergeStats();app.view='test';app.sess={mode:'test',lessonId:null,text:" + JSON.stringify(text) + ",idx:0,typed:[],started:false,startTime:0,endTime:0,correct:0,keystrokes:0,finished:false" + (extra || '') + "};__b=[];"); };
  const mk = () => { const h = loadApp(); h.run('var __b=[];kpAccentBannerShow=function(c){__b.push(c);};'); return h; };
  const faults = (h) => h.run('app.sess.keystrokes-app.sess.correct');
  // 1. exigés : e pour é est une faute, é correct
  let h = mk(); start(h, 'été'); press(h, { key: 'e' }); if (faults(h) !== 1) errs.push('exigés : e pour é devrait être une faute');
  h = mk(); start(h, 'été'); for (const k of ['é', 't', 'é']) press(h, { key: k });
  if (!h.run('app.sess.finished') || faults(h) !== 0 || h.run('__b.length')) errs.push('exigés : é tapé juste doit passer sans bandeau');
  // 2. bandeau au 3e échec seulement
  h = mk(); start(h, 'ééé'); press(h, { key: 'e' }); press(h, { key: 'e' });
  if (h.run('__b.length')) errs.push('bandeau trop tôt (2 échecs)');
  press(h, { key: 'e' }); if (h.run('JSON.stringify(__b)') !== '["é"]') errs.push('bandeau attendu au 3e échec sur é, obtenu ' + h.run('JSON.stringify(__b)'));
  // une faute qui n'est pas la lettre nue ne compte pas
  h = mk(); start(h, 'ééé'); for (let i = 0; i < 3; i++) press(h, { key: 'x' }); if (h.run('__b.length')) errs.push('une frappe quelconque ne doit pas déclencher le bandeau');
  // 3. toléré
  h = mk(); h.run("localStorage.setItem('kp_accents','tolerant')"); start(h, 'été'); for (const k of ['e', 't', 'e']) press(h, { key: k });
  if (!h.run('app.sess.finished') || faults(h) !== 0) errs.push('toléré : la lettre nue devrait passer sans faute');
  else if (!h.run('app.stats.tests.length&&app.stats.tests[app.stats.tests.length-1].tolerant===true')) errs.push('toléré : le test enregistré doit porter tolerant:true');
  h = mk(); h.run("localStorage.setItem('kp_accents','tolerant')"); start(h, 'été'); for (const k of ['é', 't', 'é']) press(h, { key: k });
  if (h.run('app.stats.tests.length&&app.stats.tests[app.stats.tests.length-1].tolerant===true')) errs.push('toléré : un test sans lettre nue ne doit pas être marqué tolerant');
  h = mk(); h.run("localStorage.setItem('kp_accents','tolerant')"); start(h, 'è'); press(h, { key: 'é' }); if (faults(h) !== 1) errs.push('toléré : é à la place de è reste une faute');
  h = mk(); h.run("localStorage.setItem('kp_accents','tolerant')"); start(h, 'É'); press(h, { key: 'e' }); if (faults(h) !== 1) errs.push('toléré : e minuscule pour É reste une faute');
  // 4. certificat : jamais toléré
  h = mk(); h.run("localStorage.setItem('kp_accents','tolerant')"); start(h, 'été', ',cert:true'); press(h, { key: 'e' }); if (faults(h) !== 1) errs.push('certificat : la tolérance ne doit pas s\'appliquer');
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: 'exigés par défaut, bandeau au 3e échec, toléré marqué tolerant:true, certificat toujours exigeant' };
}

// U9 : détection de la famille de clavier à partir des frappes (suggestion dans les réglages). Les 29 dispositions du dépôt
// doivent être reconnues dans leur famille, sans jamais se tromper, et rien ne doit être suggéré ni envoyé tant que le site
// ne propose pas cette famille.
function u9() {
  const errs = [];
  const dir = path.join(root, 'layouts-src');
  const h = loadApp();
  const CODES = ['KeyQ', 'KeyA', 'KeyW', 'KeyZ', 'KeyY'];
  const detect = (samples) => h.run('kpKbFamilyFromSamples(' + JSON.stringify(samples) + ')');
  let n = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const def = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const map = {};
    if (def.keys) for (const [c, k] of Object.entries(def.keys)) map[c] = k.l;
    else for (const k of [...def.rows.flat(), ...Object.values(def.extra || {}).flat()]) map[k.c] = k.l;
    const want = f.startsWith('azerty-') ? 'azerty' : 'qwerty';
    const samples = CODES.filter((c) => map[c]).map((c) => ({ code: c, key: map[c] }));
    const got = detect(samples);
    if (got !== want) errs.push(`${f} : famille ${got} au lieu de ${want} (${samples.map((x) => x.code + '→' + x.key).join(' ')})`);
    n++;
  }
  // QWERTZ (pas de modèle dans le dépôt : cas synthétique)
  if (detect([{ code: 'KeyY', key: 'z' }, { code: 'KeyZ', key: 'y' }]) !== 'qwertz') errs.push('QWERTZ non reconnu');
  // une seule touche ne suffit pas ; des signaux contradictoires ne décident rien ; majuscules et inconnues ignorées
  if (detect([{ code: 'KeyQ', key: 'a' }]) !== null) errs.push('une seule touche ne doit pas décider');
  if (detect([{ code: 'KeyQ', key: 'a' }, { code: 'KeyA', key: 'a' }]) !== null) errs.push('signaux contradictoires : aucune décision attendue');
  if (detect([{ code: 'KeyQ', key: 'A' }, { code: 'KeyW', key: 'Z' }]) !== 'azerty') errs.push('les majuscules doivent compter');
  if (detect([{ code: 'KeyQ', key: 'q' }, { code: 'KeyQ', key: 'q' }, { code: 'KeyQ', key: 'q' }]) !== null) errs.push('la même touche répétée ne doit pas compter plusieurs fois');
  if (detect([{ code: 'KeyP', key: 'p' }, { code: 'KeyK', key: 'k' }]) !== null) errs.push('des touches non discriminantes ne décident rien');
  // dans le vrai moteur : un QWERTY tapé ne suggère rien aujourd'hui (le site ne propose que l'AZERTY), rien n'est envoyé
  const g = loadApp(); g.run("currentUser=null;currentToken=null;_statsLoaded=true;app.stats=mergeStats();app.view='test';app.sess=app.makeSession('test');");
  g.fetchCalls.length = 0;
  for (const [c, k] of [['KeyQ', 'q'], ['KeyW', 'w'], ['KeyA', 'a'], ['KeyZ', 'z']]) press(g, { key: k, code: c });
  if (g.run('_kpKbSuggested')) errs.push('une suggestion QWERTY est affichée alors que le site ne la propose pas encore');
  if (g.fetchCalls.length) errs.push('la détection du clavier a envoyé quelque chose au serveur');
  // un AZERTY tapé sur le site AZERTY ne suggère rien non plus
  const a = loadApp(); a.run("currentUser=null;currentToken=null;_statsLoaded=true;app.stats=mergeStats();app.view='test';app.sess=app.makeSession('test');");
  for (const [c, k] of [['KeyQ', 'a'], ['KeyW', 'z'], ['KeyA', 'q']]) press(a, { key: k, code: c });
  if (a.run('_kpKbSuggested')) errs.push('une suggestion apparaît pour un AZERTY déjà bien réglé');
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: `${n} dispositions reconnues dans leur famille, aucune suggestion ni envoi tant que le QWERTY n'est pas proposé` };
}
module.exports = { u1, u2, u3, u4, u5, u6, u7, u8, u9, typableSet, plan };
