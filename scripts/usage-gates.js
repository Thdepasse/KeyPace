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
      let tries = 0; const MAX_TRIES = 6000; let cut = false; // borne en nombre d'essais, pas en secondes : le résultat ne dépend plus de la charge de la machine
      for (const k of keys) if (tryseq([k])) { seq = [k]; break; }
      const second = keys.filter((c) => /^[a-z ]$/.test(c));
      if (!seq) outer: for (const a of keys) for (const b of second) { if (++tries > MAX_TRIES) { cut = true; break outer; } if (tryseq([a, b])) { seq = [a, b]; break outer; } }
      (found[lay] = found[lay] || {})[ch] = seq;
      const documented = TOLERANCE[ch];
      if (!seq) errs.push(`${lay} : « ${ch} » n'a aucun geste de 1 ou 2 touches accepté par le moteur${cut ? ' (recherche limitée à 6000 essais)' : ''}`);
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

// U10 : le cours QWERTY, leçon par leçon, rejoué dans le VRAI moteur avec les frappes de plusieurs variantes de clavier QWERTY (gestes déduits
// des modèles : touche directe, Maj, AltGr/Option, touche morte puis lettre ou Espace). Comme U1 pour les 4 AZERTY : chaque leçon doit se terminer
// sans faute. Les caractères sans geste sur la variante passent par les tolérances connues (« » -> ", œ -> oe) ou par les accents tolérés (D5) ;
// la liste de ces leçons par variante est une référence relue (changer la liste = relire).
const QWERTY_VARIANTS = ['windows-us', 'windows-us-intl', 'windows-uk', 'windows-uk-extended', 'mac-us', 'mac-us-intl-pc', 'mac-british', 'linux-us-intl'];
function u10(update) {
  const { gestureFor } = require('./gesture');
  const course = JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'));
  const base = loadApp();
  base.run('globalThis.__c=' + JSON.stringify(course) + ';kpApplyCourseData("fr/qwerty",__c);');
  const order = JSON.parse(base.run('JSON.stringify(ALL_LESSONS.map(l=>l.id))'));
  const texts = {};
  for (const id of order) { base.run("currentUser=null;app.stats=app.stats||mergeStats();"); texts[id] = base.run('app.makeSession("lesson",' + JSON.stringify(id) + ').text'); }
  const TOL = { '«': ['"'], '»': ['"'], 'œ': ['o', 'e'], 'Œ': ['O', 'e'], 'æ': ['a', 'e'], 'Æ': ['A', 'e'] };
  const errs = []; const needsTolerance = {}; let sessions = 0;
  for (const vid of QWERTY_VARIANTS) {
    const def = JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', vid + '.json'), 'utf8'));
    const events = (ch) => {
      const g = gestureFor(def, ch); if (!g) return null;
      const press = (p, key) => ({ key, code: p.code, shift: !!p.shift, alt: !!p.alt });
      const isDead = (p) => { const k = def.keys[p.code]; return !!(k && k.dead && k.dead[p.alt ? (p.shift ? 'gs' : 'g') : (p.shift ? 's' : 'l')]); };
      if (g.length === 1) return [press(g[0], ch)];
      if (g.length === 2 && isDead(g[0])) return [press(g[0], 'Dead'), g[1].code === 'Space' ? { key: ch, code: 'Space' } : { key: ch, code: g[1].code, shift: !!g[1].shift }];
      return g.map((p) => press(p, ch));
    };
    for (const id of order) {
      const text = texts[id]; const h = loadApp(); const evs = []; let tol = false;
      for (const ch of text) {
        let e = events(ch);
        if (!e && TOL[ch]) { e = TOL[ch].flatMap((k) => events(k) || []); }
        if (!e && kpBase(ch) !== ch && events(kpBase(ch))) { e = events(kpBase(ch)); tol = true; }
        if (!e) { errs.push(`${vid} ${id} : « ${ch} » sans geste ni tolérance`); evs.length = 0; break; }
        evs.push(...e);
      }
      if (!evs.length) continue;
      h.run("currentUser='t';currentToken='t';currentUserId='u';_statsLoaded=true;app.stats=mergeStats();app.view='lessons';app.sess={mode:'lesson',lessonId:" + JSON.stringify(id) + ",text:" + JSON.stringify(text) + ",idx:0,typed:[],started:false,startTime:0,endTime:0,correct:0,keystrokes:0,finished:false};" + (tol ? "localStorage.setItem('kp_accents','tolerant');" : ''));
      for (const e of evs) press(h, e);
      sessions++;
      const fin = h.run('app.sess.finished'), f = h.run('app.sess.keystrokes-app.sess.correct');
      if (!fin || f) errs.push(`${vid} ${id} : ${fin ? f + ' faute(s)' : 'non terminée (' + h.run('app.sess.idx') + '/' + [...text].length + ')'}`);
      if (tol) (needsTolerance[vid] = needsTolerance[vid] || []).push(id);
    }
  }
  const now = JSON.parse(JSON.stringify(needsTolerance));
  if (errs.length) return { ok: false, detail: errs.slice(0, 8).join('\n') + (errs.length > 8 ? `\n… ${errs.length - 8} autres` : '') };
  const pth = path.join(root, 'scripts', 'gates-baseline.json'); const b = JSON.parse(fs.readFileSync(pth, 'utf8'));
  const sum = `${sessions} leçons terminées sans faute (${order.length} leçons x ${QWERTY_VARIANTS.length} variantes) ; accents tolérés nécessaires : ` + (Object.entries(now).map(([k, v]) => `${k} ${v.length} leçons`).join(', ') || 'aucun');
  if (update || !b.qwertyCourseTolerance) { b.qwertyCourseTolerance = now; fs.writeFileSync(pth, JSON.stringify(b, null, 1) + '\n'); return { ok: true, detail: (update ? 'référence mise à jour : ' : 'référence créée : ') + sum }; }
  return JSON.stringify(now) === JSON.stringify(b.qwertyCourseTolerance) ? { ok: true, detail: sum } : { ok: false, detail: `les leçons qui exigent les accents tolérés ont changé (${sum}). Si voulu et relu : npm run gates -- --update-baseline` };
}
const kpBase = (c) => (c && c.length === 1 ? (c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').length === 1 && /[a-zA-Z]/.test(c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) ? c.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : c) : c);

// U11 : espace pays et langue (drapeau). Registre valide, valeurs par défaut (Belgique, français), repli si la valeur gardée est inconnue,
// un choix est conservé sur l'appareil et rien n'est envoyé au serveur. Le rendu réel est vérifié par la gate B1 (BR6).
function u11() {
  const errs = []; const h = loadApp();
  const reg = JSON.parse(h.run('JSON.stringify(KP_REGIONS.map(r=>({id:r.id,name:r.name,flag:r.flag,langs:r.langs})))'));
  if (!reg.length) errs.push('registre vide');
  const ids = new Set();
  for (const r of reg) {
    if (!/^[a-z]{2}$/.test(r.id)) errs.push(`région « ${r.id} » : identifiant invalide`);
    if (ids.has(r.id)) errs.push(`région ${r.id} en double`); ids.add(r.id);
    if (!r.name) errs.push(`région ${r.id} sans nom`);
    if (!/^<svg[\s\S]*<\/svg>$/.test(r.flag) || /<script|onload|onerror|javascript:/i.test(r.flag)) errs.push(`région ${r.id} : drapeau SVG absent ou suspect`);
    if (!r.langs.length || r.langs.some((l) => !/^[a-z]{2,3}$/.test(l.id) || !l.name)) errs.push(`région ${r.id} : langues invalides`);
    if (/—/.test(JSON.stringify(r))) errs.push(`région ${r.id} : tiret cadratin dans un texte du site`);
  }
  if (h.run('kpRegionId()') !== 'be' || h.run('kpLangId()') !== 'fr') errs.push('défaut attendu : Belgique, français');
  h.run("localStorage.setItem('kp_region','zz');localStorage.setItem('kp_lang','xx');");
  if (h.run('kpRegionId()') !== 'be' || h.run('kpLangId()') !== 'fr') errs.push('une valeur gardée inconnue ne retombe pas sur le défaut');
  h.fetchCalls.length = 0;
  if (!h.run("kpSetRegion('be','fr')") || h.run("localStorage.getItem('kp_region')") !== 'be' || h.run("localStorage.getItem('kp_lang')") !== 'fr') errs.push('le choix Belgique/français n\'est pas gardé');
  if (h.run("kpSetRegion('zz')")) errs.push('une région inconnue est acceptée');
  h.run("kpSetRegion('be','nl')"); if (h.run("localStorage.getItem('kp_lang')") !== 'fr') errs.push('une langue que la région ne propose pas est acceptée');
  if (h.fetchCalls.length) errs.push('le choix du pays envoie quelque chose au serveur');
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: `${reg.length} pays (${reg.map((r) => r.id + ' : ' + r.langs.map((l) => l.id).join('/')).join(', ')}), défaut Belgique/français, repli sûr, rien envoyé` };
}

// U12 : les cours (accesseur course(), contenu, persistance). Le cours par défaut reste identique ; un autre cours (ici QWERTY, proposé
// seulement pour le test) écrit dans stats.courses[id], jamais dans les champs plats ; le contenu s'applique et se retire à l'identique ;
// la progression d'un autre cours survit à l'aller-retour serveur (nettoyage) quand le cours est au registre, et est ignorée sinon.
async function u12() {
  const errs = []; const h = loadApp();
  const course = JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'));
  h.run("currentUser='t';currentToken='t';currentUserId='u';_statsLoaded=true;app.stats=mergeStats();");
  // 1. cours par défaut : course() EST la progression
  if (!h.run('course()===app.stats')) errs.push('cours par défaut : course() n\'est pas la progression elle-même');
  if (h.run("localStorage.setItem('kp_course','fr/qwerty'),kpCourseId()") !== 'fr/azerty') errs.push('un cours non proposé est choisi à cause d\'une valeur gardée');
  if (h.run("(async()=>0)()") && (await h.run("kpSetCourse('fr/qwerty')")) !== false) errs.push('kpSetCourse accepte un cours non proposé');
  h.run("localStorage.removeItem('kp_course')");
  // 2. contenu : appliqué puis retiré à l'identique
  const snap = () => h.run('JSON.stringify(ALL_LESSONS.map(l=>[l.id,l.title,l.keys,l.tip,l.tuto,l.text,l.module]))');
  const mods = () => h.run('JSON.stringify(ALL_MODULES.map(m=>m.name))');
  const before = snap(), beforeMods = mods();
  h.run('globalThis.__d=' + JSON.stringify(course) + ';');
  if (!h.run("kpApplyCourseData('fr/qwerty',__d)")) errs.push('le contenu QWERTY n\'est pas appliqué');
  const r4 = JSON.parse(h.run('JSON.stringify(ALL_LESSONS.find(l=>l.id==="r4"))'));
  const r4want = course.curriculum.modules.flatMap((m) => m.lessons).find((l) => l.id === 'r4');
  if (r4.keys !== 'a ;' || r4.text !== r4want.text || r4.tuto.intro !== r4want.tuto.intro) errs.push('r4 : le contenu QWERTY n\'est pas appliqué (touches, texte, tutoriel)');
  const acc1 = JSON.parse(h.run('JSON.stringify(ALL_LESSONS.find(l=>l.id==="ac1"))'));
  if (/AZERTY/.test(JSON.stringify(acc1.tuto))) errs.push('ac1 : le tutoriel cite encore l\'AZERTY');
  if (/AZERTY/.test(mods())) errs.push('un nom de module cite encore l\'AZERTY');
  const maj1 = JSON.parse(h.run('JSON.stringify(ALL_LESSONS.find(l=>l.id==="maj1"))'));
  if (JSON.stringify(maj1.text) !== JSON.stringify(JSON.parse(before).find((x) => x[0] === 'maj1')[5])) errs.push('maj1 (reprise) a changé');
  h.run("kpApplyCourseData('fr/azerty',null)");
  if (snap() !== before || mods() !== beforeMods) errs.push('retour au cours par défaut : le programme n\'est pas identique à l\'origine');
  if (h.run("kpApplyCourseData('fr/qwerty',{schema:2,id:'fr/qwerty',lessons:{}})")) errs.push('un fichier de cours de mauvais schéma est accepté');
  if (h.run("kpApplyCourseData('fr/qwerty',{schema:1,id:'xx/zz',lessons:{}})")) errs.push('un fichier de cours d\'un autre identifiant est accepté');
  if (snap() !== before) errs.push('un fichier invalide a laissé le programme modifié');
  // 3. un autre cours écrit dans stats.courses[id], pas dans les champs plats (cours proposé pour le test seulement)
  h.run("KP_COURSES_OFFERED.push('fr/qwerty');localStorage.setItem('kp_course','fr/qwerty');kpApplyCourseData('fr/qwerty',__d);");
  if (h.run('course()===app.stats')) errs.push('cours QWERTY : course() renvoie la progression plate');
  h.run("app.view='lessons';app.sess=app.makeSession('lesson','r1');"); const text = h.run('app.sess.text');
  for (const ch of text) press(h, { key: ch });
  if (!h.run('app.sess.finished')) errs.push('cours QWERTY : leçon r1 non terminée');
  const flat = JSON.parse(h.run('JSON.stringify({l:Object.keys(app.stats.lessons),t:app.stats.tests.length,k:Object.keys(app.stats.keyStats||{}).length})'));
  const q = JSON.parse(h.run('JSON.stringify({l:Object.keys(app.stats.courses["fr/qwerty"].lessons),t:app.stats.courses["fr/qwerty"].tests.length,k:Object.keys(app.stats.courses["fr/qwerty"].keyStats).length})'));
  if (flat.l.length || flat.t || flat.k) errs.push('cours QWERTY : la progression a été écrite dans les champs plats du cours par défaut ' + JSON.stringify(flat));
  if (!q.l.includes('r1') || q.t !== 1 || !q.k) errs.push('cours QWERTY : leçon, test ou statistiques de touches absents de stats.courses ' + JSON.stringify(q));
  // 4. persistance : le blob envoyé contient courses, le serveur le garde si le cours est au registre, l'ignore sinon
  h.run('_statsDirty=true;'); h.fetchCalls.length = 0; await h.run('flushStats()');
  const sent = (h.fetchCalls.find((c) => c.url.includes('/api/save-progress')) || {}).body;
  if (!sent || !sent.data.courses || !sent.data.courses['fr/qwerty'].lessons.r1) errs.push('la progression du cours QWERTY n\'est pas envoyée au serveur');
  else {
    const kept = sanitizeProgress(JSON.parse(JSON.stringify(sent.data)), {}, Date.now(), ['fr/qwerty']).data;
    const dropped = sanitizeProgress(JSON.parse(JSON.stringify(sent.data)), {}, Date.now(), []).data;
    if (!kept.courses || !kept.courses['fr/qwerty'].lessons.r1) errs.push('le serveur écarte la progression d\'un cours pourtant au registre');
    if (dropped.courses) errs.push('le serveur garde un cours absent du registre');
    // aller-retour : rechargée, la progression revient dans course()
    h.run('app.stats=mergeStats(' + JSON.stringify(kept) + ');');
    if (!h.run("!!course().lessons.r1")) errs.push('aller-retour : la leçon du cours QWERTY n\'est pas relue');
    h.run("localStorage.removeItem('kp_course');");
    if (h.run("!!app.stats.lessons.r1")) errs.push('aller-retour : la leçon QWERTY apparaît dans le cours par défaut');
  }
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: 'course() identique par défaut, contenu QWERTY appliqué et retiré à l\'identique, progression écrite dans stats.courses, serveur : gardée si au registre, ignorée sinon' };
}

