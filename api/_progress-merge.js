// Fusion de deux versions de `progress.data` (étape 1b du plan clavier/langues).
// Principe : une sauvegarde ne doit jamais faire reculer ce que le serveur a déjà.
// `prev` = ce que le serveur a enregistré, `inc` = ce que le client envoie (déjà nettoyé par
// _progress-sanitize). Règles par champ : voir docs/PLAN-clavier-qwerty.md, section 4.4.
// Logique pure, sans réseau, utilisable côté client plus tard (même fichier).

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const TIER_RANK = { bronze: 1, silver: 2, gold: 3 };

const maxNum = (a, b) => (num(a) && num(b) ? Math.max(a, b) : num(a) ? a : b);
const better = (a, b, isBetter) => (a === undefined || a === null ? b : b === undefined || b === null ? a : isBetter(b, a) ? b : a);

// Champs numériques simples : le plus haut.
const MAX_FIELDS = ['gameBest', 'sourisBest'];
// Records objets : plus haute valeur de la clé donnée.
const HIGH_FIELD = { courseBest: 'wpm', ghostBest: 'wpm', sprintBest: 'wpm', simonBest: 'score' };
// Données héritées (jeux retirés) : aucun code actuel ne les écrit, on garde le serveur.
const LEGACY_KEEP = ['tireurBest', 'sourisDuoBest', 'sourisSoloBest', 'sourisWavesBest', 'sourisHub', 'sourisTilesGlossaryAutoSeen'];

function testKey(t) {
  return isObj(t) && num(t.t) ? `${t.t}|${t.mode || ''}|${t.wpm}|${t.acc}` : JSON.stringify(t);
}
function mergeTests(a, b) {
  const seen = new Set(); const out = [];
  for (const t of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    const k = testKey(t);
    if (!seen.has(k)) { seen.add(k); out.push(t); }
  }
  // Ordre chronologique ; les entrées sans date restent en tête dans leur ordre d'arrivée.
  return out.map((t, i) => [t, i]).sort((x, y) => ((isObj(x[0]) && num(x[0].t) ? x[0].t : -Infinity) - (isObj(y[0]) && num(y[0].t) ? y[0].t : -Infinity)) || x[1] - y[1]).map((x) => x[0]);
}
function asLesson(v) { return num(v) ? { bestWpm: v, bestErr: 0, cleared: true } : v; }
function mergeLesson(a, b) {
  if (a === undefined) return b; if (b === undefined) return a;
  const x = asLesson(a), y = asLesson(b);
  if (!isObj(x) || !isObj(y)) return b;
  const out = { ...x, ...y };
  out.bestWpm = maxNum(x.bestWpm, y.bestWpm);
  const errs = [x.bestErr, y.bestErr].filter(num);
  out.bestErr = errs.length ? Math.min(...errs) : (y.bestErr !== undefined ? y.bestErr : x.bestErr);
  out.cleared = !!(x.cleared || y.cleared);
  // Une leçon reprise d'un autre cours perd son marqueur dès qu'un vrai essai existe.
  const real = (l) => num(l.bestWpm) && l.bestWpm > 0 && !l.importedFrom;
  if (real(x) || real(y)) delete out.importedFrom;
  return out;
}
function mergeMapWith(a, b, fn) {
  const out = { ...(isObj(a) ? a : {}) };
  for (const [k, v] of Object.entries(isObj(b) ? b : {})) out[k] = k in out ? fn(out[k], v) : v;
  return out;
}
const tierRank = (t) => TIER_RANK[t] || 0;
function betterTierRec(a, b) { // record {score, tier}: palier puis score
  if (!isObj(a) || !isObj(b)) return b;
  return (tierRank(b.tier) > tierRank(a.tier) || (tierRank(b.tier) === tierRank(a.tier) && num(b.score) && (!num(a.score) || b.score > a.score))) ? b : a;
}
function mergeTierRecords(a, b) { // record seul, ou table par sous-clé
  if (a === undefined || a === null) return b; if (b === undefined || b === null) return a;
  const flat = (v) => isObj(v) && num(v.score);
  if (flat(a) && flat(b)) return betterTierRec(a, b);
  if (isObj(a) && isObj(b) && !flat(a) && !flat(b)) return mergeMapWith(a, b, betterTierRec);
  return b; // formes différentes : la version envoyée
}
function mergeKeyStats(a, b) {
  return mergeMapWith(a, b, (x, y) => (isObj(x) && isObj(y) ? (num(y.n) && num(x.n) && y.n >= x.n ? y : x) : y));
}
function betterClavier(a, b) {
  if (!isObj(a) || !isObj(b)) return b;
  return (b.mistakes < a.mistakes || (b.mistakes === a.mistakes && b.elapsed < a.elapsed)) ? b : a;
}

