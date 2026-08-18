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

// Endpoint de facturation unifie.
// Remplace create-checkout.js et customer-portal.js pour rester sous la
// limite de 12 fonctions serverless du plan Hobby de Vercel.
//   POST /api/billing  { action: 'checkout', token }              -> ouvre le paiement
//   POST /api/billing  { action: 'portal',   token }              -> ouvre le portail client
//   POST /api/billing  { action: 'verify',   token, session_id }  -> confirme le paiement (filet de sécurité, indépendant du webhook)
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { action, token, session_id } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token manquant.' });
  if (action !== 'checkout' && action !== 'portal' && action !== 'verify') {
    return res.status(400).json({ error: 'Action inconnue.' });
  }

  // Gardes de configuration : message clair au lieu d'un crash 500 opaque.
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Paiement indisponible : STRIPE_SECRET_KEY absente côté serveur.' });
  }
  if (action === 'checkout' && !process.env.STRIPE_PRICE_ID) {
    return res.status(500).json({ error: 'Paiement indisponible : STRIPE_PRICE_ID absente côté serveur.' });
  }

  const r = await sb(
    `/users?session_token=eq.${encodeURIComponent(token)}&or=(session_expires_at.is.null,session_expires_at.gt.${new Date().toISOString()})&select=id,username,email,stripe_customer_id`
  );
  const user = r.data && r.data[0];
  if (!user) return res.status(401).json({ error: 'Session invalide.' });

  // httpClient fetch : le client HTTP par défaut (node https) échoue sur ce
  // runtime Vercel (StripeConnectionError) alors que fetch fonctionne (cf. Supabase).
  const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
  });
  const appUrl = (process.env.APP_URL || 'https://keypace.be').trim();
  const priceId = (process.env.STRIPE_PRICE_ID || '').trim();

  try {

  // ── Confirmation serveur d'un paiement (appelée au retour du checkout) ──
  // Ne dépend pas du webhook : on interroge Stripe directement.
  if (action === 'verify') {
    if (!session_id) return res.status(400).json({ error: 'session_id manquant.' });
    let cs;
    try {
      cs = await stripe.checkout.sessions.retrieve(session_id, { expand: ['subscription'] });
    } catch (e) {
      return res.status(400).json({ error: 'Session Stripe introuvable.' });
    }
    // Sécurité : la session doit appartenir au client Stripe de cet utilisateur.
    if (!cs.customer || (user.stripe_customer_id && cs.customer !== user.stripe_customer_id)) {
      return res.status(403).json({ error: 'Session non associée à ce compte.' });
    }
    const sub = cs.subscription;
    const paid =
      cs.payment_status === 'paid' ||
      (sub && (sub.status === 'active' || sub.status === 'trialing'));
    if (paid) {
      const patch = { plan: 'expert' };
      if (!user.stripe_customer_id) patch.stripe_customer_id = cs.customer;
      await sb(`/users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      return res.json({ plan: 'expert' });
    }
    return res.json({ plan: 'free', pending: true });
  }

  if (action === 'portal') {
    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'Aucun abonnement associe a ce compte.' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: appUrl,
    });
    return res.json({ url: session.url });
  }

  // action === 'checkout'
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: { username: user.username },
    });
    customerId = customer.id;
    await sb(`/users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stripe_customer_id: customerId }),
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    allow_promotion_codes: true,
    success_url: `${appUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}?payment=cancel`,
  });

  res.json({ url: session.url });
  } catch (e) {
    // Toute erreur Stripe/serveur remonte en JSON clair (au lieu d'un crash 500 opaque).
    return res.status(500).json({ error: 'Stripe : ' + (e && e.message ? e.message : 'erreur inconnue') });
  }
};
