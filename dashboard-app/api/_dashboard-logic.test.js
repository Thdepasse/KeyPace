// Tests de la logique du dashboard interne (relances + agrégats KPI).
// Lancer : node --test api/_dashboard-logic.test.js
const test = require('node:test');
const assert = require('node:assert');
const { computeNextFollowup, summarizeAcquisition, summarizeB2B, summarizeEngagement, dailySignups, dailyLastActive, trafficConversionRate, remainingDaysThisWeek, contentGapsThisWeek, thisWeekRange, normalizeSchoolName, normalizePhone, findDuplicateProspects, diffSummary, severelyOverdueFollowups, upcomingMeetings, excludeDismissedDuplicates, checklistItemStatus, upcomingRenewals } = require('./_dashboard-logic');

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

test('remainingDaysThisWeek : aujourd\'hui (mardi) jusqu\'à dimanche inclus', () => {
  const days = remainingDaysThisWeek(NOW); // NOW = mardi 2023-11-14 (UTC)
  assert.deepEqual(days, ['2023-11-14', '2023-11-15', '2023-11-16', '2023-11-17', '2023-11-18', '2023-11-19']);
});

test('remainingDaysThisWeek : dimanche ne renvoie que le jour même', () => {
  const sunday = NOW + 5 * DAY; // 2023-11-19, dimanche
  assert.deepEqual(remainingDaysThisWeek(sunday), ['2023-11-19']);
});

test('contentGapsThisWeek : jours restants sans contenu déjà planifié', () => {
  const g = contentGapsThisWeek(['2023-11-14', '2023-11-16'], NOW);
  assert.equal(g.remainingDays, 6);
  assert.deepEqual(g.gapDays, ['2023-11-15', '2023-11-17', '2023-11-18', '2023-11-19']);
});

test('contentGapsThisWeek : aucun trou si toute la semaine restante est planifiée', () => {
  const g = contentGapsThisWeek(['2023-11-14', '2023-11-15', '2023-11-16', '2023-11-17', '2023-11-18', '2023-11-19'], NOW);
  assert.deepEqual(g.gapDays, []);
});

test('thisWeekRange : bornes start/end pour filtrer la requête calendrier', () => {
  assert.deepEqual(thisWeekRange(NOW), { start: '2023-11-14', end: '2023-11-19' });
});

test('normalizeSchoolName : ignore accents, casse, ponctuation et espaces multiples', () => {
  assert.equal(normalizeSchoolName('École du Centre !'), 'ecole du centre');
  assert.equal(normalizeSchoolName('ecole   du  Centre'), 'ecole du centre');
  assert.equal(normalizeSchoolName('  '), '');
  assert.equal(normalizeSchoolName(null), '');
});

test('findDuplicateProspects : regroupe les noms qui ne diffèrent que par accents/casse/ponctuation', () => {
  const groups = findDuplicateProspects([
    { id: 1, school_name: 'École du Centre' },
    { id: 2, school_name: 'ecole du centre' },
    { id: 3, school_name: 'Institut Notre-Dame' },
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].prospects.map((p) => p.id), [1, 2]);
});

test('findDuplicateProspects : aucun groupe si tous les noms sont distincts, ignore les noms vides', () => {
  const groups = findDuplicateProspects([
    { id: 1, school_name: 'Institut A' },
    { id: 2, school_name: 'Institut B' },
    { id: 3, school_name: '' },
    { id: 4, school_name: null },
  ]);
  assert.deepEqual(groups, []);
});

test('findDuplicateProspects : détecte un doublon par email même si le nom d\'école diffère', () => {
  const groups = findDuplicateProspects([
    { id: 1, school_name: 'Institut Saint-Louis', contact_email: 'Directeur@Ecole.be' },
    { id: 2, school_name: 'ISL', contact_email: 'directeur@ecole.be' },
    { id: 3, school_name: 'Institut B', contact_email: 'autre@ecole.be' },
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].prospects.map((p) => p.id), [1, 2]);
});

test('findDuplicateProspects : détecte un doublon par téléphone (formats différents), ignore les numéros trop courts', () => {
  const groups = findDuplicateProspects([
    { id: 1, school_name: 'École A', contact_phone: '+32 81 12 34 56' },
    { id: 2, school_name: 'École B', contact_phone: '+32-81-12.34.56' },
    { id: 3, school_name: 'École C', contact_phone: '123' },
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].prospects.map((p) => p.id), [1, 2]);
});

test('findDuplicateProspects : transitif — deux paires reliées par des signaux différents fusionnent en un seul groupe', () => {
  const groups = findDuplicateProspects([
    { id: 1, school_name: 'École du Parc', contact_email: 'a@ecole.be' },
    { id: 2, school_name: 'ecole du parc', contact_email: 'b@ecole.be' }, // relié à 1 par le nom
    { id: 3, school_name: 'Autre nom', contact_email: 'b@ecole.be' }, // relié à 2 par l'email
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].prospects.map((p) => p.id), [1, 2, 3]);
});

test('normalizePhone : garde chiffres et + initial, rejette les valeurs trop courtes', () => {
  assert.equal(normalizePhone('+32 (0)81 12-34.56'), '+32081123456');
  assert.equal(normalizePhone('123'), '');
  assert.equal(normalizePhone(null), '');
});

const PROSPECT_LABELS = { city: 'Ville', status: 'Statut', notes: 'Notes' };

