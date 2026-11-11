// Vérifie le vocabulaire néerlandais (course-src/nl-words.json, course-src/nl-lexicon-extra-*.json) auprès de TROIS sources indépendantes :
//   A. Liste OpenTaal (la liste de mots de l'orthographe officielle, formes fléchies comprises, ~414 000 mots) : le mot est-il correctement orthographié ?
//   B. Fréquence d'usage (FrequencyWords, sous-titres, 50 000 mots) : occurrences par million ; absent = mot rare, suspect pour des débutants.
//   C. nl.wiktionary (API MediaWiki) : la page existe-t-elle avec une section « Nederlands » ? (étiquettes vulgair / spreektaal / verouderd relevées)
// Les listes et les réponses du service sont des DONNÉES : seules des valeurs simples (présence, fréquence, étiquettes) en sont tirées.
// Même format de sortie que scripts/check-en-words.js : { results: [{ w, dict, freq, wik, labels }] }, lu par la gate Q10.
// Usage : node scripts/check-nl-words.js --in course-src/nl-lexicon-extra-azerty.json [--retry]   (réseau requis la première fois : les listes sont gardées
// dans le dossier temporaire du système ; environ 1 seconde par mot pour nl.wiktionary). La sortie est <liste>-check.json à côté de l'entrée.
const fs = require('fs');
const os = require('os');
const path = require('path');

const argIn = process.argv.indexOf('--in') > -1 ? process.argv[process.argv.indexOf('--in') + 1] : null;
if (require.main === module && !argIn) { console.error('usage : node scripts/check-nl-words.js --in <liste.json> [--retry]'); process.exit(1); }
const RETRY = process.argv.includes('--retry');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CACHE = path.join(os.tmpdir(), 'keypace-nl-lists');
const LISTS = {
  opentaal: 'https://raw.githubusercontent.com/OpenTaal/opentaal-wordlist/master/wordlist.txt',
  freq: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/nl/nl_50k.txt',
};
const FLAGS = /\b(vulgair|schuttingtaal|spreektaal|verouderd|ouderwets|dialect|Vlaams|Nederlands-Nederlands|informeel|scheldwoord|beledigend|minachtend|spottend|plat)\b/gi;

async function fetchList(name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const f = path.join(CACHE, name + '.txt');
  if (!fs.existsSync(f) || fs.statSync(f).size < 1000) {
    const r = await fetch(LISTS[name], { signal: AbortSignal.timeout(60000), headers: { 'User-Agent': 'KeyPace-vocabulary-check' } });
    if (!r.ok) throw new Error(`${name} : HTTP ${r.status}`);
    fs.writeFileSync(f, await r.text());
  }
  return fs.readFileSync(f, 'utf8');
}

async function loadLists() {
  const open = new Set((await fetchList('opentaal')).split('\n').map((x) => x.trim().toLowerCase()).filter(Boolean));
  const lines = (await fetchList('freq')).split('\n').map((l) => l.trim().split(' ')).filter((p) => p.length === 2);
  const total = lines.reduce((s, p) => s + Number(p[1]), 0);
  const freq = new Map(lines.map(([w, n]) => [w, (Number(n) / total) * 1e6]));
  return { open, freq };
}

async function wiktionary(w) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://nl.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(w)}&prop=sections|wikitext&format=json&redirects=1`, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'KeyPace-vocabulary-check' } });
      if (r.status === 429) { await sleep(2000 * (i + 1)); continue; }
      const j = await r.json();
      if (j.error) return { wik: j.error.code === 'missingtitle' ? 'non' : 'erreur ' + j.error.code, labels: [] };
      const secs = (j.parse.sections || []).map((s) => String(s.line).replace(/<[^>]+>/g, ''));
      const wt = String((j.parse.wikitext && j.parse.wikitext['*']) || '');
      // seule la partie « Nederlands » compte (la page peut aussi décrire le mot dans une autre langue)
      const nl = (wt.split(/\n==\s*[^=\n]+\s*==\n/)[0] || '') + (/\{\{=nld=\}\}/.test(wt) ? wt.slice(wt.indexOf('{{=nld=}}'), wt.indexOf('{{=nld=}}') + 3000) : '');
      return { wik: secs.includes('Nederlands') ? 'oui' : 'non', labels: [...new Set((nl.match(FLAGS) || []).map((x) => x.toLowerCase()))].slice(0, 5) };
    } catch (e) { await sleep(1000 * (i + 1)); }
  }
  return { wik: 'erreur réseau', labels: [] };
}

async function checkOne(w, L) {
  const res = { w, dict: L.open.has(w) ? 'oui' : 'non', freq: L.freq.has(w) ? Number(L.freq.get(w).toFixed(3)) : null };
  const x = await wiktionary(w);
  res.wik = x.wik; res.labels = x.labels;
  return res;
}

async function main() {
  const IN = path.resolve(argIn);
  const words = JSON.parse(fs.readFileSync(IN, 'utf8')).words;
  const OUT = IN.replace(/\.json$/, '-check.json');
  const L = await loadLists();
  const save = (m) => { const all = Object.values(m).sort((a, b) => a.w.localeCompare(b.w)); fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: all.length, results: all }, null, 1)); console.log('écrit', OUT, all.length); };
  const prev = fs.existsSync(OUT) ? Object.fromEntries(JSON.parse(fs.readFileSync(OUT, 'utf8')).results.map((r) => [r.w, r])) : {};
  const todo = RETRY
    ? Object.values(prev).filter((r) => String(r.wik).startsWith('erreur')).map((r) => r.w)
    : words.filter((w) => !prev[w]); // les mots déjà vérifiés ne sont pas refaits
  const byW = {}; for (const w of words) if (prev[w]) byW[w] = prev[w];
  console.log('à vérifier :', todo.length);
  for (let i = 0; i < todo.length; i++) { byW[todo[i]] = await checkOne(todo[i], L); if ((i + 1) % 25 === 0) console.log(`${i + 1}/${todo.length}`); await sleep(RETRY ? 1500 : 400); }
  save(byW);
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { loadLists };
