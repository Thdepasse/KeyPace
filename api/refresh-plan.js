const { setCorsOrigin } = require('./_cors');
const sessions = require('./_sessions');
const { effectivePlan } = require('./_module-gate');
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
  setCorsOrigin(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token manquant.' });

  const user = await sessions.userByToken(sb, token, 'plan,institution_id');
  if (!user) return res.status(401).json({ error: 'Session invalide.' });

  // Même règle que /api/login : licence d'établissement expirée → plus d'Expert.
  // Avant, user.plan brut redonnait Expert côté client jusqu'à la reconnexion.
  res.json({ plan: await effectivePlan(user) });
};
