/* Textes de l'interface par langue. Fichier pur : chargé par index.html (balise script) et par les tests Node.
   Le français est la langue de référence et le REPLI : une clé absente en anglais s'affiche en français, donc migrer écran par écran ne casse rien.
   Langue de l'interface : français par défaut ; l'anglais est en bêta et se choisit avec ?ui=en dans l'adresse (retenu ensuite), ?ui=fr pour revenir.
   Valeurs : du HTML (utilisé dans innerHTML) ; les paramètres s'écrivent {nom}. Pluriel : clé_one (1) et clé_other (tout le reste).
   Règles : aucun tiret long ; l'anglais est britannique (colour, centre, whilst). */
(function (root) {
  const dict = {
    fr: {
      // ── Écran Test de vitesse ──
      'test.eyebrow': 'Défi n° 1 — le test de vitesse',
      'test.title_pre': 'Tape la phrase, découvre ',
      'test.title_accent': 'ta vitesse.',
      'test.subtitle': 'Le chrono démarre tout seul dès que tu commences à taper. À la fin, tu découvres ta vitesse, ta précision et ton badge.',
      'test.another': '↻ Autre texte',
      'test.restart': 'Recommencer',
      'test.eye_on': 'Traqueur des yeux actif',
      'test.eye_off': 'Activer traqueur des yeux',
      'test.eye_banner_head': 'Traqueur des yeux actif : ',
      'test.eye_banner_tail_one': " coup d'œil vers le clavier détecté.",
      'test.eye_banner_tail_other': " coups d'œil vers le clavier détectés.",
      'test.camera_ok': 'CAMÉRA · OK',
      'test.camera_error': 'CAMÉRA · ERREUR',
      'test.speed': 'VITESSE',
      'test.wpm_unit': 'mots / min',
      'test.record': '🏆 record !',
      'test.accuracy': 'PRÉCISION',
      'test.faults_one': '{n} faute',
      'test.faults_other': '{n} fautes',
      'test.time': 'TEMPS',
      'test.finished': 'test terminé',
      'test.running': 'en cours',
      'test.progress': 'PROGRESSION',
      'test.chars_short': '{n} / {total} car.',
      'test.counter': '{n} / {total} caractères',
      'test.hint_idle': 'Commence à taper : le chrono démarre tout seul.',
      'test.hint_running': 'Chrono lancé, garde le rythme',
      'test.hint_done': 'Terminé : {wpm} mots/min à {acc}%',
      'test.space_key': 'espace',
      'test.prefs_title': "Règle l'affichage comme tu veux",
      'test.pref_spaces': 'Espaces visibles&nbsp;:',
      'test.pref_big': 'Très grand texte&nbsp;:',
      'test.pref_font': 'Police&nbsp;:',
      'test.pref_kb': "Clavier à l'écran&nbsp;:",
      'test.yes': 'oui',
      'test.no': 'non',
      'test.font_easy': 'Lecture facile',
      'test.font_std': 'Standard',
    },
    en: {
      'test.eyebrow': 'Challenge no. 1: the speed test',
      'test.title_pre': 'Type the sentence, find out ',
      'test.title_accent': 'your speed.',
      'test.subtitle': 'The timer starts by itself as soon as you begin typing. At the end, you find out your speed, your accuracy and your badge.',
      'test.another': '↻ Another text',
      'test.restart': 'Restart',
      'test.eye_on': 'Eye tracker on',
      'test.eye_off': 'Turn on eye tracker',
      'test.eye_banner_head': 'Eye tracker on: ',
      'test.eye_banner_tail_one': ' glance at the keyboard detected.',
      'test.eye_banner_tail_other': ' glances at the keyboard detected.',
      'test.camera_ok': 'CAMERA · OK',
      'test.camera_error': 'CAMERA · ERROR',
      'test.speed': 'SPEED',
      'test.wpm_unit': 'words / min',
      'test.record': '🏆 record!',
      'test.accuracy': 'ACCURACY',
      'test.faults_one': '{n} mistake',
      'test.faults_other': '{n} mistakes',
      'test.time': 'TIME',
      'test.finished': 'test finished',
      'test.running': 'in progress',
      'test.progress': 'PROGRESS',
      'test.chars_short': '{n} / {total} chars',
      'test.counter': '{n} / {total} characters',
      'test.hint_idle': 'Start typing: the timer starts by itself.',
      'test.hint_running': 'Timer running, keep your rhythm',
      'test.hint_done': 'Finished: {wpm} words/min at {acc}%',
      'test.space_key': 'space',
      'test.prefs_title': 'Set up the display your way',
      'test.pref_spaces': 'Show spaces:',
      'test.pref_big': 'Very large text:',
      'test.pref_font': 'Font:',
      'test.pref_kb': 'On-screen keyboard:',
      'test.yes': 'yes',
      'test.no': 'no',
      'test.font_easy': 'Easy reading',
      'test.font_std': 'Standard',
    },
  };

  const LANGS = Object.keys(dict);
  let forced = null; // langue imposée (tests)

  // Langue de l'interface : ?ui=en|fr dans l'adresse (puis retenue), sinon la valeur retenue, sinon le français.
  function lang() {
    if (forced) return forced;
    try {
      const q = /[?&]ui=(en|fr)(?:&|#|$)/.exec(root.location.search || '');
      if (q) root.localStorage.setItem('kp_ui', q[1]);
      const v = root.localStorage.getItem('kp_ui');
      return LANGS.includes(v) ? v : 'fr';
    } catch (e) { return 'fr'; }
  }
  function setLang(l) { forced = l && LANGS.includes(l) ? l : null; }

  function fill(s, params) {
    return params ? String(s).replace(/\{(\w+)\}/g, (m, k) => (params[k] === undefined ? m : String(params[k]))) : String(s);
  }
  // t('clé', {param}) : texte dans la langue de l'interface, sinon en français, sinon la clé elle-même (visible : une clé oubliée se voit).
  function t(key, params) {
    const l = lang();
    const s = (dict[l] && dict[l][key] !== undefined) ? dict[l][key] : (dict.fr[key] !== undefined ? dict.fr[key] : key);
    return fill(s, params);
  }
  // tn('clé', n, {param}) : pluriel (1 → clé_one, sinon clé_other) ; {n} vaut toujours le nombre.
  function tn(key, n, params) { return t(key + (n === 1 ? '_one' : '_other'), Object.assign({ n }, params || {})); }

  const api = { dict, LANGS, lang, setLang, t, tn };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KPI18n = api;
})(typeof window !== 'undefined' ? window : globalThis);
