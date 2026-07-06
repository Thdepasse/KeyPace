/**
 * Bots de démo : créent un salon, attendent qu'un humain rejoigne,
 * lancent la partie et tapent à des vitesses variées.
 *
 * Usage : npx tsx test/bots.ts [nbBots=4] (serveur sur :3001)
 * Affiche "ROOM=<code>" dès que le salon est prêt.
 */
import { io, Socket } from 'socket.io-client';

const URL = 'http://localhost:3001';
const NB_BOTS = Number(process.argv[2]) || 4;
const WPMS = [180, 140, 100, 70, 60, 50]; // vitesses des bots

function emitAck<T>(socket: Socket, event: string, data: unknown): Promise<T> {
  return new Promise((resolve) => socket.emit(event, data, resolve));
}

function runBot(socket: Socket, wpm: number, name: string) {
  let words: string[] = [];
  let idx = 0;
  let timer: NodeJS.Timeout | null = null;
  const stop = () => { if (timer) clearInterval(timer); timer = null; };

  socket.on('game:countdown', (d: any) => { if (d.words) { words = d.words; idx = 0; } });
  socket.on('game:start', () => {
    timer = setInterval(() => {
      idx++;
      socket.emit('player:progress', { wordIndex: idx });
      if (idx >= words.length) stop();
    }, 60_000 / wpm);
  });
  socket.on('player:eliminated', () => { console.log(`  ${name} éliminé à ${idx} mots`); stop(); });
  socket.on('player:finished', (d: any) => console.log(`  ${name} a fini #${d.rank} (${d.wpm} WPM)`));
  socket.on('game:end', () => stop());
}

async function main() {
  const host = io(URL, { transports: ['websocket'] });
  const created: any = await emitAck(host, 'room:create', {
    name: 'Bot-180wpm',
    config: { minPlayers: 2, wordCount: 40, countdownSeconds: 3, eliminationIntervalMs: 12_000 },
  });
  if (created.error) throw new Error(created.error);
  runBot(host, WPMS[0], 'Bot-180wpm');
  console.log('ROOM=' + created.roomId);

  for (let i = 1; i < NB_BOTS; i++) {
    const s = io(URL, { transports: ['websocket'] });
    const wpm = WPMS[i % WPMS.length];
    const name = `Bot-${wpm}wpm`;
    const j: any = await emitAck(s, 'room:join', { roomId: created.roomId, name });
    if (j.error) throw new Error(j.error);
    runBot(s, wpm, name);
  }
  console.log(`${NB_BOTS} bots dans le salon, en attente d'un humain…`);

  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    console.log('Un humain a rejoint → départ dans 8s');
    await new Promise((r) => setTimeout(r, 8_000));
    const res: any = await emitAck(host, 'room:start', { playerId: created.playerId });
    if (res.error) console.error('Démarrage refusé :', res.error);
    else console.log('Partie lancée !');
  };
  host.on('room:playerJoined', start);

  host.on('game:end', (d: any) => {
    console.log('PODIUM : ' + d.podium.map((p: any) => `#${p.rank} ${p.name} (${p.wpm} WPM)`).join(' | '));
    setTimeout(() => process.exit(0), 1_000);
  });

  // garde-fou
  setTimeout(() => { console.log('Timeout bots, arrêt.'); process.exit(0); }, 180_000);
}

main().catch((e) => { console.error('Erreur bots :', e.message); process.exit(1); });
