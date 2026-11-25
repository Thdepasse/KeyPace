// Historique de la classe : construction des événements à partir des progressions.
// Lancer : node --test api/_class-feed.test.js
const test = require('node:test');
const assert = require('node:assert');
const { buildClassFeed, lessonClearedAt, stuckLessons, shortName } = require('./_class-feed');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 25, 14, 0, 0);
const H = (h) => NOW - h * 60 * 60 * 1000; // il y a h heures
const member = (id, fullName, extra = {}) => ({ student_id: id, username: id + '_u', fullName, joined_at: new Date(NOW - 30 * DAY).toISOString(), ...extra });
const feed = (members, dataById, assignments = [], opts = {}) => buildClassFeed({ members, dataById, assignments, goals: { minWpm: 20 }, now: NOW, ...opts });
const byType = (events, type) => events.filter((e) => e.type === type);

test('shortName : prénom + initiale, sinon identifiant', () => {
  assert.equal(shortName({ fullName: 'Camille Dupont', username: 'cd' }), 'Camille D.');
  assert.equal(shortName({ fullName: 'Inès', username: 'ir' }), 'Inès');
  assert.equal(shortName({ fullName: null, username: 'tom42' }), 'tom42');
});

test('leçon validée : datée par la marque cleared, sinon par le premier essai assez rapide', () => {
  const tests = [
    { t: H(5), mode: 'lesson', lessonId: 'r1', wpm: 15, acc: 90 },
    { t: H(4), mode: 'lesson', lessonId: 'r1', wpm: 22, acc: 85 },
    { t: H(3), mode: 'lesson', lessonId: 'r1', wpm: 25, acc: 97, cleared: true },
  ];
  assert.equal(lessonClearedAt(tests, 'r1', 20), H(3));
  assert.equal(lessonClearedAt(tests.map(({ cleared, ...t }) => t), 'r1', 20), H(4));
  assert.equal(lessonClearedAt(tests, 'r2', 20), null);

  const ev = feed([member('a', 'Camille Dupont')], { a: { tests, lessons: { r1: { bestWpm: 25, cleared: true }, r2: { bestWpm: 10, cleared: false } } } });
  const lessons = byType(ev, 'lesson');
  assert.equal(lessons.length, 1);
  assert.deepEqual({ id: lessons[0].id, t: lessons[0].t, lessonId: lessons[0].lessonId, wpm: lessons[0].wpm, name: lessons[0].name, act: lessons[0].act },
    { id: 'lesson:a:r1', t: H(3), lessonId: 'r1', wpm: 25, name: 'Camille D.', act: false });
});

test('record de vitesse : seulement les tests de vitesse, à partir du 2e, quand le record monte', () => {
  const tests = [
    { t: H(10), mode: 'test', wpm: 30, acc: 95 },
    { t: H(9), mode: 'lesson', lessonId: 'r1', wpm: 60, acc: 95 }, // une leçon ne compte pas
    { t: H(8), mode: 'test', wpm: 28, acc: 95 },
    { t: H(7), wpm: 33, acc: 95 },                                   // ancien format sans mode : test de vitesse
    { t: H(6), mode: 'test', wpm: 33, acc: 95 },                     // égalité : pas un record
  ];
  const rec = byType(feed([member('b', 'Lucas Martin')], { b: { tests } }), 'record');
  assert.equal(rec.length, 1);
  assert.equal(rec[0].t, H(7));
  assert.equal(rec[0].wpm, 33);
  assert.equal(rec[0].prev, 30);
});

test('devoir rendu : rédaction, module et leçon assignée ; pas les devoirs des autres élèves', () => {
  const created = new Date(NOW - 3 * DAY).toISOString();
  const assignments = [
    { id: 'e1', title: 'Mail de remerciement', essay_type: 'mail', created_at: created },
    { id: 'm1', title: 'Module mail', mode: 'module', lesson_id: 'mail', created_at: created },
    { id: 'l1', title: 'Rangée du haut', lesson_id: 'h1', created_at: created },
    { id: 'x1', title: 'Pour quelqu’un d’autre', essay_type: 'mail', student_id: 'z', created_at: created },
  ];
  const data = {
    assignmentsDone: { e1: { t: H(2), essay: true, words: 120 }, 'mod:mail': { t: H(1), module: true }, x1: { t: H(1) } },
    lessons: { h1: { bestWpm: 24, cleared: true } },
    tests: [{ t: H(30), mode: 'lesson', lessonId: 'h1', wpm: 24, acc: 96, cleared: true }],
  };
  const asg = byType(feed([member('s', 'Sofia Lopez')], { s: data }, assignments), 'assignment');
  assert.deepEqual(asg.map((e) => [e.assignmentId, e.t, e.mode]).sort(), [['e1', H(2), 'essay'], ['l1', H(30), 'lesson'], ['m1', H(1), 'module']]);
  assert.equal(asg.find((e) => e.assignmentId === 'e1').words, 120);
});

test('devoir de leçon déjà validée avant sa création : pas d’événement « rendu »', () => {
  const assignments = [{ id: 'l1', title: 'Base', lesson_id: 'r1', created_at: new Date(H(2)).toISOString() }];
  const data = { lessons: { r1: { bestWpm: 30, cleared: true } }, tests: [{ t: H(20), mode: 'lesson', lessonId: 'r1', wpm: 30, acc: 98, cleared: true }] };
  assert.equal(byType(feed([member('s', 'Sofia Lopez')], { s: data }, assignments), 'assignment').length, 0);
});

