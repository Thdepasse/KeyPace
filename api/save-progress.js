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

  const { token, data } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token manquant.' });

  const r = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id`);
  const user = r.data && r.data[0];
  if (!user) return res.status(401).json({ error: 'Session invalide.' });

  // Pas de `data` => lecture : on renvoie la progression enregistrée (utilisé au chargement)
  if (data === undefined || data === null) {
    const pr = await sb(`/progress?user_id=eq.${user.id}&select=data`);
    const row = pr.data && pr.data[0];
    return res.json({ ok: true, id: user.id, data: (row && row.data) || {} });
  }

  // Sinon => écriture en upsert (insère la ligne si elle n'existe pas encore)
  await sb(`/progress?on_conflict=user_id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: user.id, data, updated_at: new Date().toISOString() }),
  });

  res.json({ ok: true });
};
