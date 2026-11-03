// Nettoyage de `progress.data` avant écriture (étape 1a du plan clavier/langues).
// Le blob est écrit par le client : on ne lui fait pas confiance pour les champs
// qui ne lui appartiennent pas, ni pour les valeurs impossibles. Logique pure, sans réseau.
const MAX_WPM = 300;                   // même ordre de grandeur que CERT_MAX_PLAUSIBLE_WPM (api/classes.js)
const MAX_FUTURE_MS = 24 * 3600 * 1000; // tolérance pour une horloge d'ordinateur d'école décalée
const MAX_BYTES = 500 * 1024;          // plafond de sécurité d'un bloc (le plus gros relevé fait ~5 Ko)

// Champs que le client écrit aujourd'hui (index.html) et clés réellement présentes en base (2026-11-03).
// Une clé hors de cette liste est acceptée comme avant, mais signalée : voir `unknownKeys`.
const KNOWN_KEYS = new Set([
  'tests', 'lessons', 'goals', 'keyStats', 'assignmentsDone',
  'gameBest', 'courseBest', 'simonBest', 'clavierBest', 'ghostBest', 'sprintBest',
  'sourisBest', 'sourisTiers', 'sourisHybridHand', 'sourisGridBest', 'sourisGridTop',
  'sourisHybridBest', 'sourisTilesBest', 'sourisTilesTutorialSeen',
  'bossBest', 'duelRecord',
  // Présents en base (relevé du 2026-11-03) mais dont je n'ai pas lu le code : règles de fusion à relever.
  'tireurBest', 'sourisDuoBest', 'sourisSoloBest', 'sourisWavesBest', 'sourisHub', 'sourisTilesGlossaryAutoSeen',
]);
// Champs possédés par le serveur : jamais lus depuis le client, valeur enregistrée conservée.
const SERVER_OWNED = ['role', 'classes', 'courses'];

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v) => typeof v === 'number' && Number.isFinite(v);

function sanitizeProgress(input, prev, now = Date.now()) {
  const data = { ...input };
  const prevData = isObj(prev) ? prev : {};
  const dropped = [];
  const note = (field) => dropped.push(field);

  for (const k of SERVER_OWNED) {
    if (prevData[k] !== undefined) data[k] = prevData[k];
    else delete data[k];
  }
  const unknownKeys = Object.keys(data).filter((k) => !KNOWN_KEYS.has(k) && !SERVER_OWNED.includes(k));

  if (data.tests !== undefined) {
    if (!Array.isArray(data.tests)) { data.tests = prevData.tests || []; note('tests'); }
    else {
      data.tests = data.tests.filter((t) => {
        // On n'écarte que l'impossible : une entrée ancienne (sans date, par exemple) reste.
        const ok = !isObj(t) || ((t.t === undefined || (num(t.t) && t.t <= now + MAX_FUTURE_MS))
          && (t.wpm === undefined || (num(t.wpm) && t.wpm >= 0 && t.wpm <= MAX_WPM))
          && (t.acc === undefined || (num(t.acc) && t.acc >= 0 && t.acc <= 100)));
        if (!ok) note('tests[]');
        return ok;
      });
    }
  }

  if (data.lessons !== undefined) {
    if (!isObj(data.lessons)) { data.lessons = prevData.lessons || {}; note('lessons'); }
    else {
      const out = {};
      for (const [id, v] of Object.entries(data.lessons)) {
        const wpm = isObj(v) ? v.bestWpm : v;
        const ok = (num(v) || isObj(v)) && (wpm === undefined || (num(wpm) && wpm >= 0 && wpm <= MAX_WPM))
          && (!isObj(v) || v.bestErr == null || (num(v.bestErr) && v.bestErr >= 0));
        if (ok) out[id] = v;
        else { note('lessons[]'); if (prevData.lessons && prevData.lessons[id] !== undefined) out[id] = prevData.lessons[id]; }
      }
      data.lessons = out;
    }
  }

  for (const f of ['courseBest', 'ghostBest', 'sprintBest']) {
    const v = data[f];
    if (v !== undefined && v !== null && !(isObj(v) && num(v.wpm) && v.wpm >= 0 && v.wpm <= MAX_WPM)) {
      note(f);
      if (prevData[f] !== undefined) data[f] = prevData[f]; else delete data[f];
    }
  }

  if (data.keyStats !== undefined) {
    if (!isObj(data.keyStats)) { data.keyStats = prevData.keyStats || {}; note('keyStats'); }
    else {
      const out = {};
      for (const [key, v] of Object.entries(data.keyStats)) {
        const ok = isObj(v) && Number.isInteger(v.n) && Number.isInteger(v.e) && v.n >= 0 && v.e >= 0 && v.e <= v.n;
        if (ok) out[key] = v;
        else { note('keyStats[]'); if (prevData.keyStats && prevData.keyStats[key] !== undefined) out[key] = prevData.keyStats[key]; }
      }
      data.keyStats = out;
    }
  }

  return { data, dropped, unknownKeys };
}

module.exports = { sanitizeProgress, MAX_BYTES, MAX_WPM, MAX_FUTURE_MS, KNOWN_KEYS };
