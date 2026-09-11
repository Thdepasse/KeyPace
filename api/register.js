const { Resend } = require('resend');
const { hashPassword } = require('./_auth');
const { setCorsOrigin } = require('./_cors');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = (process.env.APP_URL || 'https://keypace.be').trim();
const FROM_EMAIL = process.env.FROM_EMAIL || 'KeyPace <noreply@keypace.be>';

// Postgres compare `username=eq.` de façon sensible à la casse : sans ça,
// "Theo" et "theo" passent tous les deux le contrôle de doublon et créent deux
// comptes distincts qui se ressemblent (confusion, usurpation de nom). ILIKE
// sans caractère générique fait un match exact insensible à la casse ; `%`,
// `_` et `\` doivent être échappés car ILIKE les traite comme des jokers.
function usernameEqFilter(name) {
  const escaped = String(name).replace(/[\\%_]/g, (c) => '\\' + c);
  return `username=ilike.${encodeURIComponent(escaped)}`;
}

// Le nom d'utilisateur n'est pas restreint à un jeu de caractères sûr à
// l'inscription (seul update-username, dans login.js, impose un charset) : il
// est interpolé tel quel dans du HTML servi directement au navigateur
// (simplePage, page vue par le parent) ou dans les emails — sans échappement,
// un nom contenant balises/scripts s'exécuterait dans le contexte de
// keypace.be pour quiconque ouvre ce lien.
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

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
                  <p style="margin:0 0 10px;font-size:27px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2">Bienvenue, ${escapeHtml(username)} !</p>
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

// Email envoyé au PARENT (pas à l'élève) pour confirmer son accord — RGPD
// mineurs de moins de 13 ans inscrits individuellement (hors établissement).
function parentConsentEmail(childUsername, confirmUrl) {
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Accord parental pour un compte KeyPace</title>
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

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#FF6B2B" style="background-color:#FF6B2B;padding:34px 36px 30px;text-align:center">
                  <p style="margin:0 0 10px;font-size:23px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.3">Accord d'un parent requis</p>
                  <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.88);line-height:1.65">
                    Un compte KeyPace (apprentissage de la dactylographie) a été créé avec ton adresse email pour <strong>${escapeHtml(childUsername)}</strong>, qui a indiqué avoir moins de 13 ans.
                  </p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:32px 36px 24px;text-align:center">
                  <p style="margin:0 0 20px;font-size:14px;color:#7A7365;line-height:1.7">
                    Le compte est déjà utilisable, mais la réglementation (RGPD) nous demande de recueillir ton accord en tant que responsable légal. Sans confirmation de ta part, le compte sera suspendu 30 jours après sa création.
                  </p>
                  <a href="${confirmUrl}" style="display:inline-block;background-color:#FF6B2B;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 36px;border-radius:13px">
                    ✓ &nbsp;Je confirme mon accord
                  </a>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #F0EBE1"></td></tr></table>

            <!-- Fallback link -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#F8F5F0" style="background-color:#F8F5F0;border-top:1px solid #E7E1D5;padding:18px 36px;text-align:center">
                  <p style="margin:0;font-size:12px;color:#8A8275;line-height:1.6">
                    Si le bouton ne s'ouvre pas, copie ce lien :<br>
                    <a href="${confirmUrl}" style="color:#FF6B2B;word-break:break-all;font-size:11px">${confirmUrl}</a>
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
              Tu reçois cet email car cette adresse a été indiquée comme contact parental lors de la création d'un compte sur
              <a href="${APP_URL}" style="color:#FF6B2B;text-decoration:none;font-weight:600">keypace.be</a>.<br>
              Si tu penses que ce n'est pas légitime, contacte-nous : <a href="mailto:contact@keypace.be" style="color:#FF6B2B">contact@keypace.be</a>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Petite page HTML autonome (le destinataire est un parent, pas un
