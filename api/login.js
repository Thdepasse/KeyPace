const { Resend } = require('resend');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || 'https://keypace.be';
const FROM_EMAIL = process.env.FROM_EMAIL || 'KeyPace <noreply@keypace.be>';

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

function resetEmail(username, resetUrl) {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{color-scheme:light only}body{background-color:#faf9f5!important}</style>
</head>
<body style="margin:0;padding:0;background-color:#faf9f5!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#16140F">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#faf9f5" style="background-color:#faf9f5!important;padding:36px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td align="center" style="padding-bottom:20px">
          <table cellpadding="0" cellspacing="0"><tr>
            <td bgcolor="#FF6B2B" style="background-color:#FF6B2B;border-radius:11px;width:36px;height:36px;text-align:center;vertical-align:middle">
              <span style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#fff">K</span>
            </td>
            <td style="padding-left:9px;font-size:19px;font-weight:800;color:#16140F;letter-spacing:-0.02em">KeyPace</td>
          </tr></table>
        </td></tr>
        <tr><td bgcolor="#ffffff" style="background-color:#fff;border:1px solid #E7E1D5;border-radius:22px;overflow:hidden">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td bgcolor="#FF6B2B" style="background-color:#FF6B2B;padding:28px 36px 24px;text-align:center">
              <p style="margin:0 0 8px;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.02em">Réinitialisation du mot de passe</p>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,.88)">Bonjour ${username}, clique sur le bouton ci-dessous.</p>
            </td></tr>
            <tr><td style="padding:32px 36px 24px;text-align:center">
              <p style="margin:0 0 20px;font-size:14px;color:#7A7365;line-height:1.6">Ce lien est valable <strong style="color:#16140F">1 heure</strong>. Si tu n'as pas demandé cette réinitialisation, ignore cet email.</p>
              <a href="${resetUrl}" style="display:inline-block;background-color:#FF6B2B;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:13px">Choisir un nouveau mot de passe</a>
            </td></tr>
            <tr><td bgcolor="#F8F5F0" style="background-color:#F8F5F0;border-top:1px solid #E7E1D5;padding:16px 36px;text-align:center">
              <p style="margin:0;font-size:12px;color:#8A8275;line-height:1.6">Lien : <a href="${resetUrl}" style="color:#FF6B2B;word-break:break-all;font-size:11px">${resetUrl}</a></p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body || {};

  // — Demande de réinitialisation de mot de passe
  if (body.action === 'reset-request') {
    const { token } = body;
    if (!token) return res.status(400).json({ error: 'Token de session manquant.' });

    const sessionR = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,username,email`);
    const user = sessionR.data && sessionR.data[0];
    if (!user) return res.status(401).json({ error: 'Session invalide.' });

    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await sb(`/users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ verification_token: resetToken, verification_expires_at: expiresAt }),
    });

    if (RESEND_API_KEY && user.email) {
      const resend = new Resend(RESEND_API_KEY);
      const resetUrl = `${APP_URL}?reset=${resetToken}`;
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: 'Réinitialisation de ton mot de passe KeyPace',
        html: resetEmail(user.username, resetUrl),
      });
    }

    return res.json({ ok: true });
  }

  // — Confirmation de réinitialisation (nouveau mot de passe)
  if (body.action === 'reset-confirm') {
    const { resetToken, newPasswordHash } = body;
    if (!resetToken || !newPasswordHash) return res.status(400).json({ error: 'Paramètres manquants.' });

    const r = await sb(`/users?verification_token=eq.${encodeURIComponent(resetToken)}&select=id,verification_expires_at`);
    const user = r.data && r.data[0];
    if (!user) return res.status(404).json({ error: 'Lien invalide ou déjà utilisé.' });

    if (new Date(user.verification_expires_at) < new Date())
      return res.status(410).json({ error: 'Ce lien a expiré. Fais une nouvelle demande.' });

    const newSession = require('crypto').randomUUID();
    await sb(`/users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        password_hash: newPasswordHash,
        verification_token: null,
        verification_expires_at: null,
        session_token: newSession,
      }),
    });

    // Récupérer les infos pour reconnecter l'utilisateur
    const userR = await sb(`/users?id=eq.${user.id}&select=id,username,plan`);
    const updated = userR.data && userR.data[0];
    const pr = await sb(`/progress?user_id=eq.${user.id}&select=data`);
    const progress = pr.data && pr.data[0];

    return res.json({ ok: true, id: updated.id, username: updated.username, plan: updated.plan, token: newSession, data: progress?.data || {} });
  }

  // — Connexion normale
  const { username, passwordHash } = body;
  if (!username || !passwordHash) return res.status(400).json({ error: 'Champs manquants.' });

  const r = await sb(`/users?username=eq.${encodeURIComponent(username)}&select=*`);
  const user = r.data && r.data[0];
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable.' });
  if (user.password_hash !== passwordHash) return res.status(401).json({ error: 'Mot de passe incorrect.' });
  if (user.verification_token) return res.status(403).json({ error: 'Confirme ton adresse email avant de te connecter. Vérifie ta boîte mail.', code: 'EMAIL_NOT_VERIFIED' });

  const token = require('crypto').randomUUID();
  await sb(`/users?id=eq.${user.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ session_token: token }),
  });

  const pr = await sb(`/progress?user_id=eq.${user.id}&select=data`);
  const progress = pr.data && pr.data[0];

  res.json({ id: user.id, username: user.username, plan: user.plan, role: user.role || 'eleve', token, data: progress?.data || {} });
};
