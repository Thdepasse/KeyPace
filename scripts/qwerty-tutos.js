// Tutoriels (écran d'introduction de chaque leçon) du cours français sur QWERTY, pour les leçons dont le texte AZERTY parle de touches
// propres à l'AZERTY (« touche 2 », « à droite du P », « Sur AZERTY… »). Comme pour les 4 AZERTY, le geste EXACT de la variante du clavier
// est affiché sous la leçon (« Sur ton clavier (…) », KB_HOW) : ces textes restent donc neutres sur la variante (US, US International,
// Royaume-Uni, Mac…) et ne nomment que ce qui est vrai sur tous les QWERTY.
const R = (icon, t, d) => ({ icon, t, d });
const GESTE = "Le geste exact de ton clavier est indiqué juste en dessous.";
const ACC_INTRO = "Sur un clavier QWERTY, les accents n'ont pas de touche à eux : on les obtient avec une touche morte ou une combinaison (AltGr, Option). ";
const MORTE = R('⏳', 'Rien ne s\'affiche tout de suite', "Avec une touche morte, le signe n'apparaît qu'à la frappe suivante : tape-le, puis la voyelle. C'est normal, ne t'arrête pas.");

module.exports = {
  moduleNames: { '7. Accents directs AZERTY': '7. Les accents' },
  tutos: {
    r4: { intro: "Au tour des auriculaires, les petits doigts : A à gauche, point-virgule à droite. Ce sont les plus délicats à dompter.", rules: [
      R('🤏', 'Les doigts les plus faibles', "Les auriculaires manquent de force et de précision au début. C'est universel, même les pros sont passés par là. Patience."),
      R('↔️', "N'entraîne pas toute la main", "Étire seulement l'auriculaire vers A ou ;. Si tu fais pivoter le poignet, les autres doigts perdent leur repère."),
      R('⚓', 'Repose-le aussitôt', "L'auriculaire a tendance à rester en l'air. Ramène-le sur sa touche de repos dès qu'il a frappé.")], tip: "Objectif : activer les auriculaires sans casser ta position de repos. Lenteur et régularité avant tout." },
    r6: { intro: "Tu connais maintenant toute la rangée de repos : la rangée où tes doigts reviennent toujours, entre deux frappes.", rules: [
      R('🏠', 'Ta base de départ', "Tous tes doigts partent de cette rangée et y reviennent. La maîtriser, c'est savoir où tu es sur le clavier sans regarder."),
      R('🔁', 'Trouve chaque touche de mémoire', "Cet exercice mélange les dix touches. Si tu hésites, ralentis : le but est de les trouver de mémoire, pas de taper vite."),
      R('⚓', 'Position de repos constante', "Entre chaque frappe, sens que tes huit doigts sont revenus sur A S D F  J K L ;.")], tip: "Objectif : valider toute la rangée de repos, doigts ancrés et yeux sur l'écran." },
    h6: { intro: "Tu connais désormais deux rangées entières. Cette révision mélange toutes les lettres de la rangée du haut.", rules: [
      R('🔁', 'Repos et haut sans à-coups', "L'enjeu n'est plus chaque touche, mais la transition entre les rangées. Le passage du repos vers le haut doit être fluide."),
      R('🤚', 'Les poignets restent posés', "Ne soulève pas les poignets pour changer de rangée : seuls les doigts montent et descendent."),
      R('📖', 'Lis par groupes', "Essaie de lire deux ou trois mots d'avance. Ton cerveau prépare les doigts pendant que tu tapes.")], tip: "Objectif : enchaîner repos et rangée du haut sans regarder, avec un mouvement souple des doigts." },
    h3: { intro: "W et O complètent la rangée du haut côté annulaires. Tu vas former des mots plus variés.", rules: [
      R('⬆️', 'Les annulaires montent', "L'annulaire gauche monte sur W, l'annulaire droit sur O. Ces doigts sont moins forts : un petit mouvement précis suffit."),
      R('👀', "Entraîne l'anticipation", "Lis le mot suivant pendant que tu tapes le mot en cours. C'est cette anticipation qui rend la frappe fluide et continue."),
      R('🔤', 'Des mots variés', "four, roue, soleil, kiwi... Tu enchaînes des mots de plus en plus riches. Respecte bien les espaces.")], tip: "Objectif : taper W et O proprement et commencer à anticiper le mot suivant." },
    h4: { intro: "Q et P sont les touches des auriculaires sur la rangée du haut. Avec elles, les mots deviennent vraiment riches.", rules: [
      R('⬆️', 'Les auriculaires montent', "L'auriculaire gauche atteint Q, le droit atteint P. C'est l'un des mouvements les plus exigeants : va lentement."),
      R('🧘', 'Stabilise le poignet', "Ne décolle pas toute la main pour aider l'auriculaire. Le poignet reste stable, seul le petit doigt s'étire."),
      R('📚', 'Des mots plus longs', "pure, papa, appui, loup... Le vocabulaire s'élargit. Vise des mots plus longs sans regarder.")], tip: "Objectif : maîtriser Q et P sans casser ta position, même si l'auriculaire manque encore de force." },
    b1: { intro: "Tu attaques la rangée du bas. C et M sont tes premières touches sous la rangée de repos.", rules: [
      R('⬇️', 'Les doigts descendent', "Le majeur gauche descend sur C, sous le D. L'index droit descend sur M, sous le J. Le geste va vers le bas, pas sur le côté."),
      R('🧘', 'Le poignet suit un peu', "Pour la rangée du bas, le poignet peut s'abaisser très légèrement, mais reviens toujours à la position de repos ensuite."),
      R('🪝', 'Replie le doigt', "Pour descendre, replie le doigt au lieu de tendre toute la main. Une frappe propre rend tes textes réguliers.")], tip: "Objectif : descendre sur C et M sans perdre la rangée de repos, poignet détendu." },
    b3: { intro: "X et la virgule sont des touches plus rares, mais utiles pour une frappe vraiment complète.", rules: [
      R('↘️', 'Un geste diagonal', "L'annulaire gauche descend en diagonale vers X. C'est un mouvement inhabituel : fais-le lentement pour le mémoriser."),
      R('🔎', 'La virgule, au majeur droit', "La virgule est en bas, sous le K, tapée par le majeur droit. Cherche-la avec le doigt plutôt qu'avec les yeux."),
      R('✍️', 'Soigne la ponctuation', "La virgule se colle au mot qui précède, puis une espace suit. Une ponctuation propre rend tes textes lisibles.")], tip: "Objectif : mémoriser la position de X et de la virgule, sans regarder le clavier." },
    b4: { intro: "Z et le point complètent la rangée du bas : Z à gauche, le point à droite.", rules: [
      R('🤏', 'Z à l\'auriculaire', "L'auriculaire gauche descend sur Z, tout en bas à gauche. Garde le poignet stable, seul le petit doigt s'étire."),
      R('⌨️', "Le point, à l'annulaire droit", "Le point est en bas, sous le L, juste à droite de la virgule. Il se tape sans Maj."),
      R('🏁', 'Il termine la phrase', "Le point se colle au mot qui précède, puis une espace suit. Il marque la fin d'une idée.")], tip: "Objectif : placer Z et le point, chacun avec le bon doigt, sans crisper la main." },
    b5: { intro: "B complète l'alphabet et la barre oblique ajoute une touche en bas à droite. Un vrai cap : tu auras les 26 lettres.", rules: [
      R('⬇️', 'B au centre-bas', "L'index gauche s'étire vers le centre puis descend pour B. C'est un mouvement un peu ample : reviens vite sur F."),
      R('⌨️', 'La barre oblique /', "Elle est à l'auriculaire droit, tout en bas à droite, après le point. On la rencontre dans oui/non, et/ou, vrai/faux."),
      R('🏁', 'Les 26 lettres réunies', "Avec B, tu maîtrises tout l'alphabet. À partir d'ici, n'importe quel mot français t'est accessible.")], tip: "Objectif : poser B et la barre oblique, et savourer d'avoir bouclé l'alphabet complet." },
    pon2: { intro: "Le point d'interrogation et le point d'exclamation donnent le ton : une question, une émotion.", rules: [
      R('⇧', 'Avec Maj', "Sur un clavier QWERTY, ? et ! se font avec Maj. Maintiens Maj de la main opposée, puis frappe le signe. " + GESTE),
      R('␣', 'Espace avant, en français', "En français, on met une espace avant ? et ! (contrairement à l'anglais) : mot, espace, signe."),
      R('🎭', 'Le bon ton', "? pour interroger, ! pour exclamer. Un seul suffit : évite les points d'exclamation à répétition.")], tip: "Objectif : taper ? et ! avec l'espace française avant le signe." },
    acc1: { intro: ACC_INTRO + "On commence par le é. " + GESTE, rules: [
      R('⌨️', 'Un geste, pas une touche', "Le é s'obtient avec un geste propre à ton clavier (touche morte puis e, AltGr + e, Option + e puis e…). Regarde le geste indiqué sous la leçon."),
      MORTE,
      R('🔥', 'Très fréquent', "é est l'un des caractères les plus courants du français (été, café, écrire). L'automatiser fait gagner beaucoup.")], tip: "Objectif : produire é avec le geste de ton clavier, sans hésiter." },
    acc2: { intro: "Le è (accent grave) s'obtient avec un autre signe que le é. " + GESTE, rules: [
      R('⌨️', 'Même principe, autre signe', "Le è passe par l'accent grave (touche morte ` ou combinaison de ton clavier), puis la lettre e."),
      R('↔️', 'Ne confonds pas é et è', "é et è utilisent deux signes différents : le geste du é, puis le geste du è. Entraîne-toi à les alterner."),
      R('💬', 'Mots très courants', "père, mère, très, après... Le è revient sans cesse. Profite-en pour réviser le é au passage.")], tip: "Objectif : taper è sans le confondre avec é, et réviser les deux." },
    acc3: { intro: "On ajoute le à et le ù. Tu pourras écrire voilà, déjà, où. " + GESTE, rules: [
      R('⌨️', 'Accent grave, voyelles a et u', "à et ù utilisent le même signe que è (l'accent grave), suivi de a ou de u. Le geste est celui du è."),
      MORTE,
      R('💬', 'Petits mots, grand usage', "à, où, là, déjà... Ces petits mots accentués sont partout. Bien les placer évite beaucoup de fautes.")], tip: "Objectif : produire à et ù avec le geste de ton clavier, sans hésiter." },
    acc4: { intro: "Dernier accent courant : le ç (c cédille). Avec lui et le ù, tu as les accents usuels du français. " + GESTE, rules: [
      R('⌨️', 'Le ç, un geste à part', "Le ç s'obtient avec son propre geste (souvent la touche morte ' puis c, ou Option + c, ou AltGr + , selon ton clavier). Regarde le geste indiqué."),
      R('📖', 'La cédille', "Le ç se met sous le c devant a, o, u pour faire le son [s] : façon, leçon, garçon, français."),
      R('🧩', 'Tous les accents réunis', "Avec ç et ù, tu as é è à ù ç. Révise-les ensemble pour que chaque geste devienne un réflexe.")], tip: "Objectif : placer ç et ù sans regarder, et réviser l'ensemble des accents." },
    acc5: { intro: "On réunit tous ces accents dans un vrai texte français. C'est ce qui fait la différence à l'écrit.", rules: [
      R('🧭', 'Chaque accent a son geste', "é, è, à, ù, ç : cinq caractères, chacun son geste sur ton clavier. Visualise-le avant de taper."),
      R('🎯', "Précision d'abord", "Les gestes d'accents sont moins automatiques que les lettres. Ralentis dessus si besoin, la vitesse viendra avec la répétition."),
      R('✅', 'Le vrai français', "Un texte sans accents fait amateur. Maîtriser ces gestes, c'est écrire un français propre et soigné.")], tip: "Objectif : écrire un texte accentué complet sans chercher les gestes." },
    cir1: { intro: "Le circonflexe (le « chapeau ») passe par une touche morte : tu appuies d'abord sur le signe, puis sur la voyelle. Rien ne s'affiche tant que tu n'as pas tapé la voyelle, c'est normal. " + GESTE, rules: [
      R('🎩', 'Une touche morte', "Sur QWERTY, le circonflexe s'obtient avec une combinaison propre à ton clavier (par exemple Maj + 6 puis la voyelle, ou Option + i puis la voyelle sur Mac)."),
      R('2️⃣', 'En deux temps', "Circonflexe = deux frappes : le signe, puis la voyelle. â = signe puis a, ê = signe puis e. Le système combine les deux."),
      R('💬', 'Mots courants', "château, pâte, être, fête, forêt... Le circonflexe est fréquent. Prends le réflexe du « chapeau d'abord ».")], tip: "Objectif : enchaîner le signe puis la voyelle pour écrire â et ê sans hésiter." },
    cir2: { intro: "Même geste pour î et ô : le circonflexe, puis la voyelle. Tu complètes le circonflexe sur i et o. " + GESTE, rules: [
      R('🎩', "Toujours le signe d'abord", "î = signe puis i, ô = signe puis o. Le geste est identique à â et ê : la touche morte vient toujours en premier."),
      R('📍', 'Même geste que â et ê', "Tu ne changes rien : c'est la même combinaison, seule la voyelle change."),
      R('💬', 'Mots utiles', "île, maître, boîte, hôtel, côte, rôle... Profite de la révision de â et ê glissés dans les mêmes textes.")], tip: "Objectif : taper î et ô avec la touche morte, et réviser â ê." },
    cir3: { intro: "Dernière voyelle du circonflexe : le û. Même principe de touche morte, puis révision de tous les chapeaux.", rules: [
      R('🎩', 'û = signe puis u', "Encore une fois : le signe du circonflexe, puis u. Tu connais maintenant les cinq voyelles à chapeau."),
      R('🖐️', 'Cinq voyelles', "â ê î ô û : toutes se font avec le même geste puis la voyelle. Un seul geste à maîtriser pour les cinq."),
      R('🐢', 'Va à ton rythme', "La double frappe demande un peu de coordination. Ralentis si besoin, le geste s'automatise vite.")], tip: "Objectif : écrire û et enchaîner les cinq voyelles circonflexes sans regarder." },
    cir4: { intro: "On met tous les circonflexes dans un vrai texte. Le geste « chapeau puis voyelle » doit devenir naturel.", rules: [
      R('⚡', 'Le réflexe touche morte', "Dès que tu vois un chapeau, pense au signe d'abord, voyelle ensuite. Ce réflexe vaut pour les cinq voyelles."),
      R('👀', 'Anticipe les accents', "En lisant le mot, repère les voyelles accentuées à l'avance pour préparer la double frappe."),
      R('✨', 'Soigne le rendu', "Les circonflexes bien placés (être, château, forêt) donnent un texte vraiment correct en français.")], tip: "Objectif : intégrer les circonflexes dans un texte fluide, sans casser le rythme." },
    tre1: { intro: "Le tréma (¨) est aussi une touche morte, comme le circonflexe : le signe d'abord, puis la voyelle. " + GESTE, rules: [
      R('¨', 'Le signe d\'abord', "Fais le geste du tréma (par exemple Maj + ' sur US International, ou Option + u sur Mac), relâche, puis tape e ou i."),
      MORTE,
      R('💬', 'Mots à tréma', "Noël, naïf, maïs, héroïque... Le tréma sépare deux voyelles qu'on prononce distinctement.")], tip: "Objectif : faire le geste du tréma puis la voyelle pour écrire ë et ï." },
    num3: { intro: "Au tour des annulaires : 2 à gauche, 9 à droite. On approche des bords de la rangée.", rules: [
      R('⬆️', "Les annulaires s'étirent", "Le 2 (annulaire gauche) et le 9 (annulaire droit) demandent un étirement plus long. Doigts moins forts : va doucement."),
      R('🔢', 'Les chiffres sont directs', "Sur un clavier QWERTY, les chiffres de la rangée du haut se tapent sans Maj. Un simple appui suffit."),
      R('🎯', 'Précision avant tout', "Plus on s'éloigne du centre, plus les fautes guettent. Mieux vaut lent et juste que rapide et faux.")], tip: "Objectif : atteindre 2 et 9 avec les annulaires, sans regarder." },
  },
};
