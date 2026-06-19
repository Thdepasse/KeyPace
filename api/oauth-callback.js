const crypto = require('crypto');

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

function parseCookies(req) {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) cookies[k.trim()] = v.join('=');
  });
  return cookies;
}

module.exports = async function handler(req, res) {
  const { code } = req.query;
  const cookies = parseCookies(req);
  const codeVerifier = cookies['kp_cv'];

  // Clear PKCE cookie immediately
  res.setHeader('Set-Cookie', 'kp_cv=; Path=/; HttpOnly; Max-Age=0');

  if (!code || !codeVerifier) {
    return res.redirect(302, `${APP_URL}/?oauth_error=missing_code`);
  }

  // Exchange code for Supabase Auth session
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
  });

  if (!tokenRes.ok) {
    console.error('OAuth token exchange failed:', await tokenRes.text());
    return res.redirect(302, `${APP_URL}/?oauth_error=token_exchange`);
  }

  const { user } = await tokenRes.json();
  if (!user?.email) {
    return res.redirect(302, `${APP_URL}/?oauth_error=no_email`);
  }

  const email = user.email;
  const provider = user.app_metadata?.provider || 'oauth';

  // Find existing user by email
  const existing = await sb(`/users?email=eq.${encodeURIComponent(email)}&select=*`);
  let dbUser = existing.data?.[0];

  const sessionToken = crypto.randomUUID();

  if (dbUser) {
    // Update session token
    await sb(`/users?id=eq.${dbUser.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ session_token: sessionToken }),
    });
    dbUser.plan = dbUser.plan || 'free';
  } else {
    // Derive a unique username from the email prefix
    const base = (email.split('@')[0] || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 18) || 'user';

    let username = base;
    for (let i = 0; i < 6; i++) {
      const check = await sb(`/users?username=eq.${encodeURIComponent(username)}&select=id`);
      if (!check.data?.length) break;
      username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const create = await sb('/users', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password_hash: crypto.randomUUID(), // placeholder — OAuth users sign in via provider
        plan: 'free',
        session_token: sessionToken,
        email_verified: true,
        oauth_provider: provider,
      }),
    });

    if (!create.ok) {
      console.error('OAuth user creation failed:', create.data);
      return res.redirect(302, `${APP_URL}/?oauth_error=user_creation`);
    }

    dbUser = create.data[0];

    await sb('/progress', {
      method: 'POST',
      body: JSON.stringify({ user_id: dbUser.id, data: {} }),
    });
  }

  const params = new URLSearchParams({
    oauth_token: sessionToken,
    oauth_user: dbUser.username,
    oauth_plan: dbUser.plan,
  });

  res.redirect(302, `${APP_URL}/?${params}`);
};
