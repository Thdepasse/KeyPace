// GET → liste des établissements
// POST (x-admin-key header) → créer un établissement (+ lien d'invitation admin optionnel)
// POST (body.action=contact) → formulaire de contact licence
const { Resend } = require('resend');
const crypto = require('crypto');
const { setCorsOrigin } = require('./_cors');
const { safeEqual } = require('./_auth');
const { normalizeInput, slugify, trialEnd, TRIAL_DAYS } = require('./_self-onboard');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'KeyPace <noreply@keypace.be>';
const APP_URL = (process.env.APP_URL || 'https://keypace.be').trim();

// name/email/message du formulaire de contact sont interpolés dans l'email
// HTML envoyé à contact@keypace.be — sans échappement, un visiteur pouvait
// injecter des balises dans l'email reçu par l'équipe (même helper que
// register.js pour le username).
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Même format que genInviteCode() dans api/classes.js (12 caractères, alphabet sans ambiguïté).
function genInviteToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let t = '';
  for (let i = 0; i < 12; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
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

// x-forwarded-for peut contenir plusieurs IP séparées par des virgules — sur
// Vercel, le CLIENT contrôle entièrement les valeurs qu'il envoie lui-même
// dans cet en-tête, et Vercel AJOUTE la vraie IP à la suite plutôt que de la
// remplacer : lire le PREMIER élément (comme avant) revient à faire confiance
// à une valeur choisie par l'appelant, qui peut donc se présenter comme une
// "IP différente" à chaque tentative et contourner entièrement le verrou
// anti-bruteforce ci-dessous. `x-real-ip` est en revanche posé par Vercel
// lui-même (non falsifiable par le client) ; à défaut, on prend le DERNIER
// élément de x-forwarded-for plutôt que le premier.
function clientIp(req) {
  const real = req.headers['x-real-ip'];
  if (real) return String(real).trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff) { const parts = String(xff).split(',').map((s) => s.trim()).filter(Boolean); if (parts.length) return parts[parts.length - 1]; }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Anti-bruteforce sur ADMIN_KEY — cette clé n'est liée à aucun compte
// utilisateur (elle protège un endpoint de bootstrap, pas une session), donc
// le verrou est suivi par IP plutôt que par utilisateur. Sans ça, la clé
// pouvait être essayée en boucle sans aucun frein applicatif.
async function adminKeyLockState(ip) {
  const r = await sb(`/admin_key_attempts?ip=eq.${encodeURIComponent(ip)}&select=id,failed_attempts,locked_until`);
  return (r.data && r.data[0]) || null;
}
async function recordAdminKeyFailure(existing, ip) {
  if (!existing) {
    // Première tentative pour cette IP : POST simple. Une course entre deux
    // toutes premières tentatives simultanées peut créer deux lignes (pas de
    // contrainte unique sur `ip` visible ici) — cas rare, sans conséquence
    // grave (au pire deux compteurs à 1 au lieu d'un à 2), donc non traité par
    // compare-and-swap comme le cas ci-dessous.
    await sb('/admin_key_attempts', { method: 'POST', body: JSON.stringify({ ip, failed_attempts: 1 }) });
    return;
  }
  // Incrément par compare-and-swap (même raison que login.js : PostgREST ne
  // fait pas d'incrément atomique nativement) — sans ça, des tentatives
  // envoyées en parallèle sur ADMIN_KEY lisent toutes le même compteur avant
  // qu'aucune n'ait écrit, et le verrou à 5 essais n'est jamais atteint.
  let base = existing;
  for (let i = 0; i < 4; i++) {
    const attempts = (base.failed_attempts || 0) + 1;
    const patch = { failed_attempts: attempts };
    if (attempts >= 5) { patch.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); patch.failed_attempts = 0; }
    const cas = await sb(`/admin_key_attempts?id=eq.${base.id}&failed_attempts=eq.${base.failed_attempts || 0}`, { method: 'PATCH', body: JSON.stringify(patch) });
    if (cas.ok && cas.data && cas.data.length) return;
    const fresh = await sb(`/admin_key_attempts?id=eq.${base.id}&select=id,failed_attempts,locked_until`);
    base = (fresh.data && fresh.data[0]) || base;
  }
}
async function clearAdminKeyFailures(existing) {
  if (existing && existing.failed_attempts) await sb(`/admin_key_attempts?id=eq.${existing.id}`, { method: 'PATCH', body: JSON.stringify({ failed_attempts: 0 }) });
}