// utilisateur connecté à l'app — inutile de le renvoyer vers la SPA).
function simplePage(res, status, title, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
  <style>body{margin:0;padding:48px 16px;background:#faf9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#16140F;text-align:center}
  .card{max-width:480px;margin:0 auto;background:#fff;border:1px solid #E7E1D5;border-radius:22px;padding:36px}
  h1{font-size:20px;margin:0 0 12px}p{font-size:15px;color:#7A7365;line-height:1.6;margin:0}</style></head>
  <body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`);
}

// Redirection robuste : ne dépend pas du helper res.redirect (absent selon le
// runtime, ce qui faisait planter la fonction en FUNCTION_INVOCATION_FAILED).
function redirect(res, url) {
  res.statusCode = 302;
  res.setHeader('Location', String(url).replace(/[\r\n]+/g, '')); // garde-fou en-tête valide
  res.end();
}

// Rattache un compte à un établissement d'après le domaine de son email,
// uniquement appelé une fois cet email réellement vérifié (preuve de
// possession de la boîte mail) — voir le commentaire dans le handler
// d'inscription sur pourquoi ce rattachement a été retiré de l'inscription
// elle-même. Ne fait rien si aucun établissement ne correspond, si sa licence
// est expirée, ou si son quota de places est déjà atteint.
async function attachByEmailDomain(userId, email) {
  const domain = (String(email || '').split('@')[1] || '').toLowerCase();
  if (!domain) return;
  const byDomain = await sb(`/institutions?domains=cs.{"${domain}"}&select=*`);
  const institution = byDomain.data && byDomain.data[0];
  if (!institution) return;
  if (institution.license_expires_at && new Date(institution.license_expires_at) < new Date()) return;
  const seatsR = await sb(`/users?institution_id=eq.${encodeURIComponent(institution.id)}&role=eq.eleve&select=id`);
  const usedSeats = seatsR.data ? seatsR.data.length : 0;
  if (usedSeats >= institution.seat_count) return;

  await sb(`/users?id=eq.${userId}`, { method: 'PATCH', body: JSON.stringify({ institution_id: institution.id, plan: 'expert' }) });

  // Re-contrôle après écriture (TOCTOU) : deux vérifications d'email
  // concurrentes pour le même établissement pourraient toutes les deux passer
  // le contrôle ci-dessus avec 1 seule place restante et dépasser le quota —
  // mêmes principe et limite que le re-contrôle après création dans register().
  const recheck = await sb(`/users?institution_id=eq.${encodeURIComponent(institution.id)}&role=eq.eleve&select=id`);
  const seatsNow = recheck.data ? recheck.data.length : 0;
  if (seatsNow > institution.seat_count) {
    await sb(`/users?id=eq.${userId}`, { method: 'PATCH', body: JSON.stringify({ institution_id: null, plan: 'free' }) });
  }
}

// Confirmation du lien reçu par email (GET /api/verify-email?token=... — voir
// vercel.json, rewrite vers /api/register pour rester sous la limite Vercel
// de 12 fonctions sans casser les liens déjà envoyés).
async function verifyEmail(req, res) {
  try {
    const token = (req.query && req.query.token) || (new URL(req.url, `https://${req.headers.host}`).searchParams.get('token'));
    if (!token) return redirect(res, `${APP_URL}?verified=invalid`);

    const r = await sb(`/users?verification_token=eq.${encodeURIComponent(token)}&select=id,email,email_verified,verification_expires_at,pending_email,institution_id`);
    const user = r.data && r.data[0];

    if (!user) return redirect(res, `${APP_URL}?verified=invalid`);

    // Confirmation d'un changement d'email (compte déjà vérifié, en attente
    // sur pending_email) — même token/expiration que la vérif d'inscription,
    // distinguée par la présence de pending_email. Prioritaire ci-dessous.
    if (user.pending_email) {
      if (user.verification_expires_at && new Date(user.verification_expires_at) < new Date())
        return redirect(res, `${APP_URL}?verified=expired`);
      await sb(`/users?id=eq.${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ email: user.pending_email, pending_email: null, verification_token: null, verification_expires_at: null }),
      });
      return redirect(res, `${APP_URL}?verified=email-changed`);
    }

    if (user.email_verified) return redirect(res, `${APP_URL}?verified=already`);
    // N'expire que si une date est réellement fixée (null => on n'expire pas).
    if (user.verification_expires_at && new Date(user.verification_expires_at) < new Date())
      return redirect(res, `${APP_URL}?verified=expired`);

    await sb(`/users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ email_verified: true, verification_token: null, verification_expires_at: null }),
    });

    // Rattachement par domaine d'email institutionnel : seulement maintenant,
    // une fois l'email prouvé (voir attachByEmailDomain ci-dessus). Ignore un
    // compte déjà rattaché (ex: invitation prof/admin).
    if (!user.institution_id) {
      try { await attachByEmailDomain(user.id, user.email); } catch { /* vérification déjà actée : ne pas la faire échouer pour ça */ }
    }

    return redirect(res, `${APP_URL}?verified=success`);
  } catch (e) {
    return redirect(res, `${APP_URL}?verified=error`);
  }
}

