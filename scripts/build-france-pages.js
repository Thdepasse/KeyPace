// Génère les trois pages d'établissement de la France : ecoles-france.html, dactylographie-college.html, dactylographie-lycee.html.
// Elles reprennent l'habillage (style, en-tête, pied de page) de dactylographie-primaire.html ; le texte est celui de la France (CRCN, Pix, voies,
// financement par collectivité, GAR). Les jalons et les leçons de chaque classe sont lus dans programme-data.js : un seul endroit à tenir à jour.
// Aucun formulaire : l'API des établissements est belge (réseaux, subvention MANOLO). Le contact passe par l'adresse mail.
// Usage : node scripts/build-france-pages.js   (écrit les trois fichiers à la racine)
const fs = require('fs');
const path = require('path');
const P = require('../programme-data.js');

const root = path.join(__dirname, '..');
const base = fs.readFileSync(path.join(root, 'dactylographie-primaire.html'), 'utf8');
const BASE = 'https://keypace.be';
const style = base.slice(base.indexOf('<style>'), base.indexOf('</style>') + 8);
const footer = base.slice(base.indexOf('<footer>'), base.indexOf('</footer>') + 9);
const fonts = base.split('\n').filter((l) => /fonts\.(googleapis|gstatic)|<noscript><link href="https:\/\/fonts/.test(l)).join('\n');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const lessonsText = (y) => {
  const r = (P.FR.commun[y.l].lecons || []).map((l) => l.r);
  if (!r.length) return 'Consolidation : vitesse et fluidité';
  const a = r[0][0], b = r[r.length - 1][1];
  return 'Leçons ' + (a === b ? a : a + ' à ' + b);
};
const rowsFor = (labels) => P.FR.years.filter((y) => labels.includes(y.l)).map((y) => `<tr><td>${y.l}</td><td>${P.FR.commun[y.l].jalon}</td><td>${lessonsText(y)}</td></tr>`).join('\n          ');
const table = (labels) => `<table class="fr-table"><thead><tr><th>Classe</th><th>Jalon officiel</th><th>Leçons KeyPace</th></tr></thead><tbody>
          ${rowsFor(labels)}
        </tbody></table>`;

const extraCss = `<style>
.fr-table{width:100%;border-collapse:collapse;margin:16px 0;font-size:15px}
.fr-table th,.fr-table td{text-align:left;padding:10px 12px;border:1px solid var(--border,#E7E1D5);vertical-align:top}
.fr-table th{background:var(--light,#F4F1EA)}
.fr-note{font-size:14px;color:var(--muted,#8A8275)}
</style>`;

const header = `<header>
  <div class="nav-inner">
    <a class="logo" href="/fr"><span class="k">K</span> KeyPace</a>
    <div class="nav-links" id="nav-links">
      <a class="nav-link" href="/fr">Accueil</a>
      <div class="nav-dropdown">
        <a class="nav-link" href="/fr/ecoles">Établissements</a>
        <div class="nav-dropdown-menu">
          <a href="/fr/ecoles">École et collège, lycée</a>
          <a href="/fr/dactylographie-college">Collège</a>
          <a href="/fr/dactylographie-lycee">Lycée</a>
        </div>
      </div>
      <a class="nav-link" href="/test">Test</a>
      <a class="nav-link" href="/fr/cours-dactylo-en-ligne">Cours</a>
      <a class="nav-link" href="/jeux-dactylo-en-ligne">Jeux</a>
      <a class="nav-link" href="/progres">Progrès</a>
    </div>
    <div class="nav-spacer"></div>
    <div class="nav-guest-btns">
      <a class="nav-login-btn" href="/?auth=login">Se connecter</a>
      <a class="nav-signup-btn" href="/?auth=register">Créer un compte</a>
    </div>
    <button class="nav-burger" onclick="toggleNavMenu(event)" aria-label="Menu">☰</button>
  </div>
</header>`;

const contact = (what) => `<section>
    <h2>Une question avant de commencer ?</h2>
    <p>Écrivez-nous à <a href="mailto:contact@keypace.be?subject=${encodeURIComponent('KeyPace France : ' + what)}">contact@keypace.be</a>, nous répondons vite. Vous préférez essayer d'abord ? Faites <a href="/test-vitesse-frappe">le test de vitesse</a> gratuitement ou parcourez <a href="/fr/cours-dactylo-en-ligne">le programme par classe</a>.</p>
  </section>`;

