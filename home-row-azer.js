/* Rangée de repos du cours français AZERTY : QSDF JKLM (méthode française, défaut) ou AZER UIOP (méthode belge,
   secrétariat-bureautique FWB : les doigts reposent sur la rangée du haut).
   Fichier pur : chargé par index.html (balise script) et par les tests Node. C'EST LE SEUL ENDROIT À MODIFIER pour ajuster
   la progression AZER-UIOP avec la prof : ordre des touches, titres, consignes, textes.

   Référentiels (programmes de l'enseignement organisé par la FWB, secteur Économie) :
     - « La rangée repère est "azer" » (programmes WBE 2002, 2007 et 2011, dactylographie-bureautique et secrétariat) ;
     - l'apprentissage repose sur l'« évaluation spatiale » : mémoriser les distances et les directions entre les
       touches-repères AZER UIOP et les autres touches (programme 2007) ;
     - « deux heures d'apprentissage pour l'étude de deux touches est un temps minimum », plus de temps pour les
       touches-repères, b et n, c et ; (programme D2 Vente, 2001) ;
     - « le positionnement acquis antérieurement (pour autant qu'il soit correct) ne sera pas modifié » (2007) : la méthode
       reste un choix du prof (ou de l'élève sans classe), jamais imposé aux comptes existants ;
     - chiffres dans un texte : rangée supérieure ; dans un tableau : pavé numérique (2011).

   Principe : chaque doigt garde SA colonne (le doigt qui tape chaque touche ne change pas) ; seule la rangée de repos change.
   Les modules 1 et 2 sont remplacés par des leçons AZER-UIOP qui ont LEURS PROPRES identifiants (ar1 à ar6, am1 à am6) :
   leur progression est distincte de celle de la méthode française. Un élève qui passe en AZER-UIOP refait donc ces deux
   modules (choix validé : revoir des touches déjà vues vaut mieux que garder une position mal ancrée) ; ce qu'il a validé en
   QSDF reste enregistré et revient s'il repasse en QSDF. Le module 3 (rangée du bas) et la suite gardent leurs leçons ; seules
   les consignes qui parlent des repères « F et J » ou de la rangée des chiffres sont adaptées (PATCHES, TUTOS).

   Progression (deux touches par leçon, des touches-repères vers l'extérieur) :
     Module 1 « Position de base » (touches-repères) : R U (index), E I (majeurs), Z O (annulaires), A P (auriculaires),
       T Y (index vers l'intérieur), révision.
     Module 2 « Rangée du milieu » (un cran sous les repères) : F J, D K, S L, Q M, G H, révision.
     Module 3 « Rangée du bas » et suivants : leçons inchangées.
   Règle vérifiée par les tests et la gate U18 : un texte n'emploie que des lettres déjà enseignées (touches des leçons
   précédentes et de la leçon elle-même), et emploie chaque nouvelle touche. */
