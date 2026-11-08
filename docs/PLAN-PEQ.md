# Plan : adapter KeyPace au PEQ (Parcours d'Enseignement Qualifiant, FWB)

Statut : analyse + plan, rien n'est construit. Date : 2026-11-07.

## 1. Ce qu'est le PEQ (faits sourcés)

- PEQ = Parcours d'Enseignement Qualifiant. Réforme du Pacte d'excellence qui concerne les 2e et 3e degrés du qualifiant (4e à 6e secondaire). Décret du 20 juillet 2022. Généralisé depuis la rentrée 2023-2024 (circulaires Gallilex).
- Structure : la formation au métier est organisée en **Unités de Qualification (UQ)** par option de base groupée (OBG), à côté des **Unités d'Acquis d'Apprentissage (UAA)** pour la formation générale. Le Certificat de qualification s'obtient quand toutes les UQ sont validées sur 4e-5e-6e.
- Enseignement modulaire, avec des **référentiels « métiers » communs à tous les opérateurs**.
- Sources : [Ufapec PEQ](https://www.ufapec.be/en-pratique/projets-en-cours/pacte-excellence/pee-peq/), [décret 20-07-2022](https://etaamb.openjustice.be/fr/decret-du-20-juillet-2022_n2022021121.html), [école Asty-Moulin](https://www.asty-moulin.be/peq).

**Non trouvé (à ne pas deviner)** : la liste des OBG, le contenu des référentiels métiers, et la présence éventuelle d'un volet numérique/clavier dans chaque UQ. Rien de tout cela n'est dans le repo (aucune mention de « PEQ » ; seul le FMTTN P3-S3 est traité).

## 2. Ce que KeyPace a déjà (réutilisable)

| Brique | État | Réutilisation PEQ |
|---|---|---|
| Programme par année (P3 à S6), PROG_ITEMS, sources citées mot pour mot | en local, non déployé | Même mécanique : ajouter un « programme » PEQ par option, avec citation de l'attendu |
| Catalogue de 60 modules (MODS / NEW_MODS) | partiel, certains « bientôt » | Les compétences PEQ pointent vers des modules existants ou à créer |
| Cases à cocher (artifact db `keep/…`) | outil interne de tri, pas côté élève | À transformer en suivi élève persistant |
| Progression : `progress.data` (jsonb), `api/save-progress.js` avec garde anti-régression | en prod | Ajouter une clé `peq` dans le blob, sans nouvelle table pour la v1 |
| Heatmap des touches `stats.keyStats` | en prod | Base de la remédiation ciblée |
| Classes, devoirs (`assignments`), dashboard prof, `weakestModule` | en prod | Vue prof par compétence PEQ |
| Modules Expert (mail, CV, lettre, mdp, données) avec accès serveur | en ligne | Rattachés à des UQ administratives/bureautiques |

## 3. Écarts à combler

1. **Référentiel absent** : pas de données PEQ. Bloquant, tout le reste en dépend.
2. **Unité de suivi inadaptée** : aujourd'hui = leçon/module. Le PEQ demande = compétence/UQ rattachée à une option, validée par l'enseignant.
3. **Pas de notion d'option** pour l'élève ni la classe (il y a réseau et année, pas option).
4. **Remédiation limitée au clavier** (touches faibles). Pas de remédiation par compétence.
5. **Qui coche ?** En PEQ, la validation d'une UQ appartient à l'école. KeyPace ne doit pas affirmer « acquis » à la place de l'enseignant (cohérent avec [[project-etablissement-authority]]).

## 4. Décisions de produit proposées

- **Deux états par compétence** : « Entraîné dans KeyPace » (automatique, preuve = leçons/exercices réussis) et « Validé » (case cochée par l'élève en auto-évaluation, confirmée par le prof). Pas de verrouillage par progression, en ligne avec la page Cours.
- **L'élève coche petit à petit** : liste d'options > UQ > compétences, chaque compétence a une case, un lien vers le cours, les exercices et la remédiation.
- **Pas de données inventées** : chaque compétence affichée porte sa source (citation, document, page). Sinon « non trouvé ».
- **Périmètre honnête** : KeyPace ne couvre que la part numérique/clavier/écriture d'une option (ex. frappe, courriel, tableur, rédaction administrative), jamais le geste de métier. Chaque option affiche « ce que KeyPace couvre / ne couvre pas ».

## 5. Plan par phases

### Phase 0 : sourcer le PEQ (bloquant, sans code)
- Récupérer sur Gallilex / enseignement.be / SFMQ la liste des OBG et, pour chaque option, ses référentiels (UQ, compétences).
- Les PDF lourds passent par curl + pdftotext (WebFetch les refuse), avec ton accord pour les téléchargements, et rangés dans un dossier `Programme PEQ/` comme pour FELSI/WBE.
- Relever pour chaque option : mentions de clavier, saisie, courriel, tableur, traitement de texte, documents administratifs, mots de passe, sécurité.
- **Décision à prendre avec toi** : quelles options cibler d'abord (suggestion : celles où l'écrit/bureautique est central : secrétariat-tourisme, services administratifs, commerce/gestion, vente, informatique). Livrable : `docs/PEQ-REFERENTIEL-RELEVE.md` (tableau option / UQ / compétence / citation / module KeyPace correspondant ou « manquant »).

### Phase 1 : modèle de données et correspondances
- Fichier de données `peq-data` (même esprit que PROG_ITEMS) : `option > UQ > compétence {id, texte cité, source, modules[], leçons[], exercices[], remediation[]}`.
- Table de correspondance compétence vers contenu KeyPace existant, et liste des **trous** (compétences sans contenu) = backlog de modules.
- Progression : `progress.data.peq = { optionId, competences: { id: { etat, t, via } } }`. Adapter la garde de `save-progress.js` pour fusionner `peq` (comme `assignmentsDone`) afin qu'un ancien onglet n'efface rien. Test unitaire obligatoire (voir [[project-stats-persistence-bug]]).
- Migration SQL idempotente seulement si on passe aux classes (phase 5).

### Phase 2 : page « Mon parcours PEQ » (cases à cocher)
- Choix de l'option (une ou plusieurs), liste d'UQ repliables, cases par compétence, barre de progression par UQ.
- Chaque compétence : boutons « Voir le cours », « S'exercer », « Me remettre à niveau ».
- Ton : aucune notion de blocage ni de retard.
- Base visuelle : preview-cours-programme.html (version de référence). Un seul fichier de preview, itéré en place.

### Phase 3 : cours
- Rattacher les modules existants aux compétences (rédaction mail, CV, lettre, mdp, données, pavé numérique, raccourcis, formulaire).
- Créer seulement les modules des trous identifiés en phase 1, un par un, avec le même gabarit que les modules existants (src dans `module-src/`, accès Expert via `api/_module-gate.js`, `node scripts/build-modules.js`).
- Textes d'exercice contextualisés par option (vocabulaire du métier), sans em-dash.

### Phase 4 : exercices et remédiation
- **Exercices** : séries tirées des textes réels du métier de l'option (bon de commande, courriel client, fiche d'accueil…), avec seuil de réussite par compétence (vitesse/précision définis par KeyPace, signalés comme choix KeyPace, pas officiels).
- **Remédiation en 3 niveaux** :
  1. Touches : `keyStats` existant, séries ciblées sur les touches faibles.
  2. Compétence : si un exercice lié échoue, proposer la leçon prérequise puis un exercice plus simple, avec retour automatique à la compétence d'origine.
  3. Prof : dashboard classe par compétence PEQ, liste des élèves à reprendre (extension de `weakestModule`).
