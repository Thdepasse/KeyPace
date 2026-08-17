// Dashboard interne équipe : KPI de croissance, prospection écoles (mini-CRM)
// et calendrier de contenu marketing. Projet Vercel indépendant du site
// public keypace.be (dossier dashboard-app/, aucun domaine keypace.be n'y
// est attaché — l'isolation est structurelle, pas applicative).
// Accès protégé par le header x-admin-key (secret ADMIN_KEY propre à ce
// projet — pas de comptes individuels).
const crypto = require('crypto');
const { computeNextFollowup, summarizeAcquisition, summarizeB2B, summarizeEngagement, dailySignups, dailyLastActive, trafficConversionRate, contentGapsThisWeek, thisWeekRange, findDuplicateProspects, diffSummary, severelyOverdueFollowups, upcomingMeetings, excludeDismissedDuplicates, checklistItemStatus, FOLLOWUP_DAYS } = require('./_dashboard-logic');
const { classifyMessage } = require('./_zimbra-match');
const { fetchRecentMessages } = require('./_zimbra-soap');
const { fetchGA4Traffic, fetchGA4TrafficBreakdown } = require('./_ga4');
const { findPlace, fetchPlaceReviews } = require('./_google-places');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACE_ID = process.env.GOOGLE_PLACE_ID;
const VAULT_ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY; // hex 64 car. (32 octets), voir coffre-fort plus bas
const ZIMBRA_SYNC_WINDOW_DAYS = 3; // fenêtre glissante ; zimbra_sync_log évite les doublons

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

function queryParam(req, name) {
  if (req.query && req.query[name] != null) return req.query[name];
  try {
    return new URL(req.url, `https://${req.headers.host}`).searchParams.get(name);
  } catch (e) {
    return null;
  }
}

// Comparaison en temps constant (évite qu'une différence de timing sur la
// comparaison naïve `!==` ne laisse fuiter des informations sur le secret).
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Aucun appelant légitime cross-origin n'existe pour cette API (le frontend
// ne l'appelle qu'en same-origin) : seules les URLs du projet lui-même sont
// autorisées, la variante preview ayant un préfixe aléatoire par déploiement.
function isAllowedOrigin(origin) {
  if (!origin) return false;
  return origin === 'https://keypace-dashboard.vercel.app'
    || origin === 'https://keypace-dashboard-neuraleon-companys-projects.vercel.app'
    || /^https:\/\/keypace-dashboard-[a-z0-9]+-neuraleon-companys-projects\.vercel\.app$/.test(origin);
}

// ─── KPI ──────────────────────────────────────────────────────────
// Le trafic GA4 est en meilleur effort : une panne/mauvaise config de ce
// côté ne doit jamais faire échouer les KPI Supabase, qui sont indépendants.
async function fetchTrafficSafe() {
  try {
    return await fetchGA4Traffic({
      clientEmail: process.env.GA_CLIENT_EMAIL,
      privateKey: process.env.GA_PRIVATE_KEY,
      propertyId: process.env.GA_PROPERTY_ID,
    });
  } catch (e) {
    console.error('GA4 fetch failed:', e.message);
    return { error: e.message };
  }
}

// Pages les plus visitées, appareils, sources de trafic (30j) — appelé à
// part de kpis() car plus coûteux et moins souvent nécessaire.
async function trafficDetail(req, res) {
  const ga4Config = {
    clientEmail: process.env.GA_CLIENT_EMAIL,
    privateKey: process.env.GA_PRIVATE_KEY,
    propertyId: process.env.GA_PROPERTY_ID,
  };
  try {
    const result = await fetchGA4TrafficBreakdown(ga4Config);
    if (!result) return res.json({ configured: false });
    return res.json({ configured: true, ...result });
  } catch (e) {
    console.error('GA4 traffic-detail failed:', e.message);
    return res.json({ configured: true, error: e.message });
  }
}

async function kpis(req, res) {
  const now = Date.now();
  const week = thisWeekRange(now);
  const [usersR, instR, prospR, progR, certR, wsR, reviewsPendingR, calendarWeekR, traffic] = await Promise.all([
    sb('/users?select=plan,created_at'),
    sb('/institutions?select=seat_count'),
    sb('/school_prospects?select=id,school_name,status,next_followup_at,meeting_at'),
    sb('/progress?select=updated_at'),
    sb('/certificates?select=id'),
    sb('/weekly_scores?select=id'),
    sb('/reviews?select=id&status=eq.pending'),
    sb(`/content_calendar?select=scheduled_date&scheduled_date=gte.${week.start}&scheduled_date=lte.${week.end}`),
    fetchTrafficSafe(),
  ]);
  if (!usersR.ok || !instR.ok || !prospR.ok || !progR.ok || !certR.ok || !wsR.ok || !reviewsPendingR.ok || !calendarWeekR.ok) {
    return res.status(500).json({ error: 'Erreur récupération KPI.' });
  }
  const acquisition = summarizeAcquisition(usersR.data || [], now);
  const scheduledDates = (calendarWeekR.data || []).map((c) => c.scheduled_date);
  const prospects = prospR.data || [];
  return res.json({
    acquisition: {
      ...acquisition,
      traffic,
      conversionToSignup30d: traffic && !traffic.error ? trafficConversionRate(acquisition.signups30d, traffic.visitors30d) : null,
    },
    b2b: summarizeB2B(instR.data || [], prospects, now),
    engagement: summarizeEngagement(progR.data || [], certR.data || [], wsR.data || [], now),
    trend: {
      signups: dailySignups(usersR.data || [], now, 30),
      lastActive: dailyLastActive(progR.data || [], now, 30),
    },
    brief: {
      reviewsPending: (reviewsPendingR.data || []).length,
      ...contentGapsThisWeek(scheduledDates, now),
      overdueFollowups: severelyOverdueFollowups(prospects, now).map((p) => ({ id: p.id, school_name: p.school_name, next_followup_at: p.next_followup_at })),
      upcomingMeetings: upcomingMeetings(prospects, now).map((p) => ({ id: p.id, school_name: p.school_name, meeting_at: p.meeting_at })),
    },
  });
}

