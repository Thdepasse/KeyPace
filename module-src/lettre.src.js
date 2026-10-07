/* Module « Écrire une lettre de motivation » : même moteur que les modules mail, CV et mot de passe. Le brouillon reste dans le navigateur de l'élève, rien n'est envoyé. */
/* =====================  PARTIE 1 : LES ÉLÉMENTS D'UNE LETTRE DE MOTIVATION  ===================== */
const STEPS = [
  { z:'from', t:"Tes coordonnées", x:"En haut à gauche : ton prénom et ton nom, ton adresse, ton téléphone et ton adresse mail. L'employeur doit pouvoir te répondre sans chercher.", tip:"Une adresse mail sobre, avec ton prénom et ton nom.", a:"Oublier ton téléphone ou ton adresse." },
  { z:'to', t:"Le destinataire et la date", x:"En haut à droite : l'entreprise, le nom et la fonction de la personne qui lit, son adresse. Dessous, le lieu et la date. Si l'annonce donne un nom, reprends-le tel quel. Pour une candidature spontanée, cherche toi-même le nom de la bonne personne.", tip:"Vérifie l'orthographe du nom de l'entreprise et de la personne.", a:"Écrire « À qui de droit » quand tu peux trouver un nom." },
  { z:'obj', t:"L'objet", x:"Une ligne qui dit pourquoi tu écris : le poste visé, et la référence de l'offre si tu réponds à une annonce. Pour une candidature spontanée, le poste ou le domaine qui t'intéresse.", tip:"Objet : candidature pour le poste de vendeuse étudiante.", a:"Un objet vague comme « Candidature » tout seul." },
  { z:'appel', t:"La formule d'appel", x:"Écris « Madame », « Monsieur » ou « Madame, Monsieur », avec le titre de la personne si tu le connais. On évite « Bonjour » et « Cher Monsieur ».", tip:"« Madame Leroy, » quand tu connais le nom.", a:"« Bonjour, » ou « Cher Monsieur, »." },
  { z:'intro', t:"L'introduction", x:"Montre que tu as compris ce que l'entreprise cherche, ou commence par une phrase qui attire l'attention. Dis tout de suite pour quel poste tu écris.", tip:"Reprends un élément précis de l'annonce.", a:"« Par la présente, je souhaite poser ma candidature suite à votre annonce »." },
  { z:'motiv', t:"Ta motivation", x:"Explique pourquoi tu veux travailler dans cette organisation, et pas dans une autre. Parle d'elle : ce que tu connais, ce qui t'attire. Une lettre qui pourrait s'envoyer à toutes les entreprises ne convainc personne.", tip:"Une phrase qui ne marche que pour cette entreprise.", a:"« Je suis très motivé » sans dire pourquoi." },
  { z:'atouts', t:"Tes atouts", x:"Choisis un ou deux atouts utiles pour le poste et appuie chacun sur un exemple concret : un stage, un job d'étudiant, du bénévolat, un projet d'école. Ne recopie pas ton CV : la lettre apporte autre chose.", tip:"Un fait précis : ce que tu as fait, et ce que ça montre.", a:"« Voir mon CV »." },
  { z:'rencontre', t:"La proposition de rencontre", x:"Termine en proposant de rencontrer l'employeur pour parler de ta motivation. C'est le but de la lettre.", tip:"« Je serais heureuse de vous rencontrer. »", a:"« Dans l'attente de votre réponse », banal et passif." },
  { z:'polit', t:"La formule de politesse", x:"Une formule simple et respectueuse, sans fioritures. Et tu vouvoies toujours l'employeur.", tip:"« Veuillez recevoir, Madame, Monsieur, mes sincères salutations. »", a:"Une formule familière, ou pompeuse sur trois lignes." },
  { z:'sign', t:"La signature et l'annexe", x:"Ton prénom et ton nom sous la formule de politesse. Dessous, indique que ton CV est joint : « Annexe : CV ». Envoie toujours les deux ensemble.", tip:"Annexe : CV", a:"Oublier de joindre le CV." },
  { z:'format', t:"Une page, en PDF", x:"Une page A4 au maximum, tapée à l'ordinateur, avec des paragraphes courts et une police lisible. Tu l'envoies en PDF avec un nom de fichier clair. Dans le mail, écris un message court et joins la lettre et le CV : ne recopie pas la lettre dans le mail.", tip:"prenom-nom-lettre-motivation.pdf", a:"Une lettre sur deux pages, ou un fichier « lettre finale (3).docx »." }
];

/* =====================  PARTIE 2 : ADAPTER À TA SITUATION  ===================== */
const SIT_EX = [
  { k:'job', n:1, title:'Tu cherches un job étudiant',
    why:"Tu as peu ou pas d'expérience payée, et l'employeur le sait. Il regarde surtout ta motivation, ton envie d'apprendre et si tu es disponible quand il en a besoin.",
    wants:"Savoir qui tu es, quand tu peux travailler et si tu as envie d'apprendre.",
    push:[ ["Une courte présentation au début", "Dis tout de suite que tu es élève ou étudiant, pour quel job tu écris et quand tu es disponible."], ["Tes disponibilités précises", "L'employeur doit organiser un planning : donne des périodes ou des plages horaires précises."], ["Ta volonté d'apprendre et un exemple", "Un club, du bénévolat ou un projet d'école montrent que tu t'engages et que tu travailles avec d'autres."] ],
    avoid:[ ["Recopier ton CV", "La lettre doit apporter autre chose : choisis un ou deux éléments et explique à quoi ils servent pour ce job."], ["Un « je suis motivé » sans raison", "Dis pourquoi cette entreprise t'intéresse, avec un fait."] ],
    exo:{ ctx:"Léa écrit à une librairie qui cherche un vendeur étudiant pour l'été. Que mets-tu en avant dans sa lettre ?", items:[
      ["Je suis disponible en juillet et en août, y compris le week-end", true, "L'employeur peut planifier : c'est une information que tout job étudiant demande."],
      ["Bénévole à la bibliothèque du quartier : conseil aux lecteurs", true, "Un exemple concret en lien avec les livres et le contact avec le public."],
      ["Je suis cliente de votre librairie depuis plusieurs années", true, "Elle montre un intérêt réel pour cette entreprise, pas pour une autre."],
      ["Mes notes de 2e primaire", false, "Trop ancien et sans lien avec le poste."],
      ["Toute la liste de mes loisirs", false, "Ils figurent déjà dans le CV : ne recopie pas, choisis un ou deux atouts."]
    ] } },
  { k:'stage', n:2, title:'Tu cherches un stage scolaire',
    why:"Tu es encore élève et l'organisation sait que tu viens apprendre. Ta lettre doit montrer que tu t'es renseigné et que tu sais pourquoi tu demandes ce stage.",
    wants:"Comprendre pourquoi tu viens chez elle, ce que tu veux apprendre et ce que tu peux apporter à l'équipe.",
    push:[ ["Pourquoi cette organisation", "Parle d'elle : ce qui t'attire dans son travail. C'est ce qui te distingue des autres candidats."], ["Les compétences que tu veux développer", "Dis ce que tu espères apprendre : cela montre que tu as réfléchi."], ["Ce que tu peux apporter", "Un projet d'école, une activité ou une qualité illustrée par un exemple."] ],
    avoid:[ ["Une lettre qui pourrait s'envoyer partout", "Sans le nom de l'organisation et un fait sur elle, la lettre paraît copiée."], ["Oublier la période du stage", "Précise quand et combien de temps : l'organisation doit planifier."] ],
    exo:{ ctx:"Inès cherche un stage de bureau. Que met-elle dans sa lettre ?", items:[
      ["Je voudrais apprendre à gérer un budget et à utiliser un tableur", true, "Elle dit clairement ce qu'elle veut développer."],
      ["Votre association aide les jeunes de Namur à trouver un job : cela m'a donné envie de venir", true, "Une phrase qui ne marche que pour cette organisation."],
      ["Projet d'école : j'ai suivi le budget d'une fête de classe", true, "Un exemple concret en lien avec un bureau."],
      ["Je suis sérieuse, dynamique et motivée", false, "Des formules toutes faites : montre-le par un fait."],
      ["Une copie de mon CV dans le texte", false, "Le CV est joint : la lettre doit apporter autre chose."]
    ] } },
  { k:'premier', n:3, title:'Tu cherches un premier emploi, sans expérience',
    why:"Tu n'as pas encore d'expérience dans le métier, mais l'employeur cherche aussi quelqu'un qui apprend vite. Tu n'as pas besoin de remplir tous les critères de l'annonce pour être retenu.",
    wants:"Comprendre en quoi ce poste correspond à ton parcours et ce que tu apportes déjà.",
    push:[ ["En quoi le poste s'inscrit dans ton parcours", "Relie ta formation ou ton projet professionnel à ce poste."], ["Tes stages, jobs étudiants et bénévolat", "Ils comptent comme expérience : appuie-toi dessus avec des exemples."], ["Ta capacité à apprendre vite", "Pour un début de carrière, c'est un vrai atout, surtout si tu le prouves par un fait."] ],
    avoid:[ ["T'auto-éliminer", "N'écris pas « je n'ai aucune expérience ». Dis ce que tu sais déjà faire."], ["Te montrer trop modeste ou trop sûr de toi", "Reste authentique : des qualités, des faits, sans en faire trop."] ],
    exo:{ ctx:"Sam postule comme développeur web junior dans une agence. Qu'écrit-il en priorité ?", items:[
      ["Mon stage de trois mois : j'y ai créé un site vitrine en HTML et CSS", true, "Un exemple concret directement lié au poste."],
      ["Ma formation en informatique de gestion m'a préparé à ce métier", true, "Il relie son parcours au poste."],
      ["Je prends vite en main de nouveaux outils, comme pendant mon stage", true, "La capacité d'apprendre vite est un atout de début de carrière."],
      ["Je n'ai aucune expérience, mais j'espère que vous me laisserez une chance", false, "Il s'auto-élimine : dis plutôt ce que tu sais déjà faire."],
      ["Je suis le candidat idéal pour ce poste", false, "Une affirmation sans preuve : montre-le par un fait."]
    ] } }
];
const TYPES = [
  { n:'Tu réponds à une annonce', t:"Montre que tu as compris l'offre.", w:"Reprends quelques éléments de l'annonce, le titre du poste et la référence dans l'objet. Si l'annonce donne le nom de la personne, écris-lui directement. Tes atouts répondent à ce que l'annonce demande." },
  { n:'Tu fais une candidature spontanée', t:"Attire l'attention dès la première phrase.", w:"Commence par une phrase qui accroche, dis pour quelle fonction tu postules et ce que tu sais de l'entreprise. Cherche le nom du contact. Écris une lettre différente pour chaque entreprise : les envois en masse ne convainquent pas." },
  { n:'À savoir : on vouvoie', t:"Toujours « vous », jamais « tu ».", w:"Un langage professionnel, positif, avec des verbes d'action. Tu adaptes un peu le ton à l'entreprise, plus classique pour une grande entreprise traditionnelle, un peu plus libre pour une jeune structure." },
  { n:'À savoir : une page', t:"Court, c'est mieux lu.", w:"Une page A4 au maximum, des paragraphes de quelques lignes, des phrases courtes. Relis à voix haute et demande à quelqu'un de relire : l'orthographe compte." },
  { n:'À savoir : annoncer un appel ?', t:"Les conseils belges ne sont pas d'accord.", w:"Certains proposent de terminer par « je me permettrai de vous appeler dans les prochains jours », d'autres le déconseillent. Si tu le dis, fais-le vraiment dans le délai annoncé. Tu peux aussi simplement proposer une rencontre." },
  { n:'À savoir : relancer', t:"Entre une semaine et quinze jours.", w:"Sans nouvelles, tu peux envoyer un mail de suivi après environ une semaine, ou reprendre contact après quinze jours selon les conseils. Garde une copie de ce que tu as envoyé." }
];