// Mail d'invitation envoyé depuis la version mobile (« m'envoyer le lien »).
function linkInviteEmail(url) {
  const step = (n, t, d) => `<tr><td width="36" valign="top" style="padding:0 0 16px"><div style="width:30px;height:30px;line-height:30px;border-radius:50%;background:#FF4D2E;color:#fff;font-weight:800;font-size:14px;text-align:center">${n}</div></td><td valign="top" style="padding:0 0 16px 10px"><div style="font-size:15.5px;font-weight:700;color:#16140F;line-height:1.3">${t}</div><div style="font-size:14px;color:#7A7365;line-height:1.5;margin-top:2px">${d}</div></td></tr>`;
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#16140F">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">Ouvre ce lien sur ton ordinateur : 66 leçons et des jeux de frappe, gratuits pour commencer.</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f5;padding:32px 12px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E7E1D5;border-radius:28px;overflow:hidden">
        <tr><td bgcolor="#FF4D2E" style="background:#FF4D2E;background-image:linear-gradient(135deg,#FF8A5C 0%,#FF4D2E 55%,#E8391D 100%);padding:26px 36px 0">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.03em">Key<span style="opacity:.85">Pace</span></td>
            <td align="right" style="font-size:12px;font-weight:700;color:#fff;letter-spacing:.06em;text-transform:uppercase"><span style="background:rgba(255,255,255,.22);padding:5px 12px;border-radius:20px">Gratuit pour commencer</span></td>
          </tr></table>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:18px 0 0">
            <img src="${APP_URL}/images/keypace-mascots-duo-laptop.png" width="300" alt="Les mascottes KeyPace devant un ordinateur" style="display:block;width:300px;max-width:88%;height:auto;border:0">
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:34px 38px 6px;text-align:center">
          <p style="margin:0 0 12px;font-size:30px;font-weight:800;letter-spacing:-0.03em;line-height:1.1">Prêt à taper plus vite&nbsp;?</p>
          <p style="margin:0;font-size:16.5px;line-height:1.6;color:#4a4639">Tu as demandé le lien depuis ton téléphone. Ouvre-le sur ton <b>ordinateur</b> ou une tablette avec clavier : c'est là que ça se passe.</p>
        </td></tr>
        <tr><td align="center" style="padding:26px 38px 8px">
          <a href="${url}" style="display:inline-block;background:#FF4D2E;color:#ffffff;font-weight:800;font-size:17px;text-decoration:none;padding:17px 38px;border-radius:15px;box-shadow:0 12px 24px -10px rgba(255,77,46,.6)">Tester KeyPace&nbsp;→</a>
          <p style="margin:12px 0 0;font-size:13px;color:#8A8275">Gratuit pour commencer, aucune installation.</p>
        </td></tr>
        <tr><td style="padding:26px 38px 6px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F6F1;border-radius:20px"><tr><td style="padding:24px 24px 8px">
            <p style="margin:0 0 16px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#A39C8D">En trois étapes</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${step(1, 'Ouvre le lien sur ton ordinateur', 'Clique sur le bouton ci-dessus depuis ta boîte mail.')}
              ${step(2, 'Lance ta première leçon', '66 leçons progressives, à ton rythme, pour apprendre les dix doigts.')}
              ${step(3, 'Entraîne-toi avec les jeux', 'Précision, mémoire, vitesse : tu progresses sans t\'en rendre compte.')}
            </table>
          </td></tr></table>
        </td></tr>
        <tr><td align="center" style="padding:20px 38px 30px">
          <p style="margin:0;font-size:14px;color:#7A7365;line-height:1.6"><span style="color:#F5A623;letter-spacing:2px">★★★★★</span><br><b style="color:#16140F">19 avis 5 étoiles</b> · adopté par 9 établissements</p>
        </td></tr>
        <tr><td bgcolor="#F8F5F0" style="background:#F8F5F0;border-top:1px solid #E7E1D5;padding:20px 38px;text-align:center">
          <p style="margin:0 0 8px;font-size:12px;color:#8A8275;line-height:1.6">Le bouton ne fonctionne pas ? Copie ce lien dans ton navigateur :<br><a href="${url}" style="color:#FF4D2E;word-break:break-all">${url}</a></p>
          <p style="margin:0;font-size:12px;color:#B5AE9F;line-height:1.6">Tu reçois ce mail une seule fois, parce que tu as demandé le lien sur keypace.be.<br>Une question ? Réponds-nous ou écris à <a href="mailto:contact@keypace.be" style="color:#FF4D2E;text-decoration:none">contact@keypace.be</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ── Self onboarding : un établissement ouvre lui-même son espace d'essai ──
// Crée l'établissement (essai de 30 jours via license_expires_at, ce qui
// réutilise le blocage déjà en place quand la licence expire), puis une
// invitation « admin » à usage unique. Le navigateur poursuit l'inscription du
// premier compte avec ce token : même code que l'inscription actuelle
// (api/register.js en e-mail + mot de passe, api/oauth.js pour Google et
// Microsoft). Anti-abus : limite par IP et par adresse, champ piège, e-mail de
// confirmation au gérant et copie à l'équipe pour vérifier que l'établissement
// existe, puis facture à l'issue des 30 jours.
function frDate(iso) {
  return new Date(iso).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function mailShell(inner) {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#16140F">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f5;padding:32px 12px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E7E1D5;border-radius:28px;overflow:hidden">
      <tr><td style="background:#FF4D2E;background-image:linear-gradient(135deg,#FF8A5C 0%,#FF4D2E 55%,#E8391D 100%);padding:24px 36px;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.03em">KeyPace</td></tr>
      ${inner}
    </table>
  </td></tr></table>
</body></html>`;
}

function selfOnboardWelcomeEmail(name, endsAt, url) {
  const n = escapeHtml(name);
  return mailShell(`
      <tr><td style="padding:32px 38px 6px">
        <p style="margin:0 0 10px;font-size:24px;font-weight:800;letter-spacing:-0.03em;line-height:1.15">L'espace de ${n} est ouvert</p>
        <p style="margin:0;font-size:15.5px;line-height:1.6;color:#4a4639">Votre test gratuit de ${TRIAL_DAYS} jours court jusqu'au <b>${escapeHtml(frDate(endsAt))}</b>. Il reste une étape : finaliser la création de votre compte.</p>
      </td></tr>
      <tr><td align="center" style="padding:22px 38px 8px">
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#FF4D2E;color:#ffffff;font-weight:800;font-size:16px;text-decoration:none;padding:15px 32px;border-radius:14px">Finaliser mon compte</a>
      </td></tr>
      <tr><td style="padding:18px 38px 6px;font-size:14px;line-height:1.6;color:#4a4639">
        <p style="margin:0 0 10px">À l'issue des ${TRIAL_DAYS} jours, une facture vous est envoyée. L'espace est mis en pause tant qu'elle n'est pas réglée, rien n'est perdu.</p>
        <p style="margin:0">Pour un établissement de la Fédération Wallonie-Bruxelles, la subvention MANOLO peut prendre ce coût en charge. Nous vérifions l'éligibilité avec vous : répondez simplement à ce mail.</p>
      </td></tr>
      <tr><td style="padding:22px 38px 26px;border-top:1px solid #E7E1D5;margin-top:18px;font-size:12px;line-height:1.6;color:#8A8275">Vous n'êtes pas à l'origine de cette demande ? Ignorez ce message, aucun compte ne sera créé sans votre action.</td></tr>`);
}

function selfOnboardInternalEmail(v, endsAt, inviteUrl) {
  const row = (k, val) => `<tr><td style="padding:6px 0;border-bottom:1px solid #EDE9E1"><span style="font-size:13px;font-weight:700;color:#8A8275">${k}</span><br><span style="font-size:15px;font-weight:600;color:#16140F">${val}</span></td></tr>`;
  return mailShell(`
      <tr><td style="padding:28px 36px 6px">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#A39C8D;letter-spacing:.06em;text-transform:uppercase">Nouvel espace d'essai à vérifier</p>
        <p style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.02em">${escapeHtml(v.name)}</p>
      </td></tr>
      <tr><td style="padding:16px 36px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F6F1;border-radius:14px;padding:16px 22px">
        ${row('Gérant', `<a href="mailto:${escapeHtml(v.email)}" style="color:#FF4D2E;text-decoration:none">${escapeHtml(v.email)}</a>`)}
        ${row("Nombre d'élèves", String(v.seatCount))}
        ${row('Niveau et pays', `${escapeHtml(v.level)} · ${escapeHtml(v.country)}`)}
        ${row("Fin de l'essai", escapeHtml(frDate(endsAt)))}
      </table></td></tr>
      <tr><td style="padding:0 36px 26px;font-size:13px;line-height:1.6;color:#4a4639">À faire : vérifier que l'établissement existe (répondre à ce mail écrit directement au gérant), puis facturer avant le ${escapeHtml(frDate(endsAt))}. Lien d'invitation, ne le partagez pas : ${escapeHtml(inviteUrl)}</td></tr>`);
}

async function selfOnboard(req, res) {
  const body = req.body || {};
  if (body.website) return res.json({ ok: true }); // champ piège anti-robot

  const parsed = normalizeInput(body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const v = parsed.value;

  // Limites : 3 créations/heure par IP, 1 création/24 h par adresse. Fermé par
  // défaut si la base est indisponible (colonnes de migration absentes comprises).
  const ip = clientIp(req);
  const since = (ms) => encodeURIComponent(new Date(Date.now() - ms).toISOString());
  const byIp = await sb(`/institutions?onboarding_ip=eq.${encodeURIComponent(ip)}&created_at=gte.${since(3600e3)}&select=id`);
  const byEmail = await sb(`/institutions?contact_email=eq.${encodeURIComponent(v.email)}&created_at=gte.${since(24 * 3600e3)}&select=id`);
  if (!byIp.ok || !byEmail.ok) return res.status(503).json({ error: 'Service momentanément indisponible. Réessaie dans un instant.' });
  if (byIp.data.length >= 3) return res.status(429).json({ error: 'Trop de demandes depuis ce réseau. Réessaie plus tard.' });
  if (byEmail.data.length >= 1) return res.status(409).json({ error: 'Un espace a déjà été ouvert avec cette adresse. Vérifie ta boîte mail, ou écris-nous à contact@keypace.be.' });

  // Adresse déjà liée à un compte : l'invitation admin ne peut pas être
  // appliquée à un compte existant (register et SSO ne gèrent que la création).
  // Créer l'espace quand même le laissait sans gérant, et bloquait toute
  // nouvelle tentative 24 h. On refuse donc AVANT de créer quoi que ce soit.
  // (register renvoie déjà 409 sur un e-mail pris : aucune fuite nouvelle.)
  const emailIlike = String(v.email).replace(/[\\%_]/g, (c) => '\\' + c); // match exact, insensible à la casse
  const byUser = await sb(`/users?email=ilike.${encodeURIComponent(emailIlike)}&select=id`);
  if (!byUser.ok) return res.status(503).json({ error: 'Service momentanément indisponible. Réessaie dans un instant.' });
  if (byUser.data.length >= 1) return res.status(409).json({ error: 'Cette adresse a déjà un compte KeyPace. Utilise une autre adresse pour le gérant, ou écris-nous à contact@keypace.be : nous ouvrons l\'espace et le rattachons à ton compte.' });

  const endsAt = trialEnd();
  let institution = null;
  for (let i = 0; i < 5 && !institution; i++) {
    const slug = `${slugify(v.name)}-${crypto.randomBytes(2).toString('hex')}`;
    const create = await sb('/institutions', {
      method: 'POST',
      body: JSON.stringify({
        name: v.name,
        slug,
        // Colonne obligatoire mais sans usage pour l'accès : valeur aléatoire.
        password_hash: crypto.randomBytes(32).toString('hex'),
        seat_count: v.seatCount,
        license_expires_at: endsAt,
        contact_email: v.email,
        level: v.level,
        country: v.country,
        self_onboarded: true,
        onboarding_ip: ip,
      }),
    });
    if (create.ok && create.data && create.data[0]) institution = create.data[0];
    else if (create.status !== 409) break; // 409 = slug déjà pris, on retente avec un autre suffixe
  }
  if (!institution) return res.status(500).json({ error: "Impossible d'ouvrir l'espace pour le moment. Réessaie, ou écris-nous à contact@keypace.be." });

  let token = null;
  for (let i = 0; i < 5 && !token; i++) {
    const t = genInviteToken();
    const r = await sb('/prof_invites', {
      method: 'POST',
      body: JSON.stringify({ institution_id: institution.id, email: v.email, token: t, role: 'admin' }),
    });
    if (r.ok && r.data && r.data[0]) token = t;
  }
  if (!token) return res.status(500).json({ error: "Impossible d'ouvrir l'espace pour le moment. Réessaie, ou écris-nous à contact@keypace.be." });

  // E-mails non bloquants : l'espace est créé même si l'envoi échoue.
  if (RESEND_API_KEY) {
    const inviteUrl = `${APP_URL}/?prof=${token}`;
    const resend = new Resend(RESEND_API_KEY);
    try {
      await resend.emails.send({ from: FROM_EMAIL, to: v.email, replyTo: 'contact@keypace.be', subject: `L'espace de ${v.name} est ouvert pour ${TRIAL_DAYS} jours`, html: selfOnboardWelcomeEmail(v.name, endsAt, inviteUrl) });
    } catch (e) { console.error('self-onboard welcome email error:', e.message || e); }
    try {
      await resend.emails.send({ from: FROM_EMAIL, to: 'contact@keypace.be', replyTo: v.email, subject: `Nouvel espace d'essai : ${v.name} (${v.seatCount} élèves)`, html: selfOnboardInternalEmail(v, endsAt, inviteUrl) });
    } catch (e) { console.error('self-onboard internal email error:', e.message || e); }
  }

  return res.status(201).json({ ok: true, inviteToken: token, name: institution.name, trialEndsAt: endsAt });
}

