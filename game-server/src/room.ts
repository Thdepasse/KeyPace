import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { AntiCheatMonitor } from './anti-cheat';
import { generateRaceWords } from './words';
import {
  DEFAULT_ROOM_CONFIG,
  LEADERBOARD_INTERVAL_MS,
  GameEndPayload,
  LeaderboardEntry,
  LeaderboardPayload,
  PlayerPublic,
  PlayerStatus,
  PodiumEntry,
  RoomConfig,
  RoomState,
} from './types';

interface Player {
  id: string;
  socketId: string;
  name: string;
  status: PlayerStatus;
  wordIndex: number;
  lastUpdateAt: number;
  finishedAt: number | null;
  rank: number | null;
  antiCheat: AntiCheatMonitor | null;
}

export class Room {
  readonly id: string;
  readonly config: RoomConfig;
  state: RoomState = 'lobby';

  private players = new Map<string, Player>(); // clé = playerId
  private bySocket = new Map<string, string>(); // socketId -> playerId
  private words: string[] = [];
  private raceStartAt = 0;
  private nextFinishRank = 1;
  private leaderboardTimer: NodeJS.Timeout | null = null;
  private eliminationTimer: NodeJS.Timeout | null = null;
  private maxDurationTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly io: Server,
    config: Partial<RoomConfig> = {},
    private readonly onEmpty: (roomId: string) => void,
  ) {
    this.id = randomUUID().slice(0, 8);
    this.config = { ...DEFAULT_ROOM_CONFIG, ...config };
    // bornes de sécurité : salons de 10 à 50 joueurs
    this.config.minPlayers = Math.max(2, Math.min(this.config.minPlayers, 50));
    this.config.maxPlayers = Math.max(this.config.minPlayers, Math.min(this.config.maxPlayers, 50));
  }

  get playerCount(): number {
    return this.players.size;
  }

  get isJoinable(): boolean {
    return this.state === 'lobby' && this.players.size < this.config.maxPlayers;
  }

  // ── Cycle de vie des joueurs ────────────────────────────────────────────

  addPlayer(socket: Socket, name: string): Player | { error: string } {
    if (!this.isJoinable) {
      return { error: this.state === 'lobby' ? 'Salon complet (50 joueurs max)' : 'Partie déjà en cours' };
    }
    const cleanName = name.trim().slice(0, 24) || `Joueur-${this.players.size + 1}`;
    const player: Player = {
      id: randomUUID(),
      socketId: socket.id,
      name: cleanName,
      status: 'waiting',
      wordIndex: 0,
      lastUpdateAt: 0,
      finishedAt: null,
      rank: null,
      antiCheat: null,
    };
    this.players.set(player.id, player);
    this.bySocket.set(socket.id, player.id);
    socket.join(this.id);

    this.io.to(this.id).emit('room:playerJoined', {
      player: this.toPublic(player),
      playerCount: this.players.size,
      minPlayers: this.config.minPlayers,
      maxPlayers: this.config.maxPlayers,
    });
    return player;
  }

  /** L'écran géant rejoint la room Socket.io sans devenir joueur : il reçoit les broadcasts. */
  addSpectator(socket: Socket): void {
    socket.join(this.id);
    socket.emit('room:spectating', {
      roomId: this.id,
      state: this.state,
      playerCount: this.players.size,
      players: this.publicPlayers(),
    });
  }

  handleDisconnect(socketId: string): void {
    const playerId = this.bySocket.get(socketId);
    if (!playerId) return;
    this.bySocket.delete(socketId);
    const player = this.players.get(playerId);
    if (!player) return;

    if (this.state === 'lobby') {
      this.players.delete(playerId);
    } else {
      player.status = 'disconnected';
    }
    this.io.to(this.id).emit('room:playerLeft', { playerId, playerCount: this.activePlayers().length });

    if (this.activePlayers().length === 0) {
      this.destroy();
      this.onEmpty(this.id);
    } else if (this.state === 'playing' && this.aliveTypers().length === 0) {
      this.endGame('all-players-gone');
    }
  }

  // ── Démarrage ───────────────────────────────────────────────────────────

  requestStart(playerId: string): { error: string } | { ok: true } {
    if (this.state !== 'lobby') return { error: 'La partie a déjà démarré' };
    if (!this.players.has(playerId)) return { error: 'Joueur inconnu dans ce salon' };
    if (this.players.size < this.config.minPlayers) {
      return { error: `Il faut au moins ${this.config.minPlayers} joueurs (${this.players.size} présents)` };
    }
    this.startCountdown();
    return { ok: true };
  }

  private startCountdown(): void {
    this.state = 'countdown';
    this.words = generateRaceWords(this.config.wordCount);
    let remaining = this.config.countdownSeconds;

    // Le texte est envoyé pendant le compte à rebours pour que les clients pré-rendent,
    // mais raceStartAt fait foi côté serveur pour l'anti-triche.
    this.io.to(this.id).emit('game:countdown', { seconds: remaining, words: this.words });

    this.countdownTimer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        this.io.to(this.id).emit('game:countdown', { seconds: remaining });
        return;
      }
      clearInterval(this.countdownTimer!);
      this.countdownTimer = null;
      this.startRace();
    }, 1_000);
  }

  private startRace(): void {
    this.state = 'playing';
    this.raceStartAt = Date.now();
    for (const player of this.players.values()) {
      if (player.status === 'disconnected') continue;
      player.status = 'typing';
      player.antiCheat = new AntiCheatMonitor(this.raceStartAt, this.words.length);
    }
    this.io.to(this.id).emit('game:start', { startAt: this.raceStartAt, totalWords: this.words.length });

    this.leaderboardTimer = setInterval(() => this.broadcastLeaderboard(), LEADERBOARD_INTERVAL_MS);
    this.maxDurationTimer = setTimeout(() => this.endGame('timeout'), this.config.maxDurationMs);
    if (this.config.eliminationIntervalMs > 0) {
      this.eliminationTimer = setInterval(() => this.eliminateLast(), this.config.eliminationIntervalMs);
    }
  }

  // ── Progression + anti-triche ───────────────────────────────────────────

  handleProgress(socketId: string, wordIndex: number): void {
    if (this.state !== 'playing') return;
    const playerId = this.bySocket.get(socketId);
    const player = playerId ? this.players.get(playerId) : undefined;
    if (!player || player.status !== 'typing' || !player.antiCheat) return;

    const now = Date.now();
    const verdict = player.antiCheat.check(wordIndex, now);

    if (!verdict.ok) {
      if (verdict.disqualify) {
        player.status = 'disqualified';
        this.io.to(player.socketId).emit('player:disqualified', { reason: verdict.reason });
        this.io.to(this.id).emit('room:playerDisqualified', { playerId: player.id, name: player.name });
        this.checkRaceCompletion();
      } else {
        // Update rejeté : le client est resynchronisé sur la dernière position validée
        this.io.to(player.socketId).emit('player:progressRejected', {
          reason: verdict.reason,
          wordIndex: player.wordIndex,
        });
      }
      return;
    }

    player.wordIndex = wordIndex;
    player.lastUpdateAt = now;

    if (wordIndex >= this.words.length) {
      player.status = 'finished';
      player.finishedAt = now;
      player.rank = this.nextFinishRank++;
      this.io.to(player.socketId).emit('player:finished', { rank: player.rank, wpm: this.wpmOf(player, now) });
      this.checkRaceCompletion();
    }
  }

  // ── Battle Royale : élimination du dernier ──────────────────────────────

  private eliminateLast(): void {
    const typers = this.aliveTypers();
    if (typers.length <= 3) return; // on préserve le podium
    const last = typers.reduce((worst, p) => (p.wordIndex < worst.wordIndex ? p : worst));
    last.status = 'eliminated';
    this.io.to(last.socketId).emit('player:eliminated', { wordIndex: last.wordIndex });
    this.io.to(this.id).emit('room:playerEliminated', { playerId: last.id, name: last.name });
    this.checkRaceCompletion();
  }

  // ── Classement (broadcast 200 ms) ───────────────────────────────────────

  private broadcastLeaderboard(): void {
    const now = Date.now();
    const entries: LeaderboardEntry[] = this.rankedPlayers(now).map((p, i) => ({
      id: p.id,
      name: p.name,
      wordIndex: p.wordIndex,
      progress: this.words.length ? p.wordIndex / this.words.length : 0,
      wpm: this.wpmOf(p, now),
      status: p.status,
      rank: i + 1,
    }));

    const payload: LeaderboardPayload = {
      roomId: this.id,
      state: this.state,
      elapsedMs: now - this.raceStartAt,
      totalWords: this.words.length,
      alive: this.aliveTypers().length,
      entries,
      timestamp: now,
    };
    // volatile : si un tick de classement se perd, le suivant arrive 200 ms après —
    // inutile de le mettre en file d'attente
    this.io.to(this.id).volatile.emit('leaderboard:update', payload);
  }

  // ── Fin de partie ───────────────────────────────────────────────────────

  private checkRaceCompletion(): void {
    if (this.state !== 'playing') return;
    const stillTyping = this.aliveTypers().length;
    const finished = [...this.players.values()].filter((p) => p.status === 'finished').length;
    // Fin quand plus personne ne tape, ou que le podium complet est arrivé
    if (stillTyping === 0 || finished >= 3) {
      this.endGame(stillTyping === 0 ? 'no-typers-left' : 'podium-complete');
    }
  }

  private endGame(reason: string): void {
    if (this.state !== 'playing') return;
    this.state = 'finished';
    this.clearTimers();

    const now = Date.now();
    // Rang final pour ceux qui n'ont pas fini : par progression décroissante
    const unranked = this.rankedPlayers(now).filter((p) => p.rank === null);
    for (const p of unranked) p.rank = this.nextFinishRank++;

    const ranking = this.rankedPlayers(now).map((p) => this.toPublic(p, now));
    const podium: PodiumEntry[] = ranking.slice(0, 3).map((p, i) => ({
      rank: (i + 1) as 1 | 2 | 3,
      id: p.id,
      name: p.name,
      wpm: p.wpm,
      wordIndex: p.wordIndex,
      finishedAt: p.finishedAt,
    }));

    const payload: GameEndPayload = {
      roomId: this.id,
      podium,
      ranking,
      durationMs: now - this.raceStartAt,
    };
    this.io.to(this.id).emit('game:end', { ...payload, reason });
  }

  destroy(): void {
    this.clearTimers();
    this.players.clear();
    this.bySocket.clear();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private clearTimers(): void {
    for (const t of [this.leaderboardTimer, this.eliminationTimer, this.countdownTimer]) {
      if (t) clearInterval(t as NodeJS.Timeout);
    }
    if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
    this.leaderboardTimer = this.eliminationTimer = this.countdownTimer = this.maxDurationTimer = null;
  }

  private activePlayers(): Player[] {
    return [...this.players.values()].filter((p) => p.status !== 'disconnected');
  }

  private aliveTypers(): Player[] {
    return [...this.players.values()].filter((p) => p.status === 'typing');
  }

  /** Finishers d'abord (par rang), puis les autres par progression décroissante. */
  private rankedPlayers(now: number): Player[] {
    return [...this.players.values()].sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      if (b.wordIndex !== a.wordIndex) return b.wordIndex - a.wordIndex;
      return a.lastUpdateAt - b.lastUpdateAt; // à égalité, le premier arrivé sur le mot
    });
  }

  private wpmOf(player: Player, now: number): number {
    const end = player.finishedAt ?? now;
    const minutes = (end - this.raceStartAt) / 60_000;
    return minutes > 0 ? Math.round(player.wordIndex / minutes) : 0;
  }

  private toPublic(player: Player, now = Date.now()): PlayerPublic {
    return {
      id: player.id,
      name: player.name,
      status: player.status,
      wordIndex: player.wordIndex,
      wpm: this.state === 'lobby' ? 0 : this.wpmOf(player, now),
      rank: player.rank,
      finishedAt: player.finishedAt,
    };
  }

  publicPlayers(): PlayerPublic[] {
    return [...this.players.values()].map((p) => this.toPublic(p));
  }
}