/* =====================  QUIZ  ===================== */
const QCM = {
  comprendre: [
    { q:"Où écris-tu tes coordonnées dans une lettre de motivation ?", o:["En haut à gauche","Tout en bas","Dans l'objet"], a:0, why:"Tes coordonnées vont en haut à gauche, celles du destinataire en haut à droite." },
    { q:"Quelle est la longueur maximale d'une lettre de motivation ?", o:["Une page","Trois pages","Autant qu'il faut"], a:0, why:"Une page A4 au maximum : plus c'est court, plus on a de chances d'être lu en entier." },
    { q:"Que doit apporter ta lettre en plus du CV ?", o:["Des informations différentes : ta motivation et des exemples","Une copie de ton CV","Ta photo"], a:0, why:"Le CV est en points, la lettre est un texte qui complète le CV avec ta motivation et des exemples." },
    { q:"Quelle formule d'appel convient ?", o:["Madame, Monsieur,","Bonjour,","Cher Monsieur,"], a:0, why:"On écrit « Madame », « Monsieur » ou « Madame, Monsieur », et on évite « Bonjour » et « Cher Monsieur »." }
  ],
  adapter: [
    { q:"Tu postules pour un job étudiant. Que précises-tu ?", o:["Tes disponibilités et ta volonté d'apprendre","L'histoire de toute ta scolarité","Le salaire que tu veux"], a:0, why:"Pour un job étudiant, l'employeur regarde ta motivation, ton envie d'apprendre et quand tu es disponible." },
    { q:"Tu fais une candidature spontanée. Que fais-tu au début ?", o:["Je dis pour quelle fonction je postule et ce que je sais de l'entreprise","Je recopie une annonce","Je parle de mon salaire"], a:0, why:"En candidature spontanée, tu attires l'attention, tu cites la fonction et tu montres que tu connais l'entreprise." },
    { q:"Tu n'as pas d'expérience professionnelle. Que fais-tu ?", o:["Je m'appuie sur mes stages, mes jobs d'étudiant et mon bénévolat","Je ne postule pas","Je m'invente une expérience"], a:0, why:"Stages, jobs d'étudiant, projets et bénévolat comptent : tu n'as pas besoin de remplir tous les critères." },
    { q:"Comment t'adresses-tu à l'employeur ?", o:["Avec « vous »","Avec « tu »","Avec un surnom"], a:0, why:"Dans une lettre de motivation, on vouvoie toujours l'employeur." }
  ]
};
const BANK_EXTRA = [
  { part:1, q:"Que mets-tu dans l'objet quand tu réponds à une offre ?", o:["Le poste visé et la référence de l'offre","Un simple « Bonjour »","Ton âge"], a:0, why:"L'objet dit pourquoi tu écris : le poste, et la référence de l'offre." },
  { part:1, q:"Quelle mention ajoutes-tu sous ta signature ?", o:["Annexe : CV","Une photo d'identité","Ton numéro de registre national"], a:0, why:"Tu indiques que ton CV est joint avec « Annexe : CV ». Pas de photo dans la lettre." },
  { part:1, q:"Comment envoies-tu ta lettre par mail ?", o:["En PDF, avec un court message dans le mail","Recopiée en entier dans le corps du mail","En trois photos"], a:0, why:"Tu joins la lettre et le CV en PDF et tu écris un message court : tu ne recopies pas la lettre dans le mail." },
  { part:1, q:"Quelle introduction est la meilleure ?", o:["J'ai lu votre offre de vendeur étudiant : conseiller les clients me correspond.","Par la présente, je souhaite poser ma candidature suite à votre annonce.","Je cherche du travail."], a:0, why:"Elle montre que tu as compris l'offre. « Par la présente » et « suite à votre annonce » sont à éviter." },
  { part:2, q:"Pourquoi éviter la même lettre pour toutes les entreprises ?", o:["Elle paraît impersonnelle : il faut parler de l'entreprise visée","Elle est trop courte","Elle est interdite"], a:0, why:"Une lettre identique pour tout le monde ne montre pas pourquoi tu veux travailler ici." },
  { part:2, q:"Quelle phrase vaut le mieux dans une lettre ?", o:["J'ai conseillé des lecteurs pendant mon bénévolat à la bibliothèque.","Je suis dynamique et motivé.","Je suis le candidat idéal."], a:0, why:"Un fait concret prouve plus qu'une formule toute faite." },
  { part:2, q:"Tu n'as pas de réponse après ta candidature. Que fais-tu ?", o:["Je relance entre une semaine et quinze jours après l'envoi","J'envoie la même lettre dix fois","Je ne relance jamais"], a:0, why:"Les conseils belges parlent d'une relance après environ une semaine à quinze jours." },
  { part:3, q:"Le nom de l'entreprise est mal écrit dans ta lettre. Quel est le risque ?", o:["Ça donne une mauvaise impression : vérifie chaque nom","Aucun, personne ne regarde","Ça rend la lettre plus originale"], a:0, why:"Vérifie avec soin l'orthographe des noms de l'entreprise et de la personne." },
  { part:3, q:"« Dans l'attente de votre réponse » est :", o:["Banal et passif : mieux vaut proposer une rencontre","La meilleure phrase possible","Obligatoire"], a:0, why:"Termine plutôt en proposant de rencontrer l'employeur." },
  { part:3, q:"Que fais-tu avant d'envoyer ta lettre ?", o:["Je la relis à voix haute et je la fais relire","Je l'envoie tout de suite","Je ne relis que le début"], a:0, why:"Relire à voix haute et faire relire par quelqu'un aide à repérer les fautes." },
  { part:3, q:"Tu trouves un modèle de lettre en ligne. Que fais-tu ?", o:["Je l'adapte à moi et à l'entreprise, sans le copier","Je le copie tel quel","Je change seulement le nom de l'entreprise"], a:0, why:"Ta lettre doit être unique : un modèle copié se reconnaît." },
  { part:4, q:"Ta lettre dépasse une page. Que fais-tu ?", o:["Je raccourcis","Je mets la police en taille 6","J'envoie sur deux pages"], a:0, why:"Une page au maximum : on garde l'essentiel." },
  { part:4, q:"Quel nom de fichier choisis-tu ?", o:["prenom-nom-lettre-motivation.pdf","lettre finale (3).docx","IMG_2041.png"], a:0, why:"Un PDF avec ton nom : l'employeur retrouve ta lettre facilement." }
];
const BANK = () => [ ...QCM.comprendre.map(q => ({ ...q, part:1 })), ...QCM.adapter.map(q => ({ ...q, part:2 })), ...BANK_EXTRA ];
const FQ_COUNT = 10;

