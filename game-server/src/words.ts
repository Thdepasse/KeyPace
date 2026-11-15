const WORD_BANK = [
  'temps', 'clavier', 'vitesse', 'course', 'lettre', 'phrase', 'rythme', 'record',
  'victoire', 'combat', 'arène', 'joueur', 'niveau', 'partie', 'podium', 'score',
  'monde', 'ligne', 'point', 'doigt', 'main', 'texte', 'mot', 'signe',
  'espace', 'touche', 'écran', 'géant', 'salle', 'salon', 'départ', 'arrivée',
  'chrono', 'minute', 'seconde', 'éclair', 'flamme', 'orage', 'foudre', 'tempête',
  'sprint', 'marathon', 'énergie', 'focus', 'calme', 'précision', 'erreur', 'faute',
  'machine', 'moteur', 'réseau', 'serveur', 'signal', 'donnée', 'code', 'pixel',
  'lumière', 'ombre', 'nuit', 'jour', 'matin', 'soir', 'étoile', 'lune',
  'montagne', 'rivière', 'océan', 'forêt', 'désert', 'vallée', 'sommet', 'chemin',
  'rouge', 'bleu', 'vert', 'jaune', 'violet', 'orange', 'noir', 'blanc',
  'rapide', 'lent', 'fort', 'souple', 'agile', 'vif', 'net', 'pur',
  'gagner', 'perdre', 'taper', 'écrire', 'lire', 'jouer', 'courir', 'voler',
  'sauter', 'viser', 'tenir', 'lancer', 'finir', 'partir', 'rester', 'monter',
];

/** Génère la liste de mots d'une manche (le même texte pour tous les joueurs du salon). */
export function generateRaceWords(count: number): string[] {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  }
  return words;
}