// ─── Coffre-fort de secrets ─────────────────────────────────────────
// Chiffrement au repos (AES-256-GCM) : protège contre une fuite/dump direct
// de la table vault_secrets. Ne protège PAS contre une fuite de l'ADMIN_KEY
// (accès complet à l'API normale, y compris révéler un secret) — voir la
// note de sécurité dans supabase-schema.sql. N'y jamais stocker la clé
// service Supabase ni la clé secrète Stripe (ce sont les clés qui donnent
// accès à l'endroit où ce coffre vit ; les y stocker n'apporte aucune
// protection réelle).
function vaultEncrypt(plaintext) {
  const key = Buffer.from(VAULT_ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(12); // 12 octets recommandés pour GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext: Buffer.concat([encrypted, authTag]).toString('base64'), iv: iv.toString('base64') };
}

function vaultDecrypt(ciphertextB64, ivB64) {
  const key = Buffer.from(VAULT_ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(ivB64, 'base64');
  const data = Buffer.from(ciphertextB64, 'base64');
  const authTag = data.subarray(data.length - 16);
  const encrypted = data.subarray(0, data.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

async function vaultList(req, res) {
  if (!VAULT_ENCRYPTION_KEY) return res.status(500).json({ error: 'Coffre-fort indisponible : VAULT_ENCRYPTION_KEY absente côté serveur.' });
  // Jamais le secret déchiffré dans la liste — uniquement les métadonnées.
  const r = await sb('/vault_secrets?select=id,label,username,notes,category,created_at,updated_at&order=label.asc');
  if (!r.ok) return res.status(500).json({ error: 'Erreur récupération du coffre-fort.' });
  return res.json({ items: r.data || [] });
}

async function vaultReveal(req, res) {
  if (!VAULT_ENCRYPTION_KEY) return res.status(500).json({ error: 'Coffre-fort indisponible : VAULT_ENCRYPTION_KEY absente côté serveur.' });
  const id = queryParam(req, 'id');
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const r = await sb(`/vault_secrets?id=eq.${encodeURIComponent(id)}&select=secret_ciphertext,secret_iv`);
  const row = r.data && r.data[0];
  if (!r.ok || !row) return res.status(404).json({ error: 'Secret introuvable.' });
  try {
    return res.json({ secret: vaultDecrypt(row.secret_ciphertext, row.secret_iv) });
  } catch (e) {
    console.error('vaultReveal decrypt error:', e);
    return res.status(500).json({ error: 'Erreur de déchiffrement.' });
  }
}

async function vaultCreate(req, res) {
  if (!VAULT_ENCRYPTION_KEY) return res.status(500).json({ error: 'Coffre-fort indisponible : VAULT_ENCRYPTION_KEY absente côté serveur.' });
  const { label, username, secret, notes, category } = req.body || {};
  if (!label || !secret) return res.status(400).json({ error: 'Libellé ou secret manquant.' });
  const { ciphertext, iv } = vaultEncrypt(secret);
  const r = await sb('/vault_secrets', {
    method: 'POST',
    body: JSON.stringify({
      label,
      username: username || null,
      secret_ciphertext: ciphertext,
      secret_iv: iv,
      notes: notes || null,
      category: category || null,
    }),
  });
  if (!r.ok) return res.status(500).json({ error: 'Erreur création du secret.' });
  const { secret_ciphertext, secret_iv, ...safe } = r.data[0];
  return res.status(201).json(safe);
}

async function vaultUpdate(req, res) {
  if (!VAULT_ENCRYPTION_KEY) return res.status(500).json({ error: 'Coffre-fort indisponible : VAULT_ENCRYPTION_KEY absente côté serveur.' });
  const { id, label, username, secret, notes, category } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const patch = { updated_at: new Date().toISOString() };
  if (label !== undefined) patch.label = label;
  if (username !== undefined) patch.username = username || null;
  if (notes !== undefined) patch.notes = notes || null;
  if (category !== undefined) patch.category = category || null;
  if (secret) {
    const { ciphertext, iv } = vaultEncrypt(secret);
    patch.secret_ciphertext = ciphertext;
    patch.secret_iv = iv;
  }
  const r = await sb(`/vault_secrets?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  if (!r.ok || !r.data || !r.data.length) return res.status(500).json({ error: 'Erreur mise à jour du secret.' });
  const { secret_ciphertext, secret_iv, ...safe } = r.data[0];
  return res.json(safe);
}

async function vaultDelete(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const r = await sb(`/vault_secrets?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return res.status(500).json({ error: 'Erreur suppression du secret.' });
  return res.json({ ok: true });
}

// ─── Répertoire de liens ────────────────────────────────────────────
// Raccourcis vers des consoles d'admin (Supabase, Vercel, Stripe...) —
// jamais de secret ici, uniquement des URL.
async function linksList(req, res) {
  const r = await sb('/resource_links?select=*&order=category.asc,label.asc');
  if (!r.ok) return res.status(500).json({ error: 'Erreur récupération des liens.' });
  return res.json({ items: r.data || [] });
}

async function linkCreate(req, res) {
  const { label, url, category } = req.body || {};
  if (!label || !url) return res.status(400).json({ error: 'Libellé ou URL manquant.' });
  const r = await sb('/resource_links', { method: 'POST', body: JSON.stringify({ label, url, category: category || null }) });
  if (!r.ok) return res.status(500).json({ error: 'Erreur création du lien.' });
  return res.status(201).json(r.data[0]);
}

async function linkDelete(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const r = await sb(`/resource_links?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return res.status(500).json({ error: 'Erreur suppression du lien.' });
  return res.json({ ok: true });
}

// ─── Checklist sécurité périodique ──────────────────────────────────
// Contenu curé manuellement à partir de standards connus (OWASP Top 10 /
// ASVS, RGPD) et adapté à la stack réelle de KeyPace (Next.js/Vercel,
// Supabase, Zimbra). Statique et versionné dans le code (pas de génération
// IA en runtime) — seule la date de dernière vérification par item vit en
// base (voir security_checklist_checks dans supabase-schema.sql).
const SECURITY_CHECKLIST_ITEMS = [
  // ── Authentification & accès ──
  { key: 'auth-secret-rotation', category: 'Authentification & accès', label: "Aucun secret actif n'a jamais été partagé en clair (chat, email, capture d'écran)", why: "Un secret vu en clair une seule fois doit être considéré comme compromis, même si le canal semblait privé. Vérifier qu'ADMIN_KEY, les clés API et mots de passe n'ont pas fuité, et les tourner sinon.", frequencyDays: 90 },
  { key: 'auth-access-review', category: 'Authentification & accès', label: "Revue des accès : qui possède l'ADMIN_KEY du dashboard, l'accès Supabase et l'accès Vercel", why: "Moins il y a de personnes avec un accès admin, plus la surface d'attaque humaine est petite. Révoquer les accès des personnes qui n'en ont plus l'usage.", frequencyDays: 180 },
  { key: 'auth-password-hashing', category: 'Authentification & accès', label: "Les mots de passe utilisateurs sont hashés avec un algorithme robuste (bcrypt/argon2/scrypt), jamais en clair ni en simple SHA", why: "En cas de fuite de la base, un hash faible ou un mot de passe en clair expose directement les comptes utilisateurs.", frequencyDays: 365 },
  { key: 'auth-brute-force', category: 'Authentification & accès', label: "Limitation du nombre de tentatives sur les endpoints de connexion et l'ADMIN_KEY (rate limiting)", why: "Sans limitation, un identifiant ou un mot de passe faible peut être deviné par essais successifs (brute force).", frequencyDays: 180 },
  { key: 'auth-session-expiry', category: 'Authentification & accès', label: "Les sessions utilisateurs expirent dans un délai raisonnable et peuvent être révoquées", why: "Une session qui ne meurt jamais reste exploitable indéfiniment si un token fuite (appareil volé, poste partagé).", frequencyDays: 365 },
  { key: 'auth-mfa', category: 'Authentification & accès', label: "Authentification à plusieurs facteurs (MFA) activée sur les comptes critiques (Vercel, Supabase, Zimbra/email, registrar du domaine)", why: "Recommandation explicite de la Commission européenne (Your Europe) : le MFA arrête la grande majorité des prises de contrôle de compte même si le mot de passe fuite.", frequencyDays: 180 },

  // ── Données & RGPD ──
  { key: 'data-privacy-policy', category: 'Données & RGPD', label: "La politique de confidentialité reflète exactement les données réellement collectées (y compris Analytics, cookies)", why: "Un décalage entre ce qui est déclaré et ce qui est fait est une non-conformité RGPD directe, et une perte de confiance si détecté par un utilisateur.", frequencyDays: 180 },
  { key: 'data-cookie-consent', category: 'Données & RGPD', label: "La bannière de consentement cookies bloque bien tout traceur (Google Analytics...) tant qu'il n'y a pas d'accord", why: "Charger un traceur avant consentement est une infraction RGPD/ePrivacy, même si la bannière s'affiche visuellement.", frequencyDays: 90 },
  { key: 'data-minors', category: 'Données & RGPD', label: "Les données collectées sur les élèves mineurs sont minimales, et la base légale (contrat école / consentement parental) est claire", why: "KeyPace a des utilisateurs mineurs via les écoles : le RGPD impose un cadre renforcé pour les données d'enfants (minimisation, finalité restreinte, pas de profilage publicitaire).", frequencyDays: 180 },
  { key: 'data-deletion-process', category: 'Données & RGPD', label: "Il existe une procédure claire pour supprimer ou exporter les données d'un utilisateur qui en fait la demande", why: "Le droit à l'effacement et à la portabilité sont des obligations RGPD ; sans procédure documentée, une demande réelle risque d'être mal ou pas traitée dans les délais.", frequencyDays: 365 },
  { key: 'data-subprocessors', category: 'Données & RGPD', label: "Les sous-traitants qui touchent des données personnelles (Supabase, Vercel, outil d'emailing...) ont un DPA/accord de traitement en règle", why: "En cas de contrôle ou d'incident chez un sous-traitant, l'absence d'accord de traitement engage directement la responsabilité de KeyPace.", frequencyDays: 365 },
  { key: 'data-retention', category: 'Données & RGPD', label: "Les comptes et données inactifs depuis longtemps sont purgés ou archivés selon une politique de rétention définie", why: "Garder indéfiniment des données sans finalité active est une violation du principe de minimisation RGPD, et élargit inutilement la surface exposée en cas de fuite.", frequencyDays: 365 },

  // ── Infrastructure & code ──
  { key: 'infra-rls-policies', category: 'Infrastructure & code', label: "Chaque table Supabase exposée via la clé anonyme a des policies RLS explicites (pas juste RLS activé sans règle)", why: "Activer Row Level Security sans policy bloque tout par défaut pour la clé anonyme, ce qui est sûr — mais toute policy ajoutée ensuite doit être relue pour vérifier qu'elle ne réouvre pas plus large que prévu.", frequencyDays: 180 },
  { key: 'infra-service-key-exposure', category: 'Infrastructure & code', label: "La clé service-role Supabase et les clés secrètes (Stripe...) ne sont jamais envoyées au navigateur", why: "Une clé service-role dans le bundle frontend donne un accès total à la base à quiconque lirait le code source côté client.", frequencyDays: 180 },
  { key: 'infra-cors', category: 'Infrastructure & code', label: "CORS reste restreint à une liste d'origines connues, sans retour accidentel à un wildcard *", why: "Un CORS ouvert permet à n'importe quel site tiers d'appeler l'API du dashboard depuis le navigateur d'un utilisateur connecté.", frequencyDays: 180 },
  { key: 'infra-security-headers', category: 'Infrastructure & code', label: "En-têtes de sécurité HTTP en place (CSP, X-Content-Type-Options, Strict-Transport-Security, X-Frame-Options)", why: "Ces en-têtes réduisent l'impact de failles XSS ou de clickjacking même si une injection passe malgré tout.", frequencyDays: 365 },
  { key: 'infra-dependencies', category: 'Infrastructure & code', label: "Audit des dépendances npm (vulnérabilités connues) et mise à jour des paquets critiques", why: "La majorité des failles exploitées en pratique viennent de dépendances tierces obsolètes, pas de code applicatif.", frequencyDays: 90 },
  { key: 'infra-no-secrets-in-code', category: 'Infrastructure & code', label: "Aucun secret en clair dans le code source ou l'historique git (uniquement en variables d'environnement)", why: "Un secret commité, même supprimé ensuite, reste récupérable dans l'historique git tant que le dépôt n'est pas nettoyé — et le secret doit être tourné, pas juste retiré.", frequencyDays: 180 },
  { key: 'infra-security-testing', category: 'Infrastructure & code', label: "Test de sécurité périodique du site et des services (scan de vulnérabilités basique, ou test d'intrusion léger)", why: "Recommandation explicite de la Commission européenne (Your Europe) : un test régulier détecte des failles avant qu'un tiers malveillant ne les trouve.", frequencyDays: 365 },

  // ── Supervision & continuité ──
  { key: 'ops-backups', category: 'Supervision & continuité', label: "Sauvegardes régulières de la base Supabase, et test réel de restauration (pas juste vérifier qu'un fichier existe)", why: "Une sauvegarde jamais restaurée peut s'avérer corrompue ou incomplète le jour où elle est vraiment nécessaire.", frequencyDays: 180 },
  { key: 'ops-incident-plan', category: 'Supervision & continuité', label: "Un plan simple existe en cas de fuite de données ou de compromission (qui prévenir, quoi couper en premier)", why: "Improviser une réponse à incident sous stress mène presque toujours à des décisions plus lentes ou plus dommageables qu'un plan préparé à froid.", frequencyDays: 365 },
  { key: 'ops-https', category: 'Supervision & continuité', label: "Le site est servi en HTTPS partout, sans contenu mixte (ressources chargées en http:// sur une page https://)", why: "Le contenu mixte peut être intercepté ou modifié en clair, et certains navigateurs bloquent ou avertissent dessus.", frequencyDays: 365 },
  { key: 'ops-email-auth', category: 'Supervision & continuité', label: "Enregistrements SPF/DKIM/DMARC corrects pour le domaine d'envoi (Zimbra) afin d'éviter le spoofing et le classement en spam", why: "Sans ces enregistrements, des emails peuvent être envoyés en usurpant le domaine KeyPace, et les emails légitimes atterrissent plus facilement en spam.", frequencyDays: 365 },
];

async function securityChecklistList(req, res) {
  const r = await sb('/security_checklist_checks?select=*');
  if (!r.ok) return res.status(500).json({ error: 'Erreur récupération de la checklist.' });
  const checksByKey = Object.fromEntries((r.data || []).map((c) => [c.item_key, c]));
  const now = Date.now();
  const items = SECURITY_CHECKLIST_ITEMS.map((item) => {
    const check = checksByKey[item.key];
    const { overdue, daysSinceCheck } = checklistItemStatus(check ? check.checked_at : null, item.frequencyDays, now);
    return { ...item, checkedAt: check ? check.checked_at : null, notes: check ? check.notes : null, overdue, daysSinceCheck };
  });
  return res.json({ items });
}

async function securityChecklistCheck(req, res) {
  const { key, notes } = req.body || {};
  if (!key || !SECURITY_CHECKLIST_ITEMS.some((i) => i.key === key)) return res.status(400).json({ error: 'Item de checklist inconnu.' });
  const r = await sb('/security_checklist_checks?on_conflict=item_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ item_key: key, checked_at: new Date().toISOString(), notes: notes || null }),
  });
  if (!r.ok) return res.status(500).json({ error: 'Erreur enregistrement de la vérification.' });
  return res.json(r.data[0]);
}

// ─── Backlog de développement (bugs, features, dette technique) ───
async function devBacklogList(req, res) {
  const r = await sb('/dev_backlog?select=*&order=updated_at.desc');
  if (!r.ok) return res.status(500).json({ error: 'Erreur récupération du backlog.' });
  return res.json({ items: r.data || [] });
}

async function devIssueCreate(req, res) {
  const { title, description, item_type, priority, status } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Titre manquant.' });
  const r = await sb('/dev_backlog', {
    method: 'POST',
    body: JSON.stringify({
      title,
      description: description || null,
      item_type: item_type || 'feature',
      priority: priority || 'moyenne',
      status: status || 'backlog',
    }),
  });
  if (!r.ok) return res.status(500).json({ error: 'Erreur création du ticket.' });
  await logActivity('dev_issue', r.data[0].id, 'created', `Ticket créé : ${title}.`);
  return res.status(201).json(r.data[0]);
}

const DEV_ISSUE_FIELDS = ['title', 'description', 'item_type', 'priority', 'status'];

async function devIssueUpdate(req, res) {
  const { id, ...fields } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const patch = {};
  for (const k of DEV_ISSUE_FIELDS) if (k in fields) patch[k] = fields[k];
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  const beforeR = await sb(`/dev_backlog?id=eq.${encodeURIComponent(id)}&select=*`);
  const before = beforeR.data && beforeR.data[0];
  patch.updated_at = new Date().toISOString();
  const r = await sb(`/dev_backlog?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  if (!r.ok || !r.data || !r.data.length) return res.status(500).json({ error: 'Erreur mise à jour du ticket.' });
  const summary = diffSummary(before, patch, DEV_FIELD_LABELS);
  if (summary) await logActivity('dev_issue', id, 'updated', summary);
  if ('status' in patch && before && before.status !== patch.status) {
    await logActivity('dev_issue', id, 'status_changed', `${DEV_STATUS_LABELS_FR[before.status] || before.status} → ${DEV_STATUS_LABELS_FR[patch.status] || patch.status}`);
  }
  return res.json(r.data[0]);
}

async function devIssueDelete(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const r = await sb(`/dev_backlog?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return res.status(500).json({ error: 'Erreur suppression du ticket.' });
  await deleteActivityLog('dev_issue', id);
  return res.json({ ok: true });
}

// ─── Veille concurrentielle ─────────────────────────────────────────
async function competitorsList(req, res) {
  const r = await sb('/competitors?select=*&order=name.asc');
  if (!r.ok) return res.status(500).json({ error: 'Erreur récupération des concurrents.' });
  return res.json({ items: r.data || [] });
}

async function competitorCreate(req, res) {
  const { name, url, strengths, weaknesses, estimated_revenue, notes } = req.body || {};
  if (!name || !url) return res.status(400).json({ error: 'Nom ou URL manquant.' });
  const r = await sb('/competitors', {
    method: 'POST',
    body: JSON.stringify({
      name, url,
      strengths: strengths || null,
      weaknesses: weaknesses || null,
      estimated_revenue: estimated_revenue || null,
      notes: notes || null,
    }),
  });
  if (!r.ok) return res.status(500).json({ error: 'Erreur création du concurrent.' });
  await logActivity('competitor', r.data[0].id, 'created', `Concurrent ajouté : ${name}.`);
  return res.status(201).json(r.data[0]);
}

const COMPETITOR_FIELDS = ['name', 'url', 'strengths', 'weaknesses', 'estimated_revenue', 'notes'];

async function competitorUpdate(req, res) {
  const { id, ...fields } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const patch = {};
  for (const k of COMPETITOR_FIELDS) if (k in fields) patch[k] = fields[k];
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  const beforeR = await sb(`/competitors?id=eq.${encodeURIComponent(id)}&select=*`);
  const before = beforeR.data && beforeR.data[0];
  patch.updated_at = new Date().toISOString();
  const r = await sb(`/competitors?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  if (!r.ok || !r.data || !r.data.length) return res.status(500).json({ error: 'Erreur mise à jour du concurrent.' });
  const summary = diffSummary(before, patch, COMPETITOR_FIELD_LABELS);
  if (summary) await logActivity('competitor', id, 'updated', summary);
  return res.json(r.data[0]);
}

async function competitorDelete(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const r = await sb(`/competitors?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return res.status(500).json({ error: 'Erreur suppression du concurrent.' });
  await deleteActivityLog('competitor', id);
  return res.json({ ok: true });
}

// Hash du texte visible d'une page (scripts/styles/balises retirés, espaces
// normalisés) — volontairement pas un hash du HTML brut, pour éviter les faux
// positifs à chaque vérification (nonce, cache-busting, pub/analytics).
function extractTextHash(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Aucune IA ici : un simple hash comparé au précédent, cohérent avec le choix
// déjà fait pour la banque d'idées (templates/règles, pas de dépendance IA).
// Signale qu'un changement est détecté ; charge à l'utilisateur de vérifier
// manuellement ce qui a changé et de mettre à jour forces/faiblesses/CA.
async function competitorCheck(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const compR = await sb(`/competitors?id=eq.${encodeURIComponent(id)}&select=*`);
  const competitor = compR.data && compR.data[0];
  if (!competitor) return res.status(404).json({ error: 'Concurrent introuvable.' });
  let html;
  try {
    const pageR = await fetch(competitor.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KeyPaceDashboardBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    html = await pageR.text();
  } catch (e) {
    return res.status(502).json({ error: `Impossible de joindre ${competitor.url} : ${e.message}` });
  }
  const newHash = extractTextHash(html);
  const changed = !!competitor.last_snapshot_hash && newHash !== competitor.last_snapshot_hash;
  const now = new Date().toISOString();
  const r = await sb(`/competitors?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ last_snapshot_hash: newHash, last_checked_at: now, content_changed: changed }),
  });
  if (!r.ok || !r.data || !r.data.length) return res.status(500).json({ error: 'Erreur mise à jour après vérification.' });
  await logActivity('competitor', id, 'note', changed ? '🔎 Vérification : changement détecté sur le site.' : '🔎 Vérification : aucun changement détecté.');
  return res.json(r.data[0]);
}

// File d'attente de concurrents suggérés (pas de recherche IA en runtime —
// alimentée manuellement au fil des sessions de veille, voir seed ponctuel).
async function competitorSuggestionsList(req, res) {
  const r = await sb('/competitor_suggestions?status=eq.pending&select=*&order=created_at.asc');
  if (!r.ok) return res.status(500).json({ error: 'Erreur récupération des suggestions.' });
  return res.json({ items: r.data || [] });
}

async function competitorSuggestionCreate(req, res) {
  const { name, url, reason } = req.body || {};
  if (!name || !url) return res.status(400).json({ error: 'Nom ou URL manquant.' });
  const r = await sb('/competitor_suggestions', {
    method: 'POST',
    body: JSON.stringify({ name, url, reason: reason || null }),
  });
  if (!r.ok) return res.status(500).json({ error: 'Erreur création de la suggestion.' });
  return res.status(201).json(r.data[0]);
}

async function competitorSuggestionAdd(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const sugR = await sb(`/competitor_suggestions?id=eq.${encodeURIComponent(id)}&select=*`);
  const suggestion = sugR.data && sugR.data[0];
  if (!suggestion) return res.status(404).json({ error: 'Suggestion introuvable.' });
  const r = await sb('/competitors', {
    method: 'POST',
    body: JSON.stringify({ name: suggestion.name, url: suggestion.url, notes: suggestion.reason || null }),
  });
  if (!r.ok) return res.status(500).json({ error: 'Erreur création du concurrent.' });
  await sb(`/competitor_suggestions?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'added' }),
  });
  await logActivity('competitor', r.data[0].id, 'created', `Concurrent ajouté depuis une suggestion : ${suggestion.name}.`);
  return res.status(201).json(r.data[0]);
}

async function competitorSuggestionDismiss(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const r = await sb(`/competitor_suggestions?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'dismissed' }),
  });
  if (!r.ok) return res.status(500).json({ error: 'Erreur mise à jour de la suggestion.' });
  return res.json({ ok: true });
}

// ─── Historique par élément (activity_log) ─────────────────────────
// Best-effort : un échec d'écriture du journal ne doit jamais faire échouer
// l'action principale (création/modification d'un prospect ou d'un contenu).
async function logActivity(entityType, entityId, action, detail) {
  try {
    await sb('/activity_log', {
      method: 'POST',
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, action, detail: detail || null }),
    });
  } catch (e) {
    console.error('logActivity error:', e);
  }
}

