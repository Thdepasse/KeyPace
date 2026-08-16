// Logique pure (sans I/O) pour le dashboard interne équipe : relances de
// prospection écoles + agrégats KPI. Testable avec `node --test`.

const DAY_MS = 24 * 60 * 60 * 1000;

// Délai avant la prochaine relance suggérée, selon le nouveau statut d'un
// prospect école. `null` => pas de relance programmée (dossier clos).
const FOLLOWUP_DAYS = {
  a_contacter: null,
  envoye: 5,
  relance: 5,
  repondu: 3,
  en_negociation: 4,
  signe: null,
  perdu: null,
};

function computeNextFollowup(status, now) {
  const days = FOLLOWUP_DAYS[status];
  if (days == null) return null;
  return new Date(now + days * DAY_MS).toISOString();
}

// Acquisition & conversion à partir de la table `users` (id, plan, created_at).
function summarizeAcquisition(users, now) {
  const total = users.length;
  const signups7d = users.filter((u) => now - new Date(u.created_at).getTime() < 7 * DAY_MS).length;
  const signups30d = users.filter((u) => now - new Date(u.created_at).getTime() < 30 * DAY_MS).length;
  const expertUsers = users.filter((u) => u.plan === 'expert').length;
  const freeUsers = total - expertUsers;
  const conversionRate = total ? Math.round((expertUsers / total) * 1000) / 10 : 0;
  return { totalUsers: total, signups7d, signups30d, freeUsers, expertUsers, conversionRate };
}

// Ventes B2B écoles à partir de `institutions` (seat_count) et `school_prospects` (status).
function summarizeB2B(institutions, prospects, now) {
  const institutionsCount = institutions.length;
  const totalSeats = institutions.reduce((a, i) => a + (i.seat_count || 0), 0);
  const prospectsByStatus = {};
  for (const p of prospects) prospectsByStatus[p.status] = (prospectsByStatus[p.status] || 0) + 1;
  const dueFollowups = prospects.filter(
    (p) => p.next_followup_at && new Date(p.next_followup_at).getTime() <= now && p.status !== 'signe' && p.status !== 'perdu'
  ).length;
  return { institutionsCount, totalSeats, prospectsByStatus, dueFollowups };
}

// Engagement produit : actifs récents (progress.updated_at), certificats émis,
// participation au défi hebdomadaire.
function summarizeEngagement(progress, certificates, weeklyScores, now) {
  const activeUsers7d = progress.filter((p) => now - new Date(p.updated_at).getTime() < 7 * DAY_MS).length;
  const activeUsers30d = progress.filter((p) => now - new Date(p.updated_at).getTime() < 30 * DAY_MS).length;
  return {
    activeUsers7d,
    activeUsers30d,
    certificatesIssued: certificates.length,
    weeklyChallengeParticipants: weeklyScores.length,
  };
}

// Jours ISO (YYYY-MM-DD, UTC) des `days` derniers jours, du plus ancien au plus récent.
function lastDays(now, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(new Date(now - i * DAY_MS).toISOString().slice(0, 10));
  }
  return out;
}

// Nouveaux inscrits par jour sur les `days` derniers jours (users.created_at).
function dailySignups(users, now, days = 30) {
  const dates = lastDays(now, days);
  const counts = Object.fromEntries(dates.map((d) => [d, 0]));
  for (const u of users) {
    const d = new Date(u.created_at).toISOString().slice(0, 10);
    if (d in counts) counts[d]++;
  }
  return dates.map((d) => ({ date: d, count: counts[d] }));
}

// Répartition par jour de la dernière activité connue (progress.updated_at).
// Note : une ligne par utilisateur (pas d'historique complet) — ceci montre
// "combien d'utilisateurs ont été actifs pour la dernière fois ce jour-là",
// pas un vrai nombre d'actifs quotidiens cumulés.
function dailyLastActive(progress, now, days = 30) {
  const dates = lastDays(now, days);
  const counts = Object.fromEntries(dates.map((d) => [d, 0]));
  for (const p of progress) {
    const d = new Date(p.updated_at).toISOString().slice(0, 10);
    if (d in counts) counts[d]++;
  }
  return dates.map((d) => ({ date: d, count: counts[d] }));
}

// Taux de conversion visiteurs du site -> inscrits, sur une même fenêtre.
// null si pas de trafic connu (GA non configuré, ou 0 visiteur).
function trafficConversionRate(signups, visitors) {
  if (!visitors) return null;
  return Math.round((signups / visitors) * 1000) / 10;
}

