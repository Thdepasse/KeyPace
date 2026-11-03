// Un élève ne doit pas pouvoir devenir prof en écrivant `role` ou `classes` dans sa progression.
// Lancer : node --test api/_role-forgery.test.js
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'k';
const test = require('node:test');
const assert = require('node:assert');
const saveProgress = require('./save-progress');
const classes = require('./classes');

let USER, PROGRESS, CALLS;
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  const method = opts.method || 'GET';
  CALLS.push({ u, method, body: opts.body ? JSON.parse(opts.body) : null });
  let data = [];
  if (u.includes('/users?session_token=')) data = [USER];
  else if (u.includes('/progress?user_id=') && method === 'GET') data = PROGRESS ? [{ data: PROGRESS }] : [];
  else if (u.includes('/progress?on_conflict') && method === 'POST') PROGRESS = JSON.parse(opts.body).data;
  return { ok: true, status: 200, text: async () => JSON.stringify(data) };
};
const call = async (handler, body) => {
  const out = { headers: {} };
  const res = { setHeader: (k, v) => { out.headers[k] = v; }, status: (c) => { out.status = c; return res; }, json: (o) => { out.body = o; return res; }, end: () => res };
  await handler({ method: 'POST', headers: {}, body }, res);
  return out;
};
const roleChanges = () => CALLS.filter((c) => c.method === 'PATCH' && c.u.includes('/users?id='));

test('save-progress retire role et classes envoyés par le client (compte sans progression)', async () => {
  USER = { id: 7, role: 'eleve' }; PROGRESS = null; CALLS = [];
  await call(saveProgress, { token: 't', data: { lessons: { a: 1 }, role: 'etablissement', classes: [{ name: 'X' }] } });
  assert.deepEqual(Object.keys(PROGRESS), ['lessons']);
});

test('save-progress garde les valeurs déjà enregistrées, pas celles du client', async () => {
  USER = { id: 7, role: 'prof' }; PROGRESS = { lessons: { a: 1 }, role: 'etablissement', classes: [{ name: 'Ancienne' }] }; CALLS = [];
  await call(saveProgress, { token: 't', data: { lessons: { a: 1 }, role: 'admin', classes: [{ name: 'Faux' }] } });
  assert.equal(PROGRESS.role, 'etablissement');
  assert.deepEqual(PROGRESS.classes, [{ name: 'Ancienne' }]);
});

test('save-progress : un blob sans ces champs ne les efface pas', async () => {
  USER = { id: 7, role: 'prof' }; PROGRESS = { lessons: { a: 1 }, classes: [{ name: 'Ancienne' }] }; CALLS = [];
  await call(saveProgress, { token: 't', data: { lessons: { a: 1 } } });
  assert.deepEqual(PROGRESS.classes, [{ name: 'Ancienne' }]);
});

test('migrate-self : un élève avec role=etablissement dans sa progression reste élève', async () => {
  USER = { id: 7, role: 'eleve' }; PROGRESS = { role: 'etablissement', classes: [{ name: 'X', students: [{ username: 'victime' }] }] }; CALLS = [];
  const r = await call(classes, { action: 'migrate-self', token: 't' });
  assert.equal(roleChanges().length, 0);
  assert.equal(r.body.role, 'eleve');
  assert.equal(r.body.migrated, 0);
  assert.equal(CALLS.some((c) => c.u.includes('/classes') && c.method === 'POST'), false);
});

test('migrate-self : un élève avec des classes dans sa progression reste élève', async () => {
  USER = { id: 7, role: 'eleve' }; PROGRESS = { classes: [{ name: 'X' }] }; CALLS = [];
  const r = await call(classes, { action: 'migrate-self', token: 't' });
  assert.equal(roleChanges().length, 0);
  assert.equal(r.body.role, 'eleve');
});

test('migrate-self : un vrai prof migre toujours ses anciennes classes', async () => {
  USER = { id: 9, role: 'prof' }; PROGRESS = { classes: [{ name: 'Ancienne', students: [] }] }; CALLS = [];
  const r = await call(classes, { action: 'migrate-self', token: 't' });
  assert.equal(r.body.role, 'prof');
  assert.ok(CALLS.some((c) => c.u.includes('/classes') && c.method === 'POST' && c.body.name === 'Ancienne'));
});
