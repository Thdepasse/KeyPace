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
      // ── Défi entre amis ──
      'chal.challenges_you': '{name} te défie !',
      'chal.their_score': 'Son score :',
      'chal.wpm': 'mpm',
      'chal.accuracy_pct': '{acc}% de précision',
      'chal.do_better': 'À toi de faire mieux.',
      'chal.you_win': '🏆 Tu bats {name} !',
      'chal.tie': '🤝 Égalité avec {name}',
      'chal.you_lose': '😤 {name} te devance',
      'chal.you': 'Toi',
      'chal.challenge_friends': '🏁 Défie tes amis',
      'chal.explain': 'Envoie-leur ton score : le lien leur débloque un test pour te battre. Pour continuer le duel, <b>demande-leur de te renvoyer leur score</b> : chaque lien reçu te redonne un test.',
      'chal.first_name': 'Ton prénom',
      'chal.share_btn': 'Partager mon défi',
      'chal.a_friend': 'Un ami',
      'chal.share_text': 'Je viens de taper à {wpm} mpm sur KeyPace. Tu peux faire mieux ?',
      'chal.share_title': 'Défi KeyPace',
      'chal.copied': '✓ Lien copié ! Envoie-le à tes amis. Quand ils te renvoient le leur, tu peux rejouer.',
      // ── Après le test (visiteur) ──
      'after.eyebrow': 'Après le test',
      'after.title': 'Ce que tu débloques avec ton compte',
      'after.f1_title': '65 leçons, 5 minutes chacune',
      'after.f1_text': 'Tu commences par 8 touches, puis les accents, les chiffres et les symboles.',
      'after.f2_title': "8+ jeux pour s'entraîner",
      'after.f2_text': "Frappe-mots, Le Sprint et d'autres défis : précision, mémoire et vitesse.",
      'after.f3_title': 'Tes progrès enregistrés',
      'after.f3_text': 'Chaque défi réussi fait monter ta courbe de vitesse et de précision.',
      'after.cta2_title': 'Prêt pour le défi n° 2&nbsp;?',
      'after.cta2_text': '10 leçons offertes, test illimité, rien à installer.',
      'after.create_account': 'Créer mon compte gratuit →',
      'after.next_title': 'Prêt pour la suite&nbsp;?',
      'after.next_text': 'Retourne à tes leçons et continue ta progression.',
      'after.resume': 'Reprendre les cours →',
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
      'chal.challenges_you': '{name} is challenging you!',
      'chal.their_score': 'Their score:',
      'chal.wpm': 'wpm',
      'chal.accuracy_pct': '{acc}% accuracy',
      'chal.do_better': 'Can you beat it?',
      'chal.you_win': '🏆 You beat {name}!',
      'chal.tie': '🤝 You tied with {name}',
      'chal.you_lose': '😤 {name} is ahead of you',
      'chal.you': 'You',
      'chal.challenge_friends': '🏁 Challenge your friends',
      'chal.explain': 'Send them your score: the link unlocks a test so they can try to beat you. To keep the duel going, <b>ask them to send their score back</b>: every link you receive gives you another test.',
      'chal.first_name': 'Your first name',
      'chal.share_btn': 'Share my challenge',
      'chal.a_friend': 'A friend',
      'chal.share_text': 'I just typed at {wpm} wpm on KeyPace. Can you do better?',
      'chal.share_title': 'KeyPace challenge',
      'chal.copied': '✓ Link copied! Send it to your friends. When they send theirs back, you can play again.',
      'after.eyebrow': 'After the test',
      'after.title': 'What you unlock with your account',
      'after.f1_title': '65 lessons, 5 minutes each',
      'after.f1_text': 'You start with 8 keys, then move on to accents, numbers and symbols.',
      'after.f2_title': '8+ games to practise with',
      'after.f2_text': 'Word Strike, the Sprint and other challenges: accuracy, memory and speed.',
      'after.f3_title': 'Your progress saved',
      'after.f3_text': 'Every challenge you pass pushes up your speed and accuracy curve.',
      'after.cta2_title': 'Ready for challenge no. 2?',
      'after.cta2_text': '10 free lessons, unlimited tests, nothing to install.',
      'after.create_account': 'Create my free account →',
      'after.next_title': 'Ready for what comes next?',
      'after.next_text': 'Go back to your lessons and carry on with your progress.',
      'after.resume': 'Back to my lessons →',
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
