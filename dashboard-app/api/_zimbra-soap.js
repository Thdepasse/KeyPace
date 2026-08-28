// Accès Zimbra en lecture seule (boîte contact@keypace.be) pour la synchro
// prospection écoles — via l'API SOAP/JSON en HTTPS (même port que le
// webmail), et non plus l'IMAP brut (port 993) : OVH coupe silencieusement
// les connexions IMAP venant d'IP cloud/datacenter (confirmé en testant
// depuis Vercel lui-même — ECONNRESET avant même la poignée de main TLS),
// alors que le webmail — donc ce même endpoint SOAP — fonctionne depuis
// n'importe où. Isolé de _zimbra-match.js (logique pure) : ce module dépend
// d'un vrai serveur Zimbra et n'est pas unit-testé.

async function soapCall(host, body, authToken) {
  const context = { _jsns: 'urn:zimbra' };
  if (authToken) context.authToken = [{ _content: authToken }];
  const r = await fetch(`https://${host}/service/soap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ Header: { context }, Body: body }),
  });
  const json = await r.json().catch(() => null);
  const fault = json && json.Body && json.Body.Fault;
  if (fault) {
    const msg = (fault.Reason && fault.Reason.Text) || 'Erreur Zimbra (Fault sans message).';
    throw new Error(msg);
  }
  if (!r.ok || !json) throw new Error(`Réponse Zimbra invalide (HTTP ${r.status}).`);
  return json.Body;
}

async function authenticate(host, user, password) {
  // .trim() : tolère un espace ou un retour à la ligne collé par erreur en
  // copiant la valeur depuis l'UI Vercel (déjà vu sur ADMIN_KEY).
  const body = {
    AuthRequest: {
      _jsns: 'urn:zimbraAccount',
      account: { by: 'name', _content: String(user).trim() },
      password: { _content: String(password).trim() },
    },
  };
  const res = await soapCall(host, body);
  const token = res.AuthResponse && res.AuthResponse.authToken && res.AuthResponse.authToken[0] && res.AuthResponse.authToken[0]._content;
  if (!token) throw new Error('Authentification Zimbra refusée (jeton absent de la réponse).');
  return token;
}

// Zimbra Query Language attend une date au format MM/DD/YYYY.
function zimbraDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

async function searchMessages(host, authToken, folder, sinceDate) {
  const body = {
    SearchRequest: {
      _jsns: 'urn:zimbraMail',
      types: 'message',
      query: `in:${folder} after:"${zimbraDate(sinceDate)}"`,
      sortBy: 'dateDesc',
      limit: 100,
    },
  };
  const res = await soapCall(host, body, authToken);
  return (res.SearchResponse && res.SearchResponse.m) || [];
}

function address(msg, type) {
  const e = (msg.e || []).find((p) => p.t === type);
  return e ? e.a : null;
}

// { host, user, password } -> [{ messageId, direction, from, to, subject, date }]
async function fetchRecentMessages({ host, user, password }, sinceDate) {
  const authToken = await authenticate(host, user, password);
  const [inbox, sent] = await Promise.all([
    searchMessages(host, authToken, 'inbox', sinceDate),
    searchMessages(host, authToken, 'sent', sinceDate),
  ]);
  const normalize = (direction) => (m) => ({
    messageId: String(m.id),
    direction,
    from: address(m, 'f'),
    to: address(m, 't'),
    subject: m.su || '',
    date: m.d ? new Date(Number(m.d)) : null,
  });
  return [...inbox.map(normalize('in')), ...sent.map(normalize('out'))];
}

// Envoie un email via Zimbra (SendMsgRequest, urn:zimbraMail) plutôt qu'un
// relais SMTP direct : même transport HTTPS déjà utilisé pour lire (donc pas
// exposé au blocage OVH des ports IMAP/SMTP bruts depuis une IP Vercel), et
// Zimbra classe lui-même une copie dans "Envoyés" — pas besoin de la
// déposer nous-mêmes. Retourne l'id du message envoyé (à consigner dans
// zimbra_sync_log côté appelant pour que le cron du lendemain ne le
// retraite pas une seconde fois).
async function sendMessage({ host, user, password }, { to, subject, text }) {
  const authToken = await authenticate(host, user, password);
  const body = {
    SendMsgRequest: {
      _jsns: 'urn:zimbraMail',
      m: {
        e: [{ t: 't', a: to }],
        su: { _content: subject },
        mp: { ct: 'text/plain', content: { _content: text } },
      },
    },
  };
  const res = await soapCall(host, body, authToken);
  const sent = res.SendMsgResponse && res.SendMsgResponse.m && res.SendMsgResponse.m[0];
  if (!sent || !sent.id) throw new Error("Envoi Zimbra : réponse sans identifiant de message.");
  return { messageId: String(sent.id) };
}

module.exports = { fetchRecentMessages, sendMessage };