/* =====================  PARTIE 3 : LETTRES À CORRIGER  ===================== */
/* row: {l:'Objet', s:[segs]} | {h:'Titre'} | {s:[segs]}   :   seg = 'texte' ou E(texte, correction, pourquoi, fausses options) */
const E = (t, fix, why, opts) => ({ t, err:true, fix, why, opts });
const DOCS = [
  { title:"Lettre de Tom, job étudiant en librairie", reader:{ who:'Mme Leroy', role:'Libraire, Page 7', emoji:'👩‍💼',
      lines:["Je passe à la lettre suivante.","Hum… il y a trop de maladresses pour ce poste.","Il y a du potentiel, mais certains détails me gênent.","Presque ! Un dernier détail me chagrine.","Je le convoque pour un entretien !"] },
    rows:[
      { l:'De', s:[E('Tom','Tom Lejeune, rue des Fleurs 12, 5000 Namur, 0470 12 34 56, tom.lejeune@mail.be','Mets tes coordonnées complètes en haut à gauche pour qu\'on puisse te répondre.',['Tom, 0470 12 34 56','Tom, quartier des Fleurs'])] },
      { l:'À', s:[E('Librairie Pages 77, Namur','Librairie Page 7, rue de la Gare 3, 5000 Namur','Vérifie l\'orthographe du nom de l\'entreprise et indique son adresse.',['Librairie Page, Namur','La librairie de Namur'])] },
      { l:'Objet', s:[E('Candidature','Candidature pour le poste de vendeur étudiant (offre du 3 octobre)','Indique le poste visé et la référence de l\'offre.',['Candidature spontanée','Un job svp'])] },
      { h:'Lettre' },
      { s:[E('Bonjour,','Madame, Monsieur,','On évite « Bonjour » : écris « Madame, Monsieur » ou le nom de la personne.',['Cher Monsieur,','Coucou,'])] },
      { s:[E('Par la présente, je souhaite poser ma candidature suite à votre annonce.','J\'ai lu votre offre de vendeur étudiant : accueillir et conseiller vos clients me correspond.','Montre que tu as compris l\'offre : « par la présente » et « suite à votre annonce » sont des formules toutes faites.',['Je vous écris au sujet de votre annonce.','Je suis intéressé par votre annonce.'])] },
      { s:[E('Je suis très motivé et dynamique.','Je lis beaucoup et je fréquente votre librairie depuis plusieurs années.','Les formules toutes faites ne prouvent rien : donne un fait précis sur toi et sur cette entreprise.',['Je suis sérieux et passionné.','Je suis un garçon motivé.'])] },
      { s:[E('Voir mon CV.','Bénévole à la bibliothèque de mon quartier cet été, j\'ai conseillé des lecteurs et classé les livres rendus.','Ne renvoie pas au CV : complète-le avec un exemple concret.',['Tout est dans mon CV.','J\'ai plein d\'expériences.'])] },
      { s:[E('Répondez-moi vite.','Je serais heureux de vous rencontrer pour vous parler de ma motivation.','Propose une rencontre : c\'est le but de la lettre, sur un ton poli.',['J\'attends votre réponse.','Appelez-moi quand vous voulez.'])] },
      { s:[E('Je te remercie de ta lecture.','Je vous remercie de votre lecture.','On vouvoie toujours l\'employeur dans une lettre de motivation.',['Merci de ta lecture !','Je vous remercie de ta lecture.'])] },
      { s:[E('Bisous, Tom','Veuillez recevoir, Madame, Monsieur, mes sincères salutations.','Une formule de politesse simple et respectueuse.',['À bientôt !','Cordialement à vous tous !!'])] },
      { h:'Fichier à envoyer' },
      { s:[E('lettre finale (3).docx','tom-lejeune-lettre-motivation.pdf','Un PDF avec ton nom : clair et lisible partout.',['lettre.docx','IMG_2041.png'])] }
    ] },
  { title:"Lettre d'Inès, candidature spontanée en agence web", reader:{ who:'M. Dubois', role:'Responsable d\'agence web', emoji:'👨‍💻',
      lines:["Je ne retiens pas cette candidature.","Elle écrit à toutes les agences, je pense.","Elle a du potentiel, mais il manque de précision.","Presque convaincant, deux détails à régler.","Je l'invite pour un entretien cette semaine !"] },
    rows:[
      { l:'De', s:['Inès Martin, avenue des Tilleuls 8, 5100 Jambes, 0471 22 33 44, ines.martin@mail.be'] },
      { l:'À', s:[E('À qui de droit','Madame Claire Dubois, responsable de l\'agence','Cherche le nom de la personne à qui écrire : une lettre nominative est mieux lue.',['Direction','Chers messieurs'])] },
      { l:'Objet', s:[E('Bonjour','Candidature spontanée, développeuse web junior','Pour une candidature spontanée, l\'objet indique le poste visé.',['Candidature','Un travail chez vous'])] },
      { h:'Lettre' },
      { s:[E('Je cherche du travail partout.','Je souhaite vous offrir mes services comme développeuse web junior.','Dis tout de suite pour quel poste tu écris et à qui.',['Je cherche un job dans l\'informatique.','Voici ma lettre.'])] },
      { s:[E('Votre entreprise est leader dans son domaine.','Votre agence a réalisé le site d\'un club sportif de Namur, que j\'ai consulté.','Une phrase qui vaut pour toutes les entreprises sonne comme un modèle : parle de celle-ci.',['Votre entreprise est très connue.','J\'adore votre entreprise.'])] },
      { s:[E('Je maîtrise tout Internet.','J\'ai créé un site vitrine en HTML et CSS pendant mon stage de trois mois dans une agence.','Appuie chaque atout sur un exemple concret.',['Je suis très forte en informatique.','Je sais tout faire.'])] },
      { s:[E('Je suis la candidate que vous cherchez.','Mon stage m\'a appris à livrer un site dans les délais.','Évite de dire que tu es la personne idéale : montre-le par un fait.',['Je suis la meilleure candidate.','Vous ne trouverez pas mieux.'])] },
      { s:[E('Dans l\'attente de votre réponse.','Je me tiens à votre disposition pour vous rencontrer.','Cette phrase est banale et passive : propose une rencontre.',['Dans l\'attente de vos nouvelles.','Merci d\'avance.'])] },
      { s:[E('Cordialement à vous tous !!','Veuillez recevoir, Madame Dubois, mes sincères salutations.','Une formule simple et respectueuse, sans familiarité.',['Amicalement,','Bien à vous tous !'])] },
      { l:'Signature', s:['Inès Martin'] },
      { l:'Joint', s:[E('(rien)','Annexe : CV','Joins ton CV et mentionne-le : « Annexe : CV ».',['Annexe : photo','Annexe : mon bulletin de 3e'])] },
      { l:'Poste', s:['Candidature : ',E('Developeuse','Développeuse','Accent oublié : relis-toi.',['Dévelopeuse','Developpeuse']),' web junior.'] }
    ] }
];

const PARTS = [
  { k:'comprendre', n:1, title:'Comprendre une lettre', hl:'une lettre', img:'keypace-perso-courrier-ecole', desc:"Les 11 éléments d'une lettre de motivation, un par un. Fais défiler : chaque étape allume la zone correspondante.", prev:['11 étapes','Lettre annotée','Quiz'] },
  { k:'adapter', n:2, title:'Adapter à ta situation', hl:'ta situation', img:'keypace-perso-ecrire-a-plusieurs', desc:"Pourquoi une lettre change selon ta situation et le type de candidature, expliqué pas à pas, avec des exercices pour choisir ce que tu mets en avant.", prev:['3 situations','Annonce ou spontanée','Exercices'] },
  { k:'reperer', n:3, title:'Repérer les erreurs', hl:'les erreurs', img:'keypace-perso-ortho', desc:"D'abord tu repères les erreurs d'une lettre, puis tu les corriges et tu vois l'employeur réagir en direct.", prev:['2 lettres','Repère + corrige','L\'employeur réagit'] },
  { k:'entrainer', n:4, title:'Écrire ta lettre', hl:'ta lettre', img:'keypace-perso-lettre', desc:"Choisis ta situation, remplis chaque paragraphe : ta lettre se construit en direct avec une checklist. Puis exporte-la en PDF.", prev:['Aperçu en direct','Checklist','Export PDF'] }
];
const hlTitle = p => p.title.replace(p.hl, `<em>${p.hl}</em>`);

const $ = s => document.querySelector(s);
const shuffle = a => a.map(x => [Math.random(), x]).sort((x,y) => x[0]-y[0]).map(x => x[1]);
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);
const srcRow = ids => '';   /* pastilles de sources retirées de l'affichage (données conservées dans SRC) */
const store = { get(){ try{ return JSON.parse(localStorage.getItem('kp-lettre-done')||'{}'); }catch(e){ return {}; } }, set(o){ try{ localStorage.setItem('kp-lettre-done', JSON.stringify(o)); }catch(e){} } };
let done = store.get(), io = null, tmr = null;
const BEST_KEY = 'kp-lettre-quiz-best';
const getBest = () => { try{ return +localStorage.getItem(BEST_KEY) || 0; }catch(e){ return 0; } };
const setBest = n => { try{ localStorage.setItem(BEST_KEY, String(n)); }catch(e){} };
const allDone = () => PARTS.every(p => done[p.k]);
function completePart(k){
  done[k] = true; store.set(done);
  const f = $('#finish'), p = PARTS.find(x => x.k === k);
  if (f && '#lettre/'+p.n === location.hash){ f.textContent = 'Terminée ✓'; f.className = 'btn ok'; const r = $('#restart'); if (r) r.hidden = false; refreshNext(); }
}
function refreshNext(){ const nx = $('#next4'); if (!nx) return; if (allDone()){ nx.textContent = 'Quiz final →'; nx.onclick = () => { location.hash = 'lettre/quiz'; }; } }
function show(id){ document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === id)); window.scrollTo(0,0); }

function route(){
  if (io){ io.disconnect(); io = null; }
  clearInterval(tmr);
  const h = location.hash.replace('#','');
  if (h === 'lettre') return renderHub();
  if (h === 'lettre/quiz') return allDone() ? renderFinalQuiz() : renderHub();
  const m = h.match(/^lettre\/(\d)$/);
  if (m && PARTS[m[1]-1]) return renderLesson(PARTS[m[1]-1]);
  renderHub();
}
window.addEventListener('hashchange', route);
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g){ if (g.dataset.go === 'cours'){ location.href = '/?view=lessons'; return; } location.hash = g.dataset.go === 'hub' ? 'lettre' : g.dataset.go; return; }
  if (e.target.id === 'restart'){ const p = PARTS.find(x => '#lettre/'+x.n === location.hash); if (p) renderLesson(p); return; }
  if (e.target.id === 'reset-all'){ if (confirm("Effacer ta progression dans ce module ? Tu pourras tout refaire depuis le début.")){ done = {}; store.set(done); try{ localStorage.removeItem(BEST_KEY); }catch(err){} renderHub(); } return; }
  if (e.target.id === 'finish'){ const p = PARTS.find(x => '#lettre/'+x.n === location.hash); if (p){ completePart(p.k); location.hash = 'cv'; } }
});

/* ---------------- Hub ---------------- */
const MINI = {
  comprendre:`<div class="mw"><div class="dots"><i></i><i></i><i></i></div><div class="ml"></div><div class="ml"></div><div class="ml"></div><div class="ml"></div></div>`,
  adapter:`<div class="m2"><div class="who" id="rec-who">Job étudiant</div><div class="bars" id="rec-bars">${[1,2,3,4,5].map(()=>'<span></span>').join('')}</div></div>`,
  reperer:`<div class="mw m3"><span class="sw"><span class="bad">Bonjour,</span><span class="good">Madame, Monsieur,</span></span><br><span>Fin :</span> <span class="sw"><span class="bad">J'attends votre réponse</span><span class="good">Je serais heureuse de vous rencontrer</span></span></div>`,
  entrainer:`<div class="m4"><div class="typed"><span>Madame Leroy, j'ai lu votre offre…</span></div><div class="cks"><i></i><i></i><i></i><i></i></div></div>`
};
function partCard(p){
  const d = done[p.k];
  return `<button class="part ${d?'done':''}" onclick="location.hash='lettre/${p.n}'">
    <div class="mini">${MINI[p.k]}</div>
    ${d ? '<span class="badge-done">Terminée ✓</span>' : ''}
    <h3>${p.title}</h3><p>${p.desc}</p>
    <div class="prev">${p.prev.map(x => `<span>${x}</span>`).join('')}</div>
    <div class="foot"><span class="dur">Partie ${p.n}</span><span class="cta">${d?'Revoir':'Ouvrir'} →</span></div>
  </button>`;
}
function startRecDemo(){
  const seq = [{l:'Job étudiant',f:2},{l:'Stage scolaire',f:3},{l:'Premier emploi',f:4},{l:'Spontanée',f:5}]; let i = 0;
  const tick = () => { const w = $('#rec-who'), b = $('#rec-bars'); if (!w || !b) return; const c = seq[i++ % seq.length]; w.textContent = c.l; [...b.children].forEach((x,j) => x.className = j < c.f ? 'f' : ''); };
  tick(); tmr = setInterval(tick, 1700);
}
function quizBanner(n){
  const all = n === PARTS.length, best = getBest();
  if (!all) return `<section class="qbanner locked"><img src="/images/keypace-mascot-cheer.webp" alt="">
    <div class="qb-txt"><span class="qb-tag">Quiz final · 🔒 Verrouillé</span><h2>Le quiz de la lettre</h2><p>Termine les 4 parties pour le débloquer. Il reprend tout le module, question après question, au hasard.</p></div>
    <div class="qb-act"><div class="qb-prog"><i style="width:${n/4*100}%"></i></div><span style="font-size:12.5px;color:var(--muted)">${n}/4 parties terminées</span></div></section>`;
  return `<section class="qbanner"><img src="/images/keypace-mascot-cheer.webp" alt="">
    <div class="qb-txt"><span class="qb-tag">Module terminé, bravo !</span><h2>Teste-toi avec le quiz <em>de la lettre</em></h2><p>${FQ_COUNT} questions tirées au hasard dans toutes les parties, une à la fois. Tu peux rejouer autant de fois que tu veux.</p>
      <div class="qb-meta"><span>${FQ_COUNT} questions</span><span>Au hasard</span>${best ? `<span>Meilleur score : ${best}/${FQ_COUNT}</span>` : ''}</div></div>
    <div class="qb-act"><button class="btn primary" onclick="location.hash='lettre/quiz'" style="font-size:16px;padding:14px 26px">Jouer →</button></div></section>`;
}
function renderHub(){
  const n = PARTS.filter(p => done[p.k]).length, all = n === PARTS.length;
  $('#hub-prog').textContent = n + '/4 parties';
  $('#hub-bar').style.width = (n/4*100) + '%';
  $('#hub-meta').innerHTML = `<div class="ring" style="--p:${n/4*100}"><i>${n}/4</i></div><span>parties terminées</span>${n ? '<button class="linkbtn" id="reset-all">Réinitialiser ma progression</button>' : ''}`;
  const nextK = all ? null : (PARTS.find(p => !done[p.k]) || {}).k, mascots = ['cheer','idea','books','cheer'];
  $('#parts-host').innerHTML = `<div class="road">${PARTS.map((p,i) => `
    <div class="stop ${done[p.k]?'done':''} ${p.k===nextK?'next':''}">
      ${partCard(p)}
      <div class="node">${done[p.k] ? '✓' : p.n}</div>
      <div class="side">${p.k===nextK ? `<img src="/images/keypace-mascot-${mascots[i]}.webp" alt=""><span class="bubble">${n ? 'Tu en es là !' : 'Commence ici !'}</span>` : ''}</div>
    </div>`).join('')}</div>${quizBanner(n)}`;
  startRecDemo();
  show('v-hub');
}

