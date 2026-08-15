// Logique pure (sans I/O) de classification des emails Zimbra pour la
// prospection écoles. Testable avec `node --test`. Aucune dépendance.

const FREE_MAIL_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com',
  'yahoo.fr', 'icloud.com', 'proton.me', 'protonmail.com', 'msn.com',
  'skynet.be', 'telenet.be',
]);

const SCHOOL_KEYWORDS = [
  'école', 'ecole', 'collège', 'college', 'lycée', 'lycee', 'athénée', 'athenee',
  'institut', 'enseignement', 'classe', 'classes', 'élève', 'eleve', 'élèves', 'eleves',
  'professeur', 'enseignant', 'établissement', 'etablissement',
];

const CLOSED_STATUSES = new Set(['signe', 'perdu']);
const ADVANCED_STATUSES = new Set(['en_negociation', 'signe', 'perdu']);

function domainOf(email) {
  const at = (email || '').lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).toLowerCase();
}

function looksLikeSchoolOutreach(email, subject) {
  if (FREE_MAIL_DOMAINS.has(domainOf(email))) return false;
  const s = (subject || '').toLowerCase();
  return SCHOOL_KEYWORDS.some((k) => s.includes(k));
}

function findProspectByEmail(prospects, email) {
  const target = (email || '').trim().toLowerCase();
  if (!target) return null;
  return prospects.find((p) => (p.contact_email || '').trim().toLowerCase() === target) || null;
}

// message: { direction: 'in'|'out', from, to, subject }
// prospects: lignes school_prospects (id, contact_email, status)
// Retourne une action à appliquer, ou null si rien à faire.
function classifyMessage(message, prospects, now) {
  const { direction, from, to, subject } = message;

  if (direction === 'in') {
    const match = findProspectByEmail(prospects, from);
    if (match) {
      if (CLOSED_STATUSES.has(match.status)) return null;
      return { type: 'update-status', prospectId: match.id, status: 'repondu' };
    }
    if (looksLikeSchoolOutreach(from, subject)) {
      return {
        type: 'create-prospect',
        contact_email: from,
        school_name: domainOf(from) || from,
        notes: 'Détecté automatiquement via Zimbra — à vérifier',
      };
    }
    return null;
  }

  if (direction === 'out') {
    const match = findProspectByEmail(prospects, to);
    if (!match) return null;
    if (ADVANCED_STATUSES.has(match.status)) return null;
    const nextStatus = match.status === 'a_contacter' ? 'envoye' : 'relance';
    return { type: 'update-status', prospectId: match.id, status: nextStatus };
  }

  return null;
}

module.exports = { classifyMessage, looksLikeSchoolOutreach, domainOf, FREE_MAIL_DOMAINS, SCHOOL_KEYWORDS };
