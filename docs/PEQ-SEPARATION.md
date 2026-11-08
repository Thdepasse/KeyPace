# Séparer le tronc commun et le qualifiant : réflexion et proposition

Date : 2026-11-07. Statut : réflexion, rien n'est construit. Complète docs/PLAN-PEQ.md (phase 2).

## 1. Le vrai découpage : la bifurcation est à la 4e, pas au départ

« Enseignement général » n'est pas le bon mot pour ce que KeyPace couvre aujourd'hui. Ce que la page Cours suit de la 3e primaire à la 3e secondaire est le **tronc commun** (référentiel FMTTN). Le « général » est une forme d'enseignement de la 4e à la 6e. Le découpage réel est donc :

| Période | Cadre | Référentiel numérique officiel | État dans KeyPace |
|---|---|---|---|
| 3e primaire à 3e secondaire | Tronc commun, pour tous | FMTTN (commun aux réseaux) | Page Cours : réseau + année |
| 4e à 6e, général ou technique de transition | Forme sans référentiel numérique | Aucun (le Pacte annonce des référentiels à élaborer, sans date) | 12 propositions KeyPace + DigComp, signalées comme choix KeyPace |
| 4e à 6e, technique de qualification ou professionnel | PEQ, par option, avec certification | Profils de certification / de formation, par option | Nouveau (ce chantier) |

Conséquences :
- **Avant la 4e, tout le monde est dans le même parcours.** Un élève de 2e ne « suit » pas encore une option. Mettre deux grandes entrées « Général » et « Qualifiant » dès l'accueil serait trompeur pour lui.
- **À partir de la 4e, il y a trois chemins**, pas deux : général/transition, qualifiant, et le parcours libre (adulte, autre).
- Calendrier à vérifier avant d'écrire quoi que ce soit en 3e : la circulaire FWB 9744 (mémoire projet) indique que 2e et 3e restent sous l'organisation actuelle en 2026-2027, et que le numérique de 3e vise la rentrée 2028.

## 2. Ce qui est partagé, ce qui est séparé

