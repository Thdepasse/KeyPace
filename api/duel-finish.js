const { sb, userFromToken } = require('./_duel-shared');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { token, roomId, role, wpm, accuracy, timeMs, finished } = req.body || {};
  if (!roomId || !role) return res.status(400).json({ error: 'Paramètres manquants.' });
  const user = await userFromToken(token);
  if (!user) return res.status(401).json({ error: 'Session invalide.' });

  const rr = await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}&select=*`);
  const room = rr.data && rr.data[0];
  if (!room) return res.status(404).json({ error: 'Duel introuvable.' });

  // Cohérence minimale : bornes
  const w = Math.max(0, Math.min(220, Math.round(Number(wpm) || 0)));
  const a = Math.max(0, Math.min(100, Math.round(Number(accuracy) || 0)));
  const t = Math.max(0, Math.round(Number(timeMs) || 0));

  // Évite les doublons (un seul résultat par rôle)
  const existing = await sb(`/duel_results?room_id=eq.${encodeURIComponent(roomId)}&role=eq.${role}&select=id`);
  if (!(existing.data && existing.data[0])) {
    await sb(`/duel_results`, {
      method: 'POST',
      body: JSON.stringify({ room_id: roomId, user_id: user.id, role, wpm: w, accuracy: a, finished: !!finished, time_ms: t }),
    });
  }

  // Si les deux résultats sont là, on désigne le vainqueur (le plus rapide à finir)
  const all = await sb(`/duel_results?room_id=eq.${encodeURIComponent(roomId)}&select=role,finished,time_ms`);
  const results = all.data || [];
  let winner = room.winner;
  if (results.length >= 2) {
    const host = results.find((r) => r.role === 'host');
    const guest = results.find((r) => r.role === 'guest');
    if (host && guest) {
      if (host.finished && !guest.finished) winner = 'host';
      else if (guest.finished && !host.finished) winner = 'guest';
      else if (host.finished && guest.finished) winner = host.time_ms <= guest.time_ms ? 'host' : 'guest';
      else winner = 'draw';
      await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ winner, status: 'done' }),
      });
    }
  }

  res.json({ ok: true, winner });
};