const PAGES = [
  {
    file: 'ecoles-france.html', path: '/fr/ecoles', crumb: 'Établissements', eyebrow: 'Pour les établissements français',
    title: 'KeyPace pour les établissements en France : du CE2 à la terminale',
    description: "Un parcours de dactylographie par classe, du CE2 à la terminale, pour le public et le privé sous contrat, en lien avec le CRCN et Pix. Suivi de classe pour les enseignants.",
    ogTitle: 'KeyPace pour les établissements français', ogDescription: 'Un parcours par classe, du CE2 à la terminale, en lien avec le CRCN et Pix.',
    h1: 'La frappe au clavier, du CE2 à la terminale',
    lead: "Un seul parcours par classe, valable pour le public comme pour le privé sous contrat, en lien avec le cadre de référence des compétences numériques (CRCN) et Pix.",
    body: () => `<section>
    <div class="section-eyebrow">Un cadre national</div>
    <h2>Les mêmes programmes partout : un seul parcours par classe</h2>
    <p>En France, les programmes sont nationaux et s'imposent de la même façon au public et au privé sous contrat. KeyPace ne décline donc pas son parcours par réseau : il propose une progression par classe, du CE2 à la terminale, en voie générale, technologique ou professionnelle.</p>
    <p>Aucun programme en vigueur ne fait de la frappe au clavier un objectif évalué pour lui-même. C'est pourtant une compétence qui conditionne plusieurs attendus officiels : le CE2 (saisir un texte avec un logiciel de traitement de texte, à la rentrée 2027), le cycle 3 (écrits sur supports numériques) et les évaluations Pix.</p>
  </section>

  <section>
    <div class="section-eyebrow">Les jalons du parcours numérique</div>
    <h2>Ce que le CRCN et Pix demandent, classe par classe</h2>
    <table class="fr-table"><thead><tr><th>Classe</th><th>Obligation</th><th>Ce que KeyPace peut apporter</th></tr></thead><tbody>
      <tr><td>Cycles 2 et 3</td><td>CRCN travaillé selon une progression fixée en conseil des maîtres</td><td>Un parcours clavier clé en main, par année</td></tr>
      <tr><td>CM2</td><td>Niveau de maîtrise dans les 5 domaines inscrit au dernier bilan du livret scolaire</td><td>Une trace observable de la saisie au clavier (domaines 3 et 5)</td></tr>
      <tr><td>6e</td><td>Même inscription au livret ; attestation de sensibilisation Pix (sécurité, cyberharcèlement, initiation)</td><td>Les modules mot de passe et protection des données</td></tr>
      <tr><td>4e, 2de, CAP 1</td><td>Parcours Pix consacrés à l'IA obligatoires</td><td>Une saisie fluide, utile pour écrire des consignes à une IA</td></tr>
      <tr><td>3e</td><td>Certification Pix obligatoire, niveau 3 attendu, 32 questions adaptatives en 1 h 45</td><td>Rapidité et autonomie de saisie pendant l'épreuve</td></tr>
      <tr><td>Terminale, bac pro, CAP</td><td>Certification Pix obligatoire, niveau 4 attendu en terminale, résultat transmis à Parcoursup</td><td>CV, lettre de motivation, endurance de frappe</td></tr>
    </tbody></table>
    <p class="fr-note">Source : note de service du 23 janvier 2026 (BO n° 6 du 5 février 2026). KeyPace ne remplace pas Pix ni l'évaluation par les enseignants : il rend ses attendus plus atteignables, surtout dans les exercices où l'élève doit produire du texte. Les attestations KeyPace n'ont pas de statut officiel.</p>
  </section>

  <section>
    <div class="section-eyebrow">Le parcours</div>
    <h2>Les mêmes leçons, réparties par classe</h2>
    ${table(['CE2', 'CM1', 'CM2'])}
    <p>Le détail des classes de collège et de lycée est sur les pages <a href="/fr/dactylographie-college">collège</a> et <a href="/fr/dactylographie-lycee">lycée</a>.</p>
  </section>

  <section>
    <div class="section-eyebrow">Accès et financement</div>
    <h2>Comment KeyPace arrive dans votre établissement</h2>
    <p>Les ressources numériques des établissements publics passent par l'ENT et le GAR (gestionnaire d'accès aux ressources). KeyPace n'est pas encore raccordé au GAR : l'accès depuis l'ENT des collèges et lycées publics n'est donc pas disponible aujourd'hui. Les établissements privés sous contrat, qui achètent directement par l'intermédiaire de leur OGEC, peuvent nous contacter pour démarrer.</p>
    <p>Les ressources sont financées par la commune pour les écoles, le département pour les collèges, la région pour les lycées, et l'OGEC pour le privé. Écrivez-nous pour un devis adapté à votre établissement.</p>
  </section>

  ${contact("établissement")}

  <section class="faq">
    <h2>Questions fréquentes</h2>
    <details open>
      <summary>Le parcours est-il le même pour le public et le privé sous contrat ?</summary>
      <p>Oui. Les programmes français sont nationaux et identiques pour les deux : KeyPace propose un seul parcours par classe.</p>
    </details>
    <details>
      <summary>Quel clavier est utilisé ?</summary>
      <p>Le clavier AZERTY français est celui par défaut. Les dispositions belge, Mac et AFNOR NF Z71-300 sont aussi gérées : chaque leçon indique la touche exacte à utiliser.</p>
    </details>
    <details>
      <summary>Peut-on ouvrir KeyPace depuis l'ENT d'un collège public ?</summary>
      <p>Pas encore : cela suppose un raccordement au GAR, que KeyPace n'a pas à ce jour.</p>
    </details>
    <details>
      <summary>Comment suivre la classe sans y passer du temps ?</summary>
      <p>Un tableau de bord affiche la progression, la vitesse et la précision de chaque élève, et permet d'assigner une leçon.</p>
    </details>
  </section>`,
  },
  {
    file: 'dactylographie-college.html', path: '/fr/dactylographie-college', crumb: 'Collège', eyebrow: 'Pour le collège',
    title: 'Apprendre à taper au clavier au collège, de la 6e à la 3e | KeyPace',
    description: "Leçons de dactylographie du collège, de la 6e à la 3e : attestation Pix en 6e, parcours Pix IA en 4e, certification Pix en 3e. Suivi de classe pour les enseignants.",
    ogTitle: 'KeyPace pour le collège : de la 6e à la 3e', ogDescription: 'Un parcours par classe, avec les jalons Pix de chaque année.',
    h1: 'Vos élèves de collège, prêts pour Pix',
    lead: "De la 6e à la 3e, un parcours de dactylographie avec le jalon officiel de chaque année : attestation Pix en 6e, parcours IA en 4e, certification en 3e.",
    body: () => `<section>
    <div class="section-eyebrow">Classe par classe</div>
    <h2>Les jalons du collège et les leçons associées</h2>
    ${table(['6e', '5e', '4e', '3e'])}
    <p class="fr-note">Jalons : note de service du 23 janvier 2026 (BO n° 6 du 5 février 2026). Programme de français du cycle 4 : BO n° 10 du 5 mars 2026 (5e en 2026, 4e en 2027, 3e en 2028).</p>
  </section>

  <section>
    <div class="section-eyebrow">Pourquoi la frappe compte au collège</div>
    <h2>Écrire vite et sans chercher les touches, pour tout le reste</h2>
    <div class="two-col">
      <div>
        <p>En 6e, le niveau de maîtrise des compétences numériques est inscrit au livret scolaire et l'attestation de sensibilisation Pix est obligatoire. En 3e, la certification Pix est obligatoire : le niveau 3 est attendu, avec 32 questions adaptatives en 1 h 45. Un élève qui doit chercher les touches perd du temps et de l'attention pendant l'épreuve.</p>
        <p>KeyPace ne remplace pas Pix : il aide les élèves à saisir du texte avec aisance, et propose des modules sur les mots de passe et la protection des données, qui rejoignent le domaine « Protection et sécurité » du CRCN.</p>
      </div>
      <div class="callout">
        <h3>Au programme</h3>
        <ul>
          <li>Les touches de la rangée de repos, du haut et du bas</li>
          <li>Majuscules, ponctuation, accents et chiffres</li>
          <li>Les symboles, pour créer un mot de passe solide</li>
          <li>Des textes plus longs, pour gagner en vitesse sans perdre en précision</li>
        </ul>
      </div>
    </div>
  </section>

  ${contact('collège')}`,
  },
  {
    file: 'dactylographie-lycee.html', path: '/fr/dactylographie-lycee', crumb: 'Lycée', eyebrow: 'Pour le lycée',
    title: 'Dactylographie au lycée : seconde, première, terminale, voie pro | KeyPace',
    description: "Un parcours de dactylographie pour le lycée général, technologique et professionnel : CV, lettre de motivation et mails pour le stage de seconde, endurance de frappe jusqu'à la certification Pix.",
    ogTitle: 'KeyPace pour le lycée : de la 2de à la terminale', ogDescription: 'CV, lettre, mails pour le stage, et endurance de frappe jusqu à Pix.',
    h1: 'Du stage de seconde à la certification Pix',
    lead: "Au lycée, il n'existe pas de programme de dactylographie : KeyPace propose les modules utiles à chaque année, du CV pour le stage de seconde à l'endurance de frappe en terminale.",
    body: () => `<section>
    <div class="section-eyebrow">Classe par classe</div>
    <h2>Les jalons du lycée</h2>
    ${table(['2de', '1re', 'Terminale', '2de pro', '1re pro', 'Tle pro', 'CAP 1re année', 'CAP 2e année'])}
    <p class="fr-note">Jalons : note de service du 23 janvier 2026 (BO n° 6 du 5 février 2026) et stage de seconde (BO n° 6 du 5 février 2026). Au lycée, le numérique officiel passe par l'enseignement SNT en 2de et par la certification Pix en terminale.</p>
  </section>

  <section>
    <div class="section-eyebrow">Des besoins concrets</div>
    <h2>Ce que KeyPace apporte à chaque voie</h2>
    <table class="fr-table"><thead><tr><th>Voie ou classe</th><th>Lien avec KeyPace</th></tr></thead><tbody>
      <tr><td>2de générale et technologique</td><td>Le stage d'observation de seconde est obligatoire (2 semaines en juin) : CV, lettre de motivation et mails pour le trouver</td></tr>
      <tr><td>1re et terminale générales</td><td>Endurance de frappe pour les écrits longs, certification Pix en terminale (niveau 4, transmis à Parcoursup)</td></tr>
      <tr><td>Série STMG</td><td>Bureautique et communication écrite professionnelle</td></tr>
      <tr><td>Voie professionnelle et CAP</td><td>Écrits professionnels et saisie courante ; certification Pix l'année du CAP</td></tr>
      <tr><td>Établissements français à l'étranger</td><td>Mêmes programmes nationaux ; certification Pix obligatoire dans les niveaux homologués</td></tr>
    </tbody></table>
  </section>

  <section>
    <div class="section-eyebrow">Les modules</div>
    <h2>Écrire un CV, une lettre de motivation, un mail</h2>
    <p>Trois modules guidés accompagnent les démarches du lycéen : <a href="/cours/ecrire-un-cv">écrire un CV</a>, <a href="/cours/ecrire-une-lettre-de-motivation">écrire une lettre de motivation</a> et <a href="/cours/ecrire-un-mail">écrire un mail</a>. Ils sont réservés aux comptes Expert.</p>
  </section>

  ${contact('lycée')}`,
  },
];

