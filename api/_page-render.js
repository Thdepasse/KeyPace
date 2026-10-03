// Injecte dans index.html (l'appli) les métadonnées propres à une adresse
// (titre, description, canonical, Open Graph, JSON-LD, robots) et rend visible
// la section de contenu de référencement de cette adresse. Pure : testable
// sans réseau.
const ROUTES = require('./_page-routes');

const BASE = 'https://keypace.be';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function setMeta(html, re, tag) {
  return re.test(html) ? html.replace(re, () => tag) : html.replace('</head>', () => tag + '\n</head>');
}

function render(html, key) {
  const r = ROUTES[key];
  if (!r) return html;
  const url = BASE + r.path;
  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(r.title)}</title>`);
  out = setMeta(out, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(r.description)}">`);
  out = setMeta(out, /<meta name="robots"[^>]*>/, r.index
    ? '<meta name="robots" content="index, follow, max-image-preview:large">'
    : '<meta name="robots" content="noindex, follow">');
  out = setMeta(out, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}">`);
  out = out.replace(/(<link rel="alternate" hreflang="[^"]+" href=")[^"]*(">)/g, (_, a, b) => a + url + b);
  out = setMeta(out, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}">`);
  out = setMeta(out, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(r.ogTitle || r.title)}">`);
  out = setMeta(out, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(r.ogDescription || r.description)}">`);
  out = setMeta(out, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(r.twTitle || r.title)}">`);
  out = setMeta(out, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(r.twDescription || r.description)}">`);
  if (r.ogType) out = setMeta(out, /<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${esc(r.ogType)}">`);
  // Le JSON-LD de l'accueil (appli, FAQ, mode d'emploi) ne vaut que pour "/".
  out = out.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (m, body) =>
    /"@type":\s*"(WebApplication|FAQPage|HowTo)"/.test(body) ? '' : m);
  if (r.jsonld && r.jsonld.length) {
    const blocks = r.jsonld.map((j) => `<script type="application/ld+json">\n${j}\n</script>`).join('\n');
    out = out.replace('</head>', () => blocks + '\n</head>');
  }
  out = out.replace(new RegExp(`(<div class="seo-sec" data-route="${key}")\\s+hidden>`), '$1>');
  return out;
}

// Sert l'appli (index.html) pour chaque adresse propre (/test-vitesse-frappe,
// /cours-dactylographie…) avec les bonnes balises pour Google. Appelée depuis
// api/track.js (rewrites vers /api/track?r=<clé> dans vercel.json) : le plan
// Hobby plafonne à 12 fonctions, on ne peut donc pas en ajouter une 13e.
const ORIGIN = /^(keypace\.be|www\.keypace\.be|[a-z0-9-]+\.vercel\.app)$/i;

async function handlePage(req, res) {
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
}

module.exports = { render, ROUTES, handlePage };