// Retourne { data, changes } : `changes` liste les champs où le serveur avait plus que le client
// (la fusion a donc évité une perte).
function mergeProgress(prev, inc) {
  const p = isObj(prev) ? prev : {};
  const out = { ...inc };
  const changes = [];
  const set = (k, v) => { if (JSON.stringify(v) !== JSON.stringify(inc[k])) changes.push(k); out[k] = v; };

  if (p.tests !== undefined || inc.tests !== undefined) set('tests', mergeTests(p.tests, inc.tests));
  if (p.lessons !== undefined || inc.lessons !== undefined) set('lessons', mergeMapWith(p.lessons, inc.lessons, mergeLesson));
  for (const k of MAX_FIELDS) if (p[k] !== undefined) set(k, maxNum(p[k], inc[k]));
  for (const [k, f] of Object.entries(HIGH_FIELD)) {
    if (p[k] !== undefined) set(k, better(p[k], inc[k], (n, o) => isObj(n) && isObj(o) && num(n[f]) && (!num(o[f]) || n[f] > o[f])));
  }
  if (p.clavierBest !== undefined) set('clavierBest', better(p.clavierBest, inc.clavierBest, (n, o) => betterClavier(o, n) === n));
  for (const k of ['sourisGridBest', 'sourisHybridBest', 'sourisTilesBest']) if (p[k] !== undefined) set(k, mergeTierRecords(p[k], inc[k]));
  if (p.sourisGridTop !== undefined) set('sourisGridTop', mergeMapWith(p.sourisGridTop, inc.sourisGridTop, (x, y) => maxNum(x, y)));
  if (p.sourisTiers !== undefined) set('sourisTiers', mergeMapWith(p.sourisTiers, inc.sourisTiers, (x, y) => (tierRank(y) >= tierRank(x) ? y : x)));
  if (p.sourisTilesTutorialSeen !== undefined) set('sourisTilesTutorialSeen', !!(p.sourisTilesTutorialSeen || inc.sourisTilesTutorialSeen));
  if (p.keyStats !== undefined) set('keyStats', mergeKeyStats(p.keyStats, inc.keyStats));
  if (p.duelRecord !== undefined) {
    const d = { ...(isObj(inc.duelRecord) ? inc.duelRecord : {}) };
    for (const f of ['wins', 'losses', 'draws']) d[f] = maxNum(isObj(p.duelRecord) ? p.duelRecord[f] : undefined, d[f]);
    set('duelRecord', d);
  }
  if (p.bossBest !== undefined && isObj(p.bossBest) && isObj(inc.bossBest) && typeof p.bossBest.isoWeek === 'string' && typeof inc.bossBest.isoWeek === 'string' && p.bossBest.isoWeek > inc.bossBest.isoWeek) set('bossBest', p.bossBest);
  else if (p.bossBest !== undefined && inc.bossBest === undefined) set('bossBest', p.bossBest);
  // goals, sourisHybridHand : dernier écrit gagne (la valeur envoyée). Absents côté client : valeur du serveur.
  for (const k of ['goals', 'sourisHybridHand']) if (p[k] !== undefined && inc[k] === undefined) set(k, p[k]);
  for (const k of LEGACY_KEEP) if (p[k] !== undefined) set(k, p[k]);
  return { data: out, changes };
}

module.exports = { mergeProgress };
