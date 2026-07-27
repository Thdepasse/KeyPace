// Hachage des mots de passe côté serveur — scrypt + sel (module natif crypto,
// aucune dépendance). Fichier préfixé "_" : helper, non routé par Vercel.
//
// Contexte : le client envoie déjà un SHA-256 du mot de passe (`clientHash`).
// On ne le stocke plus tel quel (rejouable en cas de fuite) : on le repasse
// dans scrypt avec un sel aléatoire. Le format stocké devient
//   scrypt$<saltHex>$<hashHex>
// Les anciens comptes (SHA-256 brut, 64 caractères hex) sont acceptés à la
// connexion puis migrés automatiquement (voir verifyPassword().upgrade).
const crypto = require('crypto');

const SCRYPT_KEYLEN = 64;

function hashPassword(clientHash) {
  const salt = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(clientHash), salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${dk.toString('hex')}`;
}

// Compare en temps constant. Retourne { ok, upgrade } où `upgrade` est un
// nouveau hash scrypt à ré-enregistrer quand on valide un ancien hash brut.
function verifyPassword(clientHash, stored) {
  if (!stored || clientHash == null) return { ok: false, upgrade: null };
  const input = String(clientHash);

  if (typeof stored === 'string' && stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return { ok: false, upgrade: null };
    let salt, expected;
    try {
      salt = Buffer.from(parts[1], 'hex');
      expected = Buffer.from(parts[2], 'hex');
    } catch (e) {
      return { ok: false, upgrade: null };
    }
    const dk = crypto.scryptSync(input, salt, expected.length);
    const ok = expected.length === dk.length && crypto.timingSafeEqual(expected, dk);
    return { ok, upgrade: null };
  }

  // Format historique : SHA-256 brut stocké, comparé par égalité.
  const a = Buffer.from(String(stored));
  const b = Buffer.from(input);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, upgrade: ok ? hashPassword(input) : null };
}

module.exports = { hashPassword, verifyPassword };
