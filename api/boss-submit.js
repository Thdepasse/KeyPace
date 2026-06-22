const { sb, getCurrentChallenge, computeScore } = require('./_boss-shared');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { token, wpm, accuracy } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token manquant.' });

  const ur = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,username,plan`);
  const user = ur.data && ur.data[0];
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (user.plan !== 'expert') return res.status(403).json({ error: 'Réservé aux comptes Expert.' });

  const ch = await getCurrentChallenge();
  if (!ch) return res.status(500).json({ error: 'Défi indisponible.' });

  // Score recalculé côté serveur à partir de wpm/précision (cohérence + bornes)
  const score = computeScore(wpm, accuracy);
  const w = Math.max(0, Math.min(220, Math.round(Number(wpm) || 0)));
  const a = Math.max(0, Math.min(100, Math.round(Number(accuracy) || 0)));

  // On ne garde que le meilleur score par (défi, utilisateur)
  const ex = await sb(`/weekly_scores?challenge_id=eq.${ch.id}&user_id=eq.${user.id}&select=id,score`);
  const prev = ex.data && ex.data[0];
  if (prev) {
    if (score > Number(prev.score)) {
      await sb(`/weekly_scores?id=eq.${prev.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ score, wpm: w, accuracy: a, username: user.username, created_at: new Date().toISOString() }),
      });
    }
  } else {
    await sb(`/weekly_scores`, {
      method: 'POST',
      body: JSON.stringify({ challenge_id: ch.id, user_id: user.id, username: user.username, score, wpm: w, accuracy: a }),
    });
  }

  res.json({ ok: true, score, best: prev ? Math.max(score, Number(prev.score)) : score });
};
