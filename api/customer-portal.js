const Stripe = require('stripe');
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

// Portail de facturation Stripe : le client y gère son abonnement lui-même
// (résiliation, factures, moyen de paiement). Nécessite d'avoir activé le
// « Customer portal » dans le dashboard Stripe (Réglages → Facturation).
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token manquant.' });

  const r = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,stripe_customer_id`);
  const user = r.data && r.data[0];
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (!user.stripe_customer_id) return res.status(400).json({ error: 'Aucun abonnement associé à ce compte.' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = (process.env.APP_URL || 'https://keypace.be').trim();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: appUrl,
  });

  res.json({ url: session.url });
};
