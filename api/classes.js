// API établissement (Phase 0) : routeur d'actions sur les tables classes/class_members.
// Tout passe par la clé service (RLS deny-anon). Logique pure dans _class-logic.
const { aggregateClass, detectAlerts, studentSummary, dailySeries, canActAsTeacher, canManageClass, canActAsAdmin, institutionProfSummary,
  essayTypeDef, sanitizeEssayContent, validateEssaySubmission, validateEssayBrief, essayWritingSignals, sanitizeEssayStats } = require('./_class-logic');
const { hashPassword } = require('./_auth');
const { setCorsOrigin } = require('./_cors');

const crypto = require('crypto');
function sha256hex(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
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
  const r = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&or=(session_expires_at.is.null,session_expires_at.gt.${new Date().toISOString()})&select=id,username,plan,role,institution_id,class_join_failed_attempts,class_join_locked_until`);
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

// Import CSV : jusqu'ici les élèves devaient s'inscrire un par un via lien
// (limite documentée dans la FAQ établissement : "sur notre roadmap"). Crée
// un compte par ligne + ajoute directement à la classe. Un mot de passe
// temporaire est généré par élève et renvoyé UNE SEULE FOIS dans la réponse
// (jamais stocké en clair, seul son hash scrypt l'est) — au prof de le
// communiquer. Même contrôle de sièges licenciés qu'une inscription normale.
async function bulkImportStudents(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const { cls, error, status } = await loadClassForManage(user, req.body.classId);
  if (error) return res.status(status).json({ error });

  const rows = Array.isArray(req.body.students) ? req.body.students.slice(0, 200) : [];
  if (!rows.length) return res.status(400).json({ error: 'Aucun élève à importer.' });

  let institution = null;
  if (user.institution_id) {
    const instR = await sb(`/institutions?id=eq.${user.institution_id}&select=*`);
    institution = instR.data && instR.data[0];
  }
  // Même garde que l'inscription normale (api/register.js) : une licence
  // expirée bloque tout nouveau rattachement, y compris par import CSV.
  if (institution && institution.license_expires_at && new Date(institution.license_expires_at) < new Date()) {
    return res.status(403).json({ error: "La licence de cet établissement a expiré. Contacte ton établissement pour la renouveler." });
  }
  let seatsUsed = 0;
  if (institution) {
    // archived=eq.false : un élève archivé libère son siège (même filtre que
    // le tableau de bord établissement, qui montre ce siège comme disponible).
    const seatsR = await sb(`/users?institution_id=eq.${user.institution_id}&role=eq.eleve&archived=eq.false&select=id`);
    seatsUsed = seatsR.data ? seatsR.data.length : 0;
  }

  // Normalise chaque ligne en mémoire, puis vérifie les doublons en un seul
  // aller-retour par colonne (au lieu d'un aller-retour par ligne) : sur un
  // import de 200 élèves, ça remplace ~800 requêtes séquentielles par 2.
  const normalized = rows.map((row) => ({
    rawUsername: row.username,
    username: String(row.username || '').trim().toLowerCase(),
    email: String(row.email || '').trim().toLowerCase() || null,
  }));
  const candidateUsernames = [...new Set(normalized.filter((n) => n.username).map((n) => n.username))];
  const candidateEmails = [...new Set(normalized.filter((n) => n.email).map((n) => n.email))];
  const [dupUR, dupER] = await Promise.all([
    candidateUsernames.length
      ? sb(`/users?username=in.(${candidateUsernames.map(encodeURIComponent).join(',')})&select=username`)
      : Promise.resolve({ data: [] }),
    candidateEmails.length
      ? sb(`/users?email=in.(${candidateEmails.map(encodeURIComponent).join(',')})&select=email`)
      : Promise.resolve({ data: [] }),
  ]);
  const takenUsernames = new Set((dupUR.data || []).map((u) => u.username));
  const takenEmails = new Set((dupER.data || []).map((u) => u.email));

  const results = [];
  const toCreate = [];
  const seenUsernames = new Set(), seenEmails = new Set();
  for (const n of normalized) {
    const { username, email } = n;
    if (!username) { results.push({ username: n.rawUsername || '(vide)', status: 'error', reason: "Nom d'utilisateur manquant." }); continue; }
    if (institution && seatsUsed + toCreate.length >= institution.seat_count) { results.push({ username, status: 'error', reason: 'Plus de places disponibles sur la licence.' }); continue; }
    if (takenUsernames.has(username) || seenUsernames.has(username)) { results.push({ username, status: 'skipped', reason: "Nom d'utilisateur déjà pris." }); continue; }
    if (email && (takenEmails.has(email) || seenEmails.has(email))) { results.push({ username, status: 'skipped', reason: 'Email déjà utilisé.' }); continue; }

    seenUsernames.add(username);
    if (email) seenEmails.add(email);
    // 8 caractères lisibles (même alphabet que les codes d'invitation).
    const tempPassword = genInviteCode().slice(0, 4) + genInviteCode().slice(0, 4);
    // Reproduit exactement ce que fait le client normalement (sha256 du mot de
    // passe) avant le re-hachage scrypt côté serveur — sinon le mot de passe
    // temporaire ne fonctionnerait pas au premier login (formulaire standard).
    const passwordHash = hashPassword(sha256hex(tempPassword));
    toCreate.push({ id: crypto.randomUUID(), username, email, tempPassword, passwordHash });
  }

  if (toCreate.length) {
    const createR = await sb('/users', {
      method: 'POST',
      body: JSON.stringify(toCreate.map((u) => ({
        id: u.id,
        username: u.username,
        ...(u.email ? { email: u.email } : {}),
        password_hash: u.passwordHash,
        plan: institution ? 'expert' : 'free',
        email_verified: true, // créé par l'enseignant, rien à confirmer (même base légale que le rattachement par domaine)
        // Mot de passe temporaire connu du prof qui l'a communiqué : on force
        // l'élève à en choisir un à lui dès sa première connexion.
        must_change_password: true,
        consent_at: new Date().toISOString(),
        terms_version: 'v1',
        ...(institution ? { institution_id: institution.id, role: 'eleve' } : {}),
      }))),
    });
    if (!createR.ok) {
      toCreate.forEach((u) => results.push({ username: u.username, status: 'error', reason: 'Erreur de création.' }));
    } else {
      await Promise.all([
        sb('/progress', { method: 'POST', body: JSON.stringify(toCreate.map((u) => ({ user_id: u.id, data: {} }))) }),
        sb('/class_members', { method: 'POST', body: JSON.stringify(toCreate.map((u) => ({ class_id: cls.id, student_id: u.id }))) }),
      ]);
      toCreate.forEach((u) => results.push({ username: u.username, status: 'created', tempPassword: u.tempPassword }));
    }
  }

  return res.json({ results });
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
  // Anti-bruteforce sur le code (même mécanique que le login : 5 échecs →
  // verrou temporaire) — un code fait 6 caractères sur un alphabet de 32,
  // ça reste devinable en boucle par un script sans cette limite.
  if (user.class_join_locked_until && new Date(user.class_join_locked_until) > new Date()) {
    return res.status(429).json({ error: 'Trop de tentatives de code invalide. Réessaie dans quelques minutes.' });
  }
  const code = (req.body.code || '').toUpperCase().trim();
  if (!code) return res.status(400).json({ error: 'Code requis.' });
  const r = await sb(`/classes?invite_code=eq.${encodeURIComponent(code)}&archived=eq.false&select=id,name,institution_id`);
  const cls = r.data && r.data[0];
  // Rejoindre une classe par code est réservé aux élèves rattachés à un
  // établissement, et uniquement pour une classe de CE même établissement —
  // sinon le code seul suffirait à faire entrer n'importe quel compte
  // KeyPace (même sans lien avec l'école) dans la classe et lui donner accès
  // aux devoirs. Les classes de profs indépendants (institution_id null) ne
  // sont donc plus rejoignables par code du tout — un prof indépendant qui
  // veut des élèves passe par l'import CSV, qui crée directement leur compte.
  const joinable = cls && cls.institution_id && cls.institution_id === user.institution_id;
  if (!joinable) {
    const attempts = (user.class_join_failed_attempts || 0) + 1;
    const patch = { class_join_failed_attempts: attempts };
    if (attempts >= 5) { patch.class_join_locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString(); patch.class_join_failed_attempts = 0; }
    await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    if (cls && !cls.institution_id) return res.status(403).json({ error: 'Cette classe ne fait pas partie d\'un établissement — elle ne peut pas être rejointe par code.' });
    if (cls) return res.status(403).json({ error: "Ce code appartient à une classe d'un autre établissement que le tien." });
    return res.status(404).json({ error: 'Code de classe invalide.' });
  }
  if (user.class_join_failed_attempts) await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ class_join_failed_attempts: 0 }) });
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
  const isEssay = req.body.mode === 'essay';
  const customText = isEssay ? null : ((req.body.customText || '').trim() || null);
  const mode = isEssay ? 'essay' : (customText ? (req.body.mode === 'vocal' ? 'vocal' : 'written') : null);
  // Une transcription garde son audio source ; les autres essais n'en ont pas.
  const audioUrl = ((mode === 'vocal' || (isEssay && req.body.essayType === 'transcription')) && req.body.audioUrl) ? req.body.audioUrl : null;
  // Consignes d'essai : validées à part (logique pure, testable).
  let essayCols = {};
  if (isEssay) {
    const ev = validateEssayBrief(req.body);
    if (!ev.ok) return res.status(400).json({ error: ev.error });
    essayCols = ev.value;
  }
  const row = {
    class_id: cls.id,
    lesson_id: req.body.lessonId || null,
    title,
    target_wpm: req.body.targetWpm ? parseInt(req.body.targetWpm, 10) : null,
    due_date: req.body.dueDate || null,
    custom_text: customText,
    mode,
    audio_url: audioUrl,
    ...essayCols,
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

  const instR = await sb(`/institutions?id=eq.${user.institution_id}&select=id,name,slug,seat_count,license_expires_at,created_at`);
  const institution = (instR.data && instR.data[0]) || null;

  // Sièges consommés = élèves rattachés (même règle que le contrôle à
  // l'inscription dans register.js) — invisible jusqu'ici dans le dashboard.
  const seatsUsedR = await sb(`/users?institution_id=eq.${user.institution_id}&role=eq.eleve&archived=eq.false&select=id`);
  const seatsUsed = Array.isArray(seatsUsedR.data) ? seatsUsedR.data.length : 0;

  const profsR = await sb(`/users?institution_id=eq.${user.institution_id}&role=eq.prof&archived=eq.false&select=id,username&order=username.asc`);
  const profs = Array.isArray(profsR.data) ? profsR.data : [];

  const clsR = await sb(`/classes?institution_id=eq.${user.institution_id}&archived=eq.false&select=id,name,teacher_id`);
  const classes = Array.isArray(clsR.data) ? clsR.data : [];

  const now = Date.now();
  const allData = [];
  const profEntries = [];
  // Vue "directeur" : contrairement à profs[] (agrégé par enseignant), ceci
  // détaille chaque classe individuellement pour repérer le décrochage
  // classe par classe, et remonte les alertes (détectAlerts, déjà utilisé
  // pour le dashboard d'un prof seul) à l'échelle de toute l'école, taguées
  // par classe + prof pour rester actionnables.
  const classBreakdown = [];
  const allAlerts = [];
  for (const p of profs) {
    const profClasses = classes.filter((c) => c.teacher_id === p.id);
    const studentsData = [];
    for (const c of profClasses) {
      const members = await membersOf(c.id);
      const pmap = await fetchProgressMap(members.map((m) => m.student_id));
      const classStudents = members.map((m) => ({ username: m.username, data: pmap[m.student_id] || {} }));
      classStudents.forEach((s) => { studentsData.push(s.data); allData.push(s.data); });
      const agg = aggregateClass(classStudents.map((s) => s.data), now);
      classBreakdown.push({ classId: c.id, className: c.name, profUsername: p.username, ...agg });
      const { inactive, stuck } = detectAlerts(classStudents, now);
      inactive.forEach((a) => allAlerts.push({ type: 'inactive', username: a.username, days: a.days, severity: a.days, className: c.name, profUsername: p.username }));
      stuck.forEach((a) => allAlerts.push({ type: 'stuck', username: a.username, sessions: a.sessions, severity: a.sessions, className: c.name, profUsername: p.username }));
    }
    profEntries.push({ profId: p.id, username: p.username, classCount: profClasses.length, studentsData });
  }
  // Classes les moins actives d'abord (les plus utiles à repérer), alertes
  // les plus sévères d'abord, plafonnées pour rester lisibles sur un dashboard.
  classBreakdown.sort((a, b) => a.activeThisWeek - b.activeThisWeek);
  allAlerts.sort((a, b) => b.severity - a.severity);

  return res.json({
    institution,
    seatsUsed,
    profs: institutionProfSummary(profEntries, now),
    global: aggregateClass(allData, now),
    series: dailySeries(allData, now),
    classes: classBreakdown,
    alerts: allAlerts.slice(0, 8),
    alertsTotal: allAlerts.length,
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
  // Borne de plausibilité (anti-forge) : au-delà, la valeur est rejetée.
  if (wpm > 250 || acc > 100 || gaze > 100) return res.status(400).json({ error: 'Valeurs de résultat invalides.', code: 'INVALID' });

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

// DÉSACTIVÉ (août 2026) — ancien lien d'invitation par classe (?join=teacherUserId_classIdx_inviteToken),
// modèle jsonb indexé par position dans un tableau, remplacé par le système
// de code de classe (`join-code`, invite_code en base). Plus aucun code du
// front ne génère ce type de lien ; l'action restait routable et exécutable
// par n'importe qui la connaissant, sans bénéfice — neutralisée comme
// legacyStudentStats ci-dessous plutôt que supprimée, au cas où un lien très
// ancien traînerait encore quelque part.
async function legacyJoin(req, res) {
  return res.status(410).json({ error: "Ce type de lien d'invitation n'est plus valide. Demande un nouveau code à ton professeur." });
}

// DÉSACTIVÉ (juil. 2026) — cette action de l'ancien modèle jsonb renvoyait les
// stats de n'importe quel utilisateur par son username, SANS vérifier son
// appartenance à la classe de l'appelant (fuite inter-établissement). Le suivi
// élève passe désormais par `student-detail`, correctement autorisé
// (loadClassForManage). L'action est neutralisée ; le client ne l'utilise plus.
async function legacyStudentStats(req, res) {
  return res.status(410).json({ error: 'Action dépréciée. Utilise le suivi de classe.' });
}

const AUDIO_BUCKET = 'dictation-audio';
const MAX_AUDIO_PER_TEACHER = 10;

async function audioUpload(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (!canActAsTeacher(user)) {
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

/* ── Essais : rendu élève + lecture prof ─────────────────────────
   Contrairement aux autres devoirs (booléen déduit de progress.data),
   un essai est stocké dans essay_submissions et relu par le prof. ── */

// Charge un devoir de type essai + sa classe, en vérifiant que l'élève y appartient.
async function loadEssayForStudent(user, assignmentId) {
  const aR = await sb(`/assignments?id=eq.${encodeURIComponent(assignmentId)}&select=*`);
  const a = aR.data && aR.data[0];
  if (!a) return { error: 'Devoir introuvable.', status: 404 };
  if (a.mode !== 'essay') return { error: 'Ce devoir n’est pas un essai.', status: 400 };
  const mR = await sb(`/class_members?class_id=eq.${encodeURIComponent(a.class_id)}&student_id=eq.${encodeURIComponent(user.id)}&select=id`);
  if (!mR.data || !mR.data[0]) return { error: 'Accès refusé.', status: 403 };
  return { a };
}

// Élève : dépose ou met à jour son essai.
async function essaySubmit(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const { a, error, status } = await loadEssayForStudent(user, req.body.assignmentId);
  if (error) return res.status(status).json({ error });

  const content = sanitizeEssayContent(a.essay_type, req.body.content);
  if (!content) return res.status(400).json({ error: 'Type d’essai inconnu.' });
  const v = validateEssaySubmission(a, content);
  if (!v.ok) return res.status(400).json({ error: v.error });

  const row = {
    assignment_id: a.id,
    student_id: user.id,
    content,
    word_count: v.words,
    keystroke_stats: sanitizeEssayStats(req.body.stats),
    updated_at: new Date().toISOString(),
  };
  // Upsert sur (assignment_id, student_id) : l'élève peut corriger son rendu.
  const r = await sb('/essay_submissions', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(row),
  });
  if (!r.ok) return res.status(500).json({ error: 'Enregistrement impossible.' });

  // Marque le devoir comme fait dans progress.data (cohérent avec assignmentDone).
  try {
    const pr = await sb(`/progress?user_id=eq.${encodeURIComponent(user.id)}&select=data`);
    const data = (pr.data && pr.data[0] && pr.data[0].data) || {};
    data.assignmentsDone = data.assignmentsDone || {};
    data.assignmentsDone[a.id] = { t: Date.now(), essay: true, words: v.words };
    await sb(`/progress?user_id=eq.${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
    });
  } catch { /* le rendu est enregistré : ne pas échouer sur le marqueur */ }

  return res.json({ ok: true, words: v.words });
}