module.exports = async function handler(req, res) {
  setCorsOrigin(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET ?domain=xxx.be → l'inscription vérifie si l'email saisi correspond à un
  // établissement partenaire, pour afficher un signal visible ("compte rattaché
  // à ..."). Ne renvoie que le nom, jamais les sièges/licence/mot de passe.
  const domainParam = req.method === 'GET'
    ? ((req.query && req.query.domain) || new URL(req.url, `https://${req.headers.host}`).searchParams.get('domain'))
    : null;
  if (domainParam) {
    const domain = String(domainParam).toLowerCase().trim();
    const r = await sb(`/institutions?domains=cs.{"${encodeURIComponent(domain)}"}&select=name`);
    const inst = r.data && r.data[0];
    return res.json({ matched: !!inst, name: inst ? inst.name : null });
  }

  // GET → liste
  if (req.method === 'GET') {
    const r = await sb('/institutions?select=id,name,slug&order=name.asc');
    if (!r.ok) return res.status(500).json({ error: 'Erreur récupération établissements.' });
    return res.json(r.data || []);
  }

  if (req.method !== 'POST') return res.status(405).end();

  // POST avec x-admin-key → créer un établissement
  if (req.headers['x-admin-key']) {
    const ip = clientIp(req);
    const lockState = await adminKeyLockState(ip);
    if (lockState && lockState.locked_until && new Date(lockState.locked_until) > new Date()) {
      return res.status(429).json({ error: 'Trop de tentatives. Réessaie plus tard.' });
    }
    if (!ADMIN_KEY || !safeEqual(String(req.headers['x-admin-key'] || ''), ADMIN_KEY)) {
      await recordAdminKeyFailure(lockState, ip);
      return res.status(401).json({ error: 'Non autorisé.' });
    }
    await clearAdminKeyFailures(lockState);

    const { name, slug, passwordHash, seatCount, adminEmail } = req.body || {};
    if (!name || !slug || !passwordHash || !seatCount)
      return res.status(400).json({ error: 'Champs manquants (name, slug, passwordHash, seatCount).' });
    if (typeof seatCount !== 'number' || seatCount < 1)
      return res.status(400).json({ error: 'seatCount doit être un entier positif.' });

    const slugCheck = await sb(`/institutions?slug=eq.${encodeURIComponent(slug)}&select=id`);
    if (slugCheck.data && slugCheck.data.length > 0)
      return res.status(409).json({ error: 'Un établissement avec ce slug existe déjà.' });

    const create = await sb('/institutions', {
      method: 'POST',
      body: JSON.stringify({ name, slug, password_hash: passwordHash, seat_count: seatCount }),
    });
    if (!create.ok) return res.status(500).json({ error: 'Erreur création établissement.' });
    const institution = create.data[0];

    // Bootstrap du tout premier compte établissement (role='admin') : sans ça,
    // il n'existe aucun chemin produit pour créer ce rôle (seul un admin déjà
    // existant peut inviter via prof-invite-create, chicken-and-egg). Génère
    // un lien d'invitation ?prof=TOKEN réutilisant le flux d'inscription
    // standard (register.js), avec role='admin' porté par l'invitation.
    let adminInvite = null;
    if (adminEmail) {
      for (let i = 0; i < 5; i++) {
        const token = genInviteToken();
        const r = await sb('/prof_invites', {
          method: 'POST',
          body: JSON.stringify({ institution_id: institution.id, email: adminEmail, token, role: 'admin' }),
        });
        if (r.ok && r.data && r.data[0]) { adminInvite = { token, url: `${APP_URL}/?prof=${token}` }; break; }
      }
    }

    return res.status(201).json({ ...institution, adminInvite });
  }

  // POST action=send-link → version mobile : « m'envoyer le lien ». Envoie à
  // l'adresse saisie un mail d'invitation à tester KeyPace sur ordinateur.
  // Endpoint ouvert, donc limité (même adresse : 2/jour, même IP : 5/heure) et
  // fermé par défaut si la table de comptage est indisponible.
  if (req.body && req.body.action === 'send-link') {
    const to = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(to) || to.length > 254) return res.status(400).json({ error: 'Adresse email invalide.' });
    if (req.body.website) return res.json({ ok: true }); // champ piège anti-robot
    if (!RESEND_API_KEY) return res.status(500).json({ error: 'Email non configuré.' });

    const ip = clientIp(req);
    const since = (ms) => new Date(Date.now() - ms).toISOString();
    const byEmail = await sb(`/link_mail_requests?email=eq.${encodeURIComponent(to)}&created_at=gte.${encodeURIComponent(since(24 * 3600e3))}&select=id`);
    const byIp = await sb(`/link_mail_requests?ip=eq.${encodeURIComponent(ip)}&created_at=gte.${encodeURIComponent(since(3600e3))}&select=id`);
    if (!byEmail.ok || !byIp.ok) return res.status(503).json({ error: 'Service momentanément indisponible.' });
    if (byEmail.data.length >= 2 || byIp.data.length >= 5) return res.status(429).json({ error: 'Trop de demandes. Réessaie plus tard.' });
    await sb('/link_mail_requests', { method: 'POST', body: JSON.stringify({ email: to, ip }) });

    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Ton lien KeyPace : teste-le sur ton ordinateur',
      html: linkInviteEmail(`${APP_URL}/?utm_source=mail&utm_medium=mobile&utm_campaign=lien-ordinateur`),
    });
    if (error) { console.error('send-link error:', error.message || error); return res.status(502).json({ error: "Impossible d'envoyer l'email. Réessaie." }); }
    return res.json({ ok: true });
  }

  // POST action=self-onboard → un établissement ouvre lui-même son espace d'essai
  if (req.body && req.body.action === 'self-onboard') return selfOnboard(req, res);

  // POST action=contact → formulaire de contact licence
  const { name, email, count, message } = req.body || {};
  if (req.body && req.body.website) return res.json({ ok: true }); // champ piège anti-robot
  if (!name || !email || !count) return res.status(400).json({ error: 'Champs manquants.' });
  if (String(name).length > 200 || String(count).length > 20 || (message && String(message).length > 5000)) return res.status(400).json({ error: 'Champ trop long.' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(email)) || String(email).length > 254) return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'Email non configuré.' });

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeCount = escapeHtml(count);
  const safeMessage = message ? escapeHtml(message).replace(/\n/g, '<br>') : '';

  // Avant, le résultat de Resend n'était pas vérifié : « Demande envoyée ! »
  // s'affichait même si rien n'était parti (demande commerciale perdue).
  const resend = new Resend(RESEND_API_KEY);
  let sent;
  try {
  sent = await resend.emails.send({
    from: FROM_EMAIL,
    to: 'contact@keypace.be',
    replyTo: email,
    subject: `Demande de licence — ${name} (${count} étudiants)`,
    html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#faf9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#16140F">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border:1px solid #E7E1D5;border-radius:24px;overflow:hidden">
        <tr><td style="background:#FF4D2E;padding:24px 36px">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:rgba(255,255,255,0.2);border-radius:10px;width:34px;height:34px;text-align:center;vertical-align:middle">
              <span style="font-family:'Courier New',monospace;font-size:17px;font-weight:700;color:#fff">K</span>
            </td>
            <td style="padding-left:10px;font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.03em">KeyPace</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:30px 36px 10px">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#A39C8D;letter-spacing:.06em;text-transform:uppercase">Nouvelle demande de licence</p>
          <p style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.02em">${safeName}</p>
        </td></tr>
        <tr><td style="padding:20px 36px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F6F1;border-radius:14px;padding:20px 24px">
            <tr><td style="padding:6px 0;border-bottom:1px solid #EDE9E1">
              <span style="font-size:13px;font-weight:700;color:#8A8275">Établissement</span><br>
              <span style="font-size:15px;font-weight:600;color:#16140F">${safeName}</span>
            </td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #EDE9E1">
              <span style="font-size:13px;font-weight:700;color:#8A8275">Contact</span><br>
              <a href="mailto:${safeEmail}" style="font-size:15px;font-weight:600;color:#FF4D2E;text-decoration:none">${safeEmail}</a>
            </td></tr>
            <tr><td style="padding:6px 0${message ? ';border-bottom:1px solid #EDE9E1' : ''}">
              <span style="font-size:13px;font-weight:700;color:#8A8275">Nombre d'étudiants</span><br>
              <span style="font-size:15px;font-weight:600;color:#16140F">${safeCount}</span>
            </td></tr>
            ${message ? `<tr><td style="padding:6px 0">
              <span style="font-size:13px;font-weight:700;color:#8A8275">Message</span><br>
              <span style="font-size:14px;color:#3A352B;line-height:1.6">${safeMessage}</span>
            </td></tr>` : ''}
          </table>
        </td></tr>
        <tr><td style="padding:0 36px 28px;text-align:center">
          <a href="mailto:${safeEmail}?subject=Re: Licence KeyPace — ${encodeURIComponent(name)}"
             style="display:inline-block;background:#FF4D2E;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:11px">
            Répondre à ${safeEmail}
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid #E7E1D5;padding:18px 36px;text-align:center">
          <p style="margin:0;font-size:12px;color:#B5AE9F">Demande reçue via le formulaire de licence sur keypace.be</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });
  } catch (e) { sent = { error: e }; }
  if (!sent || sent.error) {
    console.error('licence contact error:', (sent && sent.error && (sent.error.message || sent.error)) || 'no response');
    return res.status(502).json({ error: "La demande n'a pas pu être envoyée. Réessaie, ou écris-nous à contact@keypace.be." });
  }

  res.json({ ok: true });
};
