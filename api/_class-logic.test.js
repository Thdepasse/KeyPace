// Tests de la logique établissement (permissions + agrégats).
// Lancer : node --test api/_class-logic.test.js
const test = require('node:test');
const assert = require('node:assert');
const { studentSummary, aggregateClass, detectAlerts, dailySeries, canActAsTeacher, canManageClass, canAdministerClass, canActAsAdmin, institutionProfSummary, moduleMastery, studentModuleProgress, MODULE_NAMES, GOAL_DEFAULTS, GOAL_LIMITS, parseGoalInput, effectiveClassGoals, CLASS_SETTINGS, parseClassSetting, classSettingsOf, effectiveClassSettings, assignmentTargets, assignmentVisibleTo, AZER_LESSON_MODULE, lessonModuleMap, moduleNamesFor } = require('./_class-logic');

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

test('studentSummary : série de jours consécutifs (streak)', () => {
  const tests = [
    { t: NOW, wpm: 40, acc: 90 },
    { t: NOW - DAY, wpm: 35, acc: 88 },
    { t: NOW - 2 * DAY, wpm: 30, acc: 85 },
    { t: NOW - 5 * DAY, wpm: 20, acc: 80 }, // trop loin, hors de la série
  ];
  assert.equal(studentSummary({ tests }, NOW).streak, 3);
});

test('studentSummary : streak à 0 si le dernier test remonte à plusieurs jours', () => {
  const tests = [{ t: NOW - 3 * DAY, wpm: 20, acc: 80 }];
  assert.equal(studentSummary({ tests }, NOW).streak, 0);
});

test('moduleMastery : répartit les élèves par module (maîtrisé / en cours / pas commencé)', () => {
  const students = [
    { r1: { cleared: true }, r2: { cleared: true }, r3: { cleared: true }, r4: { cleared: true }, r5: { cleared: true }, r6: { cleared: true } }, // module 0 maîtrisé
    { r1: { cleared: true }, r2: { cleared: true } }, // module 0 en cours
    {}, // module 0 pas commencé
  ];
  const modules = moduleMastery(students);
  assert.equal(modules.length, MODULE_NAMES.length);
  const first = modules[0];
  assert.equal(first.name, MODULE_NAMES[0]);
  assert.equal(first.mastered, 1);
  assert.equal(first.inProgress, 1);
  assert.equal(first.behind, 1);
  assert.equal(first.avgPct, 44); // (100 + 33.33 + 0) / 3 arrondi
});

