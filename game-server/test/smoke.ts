/**
 * Test de fumée : lance une course à 3 joueurs (minPlayers=3 pour le test),
 * vérifie le broadcast 200ms, l'anti-triche (un bot à ~600 WPM doit être
 * disqualifié) et le podium final.
 *
 * Usage : npx tsx test/smoke.ts (le serveur doit tourner sur :3001)
 */
import { io, Socket } from 'socket.io-client';

const URL = 'http://localhost:3001';
const results: string[] = [];
let leaderboardTicks = 0;
let totalWords = 0;

function connect(): Socket {
  return io(URL, { transports: ['websocket'] });
}

function emitAck<T>(socket: Socket, event: string, data: unknown): Promise<T> {
  return new Promise((resolve) => socket.emit(event, data, resolve));
}

async function main() {
  const host = connect();
  const p2 = connect();
  const cheater = connect();
  const screen = connect();

  const created: any = await emitAck(host, 'room:create', {
    name: 'Alice',
    config: { minPlayers: 3, wordCount: 30, countdownSeconds: 1, eliminationIntervalMs: 0 },
  });
  if (created.error) throw new Error(created.error);
  const roomId = created.roomId;
  results.push(`✓ salon créé (${roomId})`);

  const j2: any = await emitAck(p2, 'room:join', { roomId, name: 'Bob' });
  const j3: any = await emitAck(cheater, 'room:join', { roomId, name: 'Bot600wpm' });
  if (j2.error || j3.error) throw new Error(j2.error || j3.error);
  results.push('✓ 2 joueurs ont rejoint');

  const spec: any = await emitAck(screen, 'room:spectate', { roomId });
  if (spec.error) throw new Error(spec.error);
  results.push('✓ écran géant en mode spectateur');

  screen.on('leaderboard:update', () => leaderboardTicks++);

  let cheaterDisqualified = false;
  cheater.on('player:disqualified', (d: any) => {
    cheaterDisqualified = true;
    results.push(`✓ tricheur disqualifié (${d.reason})`);
  });

  const podiumReceived = new Promise<any>((resolve) => screen.on('game:end', resolve));

  host.on('game:countdown', (d: any) => {
    if (d.words) totalWords = d.words.length;
  });

  const raceStarted = new Promise<void>((resolve) => host.on('game:start', () => resolve()));
  const startRes: any = await emitAck(host, 'room:start', { playerId: created.playerId });
  if (startRes.error) throw new Error(startRes.error);
  await raceStarted;
  results.push(`✓ course démarrée (${totalWords} mots)`);

  // Alice : ~200 WPM (légal) — un mot toutes les 300ms
  let aliceIdx = 0;
  const aliceTimer = setInterval(() => {
    aliceIdx++;
    host.emit('player:progress', { wordIndex: aliceIdx });
    if (aliceIdx >= totalWords) clearInterval(aliceTimer);
  }, 300);

  // Bob : ~120 WPM — un mot toutes les 500ms
  let bobIdx = 0;
  const bobTimer = setInterval(() => {
    bobIdx++;
    p2.emit('player:progress', { wordIndex: bobIdx });
    if (bobIdx >= totalWords) clearInterval(bobTimer);
  }, 500);

  // Tricheur : ~600 WPM — un mot toutes les 100ms
  let cheatIdx = 0;
  const cheatTimer = setInterval(() => {
    cheatIdx++;
    cheater.emit('player:progress', { wordIndex: cheatIdx });
    if (cheatIdx >= totalWords || cheaterDisqualified) clearInterval(cheatTimer);
  }, 100);

  const end: any = await podiumReceived;
  clearInterval(aliceTimer); clearInterval(bobTimer); clearInterval(cheatTimer);

  results.push(`✓ fin de partie (${end.reason}), ${leaderboardTicks} ticks de classement reçus (~${Math.round(end.durationMs / 200)} attendus)`);
  results.push(`✓ podium : ${end.podium.map((p: any) => `#${p.rank} ${p.name} (${p.wpm} WPM)`).join(' | ')}`);

  if (!cheaterDisqualified) results.push('✗ ÉCHEC : le tricheur n\'a pas été disqualifié');
  if (leaderboardTicks < 5) results.push('✗ ÉCHEC : trop peu de broadcasts leaderboard');
  if (end.podium[0].name !== 'Alice') results.push(`✗ ÉCHEC : vainqueur attendu Alice, obtenu ${end.podium[0].name}`);

  console.log(results.join('\n'));
  process.exit(results.some((r) => r.startsWith('✗')) ? 1 : 0);
}

main().catch((e) => { console.error('✗ ÉCHEC :', e.message); process.exit(1); });
setTimeout(() => { console.error('✗ ÉCHEC : timeout du test'); process.exit(1); }, 60_000);