test('élève bloqué sur une leçon : 3 essais d’affilée sous 80 %, daté du début de la mauvaise passe', () => {
  const tests = [
    { t: H(9), mode: 'lesson', lessonId: 'r2', wpm: 12, acc: 90 },
    { t: H(8), mode: 'lesson', lessonId: 'r2', wpm: 12, acc: 70 },
    { t: H(7), mode: 'lesson', lessonId: 'r2', wpm: 12, acc: 72 }, // moyenne des 3 derniers (77 %) sous 80 % pour la 1re fois
    { t: H(6), mode: 'lesson', lessonId: 'r2', wpm: 12, acc: 71 },
    { t: H(5), mode: 'lesson', lessonId: 'r2', wpm: 12, acc: 74 },
  ];
  const s = stuckLessons(tests, {});
  assert.equal(s.length, 1);
  assert.equal(s[0].t, H(7)); // ne bouge pas avec les essais ratés suivants
  assert.equal(s[0].attempts, 5);
  assert.equal(s[0].acc, 72);

  const assignments = [{ id: 'p1', title: 'Position de base', lesson_id: 'r2', created_at: new Date(NOW - DAY).toISOString() }];
  const ev = feed([member('i', 'Inès Roux')], { i: { tests, lessons: { r2: { bestWpm: 12, cleared: false } } } }, assignments);
  const st = byType(ev, 'stuck_lesson');
  assert.equal(st.length, 1);
  assert.equal(st[0].act, true);
  assert.equal(st[0].assignmentId, 'p1', 'bouton Relancer sur le devoir pas encore fait');
  assert.equal(byType(ev, 'stuck').length, 0, 'pas de doublon avec l’alerte « bloqué » générale');
  // Devoir en attente sur une autre leçon : pas de « Relancer » ici (le prof assigne un exercice ciblé).
  const other = feed([member('i', 'Inès Roux')], { i: { tests, lessons: {} } }, [{ id: 'q1', title: 'Chiffres', lesson_id: 'num1', created_at: new Date(NOW - DAY).toISOString() }]);
  assert.equal(byType(other, 'stuck_lesson')[0].assignmentId, undefined);

  // Résolu : la précision remonte, ou la leçon est validée → plus d'événement.
  assert.equal(stuckLessons([...tests, { t: H(4), mode: 'lesson', lessonId: 'r2', acc: 95 }, { t: H(3), mode: 'lesson', lessonId: 'r2', acc: 95 }], {}).length, 0);
  assert.equal(stuckLessons(tests, { r2: { cleared: true } }).length, 0);
});

test('alerte « bloqué » existante : 5 séances sans leçon validée, sans leçon précise', () => {
  const tests = [1, 2, 3, 4, 5, 6].map((i) => ({ t: H(20 - i), mode: 'test', wpm: 10, acc: 90 }));
  const st = byType(feed([member('k', 'Karim B')], { k: { tests, lessons: {} } }), 'stuck');
  assert.equal(st.length, 1);
  assert.equal(st[0].t, H(15)); // la 5e séance
  assert.equal(st[0].sessions, 6);
});

test('inactif depuis 7 jours, et inscrit sans avoir jamais commencé', () => {
  const last = NOW - 9 * DAY;
  const ev = feed(
    [member('t', 'Tom Bernard'), member('n', 'Nina Petit', { joined_at: new Date(NOW - 10 * DAY).toISOString() }), member('ok', 'Ok Actif')],
    { t: { tests: [{ t: last, mode: 'test', wpm: 20, acc: 90 }] }, ok: { tests: [{ t: NOW - 2 * DAY, mode: 'test', wpm: 20, acc: 90 }] } },
  );
  const ina = byType(ev, 'inactive');
  assert.equal(ina.length, 1);
  assert.equal(ina[0].studentId, 't');
  assert.equal(ina[0].t, last + 7 * DAY);
  assert.equal(ina[0].days, 9);
  assert.equal(ina[0].act, true);
  const never = byType(ev, 'never');
  assert.deepEqual(never.map((e) => [e.studentId, e.days]), [['n', 10]]);
});

test('ordre, fenêtre de 14 jours, limite et identifiants stables', () => {
  const tests = [
    { t: NOW - 20 * DAY, mode: 'test', wpm: 10 },
    { t: NOW - 19 * DAY, mode: 'test', wpm: 12 }, // record trop ancien : hors fenêtre
    { t: H(30), mode: 'test', wpm: 15 },
    { t: H(2), mode: 'test', wpm: 18 },
    { t: H(1), mode: 'test', wpm: 21 },
  ];
  const members = [member('a', 'Ana Diaz')];
  const lessons = { r1: { bestWpm: 20, cleared: true } }; // une leçon validée (hors fenêtre) : pas d'alerte « bloqué »
  const ev = feed(members, { a: { tests, lessons } });
  assert.deepEqual(ev.map((e) => e.t), [H(1), H(2), H(30)]);
  assert.deepEqual(feed(members, { a: { tests, lessons } }).map((e) => e.id), ev.map((e) => e.id));
  assert.equal(feed(members, { a: { tests, lessons } }, [], { limit: 2 }).length, 2);
  assert.deepEqual(feed([], {}), []);
});