async function deleteActivityLog(entityType, entityId) {
  try {
    await sb(`/activity_log?entity_type=eq.${entityType}&entity_id=eq.${encodeURIComponent(entityId)}`, { method: 'DELETE' });
  } catch (e) {
    console.error('deleteActivityLog error:', e);
  }
}

async function activityLogList(req, res) {
  const entityType = queryParam(req, 'entity_type');
  const entityId = queryParam(req, 'entity_id');
  if (!entityType || !entityId) return res.status(400).json({ error: 'Paramètres manquants.' });
  const r = await sb(`/activity_log?entity_type=eq.${encodeURIComponent(entityType)}&entity_id=eq.${encodeURIComponent(entityId)}&order=created_at.desc&limit=50`);
  if (!r.ok) return res.status(500).json({ error: "Erreur récupération de l'historique." });
  return res.json({ items: r.data || [] });
}

async function addNote(req, res) {
  const { entity_type, entity_id, note } = req.body || {};
  if (!entity_type || !entity_id || !note) return res.status(400).json({ error: 'Champs manquants.' });
  await logActivity(entity_type, entity_id, 'note', String(note).trim().slice(0, 2000));
  return res.json({ ok: true });
}

const STATUS_LABELS_FR = { a_contacter: 'À contacter', envoye: 'Envoyé', relance: 'Relancé', repondu: 'Répondu', en_negociation: 'Négociation', signe: 'Signé', perdu: 'Perdu' };
const PROSPECT_FIELD_LABELS = { school_name: 'École', contact_name: 'Contact', contact_email: 'Email', contact_phone: 'Téléphone', city: 'Ville', notes: 'Notes', meeting_at: 'Rendez-vous', estimated_students: 'Effectif estimé', estimated_students_source: 'Source effectif' };
const EVENT_FIELD_LABELS = { title: 'Titre', content_type: 'Type', account: 'Compte', caption: 'Texte du post', scheduled_date: 'Date planifiée', link: 'Lien', notes: 'Notes' };
const CONTENT_STATUS_LABELS_FR = { idee: 'Idée', a_faire: 'À faire', pret: 'Prêt', publie: 'Publié' };
const DEV_FIELD_LABELS = { title: 'Titre', description: 'Description', item_type: 'Type', priority: 'Priorité' };
const DEV_STATUS_LABELS_FR = { backlog: 'Backlog', a_faire: 'À faire', en_cours: 'En cours', fait: 'Fait' };
const COMPETITOR_FIELD_LABELS = { name: 'Nom', url: 'URL', strengths: 'Forces', weaknesses: 'Faiblesses', estimated_revenue: 'CA estimé', notes: 'Notes' };

