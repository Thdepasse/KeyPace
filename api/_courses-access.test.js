// Accès aux cours : le cours QWERTY est en bêta, réservé aux comptes testeurs (KEYPACE_BETA_TESTERS), contrôle fait côté serveur
// d'après le nom d'utilisateur enregistré en base. Lancer : node --test api/_courses-access.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
process.env.KEYPACE_BETA_TESTERS = ' Testeur1 , testeur2 ';
const test = require('node:test');
const assert = require('node:assert');
const saveProgress = require('./save-progress');
const { COURSE_ACCESS, courseIdsFor, betaTesters } = require('./_courses-registry');

let USER, PROGRESS, CALLS;
global.fetch = async (url, opts = {}) => {
  const u = String(url); const method = opts.method || 'GET';
  CALLS.push({ u, method });
  let data = [];
  if (u.includes('/users?session_token=')) data = [USER];
  else if (u.includes('/progress?user_id=') && method === 'GET') data = PROGRESS ? [{ data: PROGRESS, rev: 1 }] : [];
  else if (u.includes('/progress?on_conflict') && method === 'POST') PROGRESS = JSON.parse(opts.body).data;
  return { ok: true, status: 200, text: async () => JSON.stringify(data) };
};
const call = async (body) => {
  const out = {};
  const res = { setHeader() {}, status: (c) => { out.status = c; return res; }, json: (o) => { out.body = o; return res; }, end: () => res };
  await saveProgress({ method: 'POST', headers: {}, body }, res);
  return out;
};
const R1 = { bestWpm: 30, bestErr: 1, cleared: true };
const blob = () => ({ lessons: { r1: R1 }, courses: { 'fr/qwerty': { lessons: { r1: R1 }, tests: [], keyStats: {} } } });

test('le registre déclare le cours QWERTY en bêta ; la liste des testeurs vient de l\'environnement', () => {
  assert.deepEqual(COURSE_ACCESS['fr/qwerty'], { status: 'bêta' });
  assert.deepEqual(betaTesters(), ['testeur1', 'testeur2']);
  assert.deepEqual(courseIdsFor({ username: 'testeur1' }), ['fr/qwerty']);
  assert.deepEqual(courseIdsFor({ username: 'TESTEUR2' }), ['fr/qwerty'], 'sans distinction de casse');
  for (const u of [{ username: 'autre', role: 'eleve' }, { username: 'chef', role: 'admin' }, { username: 'p', role: 'prof' }, {}, null]) assert.deepEqual(courseIdsFor(u), [], JSON.stringify(u));
});

test('variable vide ou absente : personne n\'a accès', () => {
  const old = process.env.KEYPACE_BETA_TESTERS;
  try {
    process.env.KEYPACE_BETA_TESTERS = ''; assert.deepEqual(courseIdsFor({ username: 'testeur1' }), []);
    delete process.env.KEYPACE_BETA_TESTERS; assert.deepEqual(courseIdsFor({ username: 'testeur1' }), []);
    process.env.KEYPACE_BETA_TESTERS = ' , ,'; assert.deepEqual(courseIdsFor({ username: '' }), [], 'un nom vide ne doit pas correspondre à une entrée vide');
  } finally { process.env.KEYPACE_BETA_TESTERS = old; }
});

test('requête access : le serveur dit à quels cours le compte a droit, sans toucher à la progression', async () => {
  USER = { id: 1, role: 'eleve', username: 'testeur1' }; PROGRESS = { lessons: { r1: R1 } }; CALLS = [];
  let r = await call({ token: 't', access: true });
  assert.deepEqual(r.body, { ok: true, coursAcces: ['fr/qwerty'] });
  USER = { id: 2, role: 'admin', username: 'chef' };
  r = await call({ token: 't', access: true });
  assert.deepEqual(r.body.coursAcces, []);
  assert.equal(CALLS.some((c) => c.u.includes('/progress')), false, 'la requête access ne lit ni n\'écrit la progression');
});

test('un compte testeur enregistre la progression du cours QWERTY', async () => {
  USER = { id: 1, role: 'eleve', username: 'testeur1' }; PROGRESS = null; CALLS = [];
  await call({ token: 't', data: blob() });
  assert.ok(PROGRESS.courses && PROGRESS.courses['fr/qwerty'] && PROGRESS.courses['fr/qwerty'].lessons.r1);
});

test('les autres comptes (élève, prof, établissement, admin) : la progression du cours en bêta est ignorée, le reste est gardé', async () => {
  for (const role of ['eleve', 'prof', 'etablissement', 'admin']) {
    USER = { id: 2, role, username: 'pas-testeur' }; PROGRESS = null; CALLS = [];
    await call({ token: 't', data: blob() });
    assert.equal('courses' in PROGRESS, false, role);
    assert.ok(PROGRESS.lessons.r1, role + ' : la progression normale est perdue');
  }
});

test('un rôle ou un nom forgé dans le blob ne donne pas accès : seul le compte en base compte', async () => {
  USER = { id: 3, role: 'eleve', username: 'pas-testeur' }; PROGRESS = null; CALLS = [];
  const d = blob(); d.role = 'admin'; d.username = 'testeur1';
  await call({ token: 't', data: d });
  assert.equal('courses' in PROGRESS, false);
  assert.equal('role' in PROGRESS, false);
});

test('un cours déjà enregistré n\'est pas effacé par un compte qui n\'y a plus accès', async () => {
  USER = { id: 4, role: 'eleve', username: 'ex-testeur' }; PROGRESS = { lessons: { r1: R1 }, courses: { 'fr/qwerty': { lessons: { r1: R1 }, tests: [], keyStats: {} } } }; CALLS = [];
  await call({ token: 't', data: { lessons: { r1: R1 } } });
  assert.ok(PROGRESS.courses && PROGRESS.courses['fr/qwerty'], 'la progression QWERTY enregistrée a disparu');
});
