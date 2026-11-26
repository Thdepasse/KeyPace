// Sessions multi-appareils (table user_sessions, voir supabase-schema.sql).
//
// Avant : une seule colonne users.session_token par compte. Se connecter sur un autre
// appareil (PC de l'école, puis maison) remplaçait le jeton et coupait sans prévenir
// l'appareil précédent : sauvegardes refusées, devoirs « pas faits », bannière
// « reconnecte-toi ». Désormais chaque connexion a sa propre ligne, et seule la
// déconnexion de CET appareil la supprime.
//
// Repli : tant que la table n'existe pas (migration pas encore passée), ou pour les
// jetons émis avant elle, on lit et on écrit l'ancienne colonne users.session_token.
// Les deux modes cohabitent : un jeton ancien reste valide jusqu'à son expiration.
// Le jeton n'est jamais stocké en clair dans la table : seulement son empreinte SHA-256.
const crypto = require('crypto');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

const hashToken = (token) => crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');
const nowIso = () => new Date().toISOString();
const legacyFilter = (token) => `session_token=eq.${encodeURIComponent(token)}&or=(session_expires_at.is.null,session_expires_at.gt.${nowIso()})`;

const DAY_MS = 24 * 60 * 60 * 1000;
const SHORT_SESSION_MS = 60 * 60 * 1000; // une session plus courte (retour SSO, 2 min) n'est jamais prolongée

// Session glissante : une session utilisée est repoussée à 30 jours, au plus une fois par jour
// (une seule écriture par jour et par appareil). Avant, elle expirait 30 jours après la
// connexion même pour un élève présent tous les jours. Les jetons courts du retour SSO, qui
// transitent par une URL, ne sont jamais prolongés.
function shouldExtend(row, now = Date.now()) {
  const created = Date.parse(row && row.created_at);
  const expires = Date.parse(row && row.expires_at);
  if (!Number.isFinite(created) || !Number.isFinite(expires)) return false;
  if (expires - created < SHORT_SESSION_MS) return false;
  return expires < now + SESSION_TTL_MS - DAY_MS;
}

// Compte lié à un jeton valide (colonnes `select` de la table users), ou null.
async function userByToken(sb, token, select = 'id') {
  if (!token || typeof token !== 'string') return null;
  try {
    const h = hashToken(token);
    const s = await sb(`/user_sessions?token_hash=eq.${h}&expires_at=gt.${nowIso()}&select=user_id,created_at,expires_at,users(${select})`);
    const row = s && s.ok && Array.isArray(s.data) ? s.data[0] : null;
    if (row && row.users && typeof row.users === 'object' && !Array.isArray(row.users)) {
      if (shouldExtend(row)) {
        try { await sb(`/user_sessions?token_hash=eq.${h}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString() }) }); } catch { /* jamais bloquant */ }
      }
      return row.users;
    }
  } catch { /* table absente ou réponse illisible : on passe à l'ancienne colonne */ }
  const r = await sb(`/users?${legacyFilter(token)}&select=${select}`);
  // Panne de la base ≠ session invalide : on lève une erreur (500/503 chez l'appelant)
  // plutôt que de renvoyer null, qui ferait déconnecter l'utilisateur pour rien.
  if (r && r.ok === false) throw new Error('session lookup ' + r.status);
  return (r && Array.isArray(r.data) && r.data[0]) || null;
}

// Ouvre une session pour ce compte. Renvoie le jeton et, si la table n'est pas
// disponible, le patch à appliquer à users (`legacyPatch`) : l'appelant l'ajoute à sa
// propre écriture sur users, comme avant.
async function createSession(sb, userId, ttlMs = SESSION_TTL_MS) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  let stored = false;
  try {
    const ins = await sb('/user_sessions', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ token_hash: hashToken(token), user_id: userId, expires_at: expiresAt }),
    });
    stored = !!(ins && ins.ok && Array.isArray(ins.data) && ins.data.length);
  } catch { stored = false; }
  if (stored) {
    // Ménage léger : les sessions expirées de ce compte (jamais bloquant).
    try { await sb(`/user_sessions?user_id=eq.${encodeURIComponent(userId)}&expires_at=lt.${nowIso()}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); } catch { /* ignoré */ }
  }
  return { token, expiresAt, legacyPatch: stored ? {} : { session_token: token, session_expires_at: expiresAt } };
}

// Ferme UNE session (déconnexion de cet appareil). Les autres appareils restent connectés.
async function revokeSession(sb, token) {
  if (!token || typeof token !== 'string') return;
  try { await sb(`/user_sessions?token_hash=eq.${hashToken(token)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); } catch { /* ignoré */ }
  await sb(`/users?session_token=eq.${encodeURIComponent(token)}`, { method: 'PATCH', body: JSON.stringify({ session_token: null, session_expires_at: null }) });
}

// Ferme TOUTES les sessions du compte (mot de passe changé ou réinitialisé, compte suspendu).
async function revokeAllSessions(sb, userId) {
  try { await sb(`/user_sessions?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); } catch { /* ignoré */ }
  await sb(`/users?id=eq.${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify({ session_token: null, session_expires_at: null }) });
}

// Purge des sessions expirées (tâche quotidienne de rétention).
async function purgeExpiredSessions(sb) {
  try {
    const d = await sb(`/user_sessions?expires_at=lt.${nowIso()}&select=token_hash`, { method: 'DELETE' });
    return d && d.ok && Array.isArray(d.data) ? d.data.length : null;
  } catch { return null; }
}

module.exports = { SESSION_TTL_MS, shouldExtend, hashToken, userByToken, createSession, revokeSession, revokeAllSessions, purgeExpiredSessions };
