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

function confirmationEmail(username, verifyUrl) {
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Une dernière étape pour accéder à KeyPace</title>
  <style>
    :root { color-scheme: light only; }
    body { background-color: #faf9f5 !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#faf9f5 !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#16140F">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#faf9f5" style="background-color:#faf9f5 !important;padding:36px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding-bottom:20px">
            <table cellpadding="0" cellspacing="0"><tr>
              <td bgcolor="#FF6B2B" style="background-color:#FF6B2B;border-radius:11px;width:36px;height:36px;text-align:center;vertical-align:middle">
                <span style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#ffffff">K</span>
              </td>
              <td style="padding-left:9px;font-size:19px;font-weight:800;color:#16140F;letter-spacing:-0.02em">KeyPace</td>
            </tr></table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #E7E1D5;border-radius:22px;overflow:hidden">

            <!-- Hero warm orange -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#FF6B2B" style="background-color:#FF6B2B;padding:34px 36px 30px;text-align:center">
                  <p style="margin:0 0 10px;font-size:27px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2">Bienvenue, ${username} !</p>
                  <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.88);line-height:1.65">
                    Tu es à un clic de commencer ton apprentissage.<br>Confirme ton adresse email pour accéder à KeyPace.
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:32px 36px 24px;text-align:center">
                  <a href="${verifyUrl}" style="display:inline-block;background-color:#FF6B2B;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 36px;border-radius:13px">
                    ✓ &nbsp;Confirmer mon adresse email
                  </a>
                  <p style="margin:14px 0 0;font-size:13px;color:#A39C8D;line-height:1.5">
                    Ce lien est valable pendant <strong style="color:#7A7365">24 heures</strong>.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #F0EBE1"></td></tr></table>

            <!-- Features -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:24px 36px 28px">
                  <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#A39C8D;letter-spacing:.07em;text-transform:uppercase">Ce qui t'attend dès la confirmation</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:8px 0;border-bottom:1px solid #F4F1EA">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td bgcolor="#FFF3EE" style="background-color:#FFF3EE;border-radius:9px;width:34px;height:34px;text-align:center;vertical-align:middle;font-size:15px">⌨️</td>
                        <td style="padding-left:12px"><span style="font-size:14px;font-weight:700;color:#16140F">10 leçons gratuites</span><br><span style="font-size:13px;color:#7A7365">Position de base, rangée du haut, premiers mots réels</span></td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding:8px 0;border-bottom:1px solid #F4F1EA">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td bgcolor="#FFF3EE" style="background-color:#FFF3EE;border-radius:9px;width:34px;height:34px;text-align:center;vertical-align:middle;font-size:15px">⚡</td>
                        <td style="padding-left:12px"><span style="font-size:14px;font-weight:700;color:#16140F">Test de vitesse</span><br><span style="font-size:13px;color:#7A7365">Mesure tes mots par minute en temps réel</span></td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding:8px 0;border-bottom:1px solid #F4F1EA">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td bgcolor="#FFF3EE" style="background-color:#FFF3EE;border-radius:9px;width:34px;height:34px;text-align:center;vertical-align:middle;font-size:15px">🎮</td>
                        <td style="padding-left:12px"><span style="font-size:14px;font-weight:700;color:#16140F">Jeu Frappe-mots</span><br><span style="font-size:13px;color:#7A7365">Des mots tombent du ciel — tape-les avant qu'ils touchent le sol</span></td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding:8px 0">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td bgcolor="#FFF3EE" style="background-color:#FFF3EE;border-radius:9px;width:34px;height:34px;text-align:center;vertical-align:middle;font-size:15px">📊</td>
                        <td style="padding-left:12px"><span style="font-size:14px;font-weight:700;color:#16140F">Suivi de progression</span><br><span style="font-size:13px;color:#7A7365">Courbe de vitesse, série de jours, leçons validées</span></td>
                      </tr></table>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Fallback link -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#F8F5F0" style="background-color:#F8F5F0;border-top:1px solid #E7E1D5;padding:18px 36px;text-align:center">
                  <p style="margin:0;font-size:12px;color:#8A8275;line-height:1.6">
                    Si le bouton ne s'ouvre pas, copie ce lien :<br>
                    <a href="${verifyUrl}" style="color:#FF6B2B;word-break:break-all;font-size:11px">${verifyUrl}</a>
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 16px;text-align:center">
            <p style="margin:0;font-size:12px;color:#B5AE9F;line-height:1.7">
              Tu reçois cet email car un compte a été créé avec cette adresse sur
              <a href="${APP_URL}" style="color:#FF6B2B;text-decoration:none;font-weight:600">keypace.be</a>.<br>
              Si ce n'est pas toi, ignore ce message — aucune action n'est requise.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { username, email, passwordHash, institutionId, institutionPasswordHash } = req.body || {};
  if (!username || !passwordHash || !email) return res.status(400).json({ error: 'Champs manquants.' });

  const check = await sb(`/users?username=eq.${encodeURIComponent(username)}&select=id`);
  if (check.data && check.data.length > 0) return res.status(409).json({ error: 'Ce nom est déjà pris.' });

  const emailCheck = await sb(`/users?email=eq.${encodeURIComponent(email)}&select=id`);
  if (emailCheck.data && emailCheck.data.length > 0) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

  // Rattachement à un établissement.
  let institution = null;

  // 1) Par domaine de l'email institutionnel (clé d'appartenance, recommandé).
  const emailDomain = (email.split('@')[1] || '').toLowerCase();
  if (emailDomain) {
    const byDomain = await sb(`/institutions?domains=cs.{"${emailDomain}"}&select=*`);
    institution = byDomain.data && byDomain.data[0];
  }

  // 2) Sinon, ancien flux par mot de passe d'établissement (compat).
  if (!institution && institutionId) {
    if (!institutionPasswordHash)
      return res.status(400).json({ error: 'Mot de passe établissement manquant.' });
    const instR = await sb(`/institutions?id=eq.${encodeURIComponent(institutionId)}&select=*`);
    institution = instR.data && instR.data[0];
    if (!institution) return res.status(404).json({ error: 'Établissement introuvable.' });
    if (institution.password_hash !== institutionPasswordHash)
      return res.status(401).json({ error: 'Mot de passe établissement incorrect.' });
  }

  // Contrôle des places disponibles (quelle que soit la voie de rattachement).
  if (institution) {
    const seatsR = await sb(`/users?institution_id=eq.${encodeURIComponent(institution.id)}&select=id`);
    const usedSeats = seatsR.data ? seatsR.data.length : 0;
    if (usedSeats >= institution.seat_count)
      return res.status(403).json({ error: 'Plus de places disponibles pour cet établissement.' });
  }

  const token = require('crypto').randomUUID();
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const plan = institution ? 'expert' : 'free';

  const create = await sb('/users', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email,
      password_hash: passwordHash,
      plan,
      session_token: token,
      email_verified: false,
      verification_token: verificationToken,
      verification_expires_at: verificationExpiresAt,
      ...(institution ? { institution_id: institution.id } : {}),
    }),
  });
  if (!create.ok) return res.status(500).json({ error: 'Erreur création compte.' });

  const user = create.data[0];

  await sb('/progress', {
    method: 'POST',
    body: JSON.stringify({ user_id: user.id, data: {} }),
  });

  // Send confirmation email
  if (RESEND_API_KEY) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      const verifyUrl = `${APP_URL}/api/verify-email?token=${verificationToken}`;
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Une dernière étape pour accéder à KeyPace',
        html: confirmationEmail(username, verifyUrl),
      });
    } catch (e) {
      // Email failure is non-blocking — account is created, user just needs to resend
      console.error('Email send error:', e.message);
    }
  }

  res.json({
    id: user.id,
    username: user.username,
    plan: user.plan,
    token,
    data: {},
    emailPending: true,
  });
};
