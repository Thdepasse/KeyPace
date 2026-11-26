// Historique de la classe : fil d'activité du tableau de bord prof (vue d'une classe).
// Logique pure (sans I/O), testée dans _class-feed.test.js.
//
// Aucune table d'événements : chaque événement est reconstitué à partir de ce qui est déjà
// enregistré dans progress.data (tests horodatés, leçons, devoirs rendus) et dans `assignments`.
// Conséquence : un événement « à traiter » (élève bloqué, inactif) disparaît de lui-même quand
// la situation se règle, et un événement a un identifiant stable d'un appel à l'autre, ce qui
// permet au navigateur d'ajouter seulement les nouveaux en haut du fil.
//
// Les textes sont composés côté navigateur (index.html, _feedRow) : seul lui connaît le titre
// des leçons. Le serveur renvoie des données brutes (type, élève, leçon, vitesse…).

const { assignmentTargets, assignmentDone, detectAlerts, allTests, GOAL_DEFAULTS } = require('./_class-logic');

const DAY_MS = 24 * 60 * 60 * 1000;
const LOW_ACC = 80;           // même seuil que la pastille « sous 80 % de précision » de la vue classe
const STUCK_WINDOW = 3;       // un élève est bloqué sur une leçon après 3 essais d'affilée sous LOW_ACC (en moyenne)
const INACTIVE_DAYS = 7;      // même seuil que detectAlerts (alerte « inactif »)
const FEED_DAYS = 14;         // profondeur de l'historique
const FEED_LIMIT = 60;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v) => typeof v === 'number' && Number.isFinite(v);

