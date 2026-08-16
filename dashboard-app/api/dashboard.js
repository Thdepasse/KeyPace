// Dashboard interne équipe : KPI de croissance, prospection écoles (mini-CRM)
// et calendrier de contenu marketing. Projet Vercel indépendant du site
// public keypace.be (dossier dashboard-app/, aucun domaine keypace.be n'y
// est attaché — l'isolation est structurelle, pas applicative).
// Accès protégé par le header x-admin-key (secret ADMIN_KEY propre à ce
// projet — pas de comptes individuels).
const { computeNextFollowup, summarizeAcquisition, summarizeB2B, summarizeEngagement, dailySignups, dailyLastActive, trafficConversionRate, contentGapsThisWeek, thisWeekRange, FOLLOWUP_DAYS } = require('./_dashboard-logic');
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
    sb('/school_prospects?select=status,next_followup_at'),
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
  return res.json({
    acquisition: {
      ...acquisition,
      traffic,
      conversionToSignup30d: traffic && !traffic.error ? trafficConversionRate(acquisition.signups30d, traffic.visitors30d) : null,
    },
    b2b: summarizeB2B(instR.data || [], prospR.data || [], now),
    engagement: summarizeEngagement(progR.data || [], certR.data || [], wsR.data || [], now),
    trend: {
      signups: dailySignups(usersR.data || [], now, 30),
      lastActive: dailyLastActive(progR.data || [], now, 30),
    },
    brief: {
      reviewsPending: (reviewsPendingR.data || []).length,
      ...contentGapsThisWeek(scheduledDates, now),
    },
  });
}

// ─── Prospection écoles ───────────────────────────────────────────
async function prospectsList(req, res) {
  const [r, lastSyncR] = await Promise.all([
    sb('/school_prospects?select=*&order=next_followup_at.asc.nullslast,created_at.desc'),
    sb('/zimbra_sync_log?select=processed_at&order=processed_at.desc&limit=1'),
  ]);
  if (!r.ok) return res.status(500).json({ error: 'Erreur récupération prospects.' });
  const lastSyncAt = (lastSyncR.ok && lastSyncR.data && lastSyncR.data[0] && lastSyncR.data[0].processed_at) || null;
  return res.json({ items: r.data || [], lastSyncAt });
}

async function prospectCreate(req, res) {
  const { school_name, contact_name, contact_email, contact_phone, city, notes, status } = req.body || {};
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
    }),
  });
  if (!r.ok) return res.status(500).json({ error: 'Erreur création prospect.' });
  return res.status(201).json(r.data[0]);
}

const PROSPECT_FIELDS = ['school_name', 'contact_name', 'contact_email', 'contact_phone', 'city', 'notes', 'status'];

async function prospectUpdate(req, res) {
  const { id, ...fields } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const patch = {};
  for (const k of PROSPECT_FIELDS) if (k in fields) patch[k] = fields[k];
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  patch.updated_at = new Date().toISOString();
  const r = await sb(`/school_prospects?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  if (!r.ok || !r.data || !r.data.length) return res.status(500).json({ error: 'Erreur mise à jour prospect.' });
  return res.json(r.data[0]);
}

// Transition de statut : programme automatiquement la relance suivante.
async function prospectLogContact(req, res) {
  const { id, status } = req.body || {};
  if (!id || !status) return res.status(400).json({ error: 'id ou status manquant.' });
  if (!(status in FOLLOWUP_DAYS)) return res.status(400).json({ error: 'Statut inconnu.' });
  const now = Date.now();
  const patch = {
    status,
    last_contact_at: new Date(now).toISOString(),
    next_followup_at: computeNextFollowup(status, now),
    updated_at: new Date(now).toISOString(),
  };
  const r = await sb(`/school_prospects?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  if (!r.ok || !r.data || !r.data.length) return res.status(500).json({ error: 'Erreur mise à jour du statut.' });
  return res.json(r.data[0]);
}

async function prospectDelete(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const r = await sb(`/school_prospects?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return res.status(500).json({ error: 'Erreur suppression prospect.' });
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

// Sert aussi au glisser-déposer : { id, scheduled_date } déplace un contenu.
async function eventUpdate(req, res) {
  const { id, ...fields } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const patch = {};
  for (const k of EVENT_FIELDS) if (k in fields) patch[k] = fields[k];
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  patch.updated_at = new Date().toISOString();
  const r = await sb(`/content_calendar?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  if (!r.ok || !r.data || !r.data.length) return res.status(500).json({ error: 'Erreur mise à jour contenu.' });
  return res.json(r.data[0]);
}

async function eventDelete(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id manquant.' });
  const r = await sb(`/content_calendar?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) return res.status(500).json({ error: 'Erreur suppression contenu.' });
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
  res.setHeader('Access-Control-Allow-Origin', '*');
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
  if (providedKey !== String(ADMIN_KEY).trim()) return res.status(401).json({ error: 'Non autorisé.' });

  const action = req.method === 'GET' ? queryParam(req, 'action') : (req.body || {}).action;
  try {
    if (req.method === 'GET') {
      switch (action) {
        case 'kpis': return await kpis(req, res);
        case 'traffic-detail': return await trafficDetail(req, res);
        case 'prospects': return await prospectsList(req, res);
        case 'calendar': return await calendarList(req, res);
        case 'used-idea-keys': return await usedIdeaKeys(req, res);
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
        case 'create-event': return await eventCreate(req, res);
        case 'update-event': return await eventUpdate(req, res);
        case 'delete-event': return await eventDelete(req, res);
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
