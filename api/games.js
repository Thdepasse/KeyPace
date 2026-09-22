// Fonction serverless unifiée pour les jeux (Boss + Duel), pour rester
// sous la limite de 12 fonctions du plan Vercel Hobby.
// Route par `action` dans le body JSON. Helpers dans _boss-shared / _duel-shared.
const { sb, getCurrentChallenge, computeScore } = require('./_boss-shared');
const { DUEL_TEXTS, userFromToken, generateRoomCode } = require('./_duel-shared');
const { canActAsTeacher } = require('./_class-logic');
const { setCorsOrigin } = require('./_cors');

// Battle Royale : les seules épreuves ayant un score/mpm directement
// comparable entre joueurs (voir afterX() côté client) — Précision souris et
// ses variantes utilisent une mécanique trop différente, laissées pour une v2.
const ROYALE_POOL = ['frappe', 'sprint', 'course', 'ghost', 'simon'];
function shuffledRoyalePool() {
  const arr = ROYALE_POOL.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Garde-fou de plausibilité (Boss + Duel) : ni le wpm/la précision déclarés,
// ni un score, ne prouvent qu'une partie a réellement été jouée — un simple
// appel direct à cette API peut fabriquer n'importe quel résultat. Sans
// preuve de frappe réelle (hors périmètre ici, ce serait une refonte), on se
// contente de rejeter les cas grossiers : le temps déclaré ne peut pas être
// plus court que le temps minimum physiquement nécessaire pour taper le
// texte de l'épreuve, même à une vitesse largement au-delà des records
// humains réels (~220 mpm) — la marge (300 mpm) est volontairement large
// pour ne jamais pénaliser un joueur rapide mais honnête.
const MAX_PLAUSIBLE_WPM = 300;
function minPlausibleMs(textLength) {
  if (!textLength || textLength <= 0) return 0;
  return Math.round(textLength / ((MAX_PLAUSIBLE_WPM * 5) / 60000));
}

module.exports = async function handler(req, res) {
  setCorsOrigin(req, res);
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
        const { token, wpm, accuracy, timeMs } = body;
        if (!token) return res.status(400).json({ error: 'Token manquant.' });
        const ur = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&or=(session_expires_at.is.null,session_expires_at.gt.${new Date().toISOString()})&select=id,username,display_name,plan`);
        const user = ur.data && ur.data[0];
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        if (user.plan !== 'expert') return res.status(403).json({ error: 'Réservé aux comptes Expert.' });
        const displayName = user.display_name || user.username;
        const ch = await getCurrentChallenge();
        if (!ch) return res.status(500).json({ error: 'Défi indisponible.' });
        const minMs = minPlausibleMs((ch.text || '').length);
        // Number(undefined) < minMs vaut NaN < minMs, toujours faux : un
        // timeMs manquant contournait silencieusement ce garde-fou.
        if (minMs > 0 && !(Number(timeMs) >= minMs)) {
          return res.status(400).json({ error: 'Résultat incohérent avec la longueur du texte (temps trop court).' });
        }
        const score = computeScore(wpm, accuracy);
        const w = Math.max(0, Math.min(220, Math.round(Number(wpm) || 0)));
        const a = Math.max(0, Math.min(100, Math.round(Number(accuracy) || 0)));
        const ex = await sb(`/weekly_scores?challenge_id=eq.${ch.id}&user_id=eq.${user.id}&select=id,score`);
        const prev = ex.data && ex.data[0];
        if (prev) {
          if (score > Number(prev.score)) {
            await sb(`/weekly_scores?id=eq.${prev.id}`, { method: 'PATCH', body: JSON.stringify({ score, wpm: w, accuracy: a, username: displayName, created_at: new Date().toISOString() }) });
          }
        } else {
          await sb(`/weekly_scores`, { method: 'POST', body: JSON.stringify({ challenge_id: ch.id, user_id: user.id, username: displayName, score, wpm: w, accuracy: a }) });
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
          const ur = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&or=(session_expires_at.is.null,session_expires_at.gt.${new Date().toISOString()})&select=id,username`);
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
        const text = DUEL_TEXTS[Math.floor(Math.random() * DUEL_TEXTS.length)];
        let room = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const code = generateRoomCode();
          const r = await sb(`/duel_rooms`, { method: 'POST', body: JSON.stringify({ text, status: 'lobby', host_user_id: user.id, room_code: code }) });
          if (r.ok && r.data && r.data[0]) { room = r.data[0]; break; }
        }
        if (!room) return res.status(500).json({ error: 'Création du duel impossible.' });
        return res.json({ roomId: room.id, roomCode: room.room_code, text: room.text, role: 'host', hostLabel: user.display_name || user.username });
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
          const hu = await sb(`/users?id=eq.${room.host_user_id}&select=username,display_name`);
          hostLabel = hu.data && hu.data[0] ? (hu.data[0].display_name || hu.data[0].username) : 'Hôte';
        }
        if (!isHost) {
          await sb(`/duel_rooms?id=eq.${encodeURIComponent(room.id)}`, { method: 'PATCH', body: JSON.stringify({ guest_user_id: user.id, guest_label: user.display_name || user.username }) });
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
        // Comme duel-join-code (qui filtre déjà status=eq.lobby) : une salle qui
        // court ou est terminée ne peut plus être rejointe. Sans ce garde, un
        // deuxième compte connaissant le roomId pouvait rejoindre en pleine
        // course et écraser guest_user_id/guest_label, volant la place du vrai
        // second joueur juste avant de soumettre un résultat à sa place.
        if (room.status !== 'lobby') return res.status(409).json({ error: 'Ce duel a déjà commencé ou est terminé.' });
        const isHost = room.host_user_id === user.id;
        let hostLabel = null;
        if (room.host_user_id) {
          const hu = await sb(`/users?id=eq.${room.host_user_id}&select=username,display_name`);
          hostLabel = hu.data && hu.data[0] ? (hu.data[0].display_name || hu.data[0].username) : 'Hôte';
        }
        if (!isHost) {
          await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}`, { method: 'PATCH', body: JSON.stringify({ guest_user_id: user.id, guest_label: user.display_name || user.username }) });
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
        if (role !== 'host' && role !== 'guest') return res.status(400).json({ error: 'Rôle invalide.' });
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        const rr = await sb(`/duel_rooms?id=eq.${encodeURIComponent(roomId)}&select=*`);
        const room = rr.data && rr.data[0];
        if (!room) return res.status(404).json({ error: 'Duel introuvable.' });
        // Vérifie que l'appelant est bien le joueur qu'il prétend être (host ou
        // guest de CETTE salle précise) — sans ça, n'importe quel compte
        // connaissant juste le roomId (récupérable via Realtime ou le code à 6
        // caractères) pouvait soumettre un résultat pour host OU guest sans
        // participer au duel, y compris un faux résultat gagnant posté avant
        // que le vrai joueur ne termine (le garde anti-doublon ci-dessous ne
        // vérifiait qu'un rôle déjà pris, pas l'identité du joueur).
        const expectedUserId = role === 'host' ? room.host_user_id : room.guest_user_id;
        if (!expectedUserId || expectedUserId !== user.id) {
          return res.status(403).json({ error: 'Tu n\'es pas ce joueur dans ce duel.' });
        }
        const w = Math.max(0, Math.min(220, Math.round(Number(wpm) || 0)));
        const a = Math.max(0, Math.min(100, Math.round(Number(accuracy) || 0)));
        const t = Math.max(0, Math.round(Number(timeMs) || 0));
        // Ne s'applique qu'à un résultat déclaré "terminé" : un abandon/forfait
        // (finished=false) n'a rien à voir avec le temps réel de frappe.
        if (finished) {
          const minMs = minPlausibleMs((room.text || '').length);
          if (minMs > 0 && t < minMs) {
            return res.status(400).json({ error: 'Résultat incohérent avec la longueur du texte (temps trop court).' });
          }
        }
        const existing = await sb(`/duel_results?room_id=eq.${encodeURIComponent(roomId)}&role=eq.${encodeURIComponent(role)}&select=id`);
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

      /* ─── Battle Royale (N joueurs, 5 épreuves) ─── */
      case 'royale-create': {
        const { token } = body;
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        const hostLabel = user.display_name || user.username;
        const hostIsTeacher = canActAsTeacher(user);
        let session = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const code = generateRoomCode();
          const r = await sb(`/royale_sessions`, { method: 'POST', body: JSON.stringify({ join_code: code, host_user_id: user.id, host_is_teacher: hostIsTeacher, status: 'lobby' }) });
          if (r.ok && r.data && r.data[0]) { session = r.data[0]; break; }
        }
        if (!session) return res.status(500).json({ error: 'Création de la partie impossible.' });
        await sb(`/royale_players`, { method: 'POST', body: JSON.stringify({ session_id: session.id, user_id: user.id, label: hostLabel }) });
        return res.json({ sessionId: session.id, joinCode: session.join_code, role: 'host', hostLabel, players: [{ userId: user.id, label: hostLabel }] });
      }
      case 'royale-join-code': {
        const { token, code } = body;
        if (!code) return res.status(400).json({ error: 'Code manquant.' });
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Connecte-toi pour rejoindre la partie.' });
        const sr = await sb(`/royale_sessions?join_code=eq.${encodeURIComponent(code.toUpperCase().trim())}&select=*`);
        const session = sr.data && sr.data[0];
        if (!session) return res.status(404).json({ error: 'Code invalide.' });
        if (session.status !== 'lobby') return res.status(409).json({ error: 'Cette partie a déjà commencé ou est terminée.' });
        const label = user.display_name || user.username;
        // on_conflict explicite : la PK de royale_players est `id` (toujours neuf
        // à chaque appel), pas (session_id,user_id) — sans le préciser, PostgREST
        // upserte sur la PK et ne déduplique jamais un rejoin du même joueur.
        await sb(`/royale_players?on_conflict=session_id,user_id`, { method: 'POST', headers: { Prefer: 'return=representation,resolution=merge-duplicates' }, body: JSON.stringify({ session_id: session.id, user_id: user.id, label }) });
        const pr = await sb(`/royale_players?session_id=eq.${encodeURIComponent(session.id)}&select=user_id,label&order=joined_at.asc`);
        return res.json({
          sessionId: session.id, joinCode: session.join_code,
          role: session.host_user_id === user.id ? 'host' : 'guest',
          players: (pr.data || []).map((p) => ({ userId: p.user_id, label: p.label })),
        });
      }
      case 'royale-state': {
        const { token, sessionId } = body;
        if (!sessionId) return res.status(400).json({ error: 'Partie introuvable.' });
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        const sr = await sb(`/royale_sessions?id=eq.${encodeURIComponent(sessionId)}&select=*`);
        const session = sr.data && sr.data[0];
        if (!session) return res.status(404).json({ error: 'Partie introuvable.' });
        const pr = await sb(`/royale_players?session_id=eq.${encodeURIComponent(sessionId)}&select=user_id,label&order=joined_at.asc`);
        const players = (pr.data || []).map((p) => ({ userId: p.user_id, label: p.label }));
        let roundFinishedCount = 0;
        if (session.status === 'playing') {
          const rr = await sb(`/royale_round_results?session_id=eq.${encodeURIComponent(sessionId)}&round_index=eq.${session.round_index}&select=user_id`);
          roundFinishedCount = (rr.data || []).length;
        }
        return res.json({
          status: session.status, roundIndex: session.round_index, roundGameKeys: session.round_game_keys,
          players, roundFinishedCount, totalPlayers: players.length,
        });
      }
      case 'royale-start': {
        const { token, sessionId } = body;
        if (!sessionId) return res.status(400).json({ error: 'Partie introuvable.' });
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        const sr = await sb(`/royale_sessions?id=eq.${encodeURIComponent(sessionId)}&select=*`);
        const session = sr.data && sr.data[0];
        if (!session) return res.status(404).json({ error: 'Partie introuvable.' });
        if (session.host_user_id !== user.id) return res.status(403).json({ error: "Seul l'hôte peut lancer la partie." });
        if (session.status !== 'lobby') return res.status(409).json({ error: 'La partie a déjà commencé.' });
        const pr = await sb(`/royale_players?session_id=eq.${encodeURIComponent(sessionId)}&select=user_id`);
        if (!pr.data || pr.data.length < 2) return res.status(400).json({ error: 'Il faut au moins 2 joueurs pour lancer la partie.' });
        const roundGameKeys = shuffledRoyalePool();
        await sb(`/royale_sessions?id=eq.${encodeURIComponent(sessionId)}`, { method: 'PATCH', body: JSON.stringify({ status: 'playing', round_index: 0, round_game_keys: roundGameKeys }) });
        return res.json({ roundGameKeys, roundIndex: 0 });
      }
      case 'royale-round-finish': {
        const { token, sessionId, roundIndex, score } = body;
        if (!sessionId || roundIndex === undefined || roundIndex === null) return res.status(400).json({ error: 'Paramètres manquants.' });
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        const sr = await sb(`/royale_sessions?id=eq.${encodeURIComponent(sessionId)}&select=*`);
        const session = sr.data && sr.data[0];
        if (!session) return res.status(404).json({ error: 'Partie introuvable.' });
        const membership = await sb(`/royale_players?session_id=eq.${encodeURIComponent(sessionId)}&user_id=eq.${user.id}&select=id`);
        if (!membership.data || !membership.data[0]) return res.status(403).json({ error: 'Tu ne fais pas partie de cette partie.' });
        if (session.status !== 'playing' || Number(session.round_index) !== Number(roundIndex)) {
          return res.status(409).json({ error: 'Cette épreuve est déjà terminée.' });
        }
        const gameKey = (session.round_game_keys || [])[roundIndex] || 'inconnu';
        const s = Math.max(0, Math.min(999999, Math.round(Number(score) || 0)));
        // Même remarque que royale_players : on_conflict explicite requis, la PK
        // `id` seule ne correspond pas à la contrainte unique qu'on veut cibler.
        await sb(`/royale_round_results?on_conflict=session_id,round_index,user_id`, { method: 'POST', headers: { Prefer: 'return=representation,resolution=merge-duplicates' }, body: JSON.stringify({ session_id: sessionId, round_index: roundIndex, user_id: user.id, game_key: gameKey, score: s }) });
        const allPlayers = await sb(`/royale_players?session_id=eq.${encodeURIComponent(sessionId)}&select=user_id`);
        const totalPlayers = (allPlayers.data || []).length;
        const finishedRows = await sb(`/royale_round_results?session_id=eq.${encodeURIComponent(sessionId)}&round_index=eq.${roundIndex}&select=user_id`);
        const finishedCount = (finishedRows.data || []).length;
        let advanced = false, newRoundIndex = session.round_index, sessionStatus = session.status;
        if (finishedCount >= totalPlayers) {
          // Deux dernières soumissions arrivant en même temps peuvent toutes les
          // deux déclencher cette branche : inoffensif, le PATCH ci-dessous est
          // conditionné sur l'état encore en cours et idempotent (même valeur).
          if (Number(roundIndex) >= 4) {
            sessionStatus = 'done';
            await sb(`/royale_sessions?id=eq.${encodeURIComponent(sessionId)}&status=eq.playing`, { method: 'PATCH', body: JSON.stringify({ status: 'done' }) });
          } else {
            newRoundIndex = Number(roundIndex) + 1;
            await sb(`/royale_sessions?id=eq.${encodeURIComponent(sessionId)}&status=eq.playing&round_index=eq.${roundIndex}`, { method: 'PATCH', body: JSON.stringify({ round_index: newRoundIndex }) });
          }
          advanced = true;
        }
        return res.json({ advanced, newRoundIndex, sessionStatus, finishedCount, totalPlayers });
      }
      case 'royale-force-advance': {
        const { token, sessionId } = body;
        if (!sessionId) return res.status(400).json({ error: 'Partie introuvable.' });
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        const sr = await sb(`/royale_sessions?id=eq.${encodeURIComponent(sessionId)}&select=*`);
        const session = sr.data && sr.data[0];
        if (!session) return res.status(404).json({ error: 'Partie introuvable.' });
        if (session.host_user_id !== user.id) return res.status(403).json({ error: 'Seul l\'hôte peut forcer la suite.' });
        if (session.status !== 'playing') return res.status(409).json({ error: "La partie n'est pas en cours." });
        let newRoundIndex = session.round_index, sessionStatus = 'playing';
        if (Number(session.round_index) >= 4) {
          sessionStatus = 'done';
          await sb(`/royale_sessions?id=eq.${encodeURIComponent(sessionId)}`, { method: 'PATCH', body: JSON.stringify({ status: 'done' }) });
        } else {
          newRoundIndex = Number(session.round_index) + 1;
          await sb(`/royale_sessions?id=eq.${encodeURIComponent(sessionId)}`, { method: 'PATCH', body: JSON.stringify({ round_index: newRoundIndex }) });
        }
        return res.json({ advanced: true, newRoundIndex, sessionStatus });
      }
      case 'royale-final': {
        const { token, sessionId } = body;
        if (!sessionId) return res.status(400).json({ error: 'Partie introuvable.' });
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        const pr = await sb(`/royale_players?session_id=eq.${encodeURIComponent(sessionId)}&select=user_id,label&order=joined_at.asc`);
        const players = pr.data || [];
        // Le classement final n'a rien de sensible (labels + scores d'une
        // partie), mais on limite quand même la lecture aux joueurs de CETTE
        // partie (host inclus) — pas d'accès par simple devinette d'UUID.
        const sr0 = await sb(`/royale_sessions?id=eq.${encodeURIComponent(sessionId)}&select=host_user_id`);
        const session0 = sr0.data && sr0.data[0];
        if (!session0) return res.status(404).json({ error: 'Partie introuvable.' });
        const isMember = session0.host_user_id === user.id || players.some((p) => p.user_id === user.id);
        if (!isMember) return res.status(403).json({ error: 'Accès refusé.' });
        const rr = await sb(`/royale_round_results?session_id=eq.${encodeURIComponent(sessionId)}&select=round_index,user_id,game_key,score&order=round_index.asc`);
        const results = rr.data || [];
        const byRound = {};
        results.forEach((r) => { (byRound[r.round_index] = byRound[r.round_index] || []).push(r); });
        const totals = {};
        players.forEach((p) => { totals[p.user_id] = { userId: p.user_id, label: p.label, totalPoints: 0, rounds: [] }; });
        // Classement par épreuve : score le plus haut = le plus de points
        // (n joueurs => 1er gagne n points, dernier 1 point), pour pouvoir
        // additionner des épreuves à unités différentes (mpm, points) sans
        // les normaliser entre elles.
        Object.keys(byRound).forEach((idx) => {
          const rows = byRound[idx].slice().sort((a, b) => b.score - a.score);
          const n = rows.length;
          rows.forEach((row, i) => {
            const points = n - i;
            if (!totals[row.user_id]) totals[row.user_id] = { userId: row.user_id, label: '?', totalPoints: 0, rounds: [] };
            totals[row.user_id].totalPoints += points;
            totals[row.user_id].rounds.push({ roundIndex: Number(idx), gameKey: row.game_key, score: row.score, rank: i + 1, points });
          });
        });
        const ranking = Object.values(totals).sort((a, b) => b.totalPoints - a.totalPoints);
        return res.json({ ranking });
      }
      case 'royale-teacher-sessions': {
        const { token } = body;
        const user = await userFromToken(token);
        if (!user) return res.status(401).json({ error: 'Session invalide.' });
        if (!canActAsTeacher(user)) return res.status(403).json({ error: 'Réservé aux comptes enseignant.' });
        const sr = await sb(`/royale_sessions?host_user_id=eq.${user.id}&host_is_teacher=eq.true&status=eq.done&select=id,join_code,round_game_keys,created_at&order=created_at.desc&limit=25`);
        const sessions = sr.data || [];
        const withCounts = await Promise.all(sessions.map(async (s) => {
          const pr = await sb(`/royale_players?session_id=eq.${encodeURIComponent(s.id)}&select=user_id`);
          return { sessionId: s.id, joinCode: s.join_code, roundGameKeys: s.round_game_keys, createdAt: s.created_at, playerCount: (pr.data || []).length };
        }));
        return res.json({ sessions: withCounts });
      }

      default:
        return res.status(400).json({ error: 'Action inconnue.' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
