const { sb, userFromToken } = require('./_duel-shared');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { token, roomId } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'Duel introuvable.' });
  const user = await userFromToken(token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });

  const rr = await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}&select=*`);
  const room = rr.data && rr.data[0];
  if (!room) return res.status(404).json({ error: 'Duel introuvable.' });
  if (room.host_user_id !== user.id) return res.status(403).json({ error: 'Seul l\'hôte peut lancer le duel.' });

  // Départ chronométré par le serveur : maintenant + 5 s
  const startAt = new Date(Date.now() + 5000).toISOString();
  await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ start_at: startAt, status: 'racing' }),
  });

  res.json({ startAt });
};
