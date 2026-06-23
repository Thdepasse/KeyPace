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
