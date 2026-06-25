// API établissement (Phase 0) : routeur d'actions sur les tables classes/class_members.
// Tout passe par la clé service (RLS deny-anon). Logique pure dans _class-logic.
const { aggregateClass, detectAlerts, studentSummary, dailySeries, canActAsTeacher, canManageClass } = require('./_class-logic');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

async function sb(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : null };
}

async function userFromToken(token) {
  if (!token) return null;
  const r = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,username,plan,role,institution_id`);
  return (r.data && r.data[0]) || null;
}

function genInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

// Récupère les progress.data de plusieurs élèves en une requête.
async function fetchProgressMap(studentIds) {
  if (!studentIds.length) return {};
  const list = studentIds.map(encodeURIComponent).join(',');
  const r = await sb(`/progress?user_id=in.(${list})&select=user_id,data`);
  const map = {};
  (r.data || []).forEach((row) => { map[row.user_id] = row.data || {}; });
  return map;
}

async function membersOf(classId) {
  const r = await sb(`/class_members?class_id=eq.${encodeURIComponent(classId)}&select=student_id,joined_at,users(id,username)`);
  if (!r.ok || !Array.isArray(r.data)) throw new Error('membersOf ' + r.status + ': ' + JSON.stringify(r.data));
  return r.data.map((m) => ({ student_id: m.student_id, joined_at: m.joined_at, username: m.users ? m.users.username : '?' }));
}

/* ── Cockpit : toutes les classes du prof + agrégats + alertes, en un appel ── */
async function teacherOverview(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (!canActAsTeacher(user)) return res.status(403).json({ error: 'Réservé aux comptes enseignant.' });

  const filter = user.role === 'admin' && user.institution_id
    ? `institution_id=eq.${user.institution_id}`
    : `teacher_id=eq.${user.id}`;
  const clsR = await sb(`/classes?${filter}&archived=eq.false&select=*&order=created_at.asc`);
  if (!clsR.ok || !Array.isArray(clsR.data)) throw new Error('classes ' + clsR.status + ': ' + JSON.stringify(clsR.data));
  const classes = clsR.data;

  const now = Date.now();
  const allData = [];
  const out = [];
  for (const cls of classes) {
    const members = await membersOf(cls.id);
    const pmap = await fetchProgressMap(members.map((m) => m.student_id));
    const datas = members.map((m) => pmap[m.student_id] || {});
    allData.push(...datas);
    const agg = aggregateClass(datas, now);
    const alerts = detectAlerts(members.map((m) => ({ username: m.username, data: pmap[m.student_id] || {} })), now);
    out.push({ id: cls.id, name: cls.name, inviteCode: cls.invite_code, memberCount: members.length, agg, alerts });
  }

  return res.json({ classes: out, global: aggregateClass(allData, now), series: dailySeries(allData, now) });
}

async function classCreate(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (!canActAsTeacher(user)) return res.status(403).json({ error: 'Réservé aux comptes enseignant.' });
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Nom de classe requis.' });

  let created = null;
  for (let i = 0; i < 5; i++) {
    const r = await sb('/classes', {
      method: 'POST',
      body: JSON.stringify({ name, teacher_id: user.id, institution_id: user.institution_id || null, invite_code: genInviteCode() }),
    });
    if (r.ok && r.data && r.data[0]) { created = r.data[0]; break; }
  }
  if (!created) return res.status(500).json({ error: 'Création impossible.' });
  return res.json({ id: created.id, name: created.name, inviteCode: created.invite_code, memberCount: 0 });
}

async function loadClassForManage(user, classId) {
  const r = await sb(`/classes?id=eq.${encodeURIComponent(classId)}&select=*`);
  const cls = r.data && r.data[0];
  if (!cls) return { error: 'Classe introuvable.', status: 404 };
  if (!canManageClass(user, cls)) return { error: 'Accès refusé.', status: 403 };
  return { cls };
}

async function classRename(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Nom requis.' });
  const { cls, error, status } = await loadClassForManage(user, req.body.classId);
  if (error) return res.status(status).json({ error });
  await sb(`/classes?id=eq.${cls.id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
  return res.json({ ok: true });
}

async function classArchive(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const { cls, error, status } = await loadClassForManage(user, req.body.classId);
  if (error) return res.status(status).json({ error });
  await sb(`/classes?id=eq.${cls.id}`, { method: 'PATCH', body: JSON.stringify({ archived: true }) });
  return res.json({ ok: true });
}

async function classDetail(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const { cls, error, status } = await loadClassForManage(user, req.body.classId);
  if (error) return res.status(status).json({ error });
  const members = await membersOf(cls.id);
  const pmap = await fetchProgressMap(members.map((m) => m.student_id));
  const now = Date.now();
  const datas = members.map((m) => pmap[m.student_id] || {});
  const students = members.map((m, i) => ({ studentId: m.student_id, username: m.username, joinedAt: m.joined_at, ...studentSummary(datas[i], now) }));
  return res.json({ id: cls.id, name: cls.name, inviteCode: cls.invite_code, students, agg: aggregateClass(datas, now) });
}

/* ── Détail d'un élève (pour le prof qui gère la classe) ── */
async function studentDetail(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (!canActAsTeacher(user)) return res.status(403).json({ error: 'Réservé aux comptes enseignant.' });
  const { cls, error, status } = await loadClassForManage(user, req.body.classId);
  if (error) return res.status(status).json({ error });
  const studentId = req.body.studentId;
  if (!studentId) return res.status(400).json({ error: 'Élève manquant.' });
  const mem = await sb(`/class_members?class_id=eq.${cls.id}&student_id=eq.${encodeURIComponent(studentId)}&select=student_id,joined_at,users(username)`);
  const m = mem.data && mem.data[0];
  if (!m) return res.status(404).json({ error: 'Élève introuvable dans cette classe.' });
  const pr = await sb(`/progress?user_id=eq.${encodeURIComponent(studentId)}&select=data`);
  const data = (pr.data && pr.data[0] && pr.data[0].data) || {};
  const tests = Array.isArray(data.tests) ? data.tests : [];
  return res.json({
    username: m.users ? m.users.username : '?',
    joinedAt: m.joined_at,
    summary: studentSummary(data, Date.now()),
    history: tests.slice(-30),
    keyStats: data.keyStats || null,
  });
}

/* ── Élève : rejoindre une classe par code ── */
async function joinByCode(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Connecte-toi pour rejoindre une classe.' });
  const code = (req.body.code || '').toUpperCase().trim();
  if (!code) return res.status(400).json({ error: 'Code requis.' });
  const r = await sb(`/classes?invite_code=eq.${encodeURIComponent(code)}&archived=eq.false&select=id,name`);
  const cls = r.data && r.data[0];
  if (!cls) return res.status(404).json({ error: 'Code de classe invalide.' });
  if (req.body.preview) return res.json({ className: cls.name });

  const exists = await sb(`/class_members?class_id=eq.${cls.id}&student_id=eq.${user.id}&select=id`);
  if (!(exists.data && exists.data[0])) {
    await sb('/class_members', { method: 'POST', body: JSON.stringify({ class_id: cls.id, student_id: user.id }) });
  }
  return res.json({ ok: true, className: cls.name });
}

/* ── Élève : lister les classes que j'ai rejointes ── */
async function myClasses(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const r = await sb(`/class_members?student_id=eq.${encodeURIComponent(user.id)}&select=joined_at,classes(id,name,invite_code,archived)&order=joined_at.desc`);
  const rows = Array.isArray(r.data) ? r.data : [];
  const classes = rows
    .filter((m) => m.classes && !m.classes.archived)
    .map((m) => ({ id: m.classes.id, name: m.classes.name, inviteCode: m.classes.invite_code, joinedAt: m.joined_at }));
  return res.json({ classes });
}

/* ── Devoirs / exercices assignés ── */
// Un devoir est "fait" si l'élève a validé la leçon visée (et atteint l'objectif vitesse si fixé),
// ou, pour un test libre avec objectif, s'il a un test atteignant la vitesse demandée.
function assignmentDone(data, a) {
  const d = data || {};
  if (a.lesson_id) {
    const rec = (d.lessons || {})[a.lesson_id];
    if (!rec || !rec.cleared) return false;
    if (a.target_wpm) return (rec.bestWpm || 0) >= a.target_wpm;
    return true;
  }
  if (a.target_wpm) {
    return (Array.isArray(d.tests) ? d.tests : []).some((t) => (t.wpm || 0) >= a.target_wpm);
  }
  return false;
}

async function assignmentCreate(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (!canActAsTeacher(user)) return res.status(403).json({ error: 'Réservé aux comptes enseignant.' });
  const { cls, error, status } = await loadClassForManage(user, req.body.classId);
  if (error) return res.status(status).json({ error });
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Titre requis.' });
  const row = {
    class_id: cls.id,
    lesson_id: req.body.lessonId || null,
    title,
    target_wpm: req.body.targetWpm ? parseInt(req.body.targetWpm, 10) : null,
    due_date: req.body.dueDate || null,
  };
  const r = await sb('/assignments', { method: 'POST', body: JSON.stringify(row) });
  if (!r.ok || !r.data || !r.data[0]) return res.status(500).json({ error: 'Création impossible.' });
  return res.json({ id: r.data[0].id });
}

async function assignmentList(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const { cls, error, status } = await loadClassForManage(user, req.body.classId);
  if (error) return res.status(status).json({ error });
  const aR = await sb(`/assignments?class_id=eq.${cls.id}&select=*&order=created_at.desc`);
  const assignments = Array.isArray(aR.data) ? aR.data : [];
  const members = await membersOf(cls.id);
  const pmap = await fetchProgressMap(members.map((m) => m.student_id));
  const out = assignments.map((a) => ({
    id: a.id,
    lessonId: a.lesson_id,
    title: a.title,
    targetWpm: a.target_wpm,
    dueDate: a.due_date,
    createdAt: a.created_at,
    total: members.length,
    doneCount: members.filter((m) => assignmentDone(pmap[m.student_id] || {}, a)).length,
  }));
  return res.json({ assignments: out });
}

async function assignmentDelete(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const aR = await sb(`/assignments?id=eq.${encodeURIComponent(req.body.assignmentId)}&select=*`);
  const a = aR.data && aR.data[0];
  if (!a) return res.status(404).json({ error: 'Devoir introuvable.' });
  const { error, status } = await loadClassForManage(user, a.class_id);
  if (error) return res.status(status).json({ error });
  await sb(`/assignments?id=eq.${a.id}`, { method: 'DELETE' });
  return res.json({ ok: true });
}

async function myAssignments(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const memR = await sb(`/class_members?student_id=eq.${encodeURIComponent(user.id)}&select=class_id,classes(name)`);
  const mems = Array.isArray(memR.data) ? memR.data : [];
  const classMap = {};
  mems.forEach((m) => { classMap[m.class_id] = m.classes ? m.classes.name : ''; });
  const ids = Object.keys(classMap);
  if (!ids.length) return res.json({ assignments: [] });
  const aR = await sb(`/assignments?class_id=in.(${ids.join(',')})&select=*&order=created_at.desc`);
  const assignments = Array.isArray(aR.data) ? aR.data : [];
  const pr = await sb(`/progress?user_id=eq.${encodeURIComponent(user.id)}&select=data`);
  const data = (pr.data && pr.data[0] && pr.data[0].data) || {};
  const out = assignments.map((a) => ({
    id: a.id,
    classId: a.class_id,
    lessonId: a.lesson_id,
    title: a.title,
    targetWpm: a.target_wpm,
    dueDate: a.due_date,
    className: classMap[a.class_id] || '',
    done: assignmentDone(data, a),
  }));
  return res.json({ assignments: out });
}

/* ── Migration des classes jsonb (ancien modèle) vers les tables ── */
async function migrateSelf(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });

  const pr = await sb(`/progress?user_id=eq.${user.id}&select=data`);
  const data = (pr.data && pr.data[0] && pr.data[0].data) || {};
  const legacyClasses = Array.isArray(data.classes) ? data.classes : [];

  // Promeut en prof si l'ancien rôle jsonb l'indiquait (ou s'il a déjà des classes).
  if (user.role !== 'prof' && user.role !== 'admin' && (data.role === 'etablissement' || legacyClasses.length)) {
    await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ role: 'prof' }) });
    user.role = 'prof';
  }
  if (!canActAsTeacher(user)) return res.json({ migrated: 0, role: user.role });

  // Évite de re-migrer si des classes existent déjà en table pour ce prof.
  const existing = await sb(`/classes?teacher_id=eq.${user.id}&select=id`);
  if (existing.data && existing.data.length) return res.json({ migrated: 0, role: user.role, alreadyMigrated: true });

  let migrated = 0;
  for (const lc of legacyClasses) {
    const cr = await sb('/classes', {
      method: 'POST',
      body: JSON.stringify({ name: lc.name || 'Classe', teacher_id: user.id, institution_id: user.institution_id || null, invite_code: genInviteCode() }),
    });
    const cls = cr.data && cr.data[0];
    if (!cls) continue;
    migrated++;
    for (const st of lc.students || []) {
      if (!st.username) continue;
      const su = await sb(`/users?username=eq.${encodeURIComponent(st.username)}&select=id`);
      const sid = su.data && su.data[0] && su.data[0].id;
      if (sid) await sb('/class_members', { method: 'POST', body: JSON.stringify({ class_id: cls.id, student_id: sid }) });
    }
  }
  return res.json({ migrated, role: user.role });
}

