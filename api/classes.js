// Gère deux actions : join (rejoindre une classe) et stats (stats d'un élève)
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

async function handleJoin(req, res) {
  const { studentToken, teacherUserId, classIdx, inviteToken, preview } = req.body || {};
  if (!studentToken || !teacherUserId || classIdx == null || !inviteToken)
    return res.status(400).json({ error: 'Paramètres manquants.' });

  const studentR = await sb(`/users?session_token=eq.${encodeURIComponent(studentToken)}&select=id,username`);
  const student = studentR.data && studentR.data[0];
  if (!student) return res.status(401).json({ error: 'Non connecté.' });

  const teacherProgressR = await sb(`/progress?user_id=eq.${encodeURIComponent(teacherUserId)}&select=data`);
  const teacherProgress = teacherProgressR.data && teacherProgressR.data[0];
  if (!teacherProgress) return res.status(404).json({ error: 'Établissement introuvable.' });

  const data = teacherProgress.data || {};
  const classes = data.classes || [];
  const cls = classes[classIdx];
  if (!cls) return res.status(404).json({ error: 'Classe introuvable.' });
  if (cls.inviteToken !== inviteToken) return res.status(403).json({ error: "Lien d'invitation invalide ou expiré." });

  if (preview) return res.json({ className: cls.name });

  const students = cls.students || [];
  if (students.find(s => s.username === student.username))
    return res.status(409).json({ error: 'Tu es déjà dans cette classe.' });

  students.push({ username: student.username, addedAt: Date.now(), wpm: null, acc: null, tests: null });
  classes[classIdx] = { ...cls, students };
  data.classes = classes;

  const update = await sb(`/progress?user_id=eq.${encodeURIComponent(teacherUserId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ data }),
  });
  if (!update.ok) return res.status(500).json({ error: "Erreur lors de l'inscription." });

  res.json({ ok: true, className: cls.name });
}

async function handleStudentStats(req, res) {
  const { token, username } = req.body || {};
  if (!token || !username) return res.status(400).json({ error: 'Champs manquants.' });

  const callerR = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,plan`);
  const caller = callerR.data && callerR.data[0];
  if (!caller) return res.status(401).json({ error: 'Non autorisé.' });

  const callerProgress = await sb(`/progress?user_id=eq.${caller.id}&select=data`);
  const callerData = callerProgress.data && callerProgress.data[0] && callerProgress.data[0].data;
  if (!callerData || callerData.role !== 'etablissement')
    return res.status(403).json({ error: 'Accès réservé aux comptes établissement.' });

  const studentR = await sb(`/users?username=eq.${encodeURIComponent(username)}&select=id`);
  const student = studentR.data && studentR.data[0];
  if (!student) return res.status(404).json({ error: 'Élève introuvable.' });

  const progressR = await sb(`/progress?user_id=eq.${student.id}&select=data`);
  const data = progressR.data && progressR.data[0] && progressR.data[0].data;
  if (!data) return res.json({ wpm: null, acc: null, tests: 0 });

  const tests = data.tests || [];
  if (!tests.length) return res.json({ wpm: null, acc: null, tests: 0 });

  const slice = tests.slice(-10);
  const wpm = Math.round(slice.reduce((a, t) => a + (t.wpm || 0), 0) / slice.length);
  const acc = Math.round(slice.reduce((a, t) => a + (t.acc || 0), 0) / slice.length);
  res.json({ wpm, acc, tests: tests.length });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { action } = req.body || {};
  if (action === 'join') return handleJoin(req, res);
  if (action === 'stats') return handleStudentStats(req, res);
  return res.status(400).json({ error: 'Action inconnue.' });
};
