# Sons de jeu — statut

L'infrastructure de lecture (`playSound()` dans `index.html`) est branchée sur les moments clés de tous les jeux. Chaque fichier posé ici, avec **exactement le nom indiqué**, prend automatiquement le pas sur la synthèse (aucune modification de code nécessaire).

| Fichier | Statut | Déclenché quand | Durée conseillée | Ton |
|---|---|---|---|---|
| `countdown.mp3` | ✅ fourni | Chaque tick du compte à rebours 3-2-1-GO | 100-200 ms | Tick net, type métronome |
| `levelup.mp3` | ✅ fourni | Déblocage d'un niveau/palier — **distinct** de `record.mp3` : ceci célèbre une progression nouvelle, pas juste un meilleur score sur un niveau déjà acquis | 400-800 ms | Montant, "on passe à la suite" |
| `record.mp3` | ✅ fourni | Nouveau record personnel, tous jeux confondus | 400-800 ms | Célébratoire, sans être criard |
| `hit.mp3` | 🔵 synthétisé | Mot/cible/tuile réussi, tous les jeux | 80-150 ms | Court, satisfaisant, aigu (type "pop" ou "clic" léger) |
| `miss.mp3` | 🔵 synthétisé | Erreur de frappe / mot raté / tuile ratée, tous les jeux | 100-200 ms | Discret, jamais agressif ni honteux (l'échec fait partie de l'apprentissage) |
| `life.mp3` | 🔵 synthétisé | Vie regagnée (tuile bonus ♥ dans Précision souris) | 150-250 ms | Bref, chaleureux, ascendant |
| `victory.mp3` | 🔵 synthétisé | Victoire en Duel 1v1 | 600 ms - 1,5 s | Triomphant |
| `defeat.mp3` | 🔵 synthétisé | Défaite en Duel 1v1 | 400-800 ms | Doux, jamais moqueur |

**🔵 synthétisé** : en l'absence du fichier, `playSound()` génère la tonalité à la volée via l'API Web Audio (`SYNTH_SOUNDS` dans `index.html`) plutôt que de rester silencieux — correct mais plus simple qu'un vrai enregistrement. Déposer le fichier correspondant ici le remplace automatiquement par un son plus riche, sans toucher au code.

**Formats** : `.mp3` (bonne compatibilité navigateur, taille raisonnable). Volume déjà fixé à 45% côté code (`base.volume=0.45` dans `playSound()`) : livre des fichiers déjà normalisés à peu près au même niveau sonore entre eux, sans dépendre de ce réglage pour équilibrer.

**Comment désactiver les sons** : un utilisateur peut couper le son entièrement dans Réglages → Sons de jeu. Préférence retenue dans `localStorage`. La musique de fond de Magic Tiles a son propre réglage séparé, juste en dessous.
