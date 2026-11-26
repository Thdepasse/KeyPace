// S1 : synchronisation élève ↔ serveur ↔ prof, avec le VRAI code de index.html lancé deux fois
// (deux onglets ou deux appareils du même élève) face à un faux serveur qui applique les vraies
// règles de nettoyage, de fusion et de statut des devoirs (api/_progress-*.js, api/_class-logic.js).
// Garde-fou de l'audit de novembre 2026 : leçons perdues entre deux appareils, sauvegardes refusées
// sans fin, devoirs « pas faits », élèves obligés de se déconnecter pour voir les changements.
const fs = require('fs');
const path = require('path');
const { loadApp } = require('./engine-harness');
const { typableSet, plan } = require('./usage-gates');
const { sanitizeProgress } = require('../api/_progress-sanitize');
const { mergeProgress } = require('../api/_progress-merge');
const { assignmentDone } = require('../api/_class-logic');

const root = path.join(__dirname, '..');
const LAYOUT = JSON.parse(fs.readFileSync(path.join(root, 'layouts-src', 'azerty-fr.json'), 'utf8'));
const EV = (o) => `({key:${JSON.stringify(o.key)},code:${JSON.stringify(o.code || '')},repeat:false,altKey:${!!o.alt},ctrlKey:false,shiftKey:${!!o.shift},metaKey:false,target:null,preventDefault(){},stopPropagation(){},getModifierState(){return false}})`;
const tick = () => new Promise((r) => setImmediate(r));
const settle = async () => { for (let i = 0; i < 8; i++) await tick(); };

// Faux serveur : mêmes règles que api/save-progress.js en mode « active » et que my-assignments.
function fakeServer() {
  const S = { data: {}, tokens: new Set(), down: false, assignments: [{ id: 'A1', class_id: 'C1', title: 'Leçon r3', lesson_id: 'r3' }] };
  S.reply = (url, body) => {
    const r = (status, o) => ({ status, body: o });
    if (url.includes('/api/save-progress')) {
      if (!S.tokens.has(body.token)) return r(401, { error: 'Session invalide.' });
      if (body.access) return r(200, { ok: true, coursAcces: [] });
      if (body.data == null) return r(200, { ok: true, data: S.data });
      if (S.down) return r(503, { error: 'indisponible' });
      const clean = sanitizeProgress(body.data, S.data, Date.UTC(2030, 0, 1), []).data;
      S.data = mergeProgress(S.data, clean).data;
      return r(200, { ok: true, data: S.data });
    }
    if (url.includes('/api/classes')) {
      if (!S.tokens.has(body.token)) return r(401, { error: 'Session invalide.' });
      if (body.action === 'my-classes') return r(200, { classes: [{ id: 'C1', name: '6e A' }] });
      if (body.action === 'my-assignments') return r(200, { assignments: S.assignments.map((a) => ({ id: a.id, classId: a.class_id, lessonId: a.lesson_id, title: a.title, done: assignmentDone(S.data, a) })) });
      if (body.action === 'my-goals') return r(200, { goals: { minWpm: 15, maxErrors: 8 }, settings: { typoNorm: 'fr', freeAccess: false, homeRow: 'qsdf' } });
      if (body.action === 'reminders-check') return r(200, { reminders: [] });
      return r(200, {});
    }
    return r(200, {});
  };
  return S;
}

function client(S, token) {
  const h = loadApp();
  if (h.errors.length) throw new Error('chargement de la page : ' + h.errors.join(' ; '));
  h.ctx.fetch = async (url, o) => {
    const body = o && o.body ? JSON.parse(o.body) : {};
    const res = S.reply(String(url), body);
    return { ok: res.status < 300, status: res.status, json: async () => res.body, text: async () => JSON.stringify(res.body) };
  };
  h.store.klak_session = JSON.stringify({ username: 'eleve', plan: 'expert', token, userId: 'u1', role: null });
  h.run(`currentUser='eleve';currentPlan='expert';currentToken=${JSON.stringify(token)};currentUserId='u1';_statsLoaded=true;_statsDirty=false;app.stats=mergeStats();`);
  return h;
}

const direct = typableSet(LAYOUT);
function playLesson(h, id) {
  const dead = h.run('KB_DEAD_DECOMP');
  h.run(`app.view='lessons';app.sess=app.makeSession('lesson',${JSON.stringify(id)});`);
  const text = h.run('app.sess.text');
  for (const ch of text) (plan(ch, 'fr', direct, dead) || [{ key: ch }]).forEach((s) => { h.advance(150); h.run('app.handleKey(' + EV(s) + ')'); });
  return h.run('app.sess.finished');
}