// U13 : accès bêta aux cours. Le SERVEUR décide (comptes testeurs, api/_courses-access.test.js) ; le site demande la liste, ne propose que ces
// cours, ignore ce qu'il ne connaît pas, n'en propose aucun à un visiteur ni en cas d'erreur, et un compte qui perd l'accès retrouve le
// cours AZERTY, contenu et clavier restaurés.
async function u13() {
  const errs = []; const h = loadApp();
  const offered = () => JSON.parse(h.run('JSON.stringify(KP_COURSES_OFFERED)')).join();
  const login = (name) => h.run(`currentUser='${name}';currentToken='tok-${name}';currentUserId='u';_statsLoaded=true;app.stats=mergeStats();_kpAccessFor=null;`);
  const stub = (body, ok = true) => { h.run(`globalThis.__n=0;globalThis.__bodies=[];fetch=async(u,o)=>{__n++;__bodies.push(o&&o.body);return{ok:${ok},status:${ok ? 200 : 500},json:async()=>(${JSON.stringify(body)}),text:async()=>'{}'}};`); };
  // visiteur : rien, même si une liste lui était donnée
  h.run("currentUser=null;currentToken=null;"); h.run("kpSetAllowed(['fr/qwerty'])");
  if (offered() !== 'fr/azerty') errs.push('un visiteur se voit proposer le cours QWERTY');
  // compte sans accès
  login('eleve'); stub({ ok: true, coursAcces: [] }); await h.run('kpFetchAccess()');
  if (offered() !== 'fr/azerty') errs.push('un compte sans accès se voit proposer le cours QWERTY');
  // compte testeur : la requête n'envoie que le jeton et access:true
  login('testeur'); stub({ ok: true, coursAcces: ['fr/qwerty'] }); await h.run('kpFetchAccess()');
  if (offered() !== 'fr/azerty,fr/qwerty') errs.push('un compte testeur ne se voit pas proposer le cours QWERTY');
  const sent = JSON.parse(h.run('__bodies[0]'));
  if (JSON.stringify(Object.keys(sent).sort()) !== '["access","token"]' || sent.access !== true) errs.push('la demande d\'accès envoie autre chose que le jeton et access:true : ' + JSON.stringify(sent));
  await h.run('kpFetchAccess()'); if (h.run('__n') !== 1) errs.push('la liste est redemandée à chaque appel pour le même compte (' + h.run('__n') + ' requêtes)');
  // identifiants inconnus ou fr/azerty dans la réponse : ignorés
  login('autre'); stub({ ok: true, coursAcces: ['xx/yy', 'fr/azerty', 'fr/qwerty', '../x'] }); await h.run('kpFetchAccess()');
  if (offered() !== 'fr/azerty,fr/qwerty') errs.push('identifiants inconnus non ignorés : ' + offered());
  // erreur serveur ou réseau : rien de proposé, on réessaiera
  login('panne'); h.run('kpSetAllowed([])'); stub({}, false); await h.run('kpFetchAccess()');
  if (offered() !== 'fr/azerty') errs.push('une erreur serveur laisse le cours QWERTY proposé');
  h.run("fetch=async()=>{throw new Error('réseau')};"); h.run('_kpAccessFor=null;'); await h.run('kpFetchAccess()');
  if (offered() !== 'fr/azerty') errs.push('une panne réseau laisse le cours QWERTY proposé');
  if (h.run('_kpAccessFor') !== null) errs.push('après une panne, la demande n\'est pas marquée à refaire');
  // le testeur choisit le QWERTY, puis perd l'accès : AZERTY, contenu et clavier restaurés
  login('testeur2'); h.run('kpSetAllowed([\'fr/qwerty\'])');
  h.run("kpApplyCourseData('fr/qwerty'," + JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'))) + ");localStorage.setItem('kp_course','fr/qwerty');setKbLayoutId('windows-us-intl');applyKbLayout('windows-us-intl');");
  if (h.run('kpCourseId()') !== 'fr/qwerty') errs.push('cours QWERTY non choisi pour le testeur');
  h.run('kpSetAllowed([])');
  if (h.run('kpCourseId()') !== 'fr/azerty') errs.push('un compte sans accès garde le cours QWERTY');
  if (h.run("ALL_LESSONS.find(l=>l.id==='r4').keys") !== 'q m') errs.push('contenu QWERTY non retiré après perte d\'accès');
  if (h.run("!!KB_LAYOUTS['windows-us-intl']")) errs.push('clavier QWERTY non retiré après perte d\'accès');
  if (!['fr', 'be', 'mac', 'nf'].includes(h.run('getKbLayoutId()'))) errs.push('disposition invalide après perte d\'accès : ' + h.run('getKbLayoutId()'));
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: 'liste demandée au serveur (jeton et access:true seulement), une fois par compte ; visiteur, erreur et inconnus ignorés ; retrait propre à la perte d\'accès' };
}