function build(p) {
  const url = BASE + p.path;
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'KeyPace France', item: BASE + '/fr' },
    ...(p.path === '/fr/ecoles' ? [] : [{ '@type': 'ListItem', position: 2, name: 'Établissements', item: BASE + '/fr/ecoles' }]),
    { '@type': 'ListItem', position: p.path === '/fr/ecoles' ? 2 : 3, name: p.crumb, item: url }] }, null, 2);
  const crumb = p.path === '/fr/ecoles'
    ? `<a href="/fr">Accueil</a> › <span>Établissements</span>`
    : `<a href="/fr">Accueil</a> › <a href="/fr/ecoles">Établissements</a> › <span>${p.crumb}</span>`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<!-- Consentement cookies + Google Analytics (chargé seulement après accord, voir /cookies) -->
<script src="/cookie-consent.js" defer></script>
<script src="/field-focus-guard.js" defer></script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="fr-FR" href="${url}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(p.ogTitle)}">
<meta property="og:description" content="${esc(p.ogDescription)}">
<meta property="og:image" content="${BASE}/og-image.png">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="KeyPace">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.ogTitle)}">
<meta name="twitter:description" content="${esc(p.ogDescription)}">
<meta name="twitter:image" content="${BASE}/og-image.png">
<meta name="theme-color" content="#FF4D2E">
<link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png?v=2" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
${fonts}
<script type="application/ld+json">
${ld}
</script>
${style}
${extraCss}
</head>
<body>
${header}

