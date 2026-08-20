// Bandeau de consentement cookies (RGPD / ePrivacy) + chargement conditionnel
// de Google Analytics. Un seul script partagé par toutes les pages du site
// (voir cookies.html) — Google Analytics n'est chargé qu'après un choix
// explicite "Accepter" ; "Refuser" est aussi visible et aussi facile que
// "Accepter" (pas de dark pattern).
(function () {
  var GA_ID = 'G-3FTPKKF679';
  var STORAGE_KEY = 'keypace_cookie_consent'; // 'accepted' | 'rejected'

  function loadAnalytics() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  function setChoice(choice) {
    try { localStorage.setItem(STORAGE_KEY, choice); } catch (e) {}
    if (choice === 'accepted') loadAnalytics();
  }

  function getChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function removeBanner() {
    var el = document.getElementById('cookie-consent-banner');
    if (el) el.remove();
  }

  function renderBanner() {
    if (document.getElementById('cookie-consent-banner')) return;
    var el = document.createElement('div');
    el.id = 'cookie-consent-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Consentement aux cookies');
    el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:var(--card,#fff);border-top:1px solid var(--border,#E7E1D5);box-shadow:0 -8px 24px rgba(0,0,0,.08);padding:16px 20px;display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:center;font-family:Inter,sans-serif;';
    el.innerHTML =
      '<p style="margin:0;flex:1 1 320px;min-width:220px;font-size:13.5px;line-height:1.55;color:var(--txt,#16140F)">' +
      'On utilise des cookies de mesure d\'audience (Google Analytics) pour comprendre comment KeyPace est utilisé. ' +
      'Aucun cookie publicitaire, aucune revente de données. ' +
      '<a href="/cookies" style="color:var(--accent,#FF4D2E);text-decoration:underline">En savoir plus</a>.</p>' +
      '<div style="display:flex;gap:10px;flex-shrink:0">' +
      '<button id="cc-reject" style="font:inherit;font-size:13.5px;font-weight:700;padding:9px 18px;border-radius:9px;border:1.5px solid var(--border,#E7E1D5);background:var(--card,#fff);color:var(--txt,#16140F);cursor:pointer">Refuser</button>' +
      '<button id="cc-accept" style="font:inherit;font-size:13.5px;font-weight:700;padding:9px 18px;border-radius:9px;border:none;background:var(--accent,#FF4D2E);color:#fff;cursor:pointer">Accepter</button>' +
      '</div>';
    document.body.appendChild(el);
    document.getElementById('cc-accept').addEventListener('click', function () {
      setChoice('accepted');
      removeBanner();
      renderReopenButton();
    });
    document.getElementById('cc-reject').addEventListener('click', function () {
      setChoice('rejected');
      removeBanner();
      renderReopenButton();
    });
  }

  // Petit bouton persistant pour revenir sur son choix à tout moment.
  function renderReopenButton() {
    if (document.getElementById('cookie-consent-reopen')) return;
    var btn = document.createElement('button');
    btn.id = 'cookie-consent-reopen';
    btn.title = 'Gérer mes cookies';
    btn.setAttribute('aria-label', 'Gérer mes cookies');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="14.5" r="1" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>';
    btn.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:9998;width:36px;height:36px;border-radius:50%;border:1px solid var(--border,#E7E1D5);background:var(--card,#fff);color:#FF4D2E;box-shadow:0 2px 8px rgba(0,0,0,.12);cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;';
    btn.addEventListener('click', renderBanner);
    document.body.appendChild(btn);
  }

  function init() {
    var choice = getChoice();
    if (choice === 'accepted') { loadAnalytics(); renderReopenButton(); }
    else if (choice === 'rejected') { renderReopenButton(); }
    else { renderBanner(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