(function (root) {
  const HOME_ROWS = ['qsdf', 'azer'];
  const DEFAULT = 'qsdf';
  function normalizeHomeRow(v) { return HOME_ROWS.includes(v) ? v : DEFAULT; }

  // Lettres de la rangée de repos (majuscules), pour les visuels et les jeux. Couloirs de Magic Tiles : 4 + 4 doigts.
  const REST = {
    qsdf: { row: 2, letters: 'QSDFGHJKLM', label: 'Q S D F · J K L M' },
    azer: { row: 1, letters: 'AZERTYUIOP', label: 'A Z E R · U I O P' },
  };

  const MODULE_NAMES = { 0: '1. Position de base', 1: '2. Rangée du milieu' };

  const L = {
    // ── Module 1 : la rangée de repos est la rangée du haut ──
    ar1: { replaces: 'r1', title: 'R et U, les index', keys: 'r u',
      tip: "Bienvenue ! Dans cette méthode, tes doigts reposent sur la rangée du haut : A Z E R à gauche, U I O P à droite. Les index se posent sur R et U. Ne regarde pas ton clavier : fais confiance à ta mémoire musculaire.",
      tuto: {
        intro: "Bienvenue dans ta toute première leçon ! Prends 30 secondes pour comprendre la base de la frappe à dix doigts, c'est ce qui va tout changer pour la suite.",
        rules: [
          { icon: '🤲', t: 'La position de repos', d: "Pose tes huit doigts sur la rangée du haut : A Z E R pour la main gauche, U I O P pour la main droite. Les deux index vont sur R et U. Juste en dessous, les reliefs de F et J t'aident à retrouver la place sans regarder." },
          { icon: '👁️', t: "Garde les yeux sur l'écran", d: "Ne regarde pas tes doigts. C'est en arrêtant de regarder le clavier que tu construis ta mémoire musculaire, celle qui te rendra vraiment rapide." },
          { icon: '📍', t: 'Un doigt, une touche', d: "Le R se tape avec l'index gauche, le U avec l'index droit. Après chaque frappe, l'index revient se poser sur sa touche de repos." },
          { icon: '🐢', t: "La lenteur d'abord", d: "Tape lentement et juste : chaque faute crée une mauvaise habitude. La vitesse viendra toute seule une fois le geste mémorisé." },
        ],
        tip: "Objectif de cette leçon : ancrer la position de tes deux index en ne tapant que R et U. Ne force pas, vise la régularité plutôt que la vitesse.",
      },
      text: 'ru ur ru ur ruru urur rruu uurr ru ur ruru urur rru uur ru ur rruu' },
    ar2: { replaces: 'r2', title: 'E et I, les majeurs', keys: 'e i',
      tip: "Les majeurs se posent sur E et I, juste à côté des index. Garde les index sur R et U comme ancres : les autres doigts reviennent toujours à leur place de repos après chaque frappe.",
      tuto: {
        intro: "Tu ajoutes tes majeurs. E et I se posent juste à côté de tes index, sur la même rangée de repos.",
        rules: [
          { icon: '🖐️', t: 'Les majeurs au repos', d: "Le majeur gauche couvre E, le majeur droit couvre I. Ils reposent naturellement sur ces touches, tout contre R et U." },
          { icon: '⚓', t: 'Garde tes index ancrés', d: "Ne bouge pas tes index : ils restent sur R et U pendant que les majeurs frappent. C'est ce qui te permet de revenir sans regarder." },
          { icon: '🎯', t: 'Mouvement minimal', d: "Un petit appui suffit. Ne soulève pas toute la main, laisse juste le doigt descendre puis remonter à sa place." },
        ],
        tip: "Objectif : enchaîner R E I U de mémoire, en gardant les quatre doigts proches de leur position de repos.",
      },
      text: 'ei ie re ui eiru urie rue rie ire ruer rire rieur ei ie re ui rue rire' },
    ar3: { replaces: 'r3', title: 'Z et O, les annulaires', keys: 'z o',
      tip: "Les annulaires couvrent Z et O. Tu as maintenant 6 doigts placés. Garde les doigts légèrement courbés, prêts à frapper sans lever le poignet.",
      tuto: {
        intro: "Place tes annulaires sur Z (à gauche) et O (à droite). Tu as maintenant six doigts posés sur la rangée de repos.",
        rules: [
          { icon: '🖐️', t: 'Des doigts moins habiles', d: "Les annulaires sont moins agiles que les index et les majeurs, c'est normal. Va doucement, la précision se construit avant la vitesse." },
          { icon: '🌙', t: 'La position en arc', d: "Garde les doigts légèrement courbés, comme posés sur une petite balle. Le poignet reste détendu et ne s'écrase pas sur le bureau." },
          { icon: '⚓', t: 'Retour au repos', d: "Après chaque Z ou O, l'annulaire revient à sa place. Tes index sur R et U restent tes repères." },
        ],
        tip: "Objectif : taper Z et O sans tordre la main, en revenant à chaque fois sur la rangée de repos.",
      },
      text: 'zo oz ez oi or ou roi riz zoo roue euro rouer zozo ou or roi riz zoo roue' },
    ar4: { replaces: 'r4', title: 'A et P, les auriculaires', keys: 'a p',
      tip: "Les auriculaires (petits doigts) sont les moins forts, c'est normal. A à gauche, P à droite. Évite de tourner tout le poignet : laisse juste l'auriculaire travailler.",
      tuto: {
        intro: "Au tour des auriculaires, les petits doigts : A à gauche, P à droite. Ce sont les plus délicats à dompter.",
        rules: [
          { icon: '🤏', t: 'Les doigts les plus faibles', d: "Les auriculaires manquent de force et de précision au début. C'est universel, même les pros sont passés par là. Patience." },
          { icon: '↔️', t: "N'entraîne pas toute la main", d: "Seul l'auriculaire frappe A ou P. Si tu fais pivoter le poignet, les autres doigts perdent leur repère." },
          { icon: '⚓', t: 'Repose-le aussitôt', d: "L'auriculaire a tendance à rester en l'air. Ramène-le sur sa touche de repos dès qu'il a frappé." },
        ],
        tip: "Objectif : activer les auriculaires sans casser ta position de repos. Lenteur et régularité avant tout.",
      },
      text: 'ap pa ar pu papa pape pipe pur pure paru aura poire pierre parure poireau papier' },
    ar5: { replaces: 'r5', title: 'T et Y, index intérieurs', keys: 't y',
      tip: "T et Y sont tapés par les index qui s'avancent légèrement vers le centre. Ce mouvement doit rester petit : l'index glisse, ne saute pas. Reviens sur R ou U après chaque frappe.",
      tuto: {
        intro: "T et Y sont au centre de la rangée. Ce sont tes index qui s'avancent un peu pour les atteindre.",
        rules: [
          { icon: '👉', t: "Les index s'étirent", d: "L'index gauche glisse vers la droite pour T, l'index droit vers la gauche pour Y. C'est un petit mouvement latéral, pas un saut." },
          { icon: '⚓', t: 'Reviens sur R et U', d: "Juste après T ou Y, ramène l'index sur sa touche de repos. Ce sont les touches les plus éloignées de ta position de base." },
          { icon: '🎯', t: 'Ne confonds pas la main', d: "T se tape toujours avec l'index gauche, Y toujours avec l'index droit. Garde bien cette règle en tête." },
        ],
        tip: "Objectif : couvrir toute la rangée de repos sans déplacer les autres doigts.",
      },
      text: 'ty yt tu ta toi tour tuer type tuyau titre route porte petite toupie utopie patate retour tirer' },
    ar6: { replaces: 'r6', title: 'Révision : toute la rangée de repos', keys: 'a z e r t y u i o p',
      tip: "Révision complète de la rangée de repos A Z E R T Y U I O P : toutes les voyelles y sont, de quoi taper déjà de vrais mots. Prends ton temps, la régularité compte plus que la vitesse.",
      tuto: {
        intro: "Tu connais maintenant toute la rangée de repos : A Z E R T et Y U I O P.",
        rules: [
          { icon: '📊', t: 'Déjà de vrais mots', d: "Avec cette seule rangée, tu tapes déjà des mots comme tuyau, poire ou papier. Les voyelles A E I O U sont toutes sous tes doigts." },
          { icon: '🔁', t: 'Trouve chaque touche de mémoire', d: "Cet exercice mélange les dix touches. Si tu hésites, ralentis : le but est de les trouver de mémoire, pas de taper vite." },
          { icon: '⚓', t: 'Position de repos constante', d: "Entre chaque frappe, sens que tes huit doigts sont revenus sur A Z E R et U I O P." },
        ],
        tip: "Objectif : valider toute la rangée de repos, doigts ancrés et yeux sur l'écran.",
      },
      text: 'aze rty uiop azer uiop tuyau poire route petite papier zoo type retour toupie azer uiop' },

    // ── Module 2 : la rangée du milieu, un cran sous la rangée de repos ──
    am1: { replaces: 'h1', title: 'F et J, sous les index', keys: 'f j',
      tip: "F est sous R, J est sous U : l'index descend d'un cran puis remonte sur sa touche de repos. Ce sont les deux touches avec un petit relief.",
      tuto: {
        intro: "Tu descends sur la rangée du milieu. Chaque doigt garde sa colonne : il descend d'un cran, frappe, puis remonte.",
        rules: [
          { icon: '⬇️', t: "L'index descend", d: "L'index gauche descend de R vers F, l'index droit de U vers J. Les reliefs sous tes doigts te confirment que tu es au bon endroit." },
          { icon: '⚓', t: 'Remonte au repos', d: "Après F ou J, l'index remonte sur R ou U. Les six autres doigts restent posés sur la rangée du haut." },
          { icon: '🎯', t: 'Mouvement court', d: "Le doigt glisse vers toi, il ne quitte pas le clavier. Pas besoin de bouger la main." },
        ],
        tip: "Objectif : descendre vers F et J et remonter aussitôt, sans regarder.",
      },
      text: 'fj jf rf uj fier fuir foi fou fort fruit jour joue jupe jet jeu futur fourre fiat' },
    am2: { replaces: 'h2', title: 'D et K, sous les majeurs', keys: 'd k',
      tip: "D est sous E, K est sous I : le majeur descend d'un cran puis revient. Garde les index sur R et U pendant ce temps.",
      tuto: {
        intro: "Les majeurs descendent à leur tour : D sous E, K sous I.",
        rules: [
          { icon: '⬇️', t: 'Le majeur descend', d: "Le majeur gauche descend de E vers D, le majeur droit de I vers K, puis ils remontent." },
          { icon: '⚓', t: 'Garde tes index ancrés', d: "Les index restent sur R et U : ce sont eux qui te permettent de revenir sans regarder." },
          { icon: '🔁', t: 'Alterne les rangées', d: "Les mots mélangent maintenant deux rangées. Va lentement : la précision du geste compte plus que la vitesse." },
        ],
        tip: "Objectif : taper D et K avec les majeurs, en revenant toujours sur la rangée de repos.",
      },
      text: 'dk kd ed ik dire date dur doute drap radio kayak kaki kart dodo tordu perdu kayak dire' },
    am3: { replaces: 'h3', title: 'S et L, sous les annulaires', keys: 's l',
      tip: "S est sous Z, L est sous O : l'annulaire descend d'un cran. Ce sont des doigts moins habiles, va doucement.",
      tuto: {
        intro: "Les annulaires descendent : S sous Z, L sous O. Avec S et L, beaucoup de mots deviennent possibles.",
        rules: [
          { icon: '⬇️', t: "L'annulaire descend", d: "L'annulaire gauche descend de Z vers S, l'annulaire droit de O vers L, puis ils remontent à leur place." },
          { icon: '🌙', t: 'La position en arc', d: "Garde les doigts courbés. Si le poignet bouge, c'est que la main entière se déplace : laisse seulement le doigt travailler." },
          { icon: '⚓', t: 'Retour au repos', d: "Après chaque S ou L, l'annulaire revient sur Z ou O." },
        ],
        tip: "Objectif : taper S et L sans tordre la main, en revenant à chaque fois sur la rangée de repos.",
      },
      text: 'sl ls zs ol sel sol lis lire salut soleil stylo silo lait loup tasse pastel lilas sortie' },
    am4: { replaces: 'h4', title: 'Q et M, sous les auriculaires', keys: 'q m',
      tip: "Q est sous A, M est sous P : l'auriculaire descend d'un cran. Évite de tourner le poignet.",
      tuto: {
        intro: "Les auriculaires descendent à leur tour : Q sous A, M sous P.",
        rules: [
          { icon: '⬇️', t: "L'auriculaire descend", d: "L'auriculaire gauche descend de A vers Q, l'auriculaire droit de P vers M, puis ils remontent." },
          { icon: '↔️', t: "N'entraîne pas toute la main", d: "Seul l'auriculaire bouge. Si tu fais pivoter le poignet, les autres doigts perdent leur repère." },
          { icon: '📖', t: 'Le Q et son U', d: "En français, le Q est presque toujours suivi du U : qu, quoi, quel. Un enchaînement auriculaire gauche, index droit à mémoriser." },
        ],
        tip: "Objectif : activer les auriculaires sur la rangée du milieu sans casser ta position de repos.",
      },
      text: 'qm mq aq pm quoi quel mot mur moto mardi masque tomate marque musique quatre mesure' },
    am5: { replaces: 'h5', title: 'G et H, index intérieurs', keys: 'g h',
      tip: "G est sous T, H est sous Y : l'index descend et s'avance vers le centre. Reviens sur R ou U après chaque frappe.",
      tuto: {
        intro: "G et H sont au centre de la rangée du milieu. Ce sont les touches les plus éloignées de tes index.",
        rules: [
          { icon: '👉', t: 'Index en diagonale', d: "L'index gauche va de R vers G (en bas à droite), l'index droit de U vers H (en bas à gauche). Un petit geste en diagonale." },
          { icon: '⚓', t: 'Reviens sur R et U', d: "Juste après G ou H, ramène l'index sur sa touche de repos." },
          { icon: '🎯', t: 'Ne confonds pas la main', d: "G se tape toujours avec l'index gauche, H toujours avec l'index droit." },
        ],
        tip: "Objectif : couvrir tout le centre du clavier sans déplacer les autres doigts.",
      },
      text: 'gh hg tg yh gare gros huit haut page ligue image garage horloge homme gigot hall' },
    am6: { replaces: 'h6', title: 'Révision : la rangée du milieu', keys: 'q s d f g h j k l m',
      tip: "Révision de la rangée du milieu, avec de vraies phrases. Chaque doigt descend d'un cran puis remonte sur la rangée de repos.",
      tuto: {
        intro: "Tu connais maintenant la rangée du haut et la rangée du milieu : 20 lettres, de quoi écrire de vraies phrases.",
        rules: [
          { icon: '📊', t: 'Deux rangées maîtrisées', d: "Avec la rangée de repos et celle du milieu, tu tapes la grande majorité des lettres d'un texte français." },
          { icon: '🔁', t: 'Le va-et-vient', d: "Chaque doigt descend d'un cran puis remonte. C'est ce mouvement régulier qui rend la frappe fluide." },
          { icon: '⚓', t: 'Position de repos constante', d: "Entre chaque mot, sens que tes huit doigts sont revenus sur A Z E R et U I O P." },
        ],
        tip: "Objectif : taper des phrases complètes sur deux rangées, doigts ancrés et yeux sur l'écran.",
      },
      text: 'le petit ours sort de sa grotte il fait jour le soleil luit sur le quai du port et la mer est plate le kayak glisse sur la houle' },
  };

  // Ordre des leçons AZER-UIOP (modules 1 et 2) et leçon de la méthode française qu'elles remplacent.
  const ORDER = Object.keys(L);
  const REPLACES = Object.fromEntries(ORDER.map((id) => [id, L[id].replaces]));

  // Consignes de la suite (leçons inchangées sinon) qui parlent des repères de la méthode française.
  // [texte d'origine, texte AZER] ; la gate U18 vérifie que chaque texte d'origine existe encore (sinon le remplacement serait muet).
  const PATCHES = {
    b1: [['sont tes premières touches sous la rangée de repos', 'sont tes premières touches de la rangée du bas, deux rangées sous ta position de repos (A Z E R · U I O P)']],
    b2: [['la position de référence sur F et J', 'la position de référence sur R et U'], ['sans perdre F et J de référence', 'sans perdre R et U de référence']],
    b6: [['à partir de F et J', 'à partir de R et U']],
  };

  // Module « Chiffres » en AZER-UIOP : chaque chiffre est juste au-dessus de la touche-repère du même doigt (1 sur A, 4 sur R,
  // 7 sur U, 0 sur P) : un seul cran à monter, contre deux en méthode française. Tutoriels complets (texte et touches inchangés).
  const TUTOS = {
    num1: {
      intro: "On monte sur la rangée des chiffres. Avec tes doigts sur A Z E R · U I O P, elle est juste au-dessus : un seul cran à monter. On commence par 4 5 6 7, pour les index.",
      rules: [
        { icon: '⬆️', t: 'Les index montent d\'un cran', d: "Le 4 est juste au-dessus de R, le 7 juste au-dessus de U : l'index monte d'un cran. Le 5 et le 6, un peu vers le centre, sont pour les mêmes index." },
        { icon: '🎯', t: 'Vise sans regarder', d: "La rangée des chiffres est celle où l'on est le plus tenté de regarder. Résiste : repère la direction depuis ta touche-repère, puis vise de mémoire." },
        { icon: '⚓', t: 'Retour au repos', d: "Après chaque chiffre, ramène l'index sur R ou U. C'est le repère qui t'évite de te perdre en haut." },
      ],
      tip: "Objectif : atteindre 4 5 6 7 avec les index, un cran au-dessus de R et U, sans baisser les yeux.",
    },
    num2: {
      intro: "On élargit aux majeurs : 3 juste au-dessus de E, 8 juste au-dessus de I.",
      rules: [
        { icon: '⬆️', t: 'Les majeurs montent', d: "Le 3 se tape avec le majeur gauche, le 8 avec le majeur droit. Chacun monte d'un cran au-dessus de sa touche-repère." },
        { icon: '🧭', t: 'Pense en directions', d: "Chaque chiffre est au-dessus de la lettre du même doigt : 3 sur E, 4 sur R, 7 sur U, 8 sur I. Mémorise ces directions plutôt que la rangée entière." },
        { icon: '⚓', t: 'Toujours revenir', d: "Après chaque chiffre, reviens sur ta rangée de repos (A Z E R · U I O P)." },
      ],
      tip: "Objectif : ajouter 3 et 8 avec les majeurs, sans perdre tes repères.",
    },
    num3: {
      intro: "Au tour des annulaires : 2 juste au-dessus de Z, 9 juste au-dessus de O.",
      rules: [
        { icon: '⬆️', t: 'Les annulaires montent', d: "Le 2 (annulaire gauche) et le 9 (annulaire droit) sont un cran au-dessus de Z et O. Doigts moins forts : va doucement." },
        { icon: '🔁', t: 'Rappel des accents', d: "Sur AZERTY, ces touches portent aussi é (2) et ç (9). Tu retrouves des repères connus du module accents." },
        { icon: '🎯', t: 'Précision avant tout', d: "Plus on s'éloigne du centre, plus les fautes guettent. Mieux vaut lent et juste que rapide et faux." },
      ],
      tip: "Objectif : atteindre 2 et 9 avec les annulaires, sans regarder.",
    },
    num4: {
      intro: "Les extrémités de la rangée : 1 juste au-dessus de A, 0 juste au-dessus de P, pour les auriculaires.",
      rules: [
        { icon: '🤏', t: 'Les auriculaires montent', d: "Le 1 (auriculaire gauche) et le 0 (auriculaire droit) sont un cran au-dessus de A et P. Les petits doigts montent sans entraîner la main." },
        { icon: '🤚', t: 'Stabilise la main', d: "Ne déplace pas toute la main : laisse l'auriculaire monter, les autres doigts restent posés sur leurs touches-repères." },
        { icon: '✅', t: 'La rangée complète', d: "Avec 1 et 0, tu couvres toute la rangée des chiffres. Il ne reste plus qu'à les enchaîner." },
      ],
      tip: "Objectif : atteindre 1 et 0 avec les auriculaires, main stable.",
    },
    num5: {
      intro: "On enchaîne maintenant les dix chiffres. Chacun est au-dessus d'une touche-repère : c'est le moment de tout relier.",
      rules: [
        { icon: '🔢', t: 'Chaque chiffre, son doigt', d: "1 2 3 4 au-dessus de A Z E R, 7 8 9 0 au-dessus de U I O P. Le 5 et le 6, au centre, sont pour les index (comme T et Y)." },
        { icon: '⬆️', t: 'Un cran seulement', d: "Avec les doigts sur la rangée du haut, la rangée des chiffres est toute proche : garde un mouvement court et net, sans regarder." },
        { icon: '🐢', t: 'Lentement d\'abord', d: "Les chiffres sont souvent le point faible. Travaille-les au calme : très utile pour les codes, dates et montants." },
      ],
      tip: "Objectif : enchaîner 0 à 9 de mémoire, chaque chiffre avec le bon doigt.",
    },
    num6: {
      intro: "On mélange chiffres et lettres dans un vrai texte : numéros, heures, codes. C'est l'usage quotidien.",
      rules: [
        { icon: '🔀', t: 'Alterner lettres et chiffres', d: "Le défi : passer des lettres aux chiffres sans perdre tes repères. Reviens toujours sur R et U." },
        { icon: '📞', t: 'Dans un texte ou un tableau', d: "Dans un texte, les chiffres se tapent sur la rangée des chiffres, comme ici. Dans un tableau de nombres, on utilise plutôt le pavé numérique." },
        { icon: '🎯', t: 'Précision indispensable', d: "Une faute dans un numéro change tout. Sur les chiffres, la précision compte encore plus que la vitesse." },
      ],
      tip: "Objectif : taper chiffres et lettres mélangés sans hésiter ni regarder.",
    },
  };

  // Applique la méthode AZER-UIOP EN PLACE sur le programme du cours fr/azerty :
  //   - les modules 1 et 2 sont remplacés par de NOUVEAUX objets (leçons ar*/am*, progression distincte), les objets d'origine
  //     ne sont pas modifiés ;
  //   - les leçons gratuites suivent (les 10 premières du programme, comme en QSDF) ;
  //   - les consignes de la suite sont adaptées (PATCHES, TUTOS) sur les objets d'origine.
  // L'appelant a pris une copie du programme d'origine avant (kpSnapshotDefault) et la restaure pour revenir à QSDF.
  function applyAzer(lessons, modules, free) {
    if (!Array.isArray(lessons) || !Array.isArray(modules) || modules.length < 2) return;
    const mk = (id, mi) => Object.assign({}, L[id], { id, module: MODULE_NAMES[mi], moduleIdx: mi, pool: '' });
    const l0 = ORDER.filter((id) => /^ar/.test(id)).map((id) => mk(id, 0));
    const l1 = ORDER.filter((id) => /^am/.test(id)).map((id) => mk(id, 1));
    const gone = new Set([...(modules[0].lessons || []), ...(modules[1].lessons || [])].map((l) => l && l.id));
    const rest = lessons.filter((l) => l && !gone.has(l.id));
    lessons.splice(0, lessons.length, ...l0, ...l1, ...rest);
    modules.splice(0, 2, { name: MODULE_NAMES[0], lessons: l0 }, { name: MODULE_NAMES[1], lessons: l1 });
    if (Array.isArray(free)) free.splice(0, free.length, ...lessons.slice(0, 10).map((l) => l.id));
    for (const l of rest) {
      if (TUTOS[l.id]) { l.tuto = TUTOS[l.id]; continue; }
      const p = PATCHES[l.id];
      if (p) {
        let tip = l.tip || '', tuto = JSON.stringify(l.tuto || null);
        for (const [from, to] of p) { tip = tip.split(from).join(to); tuto = tuto.split(from.replace(/"/g, '\\"')).join(to.replace(/"/g, '\\"')); }
        if (l.tip) l.tip = tip;
        l.tuto = JSON.parse(tuto);
      }
    }
  }

  // Programme à proposer pour une classe (liste {id, title}) : la liste de la méthode française, modules 1 et 2 remplacés en AZER.
  function lessonListFor(homeRow, base) {
    const list = Array.isArray(base) ? base : [];
    if (normalizeHomeRow(homeRow) !== 'azer') return list;
    const gone = new Set(Object.values(REPLACES));
    return ORDER.map((id) => ({ id, title: L[id].title })).concat(list.filter((l) => !gone.has(l.id)));
  }

  const api = { HOME_ROWS, DEFAULT, normalizeHomeRow, REST, MODULE_NAMES, LESSONS: L, ORDER, REPLACES, PATCHES, TUTOS, applyAzer, lessonListFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KPHomeRow = api;
})(typeof window !== 'undefined' ? window : globalThis);
