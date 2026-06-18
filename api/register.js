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

  const { username, email, passwordHash } = req.body || {};
  if (!username || !passwordHash || !email) return res.status(400).json({ error: 'Champs manquants.' });

  const check = await sb(`/users?username=eq.${encodeURIComponent(username)}&select=id`);
  if (check.data && check.data.length > 0) return res.status(409).json({ error: 'Ce nom est déjà pris.' });

  const emailCheck = await sb(`/users?email=eq.${encodeURIComponent(email)}&select=id`);
  if (emailCheck.data && emailCheck.data.length > 0) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

  const token = require('crypto').randomUUID();

  const create = await sb('/users', {
    method: 'POST',
    body: JSON.stringify({ username, email, password_hash: passwordHash, plan: 'free', session_token: token }),
  });
  if (!create.ok) return res.status(500).json({ error: 'Erreur création compte.' });

  const user = create.data[0];

  await sb('/progress', {
    method: 'POST',
    body: JSON.stringify({ user_id: user.id, data: {} }),
  });

  res.json({ username: user.username, plan: user.plan, token, data: {} });
};
