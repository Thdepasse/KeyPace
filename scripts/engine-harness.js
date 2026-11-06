// Banc d'essai : exécute le VRAI code de index.html (moteur de frappe, leçons, sauvegarde) dans Node,
// sans navigateur, avec un faux DOM qui accepte tout. Sert aux gates « logique d'utilisation » (plan, 4.19).
// Limite : ce n'est pas un navigateur. Les événements clavier sont simulés (plan, G5 et G6 pour les vrais).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let CAPTURE = null; // HTML écrit dans le faux DOM (innerHTML), pour vérifier qu'un écran produit bien quelque chose
function dummy() {
  const f = function () {};
  return new Proxy(f, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === Symbol.iterator) return function* () {};
      if (k === 'length') return 0;
      if (k === 'then') return undefined;
      if (k === 'toString' || k === 'valueOf') return () => '';
      if (k === 'classList') return { contains: () => false, add() {}, remove() {}, toggle: () => false, item: () => null, length: 0 };
      if (k === 'querySelectorAll' || k === 'getElementsByClassName' || k === 'getElementsByTagName') return () => [];
      if (k === 'children' || k === 'childNodes') return [];
      if (k === 'value' || k === 'innerHTML' || k === 'textContent' || k === 'innerText' || k === 'className' || k === 'id') return '';
      if (k === 'tagName') return 'DIV';
      if (k === 'isContentEditable' || k === 'checked' || k === 'disabled' || k === 'hidden') return false;
      return dummy();
    },
    set(t, k, v) { if (CAPTURE && k === 'innerHTML' && typeof v === 'string') CAPTURE.push(v); return true; },
    apply() { return dummy(); },
    construct() { return dummy(); },
    has() { return true; },
  });
}

function createEnv(opts = {}) {
  const html = []; CAPTURE = html;
  const store = {};
  const fetchCalls = [];
  const timers = [];
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
  let now = opts.startTime || Date.UTC(2026, 10, 3, 10, 0, 0);
  let seed = (opts.seed || 12345) >>> 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  class FakeDate extends Date {
    constructor(...a) { if (a.length) super(...a); else super(now); }
    static now() { return now; }
  }
  const documentStub = dummy();
  const win = {
    localStorage, sessionStorage: localStorage, document: documentStub,
    navigator: { userAgent: 'node-harness', language: 'fr-BE', languages: ['fr-BE'], maxTouchPoints: 0, clipboard: dummy() },
    location: { href: 'https://www.keypace.be/', origin: 'https://www.keypace.be', pathname: '/', search: '', hash: '', hostname: 'www.keypace.be', assign() {}, replace() {}, reload() {} },
    history: { pushState() {}, replaceState() {}, back() {} },
    fetch: async (url, o) => { fetchCalls.push({ url: String(url), body: o && o.body ? JSON.parse(o.body) : null }); return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '{"ok":true}' }; },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    Audio: dummy(), Image: dummy(), AudioContext: dummy(), webkitAudioContext: dummy(), IntersectionObserver: dummy(), ResizeObserver: dummy(), MutationObserver: dummy(), Worker: dummy(), XMLHttpRequest: dummy(), FileReader: dummy(), Blob: dummy(), URL, URLSearchParams,
    performance: { now: () => now - 0 }, console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
    Date: FakeDate, Math: new Proxy(Math, { get: (t, k) => (k === 'random' ? rnd : t[k]) }), JSON, Promise, Intl, Object, Array, String, Number, Boolean, RegExp, Error, Map, Set, WeakMap, Symbol, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, escape, unescape,
    getComputedStyle: () => dummy(), scrollTo() {}, scrollBy() {}, open() {}, alert() {}, confirm: () => true, prompt: () => null, atob: (s) => Buffer.from(s, 'base64').toString('binary'), btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    crypto: { getRandomValues: (a) => a, randomUUID: () => '00000000-0000-4000-8000-000000000000', subtle: dummy() }, TextEncoder, TextDecoder,
    app: undefined,
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  const ctx = vm.createContext(win);
  return { ctx, store, fetchCalls, timers, html, advance: (ms) => { now += ms; }, setNow: (t) => { now = t; }, getNow: () => now, run: (code, name) => vm.runInContext(code, ctx, { filename: name || 'harness' }) };
}

function inlineScripts(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="(?:application\/ld\+json|text\/template|text\/x-[^"]*)")[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).filter((t) => t.trim());
}

// Charge index.html : exécute tous ses scripts en ligne dans le faux environnement.
function loadApp(htmlPath, opts) {
  const html = fs.readFileSync(htmlPath || path.join(__dirname, '..', 'index.html'), 'utf8');
  const env = createEnv(opts);
  const errors = [];
  // Scripts externes du site qui définissent des données dont la page a besoin (liste fermée : cookie-consent.js n'est pas exécuté).
  ['programme-data.js'].forEach((f) => {
    if (!html.includes(`<script src="/${f}"></script>`)) { errors.push(`${f} n'est pas chargé par la page`); return; }
    try { env.run(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), f); } catch (e) { errors.push(`${f} : ${e && e.message}`); }
  });
  inlineScripts(html).forEach((code, i) => {
    try { env.run(code, `index.html#script${i + 1}`); } catch (e) { errors.push(`script ${i + 1} : ${e && e.message}`); }
  });
  return { ...env, errors };
}
module.exports = { loadApp, createEnv, dummy };
