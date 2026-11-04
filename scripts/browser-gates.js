// Gates dans un VRAI navigateur (Chrome sans interface, piloté par le protocole CDP, sans aucune dépendance).
// Plan, 4.20. Vérifie ce que le banc d'essai Node ne voit pas : le chargement réel, le dessin, de vraies frappes.
// Limite : Chrome seulement (Firefox et Safari restent à faire) ; les touches mortes du système d'exploitation
// ne sont pas simulables ici (voir la page de capture matériel, plan G6).
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };

function serve() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent((req.url || '/').split('?')[0]);
    // Sauvegarde de la progression d'un compte simulé : le faux serveur répond « enregistré » (sinon un 401 déconnecterait le compte du test).
    if (u === '/api/save-progress' && req.method === 'POST') {
      let raw = ''; req.on('data', (c) => { raw += c; });
      return req.on('end', () => { let body = {}; try { body = JSON.parse(raw); } catch (e) { /* corps vide */ } res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body.access === true ? { ok: true, coursAcces: /testeur/.test(String(body.token)) ? ['fr/qwerty'] : [] } : { ok: true })); });
    }
    // Réouverture de session (ouverture des réglages) : le faux serveur reconnaît le jeton du compte simulé (sinon `{}` effacerait son nom).
    if (u === '/api/login' && req.method === 'POST') {
      let raw = ''; req.on('data', (c) => { raw += c; });
      return req.on('end', () => { let body = {}; try { body = JSON.parse(raw); } catch (e) { /* corps vide */ } res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body.action === 'session-login' && body.token ? { username: String(body.token).replace(/^tok-?/, '') || 'tester', token: body.token, plan: 'free', role: 'eleve' } : {})); });
    }
    if (u.startsWith('/api/')) {
      // Sans compte, le serveur répond 401 aux actions réservées aux comptes ; le reste reçoit un objet vide.
      const guestOnly = /^\/api\/(classes|save-progress|institutions|billing)/.test(u);
      res.writeHead(guestOnly ? 401 : 200, { 'Content-Type': 'application/json' }); return res.end(guestOnly ? '{"error":"Session invalide."}' : '{}');
    }
    const f = path.join(root, u);
    if (u !== '/' && f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); return fs.createReadStream(f).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': MIME['.html'] }); fs.createReadStream(path.join(root, 'index.html')).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}

async function launch(opts = {}) {
  if (!fs.existsSync(CHROME)) throw new Error(`Chrome introuvable (${CHROME}) : définir CHROME_PATH`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kp-chrome-'));
  const proc = spawn(CHROME, [...(opts.headed ? [] : ['--headless=new']), '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=1280,900', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const ws = await new Promise((resolve, reject) => {
    let buf = ''; const t = setTimeout(() => reject(new Error('Chrome ne répond pas')), 20000);
    proc.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) { clearTimeout(t); resolve(m[1]); } });
    proc.on('exit', () => reject(new Error('Chrome s\'est arrêté')));
  });
  const sock = new WebSocket(ws);
  await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });
  let id = 0; const pending = new Map(); const listeners = [];
  sock.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); } else listeners.forEach((l) => l(msg)); };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); sock.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const close = () => { try { sock.close(); } catch {} proc.kill('SIGKILL'); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} };
  return { send, on: (l) => listeners.push(l), close };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEYCODES = { ' ': 'Space', ',': 'Comma', '.': 'Period', ';': 'Semicolon', ':': 'Semicolon', '!': 'Digit1', '?': 'Slash', "'": 'Quote', '-': 'Minus' };
const codeFor = (ch) => (/^[a-z]$/i.test(ch) ? 'Key' + ch.toUpperCase() : KEYCODES[ch] || '');

