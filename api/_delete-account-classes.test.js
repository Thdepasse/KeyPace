// Suppression d'un compte prof : ses classes d'établissement ne doivent plus disparaître avec lui
// (classes.teacher_id était en « on delete cascade » : classe, élèves et devoirs effacés).
// Lancer : node --test api/_delete-account-classes.test.js
process.env.SUPABASE_URL = 'http://db.test';
process.env.SUPABASE_SECRET_KEY = 'k';
delete process.env.RESEND_API_KEY;
const test = require('node:test');
const assert = require('node:assert');
const login = require('./login');
const { hashPassword } = require('./_auth');

let CLASSES, LINKS, ADMINS, DELETED, FAIL_PATCH;
const PW = 'a'.repeat(64);
const PROF = { id: 'p1', role: 'prof', institution_id: 'i1', password_hash: hashPassword(PW) };
global.fetch = async (url, opt = {}) => {
  const u = decodeURIComponent(String(url)); const m = (opt.method || 'GET').toUpperCase();
  const ok = (data) => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });
  if (u.includes('/user_sessions')) return { ok: false, status: 404, text: async () => '{}' };
  if (u.includes('session_token=eq.tok')) return ok([PROF]);
  if (u.includes('/classes?teacher_id=eq.p1')) return ok(CLASSES.filter((c) => c.teacher_id === 'p1' && c.institution_id));
  if (u.includes('/class_teachers?')) { const cid = u.match(/class_id=eq\.([^&]+)/)[1]; return ok((LINKS[cid] || []).filter((x) => x.teacher_id !== 'p1')); }
  if (u.includes('/users?institution_id=eq.i1&role=eq.admin')) return ok(ADMINS);
  if (u.includes('/classes?id=eq.') && m === 'PATCH') {
    if (FAIL_PATCH) return { ok: false, status: 500, text: async () => '{}' };
    const id = u.match(/id=eq\.([^&]+)/)[1]; Object.assign(CLASSES.find((c) => c.id === id), JSON.parse(opt.body)); return ok([]);
  }
  if (u.includes('/users?id=eq.p1') && m === 'DELETE') { DELETED = true; return ok([]); }
  return ok([]);
};
const call = async (body) => { let status = 200, out; const res = { status(c) { status = c; return res; }, json(o) { out = o; return res; }, setHeader() {}, end() { return res; } };
  await login({ method: 'POST', body, headers: {}, query: {} }, res); return { status, out }; };
const reset = () => {
  CLASSES = [{ id: 'C1', teacher_id: 'p1', institution_id: 'i1' }, { id: 'C2', teacher_id: 'p1', institution_id: 'i1' }, { id: 'C3', teacher_id: 'p1', institution_id: 'i1' }, { id: 'P', teacher_id: 'p1', institution_id: null }];
  LINKS = { C1: [{ teacher_id: 'p2', users: { id: 'p2', role: 'prof', archived: false } }], C2: [{ teacher_id: 'p3', users: { id: 'p3', role: 'prof', archived: true } }] };
  ADMINS = [{ id: 'a1' }]; DELETED = false; FAIL_PATCH = false;
};

test('les classes passent à un co-titulaire, sinon à l\'établissement, avant la suppression du compte', async () => {
  reset();
  const r = await call({ action: 'delete-me', token: 'tok', passwordHash: PW });
  assert.equal(r.status, 200); assert.equal(DELETED, true);
  assert.equal(CLASSES.find((c) => c.id === 'C1').teacher_id, 'p2', 'co-titulaire actif');
  assert.equal(CLASSES.find((c) => c.id === 'C2').teacher_id, 'a1', 'co-titulaire archivé : établissement');
  assert.equal(CLASSES.find((c) => c.id === 'C3').teacher_id, 'a1');
  assert.equal(CLASSES.find((c) => c.id === 'P').teacher_id, 'p1', 'classe hors établissement : inchangée');
});

test('sans personne pour reprendre la classe : elle reste, sans titulaire', async () => {
  reset(); ADMINS = [];
  await call({ action: 'delete-me', token: 'tok', passwordHash: PW });
  assert.equal(CLASSES.find((c) => c.id === 'C3').teacher_id, null);
});

test('si les classes ne peuvent pas être confiées, le compte n\'est pas supprimé', async () => {
  reset(); FAIL_PATCH = true;
  const r = await call({ action: 'delete-me', token: 'tok', passwordHash: PW });
  assert.equal(r.status, 500); assert.equal(DELETED, false);
});
