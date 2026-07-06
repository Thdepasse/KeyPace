const WORD_BANK = [
  'temps', 'clavier', 'vitesse', 'course', 'lettre', 'phrase', 'rythme', 'record',
  'victoire', 'combat', 'arene', 'joueur', 'niveau', 'partie', 'podium', 'score',
  'monde', 'ligne', 'point', 'doigt', 'main', 'texte', 'mot', 'signe',
  'espace', 'touche', 'ecran', 'geant', 'salle', 'salon', 'depart', 'arrivee',
  'chrono', 'minute', 'seconde', 'eclair', 'flamme', 'orage', 'foudre', 'tempete',
  'sprint', 'marathon', 'energie', 'focus', 'calme', 'precision', 'erreur', 'faute',
  'machine', 'moteur', 'reseau', 'serveur', 'signal', 'donnee', 'code', 'pixel',
  'lumiere', 'ombre', 'nuit', 'jour', 'matin', 'soir', 'etoile', 'lune',
  'montagne', 'riviere', 'ocean', 'foret', 'desert', 'vallee', 'sommet', 'chemin',
  'rouge', 'bleu', 'vert', 'jaune', 'violet', 'orange', 'noir', 'blanc',
  'rapide', 'lent', 'fort', 'souple', 'agile', 'vif', 'net', 'pur',
  'gagner', 'perdre', 'taper', 'ecrire', 'lire', 'jouer', 'courir', 'voler',
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