// ─── Prospection écoles ───────────────────────────────────────────
async function prospectsList(req, res) {
  const [r, lastSyncR, dismissedR] = await Promise.all([
    sb('/school_prospects?select=*&order=next_followup_at.asc.nullslast,created_at.desc'),
    sb('/zimbra_sync_log?select=processed_at&order=processed_at.desc&limit=1'),
    sb('/dismissed_duplicates?select=dedup_key'),
  ]);
  if (!r.ok) return res.status(500).json({ error: 'Erreur récupération prospects.' });
  const lastSyncAt = (lastSyncR.ok && lastSyncR.data && lastSyncR.data[0] && lastSyncR.data[0].processed_at) || null;
  const dismissedKeys = (dismissedR.data || []).map((d) => d.dedup_key);
  const duplicateGroups = excludeDismissedDuplicates(findDuplicateProspects(r.data || []), dismissedKeys)
    .map((g) => ({ key: g.key, ids: g.prospects.map((p) => p.id) }));
  return res.json({ items: r.data || [], lastSyncAt, duplicateGroups });
}

async function dismissDuplicate(req, res) {
  const { key } = req.body || {};
  if (!key) return res.status(400).json({ error: 'Clé manquante.' });
  const r = await sb('/dismissed_duplicates?on_conflict=dedup_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ dedup_key: key }),
  });
  if (!r.ok) return res.status(500).json({ error: "Erreur d'enregistrement." });
  return res.json({ ok: true });
}

