import {
  MAX_WPM,
  BURST_WINDOW_MS,
  BURST_TOLERANCE,
  GLOBAL_GRACE_WORDS,
  MAX_STRIKES,
} from './types';

export type CheatVerdict =
  | { ok: true }
  | { ok: false; reason: string; disqualify: boolean };

interface ProgressSample {
  at: number;
  wordIndex: number;
}

/**
 * Vérifie qu'une progression est humainement possible (plafond 250 mots/min).
 *
 * Deux contrôles complémentaires :
 * 1. Plafond global : depuis le départ de la course, l'index ne peut pas dépasser
 *    MAX_WPM * minutes écoulées (+ une petite marge pour la latence réseau).
 * 2. Fenêtre glissante : la vitesse sur les 3 dernières secondes ne peut pas
 *    dépasser MAX_WPM * tolérance — bloque les bots qui "rattrapent" par rafales
 *    tout en restant sous le plafond global.
 *
 * Une violation = un strike ; l'update est rejeté mais le joueur continue
 * (une rafale réseau légitime ne doit pas éliminer un humain). Au bout de
 * MAX_STRIKES, disqualification.
 */
export class AntiCheatMonitor {
  private samples: ProgressSample[] = [];
  private strikes = 0;
  private lastAcceptedIndex = 0;

  constructor(private readonly raceStartAt: number, private readonly totalWords: number) {}

  check(wordIndex: number, now: number): CheatVerdict {
    if (!Number.isInteger(wordIndex) || wordIndex < 0 || wordIndex > this.totalWords) {
      return this.strike('index de mot invalide');
    }
    if (wordIndex <= this.lastAcceptedIndex) {
      // Régression ou doublon : on ignore sans pénaliser (retard réseau, retransmission)
      return { ok: false, reason: 'index non monotone (ignoré)', disqualify: false };
    }

    const elapsedMin = Math.max(0, now - this.raceStartAt) / 60_000;
    const globalCap = MAX_WPM * elapsedMin + GLOBAL_GRACE_WORDS;
    if (wordIndex > globalCap) {
      return this.strike(`vitesse globale impossible (${Math.round(wordIndex / Math.max(elapsedMin, 1 / 60_000))} WPM > ${MAX_WPM})`);
    }

    // Vitesse instantanée sur la fenêtre glissante
    this.samples = this.samples.filter((s) => now - s.at <= BURST_WINDOW_MS);
    const oldest = this.samples[0];
    if (oldest) {
      const windowMin = (now - oldest.at) / 60_000;
      if (windowMin > 0) {
        const burstWpm = (wordIndex - oldest.wordIndex) / windowMin;
        if (burstWpm > MAX_WPM * BURST_TOLERANCE) {
          return this.strike(`rafale impossible (${Math.round(burstWpm)} WPM sur ${BURST_WINDOW_MS / 1000}s)`);
        }
      }
    }

    this.samples.push({ at: now, wordIndex });
    this.lastAcceptedIndex = wordIndex;
    return { ok: true };
  }

  private strike(reason: string): CheatVerdict {
    this.strikes++;
    return { ok: false, reason, disqualify: this.strikes >= MAX_STRIKES };
  }
}
