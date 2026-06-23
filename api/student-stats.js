const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

async function sb(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
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

  const { token, username } = req.body || {};
  if (!token || !username) return res.status(400).json({ error: 'Champs manquants.' });

  // Vérifier que le demandeur est un compte établissement
  const callerR = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,plan`);
  const caller = callerR.data && callerR.data[0];
  if (!caller) return res.status(401).json({ error: 'Non autorisé.' });

  const callerProgress = await sb(`/progress?user_id=eq.${caller.id}&select=data`);
  const callerData = callerProgress.data && callerProgress.data[0] && callerProgress.data[0].data;
  if (!callerData || callerData.role !== 'etablissement')
    return res.status(403).json({ error: 'Accès réservé aux comptes établissement.' });

  // Trouver l'élève
  const studentR = await sb(`/users?username=eq.${encodeURIComponent(username)}&select=id`);
  const student = studentR.data && studentR.data[0];
  if (!student) return res.status(404).json({ error: 'Élève introuvable.' });

  const progressR = await sb(`/progress?user_id=eq.${student.id}&select=data`);
  const data = progressR.data && progressR.data[0] && progressR.data[0].data;
  if (!data) return res.json({ wpm: null, acc: null, tests: 0 });

  const tests = data.tests || [];
  if (!tests.length) return res.json({ wpm: null, acc: null, tests: 0 });

  const wpm = Math.round(tests.slice(-10).reduce((a, t) => a + (t.wpm || 0), 0) / Math.min(tests.length, 10));
  const acc = Math.round(tests.slice(-10).reduce((a, t) => a + (t.acc || 0), 0) / Math.min(tests.length, 10));

  res.json({ wpm, acc, tests: tests.length });
};