/* ---------------- Quiz final et QCM ---------------- */
function drawFinalDeck(){
  const bank = shuffle(BANK()), deck = [];
  [1,2,3,4].forEach(pt => bank.filter(q => q.part === pt).slice(0,2).forEach(q => deck.push(q)));
  bank.filter(q => !deck.includes(q)).slice(0, FQ_COUNT - deck.length).forEach(q => deck.push(q));
  return shuffle(deck).map(q => { const idx = shuffle(q.o.map((_,i) => i)); return { ...q, o:idx.map(i => q.o[i]), a:idx.indexOf(q.a) }; });
}
function renderFinalQuiz(){
  $('#crumb-part').textContent = 'Quiz final'; $('#lesson-pos').textContent = 'Quiz final';
  $('#lesson-hero').innerHTML = `<div class="hero small"><div class="wrap"><div class="txt"><span class="tag">Quiz final</span><h1>Le quiz <em>de la lettre</em></h1><p>${FQ_COUNT} questions tirées au hasard dans toutes les parties. Une à la fois, dans un ordre différent à chaque partie.</p></div><img src="/images/keypace-mascot-cheer.webp" alt=""></div></div>`;
  $('#lesson-root').innerHTML = `<div id="fq"></div><div class="lesson-foot"><button class="btn" onclick="location.hash='lettre'">← Retour au module</button><span></span></div>`;
  show('v-lesson'); initFinalQuiz($('#fq'));
}
function initFinalQuiz(el){
  let deck = drawFinalDeck(), i = 0, picked = null, res = [];
  const draw = () => {
    if (i >= deck.length){
      const sc = res.filter(Boolean).length, N = deck.length, best = getBest(), isBest = sc > best;
      if (isBest) setBest(sc);
      const msg = sc === N ? 'Sans faute ! Tu sais écrire une lettre de motivation.' : sc >= N*0.8 ? 'Excellent, presque parfait.' : sc >= N*0.5 ? 'Bien joué, encore quelques points à revoir.' : 'Pas facile ! Reprends les parties puis retente.';
      const missed = deck.map((q,k) => ({ q, ok:res[k] })).filter(x => !x.ok);
      el.innerHTML = `<section class="qz" style="margin-top:34px"><div class="qz-top"><h2>Résultat du quiz</h2></div>
        <div class="res"><div class="score">${sc}/${N}</div><div><p style="font-size:17px;font-weight:600">${msg}</p><p style="color:var(--muted);font-size:14px">${isBest && sc > 0 ? 'Nouveau meilleur score !' : `Meilleur score : ${Math.max(best, sc)}/${N}`}</p></div></div>
        ${missed.length ? `<div class="miss-list"><b style="font-family:'Bricolage Grotesque',sans-serif;font-size:17px">À revoir</b>${missed.map(x => `<div><span class="fq-part">Partie ${x.q.part}</span> ${x.q.q}<small>Bonne réponse : ${x.q.o[x.q.a]}. ${x.q.why}</small></div>`).join('')}</div>` : ''}
        <div class="btnrow" style="margin-top:22px"><button class="btn primary" id="fq-again">Rejouer avec de nouvelles questions</button><button class="btn" onclick="location.hash='lettre'">Retour au module</button></div></section>`;
      $('#fq-again').onclick = () => { deck = drawFinalDeck(); i = 0; picked = null; res = []; draw(); window.scrollTo(0,0); };
      return;
    }
    const c = deck[i];
    el.innerHTML = `<section class="qz" style="margin-top:34px">
      <div class="qz-top"><span class="fq-part">Partie ${c.part} · ${PARTS[c.part-1].title}</span><div class="dots">${deck.map((_,j) => `<i class="${j<i?(res[j]?'ok':'ko'):j===i?'cur':''}"></i>`).join('')}</div></div>
      <div class="q">${c.q}</div>
      <div class="opts">${c.o.map((o,j) => { let cl = 'opt'; if (picked !== null){ if (j === c.a) cl += ' right'; else if (j === picked) cl += ' wrong'; }
        return `<button class="${cl}" data-j="${j}" ${picked!==null?'disabled':''}><span class="k">${'ABCD'[j]}</span>${o}</button>`; }).join('')}</div>
      ${picked !== null ? `<div class="fb ${picked===c.a?'ok':'ko'}"><b>${picked===c.a?'Exact.':'Pas tout à fait.'}</b> ${c.why}</div>
        <div class="btnrow" style="margin-top:16px"><button class="btn primary" id="fq-next">${i<deck.length-1?'Question suivante →':'Voir mon résultat'}</button></div>` : ''}
      <p style="margin-top:18px;font-size:13px;color:var(--muted)">Question ${i+1} sur ${deck.length}</p></section>`;
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => { picked = +b.dataset.j; res[i] = picked === c.a; draw(); });
    const nx = $('#fq-next'); if (nx) nx.onclick = () => { i++; picked = null; draw(); };
  };
  draw();
}
const shuffleQ = list => list.map(q => { const idx = shuffle(q.o.map((_,i) => i)); return { ...q, o:idx.map(i => q.o[i]), a:idx.indexOf(q.a) }; });
function initQCM(el, p){
  let Q = shuffleQ(QCM[p.k]), i = 0, picked = null, res = [];
  const draw = () => {
    if (i >= Q.length){
      const s = res.filter(Boolean).length;
      const msg = s === Q.length ? 'Sans faute, bravo !' : s >= Q.length-1 ? 'Presque parfait.' : s >= 2 ? 'Bon début, relis les points manqués.' : 'Reprends la partie, puis retente.';
      el.innerHTML = `<section class="qz"><div class="qz-top"><h2>Quiz terminé</h2></div>
        <div class="res"><div class="score">${s}/${Q.length}</div><div><p style="font-size:17px;font-weight:600">${msg}</p><p style="color:var(--muted);font-size:14px">Partie validée : tu peux passer à la suite quand tu veux.</p></div></div>
        <div class="btnrow" style="margin-top:20px"><button class="btn" id="qz-again">Refaire le quiz</button>${PARTS[p.n] ? `<button class="btn primary" onclick="location.hash='lettre/${p.n+1}'">${PARTS[p.n].title} →</button>`:''}</div></section>`;
      $('#qz-again').onclick = () => { Q = shuffleQ(QCM[p.k]); i = 0; picked = null; res = []; draw(); };
      completePart(p.k); return;
    }
    const c = Q[i];
    el.innerHTML = `<section class="qz"><div class="qz-top"><h2>Petit quiz <em>de fin de partie</em></h2><div class="dots">${Q.map((_,j) => `<i class="${j<i?(res[j]?'ok':'ko'):j===i?'cur':''}"></i>`).join('')}</div></div>
      <div class="q">${c.q}</div>
      <div class="opts">${c.o.map((o,j) => { let cl = 'opt'; if (picked !== null){ if (j === c.a) cl += ' right'; else if (j === picked) cl += ' wrong'; }
        return `<button class="${cl}" data-j="${j}" ${picked!==null?'disabled':''}><span class="k">${'ABCD'[j]}</span>${o}</button>`; }).join('')}</div>
      ${picked !== null ? `<div class="fb ${picked===c.a?'ok':'ko'}"><b>${picked===c.a?'Exact.':'Pas tout à fait.'}</b> ${c.why}</div>
        <div class="btnrow" style="margin-top:16px"><button class="btn primary" id="qz-next">${i<Q.length-1?'Question suivante →':'Voir mon résultat'}</button></div>` : ''}</section>`;
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => { picked = +b.dataset.j; res[i] = picked === c.a; draw(); });
    const nx = $('#qz-next'); if (nx) nx.onclick = () => { i++; picked = null; draw(); };
  };
  draw();
}

/* ---------------- Leçon ---------------- */
function renderLesson(p){
  $('#crumb-part').textContent = p.title;
  $('#lesson-pos').textContent = 'Partie ' + p.n + ' sur 4';
  $('#lesson-hero').innerHTML = `<div class="hero small"><div class="wrap"><div class="txt"><span class="tag">Partie ${p.n} sur 4</span><h1>${hlTitle(p)}</h1><p>${p.desc}</p></div><img src="/images/${p.img}.webp" alt=""></div></div>`;
  $('#lesson-root').innerHTML = '<div id="lesson-body"></div><div id="lesson-quiz"></div>' + footer(p);
  show('v-lesson');
  ({ comprendre:initComprendre, adapter:initAdapter, reperer:initReperer, entrainer:initEntrainer })[p.k]($('#lesson-body'));
  if (QCM[p.k]) initQCM($('#lesson-quiz'), p);
}
function footer(p){
  const prev = PARTS[p.n-2], next = PARTS[p.n];
  const nextBtn = next ? `<button class="btn dark" onclick="location.hash='lettre/${next.n}'">${next.title} →</button>`
    : (allDone() ? `<button class="btn dark" id="next4" onclick="location.hash='lettre/quiz'">Quiz final →</button>` : `<button class="btn dark" id="next4" onclick="location.hash='lettre'">Retour au module</button>`);
  return `<div class="lesson-foot">
    ${prev ? `<button class="btn" onclick="location.hash='lettre/${prev.n}'">← ${prev.title}</button>` : `<button class="btn" onclick="location.hash='lettre'">← Retour au module</button>`}
    <span class="foot-grp"><button class="btn" id="restart" ${done[p.k]?'':'hidden'}>↺ Recommencer cette partie</button>
    <button class="btn ${done[p.k]?'ok':'primary'}" id="finish">${done[p.k] ? 'Terminée ✓' : 'Terminer cette partie'}</button></span>${nextBtn}</div>`;
}

