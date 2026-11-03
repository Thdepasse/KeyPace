// Noms de keysyms X11 -> caractères Unicode, pour lire les fichiers xkeyboard-config (symbols/*).
// Seuls les noms réellement rencontrés dans symbols/us et symbols/gb sont listés ; un nom inconnu
// reste visible (« ks:Nom ») au lieu d'être deviné.
const NAMED = {
  grave: '`', asciitilde: '~', exclam: '!', at: '@', numbersign: '#', dollar: '$', percent: '%', asciicircum: '^', ampersand: '&', asterisk: '*',
  parenleft: '(', parenright: ')', minus: '-', underscore: '_', equal: '=', plus: '+', bracketleft: '[', braceleft: '{', bracketright: ']', braceright: '}',
  semicolon: ';', colon: ':', apostrophe: "'", quotedbl: '"', backslash: '\\', bar: '|', comma: ',', less: '<', period: '.', greater: '>', slash: '/', question: '?', space: ' ',
  exclamdown: '¡', onesuperior: '¹', twosuperior: '²', threesuperior: '³', currency: '¤', sterling: '£', EuroSign: '€', onequarter: '¼', onehalf: '½', threequarters: '¾',
  leftsinglequotemark: '‘', rightsinglequotemark: '’', yen: '¥', multiply: '×', division: '÷', adiaeresis: 'ä', Adiaeresis: 'Ä', aring: 'å', Aring: 'Å', eacute: 'é', Eacute: 'É',
  registered: '®', trademark: '™', thorn: 'þ', THORN: 'Þ', udiaeresis: 'ü', Udiaeresis: 'Ü', uacute: 'ú', Uacute: 'Ú', iacute: 'í', Iacute: 'Í', oacute: 'ó', Oacute: 'Ó',
  odiaeresis: 'ö', Odiaeresis: 'Ö', guillemotleft: '«', leftdoublequotemark: '“', guillemotright: '»', rightdoublequotemark: '”', aacute: 'á', Aacute: 'Á', ssharp: 'ß', section: '§',
  eth: 'ð', ETH: 'Ð', ediaeresis: 'ë', Ediaeresis: 'Ë', idiaeresis: 'ï', Idiaeresis: 'Ï', oe: 'œ', OE: 'Œ', oslash: 'ø', Oslash: 'Ø', Ooblique: 'Ø', paragraph: '¶', degree: '°',
  ae: 'æ', AE: 'Æ', periodcentered: '·', copyright: '©', cent: '¢', ntilde: 'ñ', Ntilde: 'Ñ', mu: 'µ', plusminus: '±', ccedilla: 'ç', Ccedilla: 'Ç', questiondown: '¿', notsign: '¬', brokenbar: '¦',
  infinity: '∞', doubledagger: '‡', enfilledcircbullet: '•', ordfeminine: 'ª', masculine: 'º', singlelowquotemark: '‚', endash: '–', emdash: '—', notequal: '≠', doublelowquotemark: '„',
  acute: '´', permille: '‰', dagger: '†', diaeresis: '¨', Greek_pi: 'π', partialderivative: '∂', function: 'ƒ', Greek_OMEGA: 'Ω', squareroot: '√', integral: '∫', idotless: 'ı',
  lessthanequal: '≤', greaterthanequal: '≥', oneeighth: '⅛', threeeighths: '⅜', fiveeighths: '⅝', seveneighths: '⅞', tslash: 'ŧ', Tslash: 'Ŧ', leftarrow: '←', downarrow: '↓', uparrow: '↑', rightarrow: '→',
  dstroke: 'đ', eng: 'ŋ', ENG: 'Ŋ', hstroke: 'ħ', Hstroke: 'Ħ', kra: 'ĸ', lstroke: 'ł', Lstroke: 'Ł', onethird: '⅓', onesixth: '⅙', wacute: 'ẃ', Wacute: 'Ẃ', yacute: 'ý', Yacute: 'Ý',
};
// Touches mortes : nom xkb -> nom du diacritique (et signe combinant Unicode pour composer par NFC).
const DEAD = {
  dead_grave: ['grave', '̀'], dead_acute: ['acute', '́'], dead_circumflex: ['circumflex', '̂'], dead_tilde: ['tilde', '̃'], dead_macron: ['macron', '̄'],
  dead_breve: ['breve', '̆'], dead_abovedot: ['abovedot', '̇'], dead_diaeresis: ['diaeresis', '̈'], dead_abovering: ['abovering', '̊'], dead_doubleacute: ['doubleacute', '̋'],
  dead_caron: ['caron', '̌'], dead_cedilla: ['cedilla', '̧'], dead_ogonek: ['ogonek', '̨'], dead_belowdot: ['belowdot', '̣'], dead_hook: ['hook', '̉'], dead_horn: ['horn', '̛'], dead_stroke: ['stroke', '̸'],
};
// Retourne { ch, dead? } ; ch est null pour NoSymbol, « ks:Nom » pour un nom inconnu.
function keysym(name) {
  if (name === 'NoSymbol') return { ch: null };
  if (DEAD[name]) return { ch: null, dead: DEAD[name][0] };
  if (/^[0-9]$/.test(name) || /^[A-Za-z]$/.test(name)) return { ch: name };
  if (NAMED[name] !== undefined) return { ch: NAMED[name] };
  const u = /^U([0-9A-F]{4,6})$/.exec(name);
  if (u) return { ch: String.fromCodePoint(parseInt(u[1], 16)) };
  const f = /^UF[0-9A-F]{3}$/.exec(name);
  if (f) return { ch: String.fromCodePoint(parseInt(name.slice(1), 16)) };
  return { ch: 'ks:' + name };
}
// Composition d'une touche morte avec une lettre, par Unicode (e + accent aigu combinant = é).
function compose(deadName, base) {
  const entry = Object.values(DEAD).find((d) => d[0] === deadName);
  if (!entry) return null;
  const out = (base + entry[1]).normalize('NFC');
  return [...out].length === 1 ? out : null;
}
module.exports = { keysym, compose, DEAD, NAMED };
