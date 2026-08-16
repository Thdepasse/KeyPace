// Analytics maison — remplace Umami Cloud. Reçoit un événement (pageview ou
// custom), l'enrichit côté serveur (device/OS/navigateur depuis le user-agent,
// pays depuis l'en-tête géo Vercel — aucun service tiers) et l'écrit dans
// Supabase (table analytics_events). Ne doit jamais faire échouer l'appelant :
// une panne analytics ne doit pas casser le parcours utilisateur.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const crypto = require('crypto');

function parseUserAgent(ua) {
  ua = ua || '';
  let device = 'desktop';
  if (/iPad|Tablet/i.test(ua)) device = 'tablet';
  else if (/Mobi|iPhone|Android/i.test(ua)) device = 'mobile';

  let os = 'Autre';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Autre';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/CriOS/i.test(ua)) browser = 'Chrome';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) browser = 'Safari';

  return { device, os, browser };
}

// Hash journalier anonyme : change chaque jour, non ré-identifiable, aucune
// donnée client stockée (pas de cookie ni localStorage) => pas de consentement requis.
function sessionHash(ip, ua) {
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(`${ip}|${ua}|${day}|kp-analytics-v1`).digest('hex').slice(0, 32);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { event, path, props } = body || {};
    if (!event || typeof event !== 'string') return res.status(400).end();

    const ua = req.headers['user-agent'] || '';
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
    const { device, os, browser } = parseUserAgent(ua);
    const country = req.headers['x-vercel-ip-country'] || null;

    let referrer = null;
    const rawRef = req.headers['referer'];
    if (rawRef) {
      try {
        const h = new URL(rawRef).hostname;
        const selfHost = (req.headers['host'] || '').split(':')[0];
        referrer = h === selfHost ? null : h;
      } catch {}
    }

    const row = {
      session_id: sessionHash(ip, ua),
      event_name: String(event).slice(0, 60),
      path: path ? String(path).slice(0, 200) : null,
      props: props && typeof props === 'object' ? props : {},
      referrer,
      country,
      browser,
      os,
      device_type: device,
    };

    await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
  } catch {
    // silencieux — l'analytics ne doit jamais impacter l'expérience utilisateur
  }

  res.status(204).end();
};