/* ---------------- Partie 3 ---------------- */
let TOKDRAG = null;
document.addEventListener('pointermove', e => { if (!TOKDRAG) return; const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tok'); if (t) TOKDRAG.move(+t.dataset.i); });
document.addEventListener('pointerup', () => { if (TOKDRAG) TOKDRAG.end(); });
function initReperer(el){
  let qi = 0;
  const S = DOCS.map(() => ({ phase:1, picked:{}, checked:false, st:{}, open:null, cache:{}, log:[], msg:null }));
  const tabs = () => `<div class="chips" style="margin:6px 0 14px">${DOCS.map((q,i) => `<button class="chip ${i===qi?'on':''}" data-q="${i}">Lettre ${i+1}${S[i].phase===3?' ✓':''}</button>`).join('')}</div>`;
  const stepper = s => `<div class="steps2"><div class="s2 ${s.phase===1?'cur':'ok'}"><b>${s.phase===1?'1':'✓'}</b>Repère les erreurs</div><i></i>
      <div class="s2 ${s.phase>=2?(s.phase===3?'ok':'cur'):(s.checked?'':'lock')}"><b>${s.phase===3?'✓':'2'}</b>Corrige-les</div></div>`;
  const wire = e2 => e2.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { qi = +b.dataset.q; draw(); });
  const allP3 = () => S.every(x => x.phase === 3);
  const norm = g => typeof g === 'string' ? { t:g, err:false } : g;
  /* Découpe en mots sélectionnables */
  const build = D => {
    let idx = 0; const errs = [];
    const segsOf = segs => segs.map(raw => { const g = norm(raw), m = g.t.match(/^(\s*)([\s\S]*?)(\s*)$/), core = m[2];
      const toks = (core.match(/\S+\s*/g) || []).map(text => ({ i:idx++, text }));
      let eid = null; if (g.err){ eid = errs.length; errs.push({ g, toks:toks.map(t => t.i) }); }
      return { lead:m[1], trail:m[3], toks, eid }; });
    const rows = D.rows.map(r => r.h !== undefined ? { h:segsOf([r.h]) } : { l:r.l, segs:segsOf(r.s) });
    return { rows, errs, n:idx };
  };
  const drawSpot = () => {
    const D = DOCS[qi], s = S[qi]; if (!s.struct) s.struct = build(D);
    const T = s.struct, sel = s.picked;
    const cnt = e => e.toks.filter(i => sel[i]).length;
    const foundOf = T.errs.map(e => cnt(e) >= Math.ceil(e.toks.length/2));
    const errOf = {}; T.errs.forEach((e,k) => e.toks.forEach(i => errOf[i] = k));
    const nSel = Object.keys(sel).length;
    let fp = 0, prev = false; for (let i = 0; i < T.n; i++){ const f = sel[i] && errOf[i] === undefined; if (f && !prev) fp++; prev = f; }
    const seg = sg => { const toks = sg.toks.map(t => { let c = 'tok';
        if (!s.checked){ if (sel[t.i]) c += ' pick'; } else if (sg.eid === null){ if (sel[t.i]) c += ' fp'; } else if (foundOf[sg.eid]) c += ' good';
        return `<span class="${c}" data-i="${t.i}">${t.text}</span>`; }).join('');
      const grp = s.checked && sg.eid !== null && !foundOf[sg.eid] ? `<span class="grp miss">${toks}</span>` : toks; return sg.lead + grp + sg.trail; };
    const body = T.rows.map(r => r.h ? `<div class="qh">${r.h.map(seg).join('')}</div>` : `<div class="qrow">${r.l ? `<span class="l" style="width:64px">${r.l}</span>` : ''}<span>${r.segs.map(seg).join('')}</span></div>`).join('');
    const found = foundOf.filter(Boolean).length, total = T.errs.length;
    el.innerHTML = tabs() + stepper(s) + `<div class="quiz">
      <div class="cvwin ${s.checked?'locked':''}"><div class="bar"><i></i><i></i><i></i><span>${D.title}</span></div><div class="qbody2">${body}</div></div>
      <aside class="aside">${!s.checked ? `
        <span style="font-size:15px;line-height:1.55"><b>${total} erreurs</b> se cachent dans cette lettre. Clique sur un mot, ou glisse (ou Maj + clic) pour sélectionner un groupe de mots. Pas besoin de savoir corriger : ça, c'est l'étape 2.</span>
        <div class="btnrow"><button class="btn primary" id="q-check" ${nSel?'':'disabled'}>Vérifier (<span id="q-n">${nSel}</span> mot${nSel>1?'s':''})</button>${nSel ? '<button class="btn" id="q-clear">Tout effacer</button>' : ''}</div>` : `
        <div class="sc">${found}/${total} repérées${fp ? ' · '+fp+' fausse'+(fp>1?'s':'')+' alerte'+(fp>1?'s':'') : ''}</div>
        <div class="legend"><span><i style="background:var(--success-soft);box-shadow:inset 0 -2px 0 var(--success)"></i>Repérée</span><span><i style="box-shadow:inset 0 0 0 2px var(--accent)"></i>Manquée</span><span><i style="background:var(--light)"></i>Fausse alerte</span></div>
        <span style="font-size:14.5px;line-height:1.5;color:var(--body)">${found===total ? 'Tu as tout repéré.' : 'Les erreurs manquées sont entourées en orange.'} À l'étape 2, tu corriges chacune et tu vois comment ${D.reader.who} réagit.</span>
        <div class="btnrow"><button class="btn" id="q-retry">Recommencer</button><button class="btn primary" id="q-go">Passer à la correction →</button></div>`}
      </aside></div>`;
    wire(el);
    const on = (id, fn) => { const b = $(id); if (b) b.onclick = fn; };
    on('#q-check', () => { s.checked = true; draw(); });
    on('#q-clear', () => { s.picked = {}; s.last = null; draw(); });
    on('#q-retry', () => { s.picked = {}; s.checked = false; s.last = null; draw(); });
    on('#q-go', () => { s.phase = 2; draw(); });
    if (s.checked) return;
    const toks = [...el.querySelectorAll('.tok')];
    const paint = () => { toks.forEach(t => t.classList.toggle('pick', !!sel[t.dataset.i])); const n = Object.keys(sel).length; const b = $('#q-check'); if (b){ b.disabled = !n; b.innerHTML = `Vérifier (<span id="q-n">${n}</span> mot${n>1?'s':''})`; } };
    const setRange = (base, a, b, mode) => { const lo = Math.min(a,b), hi = Math.max(a,b); s.picked = { ...base };
      for (let k = lo; k <= hi; k++){ if (mode) s.picked[k] = true; else delete s.picked[k]; } Object.keys(sel).forEach(k => delete sel[k]); Object.assign(sel, s.picked); s.picked = sel; paint(); };
    let lastPT = 'mouse';
    toks.forEach(t => {
      t.addEventListener('pointerdown', e => { lastPT = e.pointerType; if (e.pointerType === 'touch') return; e.preventDefault(); const i = +t.dataset.i;
        if (e.shiftKey && s.last !== null){ setRange({ ...sel }, s.last, i, true); return; }
        const mode = !sel[i], base = { ...sel }; setRange(base, i, i, mode); s.last = i;
        TOKDRAG = { move: j => setRange(base, i, j, mode), end: () => { TOKDRAG = null; draw(); } }; });
      t.addEventListener('click', () => { if (lastPT === 'touch'){ const i = +t.dataset.i; if (sel[i]) delete sel[i]; else sel[i] = true; s.last = i; draw(); } });
    });
  };
  const drawFix = () => {
    const D = DOCS[qi], s = S[qi]; let total = 0, ok = 0;
    const seg = (segs, rid) => segs.map((raw, si) => { const g = norm(raw), id = qi+'-'+rid+'-'+si; if (g.err) total++;
      if (!g.err) return `<span class="seg" data-ok="1">${g.t}</span>`;
      if (s.st[id] === 'ok'){ ok++; return `<span class="seg good">${g.fix}</span>`; }
      let pop = ''; if (s.open === id){ s.cache[id] = s.cache[id] || shuffle([g.fix, ...g.opts]);
        pop = `<span class="pop"><span class="h">Par quoi le remplacer ?</span>${s.cache[id].map(o => `<button data-pick="${id}" data-right="${o===g.fix?1:0}">${o}</button>`).join('')}</span>`; }
      return `<span class="seg bad" data-id="${id}" data-err="1">${g.t}${pop}</span>`; }).join('');
    const body = D.rows.map((r,ri) => r.h !== undefined ? `<div class="qh">${seg([r.h],'r'+ri)}</div>` : `<div class="qrow">${r.l ? `<span class="l" style="width:64px">${r.l}</span>` : ''}<span>${seg(r.s,'r'+ri)}</span></div>`).join('');
    const pct = ok/total, r = D.reader, line = r.lines[pct === 1 ? 4 : Math.min(3, Math.floor(pct*4))], full = ok === total;
    if (full && s.phase === 2){ s.phase = 3; if (allP3()) completePart('reperer'); }
    el.innerHTML = tabs() + stepper(s) + `<p class="hintbar">Clique sur chaque passage souligné en vagues et choisis la bonne correction. Regarde ${r.who} réagir.</p>
      <div class="quiz"><div class="cvwin"><div class="bar"><i></i><i></i><i></i><span>${D.title}</span></div><div class="qbody2">${body}</div></div>
      <aside class="reader">
        <div class="rd-who"><div class="rd-av">${r.emoji}</div><div><b>${r.who}</b><small>${r.role}</small></div></div>
        <div class="rd-bubble ${pct===1?'top':pct<.25?'low':''}">« ${line} »</div>
        <div><div class="rd-lab"><span>Bonne impression</span><b style="color:var(--mod-d)">${ok}/${total}</b></div><div class="meter ${pct===1?'full':''}"><i style="width:${pct*100}%"></i></div></div>
        ${s.msg ? `<div class="fb ko" style="margin:0"><b>Pas tout à fait.</b> ${s.msg}</div>` : ''}
        ${s.log.length ? `<div class="expl">${s.log.map(e => `<div><span><s>${e.t.trim()}</s> → <strong>${e.fix}</strong></span><small>${e.why}</small></div>`).join('')}</div>` : ''}
        ${full ? `<div class="fb ok" style="margin:0"><b>Lettre corrigée !</b> ${allP3() ? 'Partie validée.' : 'Passe à l\'autre lettre.'}</div><div class="btnrow">${allP3() ? `<button class="btn dark" onclick="location.hash='lettre/4'">${PARTS[3].title} →</button>` : `<button class="btn primary" id="f-next">Lettre suivante →</button>`}</div>` : ''}
      </aside></div>`;
    wire(el);
    el.querySelectorAll('.seg[data-err]').forEach(x => x.onclick = e => { if (e.target.closest('.pop')) return; s.open = s.open === x.dataset.id ? null : x.dataset.id; s.msg = null; draw(); });
    el.querySelectorAll('.seg[data-ok]').forEach(x => x.onclick = () => { x.classList.remove('shake'); void x.offsetWidth; x.classList.add('shake'); });
    el.querySelectorAll('[data-pick]').forEach(b => b.onclick = e => { e.stopPropagation(); const id = b.dataset.pick;
      if (b.dataset.right === '1'){ s.st[id] = 'ok'; s.open = null; s.msg = null; const [, rid, si] = id.split('-'); const row = D.rows[+rid.slice(1)]; const g = row.h !== undefined ? row.h : row.s[+si]; s.log.unshift(g); }
      else s.msg = "Relis : cette version garde le même défaut ou en ajoute un. Réessaie.";
      draw(); });
    const nx = $('#f-next'); if (nx) nx.onclick = () => { qi = S.findIndex(x => x.phase !== 3); if (qi < 0) qi = 0; draw(); };
  };
  const draw = () => { const s = S[qi]; (s.phase === 1 ? drawSpot : drawFix)(); };
  draw();
}

/* ---------------- Partie 1 ---------------- */
function initComprendre(el){
  const z = (k, inner) => `<div class="zone" data-z="${k}">${inner}</div>`;
  el.innerHTML = `<div class="anat">
    <div>${STEPS.map((s,i) => `<article class="step" data-i="${i}">
      <div class="t"><span class="n">${String(i+1).padStart(2,'0')}</span><h3>${s.t}</h3></div>
      <p class="x">${s.x}</p>
      <div style="display:grid;gap:10px"><div class="tip"><b>Astuce :</b> ${s.tip}</div><div class="avoid"><b>À éviter :</b> ${s.a}</div></div>
    </article>`).join('')}</div>
    <div class="stk">
      <div class="cap"><span>Exemple fictif : la lettre de Léa</span><b id="active-label"></b></div>
      <div class="ltdoc">
        <div class="lt-head">
          ${z('from','<div class="lt-from"><b>Léa Martin</b><br>Rue des Fleurs 12<br>5000 Namur<br>0470 12 34 56<br>lea.martin@mail.be</div>')}
          ${z('to','<div class="lt-to"><b>Librairie Page 7</b><br>Madame Leroy, libraire<br>Rue de la Gare 3<br>5000 Namur<div class="lt-date">Namur, le 7 octobre 2026</div></div>')}
        </div>
        ${z('obj','<div class="lt-obj"><b>Objet :</b> candidature pour le poste de vendeuse étudiante (offre du 3 octobre)</div>')}
        ${z('appel','<p>Madame Leroy,</p>')}
        ${z('intro','<p>J\'ai lu votre offre de vendeuse étudiante pour cet été : accueillir les clients et les conseiller sur leurs lectures correspond à ce que j\'aime faire.</p>')}
        ${z('motiv','<p>Je suis cliente de votre librairie depuis plusieurs années et j\'apprécie la façon dont votre équipe recommande des livres. Je voudrais apprendre ce métier auprès de vous.</p>')}
        ${z('atouts','<p>L\'été dernier, j\'ai été bénévole à la bibliothèque de mon quartier : j\'y ai conseillé les lecteurs et classé les livres rendus. Je suis disponible en juillet et en août, y compris le week-end.</p>')}
        ${z('rencontre','<p>Je serais heureuse de vous rencontrer pour vous parler de ma motivation.</p>')}
        ${z('polit','<p>Veuillez recevoir, Madame Leroy, mes sincères salutations.</p>')}
        ${z('sign','<p class="lt-sign">Léa Martin<br><small>Annexe : CV</small></p>')}
        ${z('format','<span class="filechip">📎 lea-martin-lettre-motivation.pdf</span>')}
      </div>
    </div>
  </div>`;
  const steps = [...el.querySelectorAll('.step')], zones = [...el.querySelectorAll('[data-z]')];
  const set = i => { steps.forEach((s,j) => s.classList.toggle('on', j === i)); zones.forEach(zn => zn.classList.toggle('on', zn.dataset.z === STEPS[i].z));
    $('#active-label').textContent = String(i+1).padStart(2,'0') + ' · ' + STEPS[i].t; };
  set(0);
  io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) set(+en.target.dataset.i); }), { rootMargin:'-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
}

