// Alertes internes envoyées à l'équipe (contact@keypace.be) : intérêt pour
// l'abonnement Expert et nouveaux abonnés. Fichier préfixé "_" : helper
// partagé, non routé par Vercel comme fonction propre (limite de 12).
//
// Jamais bloquant : une panne ou une lenteur de Resend ne doit ni retarder
// ni faire échouer un paiement, d'où le délai plafonné et l'absence
// d'exception remontée à l'appelant.
const NOTIFY_TO = 'contact@keypace.be';
const SEND_TIMEOUT_MS = 2000;

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nowBrussels() {
  return new Date().toLocaleString('fr-BE', { timeZone: 'Europe/Brussels', dateStyle: 'short', timeStyle: 'short' });
}

function formatAmount(cents, currency) {
  if (cents == null) return '—';
  const cur = (currency || 'eur').toUpperCase();
  return (cents / 100).toFixed(2).replace('.', ',') + (cur === 'EUR' ? ' €' : ' ' + cur);
}

function layout(title, rows) {
  const body = rows
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#7A7365;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(v)}</td></tr>`)
    .join('');
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#faf9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#16140F">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E7E1D5;border-radius:16px;padding:24px 28px">
    <div style="font-size:18px;font-weight:800;margin-bottom:14px">${escapeHtml(title)}</div>
    <table cellpadding="0" cellspacing="0" style="font-size:14px">${body}</table>
  </div>
</body></html>`;
}

function checkoutClickedEmail({ username, email }) {
  return {
    subject: `Intérêt Expert : ${username || 'utilisateur'} a cliqué sur Payer`,
    html: layout('Clic sur « Passer à Expert : Payer »', [
      ['Utilisateur', username || '—'],
      ['Email', email || '—'],
      ['Quand', nowBrussels()],
      ['Suite', 'Un second mail « Nouvel abonné » arrive si le paiement aboutit.'],
    ]),
  };
}

function subscribedEmail({ username, email, amount, currency, discount }) {
  const rows = [
    ['Utilisateur', username || '—'],
    ['Email', email || '—'],
    ['Montant payé', formatAmount(amount, currency)],
  ];
  if (discount) rows.push(['Réduction', formatAmount(discount, currency)]);
  rows.push(['Quand', nowBrussels()]);
  return {
    subject: `Nouvel abonné Expert : ${username || email || 'client'}`,
    html: layout('Nouvel abonnement Expert', rows),
  };
}

// Renvoie true si Resend a accepté le mail, false sinon (sans jamais lever).
async function notifyTeam({ subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const { Resend } = require('resend');
    const send = new Resend(key).emails.send({
      from: process.env.FROM_EMAIL || 'KeyPace <noreply@keypace.be>',
      to: NOTIFY_TO,
      subject,
      html,
    });
    let timer;
    const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve({ error: 'timeout' }), SEND_TIMEOUT_MS); });
    const result = await Promise.race([send, timeout]);
    clearTimeout(timer);
    if (result && result.error) {
      console.error('notifyTeam:', result.error.message || result.error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('notifyTeam:', e && e.message);
    return false;
  }
}

module.exports = { notifyTeam, checkoutClickedEmail, subscribedEmail, escapeHtml, formatAmount };
