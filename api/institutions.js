// GET → liste des établissements
// POST (x-admin-key header) → créer un établissement
// POST (body.action=contact) → formulaire de contact licence
const { Resend } = require('resend');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'KeyPace <noreply@keypace.be>';

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET → liste
  if (req.method === 'GET') {
    const r = await sb('/institutions?select=id,name,slug&order=name.asc');
    if (!r.ok) return res.status(500).json({ error: 'Erreur récupération établissements.' });
    return res.json(r.data || []);
  }

  if (req.method !== 'POST') return res.status(405).end();

  // POST avec x-admin-key → créer un établissement
  if (req.headers['x-admin-key']) {
    if (!ADMIN_KEY || req.headers['x-admin-key'] !== ADMIN_KEY)
      return res.status(401).json({ error: 'Non autorisé.' });

    const { name, slug, passwordHash, seatCount } = req.body || {};
    if (!name || !slug || !passwordHash || !seatCount)
      return res.status(400).json({ error: 'Champs manquants (name, slug, passwordHash, seatCount).' });
    if (typeof seatCount !== 'number' || seatCount < 1)
      return res.status(400).json({ error: 'seatCount doit être un entier positif.' });

    const slugCheck = await sb(`/institutions?slug=eq.${encodeURIComponent(slug)}&select=id`);
    if (slugCheck.data && slugCheck.data.length > 0)
      return res.status(409).json({ error: 'Un établissement avec ce slug existe déjà.' });

    const create = await sb('/institutions', {
      method: 'POST',
      body: JSON.stringify({ name, slug, password_hash: passwordHash, seat_count: seatCount }),
    });
    if (!create.ok) return res.status(500).json({ error: 'Erreur création établissement.' });
    return res.status(201).json(create.data[0]);
  }

  // POST action=contact → formulaire de contact licence
  const { name, email, count, message } = req.body || {};
  if (!name || !email || !count) return res.status(400).json({ error: 'Champs manquants.' });
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'Email non configuré.' });

  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: 'contact@keypace.be',
    replyTo: email,
    subject: `Demande de licence — ${name} (${count} étudiants)`,
    html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#faf9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#16140F">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border:1px solid #E7E1D5;border-radius:24px;overflow:hidden">
        <tr><td style="background:#FF4D2E;padding:24px 36px">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:rgba(255,255,255,0.2);border-radius:10px;width:34px;height:34px;text-align:center;vertical-align:middle">
              <span style="font-family:'Courier New',monospace;font-size:17px;font-weight:700;color:#fff">K</span>
            </td>
            <td style="padding-left:10px;font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.03em">KeyPace</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:30px 36px 10px">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#A39C8D;letter-spacing:.06em;text-transform:uppercase">Nouvelle demande de licence</p>
          <p style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.02em">${name}</p>
        </td></tr>
        <tr><td style="padding:20px 36px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F6F1;border-radius:14px;padding:20px 24px">
            <tr><td style="padding:6px 0;border-bottom:1px solid #EDE9E1">
              <span style="font-size:13px;font-weight:700;color:#8A8275">Établissement</span><br>
              <span style="font-size:15px;font-weight:600;color:#16140F">${name}</span>
            </td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #EDE9E1">
              <span style="font-size:13px;font-weight:700;color:#8A8275">Contact</span><br>
              <a href="mailto:${email}" style="font-size:15px;font-weight:600;color:#FF4D2E;text-decoration:none">${email}</a>
            </td></tr>
            <tr><td style="padding:6px 0${message ? ';border-bottom:1px solid #EDE9E1' : ''}">
              <span style="font-size:13px;font-weight:700;color:#8A8275">Nombre d'étudiants</span><br>
              <span style="font-size:15px;font-weight:600;color:#16140F">${count}</span>
            </td></tr>
            ${message ? `<tr><td style="padding:6px 0">
              <span style="font-size:13px;font-weight:700;color:#8A8275">Message</span><br>
              <span style="font-size:14px;color:#3A352B;line-height:1.6">${message.replace(/\n/g, '<br>')}</span>
            </td></tr>` : ''}
          </table>
        </td></tr>
        <tr><td style="padding:0 36px 28px;text-align:center">
          <a href="mailto:${email}?subject=Re: Licence KeyPace — ${encodeURIComponent(name)}"
             style="display:inline-block;background:#FF4D2E;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:11px">
            Répondre à ${email}
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid #E7E1D5;padding:18px 36px;text-align:center">
          <p style="margin:0;font-size:12px;color:#B5AE9F">Demande reçue via le formulaire de licence sur keypace.be</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });

  res.json({ ok: true });
};
