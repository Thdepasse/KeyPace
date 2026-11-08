# PEQ : correspondance avec le contenu KeyPace (phase 1, 2 options pilotes)

Date : 2026-11-07. Données : `peq/peq-data.js` (65 compétences). Contrôle : `node scripts/check-peq-data.js` (0 erreur : références uniques, ids de leçons et de modules existants, début de chaque intitulé retrouvé dans le PDF officiel).

Options retenues :
1. **Collaborateur·trice administratif·ive (7410)** : profil de certification approuvé le 21/02/2024. 48 compétences relevées (UAA1 à UAA3 et 2 exigences transversales).
2. **Technicien/Technicienne de bureau** : profil CCPQ, extrait de 17 compétences numériques/écrit (fonctions 03 à 09). Seul profil de bureau avec un seuil de frappe chiffré. Statut en vigueur à confirmer.

## Ce qui est réellement en ligne dans KeyPace
66 leçons de frappe (rangées, accents, majuscules, ponctuation, chiffres, symboles, fluidité), test de vitesse (30 s à 10 min), modules Rédiger un mail, Rédiger un CV, Lettre de motivation, Créer un mot de passe, Protéger ses données. Tout le reste du catalogue (formulaire, word, notes, pavé, commande, raccourcis, posture, fichiers…) est « bientôt ».

## Résultat de la correspondance

| Option | Couvert | Partiel | Manquant | Hors périmètre | À vérifier |
|---|---|---|---|---|---|
| 7410 (48) | 0 | 7 | 22 | 19 | 0 |
| Technicien de bureau (17) | 1 | 3 | 11 | 1 | 1 |

Mise à jour du 2026-11-08 : voir `docs/PEQ-REFERENTIEL-RELEVE.md`, section 8 (lecture réelle du module mail, reclassements, deux options ajoutées : comptabilité 7124 et commercial 7123).

Aucune compétence n'est « couverte » en entier : même la frappe (5.3.2) est liée à l'usage du traitement de texte. Ce point est volontaire, on ne surestime pas.

## Seuil de frappe (Technicien de bureau 5.3.2)
30 mots/minute pendant 10 minutes, à l'aveugle, 0,5 % d'erreurs, correction autorisée. KeyPace a déjà le test de 10 minutes et mesure la précision. À décider : le profil ne définit pas le « mot » ; KeyPace compte caractères divisés par 5. Ne pas afficher « objectif PEQ atteint » avant de trancher cette équivalence (question à poser à un enseignant de l'option).

## Backlog de modules, classé par nombre de compétences débloquées
1. **Traitement de texte et mise en page** (word) : 7410 2.1.3, 2.1.4 ; TB 5.3.3, 6.1.1, 9.2.2. Priorité 1.
2. **Prendre des notes** (notes) : 7410 1.1.3, 2.1.1, 3.1.2.
3. **Tableur / tableaux simples** (nouveau) : 7410 2.2.2, 2.2.3 ; TB 5.3.6, 5.3.9.
4. **Agenda électronique et outils d'organisation** (nouveau) : 7410 1.1.4, 1.2.6 ; TB 8.1.5.
5. **Ranger et retrouver ses fichiers** (fichiers) : 7410 2.3.3 ; TB 5.3.1.
6. **Remplir un formulaire** (formulaire) et **Répondre à une commande** (commande) : 7410 2.1.2, 3.3.2, 3.4.5.
7. **Bien s'installer devant le clavier** (posture, déjà en preview) : 7410 4.1.4 ; TB 8.1.11. Rapide à mettre en ligne.
8. **Pavé numérique** (pave) : saisie de chiffres pour l'encodage (7410 2.2.1, 3.3.3, 3.4.2, 3.5.2).
9. Plus lointain : présentation (2.1.5), impression (2.1.6), logiciel comptable (5.3.7), base de données (2.2.1, 5.3.5), publipostage (6.2.1), fichiers clients (3.4.1), équivalents numériques du téléphone (1.2.5).

## Points à vérifier avant d'afficher quoi que ce soit
- Contenu exact des modules mail et protection des données (netiquette, signature, e-réputation) : je n'ai marqué que « partiel » sans le lire en détail.
- Statut du profil CCPQ Technicien de bureau par option (a-t-il été remplacé par un profil SFMQ ?).
- Code d'option du Technicien de bureau : non trouvé dans le document lu.
- Cours d'anglais (5.3.4, texte en langue étrangère à 1 %) : lié au chantier anglais.

## Prochaine étape (phase 2)
Page « Mon parcours PEQ » : choix de l'option, liste d'UAA, case par compétence, badge de couverture honnête (« Entraîné dans KeyPace », « Partiel », « Pas encore dans KeyPace », « Hors KeyPace »), liens vers cours, exercices et remédiation. Progression dans `progress.data.peq` avec fusion côté serveur (voir docs/PLAN-PEQ.md).
