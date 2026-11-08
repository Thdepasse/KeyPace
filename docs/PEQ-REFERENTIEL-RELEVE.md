# PEQ : relevé des référentiels (phase 0, partie 1)

Date : 2026-11-07. Statut : relevé partiel, sourcé. Tout ce qui n'est pas cité ici est « non trouvé ».
PDF téléchargés dans `Programme PEQ/` (ne pas supprimer).

## 1. Où sont les documents officiels

Portail : https://lequalifiant.be (anciennement monecolemonmetier.cfwb.be), section « Parcours d'Enseignement Qualifiant ».

- **Profils de certification (PC)** : 162 résultats (130 professionnel, 32 technique de qualification). Secteurs : Agronomie 12, Construction 38, Hôtellerie-Restauration 25, Industrie 55, Sciences appliquées 2, Services aux personnes 22, Économie 8. Un PC relie une option de base groupée (OBG) à un profil de formation du SFMQ et liste les UAA.
- **Profils de formation CCPQ** (anciens profils, options pas encore basculées sur un profil SFMQ) : 152 résultats, dont 13 en Économie.
- Pagination et filtres par `tx_solr[filter][0]=Secteur:Économie`.

Vocabulaire réel du PEQ : le PC parle d'**UAA** (unités d'acquis d'apprentissage) et d'**activités clés / compétences professionnelles**. Le mot « UQ » du plan précédent n'apparaît pas dans le PC lu. À corriger dans le plan : unité = UAA.

## 2. Option la plus liée à KeyPace : Collaborateur·trice administratif·ive (option 7410)

Source : `Programme PEQ/PC_Collaborateur_administratif.pdf`, « Profil de certification », approuvé par le Gouvernement le 21 février 2024 ; profil de formation SFMQ approuvé le 18/03/2021. Option professionnelle 4e-5e-6e, niveau 3 du cadre francophone des certifications, stage de 8 à 19 semaines.

4 UAA : UAA1 accueil et communication ; UAA2 gérer des écrits, des données et des dossiers ; UAA3 soutenir les activités de l'entreprise ; UAA4 actes professionnels en langue étrangère.

### Compétences professionnelles qui touchent le numérique (citées du PC)

| Réf. | Intitulé officiel | Module KeyPace |
|---|---|---|
| 1.2.5 | Utiliser les équivalents numériques des outils téléphoniques | non couvert |
| 1.1.4 / 1.2.6 | Utiliser et gérer des agendas (papier et/ou électronique) | non couvert |
| 1.4.1 | Maîtriser son empreinte numérique et celle de l'entreprise (e-réputation, médias sociaux…) | `donnees` (à vérifier) |
| 1.4.2 | Utiliser les différents canaux numériques (chat interne, blog, intranet…) | partiel (`mail`) |
| 2.1.1 | Prendre des notes (papier et/ou électronique) | `notes` (pas encore en ligne) |
| 2.1.2 | Compléter des documents types (papier et/ou électronique) | `formulaire` |
| 2.1.3 | Élaborer des rapports et des comptes rendus succinctement (traitement de texte) | `word`, `traitement-texte` (à vérifier : en ligne ou non) |
| 2.1.4 | Mettre en page selon le contexte (traitement de texte) | idem |
| 2.1.5 | Produire et utiliser des supports de visualisation (outils de présentation) | non couvert |
| 2.1.6 | Imprimer et diffuser des écrits | non couvert |
| 2.2.1 | Examiner, enregistrer, mettre à jour, contrôler, corriger ou faire corriger et extraire des données | non couvert |
| 2.2.2 | Produire des tableaux ou des listes simples (statistiques ou autres) | non couvert (tableur) |
| 2.2.3 | Utiliser des outils numériques (tableurs, ERP…) en lien avec la gestion des données | non couvert |
| 2.3.3 | Assurer et tenir à jour l'archivage (système papier et/ou électronique) | `fichiers` (à créer) |
| 3.3.3 / 3.4.2 / 3.5.2 | Apporter une aide à l'encodage des données comptables / commerciales / RH | `pave` en partie |
| 3.3.2 | Rédiger des documents commerciaux de base | `commande`, `mail` en partie |
| 3.1.3 | Assurer le suivi administratif et logistique relatif aux activités (rédaction de comptes rendus, envoi, bilan) | `mail` en partie |

