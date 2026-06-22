const { sb, DUEL_TEXTS, userFromToken } = require('./_duel-shared');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body || {};
  const user = await userFromToken(token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });
  if (user.plan !== 'expert') return res.status(403).json({ error: 'Créer un duel est réservé aux comptes Expert.' });

  const text = DUEL_TEXTS[Math.floor(Math.random() * DUEL_TEXTS.length)];
  const r = await sb(`/duel_rooms`, {
    method: 'POST',
    body: JSON.stringify({ text, status: 'lobby', host_user_id: user.id }),
  });
  const room = r.data && r.data[0];
  if (!room) return res.status(500).json({ error: 'Création du duel impossible.' });

  res.json({ roomId: room.id, text: room.text, role: 'host', hostLabel: user.username });
};