test('studentModuleProgress : leçons validées / total par module pour un élève', () => {
  const p = studentModuleProgress({ r1: { cleared: true }, r2: { cleared: true }, h1: { cleared: false } });
  assert.equal(p.length, MODULE_NAMES.length);
  assert.deepEqual(p[0], { c: 2, t: 6 });
  assert.deepEqual(p[1], { c: 0, t: 6 });
  assert.deepEqual(studentModuleProgress(null)[0], { c: 0, t: 6 });
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

test('canManageClass : plusieurs profs sur la même classe (teacher_ids)', () => {
  const p1 = { id: 'p1', role: 'prof', institution_id: 'i1' };
  const p2 = { id: 'p2', role: 'prof', institution_id: 'i1' };
  const p3 = { id: 'p3', role: 'prof', institution_id: 'i1' };
  const cls = { teacher_id: 'p1', teacher_ids: ['p1', 'p2'], institution_id: 'i1' };
  assert.equal(canManageClass(p1, cls), true);
  assert.equal(canManageClass(p2, cls), true);
  assert.equal(canManageClass(p3, cls), false);
  // Retiré par l'établissement : teacher_ids fait foi, pas l'ancien teacher_id.
  assert.equal(canManageClass(p1, { ...cls, teacher_ids: ['p2'] }), false);
});

test('canAdministerClass : les profs de la classe et l\'établissement peuvent renommer/archiver', () => {
  const p1 = { id: 'p1', role: 'prof', institution_id: 'i1' };
  const p2 = { id: 'p2', role: 'prof', institution_id: 'i1' };
  const p3 = { id: 'p3', role: 'prof', institution_id: 'i1' };
  const admin = { id: 'a1', role: 'admin', institution_id: 'i1' };
  const cls = { teacher_id: 'p1', teacher_ids: ['p1', 'p2'], institution_id: 'i1' };
  assert.equal(canAdministerClass(p1, cls), true);
  assert.equal(canAdministerClass(p2, cls), true); // co-prof : mêmes droits
  assert.equal(canAdministerClass(p3, cls), false); // pas sa classe
  assert.equal(canAdministerClass(admin, cls), true);
  assert.equal(canAdministerClass(admin, { ...cls, institution_id: 'i2' }), false);
  assert.equal(canAdministerClass({ role: 'eleve', id: 's1' }, cls), false);
});

test('effectiveClassGoals : élève sans classe active = pas de verrou', () => {
  assert.equal(effectiveClassGoals([]), null);
  assert.equal(effectiveClassGoals(undefined), null);
  assert.equal(effectiveClassGoals([{ archived: true, goal_wpm: 50 }]), null);
});

test('effectiveClassGoals : classe sans réglage = valeurs par défaut (20 mpm, 8 erreurs)', () => {
  assert.deepEqual(effectiveClassGoals([{ name: '4A' }]), { minWpm: 20, maxErrors: 8 });
  assert.deepEqual(effectiveClassGoals([{ goal_wpm: null, goal_errors: null }]), { minWpm: 20, maxErrors: 8 });
});

test('effectiveClassGoals : réglage du prof appliqué, y compris plus bas que le défaut', () => {
  assert.deepEqual(effectiveClassGoals([{ goal_wpm: 12, goal_errors: 15 }]), { minWpm: 12, maxErrors: 15 });
});

test('effectiveClassGoals : plusieurs classes, la plus stricte gagne ; archivées ignorées', () => {
  const r = effectiveClassGoals([{ goal_wpm: 12, goal_errors: 15 }, { goal_wpm: 30, goal_errors: 5 }, { archived: true, goal_wpm: 80, goal_errors: 0 }]);
  assert.deepEqual(r, { minWpm: 30, maxErrors: 5 });
  assert.deepEqual(effectiveClassGoals([{ goal_wpm: 12 }, {}]), { minWpm: 20, maxErrors: 8 });
});

test('parseGoalInput : bornes, entiers, null = défaut', () => {
  assert.deepEqual(parseGoalInput(null, GOAL_LIMITS.minWpm), { ok: true, value: null });
  assert.deepEqual(parseGoalInput('', GOAL_LIMITS.minWpm), { ok: true, value: null });
  assert.deepEqual(parseGoalInput(25, GOAL_LIMITS.minWpm), { ok: true, value: 25 });
  assert.deepEqual(parseGoalInput('25', GOAL_LIMITS.minWpm), { ok: true, value: 25 });
  assert.deepEqual(parseGoalInput(0, GOAL_LIMITS.maxErrors), { ok: true, value: 0 });
  for (const bad of [4, 81, 2.5, 'abc', -1, NaN, {}, [], true]) assert.equal(parseGoalInput(bad, GOAL_LIMITS.minWpm).ok, false, String(bad));
  assert.equal(parseGoalInput(31, GOAL_LIMITS.maxErrors).ok, false);
  assert.deepEqual(GOAL_DEFAULTS, { minWpm: 20, maxErrors: 8 });
});

// Réglages pédagogiques de la classe : normes typographiques (étape 1 des normes belges).
test('classSettingsOf : défaut français, colonne absente ou valeur inconnue = défaut', () => {
  assert.deepEqual(classSettingsOf({}), { typoNorm: 'fr', freeAccess: false, homeRow: 'qsdf' });
  assert.deepEqual(classSettingsOf(null), { typoNorm: 'fr', freeAccess: false, homeRow: 'qsdf' });
  assert.deepEqual(classSettingsOf({ typo_norm: 'be', free_access: true }), { typoNorm: 'be', freeAccess: true, homeRow: 'qsdf' });
  assert.deepEqual(classSettingsOf({ typo_norm: 'xx', free_access: 'oui' }), { typoNorm: 'fr', freeAccess: false, homeRow: 'qsdf' });
});

test('parseClassSetting : valeurs admises, null remet le défaut, le reste est refusé', () => {
  assert.deepEqual(parseClassSetting('typoNorm', 'be'), { ok: true, value: 'be' });
  assert.deepEqual(parseClassSetting('typoNorm', 'fr'), { ok: true, value: 'fr' });
  assert.deepEqual(parseClassSetting('typoNorm', null), { ok: true, value: 'fr' });
  assert.deepEqual(parseClassSetting('typoNorm', ''), { ok: true, value: 'fr' });
  for (const v of ['BE', 'nl', 1, true, undefined, {}]) assert.equal(parseClassSetting('typoNorm', v).ok, false);
  assert.equal(parseClassSetting('role', 'admin').ok, false);
  assert.equal(parseClassSetting('__proto__', 'x').ok, false);
  assert.equal(CLASS_SETTINGS.typoNorm.col, 'typo_norm');
});

test('effectiveClassSettings : sans classe active = null (l\'élève choisit), sinon le réglage non par défaut l\'emporte', () => {
  assert.equal(effectiveClassSettings([]), null);
  assert.equal(effectiveClassSettings(undefined), null);
  assert.equal(effectiveClassSettings([{ archived: true, typo_norm: 'be' }]), null);
  assert.deepEqual(effectiveClassSettings([{}]), { typoNorm: 'fr', freeAccess: false, homeRow: 'qsdf' });
  assert.deepEqual(effectiveClassSettings([{ typo_norm: 'fr' }]), { typoNorm: 'fr', freeAccess: false, homeRow: 'qsdf' });
  assert.deepEqual(effectiveClassSettings([{ typo_norm: 'fr' }, { typo_norm: 'be' }]), { typoNorm: 'be', freeAccess: false, homeRow: 'qsdf' });
  assert.deepEqual(effectiveClassSettings([{ typo_norm: 'fr' }, { typo_norm: 'be', archived: true }]), { typoNorm: 'fr', freeAccess: false, homeRow: 'qsdf' });
  assert.deepEqual(effectiveClassSettings([{ free_access: false }, { free_access: true }]), { typoNorm: 'fr', freeAccess: true, homeRow: 'qsdf' });
});

test('parseClassSetting freeAccess : booléens seulement', () => {
  assert.deepEqual(parseClassSetting('freeAccess', true), { ok: true, value: true });
  assert.deepEqual(parseClassSetting('freeAccess', false), { ok: true, value: false });
  assert.deepEqual(parseClassSetting('freeAccess', null), { ok: true, value: false });
  for (const v of ['true', 1, 0, 'oui']) assert.equal(parseClassSetting('freeAccess', v).ok, false);
});

test('devoir individuel (remédiation) : seul l\'élève visé le voit et compte', () => {
  const members = [{ student_id: 'a' }, { student_id: 'b' }, { student_id: 'c' }];
  assert.equal(assignmentTargets({ student_id: null }, members).length, 3);
  assert.equal(assignmentTargets({}, members).length, 3);
  assert.deepEqual(assignmentTargets({ student_id: 'b' }, members), [{ student_id: 'b' }]);
  assert.deepEqual(assignmentTargets({ student_id: 'z' }, members), []); // élève sorti de la classe : le devoir ne compte plus
  assert.deepEqual(assignmentTargets({ student_id: 'b' }, null), []);
  assert.equal(assignmentVisibleTo({}, 'a'), true);
  assert.equal(assignmentVisibleTo({ student_id: 'a' }, 'a'), true);
  assert.equal(assignmentVisibleTo({ student_id: 'b' }, 'a'), false);
  assert.equal(assignmentVisibleTo(null, 'a'), false);
});

test('homeRow : méthode AZER-UIOP par classe, défaut QSDF, la méthode belge l\'emporte entre plusieurs classes', () => {
  assert.equal(classSettingsOf({ home_row: 'azer' }).homeRow, 'azer');
  assert.equal(classSettingsOf({ home_row: 'AZER' }).homeRow, 'qsdf');
  assert.deepEqual(parseClassSetting('homeRow', 'azer'), { ok: true, value: 'azer' });
  assert.deepEqual(parseClassSetting('homeRow', null), { ok: true, value: 'qsdf' });
  assert.equal(parseClassSetting('homeRow', 'asdf').ok, false);
  assert.equal(effectiveClassSettings([{ home_row: 'qsdf' }, { home_row: 'azer' }]).homeRow, 'azer');
});

test('statistiques par module en AZER-UIOP : leçons ar*/am*, module 2 « Rangée du milieu », QSDF inchangé', () => {
  const H = require('../home-row-azer.js');
  assert.deepEqual(Object.keys(AZER_LESSON_MODULE), H.ORDER, 'mêmes leçons que home-row-azer.js');
  for (const id of H.ORDER) assert.equal(AZER_LESSON_MODULE[id], /^ar/.test(id) ? 0 : 1);
  assert.equal(lessonModuleMap('qsdf').r1, 0);
  assert.equal(lessonModuleMap('azer').r1, undefined);
  assert.equal(lessonModuleMap('azer').b1, 2);
  assert.equal(moduleNamesFor('azer')[1], '2. Rangée du milieu');
  assert.equal(moduleNamesFor('qsdf')[1], '2. Rangée du haut');
  const qsdfDone = { r1: { cleared: true }, r2: { cleared: true }, b1: { cleared: true } };
  assert.deepEqual(studentModuleProgress(qsdfDone).slice(0, 3), [{ c: 2, t: 6 }, { c: 0, t: 6 }, { c: 1, t: 6 }]);
  assert.deepEqual(studentModuleProgress(qsdfDone, 'azer').slice(0, 3), [{ c: 0, t: 6 }, { c: 0, t: 6 }, { c: 1, t: 6 }], 'en AZER, les leçons QSDF ne comptent pas');
  assert.deepEqual(studentModuleProgress({ ar1: { cleared: true } }, 'azer')[0], { c: 1, t: 6 });
  assert.equal(moduleMastery([qsdfDone], 'azer')[1].name, '2. Rangée du milieu');
  assert.equal(moduleMastery([qsdfDone])[1].name, '2. Rangée du haut');
});
