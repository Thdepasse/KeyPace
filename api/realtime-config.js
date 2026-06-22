// Expose au client l'URL Supabase + la clé publishable (anon), nécessaires
// au client Realtime pour le Duel 1v1. La clé anon est conçue pour être publique.
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL || null;
  const anonKey = process.env.SUPABASE_ANON_KEY || null;
  if (!url || !anonKey) return res.status(200).json({ url: null, anonKey: null, configured: false });
  res.json({ url, anonKey, configured: true });
};
