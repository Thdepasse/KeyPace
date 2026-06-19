const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  if (!ADMIN_KEY || req.headers['x-admin-key'] !== ADMIN_KEY)
    return res.status(401).json({ error: 'Non autorisé.' });

  const { name, slug, passwordHash, seatCount } = req.body || {};
  if (!name || !slug || !passwordHash || !seatCount)
    return res.status(400).json({ error: 'Champs manquants (name, slug, passwordHash, seatCount).' });

  if (typeof seatCount !== 'number' || seatCount < 1)
    return res.status(400).json({ error: 'seatCount doit être un entier positif.' });

  const slugCheck = await sb(`/institutions?slug=eq.${encodeURIComponent(slug)}&select=id`);
  if (slugCheck.data && slugCheck.data.length > 0)
    return res.status(409).json({ error: 'Un établissement avec ce slug existe déjà.' });

  const create = await sb('/institutions', {
    method: 'POST',
    body: JSON.stringify({ name, slug, password_hash: passwordHash, seat_count: seatCount }),
  });
  if (!create.ok) return res.status(500).json({ error: 'Erreur création établissement.' });

  res.status(201).json(create.data[0]);
};
