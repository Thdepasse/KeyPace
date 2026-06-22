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
  if (!user) return res.status(401).json({ error: 'Connecte-toi pour rejoindre le duel.' });

  const rr = await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}&select=*`);
  const room = rr.data && rr.data[0];
  if (!room) return res.status(404).json({ error: 'Ce duel n\'existe pas ou a expiré.' });
  if (room.status === 'done') return res.status(409).json({ error: 'Ce duel est déjà terminé.' });

  const isHost = room.host_user_id === user.id;
  // Récupère le pseudo de l'hôte pour l'affichage
  let hostLabel = null;
  if (room.host_user_id) {
    const hu = await sb(`/users?id=eq.${room.host_user_id}&select=username`);
    hostLabel = hu.data && hu.data[0] ? hu.data[0].username : 'Hôte';
  }

  if (!isHost) {
    await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ guest_user_id: user.id, guest_label: user.username }),
    });
  }

  res.json({
    roomId: room.id,
    text: room.text,
    role: isHost ? 'host' : 'guest',
    status: room.status,
    startAt: room.start_at,
    hostLabel,
  });
};