async function prospectCreate(req, res) {
  const { school_name, contact_name, contact_email, contact_phone, city, notes, status, meeting_at, estimated_students, estimated_students_source } = req.body || {};
  if (!school_name) return res.status(400).json({ error: "Nom d'école manquant." });
  const r = await sb('/school_prospects', {
    method: 'POST',
    body: JSON.stringify({
      school_name,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      city: city || null,
      notes: notes || null,
      status: status || undefined, // undefined => laisse la valeur par défaut de la table
      meeting_at: meeting_at || null,
      estimated_students: estimated_students || null,
      estimated_students_source: estimated_students_source || null,
    }),
  });
  if (!r.ok) return res.status(500).json({ error: 'Erreur création prospect.' });
  await logActivity('prospect', r.data[0].id, 'created', `Dossier créé pour ${school_name}.`);
  return res.status(201).json(r.data[0]);
}

const PROSPECT_FIELDS = ['school_name', 'contact_name', 'contact_email', 'contact_phone', 'city', 'notes', 'status', 'meeting_at', 'estimated_students', 'estimated_students_source'];

// Automatisation : une école qui signe mérite d'être annoncée. Crée une idée
// de contenu prête à planifier dans le calendrier marketing, best-effort (un
// échec ici ne doit jamais faire échouer la mise à jour du statut).
async function autoCreateSignedContentIdea(schoolName, prospectId) {
  try {
    const r = await sb('/content_calendar', {
      method: 'POST',
      body: JSON.stringify({
        title: `Nouveau client : ${schoolName}`,
        content_type: 'post',
        platforms: [],
        account: 'keypace',
        status: 'idee',
        notes: `Idée créée automatiquement suite à la signature de ${schoolName}. Partager la bonne nouvelle !`,
      }),
    });
    if (r.ok && r.data && r.data[0]) {
      await logActivity('content', r.data[0].id, 'created', `Idée créée automatiquement suite à la signature de ${schoolName}.`);
      await logActivity('prospect', prospectId, 'note', `Idée de contenu "Nouveau client : ${schoolName}" créée automatiquement.`);
    }
  } catch (e) {
    console.error('autoCreateSignedContentIdea error:', e);
  }
}

