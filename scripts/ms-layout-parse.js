// Lecture des pages de disposition de Microsoft Learn (https://learn.microsoft.com/en-us/globalization/keyboards/<nom>.html,
// le fichier affiché dans l'iframe de la page <nom>). Pour chaque état du clavier (normal, Maj, Ctrl+Alt = AltGr,
// Maj+Ctrl+Alt) et chaque rangée, la touche virtuelle (VK_*), le caractère (U+XXXX) et les touches mortes.
// Usage : node scripts/ms-layout-parse.js <fichier.html>
const fs = require('fs');

const STATES = { normal: 'normallower', shift: 'shiftlower', altgr: 'ctrlaltlower', altgrshift: 'shiftctrlaltlower' };
const decode = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function parseState(html, id) {
  const start = html.indexOf(`<DIV ID=${id} `);
  if (start < 0) throw new Error(`état ${id} introuvable`);
  const end = html.indexOf('<DIV ID=', start + 10);
  const block = html.slice(start, end < 0 ? html.length : end);
  const rows = [...block.matchAll(/<TABLE[^>]*>([\s\S]*?)<\/TABLE>/g)].map((m) => m[1]);
  return rows.map((row) => [...row.matchAll(/<TD>\s*<IMG[^>]*?ALT="([^"]*)"[^>]*?onmouseover\s*=\s*"popup\('([^']*)'/g)].map((k) => {
    const alt = decode(k[1]);
    const pop = k[2];
    const vk = (/^(VK_[A-Z0-9_]+)/.exec(pop) || [])[1] || null;
    const cp = (/^U\+([0-9A-F]{4,6})\s+(.*)$/m.exec(alt.split('\n')[0]) || []);
    const dead = /DeadKey:/.test(alt);
    const comp = dead ? [...decode(alt.split('DeadKey:')[1] || '').trim().split(/\s+/)].filter(Boolean) : [];
    // Paires « touche morte puis lettre » : lignes `+a = à` de l'infobulle.
    const pairs = {};
    for (const m of decode(pop).matchAll(/\+(\S+?)\s*=\s*(\S+)\s+U\+[0-9A-F]+/g)) pairs[m[1].replace('{space}', ' ')] = m[2];
    return { vk, cp: cp[1] || null, name: cp[2] || alt.split('\n')[0], dead, comp, pairs };
  }));
}
function parse(file) {
  const html = fs.readFileSync(file, 'latin1');
  const out = {};
  for (const [k, id] of Object.entries(STATES)) out[k] = parseState(html, id);
  return out;
}
module.exports = { parse, STATES };

if (require.main === module) {
  const r = parse(process.argv[2]);
  for (const st of Object.keys(r)) {
    console.log(`\n## ${st}`);
    r[st].slice(0, 5).forEach((row, i) => console.log(`R${i}: ` + row.map((k) => `${(k.vk || '?').replace('VK_', '')}=${k.cp ? String.fromCodePoint(parseInt(k.cp, 16)) : '·'}${k.dead ? '*' : ''}`).join(' ')));
  }
}
