# KeyPace Battle Royale — Serveur de jeu

Serveur temps réel (Node.js / TypeScript / Socket.io) pour la compétition de dactylo type Battle Royale.

- **Salons de 10 à 50 joueurs** (bornes configurables, plafond dur à 50)
- **Anti-triche** : plafond 250 WPM global + fenêtre glissante 3 s anti-rafales, 3 strikes → disqualification
- **Classement diffusé toutes les 200 ms** à tous les participants + spectateurs (écran géant)
- **Battle Royale** : le dernier du classement est éliminé toutes les 15 s (désactivable)
- **Fin de partie** : podium (top 3) + classement complet

## Démarrage

```bash
npm install
npm run dev        # développement (tsx watch)
npm run build && npm start   # production
```

Variables d'environnement : `PORT` (défaut 3001), `CORS_ORIGIN` (défaut `*` — à restreindre en prod, ex. `https://keypace.fr`).

> ⚠️ Ce serveur a besoin d'un processus long-lived (WebSockets) : il ne peut pas tourner
> en fonction serverless Vercel. Déployez-le sur Railway, Fly.io, Render ou un VPS,
> et pointez le client du site vitrine dessus.

Healthcheck : `GET /health` → `{ ok, rooms, uptime }`.

## Protocole Socket.io

### Client → Serveur (avec ack)

| Événement | Payload | Ack |
|---|---|---|
| `room:create` | `{ name, config? }` | `{ roomId, playerId, config, players }` ou `{ error }` |
| `room:join` | `{ roomId, name }` | idem |
| `room:spectate` | `{ roomId }` | `{ ok, roomId }` — pour l'écran géant |
| `room:start` | `{ playerId }` | `{ ok }` ou `{ error }` (min. joueurs requis) |
| `player:progress` | `{ wordIndex }` | — (index du mot courant, envoyé à chaque mot validé) |

`config` accepte : `minPlayers` (10), `maxPlayers` (50), `wordCount` (120), `countdownSeconds` (5), `maxDurationMs` (300000), `eliminationIntervalMs` (15000, `0` = désactivé).

### Serveur → Client

| Événement | Contenu |
|---|---|
| `room:playerJoined` / `room:playerLeft` | entrée/sortie du lobby |
| `game:countdown` | `{ seconds, words? }` — le texte est envoyé au premier tick |
| `game:start` | `{ startAt, totalWords }` |
| `leaderboard:update` | toutes les 200 ms : `{ entries: [{ rank, name, wordIndex, progress, wpm, status }], alive, elapsedMs }` (volatile) |
| `player:progressRejected` | update refusé par l'anti-triche, avec la position à laquelle se resynchroniser |
| `player:disqualified` / `room:playerDisqualified` | après 3 strikes anti-triche |
| `player:eliminated` / `room:playerEliminated` | élimination Battle Royale du dernier |
| `player:finished` | `{ rank, wpm }` pour le joueur qui termine |
| `game:end` | `{ podium: [top 3], ranking, durationMs, reason }` |

## Anti-triche (`src/anti-cheat.ts`)

Deux contrôles complémentaires sur chaque `player:progress`, horodatés côté serveur :

1. **Plafond global** — depuis le départ de la course, `wordIndex ≤ 250 WPM × minutes écoulées + 3 mots de marge`. Empêche toute progression globalement surhumaine.
2. **Fenêtre glissante 3 s** — la vitesse instantanée ne peut dépasser 250 × 1,3 WPM (tolérance latence). Bloque les bots qui « rattrapent » par rafales tout en restant sous le plafond global.

Un update refusé compte un strike et resynchronise le client ; les régressions d'index (retards réseau) sont ignorées sans pénalité. Trois strikes → disqualification.

## Test

```bash
npm run build && node dist/server.js &
npx tsx test/smoke.ts
```

Le test simule une course à 3 joueurs (200 WPM, 120 WPM et un bot à 600 WPM) : vérifie la disqualification du bot, la cadence des broadcasts et le podium.
