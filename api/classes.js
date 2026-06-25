// API établissement (Phase 0) : routeur d'actions sur les tables classes/class_members.
// Tout passe par la clé service (RLS deny-anon). Logique pure dans _class-logic.
const { aggregateClass, detectAlerts, studentSummary, dailySeries, canActAsTeacher, canManageClass, canActAsAdmin, institutionProfSummary } = require('./_class-logic');

const crypto = require('crypto');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
// Secret de signature des certificats (réutilise le secret OAuth déjà en place).
const CERT_SECRET = process.env.OAUTH_STATE_SECRET || process.env.SUPABASE_SECRET_KEY || 'dev-cert';
const CERT_MIN_WPM = 20, CERT_MIN_ACC = 90, CERT_MIN_GAZE = 90;

function levelFor(wpm) {
  if (wpm >= 55) return 'Expert';
  if (wpm >= 40) return 'Avancé';
  if (wpm >= 25) return 'Intermédiaire';
  return 'Débutant';
}
function certSign(o) {
  const payload = `cert|${o.code}|${o.userId}|${o.w || ''}|${o.v || ''}|${o.name}`;
  return crypto.createHmac('sha256', CERT_SECRET).update(payload).digest('hex').slice(0, 32);
}
function certPublic(c) {
  return {
    code: c.code, fullName: c.full_name, level: c.level,
    writtenWpm: c.written_wpm, vocalWpm: c.vocal_wpm,
    writtenGaze: c.written_gaze, vocalGaze: c.vocal_gaze,
    issuedAt: c.issued_at, updatedAt: c.updated_at,
  };
}

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

/* ── Cockpit : construit l'aperçu (classes + agrégats + alertes + courbe) pour
   un ensemble de classes donné. Réutilisé par le cockpit prof et la vue prof
   côté établissement. ── */
async function buildOverview(classes, now) {
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
  return { classes: out, global: aggregateClass(allData, now), series: dailySeries(allData, now) };
}

