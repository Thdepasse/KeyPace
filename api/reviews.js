// Avis KeyPace affichés sur la home (après le bandeau licence établissement).
// GET ?action=list  : public, avis publiés + moyenne (utilisé par la home).
// POST {token}                  : élève connecté, lit son propre avis (ou null).
// POST {token,rating,comment}   : dépose/modifie son avis natif (1 par
// utilisateur, resoumission = repasse en modération).
const { setCorsOrigin } = require('./_cors');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

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

async function listPublished(req, res) {
  const r = await sb('/reviews?select=author_name,rating,comment,published_at,show_card&status=eq.published&order=published_at.desc&limit=30');
  if (!r.ok) return res.status(500).json({ error: 'Erreur récupération avis.' });
  const all = r.data || [];
  // count/average portent sur tous les avis publiés ; show_card=false permet
  // d'avoir un avis réel qui compte dans la moyenne sans afficher sa carte.
  const count = all.length;
  const average = count ? Math.round((all.reduce((a, it) => a + it.rating, 0) / count) * 10) / 10 : 0;
  const items = all.filter((it) => it.show_card !== false);
  return res.json({ items, count, average });
}

async function myReview(req, res) {
  const { token, rating, comment } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token manquant.' });

  const r = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&or=(session_expires_at.is.null,session_expires_at.gt.${new Date().toISOString()})&select=id,username`);
  const user = r.data && r.data[0];
  if (!user) return res.status(401).json({ error: 'Session invalide.' });

  // Pas de note => lecture : renvoie l'avis existant de cet utilisateur (ou null).
  if (rating === undefined) {
    const rr = await sb(`/reviews?user_id=eq.${user.id}&select=rating,comment,status`);
    return res.json({ ok: true, review: (rr.data && rr.data[0]) || null });
  }

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Note invalide (1 à 5).' });
  }
  const text = String(comment || '').trim().slice(0, 2000);
  if (!text) return res.status(400).json({ error: 'Commentaire manquant.' });

  const up = await sb('/reviews?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: user.id,
      source: 'natif',
      author_name: user.username,
      rating: ratingNum,
      comment: text,
      status: 'pending',
      published_at: null,
    }),
  });
  if (!up.ok) return res.status(500).json({ error: "Erreur d'enregistrement de l'avis." });
  return res.json({ ok: true });
}

module.exports = async function handler(req, res) {
  setCorsOrigin(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    if (queryParam(req, 'action') !== 'list') return res.status(400).json({ error: 'Action inconnue.' });
    return listPublished(req, res);
  }
  if (req.method === 'POST') return myReview(req, res);
  return res.status(405).end();
};