async function run(opts = {}) {
  const { server, port } = await serve();
  let b; const problems = []; const info = {};
  try {
    b = await launch();
    const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
    const S = (m, p) => b.send(m, p, sessionId);
    const exceptions = [], consoleErrors = [];
    b.on((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.exceptionThrown') exceptions.push((msg.params.exceptionDetails.exception && msg.params.exceptionDetails.exception.description || msg.params.exceptionDetails.text || '').split('\n')[0].slice(0, 160));
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') consoleErrors.push(msg.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 160));
      if (msg.method === 'Fetch.requestPaused') {
        const local = /^https?:\/\/(127\.0\.0\.1|localhost)[:\/]/.test(msg.params.request.url) || /^data:|^blob:/.test(msg.params.request.url);
        S(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId: msg.params.requestId } : { requestId: msg.params.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
      }
    });
    await S('Page.enable'); await S('Runtime.enable');
    await S('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await S('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    const ev = async (expr) => { const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).split('\n')[0]); return r.result.value; };

    // BR1 : la page charge, sans exception
    await S('Page.navigate', { url: `http://127.0.0.1:${port}/` });
    await sleep(2500);
    const title = await ev('document.title');
    if (!title) problems.push('BR1 : la page n\'a pas de titre');
    const ready = await ev("typeof app==='object'&&typeof go==='function'");
    if (!ready) problems.push('BR1 : le site ne s\'est pas initialisé (app ou go absents)');
    exceptions.splice(0).forEach((e) => problems.push(`BR1 : exception au chargement : ${e}`));
    consoleErrors.splice(0).filter((e) => !/Failed to load resource|ERR_BLOCKED|net::/.test(e)).forEach((e) => problems.push(`BR1 : console.error : ${e}`));

    // BR2 : chaque écran s'affiche (contenu visible)
    if (ready) {
      const views = await ev('Object.keys(VIEW_PATHS)');
      for (const v of views) {
        try {
          await ev(`go(${JSON.stringify(v)})`); await sleep(500);
          // Le texte d'un écran peut vivre dans un shadow DOM (le hub des cours) : on le mesure aussi.
          const r = await ev(`(()=>{const el=document.getElementById('page-${v}');if(!el)return null;let len=el.innerText.length;el.querySelectorAll('*').forEach(c=>{if(c.shadowRoot)len+=c.shadowRoot.textContent.length});return{len,h:el.offsetHeight}})()`);
          if (!r) problems.push(`BR2 : écran ${v} : conteneur absent`); else if (r.len < (v === 'classes' ? 10 : 20) || r.h < 50) problems.push(`BR2 : écran ${v} vide ou invisible (${r.len} caractères, ${r.h} px)`);
        } catch (e) { problems.push(`BR2 : écran ${v} : ${e.message}`); }
        exceptions.splice(0).forEach((e) => problems.push(`BR2 : exception sur ${v} : ${e}`));
      }
      info.views = views.length;

      // BR3 : le clavier dessiné, pour les 26 configurations (dessin réel, mesuré dans le navigateur)
      const preview = await ev(`(()=>{const out={};const host=document.createElement('div');host.style.cssText='position:absolute;left:0;top:0;width:1200px';document.body.appendChild(host);
        for(const lay of Object.keys(KB_LAYOUTS)){for(const ff of kbFormFactorIdsFor(lay)){host.innerHTML=kbFullPreviewHTML(lay,ff);
          const keys=[...host.querySelectorAll('.kbp-key')];const bad=keys.filter(k=>{const r=k.getBoundingClientRect();return r.width<4||r.height<4}).length;
          const txt=keys.map(k=>k.innerText).join('|');let h=0;for(const c of txt){h=(h*31+c.charCodeAt(0))>>>0}
          out[lay+'/'+ff]={keys:keys.length,bad,sig:h}}}host.remove();return out})()`);
      const cfgs = Object.keys(preview);
      info.configs = cfgs.length;
      for (const c of cfgs) { if (!preview[c].keys) problems.push(`BR3 : clavier ${c} : aucune touche dessinée`); if (preview[c].bad) problems.push(`BR3 : clavier ${c} : ${preview[c].bad} touche(s) minuscule(s) ou invisible(s)`); }
      info.preview = preview;

      // BR4 : de VRAIES frappes (Input.dispatchKeyEvent) terminent une leçon et la sauvegardent
      await ev("currentUser='tester';currentToken='tok';currentUserId='uid';_statsLoaded=true;app.stats=mergeStats();app.view='lessons';app.sess=app.makeSession('lesson','r1');true");
      const text = await ev('app.sess.text');
      for (const ch of text) {
        const code = codeFor(ch);
        await S('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, code, text: ch, unmodifiedText: ch, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) });
        await S('Input.dispatchKeyEvent', { type: 'keyUp', key: ch, code, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) });
      }
      await sleep(200);
      const fin = await ev('({finished:app.sess.finished,ks:app.sess.keystrokes,co:app.sess.correct,cleared:!!(app.stats.lessons.r1&&app.stats.lessons.r1.bestWpm>=0)})');
      if (!fin.finished) problems.push(`BR4 : la leçon r1 n'est pas terminée après de vraies frappes (${fin.co}/${text.length})`);
      else if (fin.ks !== fin.co) problems.push(`BR4 : ${fin.ks - fin.co} faute(s) avec de vraies frappes`);
      else if (!fin.cleared) problems.push('BR4 : la leçon terminée n\'est pas enregistrée');
      exceptions.splice(0).forEach((e) => problems.push(`BR4 : exception pendant la frappe : ${e}`));

      // BR5 : une capture d'écran de la page de leçon n'est pas vide
      await ev("go('lessons');true"); await sleep(600);
      const shot = await S('Page.captureScreenshot', { format: 'png' });
      const bytes = Buffer.from(shot.data, 'base64').length;
      info.shotBytes = bytes;
      if (bytes < 15000) problems.push(`BR5 : la capture d'écran est quasi vide (${bytes} octets)`);
      if (opts.screenshotDir) { fs.mkdirSync(opts.screenshotDir, { recursive: true }); fs.writeFileSync(path.join(opts.screenshotDir, 'lessons.png'), Buffer.from(shot.data, 'base64')); }

      // BR6 : l'espace pays et langue (drapeau, en haut à droite), au bureau puis sur téléphone
      try {
        // page neuve, visiteur non connecté (BR4 a simulé une connexion et une fenêtre peut être ouverte)
        await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2500); exceptions.splice(0);
        for (const [w, h, label] of [[1280, 900, 'bureau'], [375, 800, 'fenêtre étroite']]) {
          await S('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
          await ev("go('home');localStorage.removeItem('kp_region');localStorage.removeItem('kp_lang');true"); await sleep(400);
          const geo = await ev(`(()=>{const b=document.getElementById('nav-region-btn');if(!b)return null;const r=b.getBoundingClientRect(),g=[...document.querySelectorAll('#nav-guest,#nav-logged')].map(x=>x.getBoundingClientRect()).filter(x=>x.width>0)[0]||{left:1e9},m=document.getElementById('nav-region-menu');
            return{x:r.x,right:r.right,w:r.width,h:r.height,guestLeft:g.left,menuHidden:m.hidden,flag:!!b.querySelector('svg'),expanded:b.getAttribute('aria-expanded'),label:b.getAttribute('aria-label')}})()`);
          if (!geo) { problems.push(`BR6 (${label}) : bouton pays et langue absent`); continue; }
          if (!geo.w || !geo.h) problems.push(`BR6 (${label}) : bouton invisible`);
          if (geo.right > w) problems.push(`BR6 (${label}) : bouton hors de l'écran (${Math.round(geo.right)} px sur ${w})`);
          if (label === 'bureau' && geo.x < w / 2) problems.push('BR6 : le drapeau n\'est pas dans la moitié droite de l\'écran');
          if (label === 'bureau' && geo.right > geo.guestLeft) problems.push('BR6 : le drapeau chevauche les boutons de connexion');
          if (!geo.flag) problems.push(`BR6 (${label}) : pas de drapeau dessiné`);
          if (!geo.menuHidden || geo.expanded !== 'false') problems.push(`BR6 (${label}) : menu ouvert au chargement`);
          if (!/Belgique/.test(geo.label || '')) problems.push(`BR6 (${label}) : libellé sans « Belgique » (${geo.label})`);
          // l'en-tête ne doit pas casser : pas de défilement horizontal, boutons sur une seule ligne
          const navOk = await ev(`(()=>{const s=document.querySelector('.nav-signup-btn'),r=s&&s.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth-window.innerWidth,signupH:r?Math.round(r.height):0,signupRight:r?Math.round(r.right):0}})()`);
          if (navOk.overflow > 0) problems.push(`BR6 (${label}) : l'en-tête fait défiler la page horizontalement (${navOk.overflow} px)`);
          if (navOk.signupH > 42) problems.push(`BR6 (${label}) : « Créer un compte » passe sur plusieurs lignes (${navOk.signupH} px de haut)`);
          await ev("document.getElementById('nav-region-btn').click();true"); await sleep(150);
          const open = await ev(`(()=>{const m=document.getElementById('nav-region-menu'),r=m.getBoundingClientRect();return{hidden:m.hidden,text:m.innerText,left:r.left,right:r.right,expanded:document.getElementById('nav-region-btn').getAttribute('aria-expanded')}})()`);
          if (open.hidden || open.expanded !== 'true') problems.push(`BR6 (${label}) : le clic n'ouvre pas le menu`);
          if (!/Belgique/.test(open.text) || !/Français/.test(open.text)) problems.push(`BR6 (${label}) : le menu ne propose pas Belgique et Français (${open.text.replace(/\s+/g, ' ').slice(0, 80)})`);
          if (open.left < 0 || open.right > w) problems.push(`BR6 (${label}) : le menu déborde de l'écran (${Math.round(open.left)} à ${Math.round(open.right)} sur ${w})`);
          await S('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
          await S('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
          await sleep(100);
          if (!(await ev("document.getElementById('nav-region-menu').hidden"))) problems.push(`BR6 (${label}) : Échap ne ferme pas le menu`);
          await ev("document.getElementById('nav-region-btn').click();true"); await sleep(100);
          await ev("document.querySelector('#nav-region-menu .nav-region-item[aria-checked=\"true\"]').click();true"); await sleep(100);
          const picked = await ev("({hidden:document.getElementById('nav-region-menu').hidden,region:localStorage.getItem('kp_region'),lang:localStorage.getItem('kp_lang'),focus:document.activeElement&&document.activeElement.id})");
          if (!picked.hidden) problems.push(`BR6 (${label}) : le menu reste ouvert après un choix`);
          if (picked.region !== 'be' || picked.lang !== 'fr') problems.push(`BR6 (${label}) : le choix n'est pas gardé (${picked.region}/${picked.lang})`);
          if (picked.focus === 'nav-region-btn') problems.push(`BR6 (${label}) : le bouton garde le focus après un clic (la barre d'espace rouvrirait le menu)`);
          // une vraie barre d'espace après un choix ne doit pas rouvrir le menu
          await S('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', text: ' ', windowsVirtualKeyCode: 32 });
          await S('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
          await sleep(100);
          if (!(await ev("document.getElementById('nav-region-menu').hidden"))) problems.push(`BR6 (${label}) : la barre d'espace rouvre le menu`);
          exceptions.splice(0).forEach((e) => problems.push(`BR6 (${label}) : exception : ${e}`));
          if (opts.screenshotDir) { await ev("document.getElementById('nav-region-btn').click();true"); await sleep(150); const sh = await S('Page.captureScreenshot', { format: 'png' }); fs.mkdirSync(opts.screenshotDir, { recursive: true }); fs.writeFileSync(path.join(opts.screenshotDir, `region-${label}.png`), Buffer.from(sh.data, 'base64')); await ev("kpCloseRegion(false);true"); }
        }
        // vraie version téléphone (écran tactile étroit sans clavier) : l'espace pays et langue n'y apparaît pas ; il revient au retour au bureau
        const hid = await ev("(()=>{const real=isMobileLayout;isMobileLayout=()=>true;applyMobileNav();const hidden=getComputedStyle(document.getElementById('nav-region')).display==='none';isMobileLayout=()=>false;applyMobileNav();const back=getComputedStyle(document.getElementById('nav-region')).display!=='none';isMobileLayout=real;return{hidden,back}})()");
        if (!hid.hidden) problems.push('BR6 : l\'espace pays et langue apparaît sur la version téléphone');
        if (!hid.back) problems.push('BR6 : l\'espace pays et langue ne revient pas hors version téléphone');
        await S('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        info.region = 'ok';
      } catch (e) { problems.push(`BR6 : ${e.message}`); }

      // BR7 : « Mon clavier » : passer d'AZERTY à QWERTY et revenir, dans le vrai navigateur (le QWERTY est proposé seulement pour ce test)
      try {
        await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2500); exceptions.splice(0);
        // un élève ne voit pas les cartes : le cours QWERTY est en bêta pour les comptes testeurs
        await ev("localStorage.clear();currentUser='eleve1';currentToken='tok-eleve';currentUserId='uid';_statsLoaded=true;app.stats=mergeStats({role:'eleve'});_kpAccessFor=null;updateNavUser();true"); await sleep(500); await ev("app.openSettings();true"); await sleep(400);
        const noCards = await ev("document.querySelectorAll('#kb-family-box .kb-family-card').length");
        if (noCards !== 0) problems.push(`BR7 : ${noCards} cartes de famille visibles pour un élève`);
        await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2200); exceptions.splice(0); // page neuve pour l'admin
        await ev("localStorage.clear();currentUser='testeur';currentToken='tok-testeur';currentUserId='uid';_statsLoaded=true;app.stats=mergeStats();_kpAccessFor=null;updateNavUser();true"); await sleep(600); await ev("app.openSettings();true"); await sleep(500);
        if (!(await ev("KP_COURSES_OFFERED.includes('fr/qwerty')"))) problems.push('BR7 : le cours QWERTY n\'est pas proposé à un compte testeur');
        const cards = await ev("({n:document.querySelectorAll('#kb-family-box .kb-family-card').length,active:[...document.querySelectorAll('#kb-family-box .kb-family-card.active')].map(x=>x.querySelector('strong').innerText)})");
        if (cards.n !== 2) problems.push(`BR7 : ${cards.n} cartes de famille au lieu de 2`);
        if (cards.active.join() !== 'AZERTY') problems.push(`BR7 : famille active au départ « ${cards.active} »`);
        await ev("document.querySelectorAll('#kb-family-box .kb-family-card')[1].click();true"); await sleep(200);
        const dlg = await ev("(()=>{const d=document.getElementById('kb-switch-confirm');return d?d.innerText:null})()");
        if (!dlg || !/progression AZERTY est gardée/.test(dlg)) problems.push('BR7 : la confirmation n\'explique pas que la progression AZERTY est gardée');
        await ev("document.getElementById('kb-sw-no').click();true"); await sleep(150);
        const stay = await ev("({dlg:!!document.getElementById('kb-switch-confirm'),course:kpCourseId()})");
        if (stay.dlg || stay.course !== 'fr/azerty') problems.push('BR7 : « Rester en AZERTY » ne laisse pas le cours AZERTY');
        await ev("document.querySelectorAll('#kb-family-box .kb-family-card')[1].click();true"); await sleep(150);
        await ev("document.getElementById('kb-sw-yes').click();true"); await sleep(1200);
        const q = await ev(`(()=>{const l=getKbLayoutId();const r4=ALL_LESSONS.find(x=>x.id==='r4');const keys=document.querySelectorAll('#kb-layout-preview .kbp-key').length;
          return{course:kpCourseId(),layout:l,r4:r4.keys,btns:[...document.querySelectorAll('#kb-layout-btns .kb-layout-btn')].map(b=>b.innerText),keys,title:document.getElementById('kb-layout-title').innerText,
          active:[...document.querySelectorAll('#kb-family-box .kb-family-card.active')].map(x=>x.querySelector('strong').innerText).join(),mod7:ALL_MODULES[6].name}})()`);
        if (q.course !== 'fr/qwerty') problems.push(`BR7 : cours après confirmation « ${q.course} »`);
        if (q.layout !== 'windows-us-intl') problems.push(`BR7 : variante par défaut « ${q.layout} »`);
        if (q.r4 !== 'a ;') problems.push(`BR7 : le contenu QWERTY n'est pas appliqué (r4 : ${q.r4})`);
        if (q.btns.length !== 8) problems.push(`BR7 : ${q.btns.length} variantes proposées au lieu de 8`);
        if (q.keys < 55) problems.push(`BR7 : aperçu QWERTY avec ${q.keys} touches seulement`);
        if (q.title !== 'Disposition QWERTY' || q.active !== 'QWERTY') problems.push(`BR7 : libellés (${q.title} / ${q.active})`);
        if (/AZERTY/.test(q.mod7)) problems.push(`BR7 : module 7 « ${q.mod7} » cite l'AZERTY`);
        // une variante Mac : l'aperçu a la touche Option et le geste de é parle d'Option
        await ev("app.setKbLayout('mac-us');true"); await sleep(200);
        const mac = await ev("({opt:document.getElementById('kb-layout-preview').innerText.includes('⌥'),how:KB_HOW['mac-us']['é'],mod:kbModifierName()})");
        if (!mac.opt) problems.push('BR7 : l\'aperçu Mac n\'a pas la touche Option');
        if (!/Option/.test(mac.how) || !/Option/.test(mac.mod)) problems.push(`BR7 : geste ou modificateur Mac sans Option (${mac.how} / ${mac.mod})`);
        const shown = await ev("(()=>{const l=ALL_LESSONS.find(x=>x.id==='acc1');return kbHowHTML(l)})()");
        if (!/Sur ton clavier \(Mac/.test(shown) || !/Option/.test(shown)) problems.push('BR7 : le bloc « Sur ton clavier » de acc1 ne donne pas le geste Mac');
        // une vraie leçon se tape et s'enregistre dans le cours QWERTY, pas dans le plat
        await ev("app.closeSettings();app.view='lessons';app.sess=app.makeSession('lesson','r1');true"); await sleep(200);
        const t7 = await ev('app.sess.text');
        for (const ch of t7) { const code = codeFor(ch); await S('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, code, text: ch, unmodifiedText: ch, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) }); await S('Input.dispatchKeyEvent', { type: 'keyUp', key: ch, code, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) }); }
        await sleep(200);
        const rec = await ev("({flat:Object.keys(app.stats.lessons),q:Object.keys((app.stats.courses||{})['fr/qwerty']?(app.stats.courses['fr/qwerty'].lessons):{}),fin:app.sess.finished,course:kpCourseId(),offered:KP_COURSES_OFFERED.join(),user:currentUser,statsKeys:Object.keys(app.stats).join()})");
        if (!rec.fin || rec.flat.length || !rec.q.includes('r1')) problems.push(`BR7 : la leçon QWERTY n'est pas enregistrée dans stats.courses (${JSON.stringify(rec)})`);
        // retour à l'AZERTY : tout est restauré, les claviers QWERTY sont retirés
        await ev("app.sess=null;app.openSettings();true"); await sleep(300);
        await ev("document.querySelectorAll('#kb-family-box .kb-family-card')[0].click();true"); await sleep(150);
        await ev("document.getElementById('kb-sw-yes').click();true"); await sleep(1000);
        const back = await ev("({course:kpCourseId(),layout:getKbLayoutId(),r4:ALL_LESSONS.find(x=>x.id==='r4').title,gone:!KB_LAYOUTS['windows-us'],btns:document.querySelectorAll('#kb-layout-btns .kb-layout-btn').length})");
        if (back.course !== 'fr/azerty' || back.layout !== 'fr') problems.push(`BR7 : retour à l'AZERTY incomplet (${back.course} / ${back.layout})`);
        if (back.r4 !== 'Q et M, les auriculaires') problems.push(`BR7 : r4 n'est pas restaurée (« ${back.r4} »)`);
        if (!back.gone) problems.push('BR7 : les claviers QWERTY restent enregistrés après le retour à l\'AZERTY');
        if (back.btns !== 4) problems.push(`BR7 : ${back.btns} variantes AZERTY au lieu de 4`);
        exceptions.splice(0).forEach((e) => problems.push(`BR7 : exception : ${e}`));
        if (opts.screenshotDir) { await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2200); await ev("localStorage.clear();KP_COURSES_OFFERED.length>1||KP_COURSES_OFFERED.push('fr/qwerty');go('home');kpChooseFamily('qwerty').then(()=>{app.openSettings();setTimeout(()=>{const s=document.getElementById('settings-keyboard-section');if(s)s.scrollIntoView({block:'start'});},300);});true"); await sleep(1800); const sh = await S('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(opts.screenshotDir, 'mon-clavier-qwerty.png'), Buffer.from(sh.data, 'base64')); }
        info.keyboardSwitch = 'ok';
      } catch (e) { problems.push(`BR7 : ${e.message}`); }
    }
  } catch (e) { problems.push(`navigateur : ${e.message}`); }
  finally { if (b) b.close(); server.close(); }
  return { problems, info };
}
module.exports = { run, launch, serve, sleep };

if (require.main === module) run({ screenshotDir: process.argv[2] }).then((r) => { console.log(JSON.stringify({ problems: r.problems, views: r.info.views, configs: r.info.configs, shot: r.info.shotBytes }, null, 1)); process.exit(r.problems.length ? 1 : 0); });
