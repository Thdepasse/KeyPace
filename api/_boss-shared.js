// Helpers partagés pour le Boss de la semaine
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

async function sb(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : null };
}

// Banque de textes du défi (FR cohérents, accentués). Rotation déterministe par semaine ISO.
const BOSS_TEXTS = [
  "le vent du nord balaie la plaine déserte tandis que les premiers flocons dansent dans la lumière pâle du matin ; au loin, une cheminée fume doucement et rappelle qu'un foyer attend toujours quelque part.",
  "apprendre à taper vite, c'est apprendre à faire confiance à ses mains : au début chaque touche demande un effort, puis vient le jour où les mots glissent tout seuls, comme une mélodie que les doigts connaissent par cœur.",
  "la bibliothèque sentait le vieux papier et la cire ; entre les rayonnages silencieux, des milliers d'histoires patientaient, prêtes à offrir un voyage immobile à quiconque oserait ouvrir la première page.",
  "sur le marché du dimanche, les étals débordent de fruits mûrs, de fleurs fraîches et de fromages affinés ; les voix se mêlent, les rires fusent, et l'odeur du pain chaud guide les promeneurs jusqu'au coin du boulanger.",
  "chaque champion a un jour été un débutant maladroit ; la différence ne tient pas au talent mais à la régularité, à cette petite habitude tenace de recommencer, encore et encore, jusqu'à ce que le geste devienne naturel.",
  "la nuit tombait sur le port et les bateaux se balançaient au rythme des vagues ; un phare clignait au loin, fidèle, rappelant aux marins fatigués que la côte était proche et que le repos n'attendait plus très longtemps.",
];

// Numéro de semaine ISO (norme : la semaine 1 contient le premier jeudi de l'année)
function isoWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return { year: date.getUTCFullYear(), week };
}

// Lundi 00:00 UTC de la semaine ISO contenant d, + lundi suivant
function isoWeekBounds(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // 0 = lundi
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - dayNum);
  monday.setUTCHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday, end: nextMonday };
}

// Récupère (ou crée) le défi de la semaine courante, de façon déterministe
async function getCurrentChallenge() {
  const now = new Date();
  const { year, week } = isoWeek(now);
  const isoWeekStr = `${year}-W${String(week).padStart(2, '0')}`;

  const existing = await sb(`/weekly_challenges?iso_week=eq.${encodeURIComponent(isoWeekStr)}&select=*`);
  if (existing.data && existing.data[0]) return existing.data[0];

  const { start, end } = isoWeekBounds(now);
  const text = BOSS_TEXTS[(year * 53 + week) % BOSS_TEXTS.length];
  const ins = await sb(`/weekly_challenges`, {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify({ iso_week: isoWeekStr, text, starts_at: start.toISOString(), ends_at: end.toISOString() }),
  });
  if (ins.data && ins.data[0]) return ins.data[0];
  // course possible : un autre appel l'a créé entre-temps
  const retry = await sb(`/weekly_challenges?iso_week=eq.${encodeURIComponent(isoWeekStr)}&select=*`);
  return retry.data && retry.data[0];
}

function computeScore(wpm, acc) {
  const w = Math.max(0, Math.min(220, Number(wpm) || 0));
  const a = Math.max(0, Math.min(100, Number(acc) || 0));
  return Math.round(w * Math.pow(a / 100, 2) * 10) / 10;
}

module.exports = { sb, getCurrentChallenge, computeScore };