test('diffSummary : liste les champs qui ont réellement changé, avant -> après', () => {
  const before = { city: 'Namur', status: 'envoye', notes: 'RAS' };
  const patch = { city: 'Liège', status: 'envoye', updated_at: '2026-01-01T00:00:00Z' };
  assert.equal(diffSummary(before, patch, PROSPECT_LABELS), 'Ville : Namur → Liège');
});

test('diffSummary : traite null/chaîne vide comme équivalents ("—")', () => {
  const before = { city: null };
  const patch = { city: '' };
  assert.equal(diffSummary(before, patch, PROSPECT_LABELS), '');
});

test('diffSummary : gère un champ nouvellement renseigné (avant vide)', () => {
  const patch = { city: 'Namur' };
  assert.equal(diffSummary(null, patch, PROSPECT_LABELS), 'Ville : — → Namur');
});

test('severelyOverdueFollowups : ne retient que les relances en retard de plus de 3 jours', () => {
  const prospects = [
    { id: 1, status: 'envoye', next_followup_at: new Date(NOW - 4 * DAY).toISOString() }, // en retard
    { id: 2, status: 'envoye', next_followup_at: new Date(NOW - 1 * DAY).toISOString() }, // due mais pas "en retard"
    { id: 3, status: 'signe', next_followup_at: new Date(NOW - 10 * DAY).toISOString() }, // clos, ignoré
    { id: 4, status: 'envoye', next_followup_at: null },
  ];
  const overdue = severelyOverdueFollowups(prospects, NOW);
  assert.deepEqual(overdue.map((p) => p.id), [1]);
});

test('severelyOverdueFollowups : seuil personnalisable', () => {
  const prospects = [{ id: 1, status: 'envoye', next_followup_at: new Date(NOW - 2 * DAY).toISOString() }];
  assert.equal(severelyOverdueFollowups(prospects, NOW, 3).length, 0);
  assert.equal(severelyOverdueFollowups(prospects, NOW, 1).length, 1);
});

test('upcomingMeetings : RDV dans les prochaines 24h uniquement, pas le passé ni le lointain', () => {
  const prospects = [
    { id: 1, meeting_at: new Date(NOW + 3 * 60 * 60 * 1000).toISOString() }, // dans 3h : oui
    { id: 2, meeting_at: new Date(NOW - 60 * 60 * 1000).toISOString() }, // il y a 1h : non (passé)
    { id: 3, meeting_at: new Date(NOW + 2 * DAY).toISOString() }, // dans 2 jours : non (trop loin)
    { id: 4, meeting_at: null },
  ];
  assert.deepEqual(upcomingMeetings(prospects, NOW).map((p) => p.id), [1]);
});

test('upcomingRenewals : renouvellements actifs dans les 30 prochains jours ou déjà en retard', () => {
  const clients = [
    { id: 1, status: 'active', renewal_date: new Date(NOW + 10 * DAY).toISOString().slice(0, 10) }, // dans 10j : oui
    { id: 2, status: 'active', renewal_date: new Date(NOW - 5 * DAY).toISOString().slice(0, 10) }, // en retard : oui
    { id: 3, status: 'active', renewal_date: new Date(NOW + 60 * DAY).toISOString().slice(0, 10) }, // trop loin : non
    { id: 4, status: 'annule', renewal_date: new Date(NOW + 1 * DAY).toISOString().slice(0, 10) }, // annulée : non
    { id: 5, status: 'active', renewal_date: null }, // pas de date : non
  ];
  assert.deepEqual(upcomingRenewals(clients, NOW).map((c) => c.id), [1, 2]);
});

test('excludeDismissedDuplicates : retire uniquement les groupes explicitement écartés', () => {
  const groups = [
    { key: 'ecole du centre', prospects: [{ id: 1 }, { id: 2 }] },
    { key: 'institut notre dame', prospects: [{ id: 3 }, { id: 4 }] },
  ];
  const kept = excludeDismissedDuplicates(groups, ['ecole du centre']);
  assert.deepEqual(kept.map((g) => g.key), ['institut notre dame']);
});

test('excludeDismissedDuplicates : ne filtre rien si la liste des clés écartées est vide', () => {
  const groups = [{ key: 'a', prospects: [] }, { key: 'b', prospects: [] }];
  assert.deepEqual(excludeDismissedDuplicates(groups, []), groups);
});

test('checklistItemStatus : jamais vérifié => en retard, sans nombre de jours', () => {
  assert.deepEqual(checklistItemStatus(null, 90, NOW), { overdue: true, daysSinceCheck: null });
});

test('checklistItemStatus : vérifié récemment, dans la fenêtre => pas en retard', () => {
  const checkedAt = new Date(NOW - 10 * DAY).toISOString();
  assert.deepEqual(checklistItemStatus(checkedAt, 90, NOW), { overdue: false, daysSinceCheck: 10 });
});

test('checklistItemStatus : vérifié il y a plus longtemps que la fréquence => en retard', () => {
  const checkedAt = new Date(NOW - 100 * DAY).toISOString();
  assert.deepEqual(checklistItemStatus(checkedAt, 90, NOW), { overdue: true, daysSinceCheck: 100 });
});

test('checklistItemStatus : sans fréquence définie, jamais en retard même vieux', () => {
  const checkedAt = new Date(NOW - 500 * DAY).toISOString();
  assert.deepEqual(checklistItemStatus(checkedAt, null, NOW), { overdue: false, daysSinceCheck: 500 });
});
