// Registre des cours que le serveur accepte d'écrire dans `progress.data.courses` (étape 2 du plan clavier/langues) et QUI y a accès.
// Un cours = langue de contenu + famille de clavier, par exemple 'fr/qwerty'. Le cours par défaut 'fr/azerty' n'est PAS ici : il reste
// dans les champs plats du bloc, comme avant (migration additive, voir docs/PLAN-clavier-qwerty.md, 4.4).
//
// Statut de chaque cours : 'bêta' (réservé aux COMPTES TESTEURS) ou 'en ligne' (tous les comptes). Le contrôle est fait ICI, côté serveur,
// d'après le compte enregistré en base : le client est public et ne protège rien. Le site demande au serveur la liste des cours auxquels le
// compte a droit (save-progress, requête `access`) et ne propose que ceux-là.
// Les comptes testeurs sont dans la variable d'environnement KEYPACE_BETA_TESTERS (noms d'utilisateur séparés par des virgules, sans
// distinction de casse). Vide ou absente : personne. On la change dans les réglages Vercel du projet, puis on redéploie.
const DEFAULT_COURSE = 'fr/azerty';
const COURSE_ACCESS = {
  'fr/qwerty': { status: 'en ligne' }, // ouvert à tous les comptes connectés le 2026-11-06 (avant : 'bêta', comptes testeurs)
  // Anglais britannique : ouvert à tous les comptes connectés le 2026-11-11 (avant : 'bêta', comptes testeurs).
  'en/azerty': { status: 'en ligne' },
  'en/qwerty': { status: 'en ligne' },
  // Néerlandais (Belgique, clavier AZERTY belge) : cours seulement, interface encore en français ; bêta (comptes testeurs) le temps de la relecture par un néerlandophone.
  'nl/azerty': { status: 'bêta' },
};
const COURSE_IDS = Object.keys(COURSE_ACCESS);
const COURSE_ID_RE = /^[a-z]{2,3}(-[A-Z]{2})?\/[a-z0-9-]{2,24}$/;

function betaTesters() {
  return String(process.env.KEYPACE_BETA_TESTERS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
}

// Identifiants de cours que CE compte peut écrire et voir (nom d'utilisateur lu en base, jamais ce que le client envoie).
function courseIdsFor(user) {
  if (!user) return []; // jamais de cours pour une requête sans compte, même 'en ligne'
  const name = String((user && user.username) || '').trim().toLowerCase();
  const tester = !!name && betaTesters().includes(name);
  return COURSE_IDS.filter((id) => {
    const a = COURSE_ACCESS[id];
    return a.status === 'en ligne' || (a.status === 'bêta' && tester);
  });
}

module.exports = { DEFAULT_COURSE, COURSE_ACCESS, COURSE_IDS, COURSE_ID_RE, courseIdsFor, betaTesters };