// U14 : un cours peut apporter SON programme (modules et leçons : ids, nombre et ordre libres). Preuves : (1) le programme complet du cours actuel
// donne EXACTEMENT les mêmes leçons que l'ancienne voie par remplacement de champs ; (2) un petit programme inventé change le nombre et les ids de
// leçons, les leçons gratuites et le déverrouillage, se joue et s'enregistre dans stats.courses ; (3) un programme invalide est refusé sans rien
// modifier ; (4) le retour au cours par défaut rend les mêmes objets, identiques.
function u14() {
  const errs = []; const h = loadApp();
  const course = JSON.parse(fs.readFileSync(path.join(root, 'courses-src', 'fr-qwerty.json'), 'utf8'));
  h.run('globalThis.__c=' + JSON.stringify(course) + ';');
  const state = () => h.run(`JSON.stringify({les:ALL_LESSONS.map(l=>[l.id,l.title,l.keys,l.tip,l.tuto,l.text,l.genNum,l.neu,l.review,l.module,l.moduleIdx,l.pool]),mods:ALL_MODULES.map(m=>[m.name,m.lessons.map(l=>l.id)]),free:FREE_LESSON_IDS,how:KB_HOW_TEXT_LESSONS})`);
  const ident = () => h.run('ALL_LESSONS.map(l=>l.id).join()+"|"+ALL_MODULES.length');
  const original = state(); const origLessons = h.run('globalThis.__o=ALL_LESSONS.slice();globalThis.__om=ALL_MODULES.slice();true');
  // (1) équivalence des deux voies
  h.run('kpApplyCourseData("fr/qwerty",Object.assign({},__c,{curriculum:undefined}))'); const viaOverlay = state();
  h.run('kpApplyCourseData("fr/azerty",null)');
  if (state() !== original) errs.push('retour au cours par défaut (ancienne voie) : programme différent de l\'origine');
  h.run('kpApplyCourseData("fr/qwerty",__c)'); const viaCurriculum = state();
  const A = JSON.parse(viaOverlay), B = JSON.parse(viaCurriculum);
  // la voie « programme » n'a pas de pool de lettres par leçon pour le cours actuel : on compare tout le reste
  const hand = new Set([...(course.handwritten || []), ...(course.retiredAz || [])]); // écrites à la main (Q9) ou retirées : pas comparables à l'ancienne voie
  const byId = (x) => Object.fromEntries(x.les.filter((r) => !hand.has(r[0])).map((r) => [r[0], JSON.stringify(r.slice(0, 11).filter((_, k) => k !== 10 && k !== 9))]));
  const ra = byId(A), rb = byId(B);
  for (const id of Object.keys(rb)) if (ra[id] === undefined) errs.push(`leçon ${id} du programme absente de l'ancienne voie`);
  else if (ra[id] !== rb[id]) errs.push(`les deux voies donnent des leçons différentes (${id})`);
  // retour : mêmes objets
  h.run('kpApplyCourseData("fr/azerty",null)');
  if (state() !== original) errs.push('retour au cours par défaut (voie programme) : programme différent de l\'origine');
  if (!h.run('ALL_LESSONS.length===__o.length&&ALL_LESSONS.every((l,i)=>l===__o[i])&&ALL_MODULES.every((m,i)=>m===__om[i])')) errs.push('retour au cours par défaut : ce ne sont plus les mêmes objets');
  // (2) petit programme inventé
  const mini = { schema: 1, id: 'fr/qwerty', curriculum: { modules: [
    { name: 'Un', lessons: [{ id: 'q1', title: 'Première', keys: 'f j', text: 'fj jf fjfj jfjf ffjj jjff' }, { id: 'q2', title: 'Deuxième', keys: 'd k', text: 'dk kd dkdk kdkd ddkk kkdd', howText: true }] },
    { name: 'Deux', lessons: [{ id: 'q3', title: 'Troisième', keys: 's l', text: 'sl ls slsl lsls ssll llss' }] },
  ], free: ['q1', 'q2'] }, keyboards: course.keyboards };
  h.run('globalThis.__m=' + JSON.stringify(mini) + ';');
  if (!h.run('kpApplyCourseData("fr/qwerty",__m)')) errs.push('un petit programme valide est refusé');
  if (ident() !== 'q1,q2,q3|2') errs.push('le programme inventé n\'est pas appliqué : ' + ident());
  if (h.run('FREE_LESSON_IDS.join()') !== 'q1,q2') errs.push('leçons gratuites non appliquées : ' + h.run('FREE_LESSON_IDS.join()'));
  if (h.run('KB_HOW_TEXT_LESSONS.join()') !== 'q2') errs.push('leçons à aide de geste non appliquées');
  if (h.run('ALL_LESSONS[2].moduleIdx') !== 1 || h.run('ALL_LESSONS[2].module') !== 'Deux') errs.push('module des leçons incorrect');
  h.run("KP_COURSES_OFFERED.push('fr/qwerty');localStorage.setItem('kp_course','fr/qwerty');currentUser='t';currentToken='t';currentUserId='u';_statsLoaded=true;app.stats=mergeStats();");
  if (h.run('app.lessonRec("q1").cleared') || h.run('app.lessonRec("q3").cleared')) errs.push('leçons marquées validées sans l\'être');
  h.run("app.view='lessons';app.sess=app.makeSession('lesson','q1');"); const t = h.run('app.sess.text');
  for (const ch of t) press(h, { key: ch });
  if (!h.run('app.sess.finished')) errs.push('la leçon du programme inventé ne se termine pas');
  if (!h.run('!!app.stats.courses["fr/qwerty"].lessons.q1')) errs.push('la leçon terminée n\'est pas enregistrée dans stats.courses');
  if (h.run('Object.keys(app.stats.lessons).length')) errs.push('une leçon d\'un autre programme a été écrite dans les champs plats');
  if (h.run('ALL_LESSONS.findIndex(l=>l.id===app.sess.lessonId)') !== 0) errs.push('rang de la leçon incorrect');
  // (3) programmes invalides refusés, rien n'est modifié
  const bad = [
    ['sans module', { modules: [] }], ['id en double', { modules: [{ name: 'A', lessons: [{ id: 'x', title: 't', keys: 'k', text: 'abcdefghij' }, { id: 'x', title: 't', keys: 'k', text: 'abcdefghij' }] }] }],
    ['id invalide', { modules: [{ name: 'A', lessons: [{ id: '../x', title: 't', keys: 'k', text: 'abcdefghij' }] }] }],
    ['sans texte', { modules: [{ name: 'A', lessons: [{ id: 'x', title: 't', keys: 'k' }] }] }],
    ['gratuite inconnue', { modules: [{ name: 'A', lessons: [{ id: 'x', title: 't', keys: 'k', text: 'abcdefghij' }] }], free: ['zz'] }],
    ['tutoriel mal formé', { modules: [{ name: 'A', lessons: [{ id: 'x', title: 't', keys: 'k', text: 'abcdefghij', tuto: { intro: 1 } }] }] }],
  ];
  h.run('kpApplyCourseData("fr/azerty",null)'); const before = state();
  // après le petit programme inventé (autres ids, autres leçons gratuites, aide de geste) : retour STRICTEMENT à l'origine
  if (before !== original) errs.push('retour au cours par défaut après un programme à ids différents : programme, leçons gratuites ou aide de geste non restaurés');
  if (!h.run('ALL_LESSONS.length===__o.length&&ALL_LESSONS.every((l,i)=>l===__o[i])&&ALL_MODULES.every((m,i)=>m===__om[i])')) errs.push('retour après le petit programme : ce ne sont plus les mêmes objets');
  for (const [nom, cur] of bad) {
    h.run('globalThis.__b=' + JSON.stringify({ schema: 1, id: 'fr/qwerty', curriculum: cur }) + ';');
    if (h.run('kpApplyCourseData("fr/qwerty",__b)') !== false) errs.push(`programme invalide accepté (${nom})`);
    if (state() !== before) errs.push(`programme invalide (${nom}) : le programme a été modifié`);
  }
  return errs.length ? { ok: false, detail: errs.join('\n') } : { ok: true, detail: `programme complet du cours actuel identique à l'ancienne voie pour les leçons communes (${Object.keys(rb).length} leçons comparées sur ${B.les.length}, ${B.mods.length} modules), programme inventé (3 leçons, ids q1 à q3) appliqué et joué, ${bad.length} programmes invalides refusés sans effet, retour par défaut identique` };
}
module.exports = { u14, u13, u12, u11, u10, u1, u2, u3, u4, u5, u6, u7, u8, u9, typableSet, plan };