// Confirmation par le PARENT de son accord (GET
// /api/confirm-parent-consent?pctoken=... — voir vercel.json). Paramètre
// `pctoken` distinct du `token` de vérification d'email : les deux liens
// peuvent être en attente en même temps pour un même compte (l'élève doit
// confirmer son propre email, le parent son accord), sur deux colonnes
// séparées de la table users.
async function confirmParentConsent(req, res, pctoken) {
  try {
    const r = await sb(`/users?parent_consent_token=eq.${encodeURIComponent(pctoken)}&select=id,username`);
    const user = r.data && r.data[0];
    if (!user) {
      return simplePage(res, 400, 'Lien invalide', "Ce lien de confirmation n'est plus valide (déjà utilisé, ou compte introuvable).");
    }
    await sb(`/users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ parent_consent_token: null, parent_consent_confirmed_at: new Date().toISOString() }),
    });
    return simplePage(res, 200, 'Merci !', `Ton accord a bien été enregistré pour le compte de <strong>${escapeHtml(user.username)}</strong> sur KeyPace. Le compte reste actif normalement, aucune autre action n'est nécessaire.`);
  } catch (e) {
    return simplePage(res, 500, 'Erreur', 'Une erreur est survenue. Réessaie plus tard, ou contacte contact@keypace.be.');
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const pctoken = (req.query && req.query.pctoken) || (new URL(req.url, `https://${req.headers.host}`).searchParams.get('pctoken'));
    if (pctoken) return confirmParentConsent(req, res, pctoken);
    return verifyEmail(req, res);
  }

  setCorsOrigin(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
  const { username, email, passwordHash, profInviteToken, consent, birthdate, parentEmail } = req.body || {};
  if (!username || !passwordHash || !email) return res.status(400).json({ error: 'Champs manquants.' });
  const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailRe.test(String(email))) return res.status(400).json({ error: 'Adresse email invalide.' });

  const check = await sb(`/users?${usernameEqFilter(username)}&select=id`);
  if (check.data && check.data.length > 0) return res.status(409).json({ error: 'Ce nom est déjà pris.' });

  const emailCheck = await sb(`/users?email=eq.${encodeURIComponent(email)}&select=id`);
  if (emailCheck.data && emailCheck.data.length > 0) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

  // Rattachement à un établissement : uniquement via une invitation prof/admin
  // explicite (lien envoyé par l'établissement — voir api/institutions.js).
  // Le rattachement par simple domaine d'email a été retiré d'ici (déplacé à
  // la vérification d'email, voir verifyEmail() plus bas) : à ce stade, rien
  // ne prouve que l'utilisateur possède réellement une boîte mail de ce
  // domaine — n'importe qui connaissant le domaine d'un établissement
  // partenaire pouvait s'auto-attribuer un compte "expert" gratuit ET
  // contourner le contrôle de consentement RGPD réservé aux mineurs (la
  // branche `!institution` juste en dessous n'était alors jamais exécutée).
  let institution = null;

  // Invitation enseignant OU établissement (lien ?prof=TOKEN, rôle porté par
  // l'invitation : 'prof' par défaut, ou 'admin' pour le bootstrap du tout
  // premier compte d'un établissement — voir api/institutions.js).
  let profInvite = null;
  let inviteRole = null;
  if (profInviteToken) {
    const invR = await sb(`/prof_invites?token=eq.${encodeURIComponent(profInviteToken)}&used_by=is.null&revoked=eq.false&select=*`);
    profInvite = invR.data && invR.data[0];
    if (!profInvite) return res.status(400).json({ error: "Lien d'invitation invalide ou déjà utilisé." });
    const instR = await sb(`/institutions?id=eq.${encodeURIComponent(profInvite.institution_id)}&select=*`);
    institution = instR.data && instR.data[0];
    if (!institution) return res.status(404).json({ error: 'Établissement introuvable.' });
    inviteRole = profInvite.role || 'prof';
  }

  // Licence établissement expirée : plus aucune inscription rattachée possible.
  if (institution && institution.license_expires_at && new Date(institution.license_expires_at) < new Date()) {
    return res.status(403).json({ error: "La licence de cet établissement a expiré. Contacte ton établissement pour la renouveler." });
  }

  // RGPD mineurs : pour une inscription INDIVIDUELLE, consentement obligatoire et
  // vérification d'âge. Un compte prof/admin invité par un établissement relève
  // de la base légale de l'école (relation contractuelle contrôlée, pas d'auto-service).
  const consentAt = new Date().toISOString();
  let birthdateVal = null;
  let parentEmailVal = null;
  if (!institution) {
    if (consent !== true) {
      return res.status(400).json({ error: 'Tu dois accepter les conditions et la politique de confidentialité pour créer un compte.' });
    }
    // Obligatoire (auparavant facultative) : le contrôle "email d'un parent
    // requis si < 13 ans" juste en dessous ne s'appliquait que si la date
    // était renseignée — un mineur pouvait donc simplement laisser le champ
    // vide pour contourner la protection.
    const bd = (birthdate || '').trim();
    if (!bd) return res.status(400).json({ error: 'Date de naissance requise.' });
    const d = new Date(bd);
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Date de naissance invalide.' });
    birthdateVal = bd;
    const age = Math.floor((Date.now() - d.getTime()) / 31557600000); // ~365,25 j
    if (age < 13) {
      const pe = (parentEmail || '').trim();
      if (!emailRe.test(pe)) {
        return res.status(400).json({ error: "En dessous de 13 ans, l'accord d'un responsable légal est requis : indique son adresse email." });
      }
      parentEmailVal = pe;
    }
  }

  const token = require('crypto').randomUUID();
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const plan = institution ? 'expert' : 'free';
  // Émis uniquement si un email parent est requis (< 13 ans, hors établissement) :
  // envoyé au parent (pas à l'élève) juste en dessous, mis à null dès sa
  // confirmation (voir confirmParentConsent). Le compte reste utilisable tout
  // de suite ; à défaut de confirmation sous 30 jours, login.js le suspend.
  const parentConsentToken = parentEmailVal ? require('crypto').randomBytes(32).toString('hex') : null;

  const create = await sb('/users', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email,
      password_hash: hashPassword(passwordHash),
      plan,
      session_token: token,
      session_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      email_verified: false,
      verification_token: verificationToken,
      verification_expires_at: verificationExpiresAt,
      consent_at: consentAt,
      terms_version: 'v1',
      ...(birthdateVal ? { birthdate: birthdateVal } : {}),
      ...(parentEmailVal ? { parent_email: parentEmailVal, parent_consent_token: parentConsentToken } : {}),
      ...(institution ? { institution_id: institution.id } : {}),
      ...(inviteRole ? { role: inviteRole } : {}),
    }),
  });
  if (!create.ok) return res.status(500).json({ error: 'Erreur création compte.' });

  const user = create.data[0];

  // Marque l'invitation (prof ou admin) comme utilisée.
  if (profInvite) {
    await sb(`/prof_invites?id=eq.${profInvite.id}`, { method: 'PATCH', body: JSON.stringify({ used_by: user.id }) });
  }

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

    if (parentConsentToken) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const confirmUrl = `${APP_URL}/api/confirm-parent-consent?pctoken=${parentConsentToken}`;
        await resend.emails.send({
          from: FROM_EMAIL,
          to: parentEmailVal,
          subject: 'Accord parental pour un compte KeyPace',
          html: parentConsentEmail(username, confirmUrl),
        });
      } catch (e) {
        console.error('Parent consent email send error:', e.message);
      }
    }
  }

  res.json({
    id: user.id,
    username: user.username,
    plan: user.plan,
    email: user.email,
    displayName: null,
    institutionName: institution ? institution.name : null,
    token,
    data: {},
    emailPending: true,
  });
  } catch (e) {
    console.error('register handler error:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
