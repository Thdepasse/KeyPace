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

  const { username, passwordHash } = req.body || {};
  if (!username || !passwordHash) return res.status(400).json({ error: 'Champs manquants.' });

  const r = await sb(`/users?username=eq.${encodeURIComponent(username)}&select=*`);
  const user = r.data && r.data[0];
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable.' });
  if (user.password_hash !== passwordHash) return res.status(401).json({ error: 'Mot de passe incorrect.' });
  if (user.verification_token) return res.status(403).json({ error: 'Confirme ton adresse email avant de te connecter. Vérifie ta boîte mail.', code: 'EMAIL_NOT_VERIFIED' });

  const token = require('crypto').randomUUID();
  await sb(`/users?id=eq.${user.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ session_token: token }),
  });

  const pr = await sb(`/progress?user_id=eq.${user.id}&select=data`);
  const progress = pr.data && pr.data[0];

  res.json({ username: user.username, plan: user.plan, token, data: progress?.data || {} });
};
