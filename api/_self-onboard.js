// Logique pure du self onboarding établissement (aucun accès réseau ni base).
// Utilisée par api/institutions.js (action « self-onboard ») et testée dans
// api/_self-onboard.test.js. Lancer : node --test api/_self-onboard.test.js

const TRIAL_DAYS = 30;
const MAX_SEATS = 5000;
const LEVELS = ['primaire', 'secondaire', 'superieur', 'formation'];
const COUNTRIES = ['BE', 'FR'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

// Valide et normalise le corps envoyé par /ecoles/creer.
// Retourne { ok: true, value } ou { ok: false, error } (message affichable).
function normalizeInput(body) {
  const b = body || {};
  const name = String(b.name || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 120) return { ok: false, error: "Indique le nom de l'établissement." };

  const email = String(b.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, error: 'Adresse e-mail invalide.' };

  const seatCount = Number(b.seatCount);
  if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > MAX_SEATS) {
    return { ok: false, error: `Le nombre d'élèves doit être compris entre 1 et ${MAX_SEATS}.` };
  }

  const level = LEVELS.includes(b.level) ? b.level : 'secondaire';
  const country = COUNTRIES.includes(b.country) ? b.country : 'BE';

  if (b.consent !== true) return { ok: false, error: "Accepte les conditions d'utilisation pour continuer." };

  return { ok: true, value: { name, email, seatCount, level, country } };
}

// « École Saint-Joseph » -> « ecole-saint-joseph » (sans accents, sans symboles).
function slugify(name) {
  const base = String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'etablissement';
}

// Fin de l'essai : maintenant + 30 jours (ISO, stockée dans license_expires_at).
function trialEnd(now) {
  return new Date((now == null ? Date.now() : now) + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// Jours restants (arrondi au-dessus), jamais négatif.
function daysLeft(iso, now) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - (now == null ? Date.now() : now);
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000));
}

module.exports = { TRIAL_DAYS, MAX_SEATS, LEVELS, COUNTRIES, normalizeInput, slugify, trialEnd, daysLeft };