**Partagé : une seule bibliothèque.** Les 66 leçons, le test de vitesse, les jeux, les modules (mail, CV, lettre, mot de passe, données), le compte, les statistiques. Une leçon réussie compte partout. Séparer le contenu en deux copies créerait deux progressions qui divergent (et on a déjà eu un bug d'effacement de progression).

**Séparé : la porte d'entrée, le vocabulaire, la promesse, le suivi, la vue du prof, les pages publiques.**

| Élément | Tronc commun | Qualifiant (PEQ) |
|---|---|---|
| Question posée | Quel réseau, quelle année ? | Quelle option ? |
| Mot officiel | « attendu » | « compétence professionnelle », « UAA » |
| Source affichée | FMTTN, programme du réseau | Profil de certification (date d'approbation) |
| Suivi | Cours par année, sans verrouillage | Cases par compétence, regroupées par UAA |
| Qui valide | Personne (apprentissage libre) | L'école seule (KeyPace ne certifie jamais) |
| Page publique | Page programme | Page Enseignement qualifiant, page par option |

## 3. Pourquoi ça se confond et ce que ça coûte

1. Les deux ont des « années » et des « niveaux » : un élève de 5e professionnelle qui arrive sur la page Cours voit « 5e secondaire » sans programme officiel, ce qui est faux pour lui.
2. Une même leçon sert aux deux : si elle porte une étiquette d'année, elle semble « réservée » à un public.
3. Les mots changent : « module » (KeyPace), « UAA » (PEQ), « attendu » (FMTTN). Sans règle de langage, l'utilisateur ne sait plus ce qu'il coche.
4. Risque de promesse : écrire « conforme au PEQ » sur une page où KeyPace ne couvre que 11 compétences sur 48. Voir docs/PEQ-CORRESPONDANCE.md.
5. Risque de référencement : « PEQ » désigne aussi le Programme de l'expérience québécoise. Le référencement doit utiliser « enseignement qualifiant » et « Parcours d'Enseignement Qualifiant », pas le sigle seul.
6. La grande majorité des options du qualifiant (130 profils professionnels sur 162 profils de certification) n'ont presque pas de numérique officiel : un élève de ces options doit trouver une réponse honnête, pas une page vide.

## 4. Proposition

### 4.1 Un « parcours » choisi une fois, visible partout
Trois valeurs, plus une :
- **Tronc commun** (réseau + année, de la 3e primaire à la 3e secondaire)
- **Après la 3e : général ou transition** (parcours libre KeyPace, sans référentiel)
- **Qualifiant** (une ou plusieurs options)
- **Parcours libre** (adulte, formation continue, autre)

Une pastille « Mon parcours » à côté de la pastille clavier, qui dit en clair où on est (ex. « Tronc commun, 2e secondaire » ou « Qualifiant, Collaborateur administratif ») et permet de changer.

### 4.2 Une question en deux temps, aux mots de l'élève
1. « Tu es en quelle année ? » (primaire, 1re à 3e secondaire, 4e à 6e secondaire, autre)
2. Si 4e à 6e : « Quelle forme d'enseignement suis-tu ? » avec un exemple concret pour chaque réponse. Si qualifiant : « Quelle est ton option ? » (liste des options couvertes, plus « mon option n'est pas dans la liste »).

La bifurcation se pose **dans la page Cours quand l'année choisie est 4e ou plus**, plus à l'inscription et dans les paramètres. Un élève ne reçoit jamais la question avant qu'elle ait un sens pour lui.

### 4.3 Navigation
- L'onglet **Cours** reste le tronc commun. Rien ne change pour les élèves du primaire et du début du secondaire.
- Une entrée **Enseignement qualifiant**, sous Cours (menu déroulant, comme Établissements et Test), avec sa propre adresse. Raisons : un prof d'option, une direction ou un moteur de recherche doivent pouvoir y arriver sans passer par l'accueil.
- L'élève déjà configuré qualifiant voit le parcours qualifiant par défaut quand il clique sur Cours (avec un lien « voir le tronc commun »).

### 4.4 Identité claire sans deux marques
- Une étiquette de parcours en haut de chaque page de cours et de suivi (« Tronc commun » ou « Qualifiant »), même forme, deux libellés. Pas deux sites.
- Chaque page affiche sa source et ce que KeyPace couvre ou non, avant le contenu.
- Les leçons de la bibliothèque n'affichent pas d'année quand on les ouvre depuis le parcours qualifiant (elles sont rattachées à une compétence, pas à une année).

### 4.5 Page qualifiant
Liste des options (avec la mention « KeyPace couvre X compétences sur Y ») puis option, UAA, compétences avec case et badge honnête : « Entraîné dans KeyPace », « Partiel », « Pas encore dans KeyPace », « Hors KeyPace ». Option pas dans la liste : message explicite, et renvoi vers le socle clavier utile à tous.

### 4.6 Progrès, comptes, classes
- **Progrès** : deux blocs séparés (tronc commun, qualifiant) quand l'élève a les deux ; les leçons faites comptent dans les deux.
- **Élève** : le parcours est une préférence du compte (aujourd'hui le choix réseau/année vit seulement dans le navigateur, sous `kp_prog` : il se perd d'un appareil à l'autre).
- **Classe** : le prof fixe le parcours de la classe, qui prime sur la préférence de l'élève pour les devoirs et le tableau de bord. Une classe de 5e administratif voit la liste de compétences du 7410, une classe de 2e voit le tronc commun.
- **Établissement** : peut avoir des classes dans les deux parcours.

### 4.7 Règles de langage (à appliquer à tout texte visible)
| Dire | Ne pas dire |
|---|---|
| « Basé sur le profil de certification du Collaborateur administratif (approuvé le 21/02/2024) » | « Conforme au PEQ » |
| « KeyPace t'entraîne à 11 des 48 compétences de ton option » | « KeyPace valide tes compétences » |
| « Ton école valide tes compétences » | « Tu as validé la compétence » |
| « Pas de programme numérique officiel après la 3e en général » | « Programme de 4e » (sans source) |

Pas de tiret long dans les textes du site (règle projet).

## 5. Architecture technique (sans casser l'existant)

1. **Un format de référentiel commun** : `{type: 'tronc-commun' | 'qualifiant', unités, items, couverture}`. Aujourd'hui le tronc commun est dans `PROG_ITEMS` (index.html) et le qualifiant dans `peq/peq-data.js`, deux formes différentes. Ne pas fusionner tout de suite : écrire un adaptateur de lecture, fusionner plus tard si le besoin se confirme. Avantage futur : cocher des attendus FMTTN avec la même mécanique.
2. **Stockage** : `progress.data.prefs.parcours` et `progress.data.peq`. Le serveur doit fusionner ces clés comme il fusionne `assignmentsDone` (garde-fou de `api/save-progress.js`), avec test unitaire. Le parcours de classe vit côté classe, jamais dans le blob que le client contrôle (précédent : faille `migrateSelf`).
3. **Chargement à la demande** : `index.html` pèse 1,4 Mo. Le code et les données qualifiant vont dans des fichiers séparés, chargés seulement sur la page qualifiant.
4. **Statut par option** (en ligne, bêta, bientôt) pour ouvrir le 7410 sans les autres. La mémoire projet cite un registre de cours (`api/_courses-registry.js`, commit 31cd86c) mais ce fichier n'est pas suivi par git dans l'arbre de travail actuel : à vérifier avant de s'appuyer dessus.

## 6. Cas limites
- **Réorientation** (changer d'option, 4e complémentaire, dispositif de fin de parcours) : archiver les cases, ne jamais effacer. Ces dispositifs ne sont pas encore étudiés.
- **Plusieurs options** (option de base groupée plus année de spécialisation) : choix multiple.
- **Élève sans option couverte** : message honnête et accès au socle clavier.
- **Visiteur sans compte** : voit l'entrée et les listes, mais sans sauvegarde des cases.
- **Adulte** : parcours libre, aucune question scolaire.

## 7. Décisions à prendre (recommandation en premier)

1. **Où poser la bifurcation ?** Recommandé : dans la page Cours dès la 4e, plus une entrée dédiée dans le menu. Alternatives : seulement une entrée de menu séparée ; seulement un choix à l'inscription.
2. **Nom visible** : « Enseignement qualifiant » (précis, chercheable) plutôt que « PEQ » seul, « Ma filière » ou « Mon option ».
3. **Accès** : liste des options et cases gratuites, contenu soumis aux mêmes règles Expert que les modules existants (recommandé), ou tout réservé aux établissements.
4. **Ordre de travail** : d'abord le sélecteur de parcours et la bifurcation (utile même sans PEQ), puis la page qualifiant.

## 8. Effet sur le plan PEQ
La phase 2 se découpe : (a) sélecteur de parcours et bifurcation à la 4e, avec stockage fusionné et test ; (b) page Enseignement qualifiant avec le 7410 et le Technicien de bureau ; (c) badges de couverture et textes validés avec les règles de langage ; (d) ensuite seulement la remédiation et les classes.
