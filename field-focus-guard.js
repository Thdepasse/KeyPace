/* Garde-fou de saisie : un champ de texte ne doit jamais perdre le focus quand on vient d'y cliquer.
   Cas signalé par un établissement : sur certains postes, il fallait garder le clic gauche enfoncé
   pour pouvoir écrire dans un champ (identifiant, mot de passe...), la saisie s'arrêtait au relâché.
   Deux protections, valables pour tous les champs de toutes les pages :
   1. Si le champ cliqué perd le focus sans que l'utilisateur ait cliqué ailleurs, on le lui rend.
   2. Si une frappe arrive sur la page (focus perdu) alors qu'une fenêtre modale est ouverte, on la
      renvoie vers le dernier champ utilisé dans cette fenêtre au lieu de la perdre. */
(function () {
  if (window.__kpFieldGuard) return;
  window.__kpFieldGuard = true;

  var TEXT_TYPES = /^(text|search|email|password|tel|url|number)?$/i;
  var pressField = null; // champ sur lequel le dernier appui a eu lieu (null si appui ailleurs)
  var pressAt = 0;
  var pressSeq = 0;
  var lastField = null;  // dernier champ qui a reçu le focus

  function isField(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.disabled || el.readOnly) return false;
    var t = el.tagName;
    if (t === 'TEXTAREA') return true;
    if (t === 'INPUT') return TEXT_TYPES.test(el.getAttribute('type') || '');
    return el.isContentEditable === true;
  }
  function deepTarget(e) {
    var p = e.composedPath && e.composedPath();
    return (p && p[0]) || e.target;
  }
  function deepActive() {
    var a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    return a;
  }
  function visible(el) {
    return !!(el && el.isConnected && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }
  function refocus(el) {
    if (!visible(el) || !isField(el)) return;
    var a = deepActive();
    if (a === el || isField(a)) return; // déjà dans un champ : rien à rendre
    try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} }
  }

  function onPress(e) {
    var t = deepTarget(e);
    var f = t && t.closest ? t.closest('input,textarea,[contenteditable]') : null;
    pressSeq++;
    if (f && isField(f)) { pressField = f; pressAt = Date.now(); }
    else pressField = null; // clic ailleurs : perdre le focus est normal
  }
  function onRelease() {
    var f = pressField, seq = pressSeq;
    if (!f) return;
    [0, 60, 250].forEach(function (d) {
      setTimeout(function () { if (seq === pressSeq && pressField === f) refocus(f); }, d);
    });
  }
  function onFocusIn(e) {
    var t = deepTarget(e);
    if (isField(t)) lastField = t;
  }
  function onFocusOut(e) {
    var t = deepTarget(e);
    if (!pressField || t !== pressField) return;
    if (e.relatedTarget) return; // le focus va vers un autre élément : choix de l'utilisateur
    if (Date.now() - pressAt > 1500) return;
    if (!document.hasFocus()) return;
    var f = pressField, seq = pressSeq;
    setTimeout(function () { if (seq === pressSeq) refocus(f); }, 0);
  }
  function openModal() {
    return document.querySelector('.modal-overlay.open,.settings-overlay.open,[role="dialog"][aria-modal="true"]');
  }
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    var printable = e.key && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete');
    if (!printable) return;
    var t = deepTarget(e);
    if (t && t !== document.body && t !== document.documentElement) return; // la frappe a un destinataire
    var m = openModal();
    if (!m || !lastField || !m.contains(lastField)) return;
    refocus(lastField);
  }

  ['pointerdown', 'mousedown', 'touchstart'].forEach(function (n) { document.addEventListener(n, onPress, true); });
  ['pointerup', 'mouseup', 'touchend', 'click'].forEach(function (n) { document.addEventListener(n, onRelease, true); });
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  document.addEventListener('keydown', onKey, true);
})();
