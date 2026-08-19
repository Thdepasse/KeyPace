const { Resend } = require('resend');
const { hashPassword, verifyPassword } = require('./_auth');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = (process.env.APP_URL || 'https://keypace.be').trim();
const FROM_EMAIL = process.env.FROM_EMAIL || 'KeyPace <noreply@keypace.be>';

// Durée de vie d'une session — auparavant un session_token restait valide
// indéfiniment une fois émis. session_expires_at IS NULL est traité comme
// valide (sessions émises avant l'ajout de cette colonne) : ça évite de
// déconnecter tout le monde d'un coup au déploiement — l'expiration réelle
// s'applique progressivement, à chaque nouvelle émission de token.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
function sessionExpiresAt() { return new Date(Date.now() + SESSION_TTL_MS).toISOString(); }
function sessionFilter(token) {
  return `session_token=eq.${encodeURIComponent(token)}&or=(session_expires_at.is.null,session_expires_at.gt.${new Date().toISOString()})`;
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

// Plan réellement accordé : un élève d'établissement dont la licence a expiré
// repasse en 'free' (sans écrire en base : renouveler la licence le réactive).
// Nom de l'établissement pour un message d'accueil contextualisé côté élève
// (page "Mes classes") — évite un aller-retour supplémentaire côté client.
async function institutionNameFor(institutionId) {
  if (!institutionId) return null;
  const r = await sb(`/institutions?id=eq.${institutionId}&select=name`);
  const inst = r.data && r.data[0];
  return inst ? inst.name : null;
}

// L'onglet "Classe" ne doit s'afficher que pour un élève rattaché à un
// établissement OU déjà membre d'au moins une classe (cas d'un import CSV
// par un prof indépendant, qui n'a pas d'institution_id mais a bien une
// classe) — un simple hasInstitution ne suffit pas, sinon ces élèves-là
// perdraient l'accès à leurs propres devoirs.
async function hasAnyClass(userId) {
  const r = await sb(`/class_members?student_id=eq.${userId}&select=id&limit=1`);
  return !!(r.data && r.data[0]);
}

async function effectivePlan(user) {
  if (user && user.institution_id && user.plan === 'expert') {
    const li = await sb(`/institutions?id=eq.${user.institution_id}&select=license_expires_at`);
    const inst = li.data && li.data[0];
    if (inst && inst.license_expires_at && new Date(inst.license_expires_at) < new Date()) return 'free';
  }
  return user ? user.plan : 'free';
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

function emailChangeConfirmEmail(username, verifyUrl) {
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
              <p style="margin:0 0 8px;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.02em">Confirme ta nouvelle adresse</p>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,.88)">Bonjour ${username}, tu as demandé à changer l'email de ton compte KeyPace.</p>
            </td></tr>
            <tr><td style="padding:32px 36px 24px;text-align:center">
              <p style="margin:0 0 20px;font-size:14px;color:#7A7365;line-height:1.6">Ce lien est valable <strong style="color:#16140F">24 heures</strong>. Si tu n'es pas à l'origine de cette demande, ignore cet email — ton adresse actuelle reste inchangée.</p>
              <a href="${verifyUrl}" style="display:inline-block;background-color:#FF6B2B;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:13px">Confirmer cette adresse</a>
            </td></tr>
            <tr><td bgcolor="#F8F5F0" style="background-color:#F8F5F0;border-top:1px solid #E7E1D5;padding:16px 36px;text-align:center">
              <p style="margin:0;font-size:12px;color:#8A8275;line-height:1.6">Lien : <a href="${verifyUrl}" style="color:#FF6B2B;word-break:break-all;font-size:11px">${verifyUrl}</a></p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function inactivityWarningEmail(username) {
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
              <p style="margin:0 0 8px;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.02em">Ton compte va être supprimé</p>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,.88)">Bonjour ${username}, ça fait longtemps qu'on ne t'a pas vu.</p>
            </td></tr>
            <tr><td style="padding:32px 36px 24px;text-align:center">
              <p style="margin:0 0 20px;font-size:14px;color:#7A7365;line-height:1.6">Conformément à notre politique de confidentialité, les comptes gratuits inactifs depuis 24 mois sont supprimés. Ton compte et tes données seront <strong style="color:#16140F">définitivement effacés dans 30 jours</strong> si tu ne te reconnectes pas d'ici là.</p>
              <a href="${APP_URL}" style="display:inline-block;background-color:#FF6B2B;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:13px">Me reconnecter</a>
            </td></tr>
            <tr><td bgcolor="#F8F5F0" style="background-color:#F8F5F0;border-top:1px solid #E7E1D5;padding:16px 36px;text-align:center">
              <p style="margin:0;font-size:12px;color:#8A8275;line-height:1.6">Te reconnecter annule automatiquement cette suppression.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Purge des comptes individuels gratuits inactifs (politique de rétention,
// voir confidentialite.html section 7) — déclenchée par Vercel Cron (GET,
// voir vercel.json), authentifiée par le header Authorization que Vercel
// ajoute automatiquement quand CRON_SECRET est configuré côté projet.
// Portée volontairement restreinte à role=eleve + institution_id null +
// plan=free : les comptes Expert (abonnement actif) et les comptes
// d'établissement (cycle de vie géré par l'école) sont exclus.
const INACTIVITY_WARN_MS = 24 * 30 * 24 * 60 * 60 * 1000; // ~24 mois
const INACTIVITY_DELETE_GRACE_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours après l'email
async function retentionSweep(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Non autorisé.' });
  }
  const now = Date.now();
  const warnCutoff = new Date(now - INACTIVITY_WARN_MS).toISOString();
  const deleteCutoff = new Date(now - INACTIVITY_DELETE_GRACE_MS).toISOString();

  // Étape 1 : avertir les comptes fraîchement inactifs (jamais avertis).
  // last_seen_at=is.null couvre les comptes créés avant l'ajout de cette
  // colonne (on retombe sur created_at pour eux).
  const toWarnR = await sb(
    `/users?role=eq.eleve&institution_id=is.null&plan=eq.free&deletion_warned_at=is.null` +
    `&or=(last_seen_at.lt.${warnCutoff},and(last_seen_at.is.null,created_at.lt.${warnCutoff}))` +
    `&select=id,username,email`
  );
  const toWarn = Array.isArray(toWarnR.data) ? toWarnR.data : [];
  let warned = 0;
  for (const u of toWarn) {
    if (RESEND_API_KEY && u.email) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        await resend.emails.send({ from: FROM_EMAIL, to: u.email, subject: 'Ton compte KeyPace va être supprimé pour inactivité', html: inactivityWarningEmail(u.username) });
      } catch (e) { console.error('Inactivity warning email error:', e.message); }
    }
    await sb(`/users?id=eq.${u.id}`, { method: 'PATCH', body: JSON.stringify({ deletion_warned_at: new Date().toISOString() }) });
    warned++;
  }

  // Étape 2 : supprimer les comptes avertis il y a 30+ jours, toujours inactifs.
  const toDeleteR = await sb(
    `/users?role=eq.eleve&institution_id=is.null&plan=eq.free&deletion_warned_at=lt.${deleteCutoff}` +
    `&or=(last_seen_at.lt.${warnCutoff},last_seen_at.is.null)&select=id`
  );
  const toDelete = Array.isArray(toDeleteR.data) ? toDeleteR.data : [];
  for (const u of toDelete) {
    await sb(`/reviews?user_id=eq.${u.id}`, { method: 'DELETE' });
    await sb(`/users?id=eq.${u.id}`, { method: 'DELETE' });
  }

  return res.json({ ok: true, warned, deleted: toDelete.length });
}