// Élève : relit son propre rendu (pour reprendre sa copie).
async function essayMine(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  const { a, error, status } = await loadEssayForStudent(user, req.body.assignmentId);
  if (error) return res.status(status).json({ error });
  const sR = await sb(`/essay_submissions?assignment_id=eq.${a.id}&student_id=eq.${encodeURIComponent(user.id)}&select=content,word_count,updated_at`);
  const s = sR.data && sR.data[0];
  return res.json({
    assignment: {
      id: a.id, title: a.title, essayType: a.essay_type, essayBrief: a.essay_brief,
      minWords: a.min_words, maxWords: a.max_words, dueDate: a.due_date, audioUrl: a.audio_url || null,
    },
    submission: s ? { content: s.content || {}, words: s.word_count, updatedAt: s.updated_at } : null,
  });
}

// Prof : liste les copies rendues d'un essai (sans le texte intégral).
async function essayList(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (!canActAsTeacher(user)) return res.status(403).json({ error: 'Réservé aux comptes enseignant.' });
  const aR = await sb(`/assignments?id=eq.${encodeURIComponent(req.body.assignmentId)}&select=*`);
  const a = aR.data && aR.data[0];
  if (!a) return res.status(404).json({ error: 'Devoir introuvable.' });
  const { cls, error, status } = await loadClassForManage(user, a.class_id);
  if (error) return res.status(status).json({ error });

  const members = await membersOf(cls.id);
  const sR = await sb(`/essay_submissions?assignment_id=eq.${a.id}&select=student_id,word_count,keystroke_stats,updated_at`);
  const subs = {};
  (sR.data || []).forEach((s) => { subs[s.student_id] = s; });
  const pmap = await fetchProgressMap(members.map((m) => m.student_id));
  const now = Date.now();

  const rows = members.map((m) => {
    const s = subs[m.student_id];
    if (!s) return { studentId: m.student_id, username: m.username, submitted: false };
    const baseline = studentSummary(pmap[m.student_id] || {}, now).avgWpm;
    const sig = essayWritingSignals(s.keystroke_stats, s.word_count, { baselineWpm: baseline });
    return {
      studentId: m.student_id, username: m.username, submitted: true,
      words: s.word_count, updatedAt: s.updated_at,
      suspicion: sig.suspicion, flags: sig.flags,
    };
  });
  rows.sort((x, y) => Number(y.submitted) - Number(x.submitted) || x.username.localeCompare(y.username));

  return res.json({
    assignment: {
      id: a.id, title: a.title, essayType: a.essay_type, essayBrief: a.essay_brief,
      minWords: a.min_words, maxWords: a.max_words, dueDate: a.due_date,
    },
    total: members.length,
    submittedCount: rows.filter((r) => r.submitted).length,
    rows,
  });
}

