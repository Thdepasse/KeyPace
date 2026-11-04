// Gestes déduits d'un modèle de disposition : quelles touches presser (code physique, Maj, AltGr/Option) pour obtenir un
// caractère. Sert à piloter de VRAIES frappes du système (labo-clavier/windows/run-capture.js) et à vérifier le modèle.
const { compose } = require('./keysyms');

// Retourne une liste de pressions { code, shift, alt } (alt = AltGr sous Windows et Linux, Option sous macOS) ou null.
function gestureFor(def, ch) {
  if (ch === ' ') return [{ code: 'Space' }];
  const hit = (pred) => { for (const [code, k] of Object.entries(def.keys)) for (const lv of ['l', 's', 'g', 'gs']) if (pred(k, lv, code)) return { code, lv, k }; return null; };
  const press = (code, lv) => ({ code, shift: lv === 's' || lv === 'gs', alt: lv === 'g' || lv === 'gs' });
  // 1. touche directe (hors touche morte), niveaux de base d'abord
  for (const lv of ['l', 's', 'g', 'gs']) { const h = hit((k, l) => l === lv && k[l] === ch && !(k.dead && k.dead[l])); if (h) return [press(h.code, lv)]; }
  // 2. touche morte puis Espace (le signe lui-même)
  for (const [code, k] of Object.entries(def.keys)) for (const [lv, kind] of Object.entries(k.dead || {})) {
    const table = (def.compose || {})[code + '.' + lv];
    if ((table && table[' '] === ch) || (!table && k[lv] === ch)) return [press(code, lv), { code: 'Space' }];
  }
  // 3. touche morte puis lettre
  for (const [code, k] of Object.entries(def.keys)) for (const [lv, kind] of Object.entries(k.dead || {})) {
    const table = (def.compose || {})[code + '.' + lv] || {};
    for (const [bc, bk] of Object.entries(def.keys)) for (const bl of ['l', 's']) {
      const base = bk[bl]; if (!base || [...base].length !== 1 || (bk.dead && bk.dead[bl])) continue;
      const res = table[base] !== undefined ? table[base] : compose(kind, base);
      if (res === ch) return [press(code, lv), press(bc, bl)];
    }
  }
  return null;
}
module.exports = { gestureFor };
