// Lecture des fichiers `symbols/*` de xkeyboard-config (format XKB) : résout les `include` et
// retourne, pour une section, les niveaux de chaque touche physique.
// Usage : node scripts/xkb-parse.js <dossier symbols> <fichier> <section>
// Source de référence (règle 1 du plan, 4.14) : le vrai dépôt, pas une copie de test.
const fs = require('fs');
const path = require('path');

function parseFile(text) {
  const sections = {};
  const re = /(?:default\s+)?(?:partial\s+)?(?:alphanumeric_keys\s+)?(?:modifier_keys\s+)?(?:keypad_keys\s+)?(?:function_keys\s+)?(?:alternate_group\s+)?xkb_symbols\s+"([^"]+)"\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    let depth = 1, i = re.lastIndex;
    while (i < text.length && depth) { const c = text[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
    sections[m[1]] = text.slice(re.lastIndex, i - 1);
  }
  return sections;
}
function stripComments(s) { return s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''); }

const cache = {};
function load(dir, file) {
  if (!cache[file]) cache[file] = parseFile(stripComments(fs.readFileSync(path.join(dir, file), 'utf8')));
  return cache[file];
}
// Retourne { keys: { TLDE: ['grave','asciitilde',...], ... }, includes: [...] }
function resolve(dir, file, name, seen = []) {
  const id = `${file}(${name})`;
  if (seen.includes(id)) return { keys: {}, includes: [] };
  const body = load(dir, file)[name];
  if (body === undefined) throw new Error(`section introuvable : ${id}`);
  const out = { keys: {}, includes: [] };
  const lines = body.split(/;\s*/);
  for (const raw of lines) {
    const line = raw.trim();
    const inc = /^(?:augment|override|replace)?\s*include\s+"([^"]+)"/.exec(line);
    if (inc) {
      out.includes.push(inc[1]);
      const mm = /^([^()]+)(?:\(([^)]+)\))?$/.exec(inc[1]);
      const f2 = mm[1], s2 = mm[2] || 'basic';
      const sub = resolve(dir, f2, s2, [...seen, id]);
      Object.assign(out.keys, sub.keys);
      out.includes.push(...sub.includes);
      continue;
    }
    const k = /^key\s*<([A-Z0-9]+)>\s*\{([\s\S]*)\}$/.exec(line.replace(/\s+/g, ' '));
    if (k) {
      const lv = /\[([\s\S]*)\]/.exec(k[2]);
      if (lv) out.keys[k[1]] = lv[1].split(',').map((x) => x.trim()).filter((x) => x.length);
    }
  }
  return out;
}
module.exports = { resolve, parseFile, stripComments };

if (require.main === module) {
  const [dir, file, name] = process.argv.slice(2);
  const r = resolve(dir, file, name);
  console.log(`# ${file}(${name}) includes: ${[...new Set(r.includes)].join(', ')}`);
  for (const [k, v] of Object.entries(r.keys)) if (/^(TLDE|AE\d\d|AD\d\d|AC\d\d|AB\d\d|BKSL|LSGT)$/.test(k)) console.log(k.padEnd(5), v.join(' | '));
}