// « Camille Dupont » → « Camille D. » ; sans nom complet, l'identifiant.
function shortName(m) {
  const parts = String((m && m.fullName) || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts[0] + ' ' + parts[parts.length - 1][0].toUpperCase() + '.';
  return parts[0] || (m && m.username) || '?';
}

function sortedTests(data) {
  const tests = Array.isArray(data && data.tests) ? data.tests : [];
  return tests.filter((t) => isObj(t) && num(t.t)).sort((a, b) => a.t - b.t);
}
const isSpeedTest = (t) => t.mode === 'test' || t.mode == null;
const lessonTests = (tests, id) => tests.filter((t) => t.mode === 'lesson' && t.lessonId === id);

// Moment où une leçon a été validée. Les tests récents portent `cleared: true` sur l'essai qui
// l'a validée (index.html, recordResult). Pour les plus anciens : premier essai atteignant la
// vitesse minimale de la classe (le nombre d'erreurs n'est pas gardé dans l'historique), sinon le
// dernier essai sur la leçon.
function lessonClearedAt(tests, lessonId, minWpm) {
  const lt = lessonTests(tests, lessonId);
  if (!lt.length) return null;
  const marked = lt.find((t) => t.cleared === true);
  if (marked) return marked.t;
  const fast = lt.find((t) => num(t.wpm) && t.wpm >= minWpm);
  return (fast || lt[lt.length - 1]).t;
}

// Moment où un devoir a été rendu (null si on ne peut pas le dater).
function assignmentDoneAt(data, tests, a, minWpm) {
  const created = a.created_at ? new Date(a.created_at).getTime() : 0;
  const marks = isObj(data.assignmentsDone) ? data.assignmentsDone : {};
  if (a.essay_type || a.custom_text) return isObj(marks[a.id]) && num(marks[a.id].t) ? marks[a.id].t : null;
  if (a.mode === 'module') { const m = marks['mod:' + a.lesson_id]; return isObj(m) && num(m.t) ? m.t : null; }
  // Leçon ou test libre avec objectif : premier essai, après la création du devoir, qui le remplit.
  // Une leçon déjà validée avant le devoir n'a pas de moment « rendu » : pas d'événement.
  const pool = a.lesson_id ? lessonTests(tests, a.lesson_id) : tests.filter(isSpeedTest);
  const ok = pool.filter((t) => t.t >= created && (!a.target_wpm || (num(t.wpm) && t.wpm >= a.target_wpm)));
  if (!ok.length) return null;
  if (a.lesson_id && !a.target_wpm) {
    const at = lessonClearedAt(tests, a.lesson_id, minWpm);
    return at != null && at >= created ? at : ok[0].t;
  }
  return ok[0].t;
}

// Leçon sur laquelle l'élève bute en précision : pas validée, et ses STUCK_WINDOW derniers essais
// sont en moyenne sous LOW_ACC. L'événement est daté du début de cette mauvaise passe (il ne
// remonte pas à chaque nouvel essai raté) et disparaît dès que la moyenne repasse au-dessus.
function stuckLessons(tests, lessons) {
  const byLesson = new Map();
  for (const t of tests) if (t.mode === 'lesson' && t.lessonId) {
    if (!byLesson.has(t.lessonId)) byLesson.set(t.lessonId, []);
    byLesson.get(t.lessonId).push(t);
  }
  const out = [];
  for (const [lessonId, lt] of byLesson) {
    const rec = lessons[lessonId];
    if (isObj(rec) ? rec.cleared : num(rec)) continue;
    if (lt.length < STUCK_WINDOW) continue;
    const avgAt = (j) => {
      const w = lt.slice(j - STUCK_WINDOW + 1, j + 1);
      return w.reduce((s, t) => s + (num(t.acc) ? t.acc : 100), 0) / w.length;
    };
    let j = lt.length - 1;
    if (avgAt(j) >= LOW_ACC) continue;
    while (j - 1 >= STUCK_WINDOW - 1 && avgAt(j - 1) < LOW_ACC) j--;
    out.push({ lessonId, t: lt[j].t, attempts: lt.length, acc: Math.round(avgAt(lt.length - 1)) });
  }
  return out;
}

/**
 * members     [{ student_id, username, fullName, joined_at }]
 * dataById    { student_id: progress.data }
 * assignments lignes de la table assignments de la classe
 * goals       { minWpm } objectifs effectifs de la classe
 * Retourne au plus `limit` événements des `days` derniers jours, du plus récent au plus ancien :
 *   { id, type, t, studentId, name, act, ... }
 *   type : lesson | record | assignment | stuck_lesson | stuck | inactive | never | member_add | member_remove
 *   act  : true pour un événement à traiter (bord rouge et bouton d'action)
 * memberEvents (facultatif) : journal class_member_events, avec `student` et `actor`
 *   ({ username, full_name, role }) déjà joints. Un retrait d'élève qui n'est pas revenu
 *   dans la classe est « à traiter » et peut être annulé (restorable).
 */
function buildClassFeed({ members, dataById, assignments, goals, now, days = FEED_DAYS, limit = FEED_LIMIT, memberEvents = [] }) {
  const minWpm = goals && num(goals.minWpm) ? goals.minWpm : GOAL_DEFAULTS.minWpm;
  const since = now - days * DAY_MS;
  const list = Array.isArray(members) ? members : [];
  const asg = Array.isArray(assignments) ? assignments : [];
  const events = [];

  // Alertes « bloqué » (assez de séances, aucune leçon validée) : même règle que le tableau de bord.
  const stuckAlert = new Set(detectAlerts(list.map((m) => ({ username: m.student_id, data: (dataById || {})[m.student_id] || {} })), now).stuck.map((s) => s.username));

  for (const m of list) {
    const sid = m.student_id;
    const data = isObj((dataById || {})[sid]) ? dataById[sid] : {};
    const tests = sortedTests(data);
    // Records et inactivité : essais de tous les cours (un élève qui travaille dans un autre cours
    // n'est pas inactif). Leçons et blocages : cours par défaut, seul dont le navigateur connaît les titres.
    const everyTest = allTests(data);
    const lessons = isObj(data.lessons) ? data.lessons : {};
    const base = { studentId: sid, name: shortName(m) };
    const push = (e) => events.push({ ...base, act: false, ...e });

    // Devoir encore à faire pour cet élève (le plus récent) : le bouton « Relancer » s'appuie dessus.
    // Pour un élève bloqué sur une leçon, seulement un devoir sur cette leçon (sinon : « Assigner un exercice »).
    const pendingAll = asg
      .filter((a) => assignmentTargets(a, [m]).length && !assignmentDone(data, a))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    const relaunchFor = (a) => (a ? { assignmentId: a.id, assignmentTitle: a.title } : {});
    const relaunch = relaunchFor(pendingAll[0]);

    // Leçons validées
    for (const [lessonId, rec] of Object.entries(lessons)) {
      if (!(isObj(rec) ? rec.cleared : num(rec))) continue;
      const t = lessonClearedAt(tests, lessonId, minWpm);
      if (t == null) continue;
      const lt = lessonTests(tests, lessonId).find((x) => x.t === t);
      push({ id: `lesson:${sid}:${lessonId}`, type: 'lesson', t, lessonId, wpm: lt && num(lt.wpm) ? lt.wpm : null });
    }

    // Records de vitesse (tests de vitesse libres, à partir du 2e test)
    let best = null;
    for (const t of everyTest) {
      if (!isSpeedTest(t) || !num(t.wpm)) continue;
      if (best != null && t.wpm > best) push({ id: `record:${sid}:${t.t}`, type: 'record', t: t.t, wpm: t.wpm, prev: best });
      if (best == null || t.wpm > best) best = t.wpm;
    }

    // Devoirs rendus
    for (const a of asg) {
      if (!assignmentTargets(a, [m]).length || !assignmentDone(data, a)) continue;
      const t = assignmentDoneAt(data, tests, a, minWpm);
      if (t == null) continue;
      const mark = isObj(data.assignmentsDone) ? data.assignmentsDone[a.id] : null;
      push({ id: `asg:${sid}:${a.id}`, type: 'assignment', t, assignmentId: a.id, title: a.title, mode: a.essay_type ? 'essay' : a.mode || (a.lesson_id ? 'lesson' : 'test'), words: isObj(mark) && num(mark.words) ? mark.words : null });
    }

    // Élève bloqué sur une leçon (précision)
    const stuck = stuckLessons(tests, lessons);
    for (const s of stuck) {
      push({ id: `stuck:${sid}:${s.lessonId}:${s.t}`, type: 'stuck_lesson', t: s.t, lessonId: s.lessonId, attempts: s.attempts, acc: s.acc, act: true, ...relaunchFor(pendingAll.find((a) => a.lesson_id === s.lessonId && !a.essay_type && a.mode !== 'module')) });
    }
    // Élève bloqué sans leçon précise (alerte existante), seulement s'il n'est pas déjà signalé sur une leçon.
    if (!stuck.length && stuckAlert.has(sid) && everyTest.length >= 5) {
      push({ id: `stuck:${sid}`, type: 'stuck', t: everyTest[4].t, sessions: everyTest.length, act: true, ...relaunch });
    }

    // Inactivité : l'événement apparaît au moment où l'élève franchit les INACTIVE_DAYS jours.
    const last = everyTest.length ? everyTest[everyTest.length - 1].t : null;
    if (last != null) {
      const daysOff = Math.floor((now - last) / DAY_MS);
      if (daysOff >= INACTIVE_DAYS) push({ id: `inactive:${sid}:${last}`, type: 'inactive', t: last + INACTIVE_DAYS * DAY_MS, days: daysOff, act: true, ...relaunch });
    } else if (m.joined_at) {
      const joined = new Date(m.joined_at).getTime();
      const daysOff = Math.floor((now - joined) / DAY_MS);
      if (num(joined) && daysOff >= INACTIVE_DAYS) push({ id: `never:${sid}`, type: 'never', t: joined + INACTIVE_DAYS * DAY_MS, days: daysOff, act: true, ...relaunch });
    }
  }

  // Entrées et sorties de la classe (journal).
  const currentIds = new Set(list.map((m) => m.student_id));
  const lastRemove = new Map(); // élève -> id du retrait le plus récent
  const evs = Array.isArray(memberEvents) ? memberEvents : [];
  for (const e of evs) {
    const t = e && e.created_at ? new Date(e.created_at).getTime() : NaN;
    if (!num(t) || !e.student_id) continue;
    if (e.action === 'remove' && (!lastRemove.has(e.student_id) || t > lastRemove.get(e.student_id).t)) lastRemove.set(e.student_id, { id: e.id, t });
  }
  for (const e of evs) {
    const t = e && e.created_at ? new Date(e.created_at).getTime() : NaN;
    if (!num(t) || !e.student_id || (e.action !== 'add' && e.action !== 'remove')) continue;
    const st = e.student || {};
    const actor = e.actor || null;
    const by = !actor || e.actor_id === e.student_id ? null : actor.role === 'admin' ? "l'établissement" : shortName({ fullName: actor.full_name, username: actor.username });
    const ev = { id: `member:${e.id}`, type: e.action === 'remove' ? 'member_remove' : 'member_add', t, studentId: e.student_id, name: shortName({ fullName: st.full_name, username: st.username }), by, source: e.source || null, act: false };
    // Le retrait le plus récent d'un élève toujours absent de la classe : à traiter, annulable.
    if (e.action === 'remove' && !currentIds.has(e.student_id) && lastRemove.get(e.student_id).id === e.id) { ev.act = true; ev.restorable = true; }
    events.push(ev);
  }

  return events
    .filter((e) => e.t >= since && e.t <= now + 5 * 60 * 1000) // tolère une horloge d'élève un peu en avance
    .sort((a, b) => b.t - a.t || a.id.localeCompare(b.id))
    .slice(0, limit);
}

module.exports = { buildClassFeed, lessonClearedAt, assignmentDoneAt, stuckLessons, shortName, LOW_ACC, STUCK_WINDOW, INACTIVE_DAYS, FEED_DAYS, FEED_LIMIT };
