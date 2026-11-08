/* Données PEQ (Parcours d'Enseignement Qualifiant, FWB) : 2 options pilotes.
 *
 * RÈGLE : chaque compétence reprend l'intitulé officiel (champ `texte`), avec sa référence et sa source.
 * Rien n'est inventé. Un champ absent = « non trouvé ».
 * `couverture` dit ce que KeyPace propose AUJOURD'HUI (contenu réellement en ligne) :
 *   'couvert' | 'partiel' | 'manquant' | 'hors' (hors périmètre KeyPace) | 'a_verifier'
 * Relevé et citations : docs/PEQ-REFERENTIEL-RELEVE.md. PDF : dossier « Programme PEQ ».
 * Vérification d'intégrité : node scripts/check-peq-data.js
 * Compatible navigateur (window.PEQ_DATA) et Node (module.exports).
 */
(function (root) {
  'use strict';

  /* Contenu KeyPace réellement en ligne (état au 2026-11-07, voir index.html : MODS/NEW_MODS, live:true) */
  const L = {
    repos: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'],
    haut: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    bas: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
    mots: ['w1', 'w2', 'w3', 'w4', 'w5'],
    maj: ['maj1', 'maj2', 'maj3', 'maj4'],
    pon: ['pon1', 'pon2', 'pon3', 'pon4', 'pon5', 'pon6'],
    acc: ['acc1', 'acc2', 'acc3', 'acc4', 'acc5'],
    cir: ['cir1', 'cir2', 'cir3', 'cir4'],
    tre: ['tre1', 'tre2', 'tre3'],
    num: ['num1', 'num2', 'num3', 'num4', 'num5', 'num6'],
    sym: ['sym1', 'sym2', 'sym3', 'sym4', 'sym5', 'sym6', 'sym7', 'sym8', 'sym9'],
    flu: ['flu1', 'flu2', 'flu3', 'flu4', 'flu5', 'flu6']
  };
  const LECONS_BASE = [].concat(L.repos, L.haut, L.bas, L.mots);
  const LECONS_TEXTE = [].concat(L.maj, L.pon, L.acc, L.cir, L.tre);
  const LECONS_FLUIDITE = L.flu;
  const MODULES_EN_LIGNE = ['mail', 'cv', 'lettre', 'mot-de-passe', 'protection-donnees'];

  const SRC_CA = {
    doc: 'Profil de certification « Collaborateur·trice administratif·ive », option 7410, approuvé par le Gouvernement le 21 février 2024',
    fichier: 'Programme PEQ/PC_Collaborateur_administratif.pdf',
    portail: 'https://lequalifiant.be/le-parcours-denseignement-qualifiant-peq/profils-de-certification'
  };
  const SRC_TB = {
    doc: 'Profil de formation CCPQ « Technicien/Technicienne de bureau » (CCPQ S7 Économie)',
    fichier: 'Programme PEQ/PF_CCPQ_Technicien_de_bureau.pdf',
    portail: 'https://lequalifiant.be/le-parcours-denseignement-qualifiant-peq/profils-de-formation-ccpq',
    note: 'Statut actuel de ce profil CCPQ par option : à confirmer.'
  };

  const c = (ref, texte, couverture, kp, extra) =>
    Object.assign({ ref, texte, couverture, kp: kp || { cours: [], exercices: [] } }, extra || {});
  const lecons = (ids) => ids.map((id) => ({ type: 'lecon', id }));
  const mod = (id) => [{ type: 'module', id }];
  const test = [{ type: 'test-vitesse', id: 'test-vitesse' }];

  const COLLAB_ADMIN = {
    id: '7410',
    code: '7410',
    titre: 'Collaborateur·trice administratif·ive',
    forme: 'Professionnelle',
    annees: '4e, 5e, 6e (ordinaire ou spécialisé de forme 4)',
    niveauCFC: 3,
    source: SRC_CA,
    uaa: [
      {
        id: 'UAA1', titre: 'Assurer l’accueil et la communication au sein de l’entreprise ou de l’institution',
        competences: [
          c('1.1.1', 'Assurer un accueil professionnel (se présenter, présenter l’organisation, identifier le visiteur et l’objet de sa visite, aiguiller le visiteur vers le service ou la personne concernée)', 'hors'),
          c('1.1.2', 'Gérer toute situation particulière d’accueil (savoir appliquer la procédure en cas de problème, par ex. relationnel)', 'hors'),
          c('1.1.3', 'Prendre note des messages et les transmettre (via différents outils)', 'manquant', { cours: mod('notes'), exercices: [] }, { note: 'Module « Prendre des notes » prévu, pas encore en ligne.' }),
          c('1.1.4', 'Utiliser et gérer des agendas (papier et/ou électronique)', 'manquant'),
          c('1.2.1', 'Assurer un accueil téléphonique professionnel (se présenter, présenter l’organisation, identifier le visiteur et l’objet de sa visite, aiguiller le visiteur vers le service ou la personne concernée)', 'hors'),
          c('1.2.2', 'Emettre des appels', 'hors'),
          c('1.2.3', 'Assurer le suivi des appels entrants et/ou sortants (filtrer, évaluer la priorité de la demande, transmettre l’appel, inciter à retéléphoner, prendre un message et le transmettre, consulter l’agenda…)', 'manquant', { cours: mod('notes'), exercices: [] }, { note: 'Volet prise de message couvert par le futur module Prendre des notes ; volet téléphonique hors KeyPace.' }),
          c('1.2.4', 'Gérer tout appel particulier (savoir appliquer la procédure en cas de problème, par ex. relationnel)', 'hors'),
          c('1.2.5', 'Utiliser les équivalents numériques des outils téléphoniques', 'manquant'),
          c('1.2.6', 'Utiliser et gérer des agendas (papier et/ou électronique)', 'manquant'),
          c('1.3.1', 'Réceptionner et distribuer le courrier entrant', 'hors'),
          c('1.3.2', 'Traiter le courrier sortant', 'hors'),
          c('1.4.1', 'Maitriser son empreinte numérique et celle de l’entreprise (e-réputation, médias sociaux…)', 'partiel', { cours: mod('protection-donnees'), exercices: [] }, { note: 'Le module couvre données personnelles, cookies, hameçonnage ; e-réputation et médias sociaux non vérifiés.' }),
          c('1.4.2', 'Utiliser les différents canaux numériques (chat interne, blog, intranet….)', 'manquant', null, { note: 'Seul le courriel est traité par KeyPace : le chat interne, le blog et l’intranet ne sont pas couverts.' }),
          c('1.5.1', 'Utiliser et comprendre un vocabulaire de base oral (niveau A2)', 'hors'),
          c('1.5.2', 'Utiliser et comprendre un vocabulaire de base écrit (niveau A2)', 'hors')
        ]
      },
      {
        id: 'UAA2', titre: 'Gérer des écrits, des données et des dossiers',
        competences: [
          c('2.1.1', 'Prendre des notes (papier et/ou électronique)', 'manquant', { cours: mod('notes'), exercices: [] }, { note: 'Module « Prendre des notes » prévu, pas encore en ligne. La frappe rapide aide à la prise de notes électronique.' }),
          c('2.1.2', 'Compléter des documents types (papier et/ou électronique)', 'manquant', { cours: mod('formulaire'), exercices: [] }, { note: 'Module « Remplir un formulaire » prévu, pas encore en ligne.' }),
          c('2.1.3', 'Elaborer des rapports et des comptes rendus succinctement (traitement de texte)', 'partiel', { cours: [].concat(lecons(LECONS_TEXTE), lecons(LECONS_FLUIDITE)), exercices: test }, { note: 'KeyPace entraîne la saisie du texte (frappe, accents, ponctuation) ; la rédaction du compte rendu et le logiciel de traitement de texte ne sont pas enseignés.' }),
          c('2.1.4', 'Mettre en page selon le contexte (traitement de texte)', 'manquant', { cours: mod('word'), exercices: [] }, { note: 'Module « Mise en page d’un document » prévu, pas encore en ligne.' }),
          c('2.1.5', 'Produire et utiliser des supports de visualisation (ex. : outils de présentation)', 'manquant'),
          c('2.1.6', 'Imprimer et diffuser des écrits', 'manquant'),
          c('2.2.1', 'Examiner, enregistrer, mettre à jour, contrôler, corriger ou faire corriger et extraire des données', 'partiel', { cours: [].concat(lecons(L.num), mod('pave')), exercices: [] }, { note: 'La saisie des chiffres est entraînée ; le pavé numérique dédié n’est pas en ligne ; pas de travail sur une base de données.' }),
          c('2.2.2', 'Produire des tableaux ou des listes simples (statistiques ou autres)', 'manquant'),
          c('2.2.3', 'Utiliser des outils numériques (tableurs, ERP…) en lien avec la gestion des données', 'manquant'),
          c('2.3.1', 'Recueillir les éléments nécessaires à la constitution d’un dossier', 'hors'),
          c('2.3.2', 'Examiner et traiter (vérifier, corriger, compléter et suivre) des documents et des dossiers', 'hors'),
          c('2.3.3', 'Assurer et tenir à jour l’archivage (système papier et/ou électronique)', 'manquant', { cours: mod('fichiers'), exercices: [] }, { note: 'Module « Ranger et retrouver ses fichiers » prévu, pas encore en ligne.' })
        ]
      },
      {
        id: 'UAA3', titre: 'Soutenir les activités de l’entreprise ou de l’institution',
        competences: [
          c('3.1.1', 'Assurer les tâches administratives et logistiques liées à la préparation des activités (ex. : ordre du jour, invitations, préparation des fardes de documents, réservation de salle et de matériel…)', 'manquant', null, { note: 'Le module Rédiger un mail apprend à écrire une invitation simple ; l’ordre du jour, les fardes de documents et la réservation de salle ne sont pas traités.' }),
          c('3.1.2', 'Fournir un soutien administratif et logistique pendant le déroulement des activités (ex. : prise de notes…)', 'manquant', { cours: mod('notes'), exercices: [] }),
          c('3.1.3', 'Assurer le suivi administratif et logistique relatif aux activités (ex. : rédaction de comptes rendus, envoi, bilan…)', 'manquant', null, { note: 'L’envoi par courriel est couvert par le module Rédiger un mail ; la rédaction de comptes rendus et le bilan ne sont pas traités.' }),
          c('3.2.1', 'Assurer un suivi du stock (vérifier le stock, constater les pénuries, passer des commandes)', 'hors'),
          c('3.2.2', 'Traiter et suivre les commandes de matériel et/ou de consommables, les stocks et les renvois de produits', 'hors'),
          c('3.2.3', 'Vérifier et ranger les produits livrés', 'hors'),
          c('3.3.1', 'Suivre des commandes, des paiements, des budgets, des factures…', 'hors'),
          c('3.3.2', 'Rédiger des documents commerciaux de base', 'manquant', { cours: mod('commande'), exercices: [] }, { note: 'Module « Répondre à une commande » prévu, pas encore en ligne.' }),
          c('3.3.3', 'Apporter une aide à l’encodage des données comptables', 'partiel', { cours: lecons(L.num), exercices: [] }, { note: 'Entraînement à la saisie des chiffres seulement ; pas de logiciel comptable.' }),
          c('3.4.1', 'Elaborer des fichiers clients ou prospects', 'manquant'),
          c('3.4.2', 'Apporter une aide à l’encodage des données commerciales', 'partiel', { cours: lecons(L.num), exercices: [] }, { note: 'Entraînement à la saisie des chiffres seulement.' }),
          c('3.4.3', 'Appuyer le commercial dans ses contacts avec les clients (gestion de son agenda, transmission de questions…)', 'hors'),
          c('3.4.4', 'Communiquer les données techniques et commerciales aux clients, vendeurs (délais de fabrication, de livraison, disponibilité des produits, prix, paiement…)', 'manquant', null, { note: 'Le module Rédiger un mail apprend le ton à adopter avec un client ; les données commerciales (délais, prix, paiement) ne sont pas enseignées.' }),
          c('3.4.5', 'Enregistrer et contrôler les commandes et informer le client ou le vendeur à ce propos (délais de livraison, emballage…)', 'manquant', { cours: mod('commande'), exercices: [] }),
          c('3.4.6', 'Consolider les relations clients et/ou fournisseurs', 'hors'),
          c('3.4.7', 'Proposer des solutions aux problèmes courants (livraison, garantie…)', 'hors'),
          c('3.5.1', 'Suivre et mettre à jour les dossiers individuels des travailleurs', 'hors'),
          c('3.5.2', 'Apporter une aide à l’encodage des données RH', 'partiel', { cours: lecons(L.num), exercices: [] }, { note: 'Entraînement à la saisie des chiffres seulement.' })
        ]
      },
      {
        id: 'EXIG', titre: 'Exigences transversales (4.1)',
        competences: [
          c('4.1.4', 'Respecter les règles liées à l’ergonomie et à la manutention', 'manquant', { cours: mod('posture'), exercices: [] }, { note: 'Module « Bien s’installer devant le clavier » construit en preview, pas encore en ligne. Le profil parle d’ergonomie et de manutention en général.' }),
          c('4.1.6', 'Respecter la confidentialité (discrétion, secret professionnel)', 'partiel', { cours: mod('protection-donnees'), exercices: [] }, { note: 'Sujet voisin (protection des données) ; secret professionnel non traité.' })
        ]
      }
    ],
    /* Pas d'UAA4 détaillée ici : langue étrangère, hors périmètre. */
    nonInclus: 'UAA4 (langue étrangère) et les exigences transversales 4.1.1-4.1.3, 4.1.5, 4.1.7.'
  };

  const SEUIL_FRAPPE = { motsParMinute: 30, minutes: 10, erreursMaxPourcent: 0.5, aLAveugle: true, correctionAutorisee: true,
    source: 'Profil de formation CCPQ « Technicien/Technicienne de bureau », compétence 5.3.2' };

  /* Paliers de frappe de la compétence 5.3.2, par année (proposition KeyPace).
   * origine : 'proposition KeyPace' | 'a_verifier' | 'officiel'. Seul le palier de 6e vient d'un texte officiel. */
  const PALIERS_FRAPPE = {
    4: { texte: 'Frappe à l’aveugle acquise, environ 15 à 20 mots par minute.', origine: 'proposition KeyPace', source: 'Proposition KeyPace (pas un texte officiel).' },
    5: { texte: '20 à 25 mots par minute.', origine: 'a_verifier', source: 'Programme WBE Technicien de bureau 406-2011-248B : abandon du cache-clavier à 20-25 mots/minute', note: 'Source indiquée par l’équipe KeyPace ; le document n’a pas été retrouvé en ligne : à vérifier.' },
    6: { texte: '30 mots par minute pendant 10 minutes, avec 0,5 % d’erreurs au maximum.', origine: 'officiel', source: 'Profil de formation CCPQ « Technicien/Technicienne de bureau », compétence 5.3.2' }
  };

  /* Progression conseillée par année (4, 5 ou 6) : PROPOSITION KEYPACE.
   * Le PEQ ne fixe pas d'année par compétence : chaque réseau publie un schéma de passation, puis l'école répartit.
   * Les compétences « hors » KeyPace n'ont pas d'année. Une compétence peut figurer dans plusieurs années (5.3.2). */
  const PROGRESSION_NOTE = 'Répartition proposée par KeyPace. Ton école répartit les compétences selon le schéma de passation de son réseau.';
  const PROGRESSION = {
    '7410': {
      4: ['4.1.4', '2.1.3', '2.2.1', '1.4.1', '1.4.2', '4.1.6'],
      5: ['2.1.1', '1.1.3', '1.2.3', '2.1.2', '2.1.4', '3.3.3', '3.4.2', '3.5.2', '1.1.4', '1.2.6'],
      6: ['3.1.1', '3.1.2', '3.1.3', '3.3.2', '3.4.4', '3.4.5', '3.4.1', '2.2.2', '2.2.3', '2.3.3', '2.1.5', '2.1.6', '1.2.5']
    },
    'technicien-de-bureau': {
      4: ['8.1.11', '5.3.1', '3.5.1', '5.3.2'],
      5: ['5.3.3', '9.2.2', '9.4.2', '4.3.1', '5.3.4', '5.3.6', '8.1.5', '5.3.2'],
      6: ['5.3.2', '6.1.1', '6.2.1', '5.3.5', '5.3.7', '5.3.9']
    }
  };
  function appliquerProgression(o) {
    const prog = PROGRESSION[o.id] || {};
    o.progressionSource = 'proposition KeyPace';
    o.progressionNote = PROGRESSION_NOTE;
    o.uaa.forEach((u) => u.competences.forEach((c) => {
      if (c.couverture === 'hors') return;
      const ys = [4, 5, 6].filter((y) => (prog[y] || []).indexOf(c.ref) > -1);
      if (ys.length) { c.anneeConseillee = ys[0]; c.anneesConseillees = ys; }
    }));
  }

  const TECH_BUREAU = {
    id: 'technicien-de-bureau',
    code: '7212',
    codeNote: 'Code relevé dans la circulaire n° 6761 du 27/07/2018 (grilles-horaires de référence, 3e degré technique de qualification, secteur 7 Économie, groupe 72 Secrétariat). À confirmer pour l’année en cours.',
    titre: 'Technicien/Technicienne de bureau',
    forme: 'Technique de qualification',
    annees: '4e, 5e, 6e (à vérifier : certaines écoles l’organisent en 5e-6e)',
    anneesNote: 'La circulaire n° 6761 (2018) ne liste cette option qu’en 5e et 6e technique de qualification (3e degré) dans les grilles de référence de Wallonie-Bruxelles Enseignement.',
    source: SRC_TB,
    extrait: true,
    uaa: [
      {
        id: 'F03-F04', titre: 'Fonctions 03 et 04 : trier, vérifier, expédier le courrier (volet électronique)',
        competences: [
          c('3.5.1', 'Utiliser les principales fonctions d’un logiciel de communication.', 'manquant', null, { note: 'KeyPace apprend à écrire un mail ; consulter et trier une boîte de réception n’est pas traité.' }),
          c('4.3.1', 'Expédier le courrier électronique de façon professionnelle.', 'couvert', { cours: mod('mail'), exercices: [] }, { indicateurs: 'en tenant compte de la netiquette (règles d’éthique…) ; des règles administratives (signature…)', note: 'Entraînement dans un simulateur de messagerie : destinataire, objet, ton, formule de politesse, signature et pièce jointe. L’usage du vrai logiciel se fait à l’école.' })
        ]
      },
      {
        id: 'F05', titre: 'Fonction 05 : enregistrer, saisir, consulter des données',
        competences: [
          c('5.3.1', 'Gérer professionnellement le système d’exploitation.', 'manquant', { cours: mod('fichiers'), exercices: [] }, { indicateurs: 'gérer des fichiers, effectuer des copies de sauvegarde, utiliser adéquatement les outils d’aide' }),
          c('5.3.2', 'Utiliser le clavier principal et numérique avec une dextérité et une rapidité professionnelles en intégration avec les fonctions de base d’un logiciel de traitement de texte.', 'partiel',
            { cours: [].concat(lecons(LECONS_BASE), lecons(LECONS_TEXTE), lecons(L.num), lecons(LECONS_FLUIDITE)), exercices: test },
            { seuil: SEUIL_FRAPPE, paliers: PALIERS_FRAPPE,
              indicateurs: 'L’apprenant frappe un texte à l’aveugle, à la vitesse de 30 mots/minute, pendant 10 minutes, avec une tolérance d’erreur de 0,5%, l’utilisation de tout procédé de correction étant autorisée en cours de travail. Il / elle assure la mise en page, la mise en forme automatique des paragraphes, la fonction « couper – copier- coller », la recherche – le remplacement…',
              note: 'Frappe : couverte (leçons, test de vitesse jusqu’à 10 minutes). Traitement de texte intégré : non couvert. Le profil ne définit pas le « mot » ; KeyPace compte les caractères divisés par 5, à confirmer avant d’afficher une équivalence.' }),
          c('5.3.3', 'Utiliser un logiciel de traitement de texte : créer, saisir, modifier et imprimer tout document professionnel (lettre, compte-rendu, formulaire, rapport, etc.) selon les normes d’édition et selon les usages en matière d’écriture, de disposition, de présentation graphique', 'partiel', { cours: mod('word'), exercices: [] }, { note: 'Module de mise en page prévu, pas encore en ligne.' }),
          c('5.3.4', 'Saisir des textes rédigés dans une langue étrangère, à partir de supports écrits.', 'a_verifier', { cours: [], exercices: [] }, { indicateurs: 'frappe un texte écrit dans une langue étrangère avec une tolérance d’erreur de 1%', note: 'Dépend du cours en anglais en construction (voir mémoire projet anglais).' }),
          c('5.3.5', 'Utiliser un logiciel de gestion de fichiers, consulter les données d’une base.', 'manquant'),
          c('5.3.6', 'Utiliser les principales fonctions d’un logiciel tableur', 'manquant'),
          c('5.3.7', 'Utiliser les principales fonctions d’un logiciel comptable', 'manquant'),
          c('5.3.8', 'Utiliser un logiciel de paie et de gestion des ressources humaines (logiciel spécifique au service ou émanant d’un secrétariat social)', 'hors'),
          c('5.3.9', 'Utiliser conjointement différents logiciels (traitement de texte, base de données, tableur, inter et intranet, PAO, PreAO…) pour un travail donné.', 'manquant')
        ]
      },
      {
        id: 'F06', titre: 'Fonction 06 : mettre en forme des données',
        competences: [
          c('6.1.1', 'Améliorer la structure d’un long document :', 'manquant', { cours: mod('word'), exercices: [] }),
          c('6.2.1', 'Réaliser un publipostage, éditer des étiquettes, personnaliser des envois.', 'manquant')
        ]
      },
      {
        id: 'F08-F09', titre: 'Fonctions 08 et 09 : organiser et rédiger (extraits)',
        competences: [
          c('8.1.5', 'Utiliser les auxiliaires électroniques d’organisation du travail (agendas, fichiers, annuaires, indicateurs, répertoires, etc.)', 'manquant'),
          c('8.1.11', 'Proposer une implantation ergonomique du poste de travail.', 'manquant', { cours: mod('posture'), exercices: [] }, { note: 'Module posture construit en preview, pas encore en ligne.' }),
          c('9.2.2', 'Rédiger une lettre courante à partir de consignes écrites (document annoté) ou orales (indications enregistrées ou notées sous la dictée).', 'manquant', null, { note: 'La lettre de motivation est une lettre précise ; la lettre courante à partir d’un document annoté ou d’une dictée n’est pas traitée.' }),
          c('9.4.2', 'Rédiger des lettres simples :', 'partiel', { cours: mod('lettre'), exercices: [] }, { note: 'Le module Lettre de motivation apprend à adapter un modèle de lettre à sa situation, pour la lettre de motivation seulement.' })
        ]
      }
    ],
    nonInclus: 'Fonctions 01, 02, 07, 10, 11 et les autres compétences des fonctions 03 à 09 (accueil, téléphone, tri du courrier, base de données, arithmétique commerciale, contrats, classement, insertion professionnelle). Voir le PDF.'
  };

  const SRC_CIRC = 'Code relevé dans la circulaire n° 6761 du 27/07/2018 (grilles-horaires de référence, 3e degré technique de qualification, secteur 7 Économie). À confirmer pour l’année en cours.';

  /* Options ajoutées le 2026-11-08 : seulement les compétences liées au clavier, au numérique et à l'écrit.
   * Pas de progression par année : aucune année n'est proposée tant que rien ne la justifie. */
  const COMPTA = {
    id: 'technicien-en-comptabilite',
    code: '7124',
    codeNote: SRC_CIRC,
    titre: 'Technicien/Technicienne en comptabilité',
    forme: 'Technique de qualification',
    annees: '5e, 6e (3e degré, selon la circulaire n° 6761 de 2018)',
    source: {
      doc: 'Profil de formation CCPQ « Technicien/Technicienne en comptabilité » (CCPQ S7 Économie, accord du Conseil général du 15 juin 2006)',
      fichier: 'Programme PEQ/PF_CCPQ_Technicien_comptabilite.pdf',
      portail: 'https://lequalifiant.be/le-parcours-denseignement-qualifiant-peq/profils-de-formation-ccpq',
      note: 'Profil ancien : son statut actuel par option est à confirmer, un profil SFMQ a pu le remplacer.'
    },
    extrait: true,
    uaa: [
      { id: 'F01', titre: 'Fonction 01 : gérer la facturation fournisseurs, documents à l’entrée', competences: [
        c('1.3.1', 'Utiliser un logiciel comptable.', 'manquant', null, { note: 'KeyPace ne propose pas de logiciel comptable.' }),
        c('1.5.1', 'Connaître la procédure du logiciel relative aux achats et saisir les écritures dans le journal des achats.', 'partiel', { cours: lecons(L.num), exercices: [] }, { note: 'KeyPace entraîne la saisie des chiffres ; la procédure du logiciel comptable n’est pas couverte.' })
      ] },
      { id: 'F02', titre: 'Fonction 02 : gérer la facturation clients, documents à la sortie', competences: [
        c('2.6.1', 'Enregistrer les documents à l’aide d’un logiciel comptable : saisir les écritures dans les journaux des ventes.', 'partiel', { cours: lecons(L.num), exercices: [] }, { note: 'KeyPace entraîne la saisie des chiffres ; le logiciel comptable n’est pas couvert.' })
      ] },
      { id: 'F04', titre: 'Fonction 04 : gérer les documents financiers', competences: [
        c('4.6.1', 'Sur base de lettres-types, gérer les créances impayées.', 'manquant', null, { note: 'Le profil demande d’adapter, de mettre en page et d’éditer une lettre-type (par exemple un rappel pour retard de paiement). KeyPace ne propose pas ce travail.' }),
        c('4.8.1', 'Appliquer la procédure du logiciel relative aux opérations financières et saisir les écritures dans les journaux des opérations financières.', 'partiel', { cours: lecons(L.num), exercices: [] }, { note: 'KeyPace entraîne la saisie des chiffres ; le logiciel comptable n’est pas couvert.' })
      ] },
      { id: 'F05', titre: 'Fonction 05 : effectuer des opérations diverses courantes', competences: [
        c('5.3.2', 'Compléter une lettre-type.', 'manquant', null, { note: 'KeyPace ne propose pas de travail sur les lettres-types commerciales.' }),
        c('5.4.2', 'Enregistrer les documents et appliquer la procédure du logiciel relative aux O.D. et saisir les écritures dans les différents journaux des O.D.', 'partiel', { cours: lecons(L.num), exercices: [] }, { note: 'KeyPace entraîne la saisie des chiffres ; le logiciel comptable n’est pas couvert.' })
      ] },
      { id: 'F06', titre: 'Fonction 06 : participer aux travaux de fin d’exercice et aux clôtures intermédiaires', competences: [
        c('6.1.1', 'A l’aide d’un logiciel comptable, selon les directives du comptable, enregistrer et comptabiliser :', 'manquant', null, { note: 'KeyPace ne propose pas de logiciel comptable.' })
      ] }
    ],
    nonInclus: 'Les compétences de comptabilité (plan comptable, TVA, échéanciers, stocks, clôtures) et la fonction 07 (insertion professionnelle). Le profil ne mentionne pas explicitement le clavier ni la vitesse de frappe.'
  };

  const TECH_COMMERCIAL = {
    id: 'technicien-commercial',
    code: '7123',
    codeNote: SRC_CIRC,
    titre: 'Technicien commercial / Technicienne commerciale',
    forme: 'Technique de qualification',
    annees: '5e, 6e (3e degré, selon la circulaire n° 6761 de 2018)',
    source: {
      doc: 'Profil de formation CCPQ « Technicien commercial / Technicienne commerciale » (CCPQ S7 Économie, accord du Conseil général du 29 juin 2000)',
      fichier: 'Programme PEQ/PF_CCPQ_Technicien_commercial.pdf',
      portail: 'https://lequalifiant.be/le-parcours-denseignement-qualifiant-peq/profils-de-formation-ccpq',
      note: 'Profil ancien : son statut actuel par option est à confirmer, un profil SFMQ a pu le remplacer.'
    },
    extrait: true,
    uaa: [
      { id: 'F05', titre: 'Fonction 05 : utiliser les outils informatiques', competences: [
        c('5.1.1', 'Adapter les fonctions du logiciel à la situation de travail.', 'manquant', { cours: mod('word'), exercices: [] }, { note: 'Rubrique 5.1 : exploiter les fonctions de base d’un logiciel de traitement de texte. Module « Mise en page d’un document » prévu, pas encore en ligne.' }),
        c('5.1.2', 'Compléter des lettres-types adaptées à des situations commerciales courantes :', 'partiel', { cours: mod('lettre'), exercices: [] }, { note: 'Le module Lettre de motivation apprend à adapter un modèle de lettre à sa situation ; les lettres commerciales ne sont pas traitées.' }),
        c('5.2.1', 'Utiliser les fonctions courantes d’un logiciel de base de données : consultation, ajout, modification, suppression de données ; création de fichiers (clients, marchandises et fournisseurs).', 'manquant', null, { note: 'KeyPace ne propose pas de travail sur une base de données.' }),
        c('5.3.1', 'Adapter les fonctions du logiciel à la situation de travail.', 'manquant', null, { note: 'Rubrique 5.3 : exploiter les fonctions de base d’un tableur. KeyPace ne propose pas de tableur.' }),
        c('5.3.2', 'Créer et modifier des feuilles de calcul.', 'manquant', null, { note: 'KeyPace ne propose pas de tableur.' }),
        c('5.4.1', 'Utiliser les principales fonctions du logiciel, notamment :', 'partiel', { cours: lecons(L.num), exercices: [] }, { note: 'Rubrique 5.4 : logiciel comptable incluant la facturation et la gestion des stocks. KeyPace entraîne la saisie des chiffres ; le logiciel n’est pas couvert.' }),
        c('5.4.2', 'Effectuer des tâches comptables courantes :', 'manquant', null, { note: 'KeyPace ne propose pas de logiciel comptable ni de caisse.' }),
        c('5.4.3', 'Tenir à jour des inventaires à partir d’un logiciel.', 'manquant', null, { note: 'KeyPace ne propose pas de logiciel d’inventaire.' }),
        c('5.5.1', 'Transmettre et recevoir de l’information par messagerie, par courrier électronique, par fax-modem.', 'partiel', { cours: mod('mail'), exercices: [] }, { note: 'Le module Rédiger un mail couvre l’envoi d’un courriel ; la réception et le fax-modem ne sont pas traités.' }),
        c('5.5.2', 'Chercher de l’information dans un réseau interne et externe.', 'manquant', { cours: mod('recherche'), exercices: [] }, { note: 'Module « Écrire une recherche » prévu, pas encore en ligne.' })
      ] }
    ],
    nonInclus: 'Toutes les autres fonctions (marketing, argumentation de vente, processus achat-vente, communication, sécurité, insertion professionnelle). Le profil ne mentionne pas explicitement le clavier ni la vitesse de frappe.'
  };

  [COLLAB_ADMIN, TECH_BUREAU].forEach(appliquerProgression);

  const PEQ_DATA = {
    version: 1,
    genere: '2026-11-07',
    moduleEnLigne: MODULES_EN_LIGNE,
    options: [COLLAB_ADMIN, TECH_BUREAU, COMPTA, TECH_COMMERCIAL]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PEQ_DATA;
  else root.PEQ_DATA = PEQ_DATA;
})(typeof window !== 'undefined' ? window : this);
