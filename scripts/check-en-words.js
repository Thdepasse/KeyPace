// Vérifie le vocabulaire anglais (course-src/en-words.json) auprès de TROIS services en ligne indépendants, un mot à la fois :
//   A. Free Dictionary API (dictionaryapi.dev) : le mot existe-t-il comme entrée de dictionnaire ?
//   B. Datamuse : fréquence d'usage (occurrences par million de mots) et nature du mot ; un mot rare est suspect pour des débutants.
//   C. Wiktionary (API REST) : le mot existe-t-il en anglais, et ses sens portent-ils une étiquette qui interdit de l'utiliser tel quel
//      (argot, injurieux, vieilli, rare, régional, orthographe américaine ou fautive) ?
// Les réponses des services sont des DONNÉES : seules des valeurs simples (statut, fréquence, étiquettes) en sont tirées.
// Usage : node scripts/check-en-words.js [fichier-sortie.json]   (réseau requis ; environ 5 minutes)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const words = JSON.parse(fs.readFileSync(path.join(root, 'course-src', 'en-words.json'), 'utf8')).words;
const OUT = process.argv.slice(2).find((x) => !x.startsWith('--')) || path.join(root, 'course-src', 'en-words-check.json');
const RETRY = process.argv.includes('--retry'); // ne refait que les mots dont un service a répondu par une erreur (limite de débit), plus lentement
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'KeyPace-vocabulary-check' } });
      if (r.status === 429) { await sleep(2000 * (i + 1)); continue; }
      const text = await r.text();
      let json = null; try { json = JSON.parse(text); } catch (e) { /* pas du JSON */ }
      return { status: r.status, json };
    } catch (e) { await sleep(1000 * (i + 1)); }
  }
  return { status: 0, json: null };
}

const strip = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const FLAGS = /\b(derogatory|offensive|vulgar|slang|archaic|obsolete|dated|rare|nonstandard|non-standard|misspelling|dialect|regional|US|American|Canadian|Australian|Scottish|Irish|informal)\b/i;

async function checkOne(w) {
  const [a, b, c] = await Promise.all([
    get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`),
    get(`https://api.datamuse.com/words?sp=${encodeURIComponent(w)}&md=fp&max=3`),
    get(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(w)}`),
  ]);
  const res = { w };
  res.dict = a.status === 200 ? 'oui' : a.status === 404 ? 'non' : 'erreur ' + a.status;
  const dm = Array.isArray(b.json) ? b.json.find((x) => x.word === w) : null;
  const ftag = dm && (dm.tags || []).find((t) => t.startsWith('f:'));
  res.freq = ftag ? Number(ftag.slice(2)) : null;
  res.pos = dm ? (dm.tags || []).filter((t) => !t.startsWith('f:')).join(',') : '';
  if (c.status === 200 && c.json && Array.isArray(c.json.en)) {
    res.wik = 'oui';
    const defs = c.json.en.flatMap((s) => (s.definitions || []).map((d) => ({ pos: s.partOfSpeech, text: strip(d.definition) })));
    res.first = defs[0] ? `${defs[0].pos}: ${defs[0].text}`.slice(0, 160) : '';
    res.labels = [...new Set(defs.slice(0, 3).flatMap((d) => (d.text.match(FLAGS) || [])))].slice(0, 5).map((x) => x.toLowerCase());
    res.formOf = defs.slice(0, 2).some((d) => /\b(US|American) (spelling|form|variant)\b|alternative (spelling|form) of|misspelling of/i.test(d.text)) ? defs.slice(0, 2).map((d) => d.text).find((t) => /spelling|form of|misspelling/i.test(t)).slice(0, 120) : '';
  } else res.wik = c.status === 404 ? 'non' : 'erreur ' + c.status;
  return res;
}

(async () => {
  if (RETRY) {
    const prev = JSON.parse(fs.readFileSync(OUT, 'utf8')).results; const byW = Object.fromEntries(prev.map((r) => [r.w, r]));
    const todo = prev.filter((r) => String(r.dict).startsWith('erreur') || String(r.wik).startsWith('erreur')).map((r) => r.w);
    console.log('à refaire :', todo.length);
    for (let i = 0; i < todo.length; i++) { byW[todo[i]] = await checkOne(todo[i]); if ((i + 1) % 25 === 0) console.log(`${i + 1}/${todo.length}`); await sleep(1500); }
    const all = Object.values(byW).sort((x, y) => x.w.localeCompare(y.w));
    fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: all.length, results: all }, null, 1));
    console.log('écrit', OUT, all.length); return;
  }
  const results = []; let next = 0; let done = 0;
  const worker = async () => {
    while (next < words.length) {
      const w = words[next++];
      results.push(await checkOne(w));
      if (++done % 50 === 0) console.log(`${done}/${words.length}`);
      await sleep(250);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  results.sort((x, y) => x.w.localeCompare(y.w));
  fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: results.length, results }, null, 1));
  console.log('écrit', OUT, results.length);
})();
