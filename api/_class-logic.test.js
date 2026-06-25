// Tests de la logique établissement (permissions + agrégats).
// Lancer : node --test api/_class-logic.test.js
const test = require('node:test');
const assert = require('node:assert');
const { studentSummary, aggregateClass, detectAlerts, dailySeries, canActAsTeacher, canManageClass, canActAsAdmin, institutionProfSummary } = require('./_class-logic');

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

test('studentSummary : élève sans données', () => {
  const s = studentSummary({}, NOW);
  assert.equal(s.sessions, 0);
  assert.equal(s.avgWpm, null);
  assert.equal(s.avgAcc, null);
  assert.equal(s.clearedLessons, 0);
  assert.equal(s.daysSinceActive, null);
});

test('studentSummary : moyennes sur les 10 derniers tests + inactivité', () => {
  const tests = [];
  for (let i = 0; i < 12; i++) tests.push({ t: NOW - (12 - i) * DAY, wpm: 20 + i, acc: 90 });
  const s = studentSummary({ tests, lessons: { r1: { cleared: true }, r2: { cleared: false } } }, NOW);
  assert.equal(s.sessions, 12);
  // 10 derniers => wpm 22..31 => moyenne 26.5 -> arrondi 27
  assert.equal(s.avgWpm, 27);
  assert.equal(s.avgAcc, 90);
  assert.equal(s.clearedLessons, 1);
  assert.equal(s.daysSinceActive, 1); // dernier test à NOW - 1 jour
});

test('aggregateClass : actifs cette semaine + moyennes ignorant les élèves sans données', () => {
  const actif = { tests: [{ t: NOW - 2 * DAY, wpm: 40, acc: 95 }] };
  const inactif = { tests: [{ t: NOW - 20 * DAY, wpm: 30, acc: 80 }] };
  const vide = {};
  const agg = aggregateClass([actif, inactif, vide], NOW);
  assert.equal(agg.total, 3);
  assert.equal(agg.activeThisWeek, 1);
  assert.equal(agg.totalSessions, 2);
  assert.equal(agg.avgWpm, 35); // (40+30)/2, le vide est ignoré
  assert.equal(agg.avgAcc, 88); // (95+80)/2 = 87.5 -> 88
});

test('detectAlerts : inactifs >=7j et bloqués sans leçon validée', () => {
  const students = [
    { username: 'lea', data: { tests: [{ t: NOW - 1 * DAY, wpm: 30, acc: 90 }], lessons: { r1: { cleared: true } } } },
    { username: 'tom', data: { tests: [{ t: NOW - 10 * DAY, wpm: 20, acc: 85 }] } },
    { username: 'sam', data: { tests: Array.from({ length: 6 }, (_, i) => ({ t: NOW - i * 3600000, wpm: 15, acc: 70 })), lessons: {} } },
  ];
  const { inactive, stuck } = detectAlerts(students, NOW);
  assert.deepEqual(inactive.map((x) => x.username), ['tom']);
  assert.deepEqual(stuck.map((x) => x.username), ['sam']);
});

test('dailySeries : répartit les sessions par jour sur 7 jours (ancien -> récent)', () => {
  const students = [
    { tests: [{ t: NOW, wpm: 40 }, { t: NOW - 2 * DAY, wpm: 30 }] },
    { tests: [{ t: NOW, wpm: 50 }, { t: NOW - 10 * DAY, wpm: 99 }] }, // le -10j est hors fenêtre
  ];
  const series = dailySeries(students, NOW, 7);
  assert.equal(series.length, 7);
  assert.equal(series[6].sessions, 2); // aujourd'hui : 2 sessions
  assert.equal(series[6].avgWpm, 45); // (40+50)/2
  assert.equal(series[4].sessions, 1); // il y a 2 jours : 1 session
  assert.equal(series.reduce((a, b) => a + b.sessions, 0), 3); // le test à -10j est exclu
});

test('canActAsTeacher : prof et admin oui, élève non', () => {
  assert.equal(canActAsTeacher({ role: 'prof' }), true);
  assert.equal(canActAsTeacher({ role: 'admin' }), true);
  assert.equal(canActAsTeacher({ role: 'eleve' }), false);
  assert.equal(canActAsTeacher(null), false);
});

test('canManageClass : prof = ses classes, admin = son établissement', () => {
  const prof = { id: 'p1', role: 'prof', institution_id: 'i1' };
  const autreProf = { id: 'p2', role: 'prof', institution_id: 'i1' };
  const admin = { id: 'a1', role: 'admin', institution_id: 'i1' };
  const cls = { teacher_id: 'p1', institution_id: 'i1' };
  assert.equal(canManageClass(prof, cls), true);
  assert.equal(canManageClass(autreProf, cls), false); // pas sa classe
  assert.equal(canManageClass(admin, cls), true); // même établissement
  assert.equal(canManageClass(admin, { teacher_id: 'p9', institution_id: 'i2' }), false);
  assert.equal(canManageClass({ role: 'eleve', id: 's1' }, cls), false);
});

test('canActAsAdmin : admin rattaché à une institution oui, sinon non', () => {
  assert.equal(canActAsAdmin({ role: 'admin', institution_id: 'i1' }), true);
  assert.equal(canActAsAdmin({ role: 'admin', institution_id: null }), false); // admin sans institution
  assert.equal(canActAsAdmin({ role: 'prof', institution_id: 'i1' }), false);
  assert.equal(canActAsAdmin(null), false);
});

test('institutionProfSummary : agrège par prof + dernière activité', () => {
  const profs = [
    {
      profId: 'p1', username: 'mme.durand', classCount: 2,
      studentsData: [
        { tests: [{ t: NOW - 2 * DAY, wpm: 40, acc: 95 }] },
        { tests: [{ t: NOW - 20 * DAY, wpm: 30, acc: 80 }] },
        {},
      ],
    },
    { profId: 'p2', username: 'm.leroy', classCount: 0, studentsData: [] },
  ];
  const [a, b] = institutionProfSummary(profs, NOW);
  assert.equal(a.profId, 'p1');
  assert.equal(a.classCount, 2);
  assert.equal(a.studentCount, 3);
  assert.equal(a.activeThisWeek, 1); // seul l'élève à -2j est actif
  assert.equal(a.avgWpm, 35); // (40+30)/2, le vide ignoré
  assert.equal(a.lastActivity, NOW - 2 * DAY); // test le plus récent
  // prof sans classe ni élève
  assert.equal(b.studentCount, 0);
  assert.equal(b.avgWpm, null);
  assert.equal(b.lastActivity, null);
});
