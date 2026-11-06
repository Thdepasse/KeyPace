/* Données du programme (page « Cours ») : Belgique (FMTTN) et France (CRCN, Pix). Fichier pur : chargé par index.html (balise script) et par les tests Node.
   Les données belges sont celles de la page programme, déplacées ici sans modification. La France est DÉRIVÉE de la Belgique : chaque année française
   porte la clé de son année belge équivalente (be), les leçons et les modules sont lus dans les données belges. La France n'ajoute que des textes. */
(function (root) {
  const NETS=[
    {id:'fwb',c:'#FF4D2E',t:'Wallonie-Bruxelles Enseignement',grp:'Enseignement officiel'},
    {id:'off',c:'#3FA84E',t:'Officiel subventionné',grp:'Enseignement officiel'},
    {id:'cath',c:'#4F6BE0',t:'Libre confessionnel',grp:'Enseignement libre subventionné'},
    {id:'libre',c:'#9B57D6',t:'Libre non confessionnel',grp:'Enseignement libre subventionné'}];
  const YEARS=[...[3,4,5,6].map(n=>({n,suf:'e',l:n+'e primaire',g:'Primaire',c:'#FF8A3C'})),...[1,2,3,4,5,6].map(n=>({n,suf:n===1?'re':'e',l:n+(n===1?'re':'e')+' secondaire',g:'Secondaire',c:'#4F6BE0'}))];
  /* ===== CONTENU RÉEL =====
     Source : « Référentiel de formation manuelle, technique, technologique et numérique » (FMTTN),
     tronc commun de la Fédération Wallonie-Bruxelles, de la 3e primaire à la 3e secondaire.
     Ce référentiel est fixé par le Gouvernement et vaut pour tous les réseaux ; chaque réseau en tire
     ensuite son propre programme (non consultés pour l'instant : à ajouter via PROGRAMME_RESEAU).
     Les citations ci-dessous sont reprises mot pour mot. Les leçons proposées sont un choix KeyPace,
     expliqué à chaque fois ; les leçons correspondent aux 66 leçons du parcours dactylographie. */
  const PROGRAMME_RESEAU={}; // surcharge par réseau : PROGRAMME_RESEAU.cath['4e primaire']={...}
  const PROGRAMME_COMMUN={
   '3e primaire':{
    cal:'En vigueur dans toutes les années du primaire : « Depuis la rentrée scolaire 2025-2026, les neufs référentiels disciplinaires concernent tous les élèves de primaire. » (Circulaire 9744, FWB, juin 2026)',
    lecons:[{r:[1,6],why:'Découvrir le clavier et prendre la bonne posture.',tag:'prog'}],},
   '4e primaire':{
    cal:'En vigueur dans toutes les années du primaire : « Depuis la rentrée scolaire 2025-2026, les neufs référentiels disciplinaires concernent tous les élèves de primaire. » (Circulaire 9744, FWB, juin 2026)',
    intro:'Sur le plan numérique, l’accent est mis sur la découverte du traitement de texte et de l’image.',
    lecons:[{r:[7,23],why:'Les touches principales du clavier, pour saisir un texte court.',tag:'prog'},{r:[24,33],why:'Les majuscules et la ponctuation, pour que le texte soit correct.',tag:'choix'}],},
   '5e primaire':{
    cal:'En vigueur dans toutes les années du primaire : « Depuis la rentrée scolaire 2025-2026, les neufs référentiels disciplinaires concernent tous les élèves de primaire. » (Circulaire 9744, FWB, juin 2026)',
    lecons:[{r:[34,45],why:'Les accents, pour écrire correctement en français dans tes messages et tes textes.',tag:'choix'},{r:[46,51],why:'Les chiffres, pour encoder des données dans un tableur.',tag:'prog'},{r:[52,52],why:'Le @, pour les adresses email.',tag:'prog'}],},
   '6e primaire':{
    cal:'En vigueur dans toutes les années du primaire : « Depuis la rentrée scolaire 2025-2026, les neufs référentiels disciplinaires concernent tous les élèves de primaire. » (Circulaire 9744, FWB, juin 2026)',
    lecons:[{r:[53,60],why:'Les symboles, pour créer un mot de passe de niveau de sécurité élevé.',tag:'prog'}],},
   '1re secondaire':{
    cal:'En vigueur depuis la rentrée 2026-2027 : « À partir de la rentrée scolaire 2026-2027, ils concerneront également les élèves entrant en première année de secondaire. » (Circulaire 9744, FWB, juin 2026)',
    intro:'L’élève consolide ses acquis liés au traitement de texte qu’il enrichit d’images et/ou de sons.',
    lecons:[{r:[61,64],why:'Enchaîner phrases et paragraphes, pour éditer et enrichir un texte.',tag:'prog'}],},
   '2e secondaire':{
    calUser:'Pas encore en vigueur en 2e secondaire : ce programme arrive progressivement d’ici 2028.',
    cal:'Pas encore en vigueur : en 2026-2027, la 2e secondaire reste sous l’organisation actuelle (Circulaire 9744, FWB, juin 2026). Le volet numérique y arrive au fil du calendrier du Pacte, « jusqu’à la 3e secondaire à la rentrée 2028 ».',
    lecons:[{r:[65,66],why:'Textes techniques avec symboles, pour les formules du tableur, et gagner en vitesse.',tag:'prog'}],},
   '3e secondaire':{
    calUser:'Pas encore en vigueur en 3e secondaire : ce programme arrive à la rentrée 2028.',
    intro:'Sur le plan numérique, la dernière année du tronc commun est centrée sur la communication et la collaboration.',
    lecons:[],
    note:'Pas de nouvelle leçon cette année : on consolide la vitesse et la fluidité.',
    cal:'Pas encore en vigueur : le volet numérique « entrera ensuite en vigueur pour chaque année scolaire successive, jusqu’à la 3e secondaire à la rentrée 2028. » (Pacte pour un Enseignement d’excellence)',},
   '4e secondaire':{kp:true,lecons:[],note:'Pas de nouvelle leçon cette année : on consolide la vitesse et la fluidité.'},'5e secondaire':{kp:true,lecons:[],note:'Pas de nouvelle leçon cette année : on consolide la vitesse et la fluidité.'},'6e secondaire':{kp:true,lecons:[],note:'Pas de nouvelle leçon cette année : on consolide la vitesse et la fluidité.'}
  };
  /* ===== VÉRIFICATION PAR RÉSEAU (état des recherches) =====
     ok:true  = programme du réseau consulté pour cette année, comparé au référentiel.
     Sinon    = programme du réseau non trouvé : on affiche le référentiel commun, qui s'applique à tous. */
  const NET_CHECK={
    cath:{part:{'3e primaire':'Site du SeGEC pour le fondamental (La Salle des Profs) consulté : ses séquences de formation numérique portent sur les mêmes sujets que le référentiel (titres cités dans « Voir la source »). Le programme complet, volume 3 (mathématiques, sciences et FMTTN), est sur l’extranet du SeGEC, qui demande une connexion : non lu.','4e primaire':'Site du SeGEC pour le fondamental (La Salle des Profs) consulté : ses séquences de formation numérique portent sur les mêmes sujets que le référentiel (titres cités dans « Voir la source »). Le programme complet, volume 3 (mathématiques, sciences et FMTTN), est sur l’extranet du SeGEC, qui demande une connexion : non lu.','5e primaire':'Site du SeGEC pour le fondamental (La Salle des Profs) consulté : ses séquences de formation numérique portent sur les mêmes sujets que le référentiel (titres cités dans « Voir la source »). Le programme complet, volume 3 (mathématiques, sciences et FMTTN), est sur l’extranet du SeGEC, qui demande une connexion : non lu.','6e primaire':'Site du SeGEC pour le fondamental (La Salle des Profs) consulté : ses séquences de formation numérique portent sur les mêmes sujets que le référentiel (titres cités dans « Voir la source »). Le programme complet, volume 3 (mathématiques, sciences et FMTTN), est sur l’extranet du SeGEC, qui demande une connexion : non lu.'},nom:'Libre confessionnel (le programme consulté est celui du SeGEC, catholique)',ok:{'1re secondaire':'Programme du SeGEC (enseignement catholique) FMTTN de 1re secondaire (juin 2025) consulté : mêmes attendus que le référentiel (Cc et Cci, puces, marges…), avec des situations d’apprentissage en plus. Aucune mention de la frappe au clavier.'}},
    fwb:{nom:'Wallonie-Bruxelles Enseignement',ko:{'1re secondaire':'Programmes WBE du tronc commun secondaire consultés (français, mathématiques, sciences, langues modernes et anciennes, FHGES, éducation culturelle et artistique, philosophie et citoyenneté, éducation physique), tous « en attente de validation par le Gouvernement ». Aucun ne contient de programme de formation numérique : le numérique n’y apparaît que dans d’autres cours. Le référentiel commun s’applique.','2e secondaire':'Programmes WBE du tronc commun secondaire consultés (français, mathématiques, sciences, langues modernes et anciennes, FHGES, éducation culturelle et artistique, philosophie et citoyenneté, éducation physique), tous « en attente de validation par le Gouvernement ». Aucun ne contient de programme de formation numérique : le numérique n’y apparaît que dans d’autres cours. Le référentiel commun s’applique.','3e secondaire':'Programmes WBE du tronc commun secondaire consultés (français, mathématiques, sciences, langues modernes et anciennes, FHGES, éducation culturelle et artistique, philosophie et citoyenneté, éducation physique), tous « en attente de validation par le Gouvernement ». Aucun ne contient de programme de formation numérique : le numérique n’y apparaît que dans d’autres cours. Le référentiel commun s’applique.'},ok:{'3e primaire':'Programme de 3e primaire rédigé en commun par le CECP et Wallonie-Bruxelles Enseignement : consulté. Il reprend les attendus du référentiel et y ajoute des séquences d’apprentissage.','4e primaire':'Programme de 4e primaire rédigé en commun par le CECP et Wallonie-Bruxelles Enseignement : consulté. Il reprend les attendus du référentiel et y ajoute des séquences d’apprentissage.','5e primaire':'Programme de 5e primaire rédigé en commun par le CECP et Wallonie-Bruxelles Enseignement : consulté. Il reprend les attendus du référentiel et y ajoute des séquences d’apprentissage.'}},
    off:{nom:'Officiel subventionné',ko:{'1re secondaire':'Programmes du CPEONS pour la 1re secondaire (2026) consultés : éducation culturelle et artistique, langues modernes, philosophie et citoyenneté, FHGES. Aucun ne contient de programme de formation numérique : ils ne citent la FMTTN que pour des liens avec d’autres cours. Le référentiel commun s’applique.'},ok:{'3e primaire':'Programme de 3e primaire rédigé en commun par le CECP (écoles communales et provinciales) et Wallonie-Bruxelles Enseignement : consulté, avec des séquences d’apprentissage en plus. Programme propre au CPEONS : non trouvé.','4e primaire':'Programme de 4e primaire rédigé en commun par le CECP (écoles communales et provinciales) et Wallonie-Bruxelles Enseignement : consulté, avec des séquences d’apprentissage en plus. Programme propre au CPEONS : non trouvé.','5e primaire':'Programme de 5e primaire rédigé en commun par le CECP (écoles communales et provinciales) et Wallonie-Bruxelles Enseignement : consulté, avec des séquences d’apprentissage en plus. Programme propre au CPEONS : non trouvé.'}},
    libre:{nom:'Libre non confessionnel (FELSI)',ok:{'1re secondaire':'Programme FELSI S1-S2-S3 (avril 2026, « en cours d’approbation ») consulté : il reprend les attendus du référentiel, numérotés « FMTTN 7.xx », et y ajoute des pistes méthodologiques.','2e secondaire':'Programme FELSI S1-S2-S3 (avril 2026, « en cours d’approbation ») consulté : il reprend les attendus du référentiel, numérotés « FMTTN 7.xx », et y ajoute des pistes méthodologiques.','3e secondaire':'Programme FELSI S1-S2-S3 (avril 2026, « en cours d’approbation ») consulté : il reprend les attendus du référentiel, numérotés « FMTTN 7.xx », et y ajoute des pistes méthodologiques.'}}
  };
  const PENDING_USER='Il n’y a pas encore de programme officiel de formation numérique pour la 4e, la 5e et la 6e secondaire. Voici les modules que KeyPace te conseille pour cette année.';
  const PENDING_SUP='Il n’existe pas encore de référentiel numérique officiel pour la 4e, la 5e et la 6e secondaire : le tronc commun s’arrête à la 3e secondaire. La Fédération Wallonie-Bruxelles annonce seulement : « Pour la suite du tronc commun, de nouveaux référentiels adaptés en fonction des nouvelles filières dans l’enseignement secondaire supérieur seront également élaborés. » Aucune date n’est donnée. Les modules proposés ici sont donc un choix de KeyPace, pas un programme officiel.';
  /* ===== POINTS DE PROGRAMME -> MODULES =====
     Chaque point de programme (PROG_ITEMS) pointe vers UN module du catalogue (MODS, la liste « Les autres modules »).
     « Modules associés » n'affiche donc que des modules qui existent aussi dans « Les autres modules » : c'est la même liste, filtrée.
     `sources` : reseaux ('tous' = référentiel commun, sinon liste d'identifiants de réseau), annees, dom (origine), cite (mot pour mot).
     POUR AJOUTER UN POINT DE PROGRAMME : ajouter un objet à PROG_ITEMS avec mod = id d'un module existant ou d'un module à créer dans NEW_MODS.
     QUAND UN MODULE EST CRÉÉ : passer live à true dans sa définition (NEW_MODS ou MODS). Il apparaît « Disponible » partout. */
  const PROG_ITEMS=[
   {id:'posture',mod:'posture',titre:'Bien s’installer devant le clavier',desc:'Dos, bras et poignets : la bonne position pour taper sans se fatiguer.',icon:'user',sources:[
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Contenus communs (les deux volets)',cite:'Appliquer la posture ergonomique recommandée par l\'enseignant.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Contenus communs (les deux volets)',cite:'Appliquer la posture ergonomique recommandée par l\'enseignant.'},
     {reseaux:['fwb','off'],annees:['4e primaire'],dom:'Programme WBE et CECP',cite:'il y a lieu d’être attentif(ve) à l’attendu concernant la posture ergonomique. Rendre cet attendu explicite permet aux élèves d’adopter une position adéquate face aux outils numériques.'},
     {reseaux:['fwb','off'],annees:['3e primaire'],dom:'Programme WBE et CECP',cite:'ils/elles utilisent peu les suggestions faites par le moteur de recherche, car ils/elles ne les voient pas, trop occupé(e)s à regarder le clavier lorsqu’ils/elles tapent.'},
     {reseaux:['fwb','off'],annees:['3e primaire'],dom:'Programme WBE et CECP',cite:'Les moments de « dactylographie », dénués d’enjeux d’apprentissage, peuvent se révéler fortement différenciateurs. Certain(e)s élèves encodent plus rapidement au clavier (ou sont plus à l’aise avec l’utilisation du clavier) et s’engagent donc rapidement dans les apprentissages tandis que d’autres peuvent y consacrer un temps trop long.'}]},
   {id:'recherche',mod:'recherche',titre:'Écrire une recherche',desc:'Choisir les bons mots-clés, utiliser un moteur de recherche et vérifier d’où vient l’information.',icon:'eye',sources:[
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Utiliser, adéquatement en contexte, les termes dont moteur de recherche, barre de recherche, navigateur.'},
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Utiliser, adéquatement en contexte, le terme Internet*.'},
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Sélectionner un ou plusieurs mot(s)-clé(s) pertinent(s) pour effectuer une recherche.'},
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Utiliser un outil de recherche* en suivant les directives de l\'enseignant.'},
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Rechercher une information au moyen d\'un outil de recherche* imposé, en utilisant une bibliothèque appropriée (images, vidéos…) et des mots-clés choisis collectivement.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Déterminer un ou plusieurs mot(s)-clé(s) pertinent(s) pour effectuer une recherche.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Utiliser des outils de recherche* dont des moteurs de recherche, en considérant leurs spécificités.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Associer chaque élément du résultat de la recherche à son intention.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Pointer la source apparente d\'un contenu.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Rechercher un contenu au moyen d\'un outil de recherche* imposé, en utilisant une bibliothèque appropriée (images, vidéos…) et des mots-clés choisis individuellement.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Questionner la fiabilité contextuelle d\'une source, avec l\'aide de l\'enseignant.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Expliquer la notion de « Fake News » comme une information délibérément fausse.'},
     {reseaux:['cath'],annees:['4e primaire'],dom:'Séquence SeGEC (La Salle des Profs)',cite:'Effectuer une recherche sur le Web'},
     {reseaux:['fwb','off'],annees:['3e primaire'],dom:'Programme WBE et CECP',cite:'Les accents et les cédilles peuvent être omis, ceci n’influencera pas les résultats de la recherche.'}]},
   {id:'fichiers',mod:'fichiers',titre:'Ranger et retrouver ses fichiers',desc:'Enregistrer, nommer, déplacer et organiser ses fichiers et ses dossiers.',icon:'layout',sources:[
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Enregistrer un document localement.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Distinguer des supports de stockage utilisés dont disque dur, cloud*.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Utiliser, adéquatement en contexte, les termes dont fichier, dossier, système d\'exploitation*, logiciel*, application*.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Naviguer entre plusieurs documents, sites, applications*, onglets, logiciels*.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Créer, (re)nommer un fichier et un dossier pour permettre une exploitation ultérieure efficiente.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Déplacer, dupliquer, supprimer un fichier et un dossier.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Organiser des fichiers, des dossiers numériques, avec l\'aide de l\'enseignant.'},
     {reseaux:['cath'],annees:['4e primaire'],dom:'Séquence SeGEC (La Salle des Profs)',cite:'Comprendre l’utilité de nommer et de structurer ses documents numériques'}]},
   {id:'saisir-texte',mod:'saisir-texte',titre:'Saisir un texte court',desc:'Les touches principales du clavier, couper, copier, coller.',icon:'keyboard',sources:[
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser les touches principales du clavier pour saisir un texte court (500 caractères maximum).'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser les fonctionnalités dont couper, copier, coller, glisser.'}]},
   {id:'traitement-texte',mod:'traitement-texte',titre:'Découvrir le traitement de texte',desc:'Police, taille, alignement, encadré, image dans un texte : rendre un texte court agréable à lire.',icon:'layout',sources:[
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser, adéquatement en contexte, les termes dont police, alignement, orientation, caractère, espace.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Pointer les commandes dont choix de police, taille de police, style de police, orientation portrait/paysage.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Dupliquer une mise en forme.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser conjointement deux applications*/logiciels* disponibles dans un espace numérique.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Changer le format des caractères dont police, style, taille, couleur.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Aligner le texte.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Encadrer une partie du texte.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Choisir l\'orientation de la page.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Insérer une image dans un document textuel et utiliser des fonctions d\'habillage.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Éditer un contenu court, le mettre en forme et en page, en respectant une ligne éditoriale limitée à la forme.'},
     {reseaux:['cath'],annees:['4e primaire'],dom:'Séquence SeGEC (La Salle des Profs)',cite:'Utiliser un traitement de texte'},
     {reseaux:['fwb','off'],annees:['4e primaire'],dom:'Programme WBE et CECP',cite:'Elle aborde la découverte, la prise en main et l’utilisation d’un logiciel de traitement de texte, quel que soit le système d’exploitation auquel il appartient.'}]},
   {id:'image-media',mod:'image-media',titre:'Traiter une image et créer un petit média',desc:'Retoucher une image, enregistrer un son ou une photo, produire un contenu simple.',icon:'eye',sources:[
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Identifier les boutons donnant accès à la prise de son et d\'image, à l\'insertion de texte, à l\'enregistrement de fichier.'},
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser les fonctions principales d\'un outil, d\'une application*, d\'un logiciel* choisi par l\'enseignant.'},
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Traiter une image (ex. : rogner, redimensionner, appliquer un effet, modifier la luminosité, le contraste).'},
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Produire un contenu médiatique simple (ex. : son, image, photo, vidéo, texte).'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Traiter une image en respectant une consigne.'}]},
   {id:'droit-image',mod:'droit-image',titre:'Droit à l’image et droits de propriété',desc:'Ce qu’on a le droit de publier : photos, images et contenus des autres.',icon:'lock',sources:[
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser un contenu médiatique, en respectant les droits de propriété de la personne physique ou morale à qui appartient l\'image.'},
     {reseaux:'tous',annees:['3e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Expliquer le principe de droit à l\'image lié au consentement de la personne prise en photo.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Expliquer les grands principes de droit à l\'image dont le droit de propriété et le consentement de la personne prise en photo.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Appliquer les notions enseignées de droits de propriété.'},
     {reseaux:'tous',annees:['4e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Appliquer les notions enseignées de droits à l\'image.'}]},
   {id:'mail',mod:'mail',titre:'Rédiger un mail',desc:'Destinataire, objet, texte du message, pièce jointe et politesse.',icon:'mail',sources:[
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Notions spécifiques liées à l\'éthique des médias numériques : Utiliser, adéquatement en contexte, le terme nétiquette*.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Utiliser un outil de communication : Ouvrir l\'outil de communication et consulter des messages.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Utiliser un outil de communication : Utiliser ses fonctionnalités : destinataire, objet et insérer un corps de texte et une pièce jointe.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Respecter la nétiquette* du média : Respecter, dans l\'environnement numérique rencontré, une nétiquette* convenue en classe.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Interagir/communiquer : Interagir/communiquer, à l\'aide d\'outils numériques.'},
     {reseaux:['cath'],annees:['5e primaire'],dom:'Séquence SeGEC (La Salle des Profs)',cite:'Écrire un courriel'}]},
   {id:'ecrire-ensemble',mod:'ecrire-ensemble',titre:'Écrire ensemble en ligne',desc:'Participer à un espace partagé, y écrire à plusieurs et partager un contenu.',icon:'pen',sources:[
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Vocabulaire spécifique au software* : Utiliser, adéquatement en contexte, les termes dont lien hypertexte*, onglet, URL.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Téléverser* un contenu numérique en ligne : Téléverser* un contenu sur un Espace Numérique de Travail (ENT) de la classe.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Participer dans un espace collaboratif numérique : Participer au sein d\'un espace collaboratif numérique, en entretenant une relation sociale de qualité.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'S\'intégrer dans un espace collaboratif numérique, en respectant la cohérence de l\'environnement : S\'intégrer au sein d\'un espace collaboratif numérique, en respectant la cohérence (fond et forme) de l\'environnement choisi.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Partager un contenu numérique : Partager un contenu, à l\'aide d\'un outil déterminé par l\'enseignant.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Collaborer sur un contenu numérique : Collaborer sur un contenu propre à l\'école (ex. : écriture collaborative, carte mentale…).'}]},
   {id:'tableur',mod:'tableur',titre:'Le tableur : encoder des données',desc:'Taper des chiffres et des mots dans les bonnes cases, puis faire un graphique.',icon:'table',sources:[
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser un tableur : Encoder des données dans un tableur et réaliser un graphique.'}]},
   {id:'audio-video',mod:'audio-video',titre:'Monter un son ou une vidéo',desc:'Couper, copier, coller et produire un document sonore ou une vidéo.',icon:'eye',sources:[
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Effectuer le montage d\'un son et/ou d\'une vidéo : Utiliser les fonctions de montage dont couper, copier, coller, effacer.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Produire et traiter des contenus multimédias : Produire un document sonore et/ou vidéo.'}]},
   {id:'identite-realites',mod:'identite-realites',titre:'Image de soi et réalités virtuelles',desc:'Réputation en ligne, avatar, pseudonyme, réalité virtuelle et augmentée.',icon:'user',sources:[
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Culture numérique : Chercher le taux de présence (e-réputation) d\'un auteur, d\'une célébrité, d\'un personnage public.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Culture numérique : Expliquer l\'importance du choix d\'un avatar et d\'un pseudonyme.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Culture numérique : Distinguer la réalité de la réalité virtuelle et de la réalité augmentée/mixte.'}]},
   {id:'programmation-1',mod:'programmation-1',titre:'Programmer : premiers pas',desc:'Logigrammes, algorithmes, boucles et conditions.',icon:'rocket',sources:[
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Programmation et logigrammes* : Représenter les symboles conventionnels d\'un logigramme* (début/fin, processus, liens indiquant le cheminement) : [figure : Début et fin, Processus, Décision]'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Programmation et logigrammes* : Associer une activité du quotidien à un algorithme* et vice-versa.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Lire un algorithme* simple : Verbaliser un extrait ou l\'entièreté d\'un logigramme* séquentiel de déplacement.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Écrire un algorithme* simple : Écrire un logigramme* séquentiel de déplacement.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Lire un programme* simple : Lire un programme* séquentiel de déplacement.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Écrire un programme* simple : Traduire un programme* séquentiel de déplacement, à l\'aide de blocs de codes* proposés.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Concevoir un algorithme* pour résoudre un problème simple : Concevoir un logigramme* séquentiel de déplacement.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Concevoir un programme* pour résoudre un problème simple : Traduire un logigramme* séquentiel de déplacement en langage de programmation, le tester et le déboguer.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Programmation et logigrammes* : Expliquer les termes dont algorithme*, logigramme*, condition, boucle, langage de programmation.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Programmation et logigrammes* : Différencier algorithme* et programme*.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Lire un algorithme* simple : Verbaliser un logigramme* intégrant une boucle et une condition.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Écrire un algorithme* simple : Écrire un logigramme intégrant une boucle et une condition.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Lire un programme* simple : Lire un programme* intégrant une boucle et une condition.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Écrire un programme* simple : Traduire un logigramme* intégrant une boucle et une condition en langage de programmation.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Identifier des éléments relatifs à la programmation et aux logigrammes* : Identifier une suite d\'opérations qui peut être remplacée par une boucle.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Concevoir un algorithme* pour résoudre un problème simple : Concevoir un logigramme* intégrant une boucle et une condition.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Concevoir un programme* pour résoudre un problème : Traduire un logigramme* intégrant une boucle et une condition, en langage de programmation, le tester et le déboguer.'}]},
   {id:'outils-creation',mod:'outils-creation',titre:'Choisir son outil de création',desc:'Sélectionner le bon outil et en utiliser les fonctions principales.',icon:'layout',sources:[
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Sélectionner un outil, une application*, un logiciel* : Sélectionner un outil, une application*, un logiciel*, parmi ceux proposés par l\'enseignant, en fonction de l\'intention.'},
     {reseaux:'tous',annees:['5e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser les fonctions principales d\'un outil de création de contenus : Utiliser les fonctions principales d\'un outil de création de contenus, parmi ceux proposés par l\'enseignant.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Sélectionner un outil, une application*, un logiciel* : Sélectionner un outil, une application*, un logiciel*, en fonction de l\'intention.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser les fonctions principales d\'un outil de création de contenus : Utiliser les fonctions principales d\'un outil de création de contenus.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser conjointement des applications*/des logiciels* disponibles dans un espace numérique : Utiliser conjointement plusieurs applications*/plusieurs logiciels* disponibles dans un espace numérique.'}]},
   {id:'presentation',mod:'presentation',titre:'Faire une présentation',desc:'Un support de présentation clair pour appuyer un discours.',icon:'layout',sources:[
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser les fonctions courantes d\'un outil de présentation : Utiliser des fonctionnalités courantes d\'un outil de présentation (ex. : l\'intégration d\'un son, d\'une image, d\'une vidéo).'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Appliquer des principes d\'élaboration d\'un message multimédia : Appliquer des principes d\'élaboration d\'un message multimédia pour appuyer un discours.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Produire et traiter des contenus multimédias : Produire un support numérique de présentation pour appuyer un discours.'}]},
   {id:'mot-de-passe',mod:'mot-de-passe',titre:'Créer un mot de passe solide',desc:'Lettres, chiffres et symboles : taper un mot de passe sûr et effacer ses traces.',icon:'lock',sources:[
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Vocabulaire spécifique à la protection des données : Utiliser, adéquatement en contexte, les termes dont sauvegarde, mise à jour, cookie*, hameçonnage*, spam, piratage, cyberattaque*, antivirus, mot de passe, authentification.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Créer un mot de passe respectant un niveau de sécurité élevé : Créer un mot de passe respectant un niveau de sécurité élevé.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Effacer ses traces personnelles sur un équipement partagé : Effacer ses fichiers personnels sur un équipement partagé.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Effacer toute trace de connexion sur un équipement partagé.'},
     {reseaux:['cath'],annees:['6e primaire'],dom:'Séquence SeGEC (La Salle des Profs)',cite:'Les mots de passe'}]},
   {id:'protection-donnees',mod:'protection-donnees',titre:'Protéger ses données',desc:'Sauvegarde, mises à jour, cookies, hameçonnage, sites sécurisés.',icon:'lock',sources:[
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Prévenir et limiter les risques relatifs à la protection des données : Adopter un comportement responsable relatif à la protection des données.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Distinguer HTTP et HTTPS.'}]},
   {id:'cyberharcelement',mod:'cyberharcelement',titre:'Réagir au cyberharcèlement',desc:'Reconnaître les situations à risque et savoir comment réagir.',icon:'user',sources:[
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Vocabulaire spécifique à la protection des personnes : Utiliser, adéquatement en contexte, les termes dont identité numérique*, cyberharcèlement*, cyberdépendance*.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Réagir face à des situations de cyberattaque*, de cyberharcèlement*, de cybermanipulation : Proposer des pistes d\'actions, parmi celles mises à disposition, pour faire face à des situations de cyberattaque*, de cyberharcèlement*, de cybermanipulation.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Réagir face à des situations de cyberattaque*, de cyberharcèlement*, de cybermanipulation : Reconnaitre des situations de cyberattaque*, de cyberharcèlement*, de cybermanipulation.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Prévenir et limiter les risques de déséquilibre social et psychologique de la personne (cyberattaque*, cyberharcèlement*, cyberdépendance*) : Adopter un comportement responsable face à une situation de cyberattaque*, cyberharcèlement*, cyberdépendance*.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Proposer et mettre en place des actions pertinentes pour faire face à des situations de cyberattaque*, de cyberharcèlement*, de cybermanipulation.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Réagir, de manière responsable, face aux risques de cyberattaque*, de cyberharcèlement*, de cyberdépendance*.'}]},
   {id:'etiquettes',mod:'etiquettes',titre:'Lire une étiquette alimentaire',desc:'Labels, allergènes et informations nutritionnelles.',icon:'eye',sources:[
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Alimentation',cite:'Lire un document technique* : Décoder les labels officiels de production (AB, AOC, AOP, IGP) figurant sur l\'étiquette d\'un emballage pour poser un choix favorisant les circuits courts de production et les produits du terroir local.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Alimentation',cite:'Lire un document technique* : Retrouver sur l\'étiquette d\'un emballage les informations relatives aux allergènes pour prévenir tout risque d\'intolérance et d\'allergie.'},
     {reseaux:'tous',annees:['6e primaire'],dom:'Référentiel FMTTN, Alimentation',cite:'Lire un document technique* : Expliquer les informations nutritionnelles d\'un aliment pour poser un choix assurant un équilibre alimentaire.'}]},
   {id:'ordinateur',mod:'ordinateur',titre:'Comprendre son ordinateur',desc:'Matériel, logiciels, mémoire, périphériques, extensions et formats de fichiers.',icon:'keyboard',sources:[
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Distinguer hardware* de software*, mémoire vive de mémoire morte, stockage interne de stockage externe.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Utiliser, adéquatement et en contexte, le terme périphérique.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Utiliser, adéquatement en contexte, les termes dont extension, favori (du navigateur Web).'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Associer différents types de fichiers à un logiciel*, à l\'aide d\'une recherche en ligne, si nécessaire.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Exporter un document sous un format adapté au logiciel* ou au système d\'exploitation* de destination.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Organiser des données numériques, afin de faciliter leur gestion dans un espace de stockage adapté à la situation.'}]},
   {id:'reseau',mod:'reseau',titre:'Comprendre Internet et le réseau',desc:'Connexion, routeur, adresse IP.',icon:'eye',sources:[
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Utiliser, adéquatement en contexte, les termes dont connexion, routeur, réseau, adresse IP.'}]},
   {id:'adresse-email',mod:'adresse-email',titre:'Créer une adresse email, Cc et Cci',desc:'Choisir son adresse, répondre, répondre à tous, transférer.',icon:'mail',sources:[
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Citer deux applications* de messagerie instantanée et une application* de gestion de courriel.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Utiliser, adéquatement en contexte, les termes dont email/courriel, expéditeur, destinataire, objet, pièce jointe, corps du message, boite de réception, boite d\'envoi, message lu, message non lu, brouillon, dossier, courrier indésirable, spam, messagerie instantanée (chat), émoticône.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Sélectionner un outil d\'interaction adéquat en fonction de l\'(des) interlocuteur(s).'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Créer une adresse email et utiliser les fonctionnalités Cc et Cci, répondre, répondre à tous, transférer.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Interagir/communiquer de manière orale et écrite, en sélectionnant et en utilisant des outils numériques adéquats.'},
     {reseaux:['cath'],annees:['1re secondaire'],dom:'Programme SeGEC, situations d’apprentissage',cite:'Création d’une adresse email'},
     {reseaux:['cath'],annees:['1re secondaire'],dom:'Programme SeGEC, situations d’apprentissage',cite:'Fonctionnalités d’un email'}]},
   {id:'messagerie',mod:'messagerie',titre:'Messagerie instantanée et réseaux sociaux',desc:'Écrire des messages courts, dans des groupes, et comprendre chaque réseau.',icon:'mail',sources:[
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Expliciter des spécificités de différents réseaux socionumériques.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Utiliser les fonctionnalités de la messagerie instantanée dont les conversations de groupe.'}]},
   {id:'netiquette',mod:'netiquette',titre:'Écrire poliment en ligne',desc:'Les règles de politesse des messages, des chats et des documents partagés.',icon:'mail',sources:[
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Respecter, dans un environnement numérique d\'interaction et de communication, une nétiquette* définie.'}]},
   {id:'vie-privee',mod:'vie-privee',titre:'Protéger sa vie privée en ligne',desc:'Droit à la vie privée, confidentialité, profil, signalétique PEGI.',icon:'lock',sources:[
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Utiliser, adéquatement en contexte, les notions et les termes dont droit à la vie privée, droit à l\'oubli, droit de retrait, liberté d\'expression/de censure/de modération, licence open source*.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Respecter les droits de propriété dans des situations de communication.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'Préserver la confidentialité ou l\'anonymat, lors de partage de contenus.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Utiliser, adéquatement en contexte, les termes dont profil, protection de la vie privée.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Décoder une signalétique (PEGI…).'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Repérer les informations relatives à la vie privée, lors de l\'encodage de données personnelles.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Paramétrer les options de confidentialité d\'un compte.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Sécurité',cite:'Gérer son identité numérique*, ses traces, ses données personnelles, de manière responsable.'}]},
   {id:'word',mod:'word',titre:'Mise en page d’un document',desc:'Marges, puces, sauts de page, numéros, notes de bas de page, tableaux, caractères spéciaux.',icon:'layout',sources:[
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser, adéquatement en contexte, les termes dont marge, entête et pied de page, listes à puces, note de bas de page.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Identifier les commandes dont saut de page, modification des marges, numéro de page, entête et pied de page, puces, alignement, note de bas de page.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Sélectionner un outil, une application*, un logiciel* adéquat, en fonction de l\'intention.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser les fonctions principales d\'un outil de création de contenus.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser des puces, des numéros et des alignements.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Insérer un saut de page.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Modifier les marges.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Numéroter les pages.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Insérer une page de garde.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Insérer une note en bas de page, des caractères spéciaux, un entête et un pied de page, un lien hypertexte*.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Insérer et mettre en forme un tableau, une forme.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Éditer et enrichir un contenu.'},
     {reseaux:['libre'],annees:['1re secondaire'],dom:'Programme FELSI, pistes méthodologiques',cite:'Ils dépassent l’édition de texte simple/brut (FMTTN 7.51) pour faire du traitement de texte un outil de création et de mise en forme professionnelle (FMTTN 7.64).'},
     {reseaux:['libre'],annees:['1re secondaire'],dom:'Programme FELSI, pistes méthodologiques',cite:'Lors d’un courrier pour l’école, d’une mise en page de recherches ou d’une actualité, les élèves apprennent à structurer l’information pour la rendre lisible et hiérarchisée, en vue d’une production finale (ex: article, journal, guide, rapport, emploi du temps…).'}]},
   {id:'programmation-2',mod:'programmation-2',titre:'Programmer : variables et conditions',desc:'Variables, logigrammes, opérateurs logiques et langage de programmation.',icon:'rocket',sources:[
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Expliquer le concept de variable.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Verbaliser un logigramme* intégrant une condition, une boucle et une variable.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Écrire un logigramme* intégrant une condition, une boucle et une variable.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Lire un programme* intégrant une condition, une boucle et une variable.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Traduire un logigramme* intégrant une condition, une boucle et une variable en langage de programmation.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Concevoir un logigramme* intégrant une condition, une boucle et une variable.'},
     {reseaux:'tous',annees:['1re secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Traduire un logigramme* intégrant une boucle, une condition et une variable, en langage de programmation ; le tester, le déboguer et l\'optimiser.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Expliquer l\'effet des opérateurs logiques.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Verbaliser un logigramme* intégrant une condition, une boucle, un opérateur logique et une variable.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Écrire un logigramme* intégrant une condition, une boucle, un opérateur logique et une variable.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Lire un programme* intégrant une boucle, une condition, un opérateur logique et une variable.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Traduire un logigramme* intégrant une condition, une boucle, un opérateur logique et une variable en langage de programmation.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Concevoir un logigramme* intégrant une boucle, une condition, un opérateur logique et une variable.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Traduire un logigramme* intégrant une boucle, une condition, un opérateur logique et une variable en langage de programmation, le tester, le déboguer et l\'optimiser.'}]},
   {id:'recherche-avancee',mod:'recherche-avancee',titre:'Les recherches avancées',desc:'Opérateurs, options avancées et combinaisons de mots-clés.',icon:'keyboard',sources:[
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Utiliser, adéquatement en contexte, les services et fonctions avancées courants de moteurs de recherche.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Connaitre les opérateurs de recherche dont *, +, -, « », et, ou.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Déterminer un ou plusieurs mot(s)-clé(s), une combinaison de mots pour effectuer une recherche.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Utiliser un outil de recherche*, en utilisant des options avancées et des opérateurs.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Rechercher un contenu, en autonomie*, au moyen d\'un moteur de recherche pertinent, en utilisant des opérateurs et/ou des options avancées, en justifiant sa stratégie.'}]},
   {id:'fiabilite',mod:'fiabilite',titre:'Vérifier une source',desc:'Repérer l’auteur, la date, l’URL et évaluer la fiabilité avec une grille.',icon:'eye',sources:[
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Identifier l\'intention de chaque élément figurant sur une page Web.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Identifier des éléments nécessaires au questionnement de la fiabilité d\'une source (URL, date de publication et/ou de mise à jour, auteur, diffuseur…).'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Informations et données',cite:'Évaluer la fiabilité contextuelle d\'une source, à l\'aide d\'une grille critériée.'}]},
   {id:'raccourcis',mod:'raccourcis',titre:'Les raccourcis clavier',desc:'Les raccourcis usuels avec Ctrl (ou Cmd) pour écrire plus vite.',icon:'cmd',sources:[
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser, adéquatement en contexte, les raccourcis clavier usuels.'}]},
   {id:'tableur-formules',mod:'tableur-formules',titre:'Tableur : formules et graphiques',desc:'Lignes, colonnes, tri, formules, somme, moyenne et graphique.',icon:'table',sources:[
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser, adéquatement en contexte, les termes dont ligne, colonne, cellule, feuille de calcul, classeur, fusion, fonction, formule.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Identifier les éléments et les commandes dont fusionner, supprimer/insérer des lignes/des colonnes, format de cellule, filtrer, trier, fonction somme, moyenne.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Encoder, modifier des données, dupliquer par la série, utiliser l\'incrémentation.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Paramétrer la hauteur des lignes, la largeur des colonnes.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Fusionner des cellules.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Insérer/supprimer des lignes/colonnes.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Mettre en forme le contenu d\'une cellule ou un groupe de cellules (format, couleur, police, bordure, alignement du texte).'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Trier, filtrer des données.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Appliquer des formules, en utilisant les opérateurs de base (+ - */), le signe =.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Utiliser les fonctions automatiques « somme » et « moyenne ».'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Créer et mettre en forme un graphique.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Produire et traiter des données au moyen d\'un tableur.'}]},
   {id:'codage',mod:'codage',titre:'Coder en binaire',desc:'Comprendre le binaire et coder un nombre ou une phrase.',icon:'rocket',sources:[
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Culture numérique) Expliquer que tout outil numérique est basé sur le principe du codage binaire.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Coder un nombre (< 256) en binaire.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'Coder une phrase courte (4-5 mots), en respectant un jeu de caractères codés (type code ASCII), en lien avec le code binaire.'}]},
   {id:'culture-numerique-2',mod:'culture-numerique-2',titre:'Culture numérique : histoire, écologie, accessibilité',desc:'Histoire d’Internet, obsolescence programmée, impact écologique, accessibilité, fausses informations.',icon:'cap',sources:[
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Culture numérique) Présenter un bref historique de l\'évolution du numérique et de l\'Internet*.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Culture numérique) Expliquer le concept d\'obsolescence programmée.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Culture numérique) Classer certains usages du numérique selon leur impact écologique.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Culture numérique) Expliquer le concept et les enjeux de l\'accessibilité numérique.'},
     {reseaux:'tous',annees:['2e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Culture numérique) Expliquer ce que sont les « Fake News », leurs enjeux et énoncer des moyens permettant de les repérer.'}]},
   {id:'partager',mod:'partager',titre:'Partager un contenu en ligne',desc:'Choisir l’outil et l’espace de stockage, régler qui peut voir et téléverser.',icon:'mail',sources:[
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Outils de production, de collaboration, de partage et d\'interaction de médias numériques) Citer un outil de partage en fonction de l\'usage déterminé.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Sélectionner un outil de partage...) Sélectionner un outil de partage en fonction de l\'(des) interlocuteur(s).'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Paramétrer l\'outil de partage) Paramétrer les conditions d\'accessibilité du contenu partagé.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Téléverser* un contenu numérique en ligne) Téléverser* un contenu dans un environnement numérique.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Déterminer un espace de stockage partagé approprié au contenu) Déterminer un espace de stockage partagé approprié au contenu.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Déterminer un espace de stockage partagé approprié au format) Déterminer un espace de stockage partagé approprié au format.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Partager un contenu numérique) Partager un contenu numérique.'}]},
   {id:'collaborer',mod:'collaborer',titre:'Collaborer sur un document',desc:'Outils collaboratifs, commentaires, historique des versions, droits et nétiquette.',icon:'pen',sources:[
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(idem) Citer un outil de collaboration en fonction de l\'usage déterminé.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Vocabulaire invariant spécifique à la production, la collaboration, le partage et l\'interaction de médias numériques) Utiliser, adéquatement en contexte, les termes dont réseau socionumérique, forum, blog, site, droit d\'accès, propriétaire, accessibilité, historique, synchrone*, asynchrone*, en ligne, hors ligne, administrateur, exporter, environnement numérique de travail.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Sélectionner un outil de collaboration adéquat...) Sélectionner un outil de collaboration adéquat en fonction de l\'(des) interlocuteur(s).'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Utiliser les fonctions principales d\'un outil de collaboration) Paramétrer les conditions d\'accessibilité de l\'espace collaboratif dont repérer le propriétaire/administrateur, qui est en ligne, qui est autorisé à modifier, utiliser les fonctions commentaire et suivi de modifications.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Participer dans un espace collaboratif numérique) Repérer, accepter et/ou refuser les interventions des collaborateurs.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Utiliser l\'historique de révisions) Revenir à une version antérieure du travail.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Respecter les droits de propriété) Respecter les droits de propriété, dans des situations de communication et de collaboration.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Respecter les droits à l\'image et à la voix) Respecter le droit à l\'image et à la voix, dans des situations de communication et de collaboration.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Respecter la nétiquette* du média) Respecter, dans un environnement numérique de partage et de collaboration, une nétiquette* définie.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Communication et collaboration',cite:'(Collaborer sur un contenu numérique) Collaborer sur un contenu numérique.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Utiliser conjointement des applications*/des logiciels* disponibles dans un espace numérique) Utiliser conjointement des applications*/des logiciels* disponibles dans un espace collaboratif numérique en ligne.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Produire et traiter des contenus multimédias) Produire et traiter des contenus multimédias de manière collaborative.'}]},
   {id:'culture-numerique-3',mod:'culture-numerique-3',titre:'Culture numérique : plateformes, réseau, IA',desc:'Plateforme, serveur, Web et Internet, objets connectés, intelligence artificielle, algorithmes.',icon:'cap',sources:[
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Vocabulaire spécifique au software*) Utiliser, adéquatement en contexte, le terme plateforme.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Vocabulaire spécifique à la taille et au format de fichiers) Définir le rapport de grandeur (≈ x 1 000) entre les différents préfixes (Ko, Mo, Go, To) de l\'octet et les ordonner.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Vocabulaire spécifique au réseau) Utiliser, adéquatement en contexte, le vocabulaire dont serveur, Web.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Vocabulaire spécifique au réseau) Différencier Web et Internet*.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Culture numérique) Citer des domaines d\'activités numériques de géants de l\'industrie numérique.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Culture numérique) Expliquer les concepts de veille* technologique et de veille* par la technologie numérique.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Culture numérique) Expliquer l\'intérêt et les enjeux de l\'Internet* des objets connectés (Internet of Things [IoT]) et des Big Data.'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Culture numérique) Exemplifier des usages de l\'intelligence artificielle* (IA).'},
     {reseaux:'tous',annees:['3e secondaire'],dom:'Référentiel FMTTN, Création de contenus',cite:'(Porter un regard critique sur les raisons d\'être et les conséquences induites par un algorithme*) Interroger/analyser le potentiel d\'un algorithme* (ex. : en matière d\'intelligence artificielle* [IA] et d\'objets connectés [IoT]).'}]},
   {id:'info-fiable',mod:'info-fiable',titre:'Chercher et vérifier l’information',desc:'Chercher, filtrer, évaluer et ranger l’information.',icon:'eye',sources:[
     {reseaux:'tous',annees:['4e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Naviguer, rechercher et filtrer l’information. (DigComp 1.1)'},
     {reseaux:'tous',annees:['4e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Évaluer l’information. (DigComp 1.2)'},
     {reseaux:'tous',annees:['4e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Gérer l’information. (DigComp 1.3)'}]},
   {id:'comportement',mod:'comportement',titre:'Bien se comporter en ligne',desc:'Interagir en ligne, adopter les bons comportements, respecter les droits d’auteur.',icon:'mail',sources:[
     {reseaux:'tous',annees:['4e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Interagir avec et par les technologies numériques. (DigComp 2.1)'},
     {reseaux:'tous',annees:['4e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Adopter les bons comportements en ligne. (DigComp 2.5)'},
     {reseaux:'tous',annees:['4e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Droits d’auteur et licences. (DigComp 3.3)'}]},
   {id:'proteger',mod:'proteger',titre:'Protéger ses appareils et ses données',desc:'Protéger ses appareils, ses données et résoudre un souci technique.',icon:'lock',sources:[
     {reseaux:'tous',annees:['4e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Protéger les appareils. (DigComp 4.1)'},
     {reseaux:'tous',annees:['4e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Protéger ses données personnelles et sa vie privée. (DigComp 4.2)'},
     {reseaux:'tous',annees:['4e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Identifier et résoudre des problèmes techniques. (DigComp 5.1)'}]},
   {id:'travailler-ligne',mod:'travailler-ligne',titre:'Travailler à plusieurs en ligne',desc:'Partager, collaborer et réélaborer des contenus.',icon:'pen',sources:[
     {reseaux:'tous',annees:['5e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Partager grâce aux technologies numériques. (DigComp 2.2)'},
     {reseaux:'tous',annees:['5e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Collaborer grâce aux technologies numériques. (DigComp 2.4)'},
     {reseaux:'tous',annees:['5e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Intégrer et réélaborer des contenus numériques. (DigComp 3.2)'}]},
   {id:'identite-bienetre',mod:'identite-bienetre',titre:'Identité numérique et bien-être',desc:'Gérer son identité en ligne et préserver son bien-être.',icon:'user',sources:[
     {reseaux:'tous',annees:['5e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Gérer son identité numérique. (DigComp 2.6)'},
     {reseaux:'tous',annees:['5e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Soutenir son bien-être. (DigComp 4.3)'}]},
   {id:'programmer-besoins',mod:'programmer-besoins',titre:'Programmer pour répondre à un besoin',desc:'Pensée computationnelle, besoins et réponses technologiques, création de contenus.',icon:'rocket',sources:[
     {reseaux:'tous',annees:['5e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Développer des contenus numériques. (DigComp 3.1)'},
     {reseaux:'tous',annees:['5e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Pensée computationnelle et programmation. (DigComp 3.4)'},
     {reseaux:'tous',annees:['5e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Identifier ses besoins et les réponses technologiques. (DigComp 5.2)'}]},
   {id:'citoyen',mod:'citoyen',titre:'Citoyen en ligne et environnement',desc:'Exercer sa citoyenneté en ligne et réduire son impact écologique.',icon:'cap',sources:[
     {reseaux:'tous',annees:['6e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Exercer sa citoyenneté grâce aux technologies numériques. (DigComp 2.3)'},
     {reseaux:'tous',annees:['6e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Protéger l’environnement. (DigComp 4.4)'}]},
   {id:'solutions',mod:'solutions',titre:'Trouver ses solutions et progresser',desc:'Solutions créatives avec le numérique, repérer ce qu’il reste à apprendre.',icon:'rocket',sources:[
     {reseaux:'tous',annees:['6e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Trouver des solutions créatives avec le numérique. (DigComp 5.3)'},
     {reseaux:'tous',annees:['6e secondaire'],dom:'Cadre européen DigComp',eu:true,cite:'Identifier et combler ses besoins en compétences numériques. (DigComp 5.4)'}]},
   {id:'cv',mod:'cv',titre:'Rédiger un CV',desc:'Rubriques, mise en page, mots qui comptent.',icon:'cv',sources:[
     {reseaux:'tous',annees:['5e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['6e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'}]},
   {id:'lettre',mod:'lettre',titre:'Lettre de motivation',desc:'Structurer la lettre et trouver le bon ton.',icon:'letter',sources:[
     {reseaux:'tous',annees:['5e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['6e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'}]},
   {id:'mail-pro',mod:'mail-pro',titre:'Écrire un mail professionnel',desc:'Ton adapté au destinataire, réponse à une commande ou une réclamation.',icon:'mail',sources:[
     {reseaux:'tous',annees:['5e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['5e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['6e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['6e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'}]},
   {id:'formulaire',mod:'formulaire',titre:'Remplir un formulaire',desc:'Tabulation, champs obligatoires, adresses, sans erreur.',icon:'form',sources:[
     {reseaux:'tous',annees:['4e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['5e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'}]},
   {id:'notes',mod:'notes',titre:'Prendre des notes',desc:'Écouter, résumer, abréger : des notes rapides et utiles.',icon:'notes',sources:[
     {reseaux:'tous',annees:['4e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['5e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'}]},
   {id:'rapport',mod:'rapport',titre:'Rédiger un rapport ou une synthèse',desc:'Titres, styles, table des matières, sources et bibliographie.',icon:'pen',sources:[
     {reseaux:'tous',annees:['5e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['5e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['6e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['6e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'}]},
   {id:'raccourcis-avances',mod:'raccourcis-avances',titre:'Raccourcis avancés',desc:'Traitement de texte et tableur : aller beaucoup plus vite.',icon:'cmd',sources:[
     {reseaux:'tous',annees:['4e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'}]},
   {id:'pave',mod:'pave',titre:'Le pavé numérique',desc:'Taper les chiffres vite et sans regarder : montants, dates, numéros.',icon:'numpad',sources:[
     {reseaux:'tous',annees:['4e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['5e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'}]},
   {id:'relire',mod:'relire',titre:'Relire et corriger un texte',desc:'Orthographe et ponctuation d’un texte professionnel.',icon:'spell',sources:[
     {reseaux:'tous',annees:['5e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['6e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'}]},
   {id:'vitesse',mod:'vitesse',titre:'Vitesse et précision',desc:'Garder la précision en augmentant sa vitesse de frappe.',icon:'keyboard',sources:[
     {reseaux:'tous',annees:['4e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'},
     {reseaux:'tous',annees:['5e secondaire'],dom:'Choix KeyPace',kp:'Proposition de KeyPace pour cette année, sans programme officiel.'}]}
  ];

  /* ═══════════════════════════ BELGIQUE : jeu de données (inchangé) ═══════════════════════════ */
  const BE = { nets: NETS, years: YEARS, commun: PROGRAMME_COMMUN, reseau: PROGRAMME_RESEAU, check: NET_CHECK, pendingUser: PENDING_USER, pendingSup: PENDING_SUP, items: PROG_ITEMS };

  /* ═══════════════════════════ FRANCE : dérivée de la Belgique ═══════════════════════════
     En France, les programmes sont nationaux et identiques pour le public et le privé sous contrat : il n'y a pas de « réseaux » à distinguer, mais des
     voies (publique, privée sous contrat, agricole, établissement français à l'étranger). Le séquençage reste celui de la Belgique, année par année (même âge) :
     chaque année française porte la clé `be` de son année belge équivalente, et ses leçons et ses modules sont lus dans les données belges.
     Les textes (calendrier, jalons officiels, citations) viennent du document « KeyPace France, référentiels officiels, parcours numérique et roadmap »
     (4 novembre 2026). Les citations sont des recopies de ce document : à revérifier mot pour mot dans le BO avant de les afficher publiquement. */
  const NETS_FR = [
    { id: 'public', c: '#FF4D2E', t: 'Public', grp: 'Éducation nationale' },
    { id: 'prive', c: '#4F6BE0', t: 'Privé sous contrat', grp: 'Éducation nationale' },
    { id: 'agri', c: '#3FA84E', t: 'Enseignement agricole', grp: "Ministère de l'Agriculture" },
    { id: 'etranger', c: '#9B57D6', t: "Établissement français à l'étranger", grp: 'AEFE et MLF' },
  ];
  const LGT = 'Lycée général et technologique', LP = 'Lycée professionnel';
  // disp : ce qu'affiche le gros chiffre de l'en-tête (remplace y.n + y.suf)
  const YEARS_FR = [
    { l: 'CE2', disp: 'CE2', g: 'École', c: '#FF8A3C', be: '3e primaire' },
    { l: 'CM1', disp: 'CM1', g: 'École', c: '#FF8A3C', be: '4e primaire' },
    { l: 'CM2', disp: 'CM2', g: 'École', c: '#FF8A3C', be: '5e primaire' },
    { l: '6e', disp: '6e', g: 'Collège', c: '#4F6BE0', be: '6e primaire' },
    { l: '5e', disp: '5e', g: 'Collège', c: '#4F6BE0', be: '1re secondaire' },
    { l: '4e', disp: '4e', g: 'Collège', c: '#4F6BE0', be: '2e secondaire' },
    { l: '3e', disp: '3e', g: 'Collège', c: '#4F6BE0', be: '3e secondaire' },
    { l: '2de', disp: '2de', g: LGT, c: '#9B57D6', be: '4e secondaire' },
    { l: '1re', disp: '1re', g: LGT, c: '#9B57D6', be: '5e secondaire' },
    { l: 'Terminale', disp: 'Tle', g: LGT, c: '#9B57D6', be: '6e secondaire' },
    { l: '2de pro', disp: '2de', g: LP, c: '#3FA84E', be: '4e secondaire' },
    { l: '1re pro', disp: '1re', g: LP, c: '#3FA84E', be: '5e secondaire' },
    { l: 'Tle pro', disp: 'Tle', g: LP, c: '#3FA84E', be: '6e secondaire' },
    { l: 'CAP 1re année', disp: 'CAP 1', g: LP, c: '#3FA84E', be: '4e secondaire' },
    { l: 'CAP 2e année', disp: 'CAP 2', g: LP, c: '#3FA84E', be: '5e secondaire' },
  ];
  // Une seule raison affichée change : en France, les chiffres servent à saisir des données dans un tableur. Les autres raisons belges valent en France.
  const WHY_FR = { '46-51': 'Les chiffres, pour saisir des données dans un tableur.' };
  const NOTE_SERVICE = 'Note de service du 23 janvier 2026 (BO n° 6 du 5 février 2026) : jalons du parcours numérique de la scolarité.';
  const CAL_C2 = 'Programme de sciences et technologie du cycle 2 (BO n° 24 du 11 juin 2026), appliqué au CE2 à la rentrée 2027.';
  const CAL_C3 = 'Programme de français du cycle 3 (BO n° 16 du 17 avril 2025) : CM1 et 6e en 2025, CM2 en 2026.';
  const CAL_C4 = 'Programme de français du cycle 4 (BO n° 10 du 5 mars 2026) : 5e en 2026, 4e en 2027, 3e en 2028.';
  const CAL_FR = {
    'CE2': CAL_C2 + ' ' + NOTE_SERVICE, 'CM1': CAL_C3 + ' ' + NOTE_SERVICE, 'CM2': CAL_C3 + ' ' + NOTE_SERVICE, '6e': CAL_C3 + ' ' + NOTE_SERVICE,
    '5e': CAL_C4 + ' ' + NOTE_SERVICE, '4e': CAL_C4 + ' ' + NOTE_SERVICE, '3e': CAL_C4 + ' ' + NOTE_SERVICE,
  };
  YEARS_FR.forEach((y) => { if (!CAL_FR[y.l]) CAL_FR[y.l] = NOTE_SERVICE; });
  // Jalon officiel de l'année (colonne « Jalon français de l'année » du séquençage), affiché sous le titre de l'année.
  const J2DE = 'Stage obligatoire de 2de GT ; Pix IA en 2de et en CAP 1';
  const J1RE = "Certification Pix l'année du CAP";
  const JTLE = 'Certification Pix (niveau 4), transmise à Parcoursup';
  const JALON_FR = {
    'CE2': 'Sciences et technologie CE2 : saisir un texte au traitement de texte (rentrée 2027)',
    'CM1': 'Français cycle 3 : écrits sur supports numériques ; progression CRCN du cycle',
    'CM2': 'Niveau CRCN inscrit au livret scolaire de CM2',
    '6e': 'Attestation Pix 6e : parcours « Protection et sécurité » et cyberharcèlement',
    '5e': 'Pix en autonomie à partir de la 5e',
    '4e': 'Parcours Pix IA obligatoires',
    '3e': 'Certification Pix (niveau 3)',
    '2de': J2DE, '2de pro': J2DE, 'CAP 1re année': J2DE,
    '1re': J1RE, '1re pro': J1RE, 'CAP 2e année': J1RE,
    'Terminale': JTLE, 'Tle pro': JTLE,
  };
  // Phrase d'introduction de l'année, tirée du jalon officiel (affichée à tous, sans guillemets : ce n'est pas une citation).
  const INTRO_FR = {
    'CE2': 'En sciences et technologie, l’élève apprend à saisir un texte avec un logiciel de traitement de texte. Ce programme s’applique au CE2 à la rentrée 2027.',
    'CM1': 'Au cycle 3, les élèves produisent des écrits sur différents supports, notamment numériques.',
    'CM2': 'Le niveau de maîtrise des compétences numériques est inscrit au livret scolaire en CM2.',
    '6e': 'En 6e, le niveau de maîtrise est inscrit au livret scolaire et une attestation de sensibilisation Pix est obligatoire (sécurité, cyberharcèlement, initiation).',
    '5e': 'À partir de la 5e, les élèves travaillent en autonomie sur Pix.',
    '4e': 'En 4e, les parcours Pix consacrés à l’intelligence artificielle sont obligatoires.',
    '3e': 'En 3e, la certification Pix est obligatoire : le niveau 3 est attendu.',
    '2de': 'En 2de générale et technologique, le stage d’observation en milieu professionnel est obligatoire, et les parcours Pix IA aussi.',
    '2de pro': 'En 2de professionnelle, les parcours Pix consacrés à l’intelligence artificielle sont obligatoires.',
    'CAP 1re année': 'En 1re année de CAP, les parcours Pix consacrés à l’intelligence artificielle sont obligatoires.',
    'Terminale': 'En terminale, la certification Pix est obligatoire : le niveau 4 est attendu et son résultat est transmis à Parcoursup.',
    'Tle pro': 'En terminale professionnelle, la certification Pix est obligatoire : le niveau 4 est attendu et son résultat est transmis à Parcoursup.',
  };
  const PENDING_USER_FR = 'Au lycée, le numérique officiel passe par l’enseignement SNT en 2de et par la certification Pix en terminale. Il n’existe pas de programme de dactylographie : voici les modules que KeyPace te conseille cette année.';
  const PENDING_SUP_FR = PENDING_USER_FR;
  // Ce que disent les textes officiels français sur une autre année que celle du module : encadré « Ce que dit le programme français cette année ». Rien ne se déplace.
  const FR_ANCHORS = {
    'CE2': [
      { src: 'Sciences et technologie, cycle 2, BO n° 24 du 11 juin 2026', q: '« Utiliser un ordinateur ou une tablette numérique pour saisir un texte. » « L’élève saisit un texte à l’aide d’un logiciel de traitement de texte. » « L’élève utilise le correcteur orthographique et adapte la mise en forme et la mise en page. »' },
      { src: 'Sciences et technologie, cycle 2, BO n° 24 du 11 juin 2026', q: '« Identifier les dispositifs permettant la saisie, le traitement et la restitution d’informations (clavier, processeur, écran, etc.). »' },
    ],
    'CM1': [{ src: 'Français, cycle 3, BO n° 16 du 17 avril 2025', q: '« produire des écrits sur différents supports (notamment numériques, ou propices aux écritures créatives) »' }],
    'CM2': [{ src: 'Note de service du 23 janvier 2026', q: '« les niveaux de maîtrise des compétences numériques, atteints par les élèves en classe de cours moyen deuxième année (CM2) et en classe de sixième, sont obligatoirement inscrits dans le dernier bilan périodique du livret de la scolarité obligatoire »' }],
    '6e': [
      { src: 'Note de service du 23 janvier 2026', q: '« les niveaux de maîtrise des compétences numériques, atteints par les élèves en classe de cours moyen deuxième année (CM2) et en classe de sixième, sont obligatoirement inscrits dans le dernier bilan périodique du livret de la scolarité obligatoire »' },
      { src: 'Note de service du 23 janvier 2026', q: '« un parcours consacré au domaine 4 du CRCN Protection et sécurité avec des questions spécifiques sur le cyberharcèlement afin de sensibiliser les élèves aux bons réflexes et aux bonnes pratiques numériques à adopter »' },
    ],
    '4e': [
      { src: 'Français, cycle 4, BO n° 10 du 5 mars 2026', q: '« Ponctuellement, à partir de la classe de 4e, une utilisation critique et distanciée d’outils numériques et de l’intelligence artificielle permet à l’élève d’interroger la production contemporaine des textes »' },
      { src: 'Note de service du 23 janvier 2026', q: '« la passation des parcours apprenants Pix dédiés à l’IA est rendue obligatoire à compter de l’année scolaire 2025-2026 pour l’ensemble des élèves de 4e, de 2de et de 1re année de CAP »' },
    ],
    '3e': [{ src: 'Note de service du 23 janvier 2026', q: '« Le niveau global attendu des élèves en 3e est un niveau 3 (Indépendant 1), en terminale un niveau 4 (Indépendant 2). »' }],
    '2de': [
      { src: 'Note de service du 23 janvier 2026', q: '« la passation des parcours apprenants Pix dédiés à l’IA est rendue obligatoire à compter de l’année scolaire 2025-2026 pour l’ensemble des élèves de 4e, de 2de et de 1re année de CAP »' },
      { src: 'Stage de seconde, BO n° 6 du 5 février 2026', q: '« La séquence d’observation en milieu professionnel est obligatoire pour tous les élèves des seconde générale et technologique »' },
    ],
    'Terminale': [{ src: 'Note de service du 23 janvier 2026', q: '« Le niveau global attendu des élèves en 3e est un niveau 3 (Indépendant 1), en terminale un niveau 4 (Indépendant 2). »' }],
  };
  FR_ANCHORS['2de pro'] = [FR_ANCHORS['2de'][0]];
  FR_ANCHORS['CAP 1re année'] = [FR_ANCHORS['2de'][0]];
  FR_ANCHORS['Tle pro'] = FR_ANCHORS['Terminale'];
  // Sources françaises propres à un point de programme (clé : id du point). À défaut : « Choix KeyPace, aligné sur le parcours belge ».
  const FR_SOURCES = {
    'saisir-texte': [{ annees: ['CM1'], dom: 'Français, cycle 3, BO n° 16 du 17 avril 2025', cite: 'produire des écrits sur différents supports (notamment numériques, ou propices aux écritures créatives)' }],
    'mot-de-passe': [{ annees: ['6e'], dom: 'Note de service du 23 janvier 2026', cite: 'un parcours consacré au domaine 4 du CRCN Protection et sécurité avec des questions spécifiques sur le cyberharcèlement afin de sensibiliser les élèves aux bons réflexes et aux bonnes pratiques numériques à adopter' }],
    'protection-donnees': [{ annees: ['6e'], dom: 'Note de service du 23 janvier 2026', cite: 'un parcours consacré au domaine 4 du CRCN Protection et sécurité avec des questions spécifiques sur le cyberharcèlement afin de sensibiliser les élèves aux bons réflexes et aux bonnes pratiques numériques à adopter' }],
    'cyberharcelement': [{ annees: ['6e'], dom: 'Note de service du 23 janvier 2026', cite: 'un parcours consacré au domaine 4 du CRCN Protection et sécurité avec des questions spécifiques sur le cyberharcèlement afin de sensibiliser les élèves aux bons réflexes et aux bonnes pratiques numériques à adopter' }],
  };
  // Vérification par voie : programmes nationaux, la note de service vise « publics ou privés sous contrat ». Établissements à l'étranger : programmes nationaux, Pix obligatoire seulement dans les niveaux homologués. Agricole : référentiels du ministère de l'Agriculture non lus.
  const allYears = (txt) => Object.fromEntries(YEARS_FR.map((y) => [y.l, txt]));
  const NET_CHECK_FR = {
    public: { nom: 'Public', ok: allYears('Programmes nationaux : la note de service du 23 janvier 2026 vise les établissements publics ou privés sous contrat.') },
    prive: { nom: 'Privé sous contrat', ok: allYears('Programmes nationaux identiques à ceux du public : la note de service du 23 janvier 2026 vise les établissements publics ou privés sous contrat.') },
    etranger: { nom: "Établissement français à l'étranger", ok: {}, part: allYears('Programmes nationaux ; la certification Pix est obligatoire seulement dans les niveaux homologués.') },
    agri: { nom: 'Enseignement agricole', ok: {}, ko: allYears("Référentiels du ministère de l'Agriculture non lus : le parcours commun s'applique à titre indicatif.") },
  };
  // Un point de programme n'est ouvert à une année française que s'il l'est, pour l'année belge équivalente, dans le référentiel commun.
  const PROGRAMME_COMMUN_FR = Object.fromEntries(YEARS_FR.map((y) => {
    const be = PROGRAMME_COMMUN[y.be] || {};
    const out = {
      lecons: (be.lecons || []).map((x) => ({ ...x, why: WHY_FR[x.r.join('-')] || x.why })),
      cal: CAL_FR[y.l], intro: INTRO_FR[y.l], jalon: JALON_FR[y.l],
    };
    if (be.note) out.note = be.note;
    if (be.kp) out.kp = be.kp;
    return [y.l, out];
  }));
  const FR = { nets: NETS_FR, years: YEARS_FR, commun: PROGRAMME_COMMUN_FR, reseau: {}, check: NET_CHECK_FR, pendingUser: PENDING_USER_FR, pendingSup: PENDING_SUP_FR, items: PROG_ITEMS, anchors: FR_ANCHORS, srcFr: FR_SOURCES };
  const COUNTRY = { be: BE, fr: FR };
  const COUNTRIES = { be: { label: 'Belgique', kb: 'be', path: '/' }, fr: { label: 'France', kb: 'fr', path: '/fr' } };

  /* ═══════════════════════════ Fonctions pures ═══════════════════════════ */
  // Les sources d'un point de programme qui s'appliquent à (réseau, année). Belgique : filtre d'origine. France : le point est retenu s'il est dans le
  // référentiel commun ('tous') pour l'année belge équivalente ; on affiche alors les sources françaises du point, ou l'étiquette « Choix KeyPace ».
  function sourcesFor(country, it, net, y) {
    if (country !== 'fr') return it.sources.filter((s) => (s.reseaux === 'tous' || s.reseaux.includes(net)) && s.annees.includes(y.l));
    const common = it.sources.filter((s) => s.reseaux === 'tous' && s.annees.includes(y.be));
    if (!common.length) return [];
    const own = ((FR_SOURCES[it.id]) || []).filter((s) => s.annees.includes(y.l)).map((s) => ({ reseaux: 'tous', annees: [y.l], dom: s.dom, cite: s.cite, pays: 'fr' }));
    return own.length ? own : [{ reseaux: 'tous', annees: [y.l], dom: 'Choix KeyPace', kp: 'Choix KeyPace, aligné sur le parcours belge.', pays: 'fr' }];
  }
  // Identifiants des modules associés à une année (même ordre que la page : par point de programme).
  function modulesFor(country, net, y) {
    const d = COUNTRY[country] || BE; const ids = [];
    d.items.forEach((it) => { if (sourcesFor(country, it, net, y).length && !ids.includes(it.mod)) ids.push(it.mod); });
    return ids;
  }
  // Rang d'une année dans la suite belge (la France se range sur son année belge équivalente).
  function ordOf(country, y) { return BE.years.findIndex((b) => b.l === (country === 'fr' ? y.be : y.l)); }
  // Années dont les leçons comptent comme « déjà au programme » : celles dont l'année belge équivalente est strictement antérieure.
  function priorYears(country, y) { const d = COUNTRY[country] || BE; const o = ordOf(country, y); return d.years.filter((yy) => ordOf(country, yy) < o); }

  function store(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  // Pays courant : l'adresse /fr décide d'abord, puis le choix mémorisé (kp_country), sinon la Belgique. La langue du navigateur ne change rien (un Belge peut avoir un navigateur fr-FR).
  function getCountry() {
    try { if (typeof location !== 'undefined' && /^\/fr(\/|$)/.test(location.pathname)) return 'fr'; } catch (e) { /* hors navigateur */ }
    const v = store('kp_country'); return COUNTRIES[v] ? v : 'be';
  }
  function setCountry(c) { if (!COUNTRIES[c]) return false; try { localStorage.setItem('kp_country', c); } catch (e) { /* stockage indisponible */ } return true; }

  // Titre et description des pages françaises (même texte que api/_page-routes.js, vérifié par un test) : la page les remet en place quand on passe d'une vue à l'autre.
  const META_FR = {
    home: ['KeyPace France : apprendre à taper au clavier, du CE2 à la terminale', 'Parcours de dactylographie AZERTY classe par classe, du CE2 à la terminale, en lien avec le CRCN et Pix. Test de vitesse, jeux de frappe, gratuit pour commencer.'],
    lessons: ['Programme de dactylographie par classe, du CE2 à la terminale | KeyPace', 'Choisis ton établissement et ta classe (public, privé sous contrat, CAP) et découvre les leçons et modules KeyPace conseillés, avec les jalons officiels du CRCN et de Pix.'],
  };
  const api = { COUNTRY, COUNTRIES, META_FR, BE, FR, sourcesFor, modulesFor, priorYears, getCountry, setCountry };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KPProg = api;
})(typeof window !== 'undefined' ? window : globalThis);
