// Registre des cours que le serveur accepte d'écrire dans `progress.data.courses`
// (étape 2 du plan clavier/langues). Un cours = langue de contenu + famille de clavier,
// par exemple 'nl/azerty'. Le cours par défaut 'fr/azerty' n'est PAS ici : il reste dans les
// champs plats du bloc, comme avant (migration additive, voir docs/PLAN-clavier-qwerty.md, 4.4).
// Vide tant qu'aucun second cours n'est ouvert : le serveur ignore alors tout `courses` envoyé
// par le client. Plus tard ce fichier sera produit par le script de build, depuis le registre
// unique lu aussi par le client (plan 4.6).
const DEFAULT_COURSE = 'fr/azerty';
const COURSE_IDS = [];
const COURSE_ID_RE = /^[a-z]{2,3}(-[A-Z]{2})?\/[a-z0-9-]{2,24}$/;

module.exports = { DEFAULT_COURSE, COURSE_IDS, COURSE_ID_RE };