async function prospectUpdate(req, res) {
  const { id, ...fields } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const patch = {};
  for (const k of PROSPECT_FIELDS) if (k in fields) patch[k] = fields[k];
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  const beforeR = await sb(`/school_prospects?id=eq.${encodeURIComponent(id)}&select=*`);
  const before = beforeR.data && beforeR.data[0];
  patch.updated_at = new Date().toISOString();
  const r = await sb(`/school_prospects?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  if (!r.ok || !r.data || !r.data.length) return res.status(500).json({ error: 'Erreur mise à jour prospect.' });
  const summary = diffSummary(before, patch, PROSPECT_FIELD_LABELS);
  if (summary) await logActivity('prospect', id, 'updated', summary);
  if ('status' in patch && before && before.status !== patch.status) {
    await logActivity('prospect', id, 'status_changed', `${STATUS_LABELS_FR[before.status] || before.status} → ${STATUS_LABELS_FR[patch.status] || patch.status}`);
    if (patch.status === 'signe') await autoCreateSignedContentIdea(r.data[0].school_name, id);
  }
  return res.json(r.data[0]);
}

// Transition de statut : programme automatiquement la relance suivante.
async function prospectLogContact(req, res) {
  const { id, status } = req.body || {};
  if (!id || !status) return res.status(400).json({ error: 'id ou status manquant.' });
  if (!(status in FOLLOWUP_DAYS)) return res.status(400).json({ error: 'Statut inconnu.' });
  const beforeR = await sb(`/school_prospects?id=eq.${encodeURIComponent(id)}&select=status,school_name`);
  const beforeRow = beforeR.data && beforeR.data[0];
  const oldStatus = beforeRow && beforeRow.status;
  const now = Date.now();
  const patch = {
    status,
    last_contact_at: new Date(now).toISOString(),
    next_followup_at: computeNextFollowup(status, now),
    updated_at: new Date(now).toISOString(),
  };
  const r = await sb(`/school_prospects?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  if (!r.ok || !r.data || !r.data.length) return res.status(500).json({ error: 'Erreur mise à jour du statut.' });
  if (oldStatus !== status) {
    await logActivity('prospect', id, 'status_changed', `${STATUS_LABELS_FR[oldStatus] || oldStatus || '—'} → ${STATUS_LABELS_FR[status] || status}`);
    if (status === 'signe') await autoCreateSignedContentIdea(r.data[0].school_name, id);
  }
  return res.json(r.data[0]);
}

async function prospectDelete(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const r = await sb(`/school_prospects?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return res.status(500).json({ error: 'Erreur suppression prospect.' });
  await deleteActivityLog('prospect', id);
  return res.json({ ok: true });
}

// ─── Calendrier marketing ─────────────────────────────────────────
async function calendarList(req, res) {
  const month = queryParam(req, 'month') || '';
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Paramètre month invalide (attendu YYYY-MM).' });
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10); // premier jour du mois suivant
  const [scheduledR, backlogR] = await Promise.all([
    sb(`/content_calendar?select=*&scheduled_date=gte.${start}&scheduled_date=lt.${end}&order=scheduled_date.asc`),
    sb('/content_calendar?select=*&scheduled_date=is.null&order=created_at.desc'),
  ]);
  if (!scheduledR.ok || !backlogR.ok) return res.status(500).json({ error: 'Erreur récupération calendrier.' });
  return res.json({ scheduled: scheduledR.data || [], backlog: backlogR.data || [] });
}

async function eventCreate(req, res) {
  const { title, content_type, platforms, account, caption, status, scheduled_date, link, notes, idea_key } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Titre manquant.' });
  const r = await sb('/content_calendar', {
    method: 'POST',
    body: JSON.stringify({
      title,
      content_type: content_type || 'post',
      platforms: Array.isArray(platforms) ? platforms : [],
      account: account || 'keypace',
      caption: caption || null,
      status: status || 'idee',
      scheduled_date: scheduled_date || null,
      link: link || null,
      notes: notes || null,
      idea_key: idea_key || null,
    }),
  });
  if (!r.ok) return res.status(500).json({ error: 'Erreur création contenu.' });
  await logActivity('content', r.data[0].id, 'created', `Contenu créé : ${title}.`);
  return res.status(201).json(r.data[0]);
}

const EVENT_FIELDS = ['title', 'content_type', 'platforms', 'account', 'caption', 'status', 'scheduled_date', 'link', 'notes', 'idea_key'];

// Clés d'idées (banque d'idées) déjà utilisées pour créer un contenu — sert à
// ne plus reproposer un sujet déjà traité, peu importe où il en est (idée,
// planifié, publié...) et peu importe le mois affiché dans le calendrier.
async function usedIdeaKeys(req, res) {
  const r = await sb('/content_calendar?select=idea_key&idea_key=not.is.null');
  if (!r.ok) return res.status(500).json({ error: 'Erreur récupération des idées utilisées.' });
  const keys = [...new Set((r.data || []).map((c) => c.idea_key))];
  return res.json({ keys });
}

// Sert aussi au glisser-déposer : { id, scheduled_date } déplace un contenu,
// { id, status } le fait changer de colonne kanban.
async function eventUpdate(req, res) {
  const { id, ...fields } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const patch = {};
  for (const k of EVENT_FIELDS) if (k in fields) patch[k] = fields[k];
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  const beforeR = await sb(`/content_calendar?id=eq.${encodeURIComponent(id)}&select=*`);
  const before = beforeR.data && beforeR.data[0];
  patch.updated_at = new Date().toISOString();
  const r = await sb(`/content_calendar?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  if (!r.ok || !r.data || !r.data.length) return res.status(500).json({ error: 'Erreur mise à jour contenu.' });
  const summary = diffSummary(before, patch, EVENT_FIELD_LABELS);
  if (summary) await logActivity('content', id, 'updated', summary);
  if ('status' in patch && before && before.status !== patch.status) {
    await logActivity('content', id, 'status_changed', `${CONTENT_STATUS_LABELS_FR[before.status] || before.status} → ${CONTENT_STATUS_LABELS_FR[patch.status] || patch.status}`);
  }
  return res.json(r.data[0]);
}

async function eventDelete(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const r = await sb(`/content_calendar?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return res.status(500).json({ error: 'Erreur suppression contenu.' });
  await deleteActivityLog('content', id);
  return res.json({ ok: true });
}

// ─── Avis KeyPace (modération) ────────────────────────────────────
// Le site public (keypace.be/api/reviews.js) crée les avis natifs en
// statut 'pending' ; ici on les publie ou on les rejette avant qu'ils
// n'apparaissent sur la home.
async function reviewsList(req, res) {
  const r = await sb('/reviews?select=*&order=created_at.desc');
  if (!r.ok) return res.status(500).json({ error: 'Erreur récupération avis.' });
  return res.json({ items: r.data || [] });
}

async function reviewSetStatus(req, res, status) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const r = await sb(`/reviews?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, published_at: status === 'published' ? new Date().toISOString() : null }),
  });
  if (!r.ok || !r.data || !r.data.length) return res.status(500).json({ error: 'Erreur mise à jour avis.' });
  return res.json(r.data[0]);
}

