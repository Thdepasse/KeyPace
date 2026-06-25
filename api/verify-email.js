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

// Redirection robuste : ne dépend pas du helper res.redirect (absent selon le
// runtime, ce qui faisait planter la fonction en FUNCTION_INVOCATION_FAILED).
function redirect(res, url) {
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }

  try {
    const token = (req.query && req.query.token) || (new URL(req.url, `https://${req.headers.host}`).searchParams.get('token'));
    if (token === '__ping__') { res.statusCode = 200; res.setHeader('Content-Type', 'text/plain'); res.end('pong-v3'); return; }
    if (!token) return redirect(res, `${APP_URL}?verified=invalid`);

    const r = await sb(`/users?verification_token=eq.${encodeURIComponent(token)}&select=id,email_verified,verification_expires_at`);
    const user = r.data && r.data[0];

    if (!user) return redirect(res, `${APP_URL}?verified=invalid`);
    if (user.email_verified) return redirect(res, `${APP_URL}?verified=already`);
    // N'expire que si une date est réellement fixée (null => on n'expire pas).
    if (user.verification_expires_at && new Date(user.verification_expires_at) < new Date())
      return redirect(res, `${APP_URL}?verified=expired`);

    await sb(`/users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ email_verified: true, verification_token: null, verification_expires_at: null }),
    });

    return redirect(res, `${APP_URL}?verified=success`);
  } catch (e) {
    return redirect(res, `${APP_URL}?verified=error`);
  }
};
