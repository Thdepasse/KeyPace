// Historique des versions de progression (étape 1c du plan clavier/langues).
// On archive la version ENREGISTRÉE (`prev`) quand la sauvegarde qui arrive la ferait reculer.
// Logique pure ici ; les écritures en base sont dans api/save-progress.js.
const KEEP = 5;                 // versions gardées par compte
const KEEP_DAYS = 90;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const counts = (d) => ({
  lessons: isObj(d && d.lessons) ? Object.keys(d.lessons).length : 0,
  tests: Array.isArray(d && d.tests) ? d.tests.length : 0,
});

// Raisons d'archiver `prev` avant d'écrire `next` ; liste vide = rien à garder.
function archiveReasons(prev, next) {
  if (!isObj(prev) || !isObj(next)) return [];
  const p = counts(prev), n = counts(next);
  const reasons = [];
  if (n.lessons < p.lessons) reasons.push('lecons');
  if (n.tests < p.tests) reasons.push('tests');
  const lost = Object.keys(prev).filter((k) => prev[k] !== undefined && next[k] === undefined && !['role', 'classes', 'courses'].includes(k));
  if (lost.length) reasons.push('champ:' + lost.slice(0, 5).join(','));
  return reasons;
}

// Parmi les versions déjà gardées, lesquelles supprimer pour n'en garder que KEEP :
// on garde les PLUS RICHES (une version « pauvre » ne doit pas chasser une bonne).
function toEvict(rows, keep = KEEP) {
  return [...rows]
    .sort((a, b) => ((b.lessons_count + b.tests_count) - (a.lessons_count + a.tests_count)) || (new Date(b.saved_at) - new Date(a.saved_at)))
    .slice(keep).map((r) => r.id);
}
// Même contenu déjà gardé ? (évite de remplir l'historique d'un onglet en retard qui sauvegarde sans cesse)
function alreadyKept(rows, prev) {
  const c = counts(prev);
  return rows.some((r) => r.lessons_count === c.lessons && r.tests_count === c.tests);
}

module.exports = { archiveReasons, toEvict, alreadyKept, counts, KEEP, KEEP_DAYS };
