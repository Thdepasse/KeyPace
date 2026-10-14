// Modules réservés aux comptes Expert (mail, CV, mot de passe, lettre…). Le contenu du module (son
// JavaScript) n'est envoyé qu'après vérification de la session et du plan :
// la page publique /cours/<module> n'est qu'une coquille vide sans ce code.
// Appelé depuis api/track.js (POST /api/track?m=<clé>) : le plan Hobby plafonne
// à 12 fonctions, on ne peut donc pas en ajouter une 13e. Fichier préfixé "_" :
// helper, non routé ni servi par Vercel.
//
// Le code des modules est dans api/_module-<clé>.js (généré par
// scripts/build-modules.js à partir de module-src/<clé>.src.js).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

// require() à chemins littéraux : Vercel n'embarque que les fichiers qu'il voit ainsi.
const MODULES = { cv: () => require('./_module-cv'), mail: () => require('./_module-mail'), mdp: () => require('./_module-mdp'), lettre: () => require('./_module-lettre') };

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  const text = await r.text();
  return { ok: r.ok, data: text ? JSON.parse(text) : null };
}

// Même règle que /api/login : un compte rattaché à un établissement perd
// l'accès Expert quand la licence de l'établissement est expirée.
async function effectivePlan(user) {
  if (user && user.institution_id && user.plan === 'expert') {
    const li = await sb(`/institutions?id=eq.${user.institution_id}&select=license_expires_at`);
    const inst = li.data && li.data[0];
    if (inst && inst.license_expires_at && new Date(inst.license_expires_at) < new Date()) return 'free';
  }
  return user ? user.plan : 'free';
}

async function handle(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  // Contrôle de déploiement : confirme que les modules sont bien embarqués avec la fonction (renvoie leur taille, jamais leur contenu).
  if (req.method === 'GET' && req.query && req.query.check === '1') {
    try { return res.status(200).json({ ok: true, sizes: { cv: MODULES.cv().length, mail: MODULES.mail().length, mdp: MODULES.mdp().length, lettre: MODULES.lettre().length } }); }
    catch (e) { return res.status(500).json({ ok: false }); }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });
  const key = req.query && req.query.m;
  if (!Object.prototype.hasOwnProperty.call(MODULES, key)) return res.status(404).json({ error: 'Module inconnu.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const token = body && typeof body.token === 'string' ? body.token : '';
  if (!token) return res.status(401).json({ error: 'Session manquante.', code: 'no-session' });

  try {
    const r = await sb(`/users?session_token=eq.${encodeURIComponent(token)}&or=(session_expires_at.is.null,session_expires_at.gt.${new Date().toISOString()})&select=id,plan,institution_id`);
    const user = r.data && r.data[0];
    if (!user) return res.status(401).json({ error: 'Session invalide.', code: 'bad-session' });
    if ((await effectivePlan(user)) !== 'expert') return res.status(403).json({ error: 'Module réservé aux comptes Expert.', code: 'not-expert' });
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(200).send(MODULES[key]());
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

module.exports = { handle, MODULES, effectivePlan };