/* ---------------- Partie 2 : expliquer, puis faire choisir ---------------- */
function initAdapter(el){
  const S = {};   // réponses de l'élève par exercice
  const exoHTML = (s) => {
    const st = S[s.k] || { sel:{}, done:false };
    const items = s.exo.items;
    return `<div class="exo"><div class="exo-h"><b>À toi de choisir</b><span>${s.exo.ctx}</span></div>
      <div class="exo-list">${items.map((it,i) => { const on = st.sel[i]; let c = 'xi' + (on ? ' on' : ''); let r = '';
        if (st.done){ const good = (!!on) === it[1]; c += good ? ' ok' : ' ko'; r = `<small>${good ? '' : (it[1] ? 'À mettre en avant. ' : 'À laisser de côté. ')}${it[2]}</small>`; }
        return `<button class="${c}" data-x="${s.k}-${i}" ${st.done?'disabled':''}><span class="bx">${st.done ? (((!!on)===it[1]) ? '✓' : '✗') : (on ? '✓' : '')}</span><div><b>${it[0]}</b>${r}</div></button>`; }).join('')}</div>
      <div class="btnrow" style="margin-top:12px">${st.done ? `<button class="btn" data-again="${s.k}">Recommencer</button><span class="msg" style="color:var(--mod-d)">${items.filter((it,i) => (!!st.sel[i]) === it[1]).length}/${items.length} bien classés</span>` : `<button class="btn primary" data-check="${s.k}">Vérifier mes choix</button><span class="hint2">Coche ce que tu mets en avant dans la lettre.</span>`}</div></div>`;
  };
  const draw = () => {
    el.innerHTML = `<div class="aw">
      <p class="aw-intro">Une lettre de motivation n'est jamais la même pour tout le monde : elle complète ton CV avec ce qu'il ne dit pas. Le recruteur lit vite, donc <b>tu choisis ce que tu mets en avant</b>. Pour choisir, pose-toi trois questions avant d'écrire.</p>
      <div class="q3">
        <div><b>1</b><h4>Qui va me lire ?</h4><p>Une libraire, un responsable d'agence, une association : chacun attend autre chose, et tu écris à une vraie personne.</p></div>
        <div><b>2</b><h4>Que cherche-t-il ?</h4><p>Relis l'annonce : ce qu'elle demande est ce qu'il veut voir. Sans annonce, cherche ce que fait l'entreprise.</p></div>
        <div><b>3</b><h4>Qu'est-ce que j'ai qui répond à ça ?</h4><p>Un stage, un job d'étudiant, du bénévolat, un projet d'école. Choisis un ou deux atouts et donne un exemple.</p></div>
      </div>
      <h2 class="aw-h2">Selon ta situation</h2>
      ${SIT_EX.map(s => `<section class="sit">
        <div class="sit-top"><span class="sit-n">Situation ${s.n}</span><h3>${s.title}</h3></div>
        <p class="sit-why"><b>Pourquoi c'est particulier :</b> ${s.why}</p>
        <p class="sit-wants"><b>Ce que l'employeur cherche :</b> ${s.wants}</p>
        <div class="sit-cols">
          <div class="card2 yes"><h4>Ce que tu mets en avant, et pourquoi</h4><ul>${s.push.map(x => `<li><b>${x[0]}.</b> ${x[1]}</li>`).join('')}</ul></div>
          <div class="card2 no"><h4>Ce que tu évites, et pourquoi</h4><ul>${s.avoid.map(x => `<li><b>${x[0]}.</b> ${x[1]}</li>`).join('')}</ul></div>
        </div>
        ${exoHTML(s)}
      </section>`).join('')}
      <h2 class="aw-h2">Selon le type de candidature, et quelques repères</h2>
      <p class="aw-intro" style="margin-top:0">Que tu répondes à une annonce ou que tu écrives sans offre, certaines règles restent les mêmes. Voici ce qui change et ce qu'il faut savoir.</p>
      <div class="secgrid">${TYPES.map(x => `<article class="seccard"><h4>${x.n}</h4><p class="seckey">${x.t}</p><p>${x.w}</p></article>`).join('')}</div>
      <div style="margin-top:22px"><button class="btn" onclick="location.hash='lettre/4'">Passer à l'écriture de ma lettre →</button></div>
    </div>`;
    el.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { const [k, i] = b.dataset.x.split('-'); S[k] = S[k] || { sel:{}, done:false }; S[k].sel[i] = !S[k].sel[i]; const y = scrollY; draw(); scrollTo(0, y); });
    el.querySelectorAll('[data-check]').forEach(b => b.onclick = () => { const k = b.dataset.check; S[k] = S[k] || { sel:{}, done:false }; S[k].done = true; const y = scrollY; draw(); scrollTo(0, y); });
    el.querySelectorAll('[data-again]').forEach(b => b.onclick = () => { S[b.dataset.again] = { sel:{}, done:false }; const y = scrollY; draw(); scrollTo(0, y); });
  };
  draw();
}