/* ── Legacy (ancien modèle jsonb) — conservé tant que le front Phase 1 n'est pas livré ── */
async function legacyJoin(req, res) {
  const { studentToken, teacherUserId, classIdx, inviteToken, preview } = req.body || {};
  if (!studentToken || !teacherUserId || classIdx == null || !inviteToken) return res.status(400).json({ error: 'Paramètres manquants.' });
  const sR = await sb(`/users?session_token=eq.${encodeURIComponent(studentToken)}&select=id,username`);
  const student = sR.data && sR.data[0];
  if (!student) return res.status(401).json({ error: 'Non connecté.' });
  const tp = await sb(`/progress?user_id=eq.${encodeURIComponent(teacherUserId)}&select=data`);
  const tProg = tp.data && tp.data[0];
  if (!tProg) return res.status(404).json({ error: 'Établissement introuvable.' });
  const data = tProg.data || {};
  const classes = data.classes || [];
  const cls = classes[classIdx];
  if (!cls) return res.status(404).json({ error: 'Classe introuvable.' });
  if (cls.inviteToken !== inviteToken) return res.status(403).json({ error: "Lien d'invitation invalide ou expiré." });
  if (preview) return res.json({ className: cls.name });
  const students = cls.students || [];
  if (students.find((s) => s.username === student.username)) return res.status(409).json({ error: 'Tu es déjà dans cette classe.' });
  students.push({ username: student.username, addedAt: Date.now(), wpm: null, acc: null, tests: null });
  classes[classIdx] = { ...cls, students };
  data.classes = classes;
  const upd = await sb(`/progress?user_id=eq.${encodeURIComponent(teacherUserId)}`, { method: 'PATCH', body: JSON.stringify({ data }) });
  if (!upd.ok) return res.status(500).json({ error: "Erreur lors de l'inscription." });
  return res.json({ ok: true, className: cls.name });
}

