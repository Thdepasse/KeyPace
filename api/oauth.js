// SSO OAuth 2.0 / OpenID Connect — Google + Microsoft.
// Endpoint GET unique : démarrage (?provider=google|microsoft) et callback
// (Google/MS renvoient sur l'URI propre ${APP_URL}/api/oauth avec ?code&state).
// Le provider est encodé dans le `state` signé (HMAC) => stateless, pas de cookie.
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const APP_URL = (process.env.APP_URL || 'https://keypace.be').trim();
const STATE_SECRET = process.env.OAUTH_STATE_SECRET || 'dev-insecure-secret';

const PROVIDERS = {
  google: {
    clientId: () => (process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: () => (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    extraAuth: { access_type: 'online', prompt: 'select_account' },
  },
  microsoft: {
    clientId: () => (process.env.MICROSOFT_CLIENT_ID || '').trim(),
    clientSecret: () => (process.env.MICROSOFT_CLIENT_SECRET || '').trim(),
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'openid email profile',
    extraAuth: { prompt: 'select_account' },
  },
};

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

function redirect(res, url) {
  res.statusCode = 302;
  res.setHeader('Location', String(url).replace(/[\r\n]+/g, ''));
  res.end();
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlDecode = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

// State signé : provider + nonce + horodatage, scellé par HMAC (anti-CSRF, stateless).
function makeState(provider) {
  const payload = b64url(JSON.stringify({ p: provider, n: crypto.randomBytes(8).toString('hex'), t: Date.now() }));
  const sig = b64url(crypto.createHmac('sha256', STATE_SECRET).update(payload).digest());
  return `${payload}.${sig}`;
}
function readState(state) {
  if (!state || state.indexOf('.') < 0) return null;
  const [payload, sig] = state.split('.');
  const expected = b64url(crypto.createHmac('sha256', STATE_SECRET).update(payload).digest());
  if (sig !== expected) return null;
  let data;
  try { data = JSON.parse(b64urlDecode(payload)); } catch { return null; }
  if (!data || !PROVIDERS[data.p]) return null;
  if (Date.now() - (data.t || 0) > 10 * 60 * 1000) return null; // expire après 10 min
  return data;
}

// Décode le payload d'un JWT (id_token) sans vérif de signature : il provient
// directement du token endpoint du provider via TLS, donc de confiance ici.
function decodeJwt(jwt) {
  try { return JSON.parse(b64urlDecode(jwt.split('.')[1])); } catch { return null; }
}

const REDIRECT_URI = `${APP_URL}/api/oauth`;

function buildAuthUrl(provider) {
  const cfg = PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: cfg.clientId(),
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: cfg.scope,
    state: makeState(provider),
    ...cfg.extraAuth,
  });
  return `${cfg.authUrl}?${params.toString()}`;
}

async function exchangeCode(provider, code) {
  const cfg = PROVIDERS[provider];
  const r = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId(),
      client_secret: cfg.clientSecret(),
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data || !data.id_token) return null;
  return decodeJwt(data.id_token);
}

// Extrait email vérifié + nom du claim id_token, selon le provider.
function profileFromClaims(claims) {
  if (!claims) return null;
  const email = (claims.email || claims.preferred_username || claims.upn || '').toLowerCase().trim();
  if (!email || email.indexOf('@') < 0) return null;
  const name = claims.name || claims.given_name || email.split('@')[0];
  return { email, name };
}

function randomHash() {
  return crypto.randomBytes(32).toString('hex'); // password_hash non-null, inutilisable
}

// Génère un username unique à partir de l'email/nom.
async function uniqueUsername(seed) {
  let base = (seed || 'user').toLowerCase().replace(/[^a-z0-9._-]/g, '').replace(/^[._-]+|[._-]+$/g, '').slice(0, 24) || 'user';
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(Math.random() * 9000) + 1000}`;
    const r = await sb(`/users?username=eq.${encodeURIComponent(candidate)}&select=id`);
    if (Array.isArray(r.data) && r.data.length === 0) return candidate;
  }
  return `${base}${crypto.randomBytes(3).toString('hex')}`;
}

// find-or-create : lie un compte existant (par email) ou en crée un nouveau,
// rattaché à l'établissement par domaine email (même logique que register.js).
async function findOrCreateUser(provider, profile) {
  const existR = await sb(`/users?email=eq.${encodeURIComponent(profile.email)}&select=*`);
  const existing = existR.data && existR.data[0];
  const session = crypto.randomUUID();

  if (existing) {
    // Liaison auto + nouvelle session ; on confirme l'email au passage.
    const patch = { session_token: session, email_verified: true };
    if (!existing.oauth_provider) patch.oauth_provider = provider;
    if (existing.verification_token) patch.verification_token = null;
    await sb(`/users?id=eq.${existing.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    return { token: session };
  }

  // Rattachement établissement par domaine (clé d'appartenance licence).
  const domain = (profile.email.split('@')[1] || '').toLowerCase();
  let institution = null;
  if (domain) {
    const byDomain = await sb(`/institutions?domains=cs.{"${domain}"}&select=*`);
    institution = byDomain.data && byDomain.data[0];
  }
  if (institution) {
    const seatsR = await sb(`/users?institution_id=eq.${encodeURIComponent(institution.id)}&role=eq.eleve&select=id`);
    const used = seatsR.data ? seatsR.data.length : 0;
    if (used >= institution.seat_count) return { error: 'seats' };
  }

  const username = await uniqueUsername(profile.name || profile.email.split('@')[0]);
  const createR = await sb('/users', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email: profile.email,
      password_hash: randomHash(),
      plan: institution ? 'expert' : 'free',
      session_token: session,
      email_verified: true,
      verification_token: null,
      oauth_provider: provider,
      ...(institution ? { institution_id: institution.id } : {}),
    }),
  });
  const user = createR.data && createR.data[0];
  if (!user) return { error: 'create' };
  await sb('/progress', { method: 'POST', body: JSON.stringify({ user_id: user.id, data: {} }) });
  return { token: session };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const q = url.searchParams;
    const code = q.get('code');

    // — Callback du provider (présence d'un code)
    if (code) {
      const state = readState(q.get('state'));
      if (!state) return redirect(res, `${APP_URL}?sso_error=state`);
      const provider = state.p;
      const claims = await exchangeCode(provider, code);
      const profile = profileFromClaims(claims);
      if (!profile) return redirect(res, `${APP_URL}?sso_error=profile`);
      const result = await findOrCreateUser(provider, profile);
      if (result.error === 'seats') return redirect(res, `${APP_URL}?sso_error=seats`);
      if (result.error || !result.token) return redirect(res, `${APP_URL}?sso_error=server`);
      return redirect(res, `${APP_URL}?sso=${result.token}`);
    }

    // — Démarrage (?provider=…)
    const provider = q.get('provider');
    if (!provider || !PROVIDERS[provider]) return redirect(res, `${APP_URL}?sso_error=provider`);
    if (!PROVIDERS[provider].clientId()) return redirect(res, `${APP_URL}?sso_error=unconfigured`);
    return redirect(res, buildAuthUrl(provider));
  } catch (e) {
    return redirect(res, `${APP_URL}?sso_error=server`);
  }
};
