// Sert l'appli (index.html) pour chaque adresse propre (/test-vitesse-frappe,
// /cours-dactylographie…) avec les bonnes balises pour Google. Les routes sont
// déclarées dans vercel.json (rewrites vers /api/page?r=<clé>).
const { render, ROUTES } = require('./_page-render');

const ORIGIN = /^(keypace\.be|www\.keypace\.be|[a-z0-9-]+\.vercel\.app)$/i;

module.exports = async (req, res) => {
  const key = String((req.query && req.query.r) || '');
  const route = ROUTES[key];
  if (!route) { res.statusCode = 404; return res.end('Not found'); }
  const fwd = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const host = ORIGIN.test(fwd) ? fwd : 'keypace.be';
  try {
    const r = await fetch(`https://${host}/index.html`);
    if (!r.ok) throw new Error('index ' + r.status);
    const html = render(await r.text(), key);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.statusCode = 200;
    return res.end(html);
  } catch (e) {
    // Repli : l'appli complète reste accessible par le paramètre ?view=.
    const view = key === 'testtime' ? 'testtime' : key;
    res.statusCode = 302;
    res.setHeader('Location', '/?view=' + view);
    return res.end();
  }
};