// ─── Avis Google (synchro) ─────────────────────────────────────────
// L'API Places (legacy) ne renvoie que les ~5 avis les plus pertinents, sans
// ID stable par avis : external_id est reconstruit (horodatage + auteur)
// pour upserter sans doublon. Le statut de modération n'est jamais écrasé
// (on omet status/published_at du payload, préservés côté DB à la resynchro).
async function googleFindPlace(req, res) {
  if (!GOOGLE_PLACES_API_KEY) return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY absente côté serveur.' });
  const query = queryParam(req, 'query');
  if (!query) return res.status(400).json({ error: 'Paramètre query manquant (ex. ?query=KeyPace Namur).' });
  try {
    const candidates = await findPlace(GOOGLE_PLACES_API_KEY, query);
    return res.json({ candidates });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}

async function syncGoogleReviews(req, res) {
  if (!GOOGLE_PLACES_API_KEY || !GOOGLE_PLACE_ID) {
    return res.status(500).json({
      error: 'Synchro avis Google indisponible : GOOGLE_PLACES_API_KEY et GOOGLE_PLACE_ID doivent être configurés.',
    });
  }
  let place;
  try {
    place = await fetchPlaceReviews(GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
  const rows = (place.reviews || []).map((rv) => ({
    user_id: null,
    source: 'google',
    external_id: `${rv.time}:${rv.author_name}`,
    author_name: rv.author_name,
    rating: rv.rating,
    comment: rv.text || '',
    source_url: place.mapsUrl || null,
  }));
  if (!rows.length) return res.json({ synced: 0, googleRating: place.rating, googleTotal: place.userRatingsTotal });
  const up = await sb('/reviews?on_conflict=source,external_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
  if (!up.ok) return res.status(500).json({ error: "Erreur d'enregistrement des avis Google." });
  return res.json({ synced: (up.data || []).length, googleRating: place.rating, googleTotal: place.userRatingsTotal });
}

// ─── Synchro Zimbra (prospection écoles) ──────────────────────────
// Scanne INBOX + dossier envoyés de la boîte contact@keypace.be sur une
// fenêtre glissante, classe chaque nouveau message via _zimbra-match, met à
// jour/crée les prospects en conséquence. zimbra_sync_log évite de retraiter
// un message déjà vu. Appelée par le cron quotidien et par le bouton
// "Sync maintenant" (deux points d'entrée, voir le handler plus bas).
async function syncZimbra(req, res) {
  // Nom de variable conservé (ZIMBRA_IMAP_HOST) pour ne pas redemander à
  // l'utilisateur de reconfigurer Vercel : elle contient juste le nom
  // d'hôte (ex. zimbra1.mail.ovh.net), utilisé ici en HTTPS vers /service/soap.
  const host = process.env.ZIMBRA_IMAP_HOST;
  const user = process.env.ZIMBRA_USER;
  const password = process.env.ZIMBRA_APP_PASSWORD;
  if (!host || !user || !password) {
    return res.status(500).json({
      error: 'Sync Zimbra indisponible : ZIMBRA_IMAP_HOST, ZIMBRA_USER et ZIMBRA_APP_PASSWORD doivent être configurés.',
    });
  }

  const sinceDate = new Date(Date.now() - ZIMBRA_SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  let messages;
  try {
    messages = await fetchRecentMessages({ host, user, password }, sinceDate);
  } catch (e) {
    console.error('sync-zimbra: connexion Zimbra échouée:', e);
    return res.status(502).json({ error: 'Connexion Zimbra impossible : ' + e.message });
  }

  const [prospectsR, seenR] = await Promise.all([
    sb('/school_prospects?select=*'),
    sb(`/zimbra_sync_log?select=message_id&processed_at=gte.${encodeURIComponent(sinceDate.toISOString())}`),
  ]);
  if (!prospectsR.ok) return res.status(500).json({ error: 'Erreur récupération prospects.' });
  const prospects = prospectsR.data || [];
  const seen = new Set((seenR.data || []).map((r) => r.message_id));
  const fresh = messages.filter((m) => !seen.has(m.messageId));

  let updated = 0;
  let created = 0;
  const logRows = [];
  const now = Date.now();

  for (const msg of fresh) {
    const action = classifyMessage(msg, prospects, now);
    let prospectId = null;

    if (action && action.type === 'update-status') {
      const r = await sb(`/school_prospects?id=eq.${encodeURIComponent(action.prospectId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: action.status, last_contact_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() }),
      });
      if (r.ok) {
        updated++;
        prospectId = action.prospectId;
        const p = prospects.find((x) => x.id === action.prospectId);
        if (p) p.status = action.status; // reste cohérent pour les messages suivants du même lot
      }
    } else if (action && action.type === 'create-prospect') {
      const r = await sb('/school_prospects', {
        method: 'POST',
        body: JSON.stringify({
          school_name: action.school_name,
          contact_email: action.contact_email,
          status: 'a_contacter',
          notes: action.notes,
        }),
      });
      if (r.ok && r.data && r.data[0]) {
        created++;
        prospectId = r.data[0].id;
        prospects.push(r.data[0]);
      }
    }

    logRows.push({ message_id: msg.messageId, prospect_id: prospectId, direction: msg.direction });
  }

  if (logRows.length) {
    await sb('/zimbra_sync_log?on_conflict=message_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(logRows),
    });
  }

  return res.json({ checked: messages.length, skipped: messages.length - fresh.length, updated, created });
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Sync déclenchée par le cron Vercel (voir dashboard-app/vercel.json) : pas
  // de X-Admin-Key possible ici, authentifiée via CRON_SECRET à la place.
  // Vercel ajoute automatiquement `Authorization: Bearer <CRON_SECRET>` à ses
  // propres appels cron dès que cette variable existe sur le projet.
  if (req.method === 'GET' && queryParam(req, 'action') === 'sync-zimbra-cron') {
    if (!CRON_SECRET || req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).end();
    }
    try {
      return await syncZimbra(req, res);
    } catch (e) {
      console.error('sync-zimbra-cron error:', e);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  }

  // Sync avis Google déclenchée par le cron (voir dashboard-app/vercel.json),
  // même logique d'authentification que sync-zimbra-cron ci-dessus.
  if (req.method === 'GET' && queryParam(req, 'action') === 'sync-google-reviews-cron') {
    if (!CRON_SECRET || req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).end();
    }
    try {
      return await syncGoogleReviews(req, res);
    } catch (e) {
      console.error('sync-google-reviews-cron error:', e);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
  }

  if (!ADMIN_KEY) return res.status(500).json({ error: 'Dashboard indisponible : ADMIN_KEY absente côté serveur.' });
  // .trim() : tolère un espace ou un retour à la ligne collé par erreur en
  // copiant la valeur (fréquent depuis l'UI Vercel ou un gestionnaire de mots de passe).
  const providedKey = String(req.headers['x-admin-key'] || '').trim();
  if (!safeEqual(providedKey, String(ADMIN_KEY).trim())) return res.status(401).json({ error: 'Non autorisé.' });

  const action = req.method === 'GET' ? queryParam(req, 'action') : (req.body || {}).action;
  try {
    if (req.method === 'GET') {
      switch (action) {
        case 'kpis': return await kpis(req, res);
        case 'traffic-detail': return await trafficDetail(req, res);
        case 'prospects': return await prospectsList(req, res);
        case 'calendar': return await calendarList(req, res);
        case 'used-idea-keys': return await usedIdeaKeys(req, res);
        case 'activity-log': return await activityLogList(req, res);
        case 'vault-list': return await vaultList(req, res);
        case 'vault-reveal': return await vaultReveal(req, res);
        case 'links-list': return await linksList(req, res);
        case 'security-checklist': return await securityChecklistList(req, res);
        case 'dev-backlog': return await devBacklogList(req, res);
        case 'competitors-list': return await competitorsList(req, res);
        case 'competitor-suggestions-list': return await competitorSuggestionsList(req, res);
        case 'reviews': return await reviewsList(req, res);
        case 'find-place': return await googleFindPlace(req, res);
        default: return res.status(400).json({ error: 'Action inconnue.' });
      }
    }
    if (req.method === 'POST') {
      switch (action) {
        case 'create-prospect': return await prospectCreate(req, res);
        case 'update-prospect': return await prospectUpdate(req, res);
        case 'log-contact': return await prospectLogContact(req, res);
        case 'delete-prospect': return await prospectDelete(req, res);
        case 'dismiss-duplicate': return await dismissDuplicate(req, res);
        case 'create-event': return await eventCreate(req, res);
        case 'update-event': return await eventUpdate(req, res);
        case 'delete-event': return await eventDelete(req, res);
        case 'add-note': return await addNote(req, res);
        case 'vault-create': return await vaultCreate(req, res);
        case 'vault-update': return await vaultUpdate(req, res);
        case 'vault-delete': return await vaultDelete(req, res);
        case 'link-create': return await linkCreate(req, res);
        case 'link-delete': return await linkDelete(req, res);
        case 'security-checklist-check': return await securityChecklistCheck(req, res);
        case 'dev-issue-create': return await devIssueCreate(req, res);
        case 'dev-issue-update': return await devIssueUpdate(req, res);
        case 'dev-issue-delete': return await devIssueDelete(req, res);
        case 'competitor-create': return await competitorCreate(req, res);
        case 'competitor-update': return await competitorUpdate(req, res);
        case 'competitor-delete': return await competitorDelete(req, res);
        case 'competitor-check': return await competitorCheck(req, res);
        case 'competitor-suggestion-create': return await competitorSuggestionCreate(req, res);
        case 'competitor-suggestion-add': return await competitorSuggestionAdd(req, res);
        case 'competitor-suggestion-dismiss': return await competitorSuggestionDismiss(req, res);
        case 'sync-zimbra': return await syncZimbra(req, res);
        case 'publish-review': return await reviewSetStatus(req, res, 'published');
        case 'reject-review': return await reviewSetStatus(req, res, 'rejected');
        case 'sync-google-reviews': return await syncGoogleReviews(req, res);
        default: return res.status(400).json({ error: 'Action inconnue.' });
      }
    }
    return res.status(405).end();
  } catch (e) {
    console.error('dashboard handler error [action=' + action + ']:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
