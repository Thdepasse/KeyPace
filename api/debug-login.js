const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : null };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const username = req.query.u || 'theo';
  const r = await sb(`/users?username=eq.${encodeURIComponent(username)}&select=username,plan,password_hash,email_verified`);
  const user = r.data && r.data[0];

  if (!user) return res.json({ found: false });

  res.json({
    found: true,
    username: user.username,
    plan: user.plan,
    email_verified: user.email_verified,
    hash_stored: user.password_hash,
    hash_length: user.password_hash?.length,
    hash_expected: 'd0a042bff85d34c8ecba62999ccce4cf26733fe22b134b7b921aae1fceffe690',
    match: user.password_hash === 'd0a042bff85d34c8ecba62999ccce4cf26733fe22b134b7b921aae1fceffe690',
  });
};
