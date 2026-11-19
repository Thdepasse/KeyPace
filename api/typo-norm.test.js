// Normes typographiques (typo-norm.js) : chaque ligne du tableau belge « Les règles d'espacement », et ce qu'il ne faut jamais toucher.
const test = require('node:test');
const assert = require('node:assert');
const T = require('../typo-norm.js');

const be = (s) => T.applyTypoNorm(s, 'be');
const NBSP = '\u00A0', NNBSP = '\u202F';

test('norme : valeurs admises, défaut français', () => {
  assert.strictEqual(T.normalizeNorm('be'), 'be');
  assert.strictEqual(T.normalizeNorm('fr'), 'fr');
  for (const v of [undefined, null, '', 'BE', 'nl', 42]) assert.strictEqual(T.normalizeNorm(v), 'fr');
});

test('norme française (défaut) : texte rendu strictement inchangé', () => {
  const s = 'il dit : « bonjour ». où es-tu ? viens ici ! voici ; ça';
  assert.strictEqual(T.applyTypoNorm(s, 'fr'), s);
  assert.strictEqual(T.applyTypoNorm(s), s);
  assert.strictEqual(T.applyTypoNorm(s, 'xx'), s);
  assert.strictEqual(T.applyTypoNorm(null, 'be'), null);
  assert.strictEqual(T.applyTypoNorm('', 'be'), '');
});

test('ligne 1 : . ? ! , ; : point abréviatif, … en fin de mot : 0 avant, 1 après', () => {
  assert.strictEqual(be('Viens-tu avec nous ? Ne sois pas gêné !'), 'Viens-tu avec nous? Ne sois pas gêné!');
  assert.strictEqual(be('au jardin ; en revient'), 'au jardin; en revient');
  assert.strictEqual(be('Une précision : je ne…'), 'Une précision: je ne…');
  assert.strictEqual(be('M. DUPONT'), 'M. DUPONT');
  assert.strictEqual(be('mille sab…'), 'mille sab…');
  assert.strictEqual(be('il pleut, il vente. la nuit tombe.'), 'il pleut, il vente. la nuit tombe.');
  // espaces insécable et fine insécable de la typographie française
  assert.strictEqual(be('vraiment' + NBSP + '? oui' + NNBSP + '! voici' + NNBSP + ': a' + NBSP + '; b'), 'vraiment? oui! voici: a; b');
  // fin de texte, plusieurs espaces, signes doublés
  assert.strictEqual(be('encore ?'), 'encore?');
  assert.strictEqual(be('quoi  ?'), 'quoi?');
  assert.strictEqual(be('vraiment ?!'), 'vraiment?!');
  assert.strictEqual(be('bonne journée (enfin) !'), 'bonne journée (enfin)!');
});

test('ligne 2 : parenthèses, crochets, guillemets : 0 à l\'intérieur, 1 à l\'extérieur ; guillemets droits', () => {
  assert.strictEqual(be('Un chou (à la crème)'), 'Un chou (à la crème)');
  assert.strictEqual(be('Il pensait [...] aux chances'), 'Il pensait [...] aux chances');
  assert.strictEqual(be('Il lit le journal « Le Soir ».'), 'Il lit le journal "Le Soir".');
  assert.strictEqual(be('Il lit le journal «' + NBSP + 'Le Soir' + NNBSP + '».'), 'Il lit le journal "Le Soir".');
  assert.strictEqual(be('Il lit le journal "Le Soir".'), 'Il lit le journal "Le Soir".');
  assert.strictEqual(be('il dit : « bonjour ».'), 'il dit: "bonjour".');
  assert.strictEqual(be('« Viens vite ! » dit-il.'), '"Viens vite!" dit-il.');
  assert.strictEqual(be('Elle répondit : « J\'arrive ; attends-moi. »'), 'Elle répondit: "J\'arrive; attends-moi."');
});

test('ligne 3 : … remplaçant du texte, tiret, &, §, signes arithmétiques, % : 1 avant, 1 après (inchangé)', () => {
  for (const s of ['Pierre qui roule …', 'Il fait - vous le savez - de gros efforts.', 'DUBOIS & Cie', 'voir § 5', '8 + 4 = 12 : 2 x 6 = 36', '25 %', '12 : 2 = 6'])
    assert.strictEqual(be(s), s, s);
});