<div class="wrap">
  <nav class="crumb" aria-label="Fil d'Ariane">
    ${crumb}
  </nav>

  <div class="hero">
    <div>
      <div class="eyebrow">${p.eyebrow}</div>
      <h1>${p.h1}</h1>
      <p class="lead">${p.lead}</p>
      <div class="cta-row" style="margin-top:22px">
        <a class="btn" href="/fr/cours-dactylo-en-ligne">Voir le programme par classe →</a>
        <a class="btn ghost" href="/fr">Découvrir l'application</a>
      </div>
    </div>
    <div class="hero-visual">
      <img src="/images/keypace-pose-9.webp" width="640" height="953" alt="Mascotte KeyPace fille, bras croisés, confiante" loading="eager">
    </div>
  </div>

  ${p.body()}
</div>

${footer}
<script>
function toggleNavMenu(e){if(e)e.stopPropagation();document.getElementById('nav-links')?.classList.toggle('open');}
document.addEventListener('click',e=>{const nl=document.getElementById('nav-links');const b=document.querySelector('.nav-burger');if(nl&&nl.classList.contains('open')&&!nl.contains(e.target)&&b&&!b.contains(e.target))nl.classList.remove('open');});
</script>
</body>
</html>
`;
}

if (require.main === module) {
  for (const p of PAGES) { fs.writeFileSync(path.join(root, p.file), build(p)); console.log(`${p.file} → ${p.path} (${(fs.statSync(path.join(root, p.file)).size / 1024).toFixed(1)} Ko)`); }
}
module.exports = { PAGES, build };
