import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Room } from './room';
import { RoomConfig } from './types';

const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, uptime: process.uptime() }));
    return;
  }
  res.writeHead(404).end();
});

const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN },
  // Un client qui ne répond plus est considéré déconnecté rapidement,
  // pour ne pas fausser le classement affiché sur l'écran géant.
  pingInterval: 5_000,
  pingTimeout: 5_000,
});

const rooms = new Map<string, Room>();
const socketRoom = new Map<string, string>(); // socketId -> roomId

function roomOf(socket: Socket): Room | undefined {
  const roomId = socketRoom.get(socket.id);
  return roomId ? rooms.get(roomId) : undefined;
}

io.on('connection', (socket: Socket) => {
  // ── Création d'un salon ──
  socket.on('room:create', (data: { name?: string; config?: Partial<RoomConfig> } = {}, ack?: Function) => {
    if (socketRoom.has(socket.id)) return ack?.({ error: 'Déjà dans un salon' });
    const room = new Room(io, data.config ?? {}, (id) => rooms.delete(id));
    rooms.set(room.id, room);

    const result = room.addPlayer(socket, data.name ?? '');
    if ('error' in result) {
      rooms.delete(room.id);
      return ack?.({ error: result.error });
    }
    socketRoom.set(socket.id, room.id);
    ack?.({
      roomId: room.id,
      playerId: result.id,
      config: room.config,
      players: room.publicPlayers(),
    });
  });

  // ── Rejoindre un salon ──
  socket.on('room:join', (data: { roomId?: string; name?: string } = {}, ack?: Function) => {
    if (socketRoom.has(socket.id)) return ack?.({ error: 'Déjà dans un salon' });
    const room = rooms.get(data.roomId ?? '');
    if (!room) return ack?.({ error: 'Salon introuvable' });

    const result = room.addPlayer(socket, data.name ?? '');
    if ('error' in result) return ack?.({ error: result.error });

    socketRoom.set(socket.id, room.id);
    ack?.({
      roomId: room.id,
      playerId: result.id,
      config: room.config,
      players: room.publicPlayers(),
    });
  });

  // ── Écran géant : spectateur (reçoit leaderboard:update sans jouer) ──
  socket.on('room:spectate', (data: { roomId?: string } = {}, ack?: Function) => {
    const room = rooms.get(data.roomId ?? '');
    if (!room) return ack?.({ error: 'Salon introuvable' });
    room.addSpectator(socket);
    ack?.({ ok: true, roomId: room.id });
  });

  // ── Lancer la partie ──
  socket.on('room:start', (data: { playerId?: string } = {}, ack?: Function) => {
    const room = roomOf(socket);
    if (!room) return ack?.({ error: 'Pas dans un salon' });
    const result = room.requestStart(data.playerId ?? '');
    ack?.(result);
  });

  // ── Progression du joueur (index du mot courant) ──
  socket.on('player:progress', (data: { wordIndex?: number } = {}) => {
    const room = roomOf(socket);
    if (!room || typeof data.wordIndex !== 'number') return;
    room.handleProgress(socket.id, data.wordIndex);
  });

  // ── Déconnexion ──
  socket.on('disconnect', () => {
    const room = roomOf(socket);
    socketRoom.delete(socket.id);
    room?.handleDisconnect(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`⌨️  KeyPace Battle Royale — serveur de jeu sur :${PORT}`);
});