module.exports = async function handler(req, res) {
  // Vercel Cron (GET, voir vercel.json) — routé avant le garde POST-only
  // ci-dessous, même principe que verifyEmail() dans api/register.js.
  if (req.method === 'GET') {
    const action = (req.query && req.query.action) || new URL(req.url, `https://${req.headers.host}`).searchParams.get('action');
    if (action === 'retention-sweep-cron') return retentionSweep(req, res);
    return res.status(400).json({ error: 'Action inconnue.' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
  const body = req.body || {};

  // — Demande de réinitialisation de mot de passe
  if (body.action === 'reset-request') {
    const { token } = body;
    if (!token) return res.status(400).json({ error: 'Token de session manquant.' });

    const sessionR = await sb(`/users?${sessionFilter(token)}&select=id,username,email`);
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
        password_hash: hashPassword(newPasswordHash),
        verification_token: null,
        verification_expires_at: null,
        session_token: newSession,
        session_expires_at: sessionExpiresAt(),
        last_seen_at: new Date().toISOString(),
        deletion_warned_at: null,
        failed_attempts: 0,
        locked_until: null,
        must_change_password: false, // ce reset auto-choisi compte comme le changement exigé, s'il l'était
      }),
    });

    // Récupérer les infos pour reconnecter l'utilisateur
    const userR = await sb(`/users?id=eq.${user.id}&select=id,username,plan,onboarding_completed,email,display_name,institution_id`);
    const updated = userR.data && userR.data[0];
    const pr = await sb(`/progress?user_id=eq.${user.id}&select=data`);
    const progress = pr.data && pr.data[0];

    return res.json({ ok: true, id: updated.id, username: updated.username, plan: updated.plan, token: newSession, onboarding_completed: updated.onboarding_completed || false, email: updated.email || null, displayName: updated.display_name || null, mustChangePassword: false, institutionName: await institutionNameFor(updated.institution_id), hasClass: await hasAnyClass(updated.id), data: progress?.data || {} });
  }

  // — RGPD : export des données personnelles (droit d'accès)
  if (body.action === 'export-me') {
    const { token } = body;
    if (!token) return res.status(400).json({ error: 'Token de session manquant.' });
    const uR = await sb(`/users?${sessionFilter(token)}&select=id,username,email,role,plan,email_verified,created_at,institution_id`);
    const user = uR.data && uR.data[0];
    if (!user) return res.status(401).json({ error: 'Session invalide.' });

    const pr = await sb(`/progress?user_id=eq.${user.id}&select=data,updated_at`);
    const progress = (pr.data && pr.data[0]) || null;
    const mR = await sb(`/class_members?student_id=eq.${user.id}&select=joined_at,classes(name)`);
    const memberships = (mR.data || []).map((m) => ({ classe: m.classes ? m.classes.name : null, rejointeLe: m.joined_at }));
    let institution = null;
    if (user.institution_id) {
      const iR = await sb(`/institutions?id=eq.${user.institution_id}&select=name,slug`);
      institution = (iR.data && iR.data[0]) || null;
    }
    let teaching;
    if (user.role === 'prof' || user.role === 'admin') {
      const cR = await sb(`/classes?teacher_id=eq.${user.id}&select=name,invite_code,created_at`);
      teaching = cR.data || [];
    }
    return res.json({
      exportLe: new Date().toISOString(),
      compte: { username: user.username, email: user.email, role: user.role || 'eleve', plan: user.plan, emailVerifie: !!user.email_verified, creeLe: user.created_at },
      etablissement: institution,
      progression: progress ? progress.data : {},
      classesRejointes: memberships,
      ...(teaching !== undefined ? { classesEnseignees: teaching } : {}),
    });
  }

  // — RGPD : suppression définitive du compte (droit à l'effacement, ré-auth requise)
  if (body.action === 'delete-me') {
    const { token, passwordHash } = body;
    if (!token || !passwordHash) return res.status(400).json({ error: 'Mot de passe requis.' });
    const uR = await sb(`/users?${sessionFilter(token)}&select=id,password_hash`);
    const user = uR.data && uR.data[0];
    if (!user) return res.status(401).json({ error: 'Session invalide.' });
    if (!verifyPassword(passwordHash, user.password_hash).ok) return res.status(401).json({ error: 'Mot de passe incorrect.' });
    // reviews.user_id est en `on delete set null` (le commentaire reste affiché
    // publiquement après suppression du compte, uniquement délié) — on le
    // supprime explicitement avant, le droit à l'effacement porte sur le
    // commentaire nommé, pas seulement sur le lien vers le compte.
    await sb(`/reviews?user_id=eq.${user.id}`, { method: 'DELETE' });
    // Les FK on delete cascade nettoient progress, class_members, scores, etc.
    await sb(`/users?id=eq.${user.id}`, { method: 'DELETE' });
    return res.json({ ok: true });
  }

  // — Modifier le nom d'utilisateur (identifiant de connexion). Un élève
  // rattaché à un établissement ne peut pas le changer : l'enseignant doit
  // pouvoir l'identifier de façon fiable dans sa classe (voir le "nom
  // affiché" ci-dessous pour un pseudo librement modifiable à la place).
  if (body.action === 'update-username') {
    const { token, username } = body;
    if (!token || !username) return res.status(400).json({ error: 'Champs manquants.' });
    const newUsername = String(username).trim();
    if (newUsername.length < 3 || newUsername.length > 24) return res.status(400).json({ error: "Le nom d'utilisateur doit faire entre 3 et 24 caractères." });
    if (!/^[a-zA-Z0-9._-]+$/.test(newUsername)) return res.status(400).json({ error: 'Caractères autorisés : lettres, chiffres, points, tirets, underscores.' });

    const uR = await sb(`/users?${sessionFilter(token)}&select=id,username,role,institution_id`);
    const user = uR.data && uR.data[0];
    if (!user) return res.status(401).json({ error: 'Session invalide.' });
    if (user.role === 'eleve' && user.institution_id) {
      return res.status(403).json({ error: "Ton identifiant est géré par ton établissement. Utilise le nom affiché ci-dessous pour changer ce que voient les autres joueurs." });
    }
    if (newUsername.toLowerCase() === user.username.toLowerCase()) return res.json({ ok: true, username: user.username });

    const dup = await sb(`/users?username=eq.${encodeURIComponent(newUsername)}&select=id`);
    if (dup.data && dup.data.length) return res.status(409).json({ error: 'Ce nom est déjà pris.' });

    await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ username: newUsername }) });
    return res.json({ ok: true, username: newUsername });
  }

  // — Modifier le nom affiché (pseudo visible par les autres joueurs en
  // Duel 1v1 et au classement du Boss de la semaine). Disponible pour tout
  // le monde, y compris les élèves rattachés à un établissement — c'est le
  // seul des deux noms qu'ils peuvent changer librement.
  if (body.action === 'update-display-name') {
    const { token, displayName } = body;
    if (!token) return res.status(400).json({ error: 'Session manquante.' });
    const name = String(displayName || '').trim().slice(0, 24) || null;
    if (name && !/^[\p{L}\p{N}\s._-]+$/u.test(name)) return res.status(400).json({ error: 'Caractères non autorisés dans le nom affiché.' });
    const uR = await sb(`/users?${sessionFilter(token)}&select=id`);
    const user = uR.data && uR.data[0];
    if (!user) return res.status(401).json({ error: 'Session invalide.' });
    await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ display_name: name }) });
    return res.json({ ok: true, displayName: name });
  }

  // — Changer le mot de passe directement dans les réglages (sans passer
  // par le lien de réinitialisation par email), en reconfirmant l'ancien.
  if (body.action === 'change-password') {
    const { token, oldPasswordHash, newPasswordHash } = body;
    if (!token || !oldPasswordHash || !newPasswordHash) return res.status(400).json({ error: 'Champs manquants.' });
    const uR = await sb(`/users?${sessionFilter(token)}&select=id,password_hash`);
    const user = uR.data && uR.data[0];
    if (!user) return res.status(401).json({ error: 'Session invalide.' });
    if (!verifyPassword(oldPasswordHash, user.password_hash).ok) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    // Régénère aussi le session_token : sans ça, une session déjà volée avant
    // ce changement de mot de passe restait valable après (le mot de passe
    // change, mais pas le jeton qui donne accès sans lui).
    const newToken = require('crypto').randomUUID();
    await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ password_hash: hashPassword(newPasswordHash), must_change_password: false, session_token: newToken, session_expires_at: sessionExpiresAt() }) });
    return res.json({ ok: true, token: newToken });
  }

  // — Déconnexion explicite : invalide le session_token côté serveur (avant
  // ça, "Déconnexion" ne faisait qu'effacer le localStorage du navigateur —
  // un jeton intercepté avant la déconnexion restait utilisable indéfiniment).
  if (body.action === 'logout') {
    const { token } = body;
    if (!token) return res.json({ ok: true });
    const uR = await sb(`/users?${sessionFilter(token)}&select=id`);
    const user = uR.data && uR.data[0];
    if (user) await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ session_token: null, session_expires_at: null }) });
    return res.json({ ok: true });
  }

  // — Demande de changement d'email : envoie un lien de confirmation à la
  // NOUVELLE adresse. Le changement n'est appliqué qu'au clic sur ce lien
  // (voir verifyEmail() dans register.js, même mécanisme de token que la
  // confirmation d'inscription — distingué par la présence de pending_email).
  if (body.action === 'update-email-request') {
    const { token, newEmail, currentPasswordHash } = body;
    if (!token || !newEmail || !currentPasswordHash) return res.status(400).json({ error: 'Champs manquants.' });
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRe.test(String(newEmail))) return res.status(400).json({ error: 'Adresse email invalide.' });

    const uR = await sb(`/users?${sessionFilter(token)}&select=id,username,email,password_hash`);
    const user = uR.data && uR.data[0];
    if (!user) return res.status(401).json({ error: 'Session invalide.' });
    if (!verifyPassword(currentPasswordHash, user.password_hash).ok) return res.status(401).json({ error: 'Mot de passe incorrect.' });
    if (String(newEmail).toLowerCase() === (user.email || '').toLowerCase()) return res.status(400).json({ error: "C'est déjà ton adresse actuelle." });

    const dup = await sb(`/users?email=eq.${encodeURIComponent(newEmail)}&select=id`);
    if (dup.data && dup.data.length) return res.status(409).json({ error: 'Cet email est déjà utilisé par un autre compte.' });

    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await sb(`/users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ pending_email: newEmail, verification_token: verificationToken, verification_expires_at: verificationExpiresAt }),
    });

    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const verifyUrl = `${APP_URL}/api/verify-email?token=${verificationToken}`;
        await resend.emails.send({
          from: FROM_EMAIL,
          to: newEmail,
          subject: 'Confirme ta nouvelle adresse email — KeyPace',
          html: emailChangeConfirmEmail(user.username, verifyUrl),
        });
      } catch (e) {
        console.error('Email send error:', e.message);
        return res.status(500).json({ error: "Impossible d'envoyer l'email de confirmation. Réessaie." });
      }
    }
    return res.json({ ok: true });
  }

  // — Marquer l'onboarding comme terminé
  if (body.action === 'onboarding-done') {
    const { token } = body;
    if (!token) return res.status(400).json({ error: 'Token manquant.' });
    const uR = await sb(`/users?${sessionFilter(token)}&select=id`);
    const user = uR.data && uR.data[0];
    if (!user) return res.status(401).json({ error: 'Session invalide.' });
    await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ onboarding_completed: true }) });
    return res.json({ ok: true });
  }

  // — Connexion par session_token (utilisée après le SSO OAuth)
  if (body.action === 'session-login') {
    const { token } = body;
    if (!token) return res.status(400).json({ error: 'Token de session manquant.' });
    const r = await sb(`/users?${sessionFilter(token)}&select=*`);
    const user = r.data && r.data[0];
    if (!user) return res.status(401).json({ error: 'Session invalide.' });
    await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ last_seen_at: new Date().toISOString(), deletion_warned_at: null }) });
    const pr = await sb(`/progress?user_id=eq.${user.id}&select=data`);
    const progress = pr.data && pr.data[0];
    return res.json({ id: user.id, username: user.username, plan: await effectivePlan(user), role: user.role || 'eleve', onboarding_completed: user.onboarding_completed || false, email: user.email || null, displayName: user.display_name || null, mustChangePassword: !!user.must_change_password, institutionName: await institutionNameFor(user.institution_id), hasClass: await hasAnyClass(user.id), token, data: progress?.data || {} });
  }

  // — Connexion normale
  const { username, passwordHash } = body;
  if (!username || !passwordHash) return res.status(400).json({ error: 'Champs manquants.' });

  const r = await sb(`/users?username=eq.${encodeURIComponent(username)}&select=*`);
  const user = r.data && r.data[0];
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable.' });

  // Anti-bruteforce : compte temporairement verrouillé après trop d'échecs.
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans quelques minutes.' });
  }

  const check = verifyPassword(passwordHash, user.password_hash);
  if (!check.ok) {
    const attempts = (user.failed_attempts || 0) + 1;
    const patch = { failed_attempts: attempts };
    if (attempts >= 5) { patch.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString(); patch.failed_attempts = 0; }
    await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }
  if (user.verification_token) return res.status(403).json({ error: 'Confirme ton adresse email avant de te connecter. Vérifie ta boîte mail.', code: 'EMAIL_NOT_VERIFIED' });

  const token = require('crypto').randomUUID();
  const patch = { session_token: token, session_expires_at: sessionExpiresAt(), last_seen_at: new Date().toISOString(), deletion_warned_at: null, failed_attempts: 0, locked_until: null };
  if (check.upgrade) patch.password_hash = check.upgrade; // migration SHA-256 brut -> scrypt
  await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify(patch) });

  const pr = await sb(`/progress?user_id=eq.${user.id}&select=data`);
  const progress = pr.data && pr.data[0];

  res.json({ id: user.id, username: user.username, plan: await effectivePlan(user), role: user.role || 'eleve', onboarding_completed: user.onboarding_completed || false, email: user.email || null, displayName: user.display_name || null, mustChangePassword: !!user.must_change_password, institutionName: await institutionNameFor(user.institution_id), hasClass: await hasAnyClass(user.id), token, data: progress?.data || {} });
  } catch (e) {
    console.error('login handler error:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
