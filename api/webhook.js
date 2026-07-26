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

// Lit le corps brut de la requête (nécessaire pour vérifier la signature Stripe).
// bodyParser désactivé (voir config en bas) => on consomme le flux nous-mêmes.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Vercel: bodyParser désactivé pour obtenir le corps brut (signature Stripe)
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
  });
  const sig = req.headers['stripe-signature'];

  // Corps brut : le flux si bodyParser est bien désactivé, sinon repli sur req.body.
  let raw;
  try {
    raw = await readRawBody(req);
  } catch (e) {
    return res.status(400).send('Webhook Error: body read failed');
  }
  if ((!raw || !raw.length) && req.body) {
    raw = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const setPlan = async (customerId, plan) => {
    if (!customerId) return;
    // institution_id=is.null : ne jamais rétrograder un compte géré par un
    // établissement (licence B2B), même si son abonnement Stripe perso s'arrête
    const filter = plan === 'free' ? '&institution_id=is.null' : '';
    await sb(`/users?stripe_customer_id=eq.${customerId}${filter}`, {
      method: 'PATCH',
      body: JSON.stringify({ plan }),
    });
  };

  switch (event.type) {
    // Paiement initial réussi → activation immédiate
    case 'checkout.session.completed':
      await setPlan(event.data.object.customer, 'expert');
      break;

    // Fin d'abonnement (résiliation arrivée à échéance, ou impayé définitif
    // selon les réglages Stripe) → retour au plan gratuit.
    // Une résiliation en cours de mois (cancel_at_period_end) ne déclenche cet
    // événement qu'à la fin de la période déjà payée : l'accès est conservé
    // jusque-là, comme prévu par les CGV.
    case 'customer.subscription.deleted':
      await setPlan(event.data.object.customer, 'free');
      break;

    // Changement d'état : réactivation, ou passage en impayé
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      if (sub.status === 'active' || sub.status === 'trialing') {
        await setPlan(sub.customer, 'expert');
      } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
        await setPlan(sub.customer, 'free');
      }
      // 'past_due' : Stripe relance la carte automatiquement, on ne coupe pas
      break;
    }
  }

  res.json({ received: true });
};

module.exports.config = { api: { bodyParser: false } };