/* ── Cockpit : toutes les classes du prof (ou de l'établissement) + agrégats ── */
async function teacherOverview(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (!canActAsTeacher(user)) return res.status(403).json({ error: 'Réservé aux comptes enseignant.' });

  const filter = user.role === 'admin' && user.institution_id
    ? `institution_id=eq.${user.institution_id}`
    : `teacher_id=eq.${user.id}`;
  const clsR = await sb(`/classes?${filter}&archived=eq.false&select=*&order=created_at.asc`);
  if (!clsR.ok || !Array.isArray(clsR.data)) throw new Error('classes ' + clsR.status + ': ' + JSON.stringify(clsR.data));

  return res.json(await buildOverview(clsR.data, Date.now()));
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
  // Texte personnalisé : fait dès que l'élève a complété CE devoir (clé = id), avec
  // l'objectif vitesse atteint le cas échéant.
  if (a.custom_text) {
    const rec = (d.assignmentsDone || {})[a.id];
    if (!rec) return false;
    if (a.target_wpm) return (rec.wpm || 0) >= a.target_wpm;
    return true;
  }
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
  const customText = (req.body.customText || '').trim() || null;
  const mode = customText ? (req.body.mode === 'vocal' ? 'vocal' : 'written') : null;
  const audioUrl = (mode === 'vocal' && req.body.audioUrl) ? req.body.audioUrl : null;
  const row = {
    class_id: cls.id,
    lesson_id: req.body.lessonId || null,
    title,
    target_wpm: req.body.targetWpm ? parseInt(req.body.targetWpm, 10) : null,
    due_date: req.body.dueDate || null,
    custom_text: customText,
    mode,
    audio_url: audioUrl,
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
    customText: a.custom_text || null,
    mode: a.mode || null,
    audioUrl: a.audio_url || null,
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
  // Supprimer l'audio du storage si présent
  if (a.audio_url) {
    const match = a.audio_url.match(/dictation-audio\/(.+)$/);
    if (match) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/dictation-audio/${match[1]}`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      }).catch(() => {});
    }
  }
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
    customText: a.custom_text || null,
    mode: a.mode || null,
    audioUrl: a.audio_url || null,
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

/* ────────────────────────────────────────────────────────────────
   Phase 3 : compte établissement (role 'admin').
   Gère ses profs et voit ses élèves déclinés par professeur.
   ──────────────────────────────────────────────────────────────── */

// Charge l'admin depuis le token et vérifie le rôle établissement.
async function adminFromToken(token) {
  const user = await userFromToken(token);
  if (!user) return { error: 'Session invalide.', status: 401 };
  if (!canActAsAdmin(user)) return { error: 'Réservé aux comptes établissement.', status: 403 };
  return { user };
}

// Vue d'ensemble établissement : infos institution + résumé par prof + agrégat global.
async function adminOverview(req, res) {
  const { user, error, status } = await adminFromToken(req.body.token);
  if (error) return res.status(status).json({ error });

  const instR = await sb(`/institutions?id=eq.${user.institution_id}&select=id,name,slug,seat_count`);
  const institution = (instR.data && instR.data[0]) || null;

  const profsR = await sb(`/users?institution_id=eq.${user.institution_id}&role=eq.prof&archived=eq.false&select=id,username&order=username.asc`);
  const profs = Array.isArray(profsR.data) ? profsR.data : [];

  const clsR = await sb(`/classes?institution_id=eq.${user.institution_id}&archived=eq.false&select=id,teacher_id`);
  const classes = Array.isArray(clsR.data) ? clsR.data : [];

  const now = Date.now();
  const allData = [];
  const profEntries = [];
  for (const p of profs) {
    const profClasses = classes.filter((c) => c.teacher_id === p.id);
    const studentsData = [];
    for (const c of profClasses) {
      const members = await membersOf(c.id);
      const pmap = await fetchProgressMap(members.map((m) => m.student_id));
      members.forEach((m) => { const d = pmap[m.student_id] || {}; studentsData.push(d); allData.push(d); });
    }
    profEntries.push({ profId: p.id, username: p.username, classCount: profClasses.length, studentsData });
  }

  return res.json({
    institution,
    profs: institutionProfSummary(profEntries, now),
    global: aggregateClass(allData, now),
    series: dailySeries(allData, now),
  });
}

// Détail d'un prof (ses classes + agrégats), pour l'établissement.
async function profDetail(req, res) {
  const { user, error, status } = await adminFromToken(req.body.token);
  if (error) return res.status(status).json({ error });
  const profId = req.body.profId;
  if (!profId) return res.status(400).json({ error: 'Professeur manquant.' });

  const pR = await sb(`/users?id=eq.${encodeURIComponent(profId)}&select=id,username,role,institution_id`);
  const prof = pR.data && pR.data[0];
  if (!prof || prof.institution_id !== user.institution_id) return res.status(404).json({ error: 'Professeur introuvable.' });

  const clsR = await sb(`/classes?teacher_id=eq.${encodeURIComponent(profId)}&archived=eq.false&select=*&order=created_at.asc`);
  const overview = await buildOverview(Array.isArray(clsR.data) ? clsR.data : [], Date.now());
  return res.json({ prof: { id: prof.id, username: prof.username }, ...overview });
}

// Crée une invitation enseignant (lien ?prof=TOKEN).
async function profInviteCreate(req, res) {
  const { user, error, status } = await adminFromToken(req.body.token);
  if (error) return res.status(status).json({ error });
  const email = (req.body.email || '').trim() || null;
  let created = null;
  for (let i = 0; i < 5; i++) {
    const token = genInviteCode() + genInviteCode(); // 12 caractères
    const r = await sb('/prof_invites', { method: 'POST', body: JSON.stringify({ institution_id: user.institution_id, email, token }) });
    if (r.ok && r.data && r.data[0]) { created = r.data[0]; break; }
  }
  if (!created) return res.status(500).json({ error: 'Création impossible.' });
  return res.json({ id: created.id, token: created.token, email: created.email });
}

// Liste les invitations en attente + les profs actifs de l'établissement.
async function profInviteList(req, res) {
  const { user, error, status } = await adminFromToken(req.body.token);
  if (error) return res.status(status).json({ error });

  const invR = await sb(`/prof_invites?institution_id=eq.${user.institution_id}&used_by=is.null&revoked=eq.false&select=id,token,email,created_at&order=created_at.desc`);
  const profsR = await sb(`/users?institution_id=eq.${user.institution_id}&role=eq.prof&archived=eq.false&select=id,username&order=username.asc`);
  return res.json({
    invites: Array.isArray(invR.data) ? invR.data : [],
    profs: Array.isArray(profsR.data) ? profsR.data : [],
  });
}

// Révoque une invitation enseignant non utilisée.
async function profInviteRevoke(req, res) {
  const { user, error, status } = await adminFromToken(req.body.token);
  if (error) return res.status(status).json({ error });
  const inviteId = req.body.inviteId;
  if (!inviteId) return res.status(400).json({ error: 'Invitation manquante.' });
  const iR = await sb(`/prof_invites?id=eq.${encodeURIComponent(inviteId)}&select=institution_id`);
  const inv = iR.data && iR.data[0];
  if (!inv || inv.institution_id !== user.institution_id) return res.status(404).json({ error: 'Invitation introuvable.' });
  await sb(`/prof_invites?id=eq.${encodeURIComponent(inviteId)}`, { method: 'PATCH', body: JSON.stringify({ revoked: true }) });
  return res.json({ ok: true });
}

// RGPD : supprime définitivement un élève de l'établissement (droit à l'effacement).
async function adminDeleteStudent(req, res) {
  const { user, error, status } = await adminFromToken(req.body.token);
  if (error) return res.status(status).json({ error });
  const studentId = req.body.studentId;
  if (!studentId) return res.status(400).json({ error: 'Élève manquant.' });
  const sR = await sb(`/users?id=eq.${encodeURIComponent(studentId)}&select=id,role,institution_id`);
  const student = sR.data && sR.data[0];
  if (!student || student.institution_id !== user.institution_id || student.role !== 'eleve')
    return res.status(404).json({ error: 'Élève introuvable.' });
  // FK on delete cascade : progress, class_members, scores sont nettoyés.
  await sb(`/users?id=eq.${encodeURIComponent(studentId)}`, { method: 'DELETE' });
  return res.json({ ok: true });
}

// Archive un prof : exclu des vues établissement, ses classes sont conservées.
async function profArchive(req, res) {
  const { user, error, status } = await adminFromToken(req.body.token);
  if (error) return res.status(status).json({ error });
  const profId = req.body.profId;
  if (!profId) return res.status(400).json({ error: 'Professeur manquant.' });
  const pR = await sb(`/users?id=eq.${encodeURIComponent(profId)}&select=id,institution_id,role`);
  const prof = pR.data && pR.data[0];
  if (!prof || prof.institution_id !== user.institution_id || prof.role !== 'prof') return res.status(404).json({ error: 'Professeur introuvable.' });
  await sb(`/users?id=eq.${encodeURIComponent(profId)}`, { method: 'PATCH', body: JSON.stringify({ archived: true }) });
  return res.json({ ok: true });
}

/* ────────────────────────────────────────────────────────────────
   Certificats de niveau (dactylographie). Émis et signés par le serveur,
   vérifiables publiquement par code/QR. 1 certificat par utilisateur.
   ──────────────────────────────────────────────────────────────── */

function genCertCode() {
  return 'KP-' + genInviteCode() + genInviteCode(); // ex. KP-AB12CD-EF34GH (sans le tiret interne)
}

// L'élève soumet le résultat d'un examen de certification (écrit ou dictée vocale).
async function certExamPass(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const mode = req.body.mode === 'vocal' ? 'vocal' : 'written';
  const wpm = parseInt(req.body.wpm, 10) || 0;
  const acc = parseInt(req.body.acc, 10) || 0;
  const gaze = parseInt(req.body.gazePct, 10) || 0;
  const fullName = (req.body.fullName || '').trim();
  if (!fullName) return res.status(400).json({ error: 'Nom complet requis.' });
  if (gaze < CERT_MIN_GAZE) return res.status(400).json({ error: `Regard sur l'écran insuffisant (${gaze}% < ${CERT_MIN_GAZE}%). Refais l'examen en gardant les yeux sur l'écran.`, code: 'GAZE' });
  if (acc < CERT_MIN_ACC) return res.status(400).json({ error: `Précision insuffisante (${acc}% < ${CERT_MIN_ACC}%).`, code: 'ACC' });
  if (wpm < CERT_MIN_WPM) return res.status(400).json({ error: `Vitesse insuffisante (${wpm} < ${CERT_MIN_WPM} mpm).`, code: 'WPM' });

  const exR = await sb(`/certificates?user_id=eq.${user.id}&select=*`);
  const ex = exR.data && exR.data[0];
  const f = {
    full_name: fullName,
    written_wpm: ex ? ex.written_wpm : null,
    vocal_wpm: ex ? ex.vocal_wpm : null,
    written_gaze: ex ? ex.written_gaze : null,
    vocal_gaze: ex ? ex.vocal_gaze : null,
  };
  if (mode === 'written') { f.written_wpm = wpm; f.written_gaze = gaze; }
  else { f.vocal_wpm = wpm; f.vocal_gaze = gaze; }
  const best = Math.max(f.written_wpm || 0, f.vocal_wpm || 0);
  const level = levelFor(best);
  const code = ex ? ex.code : genCertCode();
  const signature = certSign({ code, userId: user.id, w: f.written_wpm, v: f.vocal_wpm, name: fullName });

  if (ex) {
    await sb(`/certificates?id=eq.${ex.id}`, { method: 'PATCH', body: JSON.stringify({ ...f, level, signature, updated_at: new Date().toISOString() }) });
  } else {
    const ins = await sb('/certificates', { method: 'POST', body: JSON.stringify({ user_id: user.id, code, ...f, level, signature }) });
    if (!ins.ok || !ins.data || !ins.data[0]) return res.status(500).json({ error: 'Émission impossible.' });
  }
  const r2 = await sb(`/certificates?user_id=eq.${user.id}&select=*`);
  return res.json({ ok: true, certificate: certPublic((r2.data && r2.data[0]) || { code, full_name: fullName, level, ...f }) });
}

// Récupère le certificat de l'utilisateur connecté (pour la page Progrès).
async function certGet(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const r = await sb(`/certificates?user_id=eq.${user.id}&select=*`);
  const c = r.data && r.data[0];
  return res.json({ certificate: c ? certPublic(c) : null });
}

// Vérification PUBLIQUE d'un certificat par code (page ?cert=CODE / QR). Sans auth.
async function certVerify(req, res) {
  const code = (req.body.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Code manquant.' });
  const r = await sb(`/certificates?code=eq.${encodeURIComponent(code)}&select=*`);
  const c = r.data && r.data[0];
  if (!c) return res.status(404).json({ valid: false, error: 'Certificat introuvable.' });
  const expect = certSign({ code: c.code, userId: c.user_id, w: c.written_wpm, v: c.vocal_wpm, name: c.full_name });
  if (expect !== c.signature) return res.status(409).json({ valid: false, error: 'Signature invalide : ce certificat a été altéré.' });
  return res.json({ valid: true, certificate: certPublic(c) });
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

const AUDIO_BUCKET = 'dictation-audio';
const MAX_AUDIO_PER_TEACHER = 10;

async function audioUpload(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (user.role !== 'teacher' && user.plan !== 'expert') {
    return res.status(403).json({ error: 'Réservé aux comptes enseignant.' });
  }
  const { audioBase64, mimeType = 'audio/webm', prevPath } = req.body;
  if (!audioBase64) return res.status(400).json({ error: 'Audio manquant.' });

  // Limite : compter les devoirs actifs avec audio_url pour ce prof
  const clsR = await sb(`/classes?teacher_id=eq.${encodeURIComponent(user.id)}&archived=eq.false&select=id`);
  const classIds = Array.isArray(clsR.data) ? clsR.data.map(c => c.id) : [];
  if (classIds.length) {
    const aR = await sb(`/assignments?class_id=in.(${classIds.join(',')})&audio_url=not.is.null&select=id`);
    const count = Array.isArray(aR.data) ? aR.data.length : 0;
    if (count >= MAX_AUDIO_PER_TEACHER) {
      return res.status(429).json({ error: `Limite de ${MAX_AUDIO_PER_TEACHER} dictées audio atteinte. Supprime un devoir avec audio pour en créer un nouveau.` });
    }
  }

  // Supprimer l'ancien fichier si réenregistrement
  if (prevPath) {
    const safe = prevPath.replace(/[^a-zA-Z0-9/_.-]/g, '');
    if (/^[0-9a-f-]+\/\d+\.webm$/.test(safe)) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${AUDIO_BUCKET}/${safe}`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      }).catch(() => {});
    }
  }

  // Upload vers Supabase Storage
  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const fileName = `${user.id}/${Date.now()}.webm`;
  const upR = await fetch(`${SUPABASE_URL}/storage/v1/object/${AUDIO_BUCKET}/${fileName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': mimeType,
      'x-upsert': 'false',
    },
    body: audioBuffer,
  });
  if (!upR.ok) return res.status(500).json({ error: "Erreur lors de l'upload audio." });

  const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/${AUDIO_BUCKET}/${fileName}`;
  return res.json({ audioUrl, storagePath: fileName });
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
      case 'audio-upload': return await audioUpload(req, res);
      case 'migrate-self': return await migrateSelf(req, res);
      // établissement (role admin)
      case 'admin-overview': return await adminOverview(req, res);
      case 'prof-detail': return await profDetail(req, res);
      case 'prof-invite-create': return await profInviteCreate(req, res);
      case 'prof-invite-list': return await profInviteList(req, res);
      case 'prof-invite-revoke': return await profInviteRevoke(req, res);
      case 'prof-archive': return await profArchive(req, res);
      case 'admin-delete-student': return await adminDeleteStudent(req, res);
      // certificats
      case 'cert-exam-pass': return await certExamPass(req, res);
      case 'cert-get': return await certGet(req, res);
      case 'cert-verify': return await certVerify(req, res);
      // legacy (ancien modèle jsonb)
      case 'join': return await legacyJoin(req, res);
      case 'stats': return await legacyStudentStats(req, res);
      default: return res.status(400).json({ error: 'Action inconnue.' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
