// Trafic du site via l'API GA4 Data — auth par compte de service Google
// (JWT RS256 signé à la main avec crypto natif, pas de dépendance, même
// principe que les autres modules de ce dashboard).
const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signJWT(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  // Les clés collées depuis Vercel ont parfois leurs retours à la ligne
  // échappés en "\n" littéral plutôt qu'en vrais sauts de ligne.
  const key = privateKey.replace(/\\n/g, '\n');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), key);
  return `${unsigned}.${base64url(signature)}`;
}

async function getAccessToken(clientEmail, privateKey) {
  const jwt = signJWT(clientEmail, privateKey);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok || !json || !json.access_token) {
    throw new Error((json && (json.error_description || json.error)) || `Authentification Google échouée (HTTP ${r.status}).`);
  }
  return json.access_token;
}

// Compare 7j et 30j en un seul appel via deux dateRanges nommés : l'API
// ajoute d'elle-même une valeur "dateRange" à chaque ligne de résultat
// (confirmé en test réel — la déclarer dans `dimensions` est en fait
// rejeté par l'API avec une erreur explicite).
async function fetchTraffic(propertyId, accessToken) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [
        { startDate: '7daysAgo', endDate: 'today', name: '7d' },
        { startDate: '30daysAgo', endDate: 'today', name: '30d' },
      ],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'sessions' }],
    }),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok || !json) throw new Error((json && json.error && json.error.message) || `Erreur GA4 Data API (HTTP ${r.status}).`);

  const result = { visitors7d: 0, visitors30d: 0, pageviews7d: 0, pageviews30d: 0, sessions7d: 0, sessions30d: 0 };
  for (const row of json.rows || []) {
    const rangeName = row.dimensionValues[0].value;
    const [users, pageviews, sessions] = row.metricValues.map((m) => Number(m.value));
    if (rangeName === '7d') Object.assign(result, { visitors7d: users, pageviews7d: pageviews, sessions7d: sessions });
    else if (rangeName === '30d') Object.assign(result, { visitors30d: users, pageviews30d: pageviews, sessions30d: sessions });
  }
  return result;
}

// { clientEmail, privateKey, propertyId } -> stats ou null si non configuré.
async function fetchGA4Traffic({ clientEmail, privateKey, propertyId }) {
  if (!clientEmail || !privateKey || !propertyId) return null;
  const token = await getAccessToken(clientEmail, privateKey);
  return fetchTraffic(propertyId, token);
}

// Pages les plus vues, appareils, sources de trafic — 3 rapports en un seul
// appel HTTP via batchRunReports (plus économe qu'un runReport par rapport).
async function fetchTrafficBreakdown(propertyId, accessToken) {
  const dateRanges = [{ startDate: '30daysAgo', endDate: 'today' }];
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          dateRanges,
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        },
        {
          dateRanges,
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        },
        {
          dateRanges,
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        },
      ],
    }),
  });
  const json = await r.json().catch(() => null);
  if (!r.ok || !json) throw new Error((json && json.error && json.error.message) || `Erreur GA4 Data API (HTTP ${r.status}).`);

  const [pagesReport, devicesReport, channelsReport] = json.reports || [];
  const rowsOf = (report) => (report && report.rows) || [];
  return {
    topPages: rowsOf(pagesReport).map((row) => ({ path: row.dimensionValues[0].value, views: Number(row.metricValues[0].value) })),
    devices: rowsOf(devicesReport).map((row) => ({ category: row.dimensionValues[0].value, users: Number(row.metricValues[0].value) })),
    channels: rowsOf(channelsReport).map((row) => ({ channel: row.dimensionValues[0].value, sessions: Number(row.metricValues[0].value) })),
  };
}

// { clientEmail, privateKey, propertyId } -> détail ou null si non configuré.
async function fetchGA4TrafficBreakdown({ clientEmail, privateKey, propertyId }) {
  if (!clientEmail || !privateKey || !propertyId) return null;
  const token = await getAccessToken(clientEmail, privateKey);
  return fetchTrafficBreakdown(propertyId, token);
}

module.exports = { fetchGA4Traffic, fetchGA4TrafficBreakdown };
