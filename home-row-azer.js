/* Rangée de repos du cours français AZERTY : QSDF JKLM (méthode française, défaut) ou AZER UIOP (méthode belge,
   secrétariat-bureautique FWB : les doigts reposent sur la rangée du haut).
   Fichier pur : chargé par index.html (balise script) et par les tests Node. C'EST LE SEUL ENDROIT À MODIFIER pour ajuster
   la progression AZER-UIOP avec la prof : ordre des touches, titres, consignes, textes.

   Principe : chaque doigt garde SA colonne (le doigt qui tape chaque touche ne change pas) ; seule la rangée de repos change.
   On ne duplique pas le programme : les modules 1 et 2 gardent leurs identifiants de leçons (r1 à r6, h1 à h6), donc la
   progression, les leçons gratuites, les statistiques du prof et les niveaux des jeux restent valables. Seuls leurs titres,
   touches, consignes et textes sont remplacés. Le module 3 (rangée du bas) et la suite ne changent pas : à ce stade, les
   20 lettres du haut et du milieu sont connues dans les deux méthodes. Quelques consignes de la suite qui parlent des
   repères « F et J » sont adaptées (PATCHES).

   Progression proposée (à valider avec la prof) :
     Module 1 « Position de base » (rangée du haut = repos) : R U (index), E I (majeurs), Z O (annulaires), A P (auriculaires),
       T Y (index vers l'intérieur), révision.
     Module 2 « Rangée du milieu » : F J, D K, S L, Q M, G H, révision.
     Module 3 « Rangée du bas » et suivants : inchangés.
   Règle vérifiée par la gate U18 : un texte n'emploie que des lettres déjà enseignées (touches des leçons précédentes et de
   la leçon elle-même), et emploie chaque nouvelle touche. */
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
    r1: { title: 'R et U, les index', keys: 'r u',
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
    r2: { title: 'E et I, les majeurs', keys: 'e i',
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
    r3: { title: 'Z et O, les annulaires', keys: 'z o',
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
    r4: { title: 'A et P, les auriculaires', keys: 'a p',
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
    r5: { title: 'T et Y, index intérieurs', keys: 't y',
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
    r6: { title: 'Révision : toute la rangée de repos', keys: 'a z e r t y u i o p',
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
    h1: { title: 'F et J, sous les index', keys: 'f j',
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
    h2: { title: 'D et K, sous les majeurs', keys: 'd k',
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
    h3: { title: 'S et L, sous les annulaires', keys: 's l',
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
    h4: { title: 'Q et M, sous les auriculaires', keys: 'q m',
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
    h5: { title: 'G et H, index intérieurs', keys: 'g h',
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
    h6: { title: 'Révision : la rangée du milieu', keys: 'q s d f g h j k l m',
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

  // Consignes des leçons suivantes (inchangées sinon) qui parlent des repères de la méthode française.
  // [texte d'origine, texte AZER] ; la gate U18 vérifie que chaque texte d'origine existe encore (sinon le remplacement serait muet).
  const PATCHES = {
    b1: [['sous la rangée de repos', 'sous la rangée du milieu']],
    b2: [['la position de référence sur F et J', 'la position de référence sur R et U'], ['sans perdre F et J de référence', 'sans perdre R et U de référence']],
    b6: [['à partir de F et J', 'à partir de R et U']],
    num1: [["ramène l'index sur F ou J", "ramène l'index sur R ou U"]],
    num2: [['Reviens sur la rangée du milieu après chaque chiffre', 'Reviens sur ta rangée de repos (A Z E R · U I O P) après chaque chiffre']],
    num6: [['Reviens toujours sur F et J', 'Reviens toujours sur R et U']],
  };

  // Applique la méthode AZER-UIOP EN PLACE sur le programme (objets leçon et module du cours fr/azerty).
  // L'appelant a pris une copie du programme d'origine avant (kpSnapshotDefault) et le restaure pour revenir à QSDF.
  function applyAzer(lessons, modules) {
    const renamed = {};
    (modules || []).forEach((m, i) => { if (MODULE_NAMES[i] && m) { renamed[m.name] = MODULE_NAMES[i]; m.name = MODULE_NAMES[i]; } });
    for (const l of lessons || []) {
      if (!l) continue;
      if (renamed[l.module]) l.module = renamed[l.module];
      const o = L[l.id];
      if (o) { l.title = o.title; l.keys = o.keys; l.tip = o.tip; l.tuto = o.tuto; l.text = o.text; continue; }
      const p = PATCHES[l.id];
      if (p) {
        let tip = l.tip || '', tuto = JSON.stringify(l.tuto || null);
        for (const [from, to] of p) { tip = tip.split(from).join(to); tuto = tuto.split(from.replace(/"/g, '\\"')).join(to.replace(/"/g, '\\"')); }
        if (l.tip) l.tip = tip;
        l.tuto = JSON.parse(tuto);
      }
    }
  }

  const api = { HOME_ROWS, DEFAULT, normalizeHomeRow, REST, MODULE_NAMES, LESSONS: L, PATCHES, applyAzer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KPHomeRow = api;
})(typeof window !== 'undefined' ? window : globalThis);