**Correction (2026-11-07)** : dans ce tableau, seuls `mail`, `cv`, `lettre`, `mot-de-passe` et `protection-donnees` sont réellement en ligne (index.html, `live:true`). `formulaire`, `word`, `notes`, `pave`, `commande`, `posture`, `fichiers`, `traitement-texte` sont des modules prévus, pas encore disponibles. Le statut exact par compétence est dans `peq/peq-data.js` (champ `couverture`) et dans `docs/PEQ-CORRESPONDANCE.md`.

Éléments de savoir cités dans le PC (même source) : « Les fonctions de base des logiciels bureautiques et… », « Les fonctions de base d'un logiciel de messagerie », « courrier électronique », « fichiers numériques (arborescence, métadonnées…) », « RGPD », « Les règles de sécurité de base ». Le PC prévoit pour l'UAA1 un critère « qualité de la communication numérique » (« agenda mis à jour… ») et une épreuve avec « Gestion du courrier électronique : 3 entrants minimum et 3 sortants minimum ».

**Non trouvé dans ce PC** : aucune mention de « clavier », « frappe » ou « dactylographie », donc aucun seuil de vitesse. Seule exigence transversale liée au corps : 4.1.4 « Respecter les règles liées à l'ergonomie et à la manutention » (lien possible avec le module posture).

## 3. Seuils de frappe explicites (profils CCPQ Économie)

Ces profils sont les seuls où j'ai trouvé un seuil de frappe officiel. Sources : `PF_CCPQ_*.pdf` dans `Programme PEQ/`. Statut actuel de ces profils par option : à confirmer (le portail les liste comme « profils de formation CCPQ »).

- **Encodeur/Encodeuse de données** (CCPQ S7), 1.2.1 « Utiliser le clavier principal et numérique d'un ordinateur » : « L'apprenant dactylographie un texte à dix doigts, avec une tolérance d'erreur de 0,5%. L'utilisation d'un procédé de correction est autorisé en cours de travail. » Voir aussi 1.2.3 « Saisir des documents courants (lettres types, brefs rapports, formulaires, tableaux, etc.) ».
- **Technicien/Technicienne de bureau** (CCPQ S7), 5.3.2 : « L'apprenant frappe un texte à l'aveugle, à la vitesse de 30 mots/minute, pendant 10 minutes, avec une tolérance d'erreur de 0,5% ». Et 5.3.4 : texte en langue étrangère « avec une tolérance d'erreur de 1% ».
- **Assistant/Assistante de réception - téléphoniste** (CCPQ S7), 1.4.5 : taper un message simple « selon les normes (police de caractère, taille, etc.) » (pas de vitesse).
- **Technicien/Technicienne en comptabilité** (CCPQ S7) : « saisir les écritures dans le logiciel comptable », principales fonctions d'un traitement de texte et d'un tableur nécessaires. Pas de seuil de frappe trouvé.

Les 9 profils CCPQ Économie (liste) : auxiliaire de magasin, équipier logistique, gestionnaire de très petites entreprises, vendeur, encodeur de données, technicien commercial, technicien de bureau, technicien en comptabilité, assistant de réception - téléphoniste. Téléchargés : encodeur, technicien de bureau, comptabilité, réception. Non lus : technicien commercial, gestionnaire de très petites entreprises, vendeur.

## 4. Les 8 profils de certification Économie

Collaborateur administratif (lu), superviseur en entrepôt, magasinier (art. 45 et 47), valoriste généraliste (art. 45 et 47). Non lus en dehors du premier.

## 5. Ce que ça change pour KeyPace