test('lignes 4 et 5 : degré de température (1 avant, 0 après), degré seul (0 avant, 1 après) : inchangé', () => {
  assert.strictEqual(be('il fait 25 °C dehors'), 'il fait 25 °C dehors');
  assert.strictEqual(be('un angle de 25° environ'), 'un angle de 25° environ');
});

test('ligne 6 : 0 avant, 0 après (parenthèse isolant une lettre, trait d\'union, virgule décimale, @, apostrophe, sigle, /, angles) : inchangé', () => {
  for (const s of ['soussigné(e)', 'Après-midi', '25,7 cm', 'a@b.com', "Aujourd'hui", 'O.N.U.', '120 km/h', "8°53'33''"])
    assert.strictEqual(be(s), s, s);
});

test('jamais touché : URL, heures, chemins, code, adresses mail', () => {
  for (const s of [
    'http://www.keypace.be/a?b=1', 'https://exemple.be/x?y=2&z=3', 'www.keypace.be/?q=1',
    '8h30', '12:30', 'rendez-vous à 12:30 précises',
    'C:\\Users\\eleve\\Documents', 'cd /var/log', 'cd ~/projet',
    '{style: "bold"}', '{"clé": "données"}', '"clé": "données"', '<div class="main">', 'prenom.nom+cours@ecole.be',
    'tapez `a ; b ? c`',
  ]) assert.strictEqual(be(s), s, s);
  // un signe de phrase juste avant un segment protégé change, pas le segment
  assert.strictEqual(be('ou par email : contact@keypace.be. Bien cordialement.'), 'ou par email: contact@keypace.be. Bien cordialement.');
  assert.strictEqual(be('voir : http://x.be/?a=1 ou C:\\Temp ; merci !'), 'voir: http://x.be/?a=1 ou C:\\Temp; merci!');
  assert.strictEqual(
    be('le fichier config.json : {"version": "1.0", "debug": false, "port": 3000}. Lancer : `npm start` dans ~/projet.'),
    'le fichier config.json: {"version": "1.0", "debug": false, "port": 3000}. Lancer: `npm start` dans ~/projet.');
  assert.strictEqual(be('tél : 04 98 76 54 32. rendez-vous à 8h30.'), 'tél: 04 98 76 54 32. rendez-vous à 8h30.');
});

test('exercices de touches : un signe collé à la lettre suivante n\'est pas de la ponctuation de phrase', () => {
  for (const s of ['a; ;a a; ;a a;a; ;a;a', 'jkl; fdsa ;lkj', 'a1 ;0', 'aa;; ;;aa']) assert.strictEqual(be(s), s, s);
});

test('exclusion d\'une leçon : typoNorm:false', () => {
  assert.strictEqual(T.lessonAllowsNorm({ id: 'pon2' }), true);
  assert.strictEqual(T.lessonAllowsNorm({ id: 'sym1', typoNorm: false }), false);
  assert.strictEqual(T.lessonAllowsNorm(null), true);
});

test('idempotent : appliquer deux fois donne le même texte', () => {
  const s = '« Viens vite ! » dit-il. Elle répondit : « J\'arrive ; attends-moi. » Vingt-cinq minutes plus tard (enfin), elle arriva.';
  assert.strictEqual(be(be(s)), be(s));
});

test('interface (applyTypoNormUi) : mêmes règles sur les consignes, boutons et messages', () => {
  const ui = T.applyTypoNormUi;
  assert.strictEqual(ui('Accès libre : toutes les leçons'), 'Accès libre: toutes les leçons');
  assert.strictEqual(ui(`Réessaie${NNBSP}!`), 'Réessaie!');
  assert.strictEqual(ui(`« Viens-tu${NBSP}? » dit-il`), '"Viens-tu?" dit-il');
  assert.strictEqual(ui('Ex : Dupont, vraiment ?!'), 'Ex: Dupont, vraiment?!');
  assert.strictEqual(ui('Sans ponctuation'), 'Sans ponctuation');
  assert.strictEqual(ui(null), null);
});

test('interface : signes isolés (étiquettes de touches) et texte protégé jamais touchés', () => {
  const ui = T.applyTypoNormUi;
  for (const s of ['? !', ': ;', '« »', '«', '»', '12 : 2', 'https://keypace.be/?a=1 :b']) assert.strictEqual(ui(s), s, s);
  assert.strictEqual(ui('écris à prof@ecole.be : merci'), 'écris à prof@ecole.be: merci');
});
