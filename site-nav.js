/* En-tête des pages HTML séparées de l'appli (établissements, France) : même
   en-tête que l'appli (index.html, nav#main-nav, voir aussi updateNavUser).
   Une seule source pour toutes ces pages, au lieu d'une copie par page.
   Usage, juste après <body> :
     <nav id="main-nav" data-site="be" data-active="ecoles"></nav>
     <script src="/site-nav.js"></script>
   data-site="fr" : liens de la France (accueil, cours et établissements /fr).
   L'état connecté vient de la session gardée par l'appli (localStorage
   'klak_session') : même badge, avatar et boutons. Le drapeau et le choix du
   clavier ne sont pas repris : ils règlent l'appli elle-même. */
(function () {
  var nav = document.getElementById('main-nav');
  if (!nav) return;
  var fr = nav.getAttribute('data-site') === 'fr';
  var active = nav.getAttribute('data-active') || '';
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  var S = fr
    ? { home: '/fr', ecoles: '/fr/ecoles', lessons: '/fr/cours-dactylo-en-ligne',
        menu: [['/fr/ecoles', 'École et collège, lycée'], ['/fr/dactylographie-college', 'Collège'], ['/fr/dactylographie-lycee', 'Lycée']] }
    : { home: '/accueil', ecoles: '/ecoles', lessons: '/cours-dactylo-en-ligne',
        menu: [['/dactylographie-tronc-commun', 'Tronc commun'], ['/dactylographie-general-transition', 'Général ou transition'], ['/dactylographie-qualifiant', 'Qualifiant'], ['/dactylographie-superieur', 'Supérieur et adultes']] };
  var link = function (key, href, label, id) {
    return '<a class="nav-link' + (active === key ? ' active' : '') + '"' + (id ? ' id="' + id + '"' : '') + ' href="' + href + '">' + label + '<span class="underline"></span></a>';
  };
  var sess = {};
  try { sess = JSON.parse(localStorage.getItem('klak_session') || '{}') || {}; } catch (e) { sess = {}; }
  var user = sess.token && sess.username ? String(sess.username) : '';
  var role = sess.role || '';
  var teacher = role === 'prof' || role === 'admin', admin = role === 'admin';

  var links = '';
  if (!admin) links += link('home', S.home, 'Accueil', 'nav-home');
  links += '<div class="nav-dropdown">' + link('ecoles', S.ecoles, 'Établissements')
    + '<div class="nav-dropdown-menu">' + S.menu.map(function (m) { return '<a href="' + m[0] + '">' + m[1] + '</a>'; }).join('') + '</div></div>';
  if (!teacher) {
    links += '<div class="nav-dropdown">' + link('test', '/test', 'Test')
      + '<div class="nav-dropdown-menu"><a href="/test-frappe-en-ligne">Test sur base de longueur</a><a href="/test-dactylographie-chronometre">Test sur base de temps</a></div></div>'
      + link('lessons', S.lessons, 'Cours') + link('games', '/jeux-dactylo-en-ligne', 'Jeux') + link('stats', '/progres', 'Progrès');
    if (user && (sess.institutionName || sess.hasClass)) links += link('classes', '/classe', 'Classe');
  } else if (!admin) {
    links += link('classes', '/classe', 'Gestion de classes');
  }

  var right;
  if (!user) {
    right = '<div class="nav-guest"><a class="nav-login-btn" href="/?auth=login">Se connecter</a><a class="nav-signup-btn" href="/?auth=register">Créer un compte</a></div>';
  } else {
    var plan = sess.plan === 'expert' ? 'expert' : 'free';
    var badge = teacher ? '<span class="nav-plan-badge etab">' + (admin ? 'ÉTABLISSEMENT' : 'ENSEIGNANT') + '</span>'
      : '<span class="nav-plan-badge ' + plan + '">' + (plan === 'expert' ? 'EXPERT' : 'GRATUIT') + '</span>';
    right = '<div class="nav-user">' + badge
      + '<a class="nav-avatar" href="/?settings=1" title="Réglages" aria-label="Réglages de ' + esc(user) + '">' + esc(user.charAt(0).toUpperCase()) + '</a>'
      + (plan !== 'expert' && !teacher ? '<a class="nav-upgrade-btn" href="/?upgrade=1">Passer Expert</a>' : '')
      + '<button type="button" class="nav-logout" id="nav-logout">Déconnexion</button></div>';
  }

  nav.className = user ? 'is-logged' : '';
  nav.innerHTML = '<div class="nav-inner">'
    + '<a class="nav-logo" href="' + S.home + '" aria-label="KeyPace, accueil"><div class="nav-logo-icon">K</div><div class="nav-logo-name">KeyPace</div></a>'
    + '<div class="nav-links" id="site-nav-links">' + links + '</div>'
    + '<div class="nav-spacer"></div>' + right
    + (admin ? '' : '<button type="button" class="nav-burger" id="site-nav-burger" aria-label="Menu" aria-expanded="false" aria-controls="site-nav-links">☰</button>')
    + '</div>';

  // Menu hamburger (téléphone) : s'ouvre au bouton, se ferme au clic ailleurs.
  var list = document.getElementById('site-nav-links'), burger = document.getElementById('site-nav-burger');
  if (burger) burger.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = list.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', function (e) {
    if (list.classList.contains('open') && !list.contains(e.target)) { list.classList.remove('open'); if (burger) burger.setAttribute('aria-expanded', 'false'); }
  });

  // Déconnexion : comme dans l'appli, le jeton est aussi invalidé côté serveur.
  var out = document.getElementById('nav-logout');
  if (out) out.addEventListener('click', function () {
    try { fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout', token: sess.token }), keepalive: true }).catch(function () {}); } catch (e) {}
    try { localStorage.removeItem('klak_session'); } catch (e) {}
    location.reload();
  });
})();
