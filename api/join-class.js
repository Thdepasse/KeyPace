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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { studentToken, teacherUserId, classIdx, inviteToken, preview } = req.body || {};
  if (!studentToken || !teacherUserId || classIdx == null || !inviteToken)
    return res.status(400).json({ error: 'Paramètres manquants.' });

  // Identifier l'étudiant
  const studentR = await sb(`/users?session_token=eq.${encodeURIComponent(studentToken)}&select=id,username`);
  const student = studentR.data && studentR.data[0];
  if (!student) return res.status(401).json({ error: 'Non connecté.' });

  // Récupérer la progression du professeur
  const teacherProgressR = await sb(`/progress?user_id=eq.${encodeURIComponent(teacherUserId)}&select=data`);
  const teacherProgress = teacherProgressR.data && teacherProgressR.data[0];
  if (!teacherProgress) return res.status(404).json({ error: 'Établissement introuvable.' });

  const data = teacherProgress.data || {};
  const classes = data.classes || [];
  const cls = classes[classIdx];

  if (!cls) return res.status(404).json({ error: 'Classe introuvable.' });
  if (cls.inviteToken !== inviteToken) return res.status(403).json({ error: 'Lien d\'invitation invalide ou expiré.' });

  // Mode preview : juste vérifier et retourner le nom de la classe
  if (preview) return res.json({ className: cls.name });

  // Vérifier si déjà dans la classe
  const students = cls.students || [];
  if (students.find(s => s.username === student.username))
    return res.status(409).json({ error: 'Tu es déjà dans cette classe.' });

  // Ajouter l'étudiant
  students.push({ username: student.username, addedAt: Date.now(), wpm: null, acc: null, tests: null });
  classes[classIdx] = { ...cls, students };
  data.classes = classes;

  // Sauvegarder
  const update = await sb(`/progress?user_id=eq.${encodeURIComponent(teacherUserId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ data }),
  });
  if (!update.ok) return res.status(500).json({ error: 'Erreur lors de l\'inscription.' });

  res.json({ ok: true, className: cls.name });
};
