// Vérifie que les suites de deux mots des textes anglais (course-src/<langue>-<clavier>/) sont des enchaînements NATURELS en anglais, pas des calques du français.
// Méthode : pour chaque mot A suivi d'un mot B dans un texte, on demande à Datamuse les mots qui suivent le plus souvent A (rel_bga, 1000 résultats) ;
// si B n'y est pas, l'enchaînement « A B » est listé comme À REVOIR. Ce n'est pas une erreur : beaucoup de phrases correctes combinent des mots rares
// ensemble ; c'est une liste de doutes à regarder, avec la phrase d'origine. Les mots outils très courants (the, a, and, is…) ne sont pas contrôlés.
// Usage : node scripts/check-en-collocations.js <dossier-de-cours> [sortie.json]     ex. : node scripts/check-en-collocations.js course-src/en-qwerty
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(dir)) { console.error('Usage : node scripts/check-en-collocations.js <dossier-de-cours> [sortie.json]'); process.exit(1); }
const OUT = process.argv[3] || path.join(dir, '..', path.basename(dir) + '-collocations.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STOP = new Set('the a an and or but of to in on at by for with from as is are was were be been it its this that these those i you he she we they my your his her our their me him us them do does did have has had will would can could not no so if then than there here'.split(' '));

async function followers(word) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://api.datamuse.com/words?rel_bga=${encodeURIComponent(word)}&max=1000`, { signal: AbortSignal.timeout(20000) });
      if (r.status === 429) { await sleep(2000 * (i + 1)); continue; }
      const j = await r.json(); return Array.isArray(j) ? new Set(j.map((x) => x.word)) : null;
    } catch (e) { await sleep(1000 * (i + 1)); }
  }
  return null;
}

(async () => {
  const lessons = fs.readdirSync(dir).filter((f) => /^\d\d-.*\.json$/.test(f)).sort().flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).lessons);
  const pairs = new Map(); // "a b" -> [ids]
  for (const l of lessons) {
    const toks = (l.text || '').toLowerCase().split(/\s+/).map((t) => t.replace(/[^a-z']/g, ''));
    for (let i = 0; i + 1 < toks.length; i++) {
      const a = toks[i], b = toks[i + 1];
      if (!a || !b || a.length < 3 || b.length < 3 || STOP.has(a) || STOP.has(b)) continue;
      const k = a + ' ' + b; if (!pairs.has(k)) pairs.set(k, []); pairs.get(k).push(l.id);
    }
  }
  const firsts = [...new Set([...pairs.keys()].map((k) => k.split(' ')[0]))];
  const cache = {}; let n = 0;
  for (const w of firsts) { cache[w] = await followers(w); if (++n % 40 === 0) console.log(`${n}/${firsts.length}`); await sleep(120); }
  const review = [], ok = [], unknown = [];
  for (const [k, ids] of pairs) {
    const [a, b] = k.split(' '); const set = cache[a];
    if (!set) unknown.push({ pair: k, lessons: [...new Set(ids)] });
    else if (set.has(b)) ok.push(k); else review.push({ pair: k, lessons: [...new Set(ids)] });
  }
  fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString().slice(0, 10), dossier: path.basename(dir), pairs: pairs.size, naturels: ok.length, aRevoir: review, sansReponse: unknown }, null, 1));
  console.log(`${pairs.size} enchaînements : ${ok.length} courants, ${review.length} à revoir, ${unknown.length} sans réponse → ${OUT}`);
})();
