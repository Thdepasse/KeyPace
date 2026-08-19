// CORS restreint aux origines connues de KeyPace — remplace le wildcard '*'
// utilisé auparavant sur tous les endpoints (n'importe quel site tiers
// pouvait appeler l'API depuis le navigateur d'un visiteur). Le fichier est
// préfixé "_" : helper partagé, non routé par Vercel comme fonction propre.
const ALLOWED_ORIGINS = [
  'https://keypace.be',
  'https://www.keypace.be',
];

function setCorsOrigin(req, res) {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Vary', 'Origin');
}

module.exports = { setCorsOrigin, ALLOWED_ORIGINS };