// Jours ISO (YYYY-MM-DD, UTC) d'aujourd'hui jusqu'à dimanche inclus (semaine lundi-dimanche).
function remainingDaysThisWeek(now) {
  const dow = new Date(now).getUTCDay(); // 0=dimanche..6=samedi
  const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
  const out = [];
  for (let i = 0; i <= daysUntilSunday; i++) out.push(new Date(now + i * DAY_MS).toISOString().slice(0, 10));
  return out;
}

// Brief marketing : parmi les jours restants de la semaine (aujourd'hui -> dimanche),
// combien n'ont aucun contenu déjà planifié dans le calendrier (content_calendar.scheduled_date).
function contentGapsThisWeek(scheduledDates, now) {
  const remaining = remainingDaysThisWeek(now);
  const scheduledSet = new Set(scheduledDates);
  const gapDays = remaining.filter((d) => !scheduledSet.has(d));
  return { remainingDays: remaining.length, gapDays };
}

// { start, end } = aujourd'hui et dimanche (YYYY-MM-DD), pour filtrer la requête
// content_calendar côté serveur (évite de rapatrier tout l'historique planifié).
function thisWeekRange(now) {
  const days = remainingDaysThisWeek(now);
  return { start: days[0], end: days[days.length - 1] };
}

// Normalise un nom d'école pour la comparaison (accents, casse, ponctuation,
// espaces multiples) sans toucher au nom affiché ailleurs.
function normalizeSchoolName(name) {
  return String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents (diacritiques combinants)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // ponctuation -> espace
    .replace(/\s+/g, ' ')
    .trim();
}

// Regroupe les prospects dont le nom d'école normalisé est identique (doublon
// probable, ex. "École du Centre" / "école du centre" / "Ecole du Centre !").
// Ne renvoie que les groupes d'au moins 2 dossiers ; ignore les noms vides.
function findDuplicateProspects(prospects) {
  const groups = new Map();
  for (const p of prospects) {
    const key = normalizeSchoolName(p.school_name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length >= 2)
    .map(([key, group]) => ({ key, prospects: group }));
}

// Résumé lisible des champs modifiés entre l'état avant (`before`, ligne
// complète) et le patch appliqué (`patch`, seulement les champs touchés) —
// pour l'historique par élément (voir logActivity dans dashboard.js).
// `labels` : { champ: "Libellé affiché" } ; les champs absents sont ignorés
// (ex. updated_at, qui change toujours mais n'intéresse personne).
function diffSummary(before, patch, labels) {
  const parts = [];
  for (const key of Object.keys(patch)) {
    if (!(key in labels)) continue;
    const oldVal = before ? before[key] : undefined;
    const newVal = patch[key];
    const oldStr = oldVal == null || oldVal === '' ? '—' : String(oldVal);
    const newStr = newVal == null || newVal === '' ? '—' : String(newVal);
    if (oldStr === newStr) continue;
    parts.push(`${labels[key]} : ${oldStr} → ${newStr}`);
  }
  return parts.join(' · ');
}

// Relances en retard de plus de `days` jours (par défaut 3) — un signal plus
// fort que "due aujourd'hui" (dueFollowups) : ça glisse depuis un moment et
// mérite une alerte distincte dans le Brief du jour.
function severelyOverdueFollowups(prospects, now, days = 3) {
  const threshold = now - days * DAY_MS;
  return prospects.filter(
    (p) => p.next_followup_at && new Date(p.next_followup_at).getTime() <= threshold && p.status !== 'signe' && p.status !== 'perdu'
  );
}

// RDV planifiés dans les prochaines `hours` heures (par défaut 24) — à
// préparer, distinct d'une relance en retard (action passée manquante).
function upcomingMeetings(prospects, now, hours = 24) {
  const limit = now + hours * 60 * 60 * 1000;
  return prospects.filter((p) => {
    if (!p.meeting_at) return false;
    const t = new Date(p.meeting_at).getTime();
    return t >= now && t <= limit;
  });
}

module.exports = {
  FOLLOWUP_DAYS, computeNextFollowup, summarizeAcquisition, summarizeB2B, summarizeEngagement,
  dailySignups, dailyLastActive, trafficConversionRate, remainingDaysThisWeek, contentGapsThisWeek, thisWeekRange,
  normalizeSchoolName, findDuplicateProspects, diffSummary, severelyOverdueFollowups, upcomingMeetings,
};
