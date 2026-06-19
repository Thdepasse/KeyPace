const crypto = require('crypto');

const APP_URL = process.env.APP_URL || 'https://keypace.be';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const provider = req.query.provider;
  if (!['google', 'apple'].includes(provider)) {
    return res.status(400).send('Fournisseur invalide.');
  }

  // PKCE
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const params = new URLSearchParams({
    provider,
    redirect_to: `${APP_URL}/api/oauth-callback`,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    ...(provider === 'google' ? { access_type: 'offline' } : {}),
  });

  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?${params}`;

  res.setHeader(
    'Set-Cookie',
    `kp_cv=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  );
  res.redirect(302, authUrl);
};