1. **Option pilote évidente** : Collaborateur·trice administratif·ive (7410). Contenu numérique riche, officiel, daté, récent.
2. **Un vrai seuil chiffré existe** (30 mots/min, 10 min, 0,5 % d'erreurs ; dix doigts, 0,5 %) mais uniquement dans les profils CCPQ de bureau/encodage, pas dans le PC administratif. À afficher comme tel, avec sa source, jamais comme exigence générale du PEQ. Cela répond en partie au « niveau attendu » jusque-là sans source officielle (voir mémoire programme).
3. **Beaucoup de compétences demandées ne sont pas du clavier** : agenda électronique, tableur, présentation, archivage numérique, RGPD, communication numérique. KeyPace couvre une partie (mail, formulaire, données, pavé, raccourcis) ; le reste est un backlog de modules.
4. **Le plan doit employer « UAA » et « compétence professionnelle »**, et nommer l'option par son code (7410).

## 6. Balayage complet (2026-11-07, suite)

Les 228 PDF de profils trouvés sur les pages de liste (109 profils de certification, 119 profils CCPQ) ont été convertis en texte et fouillés (clavier, frappe, dactylographie, traitement de texte, tableur, messagerie, mot de passe, RGPD). Limite : les listes annoncent 162 + 152 résultats ; 228 documents ont un lien PDF, les autres entrées n'en avaient pas ou n'ont pas été vues. Les 228 textes restent dans le dossier scratchpad de la session, pas dans le projet.

### Mentions de clavier / frappe (liste complète des profils concernés)

| Profil | Type | Ce que dit le texte |
|---|---|---|
| Encodeur de données | CCPQ Économie | 1.2.1 dix doigts, tolérance 0,5 % (cité plus haut) |
| Technicien de bureau | CCPQ Économie | 5.3.2 30 mots/min, 10 min, 0,5 % (cité plus haut) |
| Technicien en infographie | CCPQ Arts appliqués | 4.1 « Saisir des textes » : « Utiliser le clavier principal et le clavier numérique avec efficacité. » Pas de seuil. |
| Assistant de réception - téléphoniste | CCPQ Économie | 1.4.5 dactylographier un message selon les normes (police, taille). Pas de seuil. |
| Auxiliaire de magasin | CCPQ Économie | 3.2.1 « Utiliser le clavier à bon escient » (pointage, scannage, caisse). |
| Vendeur | CCPQ Économie | 6.3.1 « Maîtriser l'usage du clavier, la procédure d'ouverture et de fermeture de la caisse. » |
| Monteur pneus aligneur | CCPQ Industrie | 6.2 « Utiliser un ordinateur (clavier PC) » dans les limites du métier. |
| Technicien/Assistant en informatique (PC, hardware) | PC | « claviers » cités comme matériel à entretenir, pas comme compétence de frappe. |
| Dessinateur en construction, opérateur et technicien en industrie graphique, technicien en agro-équipement | CCPQ | « clavier » cité comme périphérique ou outil de saisie. Pas de seuil. |

Sur les 228 documents, seuls **Encodeur de données** (dix doigts, 0,5 %) et **Technicien de bureau** (30 mots/min, 10 min, 0,5 %) donnent un critère mesurable. Tous les autres, y compris le Collaborateur administratif, n'en donnent pas.

### Autres options avec un volet numérique fort

- **Gestionnaire en logistique et transport** (PC, technique de qualification 4e-5e-6e) : utiliser un logiciel ERP (UAA propre), compétences « Utiliser un traitement de texte » et « Utiliser un tableur » (AC1, AC2), 21 mentions de « tableur », 12 de messagerie/courriel. Attention : la date d'approbation du PC est laissée en blanc (« …/…/… ») dans le document téléchargé, donc possible version non finalisée.
- **Technicien commercial** (CCPQ) : « L'utilisation des outils informatiques (traitement de textes, base de données, tableur, logiciel comptable, télécommunication) est indispensable » ; prise de commande par courriel.
- **Technicien en comptabilité** (CCPQ) : saisie des écritures dans un logiciel comptable, traitement de texte et tableur.
- **Superviseur en entrepôt** (PC) : 11 mentions de tableur, encodage de données.
- **Technicien en informatique / Assistant maintenance PC-réseaux** (PC) : RGPD et sécurité des données (13 à 19 mentions), mais côté technicien, pas pédagogie de la frappe.

### Constat sur les autres secteurs

Construction, Industrie, Agronomie, Hôtellerie-Restauration, Services aux personnes : le numérique y est quasi absent des profils lus, sauf cas isolés ci-dessus. Les mentions de « ergonomie » y concernent le geste physique et la manutention, pas la posture devant un écran (à ne pas confondre avec le module posture). Mentions de « mot de passe » : quasi nulles hors profils informatiques.

## 7. Conclusion de la phase 0 et ce qui reste

Périmètre réaliste de l'adaptation PEQ, à partir des documents lus :
1. **Cœur** : Collaborateur administratif (7410), Technicien de bureau, Encodeur de données. Lien direct clavier, traitement de texte, courriel, formulaires, archivage.
2. **Complément** : Gestionnaire en logistique et transport, Technicien commercial, Technicien en comptabilité (tableur, saisie, ERP). Ces options demandent des modules que KeyPace n'a pas (tableur, ERP, logiciel comptable).
3. **Soutien transversal** : pour le reste du qualifiant (130+ options), KeyPace ne peut pas se présenter comme un cours PEQ : aucune compétence numérique ni clavier officielle.

Non fait, à confirmer :
- Statut en vigueur des profils CCPQ par option (le portail les liste sans date d'application).
- Profil de formation SFMQ lui-même si différent du PC, et l'annexe « du profil métier au programme » (Direction de l'enseignement secondaire, avril 2025).
- Programmes par réseau (WBE, SeGEC, CPEONS, FELSI) pour les options retenues : non cherchés.
- Formation générale du PEQ (UAA de français, etc.) : non cherchée.
- Le PC Gestionnaire logistique : date d'approbation à vérifier.

## 8. Corrections du 2026-11-08

Données : `peq/peq-data.js` (83 compétences, 4 options). Contrôle : `node scripts/check-peq-data.js` après chaque étape, 0 erreur. Les intitulés officiels (`texte`) et les références (`ref`) des deux options d'origine sont figés par `peq/peq-textes.snapshot.json` : le contrôle échoue si l'un d'eux change.

### Étape 1 : progression conseillée par année (proposition KeyPace)
- Chaque compétence non « hors » a un champ `anneeConseillee` (4, 5 ou 6) et `anneesConseillees`. Chaque option porte `progressionSource: 'proposition KeyPace'`. Les compétences « hors » n'ont pas d'année et sont affichées à part. Le PEQ ne fixe pas d'année par compétence : chaque réseau publie un schéma de passation, puis l'école répartit.
- 7410 : 4e = 4.1.4, 2.1.3, 2.2.1, 1.4.1, 1.4.2, 4.1.6 ; 5e = 2.1.1, 1.1.3, 2.1.2, 2.1.4, 3.3.3, 3.4.2, 3.5.2, 1.1.4, 1.2.6 ; 6e = 3.1.1, 3.1.2, 3.1.3, 3.3.2, 3.4.4, 3.4.5, 3.4.1, 2.2.2, 2.2.3, 2.3.3, 2.1.5, 2.1.6, 1.2.5. **Ajout non demandé** : 1.2.3, reclassée de « hors » à « manquant » (étape 3), placée en 5e avec 1.1.3 (même module Prendre des notes).
- Technicien de bureau : 4e = 8.1.11, 5.3.1, 3.5.1, 5.3.2 ; 5e = 5.3.3, 9.2.2, 9.4.2, 4.3.1, 5.3.4, 5.3.6, 8.1.5, 5.3.2 ; 6e = 5.3.2, 6.1.1, 6.2.1, 5.3.5, 5.3.7, 5.3.9. La compétence 5.3.2 figure dans les trois années.
- Paliers de frappe de 5.3.2 : 4e « frappe à l'aveugle acquise, environ 15 à 20 mots par minute » (proposition KeyPace) ; 5e « 20 à 25 mots par minute » (source indiquée : Programme WBE Technicien de bureau 406-2011-248B, « abandon du cache-clavier à 20-25 mots/minute », **document non retrouvé en ligne : à vérifier**) ; 6e « 30 mots par minute pendant 10 minutes, 0,5 % d'erreurs » (profil CCPQ, officiel). L'interface étiquette l'origine de chaque palier.
- Interface : bandeau « Répartition proposée par KeyPace… » et filtre « Par année : 4e | 5e | 6e | Toutes » (uniquement pour les options qui ont une progression).

### Étape 2 : métadonnées du Technicien de bureau
- `forme` : Technique de qualification. `annees` : « 4e, 5e, 6e (à vérifier : certaines écoles l'organisent en 5e-6e) ».
- `code` : **7212**, relevé dans la circulaire n° 6761 du 27/07/2018 (grilles-horaires de référence, 3e degré technique de qualification, secteur 7 Économie, groupe 72 Secrétariat). À confirmer pour l'année en cours.
- **Constat à signaler** : cette même circulaire ne liste l'option qu'en 5e et 6e technique de qualification (3e degré, colonnes 5TQ et 6TQ) dans les grilles de Wallonie-Bruxelles Enseignement. Le palier de 4e est donc peut-être sans objet dans ce réseau. Noté dans `anneesNote`, affiché sous le titre.

### Étape 3 : classements de couverture
- 7410 1.2.3 : « hors » devient « manquant », cours prévu `notes`, note demandée.
- Lecture réelle du module Rédiger un mail (`module-src/mail.src.js`) : il enseigne destinataire, Cc et Cci, objet, formule d'appel, présentation, formule de politesse, signature, pièce jointe, priorité, brouillon, répondre, répondre à tous, transférer, relance, et l'écriture d'une invitation simple (anniversaire). Il n'enseigne pas : ordre du jour, réservation de salle, comptes rendus, données commerciales, chat, blog, intranet, consultation d'une boîte de réception. Le mot « netiquette » n'y figure pas, mais ton, majuscules et objet y sont traités.
- Résultat : 7410 1.4.2, 3.1.1, 3.1.3, 3.4.4 passent de « partiel » à « manquant » (la partie couverte est dite dans la note). Technicien de bureau 4.3.1 devient « couvert » (simulateur de messagerie, usage du vrai logiciel à l'école) ; 3.5.1 et 9.2.2 deviennent « manquant ». 9.4.2 reste « partiel » (le module Lettre de motivation apprend à adapter un modèle, pour la lettre de motivation seulement). Plus aucune note « à vérifier » sur ces compétences.
- Module Bien s'installer devant le clavier : vérifié hors ligne (seuls mail, cv, lettre, mot-de-passe et protection-donnees sont `live:true`). 4.1.4 et 8.1.11 restent « manquant ».
- Nouveaux chiffres : 7410 = 0 couvert, 7 partiel, 22 manquant, 19 hors (sur 48). Technicien de bureau = 1 couvert, 3 partiel, 11 manquant, 1 à vérifier, 1 hors (sur 17).

### Étape 4 : cohérence avec la certification
- Vérifié dans `index.html` : la certification KeyPace exige regard sur l'écran ≥ 90 % et précision ≥ 90 % sur un texte standardisé. Le seuil du profil est de 0,5 % d'erreurs et 30 mots par minute pendant 10 minutes : ce n'est pas la même épreuve.
- Le bloc des paliers affiche : « La certification KeyPace actuelle n'est pas l'épreuve de qualification de ton école. »
- Spec séparée, rien construit : `docs/SPEC-EPREUVE-QUALIFICATION.md`.

### Étape 5 : options manquantes du secteur économie
- **Technicien en comptabilité** (code 7124, profil CCPQ, accord de 2006) : ajouté, 8 compétences (logiciel comptable, saisie d'écritures, lettres-types). Le profil ne parle pas de clavier ni de vitesse.
- **Technicien commercial** (code 7123, profil CCPQ, accord de 2000) : ajouté, 10 compétences de la fonction 05 « Utiliser les outils informatiques » (traitement de texte, lettres-types, base de données, tableur, logiciel comptable, messagerie, recherche).
- **Agent en accueil et tourisme** (code 7404 dans la circulaire de 2018) : **profil introuvable** sur le portail (aucun profil de certification Économie ni profil CCPQ lu à ce nom). Rien créé.
- **Auxiliaire administratif et d'accueil (7405)** : **non ajouté.** L'option figure dans d'anciennes circulaires de grilles-horaires et n'apparaît plus dans les circulaires n° 5850 (25/08/2016) et n° 6761 (27/07/2018). Aucun profil à ce nom sur le portail. Son remplacement par le 7410 n'est **pas confirmé** par un texte lu : à vérifier.
- Ces deux nouvelles options n'ont pas de progression par année : aucune année n'est proposée sans justification.

### Documents à demander à un enseignant d'option
1. Le schéma de passation de son réseau (année par année) pour le 7410 et le Technicien de bureau.
2. Le programme WBE « Technicien de bureau 406-2011-248B » (palier de 5e).
3. Le statut actuel des profils CCPQ par option (Technicien de bureau, comptabilité, commercial) : remplacés par un profil SFMQ ou non.
4. Le profil de l'option Agent en accueil et tourisme (7404).
5. La définition du « mot » et la manière de compter les erreurs dans l'épreuve de qualification de l'école.
6. Confirmation de l'année de début du Technicien de bureau (4e ou 5e).