// Prof : lit une copie complète + ses signaux d'écriture.
async function essayDetail(req, res) {
  const user = await userFromToken(req.body.token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (!canActAsTeacher(user)) return res.status(403).json({ error: 'Réservé aux comptes enseignant.' });
  const aR = await sb(`/assignments?id=eq.${encodeURIComponent(req.body.assignmentId)}&select=*`);
  const a = aR.data && aR.data[0];
  if (!a) return res.status(404).json({ error: 'Devoir introuvable.' });
  const { error, status } = await loadClassForManage(user, a.class_id);
  if (error) return res.status(status).json({ error });

  const sR = await sb(`/essay_submissions?assignment_id=eq.${a.id}&student_id=eq.${encodeURIComponent(req.body.studentId)}&select=*,users(username)`);
  const s = sR.data && sR.data[0];
  if (!s) return res.status(404).json({ error: 'Aucun rendu de cet élève.' });

  const pmap = await fetchProgressMap([s.student_id]);
  const baseline = studentSummary(pmap[s.student_id] || {}, Date.now()).avgWpm;
  const sig = essayWritingSignals(s.keystroke_stats, s.word_count, { baselineWpm: baseline });
  const def = essayTypeDef(a.essay_type);

  return res.json({
    assignment: {
      id: a.id, title: a.title, essayType: a.essay_type, essayBrief: a.essay_brief,
      minWords: a.min_words, maxWords: a.max_words,
    },
    fields: def ? def.fields.map((f) => ({ key: f.key, label: f.label, multiline: f.multiline })) : [],
    submission: {
      studentId: s.student_id,
      username: s.users ? s.users.username : '?',
      content: s.content || {},
      words: s.word_count,
      submittedAt: s.submitted_at,
      updatedAt: s.updated_at,
    },
    signals: sig,
    baselineWpm: baseline,
  });
}

module.exports = async function handler(req, res) {
  setCorsOrigin(req, res);
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
      case 'bulk-import-students': return await bulkImportStudents(req, res);
      case 'student-detail': return await studentDetail(req, res);
      case 'join-code': return await joinByCode(req, res);
      case 'my-classes': return await myClasses(req, res);
      case 'assignment-create': return await assignmentCreate(req, res);
      case 'assignment-list': return await assignmentList(req, res);
      case 'assignment-delete': return await assignmentDelete(req, res);
      case 'my-assignments': return await myAssignments(req, res);
      case 'audio-upload': return await audioUpload(req, res);
      // essais
      case 'essay-submit': return await essaySubmit(req, res);
      case 'essay-mine': return await essayMine(req, res);
      case 'essay-list': return await essayList(req, res);
      case 'essay-detail': return await essayDetail(req, res);
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
    console.error('classes handler error [action=' + action + ']:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
