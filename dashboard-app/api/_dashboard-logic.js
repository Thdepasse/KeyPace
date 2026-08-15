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

module.exports = {
  FOLLOWUP_DAYS, computeNextFollowup, summarizeAcquisition, summarizeB2B, summarizeEngagement,
  dailySignups, dailyLastActive, trafficConversionRate,
};
