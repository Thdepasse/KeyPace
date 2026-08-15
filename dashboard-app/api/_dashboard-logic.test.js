// Tests de la logique du dashboard interne (relances + agrégats KPI).
// Lancer : node --test api/_dashboard-logic.test.js
const test = require('node:test');
const assert = require('node:assert');
const { computeNextFollowup, summarizeAcquisition, summarizeB2B, summarizeEngagement, dailySignups, dailyLastActive, trafficConversionRate } = require('./_dashboard-logic');

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

test('computeNextFollowup : programme une relance après un envoi', () => {
  const next = computeNextFollowup('envoye', NOW);
  assert.equal(next, new Date(NOW + 5 * DAY).toISOString());
});

test('computeNextFollowup : relance plus rapprochée après une réponse', () => {
  const next = computeNextFollowup('repondu', NOW);
  assert.equal(next, new Date(NOW + 3 * DAY).toISOString());
});

test('computeNextFollowup : aucune relance pour un dossier clos ou pas encore contacté', () => {
  assert.equal(computeNextFollowup('signe', NOW), null);
  assert.equal(computeNextFollowup('perdu', NOW), null);
  assert.equal(computeNextFollowup('a_contacter', NOW), null);
});

test('summarizeAcquisition : comptages et taux de conversion', () => {
  const users = [
    { plan: 'expert', created_at: new Date(NOW - 2 * DAY).toISOString() },
    { plan: 'free', created_at: new Date(NOW - 2 * DAY).toISOString() },
    { plan: 'free', created_at: new Date(NOW - 20 * DAY).toISOString() },
    { plan: 'free', created_at: new Date(NOW - 60 * DAY).toISOString() },
  ];
  const s = summarizeAcquisition(users, NOW);
  assert.equal(s.totalUsers, 4);
  assert.equal(s.signups7d, 2);
  assert.equal(s.signups30d, 3);
  assert.equal(s.expertUsers, 1);
  assert.equal(s.freeUsers, 3);
  assert.equal(s.conversionRate, 25);
});

test('summarizeB2B : répartition par statut et relances dues', () => {
  const institutions = [{ seat_count: 25 }, { seat_count: 10 }];
  const prospects = [
    { status: 'envoye', next_followup_at: new Date(NOW - DAY).toISOString() }, // due
    { status: 'envoye', next_followup_at: new Date(NOW + DAY).toISOString() }, // pas encore
    { status: 'signe', next_followup_at: new Date(NOW - DAY).toISOString() }, // clos, ignoré
    { status: 'a_contacter', next_followup_at: null },
  ];
  const s = summarizeB2B(institutions, prospects, NOW);
  assert.equal(s.institutionsCount, 2);
  assert.equal(s.totalSeats, 35);
  assert.deepEqual(s.prospectsByStatus, { envoye: 2, signe: 1, a_contacter: 1 });
  assert.equal(s.dueFollowups, 1);
});

test('summarizeEngagement : actifs récents + volumes', () => {
  const progress = [
    { updated_at: new Date(NOW - DAY).toISOString() },
    { updated_at: new Date(NOW - 20 * DAY).toISOString() },
    { updated_at: new Date(NOW - 60 * DAY).toISOString() },
  ];
  const s = summarizeEngagement(progress, [{ id: 1 }, { id: 2 }], [{ id: 1 }], NOW);
  assert.equal(s.activeUsers7d, 1);
  assert.equal(s.activeUsers30d, 2);
  assert.equal(s.certificatesIssued, 2);
  assert.equal(s.weeklyChallengeParticipants, 1);
});

test('dailySignups : regroupe les inscriptions par jour sur la fenêtre demandée', () => {
  const today = new Date(NOW).toISOString().slice(0, 10);
  const yesterday = new Date(NOW - DAY).toISOString().slice(0, 10);
  const users = [
    { created_at: new Date(NOW).toISOString() },
    { created_at: new Date(NOW).toISOString() },
    { created_at: new Date(NOW - DAY).toISOString() },
    { created_at: new Date(NOW - 90 * DAY).toISOString() }, // hors fenêtre, ignoré
  ];
  const series = dailySignups(users, NOW, 7);
  assert.equal(series.length, 7);
  assert.equal(series[series.length - 1].date, today);
  assert.equal(series[series.length - 1].count, 2);
  assert.equal(series[series.length - 2].date, yesterday);
  assert.equal(series[series.length - 2].count, 1);
  assert.equal(series[0].count, 0);
});

test('dailyLastActive : regroupe la dernière activité connue par jour', () => {
  const progress = [
    { updated_at: new Date(NOW).toISOString() },
    { updated_at: new Date(NOW - 2 * DAY).toISOString() },
    { updated_at: new Date(NOW - 2 * DAY).toISOString() },
  ];
  const series = dailyLastActive(progress, NOW, 7);
  assert.equal(series[series.length - 1].count, 1);
  assert.equal(series[series.length - 3].count, 2);
});

test('trafficConversionRate : taux arrondi, null sans trafic connu', () => {
  assert.equal(trafficConversionRate(5, 200), 2.5);
  assert.equal(trafficConversionRate(0, 0), null);
  assert.equal(trafficConversionRate(3, null), null);
});
