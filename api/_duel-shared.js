// Helpers partagés pour le Duel 1v1
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

async function sb(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : null };
}

// Textes courts pour un duel rapide (FR, accentués)
const DUEL_TEXTS = [
  "le petit renard roux traverse le champ gelé puis disparaît derrière la vieille grange en bois.",
  "taper vite et juste demande de la patience, mais chaque jour de pratique rend les mains plus sûres.",
  "le matin, la lumière douce traverse les rideaux et réveille doucement la maison encore endormie.",
  "écrire vite, c'est surtout écrire juste : vise la précision d'abord, la vitesse viendra ensuite.",
  "sous le ciel clair, la rivière scintille et les oiseaux chantent près du vieux pont de pierre.",
  "la neige tombe en silence sur le village endormi, couvrant les toits d'un manteau blanc et froid.",
  "chaque touche frappée avec précision rapproche les doigts de la maîtrise totale du clavier.",
  "le chat noir saute sur la fenêtre et observe la rue animée depuis son perchoir tranquille.",
  "la forêt dense cache mille secrets que seul le promeneur attentif peut espérer découvrir.",
  "apprendre à taper sans regarder ses mains est difficile au début, mais cela devient vite naturel.",
  "le vieux phare illumine la côte rocheuse chaque nuit depuis plus de cent cinquante ans déjà.",
  "une bonne posture au bureau évite les douleurs et permet de travailler longtemps sans fatigue.",
  "les nuages roses du coucher de soleil se reflètent sur le lac immobile comme dans un miroir.",
  "la bibliothèque municipale ouvre ses portes chaque matin aux lecteurs de tous les âges.",
  "frapper les touches du bout des doigts et garder les poignets bien droits améliore la vitesse.",
  "le marché du samedi matin embaume le café frais, le pain chaud et les herbes aromatiques.",
  "la régularité bat toujours le talent brut quand il s'agit d'apprendre une nouvelle compétence.",
  "les hirondelles reviennent au printemps et leurs cris remplissent à nouveau le ciel bleu clair.",
  "un texte bien tapé sans faute vaut mieux que mille mots saisis à la hâte et remplis d'erreurs.",
  "le vieux vélo rouillé appuyé contre le mur attend patiemment que quelqu'un le répare enfin.",
  "les étoiles filantes traversent le ciel d'été et chacun ferme les yeux pour faire un voeu secret.",
  "la pluie fine sur les vitres crée un bruit apaisant propice à la concentration et au travail.",
  "corriger ses fautes immédiatement en tapant aide à ancrer les bons réflexes dans la mémoire.",
  "le train traverse la plaine à grande vitesse tandis que le paysage défile comme une peinture.",
  "les enfants jouent dans la cour sous le regard bienveillant des arbres centenaires du parc.",
  "chaque session de pratique, même courte, construit les fondations d'une frappe rapide et précise.",
  "le boulanger pétrit la pâte avec soin dès l'aube pour que le pain soit prêt à l'ouverture.",
  "la mer agitée bat les falaises blanches avec une force que rien ne semble pouvoir arrêter.",
  "les doigts glissent sur les touches sans bruit quand on a appris à placer ses mains correctement.",
  "une brise légère agite les feuilles des arbres et porte avec elle l'odeur de la terre humide.",
  "le pianiste répète le même passage des dizaines de fois jusqu'à ce que ses mains le sachent seules.",
  "la lumière du matin entre par la fenêtre et dessine de longs rectangles dorés sur le parquet.",
  "écrire sans regarder le clavier libère les yeux pour lire le texte et aller encore plus vite.",
  "le cuisinier hache les légumes avec une régularité parfaite, le couteau battant comme un métronome.",
  "la patience est la clé de tout apprentissage : aucun champion ne l'est devenu du jour au lendemain.",
];

async function userFromToken(token) {
  if (!token) return null;
  const r = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&select=id,username,plan`);
  return (r.data && r.data[0]) || null;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

module.exports = { sb, DUEL_TEXTS, userFromToken, generateRoomCode };
