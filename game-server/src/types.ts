export type RoomState = 'lobby' | 'countdown' | 'playing' | 'finished';

export type PlayerStatus = 'waiting' | 'typing' | 'finished' | 'eliminated' | 'disqualified' | 'disconnected';

export interface PlayerPublic {
  id: string;
  name: string;
  status: PlayerStatus;
  wordIndex: number;
  wpm: number;
  rank: number | null;       // rang final (1 = vainqueur), null tant que la course n'est pas finie pour lui
  finishedAt: number | null; // timestamp de fin, null sinon
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  wordIndex: number;
  progress: number; // 0..1
  wpm: number;
  status: PlayerStatus;
  rank: number;     // position courante dans le classement (1 = premier)
}

export interface LeaderboardPayload {
  roomId: string;
  state: RoomState;
  elapsedMs: number;
  totalWords: number;
  alive: number;
  entries: LeaderboardEntry[];
  timestamp: number;
}

export interface PodiumEntry {
  rank: 1 | 2 | 3;
  id: string;
  name: string;
  wpm: number;
  wordIndex: number;
  finishedAt: number | null;
}

export interface GameEndPayload {
  roomId: string;
  podium: PodiumEntry[];
  ranking: PlayerPublic[]; // classement complet
  durationMs: number;
}

export interface RoomConfig {
  minPlayers: number;        // 10 par défaut
  maxPlayers: number;        // 50 par défaut
  wordCount: number;         // longueur du texte
  countdownSeconds: number;  // compte à rebours avant le départ
  maxDurationMs: number;     // durée max d'une manche
  eliminationIntervalMs: number; // 0 = pas d'élimination Battle Royale
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  minPlayers: 10,
  maxPlayers: 50,
  wordCount: 120,
  countdownSeconds: 5,
  maxDurationMs: 5 * 60_000,
  eliminationIntervalMs: 15_000,
};

// Anti-triche
export const MAX_WPM = 250;                  // vitesse humainement plausible max
export const BURST_WINDOW_MS = 3_000;        // fenêtre glissante pour la vitesse instantanée
export const BURST_TOLERANCE = 1.3;          // tolérance sur la fenêtre courte (latence, rafales réseau)
export const GLOBAL_GRACE_WORDS = 3;         // marge sur le plafond global depuis le départ
export const MAX_STRIKES = 3;                // strikes avant disqualification

export const LEADERBOARD_INTERVAL_MS = 200;