/* ---------------- Partie 4 : écrire sa lettre ---------------- */
const CIVS = ['Madame, Monsieur', 'Madame', 'Monsieur'];
const POLIT = [
  "Veuillez recevoir, {A}, mes sincères salutations.",
  "Je vous prie d'agréer, {A}, l'expression de mes salutations distinguées.",
  "Veuillez agréer, {A}, l'expression de mes salutations distinguées."
];
const SITS = { job:'Job étudiant', stage:'Stage scolaire', premier:'Premier emploi' };
const TYPS = { annonce:'Je réponds à une annonce', spontanee:'Candidature spontanée' };
const CLICHE = /esprit d'?\s?equipe|flexibilit|dynamique|motive|motivee|serieux|serieuse|passionne/;
const SMS = /\b(slt|stp|svp|mdr|ptdr|pk|pq|bcp|jsp|tkt|dsl|cc|bjr|cdlt|jpp|wesh|tt|pr)\b/i;
const norm2 = t => String(t||'').toLowerCase().replace(/[’‘]/g,"'").normalize('NFD').replace(/[̀-ͯ]/g,'');
const todayFR = () => { try{ return new Date().toLocaleDateString('fr-BE', { day:'numeric', month:'long', year:'numeric' }); }catch(e){ return ''; } };
function initEntrainer(el){
  let obj = { sit:'job', typ:'annonce' };
  try{ const o = JSON.parse(sessionStorage.getItem('kp-lettre-obj')||'null'); if (o && SITS[o.sit] && TYPS[o.typ]) obj = o; }catch(e){}
  const blank = () => ({ f:{ prenom:'', nom:'', rue:'', commune:'', tel:'', mail:'', entreprise:'', contact:'', fonction:'', adr:'', lieu:'', date:todayFR(), poste:'', ref:'', intro:'', motiv:'', atouts:'', rencontre:'' }, civ:0, polit:0, annexe:true });
  let D = blank();
  try{ const sv = JSON.parse(localStorage.getItem('kp-lettre-draft')||'null'); if (sv && sv.f){ D = { ...blank(), ...sv, f:{ ...blank().f, ...sv.f } }; if (sv.obj) obj = sv.obj; } }catch(e){}
  let sent = null;
  const save = () => { try{ localStorage.setItem('kp-lettre-draft', JSON.stringify({ f:D.f, civ:D.civ, polit:D.polit, annexe:D.annexe, obj })); }catch(e){} };

  /* ----- Aperçu ----- */
  const paras = t => String(t||'').split('\n').map(x => x.trim()).filter(Boolean);
  const nom = () => [D.f.prenom, D.f.nom].filter(Boolean).join(' ');
  const appel = () => { const c = CIVS[D.civ], n = D.f.contact.trim(); if (c === 'Madame, Monsieur') return c; return n ? `${c} ${n.split(/\s+/).slice(-1)[0]}` : c; };
  const objetTxt = () => { const p = D.f.poste.trim(); if (obj.typ === 'spontanee') return 'Candidature spontanée' + (p ? ', ' + p : ''); return 'Candidature' + (p ? ' pour le poste de ' + p : '') + (D.f.ref.trim() ? ' (' + D.f.ref.trim() + ')' : ''); };
  const paperHTML = forPrint => {
    const f = D.f, A = appel();
    const sender = [nom() || 'Ton prénom et ton nom', f.rue, [f.commune].filter(Boolean).join(' '), f.tel, f.mail].filter(Boolean);
    const dest = [f.entreprise, (CIVS[D.civ] !== 'Madame, Monsieur' && f.contact.trim() ? CIVS[D.civ] + ' ' : '') + f.contact.trim(), f.fonction, f.adr].map(x => x && x.trim()).filter(Boolean);
    const lieuDate = [f.lieu || f.commune, f.date && 'le ' + f.date].filter(Boolean).join(', ');
    const body = ['intro','motiv','atouts','rencontre'].map(k => paras(f[k]).map(p => `<p>${esc(p)}</p>`).join('')).join('');
    return `<div class="paper letter">
      <div class="lt2-head"><div class="lt2-from">${sender.map((x,i) => i ? esc(x) : `<b>${esc(x)}</b>`).join('<br>')}</div>
        <div class="lt2-to">${dest.map(esc).join('<br>')}${lieuDate ? `<div class="lt2-date">${esc(lieuDate)}</div>` : ''}</div></div>
      <div class="lt2-obj"><b>Objet :</b> ${esc(objetTxt())}</div>
      <p>${esc(A)},</p>${body}
      <p>${esc(POLIT[D.polit].replace('{A}', A))}</p>
      <p class="lt2-sign">${esc(nom())}${D.annexe ? '<br><small>Annexe : CV</small>' : ''}</p>
      ${forPrint ? '' : '<div class="pg">Fin de la page 1</div>'}</div>`;
  };

  /* ----- Analyse ----- */
  const evaluate = (paperH) => {
    const f = D.f, items = [], push = (ok, label, hint) => items.push([ok, label, hint]); const TODO = 'À compléter.';
    const miss = [!f.prenom && 'prénom', !f.nom && 'nom', !f.rue && 'adresse', !f.commune && 'commune', !f.tel && 'téléphone', !f.mail && 'adresse mail'].filter(Boolean);
    push(miss.length === 0, 'Tes coordonnées complètes', miss.length ? 'Manque : ' + miss.join(', ') + '.' : 'On peut te répondre facilement.');
    const ml = f.mail.trim(), fmt = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(ml), loc = norm2(ml.split('@')[0]), np = norm2(f.prenom), nn = norm2(f.nom);
    const fancy = /\d{3,}|gamer|cool|boss|love|baby|xx|princess|sexy|killer|swag|lol|mdr|king|queen/.test(loc);
    const hasName = (np.length > 1 && loc.includes(np.slice(0,3))) || (nn.length > 1 && loc.includes(nn.slice(0,3)));
    push(!!ml && fmt && !fancy && hasName, 'Adresse mail sobre', !ml ? TODO : !fmt ? 'Format attendu : prenom.nom@domaine.be' : fancy ? 'Évite les surnoms, les chiffres en série ou les mots fantaisistes.' : !hasName ? 'Utilise ton prénom et ton nom dans l\'adresse.' : 'Une adresse professionnelle.');
    const okDest = f.entreprise.trim().length > 1 && f.adr.trim().length > 4;
    push(okDest, 'Destinataire et adresse', !f.entreprise.trim() ? TODO : !f.adr.trim() ? 'Ajoute l\'adresse de l\'entreprise.' : 'L\'entreprise est bien désignée.');
    const hasContact = f.contact.trim().length > 2;
    push(obj.typ === 'annonce' || hasContact, 'Nom de la personne', hasContact ? 'La lettre s\'adresse à quelqu\'un.' : obj.typ === 'spontanee' ? 'Cherche le nom du contact : une candidature spontanée lui est adressée.' : 'Un nom, s\'il est dans l\'annonce, rend la lettre plus personnelle.');
    const okObj = f.poste.trim().length > 2 && (obj.typ === 'spontanee' || f.ref.trim().length > 2);
    push(okObj, 'Objet précis', !f.poste.trim() ? TODO : obj.typ === 'annonce' && !f.ref.trim() ? 'Ajoute la référence de l\'offre, par exemple « offre du 3 octobre ».' : 'L\'objet dit pourquoi tu écris.');
    const nI = norm2(f.intro), lenI = f.intro.trim().length;
    const worn = /par la presente|suite a votre annonce|je me permets/.test(nI);
    const ref = obj.typ === 'annonce' ? /offre|annonce|poste|recherch/.test(nI) : /poste|fonction|services|candidature|travailler/.test(nI);
    push(lenI >= 40 && lenI <= 400 && !worn && !CLICHE.test(nI) && ref, 'Introduction qui accroche', !lenI ? TODO : lenI < 40 ? 'Trop court : dis pour quel poste tu écris et ce que tu as compris.' : lenI > 400 ? 'Trop long : deux phrases suffisent.' : worn ? 'Évite « par la présente » et « suite à votre annonce » : sois plus direct.' : CLICHE.test(nI) ? 'Évite les formules toutes faites (« motivé », « dynamique »…).' : !ref ? (obj.typ === 'annonce' ? 'Montre que tu as lu l\'offre : cite le poste.' : 'Dis pour quel poste ou quelle fonction tu écris.') : 'Une entrée en matière claire.');
    const nM = norm2(f.motiv), ent = norm2(f.entreprise.trim()).split(/\s+/).filter(w => w.length > 3);
    const mentionsEnt = ent.length === 0 ? false : ent.some(w => nM.includes(w));
    push(f.motiv.trim().length >= 60 && mentionsEnt && !CLICHE.test(nM), 'Motivation propre à cette entreprise', !f.motiv.trim() ? TODO : f.motiv.trim().length < 60 ? 'Développe : pourquoi cette organisation te donne envie.' : !mentionsEnt ? 'Cite le nom de l\'entreprise ou un fait précis sur elle.' : CLICHE.test(nM) ? 'Évite les formules toutes faites : donne un fait.' : 'On sent que tu t\'es renseigné.');
    const nA = norm2(f.atouts), concrete = /\b(j'ai|jai|ai realise|ai participe|ai cree|ai conseille|ai aide|ai appris|stage|benevol|projet|club|job|ete dernier|pendant)\b/.test(nA) || /j'ai\s/.test(f.atouts.toLowerCase());
    push(f.atouts.trim().length >= 80 && concrete && !/voir mon cv|tout est dans mon cv/.test(nA) && !/candidat(e)? ideal|candidat(e)? que vous cherchez|le meilleur/.test(nA), 'Atouts appuyés sur un exemple', !f.atouts.trim() ? TODO : f.atouts.trim().length < 80 ? 'Développe : un exemple précis en deux phrases.' : /voir mon cv|tout est dans mon cv/.test(nA) ? 'Ne renvoie pas au CV : complète-le.' : /candidat(e)? ideal|candidat(e)? que vous cherchez|le meilleur/.test(nA) ? 'Évite de dire que tu es le meilleur : prouve-le par un fait.' : !concrete ? 'Raconte ce que tu as fait (stage, bénévolat, projet).' : 'Des faits concrets.');
    const sitOk = obj.sit === 'job' ? /disponib|juillet|aout|week-end|weekend|vacances|mercredi|horaire|soir/.test(norm2([f.intro,f.motiv,f.atouts,f.rencontre].join(' ')))
      : obj.sit === 'stage' ? /(apprendre|decouvrir|developper)/.test(norm2([f.motiv,f.atouts,f.rencontre].join(' '))) && /stage/.test(norm2([f.intro,f.motiv,f.atouts,f.rencontre,f.poste].join(' ')))
      : /(formation|diplome|etudes|stage|parcours)/.test(norm2([f.intro,f.motiv,f.atouts].join(' '))) && /(apprend|decouvr|evolu|progress|competence)/.test(norm2([f.intro,f.motiv,f.atouts].join(' ')));
    push(sitOk, obj.sit === 'job' ? 'Tes disponibilités' : obj.sit === 'stage' ? 'Ce que tu veux apprendre' : 'Le lien avec ton parcours', sitOk ? 'C\'est ce que l\'employeur cherche dans cette situation.' : obj.sit === 'job' ? 'Dis quand tu es disponible (périodes, jours, horaires).' : obj.sit === 'stage' ? 'Dis que tu cherches un stage et ce que tu veux apprendre ou développer.' : 'Relie ta formation ou tes stages au poste et dis ce que tu apprends vite.');
    const nR = norm2(f.rencontre);
    push(/rencontr|entretien|recevoir|echanger|discuter|presenter/.test(nR) && !/dans l'attente de votre reponse|d'avance|je vous contacterai bientot/.test(nR), 'Proposition de rencontre', !f.rencontre.trim() ? TODO : /dans l'attente de votre reponse|d'avance|je vous contacterai bientot/.test(nR) ? 'Évite ces formules banales : propose une rencontre.' : /rencontr|entretien|recevoir|echanger|discuter|presenter/.test(nR) ? 'La lettre se termine par une invitation.' : 'Propose de rencontrer l\'employeur pour parler de ta motivation.');
    const all = [f.intro, f.motiv, f.atouts, f.rencontre].join('\n'), tu = (norm2(all).match(/\b(tu|toi|ton|ta|tes|te|t')\b|\bt'/) || [])[0];
    push(all.trim().length > 20 && !tu, 'Vouvoiement', !all.trim() ? TODO : tu ? `« ${tu} » : on vouvoie l'employeur dans une lettre.` : 'Tu vouvoies l\'employeur.');
    push(D.annexe, 'Mention du CV joint', D.annexe ? 'Annexe : CV' : 'Coche « Annexe : CV » : tu joins ton CV.');
    push(paperH > 0 && paperH <= 1123, 'Une page', paperH <= 1123 ? 'La lettre tient dans la longueur conseillée.' : 'Dépasse une page : raccourcis (passe la ligne pointillée de l\'aperçu).');
    const issues = [];
    const sm = norm2(all).match(SMS); if (sm) issues.push(`abréviation « ${sm[0]} »`);
    if (/ {2,}/.test(all)) issues.push('double espace');
    const rep = (norm2(all).match(/\b([a-z]{3,})\s+\1\b/) || [])[1]; if (rep) issues.push(`mot répété « ${rep} »`);
    const shout = (all.match(/\b[A-ZÀ-Ý]{5,}\b/) || [])[0]; if (shout) issues.push(`MAJUSCULES « ${shout} »`);
    if (/!{2,}|\?{2,}/.test(all)) issues.push('ponctuation criée');
    if (/,[^\s\d]/.test(all)) issues.push('espace manquant après une virgule');
    push(all.trim().length > 20 && issues.length === 0, 'Orthographe et typographie', all.trim().length <= 20 ? TODO : issues.length ? issues.slice(0,2).join(' ; ') + '. Relis à voix haute et fais relire.' : 'Pas d\'erreur repérée. Fais quand même relire par quelqu\'un.');
    return items;
  };

  /* ----- Interface ----- */
  const inp = (k, lab, ph) => `<label>${lab}<input data-f="${k}" value="${esc(D.f[k])}" placeholder="${esc(ph||'')}"></label>`;
  const ta = (k, lab, ph, rows) => `<label>${lab}<textarea data-f="${k}" rows="${rows||3}" placeholder="${esc(ph||'')}">${esc(D.f[k])}</textarea></label>`;
  const HELP = {
    annonce:{ poste:'vendeur étudiant', ref:'offre du 3 octobre', intro:"J'ai lu votre offre de vendeur étudiant : accueillir et conseiller vos clients me correspond." },
    spontanee:{ poste:'vendeur étudiant', ref:'', intro:"Je souhaite vous offrir mes services comme vendeur étudiant dans votre librairie." }
  };
  const formHTML = () => { const H = HELP[obj.typ]; return `
    <div class="fm">
      <h3 style="margin-top:0">Toi</h3>
      <div class="g2">${inp('prenom','Prénom','Léa')}${inp('nom','Nom','Martin')}</div>
      <div class="g2">${inp('rue','Adresse (rue et numéro)','Rue des Fleurs 12')}${inp('commune','Code postal et commune','5000 Namur')}</div>
      <div class="g2">${inp('tel','Téléphone','0470 12 34 56')}${inp('mail','Adresse mail','lea.martin@mail.be')}</div>
      <h3>Le destinataire</h3>
      <div class="g2">${inp('entreprise',"Nom de l'entreprise",'Librairie Page 7')}${inp('adr',"Adresse de l'entreprise",'Rue de la Gare 3, 5000 Namur')}</div>
      <div class="g2">${inp('contact','Nom de la personne (si tu le connais)','Leroy')}${inp('fonction','Sa fonction','Libraire')}</div>
      <label>Comment t'adresses-tu à elle ?<select data-civ>${CIVS.map((c,i) => `<option value="${i}" ${i===D.civ?'selected':''}>${c}</option>`).join('')}</select></label>
      <div class="g2">${inp('lieu','Lieu (en haut de la lettre)','Namur')}${inp('date','Date','7 octobre 2026')}</div>
      <h3>L'objet</h3>
      <div class="g2">${inp('poste','Poste visé',H.poste)}${obj.typ === 'annonce' ? inp('ref',"Référence de l'offre",H.ref) : ''}</div>
      <h3>Introduction</h3>
      <span class="hint2">Montre que tu as compris l'offre, ou accroche dès la première phrase.</span>
      ${ta('intro','Ton introduction',H.intro,3)}
      <h3>Ta motivation</h3>
      <span class="hint2">Pourquoi cette entreprise, et pas une autre ?</span>
      ${ta('motiv','Ton paragraphe de motivation','',4)}
      <h3>Tes atouts</h3>
      <span class="hint2">Un ou deux atouts, chacun avec un exemple concret. Ne recopie pas ton CV.</span>
      ${ta('atouts','Ton paragraphe sur tes atouts','',4)}
      <h3>La proposition de rencontre</h3>
      ${ta('rencontre','Ta conclusion','Je serais heureuse de vous rencontrer pour vous parler de ma motivation.',2)}
      <h3>La fin de la lettre</h3>
      <label>Formule de politesse<select data-polit>${POLIT.map((p,i) => `<option value="${i}" ${i===D.polit?'selected':''}>${esc(p.replace('{A}','…'))}</option>`).join('')}</select></label>
      <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" data-annexe ${D.annexe?'checked':''} style="width:auto"> Mentionner « Annexe : CV »</label>
    </div>`; };
  const paintAll = () => {
    el.innerHTML = `<div class="obj"><span class="lab">Ma situation</span><div class="chips" style="margin:0">${Object.keys(SITS).map(k => `<button class="chip ${k===obj.sit?'on':''}" data-sit="${k}">${SITS[k]}</button>`).join('')}</div></div>
      <div class="obj"><span class="lab">Mon type de candidature</span><div class="chips" style="margin:0">${Object.keys(TYPS).map(k => `<button class="chip ${k===obj.typ?'on':''}" data-typ="${k}">${TYPS[k]}</button>`).join('')}</div></div>
      <p class="hintbar">Ta lettre reste sur ton appareil : rien n'est envoyé. Elle est enregistrée dans ce navigateur pour que tu la retrouves. Ces exemples sont des idées : écris avec tes propres mots.</p>
      <div class="build"><div>${formHTML()}</div>
        <div class="paperwrap"><div class="pscale" id="pscale"><div class="pinner" id="pinner"></div></div>
          <div class="btnrow" style="align-items:center"><button class="btn cta" id="p-export">Exporter en PDF</button><button class="btn" id="p-valid">Valider ma lettre</button><button class="btn" id="p-reset">Tout effacer</button></div>
          <span class="msg" id="p-msg"></span>
          <aside class="checks" id="p-checks" style="position:static"></aside></div></div>`;
    wire(); live();
  };
  const live = () => {
    const pi = $('#pinner'), ps = $('#pscale'); if (!pi) return;
    pi.innerHTML = paperHTML(false);
    const sc = Math.min(1, (ps.clientWidth - 20) / 794); pi.style.transform = `scale(${sc})`; pi.style.width = '794px';
    const pp = pi.firstElementChild; const pgl = pp && pp.querySelector('.pg'); if (pgl) pgl.style.display = 'none'; const h = pp ? pp.scrollHeight : 0; if (pgl) pgl.style.display = ''; ps.style.height = (Math.max(h, 1123) * sc + 20) + 'px';
    const list = evaluate(h), n = list.filter(c => c[0]).length, N = list.length;
    $('#p-checks').innerHTML = `<div class="top"><b>${n}/${N}</b><span style="font-size:13px;color:var(--muted)">Analyse de la lettre</span></div><div class="meter ${n===N?'full':''}"><i style="width:${n/N*100}%"></i></div>
      ${list.map(([ok,l,hh],i) => `<div class="ck ${ok?'ok':''}"><span class="m">${ok?'✓':i+1}</span><div>${l}<small>${hh}</small></div></div>`).join('')}
      <p class="hint2" style="margin-top:10px">Cette analyse est une aide : elle ne remplace pas une relecture par une personne.</p>`;
    const m = $('#p-msg'); m.textContent = sent === 'ok' ? `✓ Lettre validée, ${N}/${N}. Exporte-la en PDF !` : sent === 'ko' ? `Encore ${N-n} point${N-n>1?'s':''} à corriger avant de valider.` : ''; m.style.color = sent === 'ok' ? 'var(--success)' : 'var(--accent)';
    return [n, N];
  };
  const exportPDF = () => {
    const slug = t => String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\W+/g,'-').replace(/^-|-$/g,'').toLowerCase();
    const fn = [slug(D.f.prenom), slug(D.f.nom)].filter(Boolean).join('-');
    let root = $('#print-root'); if (!root){ root = document.createElement('div'); root.id = 'print-root'; root.className = 'print-root'; document.body.appendChild(root); }
    root.innerHTML = paperHTML(true);
    const old = document.title; document.title = fn ? fn + '-lettre-motivation' : 'lettre-motivation';
    const back = () => { document.title = old; window.removeEventListener('afterprint', back); };
    window.addEventListener('afterprint', back); window.print();
  };
  function wire(){
    el.querySelectorAll('[data-sit]').forEach(c => c.onclick = () => { obj.sit = c.dataset.sit; sent = null; try{ sessionStorage.setItem('kp-lettre-obj', JSON.stringify(obj)); }catch(e){} save(); paintAll(); });
    el.querySelectorAll('[data-typ]').forEach(c => c.onclick = () => { obj.typ = c.dataset.typ; sent = null; try{ sessionStorage.setItem('kp-lettre-obj', JSON.stringify(obj)); }catch(e){} save(); paintAll(); });
    el.querySelectorAll('[data-f]').forEach(i => i.oninput = e => { D.f[i.dataset.f] = e.target.value; sent = null; save(); live(); });
    const civ = el.querySelector('[data-civ]'); if (civ) civ.onchange = e => { D.civ = +e.target.value; sent = null; save(); live(); };
    const pol = el.querySelector('[data-polit]'); if (pol) pol.onchange = e => { D.polit = +e.target.value; sent = null; save(); live(); };
    const an = el.querySelector('[data-annexe]'); if (an) an.onchange = e => { D.annexe = e.target.checked; sent = null; save(); live(); };
    $('#p-export').onclick = exportPDF;
    $('#p-valid').onclick = () => { const r = live(); sent = r[0] === r[1] ? 'ok' : 'ko'; live(); if (sent === 'ok') completePart('entrainer'); };
    $('#p-reset').onclick = () => { if (confirm('Effacer tout ce que tu as saisi dans cette lettre ?')){ D = blank(); sent = null; save(); paintAll(); } };
  }
  window.addEventListener('resize', () => { if (location.hash === '#lettre/4') live(); });
  paintAll();
}

route();
