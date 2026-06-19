const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const APP_URL = process.env.APP_URL || 'https://keypace.be';

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
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.query.token;
  if (!token) return res.redirect(`${APP_URL}?verified=invalid`);

  const r = await sb(`/users?verification_token=eq.${encodeURIComponent(token)}&select=id,email_verified,verification_expires_at`);
  const user = r.data && r.data[0];

  if (!user) return res.redirect(`${APP_URL}?verified=invalid`);
  if (user.email_verified) return res.redirect(`${APP_URL}?verified=already`);
  if (new Date(user.verification_expires_at) < new Date()) return res.redirect(`${APP_URL}?verified=expired`);

  await sb(`/users?id=eq.${user.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ email_verified: true, verification_token: null, verification_expires_at: null }),
  });

  res.redirect(`${APP_URL}?verified=success`);
};