- Validation finale : l'élève coche, le prof confirme (phase 5).

### Phase 5 : classes et établissements
- Option rattachée à la classe, dashboard prof par UQ/compétence, validation prof, export PDF/CSV pour le dossier élève.
- Respecter les droits établissement (voir [[project-etablissement-authority]]).

### Phase 6 : site et SEO
- Page publique « KeyPace et le PEQ » (page par option si le contenu est sourcé), mise à jour sitemap, llms.txt, mention dans la page écoles.

## 6. Ordre recommandé et gros risques

Ordre : 0 puis 1 puis 2 (livrable visible : cocher) puis 4 niveau 1 et 2 puis 3 (trous) puis 5 puis 6.

Risques :
- Le référentiel PEQ peut contenir très peu de numérique : alors KeyPace se positionne en « soutien transversal » et non en « cours du PEQ ». À mesurer en phase 0 avant d'investir.
- Surpromesse : ne jamais écrire « conforme PEQ » sans citation vérifiable.
- Régression de progression : toute écriture dans `progress.data` passe par la garde fusionnée + test.
- Le fichier index.html fait 1,4 Mo : isoler le code PEQ dans un fichier séparé chargé à la demande.

## 7. Questions ouvertes pour toi
1. Quelles options en premier ?
2. Qui valide une compétence : l'élève seul, ou l'élève + le prof ?
3. L'accès au suivi PEQ est-il gratuit ou réservé à Expert / établissements ?
4. L'élève de 4e à 6e du général (hors qualifiant) est-il aussi concerné ? (non par défaut)
