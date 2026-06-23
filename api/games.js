// Fonction serverless unifiée pour les jeux (Boss + Duel), pour rester
// sous la limite de 12 fonctions du plan Vercel Hobby.
// Route par `action` dans le body JSON. Helpers dans _boss-shared / _duel-shared.
const { sb, getCurrentChallenge, computeScore } = require('./_boss-shared');
const { DUEL_TEXTS, userFromToken, generateRoomCode } = require('./_duel-shared');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body || {};
  const action = body.action;

  try {
    switch (action) {
      /* ─── Config Realtime (Duel) ─── */
      case 'realtime-config': {
        const url = process.env.SUPABASE_URL || null;
        const anonKey = process.env.SUPABASE_ANON_KEY || null;
        if (!url || !anonKey) return res.json({ url: null, anonKey: null, configured: false });
        return res.json({ url, anonKey, configured: true });
      }

      /* ─── Boss de la semaine ─── */
      case 'boss-challenge': {
        const ch = await getCurrentChallenge();
        if (!ch) return res.status(500).json({ error: 'Défi indisponible.' });
        const secondsLeft = Math.max(0, Math.floor((new Date(ch.ends_at).getTime() - Date.now()) / 1000));
        return res.json({ id: ch.id, isoWeek: ch.iso_week, text: ch.text, startsAt: ch.starts_at, endsAt: ch.ends_at, secondsLeft });
      }
      case 'boss-submit': {
        const { token, wpm, accuracy } = body;
        if (!token) return res.status(400).json({ error: 'Token manquant.' });
        const ur = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,username,plan`);
        const user = ur.data && ur.data[0];
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        if (user.plan !== 'expert') return res.status(403).json({ error: 'Réservé aux comptes Expert.' });
        const ch = await getCurrentChallenge();
        if (!ch) return res.status(500).json({ error: 'Défi indisponible.' });
        const score = computeScore(wpm, accuracy);
        const w = Math.max(0, Math.min(220, Math.round(Number(wpm) || 0)));
        const a = Math.max(0, Math.min(100, Math.round(Number(accuracy) || 0)));
        const ex = await sb(`/weekly_scores?challenge_id=eq.${ch.id}&user_id=eq.${user.id}&select=id,score`);
        const prev = ex.data && ex.data[0];
        if (prev) {
          if (score > Number(prev.score)) {
            await sb(`/weekly_scores?id=eq.${prev.id}`, { method: 'PATCH', body: JSON.stringify({ score, wpm: w, accuracy: a, username: user.username, created_at: new Date().toISOString() }) });
          }
        } else {
          await sb(`/weekly_scores`, { method: 'POST', body: JSON.stringify({ challenge_id: ch.id, user_id: user.id, username: user.username, score, wpm: w, accuracy: a }) });
        }
        return res.json({ ok: true, score, best: prev ? Math.max(score, Number(prev.score)) : score });
      }
      case 'boss-leaderboard': {
        const { token } = body;
        const ch = await getCurrentChallenge();
        if (!ch) return res.status(500).json({ error: 'Défi indisponible.' });
        const top = await sb(`/weekly_scores?challenge_id=eq.${ch.id}&select=username,score,wpm,accuracy&order=score.desc&limit=100`);
        const rows = (top.data || []).map((r, i) => ({ rank: i + 1, ...r }));
        let me = null;
        if (token) {
          const ur = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,username`);
          const user = ur.data && ur.data[0];
          if (user) {
            const mine = await sb(`/weekly_scores?challenge_id=eq.${ch.id}&user_id=eq.${user.id}&select=username,score,wpm,accuracy`);
            const row = mine.data && mine.data[0];
            if (row) {
              const better = await sb(`/weekly_scores?challenge_id=eq.${ch.id}&score=gt.${row.score}&select=id`);
              me = { rank: (better.data ? better.data.length : 0) + 1, ...row };
            }
          }
        }
        return res.json({ challengeId: ch.id, isoWeek: ch.iso_week, count: rows.length, top: rows, me });
      }

      /* ─── Duel 1v1 ─── */
      case 'duel-create': {
        const { token } = body;
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        if (user.plan !== 'expert') return res.status(403).json({ error: 'Créer un duel est réservé aux comptes Expert.' });
        const text = DUEL_TEXTS[Math.floor(Math.random() * DUEL_TEXTS.length)];
        let room = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const code = generateRoomCode();
          const r = await sb(`/duel_rooms`, { method: 'POST', body: JSON.stringify({ text, status: 'lobby', host_user_id: user.id, room_code: code }) });
          if (r.ok && r.data && r.data[0]) { room = r.data[0]; break; }
        }
        if (!room) return res.status(500).json({ error: 'Création du duel impossible.' });
        return res.json({ roomId: room.id, roomCode: room.room_code, text: room.text, role: 'host', hostLabel: user.username });
      }
      case 'duel-join-code': {
        const { token, code } = body;
        if (!code) return res.status(400).json({ error: 'Code manquant.' });
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Connecte-toi pour rejoindre le duel.' });
        const rr = await sb(`/duel_rooms?room_code=eq.${encodeURIComponent(code.toUpperCase().trim())}&status=eq.lobby&select=*`);
        const room = rr.data && rr.data[0];
        if (!room) return res.status(404).json({ error: 'Code invalide ou duel déjà commencé.' });
        const isHost = room.host_user_id === user.id;
        let hostLabel = null;
        if (room.host_user_id) {
          const hu = await sb(`/users?id=eq.${room.host_user_id}&select=username`);
          hostLabel = hu.data && hu.data[0] ? hu.data[0].username : 'Hôte';
        }
        if (!isHost) {
          await sb(`/duel_rooms?id=eq.${encodeURIComponent(room.id)}`, { method: 'PATCH', body: JSON.stringify({ guest_user_id: user.id, guest_label: user.username }) });
        }
        return res.json({ roomId: room.id, roomCode: room.room_code, text: room.text, role: isHost ? 'host' : 'guest', status: room.status, startAt: room.start_at, hostLabel });
      }
      case 'duel-join': {
        const { token, roomId } = body;
        if (!roomId) return res.status(400).json({ error: 'Duel introuvable.' });
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Connecte-toi pour rejoindre le duel.' });
        const rr = await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}&select=*`);
        const room = rr.data && rr.data[0];
        if (!room) return res.status(404).json({ error: 'Ce duel n\'existe pas ou a expiré.' });
        if (room.status === 'done') return res.status(409).json({ error: 'Ce duel est déjà terminé.' });
        const isHost = room.host_user_id === user.id;
        let hostLabel = null;
        if (room.host_user_id) {
          const hu = await sb(`/users?id=eq.${room.host_user_id}&select=username`);
          hostLabel = hu.data && hu.data[0] ? hu.data[0].username : 'Hôte';
        }
        if (!isHost) {
          await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}`, { method: 'PATCH', body: JSON.stringify({ guest_user_id: user.id, guest_label: user.username }) });
        }
        return res.json({ roomId: room.id, roomCode: room.room_code, text: room.text, role: isHost ? 'host' : 'guest', status: room.status, startAt: room.start_at, hostLabel });
      }
      case 'duel-start': {
        const { token, roomId } = body;
        if (!roomId) return res.status(400).json({ error: 'Duel introuvable.' });
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        const rr = await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}&select=*`);
        const room = rr.data && rr.data[0];
        if (!room) return res.status(404).json({ error: 'Duel introuvable.' });
        if (room.host_user_id !== user.id) return res.status(403).json({ error: 'Seul l\'hôte peut lancer le duel.' });
        const startAt = new Date(Date.now() + 5000).toISOString();
        await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}`, { method: 'PATCH', body: JSON.stringify({ start_at: startAt, status: 'racing' }) });
        return res.json({ startAt });
      }
      case 'duel-finish': {
        const { token, roomId, role, wpm, accuracy, timeMs, finished } = body;
        if (!roomId || !role) return res.status(400).json({ error: 'Paramètres manquants.' });
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        const rr = await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}&select=*`);
        const room = rr.data && rr.data[0];
        if (!room) return res.status(404).json({ error: 'Duel introuvable.' });
        const w = Math.max(0, Math.min(220, Math.round(Number(wpm) || 0)));
        const a = Math.max(0, Math.min(100, Math.round(Number(accuracy) || 0)));
        const t = Math.max(0, Math.round(Number(timeMs) || 0));
        const existing = await sb(`/duel_results?room_id=eq.${encodeURIComponent(roomId)}&role=eq.${role}&select=id`);
        if (!(existing.data && existing.data[0])) {
          await sb(`/duel_results`, { method: 'POST', body: JSON.stringify({ room_id: roomId, user_id: user.id, role, wpm: w, accuracy: a, finished: !!finished, time_ms: t }) });
        }
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
            await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}`, { method: 'PATCH', body: JSON.stringify({ winner, status: 'done' }) });
          }
        }
        return res.json({ ok: true, winner });
      }

      default:
        return res.status(400).json({ error: 'Action inconnue.' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
