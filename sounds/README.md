# Sons de jeu — fichiers à fournir

L'infrastructure de lecture (`playSound()` dans `index.html`) est déjà branchée sur les moments clés des 8 jeux. Il ne manque que les fichiers eux-mêmes : dépose-les ici, avec **exactement ces noms**, et ils fonctionneront immédiatement (aucune modification de code nécessaire).

| Fichier attendu | Déclenché quand | Durée conseillée | Ton |
|---|---|---|---|
| `hit.mp3` | Mot/cible réussi (Frappe-mots pour l'instant — voir "Étendre aux autres jeux" ci-dessous) | 80-150 ms | Court, satisfaisant, aigu (type "pop" ou "clic" léger) |
| `miss.mp3` | Erreur de frappe / mot raté | 100-200 ms | Discret, jamais agressif ni honteux (l'échec fait partie de l'apprentissage) |
| `record.mp3` | Nouveau record personnel, palier franchi, niveau réussi — tous les 8 jeux | 400-800 ms | Montant, célébratoire, sans être criard |
| `victory.mp3` | Victoire en Duel 1v1 | 600 ms - 1,5 s | Triomphant |
| `defeat.mp3` | Défaite en Duel 1v1 | 400-800 ms | Doux, jamais moqueur |
| `countdown.mp3` | Chaque tick du compte à rebours 3-2-1-GO (Frappe-mots pour l'instant) | 100-200 ms | Tick net, type métronome |

**Formats** : `.mp3` (bonne compatibilité navigateur, taille raisonnable). Volume déjà fixé à 45% côté code (`base.volume=0.45` dans `playSound()`) : livre des fichiers déjà normalisés à peu près au même niveau sonore entre eux, sans dépendre de ce réglage pour équilibrer.

**Tant que ces fichiers sont absents** : `playSound()` échoue en silence (404 avalé), aucune erreur visible, aucun son cassé. Tu peux déposer les fichiers un par un, chacun s'active dès qu'il est présent.

**Comment désactiver les sons** : un utilisateur peut couper le son entièrement dans Réglages → Sons de jeu. Préférence retenue dans `localStorage`.

## Étendre aux autres jeux

`hit`/`miss` ne sont branchés que sur Frappe-mots pour l'instant (jeu choisi comme démonstrateur, le plus "plat" à l'audit). Une fois que ces deux sons sonnent bien en jouant, le même appel `playSound('hit')` / `playSound('miss')` peut être ajouté en une ligne à chaque prise de mot/cible dans Tireur d'élite, Sprint, Course, Simon et Visée — dis-le quand tu veux que ce soit fait.