async function legacyStudentStats(req, res) {
  const { token, username } = req.body || {};
  if (!token || !username) return res.status(400).json({ error: 'Champs manquants.' });
  const cR = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,plan`);
  const caller = cR.data && cR.data[0];
  if (!caller) return res.status(401).json({ error: 'Non autorisé.' });
  const cp = await sb(`/progress?user_id=eq.${caller.id}&select=data`);
  const cData = cp.data && cp.data[0] && cp.data[0].data;
  if (!cData || cData.role !== 'etablissement') return res.status(403).json({ error: 'Accès réservé aux comptes établissement.' });
  const sR = await sb(`/users?username=eq.${encodeURIComponent(username)}&select=id`);
  const student = sR.data && sR.data[0];
  if (!student) return res.status(404).json({ error: 'Élève introuvable.' });
  const pr = await sb(`/progress?user_id=eq.${student.id}&select=data`);
  const data = pr.data && pr.data[0] && pr.data[0].data;
  if (!data || !(data.tests || []).length) return res.json({ wpm: null, acc: null, tests: 0 });
  const slice = data.tests.slice(-10);
  const wpm = Math.round(slice.reduce((a, t) => a + (t.wpm || 0), 0) / slice.length);
  const acc = Math.round(slice.reduce((a, t) => a + (t.acc || 0), 0) / slice.length);
  return res.json({ wpm, acc, tests: data.tests.length });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const action = (req.body || {}).action;
  try {
    switch (action) {
      case 'teacher-overview': return await teacherOverview(req, res);
      case 'class-create': return await classCreate(req, res);
      case 'class-rename': return await classRename(req, res);
      case 'class-archive': return await classArchive(req, res);
      case 'class-detail': return await classDetail(req, res);
      case 'student-detail': return await studentDetail(req, res);
      case 'join-code': return await joinByCode(req, res);
      case 'my-classes': return await myClasses(req, res);
      case 'assignment-create': return await assignmentCreate(req, res);
      case 'assignment-list': return await assignmentList(req, res);
      case 'assignment-delete': return await assignmentDelete(req, res);
      case 'my-assignments': return await myAssignments(req, res);
      case 'migrate-self': return await migrateSelf(req, res);
      // legacy (ancien modèle jsonb)
      case 'join': return await legacyJoin(req, res);
      case 'stats': return await legacyStudentStats(req, res);
      default: return res.status(400).json({ error: 'Action inconnue.' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