async function s1() {
  const errs = [];
  const S = fakeServer();
  S.tokens.add('tA'); S.tokens.add('tB');
  const A = client(S, 'tA'); // PC de l'école
  const B = client(S, 'tB'); // ordinateur de la maison, ouvert avant (copie en retard)
  const lessons = () => Object.keys(S.data.lessons || {}).filter((k) => S.data.lessons[k] && S.data.lessons[k].cleared).sort().join(',');

  // 1. Deux appareils connectés en même temps : chacun sauvegarde, rien ne se perd.
  if (!playLesson(A, 'r1')) errs.push('A : leçon r1 non terminée');
  await A.run('flushStats()');
  if (!playLesson(B, 'r2')) errs.push('B : leçon r2 non terminée');
  await B.run('flushStats()');
  if (lessons() !== 'r1,r2') errs.push(`serveur après deux appareils : leçons « ${lessons()} » au lieu de r1,r2 (une sauvegarde en a effacé une autre)`);
  if (!B.run('!!(app.stats.lessons.r1&&app.stats.lessons.r1.cleared)')) errs.push("B n'a pas repris la version fusionnée du serveur (r1 absente)");
  if (A.run('_statsDirty') || B.run('_statsDirty')) errs.push('une sauvegarde est restée en attente');

  // 2. Retour sur l'onglet A : il récupère ce qui a été fait sur B, sans reconnexion.
  A.run('_kpLastSync=0;kpSync()'); await settle();
  if (!A.run('!!(app.stats.lessons.r2&&app.stats.lessons.r2.cleared)')) errs.push("retour sur l'onglet : A ne voit pas la leçon faite sur B");
  if (!A.run('!!app.classGoals&&app.classGoals.minWpm===15')) errs.push("retour sur l'onglet : objectifs de classe non relus");

  // 3. Un autre onglet du même navigateur s'est reconnecté : A reprend le nouveau jeton.
  S.tokens.delete('tA'); S.tokens.add('tA2');
  A.store.klak_session = JSON.stringify({ username: 'eleve', plan: 'expert', token: 'tA2', userId: 'u1', role: null });
  if (!playLesson(A, 'r4')) errs.push('A : leçon r4 non terminée');
  const ok3 = await A.run('flushStats()');
  if (!ok3 || A.run('currentToken') !== 'tA2') errs.push(`jeton d'un autre onglet non repris (jeton ${A.run('currentToken')}, sauvegarde ${ok3})`);
  if (!lessons().includes('r4')) errs.push('leçon r4 perdue après le changement de jeton');

  // 4. Devoir réussi pendant une panne de sauvegarde : affiché « fait » quand même, puis enregistré.
  S.down = true;
  if (!playLesson(A, 'r3')) errs.push('A : leçon r3 non terminée');
  await A.run('flushStats()');
  A.run('app._myClasses=null'); await A.run('app.loadMyClasses()');
  if (!A.run("(app._myAssignments||[]).some(a=>a.id==='A1'&&a.done)")) errs.push('devoir réussi affiché « à faire » tant que le serveur ne l\'a pas reçu');
  if (!A.run('_statsDirty')) errs.push('résultat considéré comme enregistré malgré la panne');
  S.down = false;
  await A.run('flushStats()');
  if (!lessons().includes('r3')) errs.push('leçon r3 jamais enregistrée après la panne');

  // 5. Session vraiment expirée : rien n'est perdu, tout part à la reconnexion du même compte.
  S.tokens.clear();
  if (!playLesson(B, 'r5')) errs.push('B : leçon r5 non terminée');
  const ok5 = await B.run('flushStats()');
  if (ok5 || !B.run('_statsDirty')) errs.push('session expirée : résultat considéré comme enregistré');
  S.tokens.add('tB2');
  B.run(`completeLogin({username:'eleve',plan:'expert',token:'tB2',id:'u1',role:'eleve',data:${JSON.stringify(S.data)},onboarding_completed:true})`);
  await B.run('flushStats()');
  if (!lessons().includes('r5')) errs.push('session expirée : leçon r5 perdue à la reconnexion');
  if (!lessons().includes('r1') || !lessons().includes('r3')) errs.push('reconnexion : des leçons déjà enregistrées ont disparu');

  // Tout ce qui a été fait est là, essais compris.
  const tests = (S.data.tests || []).filter((t) => t.mode === 'lesson').length;
  if (tests < 5) errs.push(`${tests} essais de leçon enregistrés au lieu de 5`);
  return errs.length ? { ok: false, detail: errs.join('\n') }
    : { ok: true, detail: `2 appareils, 5 leçons, changement de jeton, panne et session expirée : serveur ${lessons()}, ${tests} essais, rien perdu ni bloqué` };
}

module.exports = { s1 };
