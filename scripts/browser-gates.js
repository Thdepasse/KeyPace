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
      return req.on('end', () => { let body = {}; try { body = JSON.parse(raw); } catch (e) { /* corps vide */ } res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body.access === true ? { ok: true, coursAcces: /testeur-en/.test(String(body.token)) ? ['fr/qwerty', 'en/azerty', 'en/qwerty'] : /testeur/.test(String(body.token)) ? ['fr/qwerty'] : [] } : { ok: true })); });
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
    // Cours de langue (hors français) : construits à la demande depuis leurs sources (la gate teste la source de vérité, pas un fichier assemblé oublié sur le disque).
    const lc = /^\/courses-src\/([a-z]{2})-(qwerty|azerty)\.json$/.exec(u);
    if (lc && lc[1] !== 'fr') { try { const body = JSON.stringify(require('./build-qwerty-course').build(lc[1], lc[2])); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(body); } catch (e) { res.writeHead(404); return res.end('{}'); } }
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
        // France : le menu propose les deux pays ; choisir la France mémorise le choix et vise l'adresse française (la navigation elle-même n'est pas suivie ici)
        await S('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        await ev("go('home');localStorage.removeItem('kp_region');localStorage.removeItem('kp_lang');localStorage.removeItem('kp_country');document.getElementById('nav-region-btn').click();true"); await sleep(150);
        const fr = await ev(`(()=>{const m=document.getElementById('nav-region-menu');const items=[...m.querySelectorAll('.nav-region-item')].map(x=>x.innerText.replace(/\\s+/g,' ').trim());
          const t={beHome:kpRegionTarget('be','home'),frHome:kpRegionTarget('fr','home'),frLessons:kpRegionTarget('fr','lessons'),beLessons:kpRegionTarget('be','lessons'),frTest:kpRegionTarget('fr','test')};
          kpSetRegion('fr');const lab=document.getElementById('nav-region-btn').getAttribute('aria-label');const c=KPProg.getCountry();kpSetRegion('be');
          return{items,t,lab,c,back:KPProg.getCountry()}})()`);
        if (!fr.items.some((x) => /^France/.test(x)) || !fr.items.some((x) => /^Belgique/.test(x))) problems.push(`BR6 : le menu ne propose pas les deux pays (${fr.items.join(' / ')})`);
        if (fr.t.beHome !== '/' || fr.t.frHome !== '/fr' || fr.t.frLessons !== '/fr/cours-dactylo-en-ligne' || fr.t.beLessons !== '/cours-dactylo-en-ligne' || fr.t.frTest !== '/fr') problems.push(`BR6 : mauvaise adresse visée en changeant de pays (${JSON.stringify(fr.t)})`);
        if (!/France/.test(fr.lab) || fr.c !== 'fr' || fr.back !== 'be') problems.push(`BR6 : le choix de la France n'est pas pris en compte (${fr.lab} / ${fr.c} / ${fr.back})`);
        await ev("localStorage.removeItem('kp_region');localStorage.removeItem('kp_lang');localStorage.removeItem('kp_country');kpCloseRegion(false);true");
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
        const shown = await ev("(()=>{const l=ALL_LESSONS.find(x=>x.id==='ac1');return kbHowHTML(l)})()");
        if (!/Sur ton clavier \(Mac/.test(shown) || !/Option/.test(shown)) problems.push('BR7 : le bloc « Sur ton clavier » de ac1 ne donne pas le geste Mac');
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

      // BR9 : la page programme de la Belgique est strictement inchangée (4 réseaux × 10 années), la France n'y change rien
      try {
        const ref = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'programme-be-render.json'), 'utf8')).hash;
        // visiteur non connecté : les étapes précédentes ont simulé une connexion, et le rendu change avec la progression
        await ev("localStorage.removeItem('klak_session');true");
        await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2500); exceptions.splice(0);
        const got = await ev(`(()=>{try{localStorage.removeItem('kp_prog');localStorage.removeItem('kp_country');}catch(e){}go('lessons');const r=document.getElementById('kpCoursHost').shadowRoot;
          const h=s=>{let x=5381;for(let i=0;i<s.length;i++)x=((x<<5)+x+s.charCodeAt(i))|0;return (x>>>0).toString(36)};
          const o={};const nets=[...r.querySelectorAll('#menu1 button')].map(b=>b.dataset.id);const yrs=[...r.querySelectorAll('#menu2 button')].map(b=>b.dataset.l);
          for(const n of nets){for(const y of yrs){r.querySelector('#menu1 button[data-id="'+n+'"]').click();r.querySelector('#menu2 button[data-l="'+y+'"]').click();if(!r.getElementById('pfold').classList.contains('open'))r.getElementById('pgo').click();o[n+'|'+y]=h(r.getElementById('pc').innerHTML);}}
          return{nets,o,pressed:r.querySelector('#ctry button[aria-pressed=true]').dataset.c,guest:!(typeof currentUser!=='undefined'&&currentUser)}})()`);
        if (got.nets.length !== 4) problems.push(`BR9 : ${got.nets.length} réseaux au lieu de 4`);
        if (!got.guest) problems.push('BR9 : le test devait se faire en visiteur non connecté');
        if (got.pressed !== 'be') problems.push(`BR9 : le pays par défaut n'est pas la Belgique (${got.pressed})`);
        const bad = [];
        for (const n of got.nets) for (const y of Object.keys(ref)) if (got.o[n + '|' + y] !== ref[y]) bad.push(n + ' / ' + y);
        if (bad.length) problems.push(`BR9 : la page programme belge a changé (${bad.length} sur 40, ex. ${bad.slice(0, 3).join(', ')})`);
        exceptions.splice(0).forEach((e) => problems.push(`BR9 : exception : ${e}`));
        info.programmeBE = 'identique';
      } catch (e) { problems.push(`BR9 : ${e.message}`); }

      // BR10 : Frappe-mots par niveau : « Mon niveau » d'un élève en leçon 8 = 14 lettres et de vrais mots ; un niveau d'entraînement ne touche ni le record ni les paliers ;
      // « Tout le clavier » garde l'ancien comportement (record, paliers de score)
      try {
        await ev("localStorage.clear();true");
        await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2500); exceptions.splice(0);
        const gl = await ev(`(()=>{
          currentUser='eleve';currentToken='tok';currentUserId='uid';_statsLoaded=true;app.stats=mergeStats();
          ALL_LESSONS.slice(0,8).forEach(l=>{(app.stats.lessons=app.stats.lessons||{})[l.id]={bestWpm:30,bestErr:1,cleared:true}});
          const sent=[];const oldTrack=window.track;window.track=(e,p)=>{sent.push(e)};
          go('games');app.activeGame='frappe';app.game=null;app.renderGames();
          const chips=[...document.querySelectorAll('.gl-chip')].map(b=>b.innerText),info=(document.querySelector('.gl-info')||{}).innerText||'';
          const run=(score)=>{app.game=null;app.startGame();clearTimeout(app._cdTimer);const g=app.game;g.on=true;g.startTime=Date.now();g.score=score;app.stats.gameBest=40;const seen=new Set();
            for(let i=0;i<5000&&!g.over;i++){app.gameTick();g.words.forEach(w=>seen.add(w.text));}clearInterval(app._gameLoop);return{g,seen:[...seen]};};
          const K=new Set('fjdkslqmghruei');
          app.pickGameLevel('frappe','auto');const a=run(500);
          const train={level:a.g.level.id,pool:!!a.g.pool,bad:a.seen.filter(w=>![...w].every(c=>K.has(c))),words:a.seen.length,best:app.stats.gameBest,record:!!a.g._isRecord,tier:a.g.tierIdx};
          app.pickGameLevel('frappe','repos');const r=run(10);const reposBad=r.seen.filter(w=>![...w].every(c=>'dfghjklmqs'.includes(c)));
          const reposInfo=(()=>{app.pickGameLevel('frappe','repos');return app._gameLevelPicker('frappe')})();
          app.pickGameLevel('frappe','tout');const t=run(80);
          const full={level:t.g.level.id,pool:t.g.pool,best:app.stats.gameBest,record:!!t.g._isRecord,tier:t.g.tierIdx};
          window.track=oldTrack;
          return{chips,info,train,reposBad,reposMixed:/suites de lettres/.test(reposInfo),full,starts:sent.filter(e=>e==='game_start').length,done:sent.filter(e=>e==='game_completed').length}})()`);
        if (!gl.chips.some((c) => /^Mon niveau \(14 lettres\)$/.test(c))) problems.push(`BR10 : « Mon niveau » d'un élève en leçon 8 devrait afficher 14 lettres (${gl.chips.join(' / ')})`);
        if (!/25 mots possibles/.test(gl.info)) problems.push(`BR10 : information de niveau inattendue (${gl.info})`);
        if (!gl.train.pool || gl.train.bad.length) problems.push(`BR10 : mots hors des lettres apprises au niveau « Mon niveau » (${gl.train.bad.join(', ')})`);
        if (gl.train.best !== 40 || gl.train.record || gl.train.tier !== 0) problems.push(`BR10 : un niveau d'entraînement a touché le record ou les paliers (${JSON.stringify(gl.train)})`);
        if (gl.reposBad.length) problems.push(`BR10 : mots hors de la rangée de repos (${gl.reposBad.join(', ')})`);
        if (!gl.reposMixed) problems.push('BR10 : la rangée de repos devrait annoncer des suites de lettres (aucun mot possible)');
        if (gl.full.pool !== null || gl.full.best !== 80 || !gl.full.record || gl.full.tier < 1) problems.push(`BR10 : « Tout le clavier » a changé de comportement (${JSON.stringify(gl.full)})`);
        if (gl.starts !== 3 || gl.done !== 3) problems.push(`BR10 : événements de partie manquants (${gl.starts} départs, ${gl.done} fins)`);
        exceptions.splice(0).forEach((e) => problems.push(`BR10 : exception : ${e}`));
        info.jeuxNiveaux = 'ok';
      } catch (e) { problems.push(`BR10 : ${e.message}`); }

      // BR11 : tous les jeux par niveau (Sprint, Simon, Course, Fantôme, Duo), conseils « Pour toi », jeux de lettres qui suivent le clavier (Grille réflexe, Magic Tiles, ZQSD/WASD)
      try {
        await ev("localStorage.clear();true");
        await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2500); exceptions.splice(0);
        const gm = await ev(`(async()=>{
          currentUser='eleve';currentToken='tok';currentUserId='uid';_statsLoaded=true;app.stats=mergeStats();
          ALL_LESSONS.slice(0,8).forEach(l=>{(app.stats.lessons=app.stats.lessons||{})[l.id]={bestWpm:30,bestErr:1,cleared:true}});
          const sev=[];window.track=(e,p)=>{sev.push(e+':'+(p&&p.game)+':'+(p&&p.level))};
          go('games');app.activeGame=null;app.renderGames();
          const out={};const K=new Set('fjdkslqmghruei');const bad=t=>t.split(' ').filter(w=>![...w].every(c=>K.has(c))).length;
          out.advice=(document.querySelector('.gcine-advice')||{innerText:''}).innerText;out.recTags=[...document.querySelectorAll('.gcine-card-tag-idle')].filter(t=>/CONSEILL/.test(t.innerText)).length;
          app.pickGameLevel('sprint','auto');app.startSprint();clearInterval(app._sprintLoop);out.sprint={train:!app.sprint.glv.full,bad:bad(app.sprint.text)};
          const sp=app.sprint;sp.on=true;sp.started=true;sp.timeLeft=1;app.sprintTick();out.sprintBest=app.stats.sprintBest||null;app.stopSprint();
          app.pickGameLevel('simon','auto');app.startSimon();clearInterval(app._simonLoop);const si=app.simon;let sb=0;for(let i=0;i<40;i++){app.simonNewSequence();sb+=si.words.filter(w=>![...w].every(c=>K.has(c))).length}out.simon={train:!si.glv.full,bad:sb};app.stopSimon();
          app.pickGameLevel('course','auto');app.startCourse();clearInterval(app._courseLoop);const co=app.course;out.course={train:!co.glv.full,bad:bad(co.text),bots:co.bots.map(b=>b.wpm).join('/')};
          const cb=JSON.stringify(app.stats.courseBest);co.startTime=Date.now();co.endTime=co.startTime+8000;co.rank=1;co.correct=co.text.length;co.keystrokes=co.text.length;app.afterCourse();out.courseKept=JSON.stringify(app.stats.courseBest)===cb;app.stopCourse();
          app.pickGameLevel('ghost','auto');app.startGhost();clearInterval(app._ghostLoop);const t1=app.ghost.text;app.stopGhost();app.startGhost();clearInterval(app._ghostLoop);
          out.ghost={train:!app.ghost.glv.full,same:t1===app.ghost.text,bad:bad(t1)};
          const gg=app.ghost;gg.recording=[[100,3],[900,t1.length]];gg.typed=t1.split('');gg.startTime=Date.now();gg.endTime=gg.startTime+5000;gg.correct=t1.length;gg.keystrokes=t1.length;
          const gb=JSON.stringify(app.stats.ghostBest);app.afterGhost();out.ghostLocal=!!localStorage.getItem(app._ghostKey(gg.glv));out.ghostKept=JSON.stringify(app.stats.ghostBest)===gb;app.stopGhost();
          // Duo : seulement les lettres apprises de sa main
          app.stats.sourisHybridHand='mouse-right';app.pickGameLevel('hybrid','auto');app.souris={phase:'play',track:'hybrid',glv:app._glResolve('hybrid'),score:0};
          const seen=new Set();for(let i=0;i<80;i++){app._sourisHybridSpawn();seen.add(app.souris.letter)}out.duo={letters:[...seen].sort().join(''),bad:[...seen].filter(c=>!K.has(c)).length};
          // Grille réflexe : « Mon niveau » (lettres apprises, sans médaille ni record) ; les 4 niveaux d'origine gardent leurs médailles
          app.activeGame='sourisGrid';app.souris={phase:'brief',track:'grid'};app.renderGames();
          out.grid8={suggest:app._sgrSuggest(),mine:app._sgrLevels[4].pool,cards:document.querySelectorAll('.sgr-lv-card').length};
          const les=app.stats.lessons;app.stats.lessons={};ALL_LESSONS.slice(0,3).forEach(l=>{app.stats.lessons[l.id]=les[l.id]});
          out.grid3={suggest:app._sgrSuggest(),mine:app._sgrLevels[4].pool};app.stats.lessons=les;
          const gs=app.souris;gs.lvl=5;app._sgrBegin();app._sgrStopLoop();gs.score=120;gs.hits=8;gs.misses=2;gs.bestCombo=4;
          const gk=JSON.stringify([app.stats.sourisGridBest,app.stats.sourisGridTop]);app._sgrEnd();
          out.gridMine={training:!!(gs._result&&gs._result.training),kept:JSON.stringify([app.stats.sourisGridBest,app.stats.sourisGridTop])===gk,noGold:!/Or décroché/.test(document.querySelector('.sgr-card').innerText)};
          app.souris.lvl=1;app._sgrBegin();app._sgrStopLoop();app.souris.score=200;app.souris.hits=10;app._sgrEnd();out.gridNormal={tier:app.souris._result&&app.souris._result.tier,top:(app.stats.sourisGridTop||{}).r1};
          app.activeGame=null;
          // Duel : le créateur choisit le niveau ; son texte (lettres apprises) part au serveur, « Tout le clavier » laisse le serveur choisir
          app.activeGame='duel';app.duel=null;app.renderGames();out.duelPicker=!!document.querySelector('.duel-card .gl-picker');
          app.pickGameLevel('duel','auto');const db=app._duelCreateBody();out.duelTrain={action:db.action,has:typeof db.text==='string',bad:typeof db.text==='string'?bad(db.text):-1,n:typeof db.text==='string'?db.text.split(' ').length:0};
          app.pickGameLevel('duel','tout');out.duelFull=!('text' in app._duelCreateBody());app.activeGame=null;app.duel=null;
          // tout le clavier : rien ne change
          app.pickGameLevel('sprint','tout');app.startSprint();clearInterval(app._sprintLoop);out.sprintFull={full:app.sprint.glv.full};app.stopSprint();
          // Grille réflexe et Magic Tiles en AZERTY : identiques à l'origine
          out.azSgr=app._sgrLevels.slice(0,4).map(l=>l.pool).join('|');kpSyncTilesLanes();out.azLanes=TILES_LANES.map(l=>l.letter).join('');
          // QWERTY
          const d=await (await fetch('/courses-src/fr-qwerty.json')).json();kpApplyCourseData('fr/qwerty',d);localStorage.setItem('kp_kb_layout','windows-us');
          out.qwSgr=app._sgrLevels.slice(0,4).map(l=>l.pool).join('|');kpSyncTilesLanes();out.qwLanes=TILES_LANES.map(l=>l.letter).join('');
          out.qwDesc=app._gcineDesc(GCINE_GAMES.find(g=>g.key==='sourisTiles'));out.qwSouris=app._gcineDesc(GCINE_GAMES.find(g=>g.key==='souris'));
          go('games');const el=document.getElementById('page-games');el.insertAdjacentHTML('beforeend','<p id="zq">Z Q S D et ZQSD</p>');await new Promise(r=>setTimeout(r,60));out.relabel=document.getElementById('zq').innerText;
          kpApplyCourseData('fr/azerty',null);localStorage.setItem('kp_kb_layout','fr');kpSyncTilesLanes();out.azBack=TILES_LANES.map(l=>l.letter).join('');
          window.track=undefined;out.events=sev;return out})()`);
        const A = 'QSDFGHJKLM|AZERTYUIOP|WXCVBN|AZERTYUIOPQSDFGHJKLMWXCVBN';
        if (!/Tu apprends la rangée du haut/.test(gm.advice) || gm.recTags < 1) problems.push(`BR11 : conseils « Pour toi » absents ou faux (${gm.advice.slice(0, 80)} / ${gm.recTags})`);
        for (const g of ['sprint', 'simon', 'course', 'ghost']) { if (!gm[g].train) problems.push(`BR11 : ${g} n'est pas au niveau « Mon niveau »`); if (gm[g].bad) problems.push(`BR11 : ${g} propose des mots hors des lettres apprises (${gm[g].bad})`); }
        if (gm.sprintBest) problems.push('BR11 : le Sprint d\'entraînement a enregistré un record');
        if (!gm.courseKept || !gm.ghostKept) problems.push('BR11 : un niveau d\'entraînement a touché le record de la Course ou du Fantôme');
        if (!gm.ghost.same) problems.push('BR11 : le texte du Fantôme change d\'une partie à l\'autre (le fantôme ne rejouerait pas la même course)');
        if (!gm.ghostLocal) problems.push('BR11 : le fantôme du niveau n\'est pas gardé sur l\'appareil');
        if (gm.course.bots !== '10/16/24') problems.push(`BR11 : bots de la Course au niveau d'entraînement (${gm.course.bots})`);
        if (gm.duo.bad || gm.duo.letters.length < 2) problems.push(`BR11 : le Duo propose des lettres inconnues (${gm.duo.letters})`);
        if (gm.grid3.suggest !== 5 || gm.grid3.mine !== 'SDFJKL') problems.push(`BR11 : Grille réflexe, élève en leçon 3 : « Mon niveau » devrait être conseillé avec F J D K S L (${JSON.stringify(gm.grid3)})`);
        if (gm.grid8.suggest === 5 || gm.grid8.cards !== 5 || gm.grid8.mine !== 'ERUIQSDFGHJKLM') problems.push(`BR11 : Grille réflexe, élève en leçon 8 (${JSON.stringify(gm.grid8)})`);
        if (!gm.gridMine.training || !gm.gridMine.kept || !gm.gridMine.noGold) problems.push(`BR11 : « Mon niveau » de la Grille réflexe a touché les records ou affiche une médaille (${JSON.stringify(gm.gridMine)})`);
        if (gm.gridNormal.tier !== 'bronze' || gm.gridNormal.top !== 200) problems.push(`BR11 : les niveaux d'origine de la Grille réflexe ont changé (${JSON.stringify(gm.gridNormal)})`);
        if (!gm.duelPicker) problems.push('BR11 : le sélecteur de niveau est absent du menu du Duel');
        if (gm.duelTrain.action !== 'duel-create' || !gm.duelTrain.has || gm.duelTrain.bad !== 0 || gm.duelTrain.n !== 12) problems.push(`BR11 : texte du Duel au niveau « Mon niveau » (${JSON.stringify(gm.duelTrain)})`);
        if (!gm.duelFull) problems.push('BR11 : au niveau « Tout le clavier », le Duel doit laisser le serveur choisir le texte');
        if (!gm.sprintFull.full) problems.push('BR11 : « Tout le clavier » n\'est plus l\'expérience complète');
        if (gm.azSgr !== A) problems.push(`BR11 : lettres de la Grille réflexe changées en AZERTY (${gm.azSgr})`);
        if (gm.azLanes !== 'qsdfjklm' || gm.azBack !== 'qsdfjklm') problems.push(`BR11 : couloirs de Magic Tiles changés en AZERTY (${gm.azLanes} / ${gm.azBack})`);
        if (gm.qwSgr !== 'ASDFGHJKL|QWERTYUIOP|ZXCVBNM|QWERTYUIOPASDFGHJKLZXCVBNM') problems.push(`BR11 : lettres de la Grille réflexe en QWERTY (${gm.qwSgr})`);
        if (gm.qwLanes !== 'asdfjkl;') problems.push(`BR11 : couloirs de Magic Tiles en QWERTY (${gm.qwLanes})`);
        if (!/ASDF JKL;/.test(gm.qwDesc) || !/WASD/.test(gm.qwSouris)) problems.push(`BR11 : descriptions des jeux en QWERTY (${gm.qwDesc} / ${gm.qwSouris})`);
        if (gm.relabel !== 'W A S D et WASD') problems.push(`BR11 : ZQSD non remplacé par WASD en QWERTY (${gm.relabel})`);
        exceptions.splice(0).forEach((e) => problems.push(`BR11 : exception : ${e}`));
        info.jeuxTous = 'ok';
      } catch (e) { problems.push(`BR11 : ${e.message}`); }

      // BR12 : langue du cours (anglais, bêta) : un compte testeur voit « Langue du cours », passe à l'anglais et revient ; un visiteur ne voit rien
      try {
        await ev("localStorage.clear();true");
        await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2500); exceptions.splice(0);
        const lg = await ev(`(async()=>{
          const out={};
          out.guestRow=!!document.querySelector('.kbc-langs');
          currentUser='testeur-en';currentToken='tok-testeur-en';currentUserId='uid';_statsLoaded=true;app.stats=mergeStats();_kpAccessFor=null;
          kpSetAllowed(['fr/qwerty','en/azerty','en/qwerty']);updateNavUser();
          document.getElementById('nav-kb-btn').click();await new Promise(r=>setTimeout(r,150));
          const m=document.getElementById('nav-kb-menu').getBoundingClientRect();
          out.row=[...document.querySelectorAll('#nav-kb-menu .kbc-lang-btn')].map(b=>b.innerText+(b.classList.contains('active')?'*':''));
          out.inFrame=m.left>=0&&m.right<=innerWidth;
          out.okEn=await kpChooseLanguage('en');
          out.en={course:kpCourseId(),lang:kpContentLang(),lessons:ALL_LESSONS.length,first:ALL_LESSONS[0].id+':'+ALL_LESSONS[0].keys,vocab:GAME_VOCAB.length,test:app.makeSession('test').text,badge:kpCourseBadgeHTML().includes('anglais')};
          out.enUi={t:kpT('typ.speed'),lang:document.documentElement.lang};
          app._skipModulesHub=false;app.sess=null;go('lessons');await new Promise(r=>setTimeout(r,400));
          out.enList=document.getElementById('page-lessons').innerText;
          app.sess=app.makeSession('lesson','r1');go('lessons');await new Promise(r=>setTimeout(r,400));
          out.enLesson=document.getElementById('page-lessons').innerText;app.sess=null;
          out.rowEn=[...document.querySelectorAll('#nav-kb-menu .kbc-lang-btn')].map(b=>b.innerText+(b.classList.contains('active')?'*':''));
          {const sym=ALL_LESSONS.find(l=>/(^| )[@#&$%]( |$)/.test(l.keys));out.tutoLessons=[ALL_LESSONS[0].id,sym&&sym.id];out.tutos=[];
            for(const id of out.tutoLessons){if(!id)continue;app.openLessonTuto(id);await new Promise(r=>setTimeout(r,150));out.tutos.push(document.getElementById('lesson-tuto-body').innerText);}
            closeModal('lesson-tuto-modal');}
          app.activeGame=null;go('games');await new Promise(r=>setTimeout(r,500));
          out.enGames=document.getElementById('page-games').innerText+' | '+[...document.querySelectorAll('#page-games [aria-label]')].map(e=>e.getAttribute('aria-label')).join(' / ');
          out.enNav=document.getElementById('main-nav').innerText;
          document.getElementById('nav-kb-btn').click();await new Promise(r=>setTimeout(r,150));out.enChip=document.getElementById('nav-kb-menu').innerText;document.getElementById('nav-kb-btn').click();
          go('stats');await new Promise(r=>setTimeout(r,500));out.enStats=document.getElementById('page-stats').innerText;
          out.enGameScreens={};
          for(const g of ['frappe','sprint','course','ghost','simon']){app.activeGame=g;app.game=null;app.sprint=null;app.course=null;app.ghost=null;app.simon=null;app.renderGames();await new Promise(r=>setTimeout(r,200));out.enGameScreens[g]=document.getElementById('page-games').innerText;}
          app.activeGame=null;
          out.okQ=await kpChooseFamily('qwerty');out.q={course:kpCourseId(),lessons:ALL_LESSONS.length};
          out.okFr=await kpChooseLanguage('fr');
          out.frUi={t:kpT('typ.speed'),lang:document.documentElement.lang};
          out.fr={course:kpCourseId(),lessons:ALL_LESSONS.length,vocab:GAME_VOCAB.length,testFr:!/^[a-z' ,.]*$/.test('x')&&app.makeSession('test').text.length>20};
          return out})()`);
        if (lg.guestRow) problems.push('BR12 : la langue du cours est proposée à un visiteur');
        if (lg.row.join('|') !== 'Français*|English') problems.push(`BR12 : choix de langue pour un testeur (${lg.row.join('|')})`);
        if (!lg.inFrame) problems.push('BR12 : le menu du clavier sort de l\'écran avec la ligne de langue');
        if (!lg.okEn || lg.en.course !== 'en/azerty' || lg.en.lang !== 'en' || lg.en.lessons !== 54 || lg.en.first !== 'r1:f j' || lg.en.vocab < 300 || !lg.en.badge) problems.push(`BR12 : passage à l'anglais (${JSON.stringify(lg.en)})`);
        if (/[éèêàùç]/.test(lg.en.test || '') || !/^[a-z ]+$/.test(lg.en.test || '')) problems.push(`BR12 : le texte de test d'un cours en anglais n'est pas de l'anglais (${(lg.en.test || '').slice(0, 60)})`);
        if (lg.enUi.t !== 'Speed' || lg.enUi.lang !== 'en') problems.push(`BR12 : l'interface ne suit pas le cours en anglais (${JSON.stringify(lg.enUi)})`);
        for (const w of ['Home row', 'Top row', 'The basics of touch typing', 'Speed goal']) if (!lg.enList.includes(w)) problems.push(`BR12 : « ${w} » absent de la liste des leçons d'un cours en anglais`);
        const frInEn = (txt, list) => list.filter((w) => txt.includes(w));
        const l1 = frInEn(lg.enList, ['Position de base', 'Rangée', 'La base de', 'Tous les modules', 'Objectif', 'leçons']); if (l1.length) problems.push(`BR12 : du français dans la liste des leçons en anglais : ${l1.join(', ')}`);
        if (/Choisis ton|module du jour|Mon enseignement/.test(lg.enList)) problems.push('BR12 : la page « Cours » française (programmes) s\'affiche pour un cours en anglais');
        for (const w of ['Speed', 'Accuracy', 'All courses']) if (!lg.enLesson.toLowerCase().includes(w.toLowerCase())) problems.push(`BR12 : « ${w} » absent de l'écran de leçon en anglais`);
        const l2 = frInEn(lg.enLesson.toLowerCase(), ['vitesse', 'précision', 'tous les cours', 'explication', 'commence à taper', 'objectif']); if (l2.length) problems.push(`BR12 : du français sur l'écran de leçon en anglais : ${l2.join(', ')}`);
        if (!lg.tutoLessons[1]) problems.push('BR12 : aucune leçon de symboles trouvée pour contrôler la fenêtre Explication');
        const tutoFr = ['Commencer la leçon', 'main gauche', 'main droite', 'pouce', 'auriculaire', 'annulaire', 'majeur', 'Sur ton clavier', 'touche ', 'Maj ', 'à droite du', 'à gauche du', 'sans Maj'];
        lg.tutos.forEach((txt, i) => { const bad = tutoFr.filter((w) => txt.includes(w)); if (bad.length) problems.push(`BR12 : du français dans la fenêtre Explication en anglais (${lg.tutoLessons[i]}) : ${bad.join(', ')}`); if (!txt.includes('Start the lesson')) problems.push(`BR12 : « Start the lesson » absent de la fenêtre Explication (${lg.tutoLessons[i]})`); });
        if (lg.tutos[1] && !/On your keyboard/.test(lg.tutos[1])) problems.push('BR12 : la fenêtre Explication d\'une leçon de symboles ne dit pas comment taper les touches (« On your keyboard »)');
        for (const w of ['Choose your game', 'Word Strike', 'Challenge of the week', 'Previous game']) if (!lg.enGames.toLowerCase().includes(w.toLowerCase())) problems.push(`BR12 : « ${w} » absent de la salle de jeux en anglais`);
        const g1 = ['Choisis ton jeu', 'Frappe-mots', 'Défi de la semaine', 'Jeu précédent', 'Fais défiler', 'Jouer maintenant', 'Précision souris', 'Mémoire'].filter((w) => lg.enGames.toLowerCase().includes(w.toLowerCase())); if (g1.length) problems.push(`BR12 : du français dans la salle de jeux en anglais : ${g1.join(', ')}`);
        for (const [g, words] of [['frappe', ['Words falling, fingers dancing.', 'Play', 'OR PRESS SPACE', 'Quit']], ['sprint', ['Start the Sprint', 'No going back', 'OR PRESS SPACE', 'Quit']], ['course', ['Typing Race', 'faster than the bots', 'Start the race', 'OR PRESS SPACE']], ['ghost', ['Race your ghost', 'Start the race', 'OR PRESS SPACE']], ['simon', ['Word Simon', 'Memorise a sequence', 'Play', 'OR PRESS SPACE']]]) {
          const txt = lg.enGameScreens[g] || '';
          for (const w of words) if (!txt.toLowerCase().includes(w.toLowerCase())) problems.push(`BR12 : « ${w} » absent de l'écran ${g} en anglais`);
          const bad = ['Mots qui tombent', 'Jouer', 'OU APPUIE', 'Quitter', 'Lancer le Sprint', 'retour arrière', 'Niveau', 'Meilleur', 'Entraînement', 'Course de dactylo', 'plus vite que', 'Lancer la course', 'fantôme', 'Simon des mots', 'Mémorise'].filter((w) => txt.toLowerCase().includes(w.toLowerCase()));
          if (bad.length) problems.push(`BR12 : du français sur l'écran ${g} en anglais : ${bad.join(', ')}`);
        }
        for (const w of ['Home', 'Test', 'Courses', 'Games', 'Progress', 'Log out']) if (!lg.enNav.toLowerCase().includes(w.toLowerCase())) problems.push(`BR12 : « ${w} » absent du menu en anglais`);
        const nv = ['Accueil', 'Cours', 'Jeux', 'Progrès', 'Déconnexion', 'Établissements', 'Test sur base'].filter((w) => new RegExp('(^|[^A-Za-zÀ-ÿ])' + w + '([^A-Za-zÀ-ÿ]|$)').test(lg.enNav)); if (nv.length) problems.push(`BR12 : du français dans le menu en anglais : ${nv.join(', ')}`);
        for (const w of ['Accents', 'Required', 'Tolerated', 'Course language', 'All settings']) if (!lg.enChip.includes(w)) problems.push(`BR12 : « ${w} » absent du menu du clavier en anglais`);
        const ch = ['Exigés', 'Tolérés', 'Disposition', 'Langue du cours', 'Tous les réglages', 'Famille'].filter((w) => lg.enChip.includes(w)); if (ch.length) problems.push(`BR12 : du français dans le menu du clavier en anglais : ${ch.join(', ')}`);
        for (const w of ['Your speed', 'Your records', 'Take a test', 'Best speed', 'Average accuracy', 'Lessons passed', 'Word Strike']) if (!lg.enStats.toLowerCase().includes(w.toLowerCase())) problems.push(`BR12 : « ${w} » absent de la page Progrès en anglais`);
        const ps = ['Ta vitesse', 'Tes records', 'Faire un test', 'Meilleure vitesse', 'Précision moyenne', 'Leçons validées', 'Frappe-mots', 'certificat', 'Certification', 'Série', 'Aucun test'].filter((w) => lg.enStats.toLowerCase().includes(w.toLowerCase())); if (ps.length) problems.push(`BR12 : du français sur la page Progrès en anglais : ${ps.join(', ')}`);
        if (lg.frUi.t !== 'Vitesse' || lg.frUi.lang !== 'fr') problems.push(`BR12 : retour au français, l'interface reste en anglais (${JSON.stringify(lg.frUi)})`);
        if (lg.rowEn.join('|') !== 'Français|English*') problems.push(`BR12 : langue active après le passage (${lg.rowEn.join('|')})`);
        if (!lg.okQ || lg.q.course !== 'en/qwerty' || lg.q.lessons !== 58) problems.push(`BR12 : en anglais, passer à QWERTY garde la langue (${JSON.stringify(lg.q)})`);
        if (!lg.okFr || lg.fr.course !== 'fr/qwerty' || lg.fr.lessons !== 68 || lg.fr.vocab < 400) problems.push(`BR12 : retour au français (${JSON.stringify(lg.fr)})`);
        exceptions.splice(0).forEach((e) => problems.push(`BR12 : exception : ${e}`));
        info.langues = 'ok';
      } catch (e) { problems.push(`BR12 : ${e.message}`); }

      // BR13 : interface en anglais (bêta, ?ui=en) : l'écran Test passe en anglais sans reste de français, se retient, et ?ui=fr ramène le français
      try {
        const readTest = `(async()=>{app._challenge={name:'Ana',wpm:40,acc:95};go('test');await new Promise(r=>setTimeout(r,400));const el=document.getElementById('page-test');return{lang:document.documentElement.lang,ui:localStorage.getItem('kp_ui'),text:el?el.innerText:'',btns:[...document.querySelectorAll('#page-test button')].map(b=>b.innerText.trim())}})()`;
        await ev("localStorage.clear();true");
        await S('Page.navigate', { url: `http://127.0.0.1:${port}/?ui=en` }); await sleep(2500); exceptions.splice(0);
        const en = await ev(readTest);
        const frLeft = ['Tape la phrase', 'ta vitesse', 'Recommencer', 'Autre texte', 'PRÉCISION', 'VITESSE', 'PROGRESSION', 'Commence à taper', 'Règle l', 'Espaces visibles', 'Lecture facile', 'caractères', 'mots / min', 'te défie', 'Son score', 'Après le test', 'Créer mon compte'].filter((w) => en.text.toLowerCase().includes(w.toLowerCase()));
        if (en.lang !== 'en' || en.ui !== 'en') problems.push(`BR13 : langue de l'interface non prise en compte (${en.lang}/${en.ui})`);
        for (const w of ['Type the sentence', 'your speed.', 'ACCURACY', 'SPEED', 'PROGRESS', 'words / min', 'Show spaces:', 'Restart', 'Another text', 'Ana is challenging you!', 'Their score:', 'After the test', 'Create my free account']) if (!en.text.toLowerCase().includes(w.toLowerCase()) && !en.btns.some((b) => b.toLowerCase().includes(w.toLowerCase()))) problems.push(`BR13 : « ${w} » absent de l'écran Test en anglais`);
        if (frLeft.length) problems.push(`BR13 : du français reste sur l'écran Test en anglais : ${frLeft.join(', ')}`);
        if (/\{\w+\}|test\.[a-z_]+/.test(en.text)) problems.push('BR13 : une clé ou un paramètre non remplacé est visible');
        await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2500); exceptions.splice(0);
        const keep = await ev(readTest); // sans ?ui : la langue est retenue
        if (keep.lang !== 'en' || !keep.text.includes('Type the sentence')) problems.push('BR13 : la langue de l\'interface n\'est pas retenue au rechargement');
        await S('Page.navigate', { url: `http://127.0.0.1:${port}/?ui=fr` }); await sleep(2500); exceptions.splice(0);
        const fr = await ev(readTest);
        if (fr.lang !== 'fr' || !fr.text.includes('Tape la phrase') || !fr.text.includes('Ana te défie') || !fr.text.toLowerCase().includes('après le test') || !fr.btns.includes('Recommencer') || /Type the sentence|ACCURACY/.test(fr.text)) problems.push('BR13 : ?ui=fr ne ramène pas le français');
        exceptions.splice(0).forEach((e) => problems.push(`BR13 : exception : ${e}`));
        info.interfaceEn = 'ok';
      } catch (e) { problems.push(`BR13 : ${e.message}`); }

      // BR8 : la pastille « clavier » de l'en-tête (visiteur puis compte testeur)
      try {
        const shot = async (name) => { if (!opts.screenshotDir) return; const sh = await S('Page.captureScreenshot', { format: 'png' }); fs.mkdirSync(opts.screenshotDir, { recursive: true }); fs.writeFileSync(path.join(opts.screenshotDir, name), Buffer.from(sh.data, 'base64')); };
        const menuHidden = () => ev("document.getElementById('nav-kb-menu').hidden");
        for (const w of [1280, 1100, 1000, 900, 800, 770]) {
          await S('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
          await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(1500);
          await ev("localStorage.clear();true"); // on efface la session AVANT de recharger : sinon la page redémarre avec le compte du test précédent
          await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2200); exceptions.splice(0);
          const g1 = await ev(`(()=>{const b=document.getElementById('nav-kb-btn');if(!b)return null;const r=b.getBoundingClientRect(),f=document.getElementById('nav-region-btn').getBoundingClientRect(),
            gu=document.getElementById('nav-guest').getBoundingClientRect(),nav=document.querySelector('.nav-links').getBoundingClientRect();
            return{text:document.getElementById('nav-kb-text').textContent,w:r.width,h:r.height,left:r.left,right:r.right,flagRight:f.right,guestLeft:gu.left,linksRight:nav.right,gear:!!document.querySelector('.nav-guest-settings'),overflow:document.documentElement.scrollWidth-window.innerWidth,signupH:Math.round(document.querySelector('.nav-signup-btn').getBoundingClientRect().height)}})()`);
          if (!g1) { problems.push(`BR8 (${w}) : pastille clavier absente`); continue; }
          if (g1.text !== 'AZERTY · Français') problems.push(`BR8 (${w}) : texte « ${g1.text} » au lieu de « AZERTY · Français »`);
          if (!g1.w || !g1.h) problems.push(`BR8 (${w}) : pastille invisible`);
          if (g1.gear) problems.push(`BR8 (${w}) : l'engrenage des visiteurs est encore là`);
          if (g1.left < g1.flagRight - 1) problems.push(`BR8 (${w}) : la pastille chevauche le drapeau`);
          if (g1.right > g1.guestLeft + 1) problems.push(`BR8 (${w}) : la pastille chevauche les boutons de connexion`);
          if (g1.left < g1.linksRight - 1) problems.push(`BR8 (${w}) : la pastille chevauche le menu`);
          if (g1.overflow > 0) problems.push(`BR8 (${w}) : l'en-tête fait défiler la page horizontalement (${g1.overflow} px)`);
          if (g1.signupH > 42) problems.push(`BR8 (${w}) : « Créer un compte » passe sur plusieurs lignes`);
          if (w === 1280) {
            if (!(await menuHidden())) problems.push('BR8 : menu ouvert au chargement');
            await ev("document.getElementById('nav-kb-btn').click();true"); await sleep(150);
            const m = await ev(`(()=>{const m=document.getElementById('nav-kb-menu'),r=m.getBoundingClientRect();return{hidden:m.hidden,variants:[...m.querySelectorAll('.kb-layout-btn')].map(b=>b.innerText),cards:m.querySelectorAll('.kb-family-card').length,acc:m.querySelectorAll('.kbc-variants')[1]&&m.querySelectorAll('.kbc-variants')[1].querySelectorAll('button').length,all:/Tous les réglages/.test(m.innerText),left:r.left,right:r.right,expanded:document.getElementById('nav-kb-btn').getAttribute('aria-expanded')}})()`);
            if (m.hidden || m.expanded !== 'true') problems.push('BR8 : le clic n\'ouvre pas le menu du clavier');
            if (m.variants.length !== 4) problems.push(`BR8 : ${m.variants.length} variantes AZERTY au lieu de 4 (${m.variants})`);
            if (m.cards !== 0) problems.push('BR8 : cartes de famille visibles alors que seul l\'AZERTY est proposé');
            if (m.acc !== 2) problems.push('BR8 : réglage des accents absent du menu');
            if (m.all) problems.push('BR8 : « Tous les réglages » proposé à un visiteur');
            if (m.left < 0 || m.right > w) problems.push('BR8 : le menu déborde de l\'écran');
            await shot('pastille-clavier-visiteur.png');
            await ev("[...document.querySelectorAll('#nav-kb-menu .kb-layout-btn')].find(b=>b.dataset.kbLayout==='be').click();true"); await sleep(150);
            const be = await ev("({text:document.getElementById('nav-kb-text').textContent,stored:localStorage.getItem('kp_kb_layout'),hidden:document.getElementById('nav-kb-menu').hidden,focusOnMenu:!!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#nav-kb-menu'))})");
            if (be.text !== 'AZERTY · Belge' || be.stored !== 'be') problems.push(`BR8 : choisir Belge ne met pas à jour la pastille (${be.text} / ${be.stored})`);
            await ev("[...document.querySelectorAll('#nav-kb-menu .kbc-variants')[1].querySelectorAll('button')][1].click();true"); await sleep(100);
            if ((await ev("localStorage.getItem('kp_accents')")) !== 'tolerant') problems.push('BR8 : « Tolérés » du menu ne change pas le réglage des accents');
            await ev("document.querySelectorAll('#nav-kb-menu .kbc-variants')[1].querySelectorAll('button')[0].click();true"); await sleep(100);
            if ((await ev("localStorage.getItem('kp_accents')")) !== 'exact') problems.push('BR8 : « Exigés » du menu ne rétablit pas le réglage des accents');
            // Échap ferme ; ouvrir le drapeau ferme la pastille et réciproquement ; la barre d'espace ne rouvre rien
            await S('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await S('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(100);
            if (!(await menuHidden())) problems.push('BR8 : Échap ne ferme pas le menu du clavier');
            await ev("document.getElementById('nav-kb-btn').click();true"); await sleep(80);
            await ev("document.getElementById('nav-region-btn').click();true"); await sleep(80);
            if (!(await menuHidden())) problems.push('BR8 : ouvrir le drapeau ne ferme pas le menu du clavier');
            await ev("document.getElementById('nav-kb-btn').click();true"); await sleep(80);
            if (!(await ev("document.getElementById('nav-region-menu').hidden"))) problems.push('BR8 : ouvrir le clavier ne ferme pas le menu du drapeau');
            await ev("document.querySelector('.nav-links').click();true"); await sleep(80);
            if (!(await menuHidden())) problems.push('BR8 : un clic à côté ne ferme pas le menu du clavier');
            await S('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', text: ' ', windowsVirtualKeyCode: 32 }); await S('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 }); await sleep(100);
            if (!(await menuHidden())) problems.push('BR8 : la barre d\'espace rouvre le menu du clavier');
          }
          exceptions.splice(0).forEach((e) => problems.push(`BR8 (${w}) : exception : ${e}`));
        }
        await S('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        // compte testeur : les cartes sont dans la pastille, on passe au QWERTY par elle, « Tous les réglages » apparaît
        await S('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await sleep(2200); exceptions.splice(0);
        await ev("localStorage.clear();currentUser='testeur';currentToken='tok-testeur';currentUserId='uid';_statsLoaded=true;app.stats=mergeStats();_kpAccessFor=null;updateNavUser();true"); await sleep(700);
        await ev("document.getElementById('nav-kb-btn').click();true"); await sleep(150);
        const t = await ev("({cards:document.querySelectorAll('#nav-kb-menu .kb-family-card').length,all:/Tous les réglages/.test(document.getElementById('nav-kb-menu').innerText)})");
        if (t.cards !== 2) problems.push(`BR8 : ${t.cards} cartes dans la pastille d'un compte testeur au lieu de 2`);
        if (!t.all) problems.push('BR8 : « Tous les réglages » absent pour un compte connecté');
        // les deux cartes AZERTY / QWERTY restent DANS le cadre du menu (elles en sortaient de quelques pixels)
        const fit = await ev("(()=>{const m=document.getElementById('nav-kb-menu').getBoundingClientRect();return [...document.querySelectorAll('#nav-kb-menu .kb-family-card')].map(c=>{const r=c.getBoundingClientRect();return{out:Math.round(Math.max(m.left-r.left,r.right-m.right,0)),clip:c.scrollWidth-c.clientWidth}})})()");
        if (fit.some((c) => c.out > 0)) problems.push(`BR8 : une carte de famille sort du cadre du menu du clavier (${fit.map((c) => c.out).join(' / ')} px)`);
        if (fit.some((c) => c.clip > 0)) problems.push(`BR8 : les touches d'une carte de famille débordent de la carte (${fit.map((c) => c.clip).join(' / ')} px)`);
        await ev("document.querySelectorAll('#nav-kb-menu .kb-family-card')[1].click();true"); await sleep(150);
        await ev("document.getElementById('kb-sw-yes').click();true"); await sleep(1200);
        const qq = await ev("({text:document.getElementById('nav-kb-text').textContent,variants:document.querySelectorAll('#nav-kb-menu .kb-layout-btn').length,course:kpCourseId()})");
        if (qq.text !== 'QWERTY · US intl' || qq.course !== 'fr/qwerty') problems.push(`BR8 : après le passage au QWERTY, pastille « ${qq.text} », cours ${qq.course}`);
        await ev("document.getElementById('nav-kb-btn').click();true"); await sleep(150);
        const q2 = await ev("({variants:[...document.querySelectorAll('#nav-kb-menu .kb-layout-btn')].map(b=>b.innerText).length})");
        if (q2.variants !== 8) problems.push(`BR8 : ${q2.variants} variantes QWERTY dans la pastille au lieu de 8`);
        const onPage = await ev("(()=>{const k=document.querySelector(\".t4a-key[data-l='1'],.kb-key-t[data-l='1']\");return k?(k.getAttribute('data-s')||'(sans signe Maj)'):null})()");
        if (onPage === null) problems.push('BR8 : la touche 1 du clavier de la page de frappe est introuvable');
        else if (onPage !== '!') problems.push(`BR8 : le clavier de la page garde les symboles AZERTY après le passage au QWERTY (signe Maj de la touche 1 : « ${onPage} » au lieu de « ! »)`);
        const intro = await ev("(()=>{app._showIntro=true;app.renderView('lessons');const t=document.getElementById('page-lessons').innerText;app._showIntro=false;return t})()");
        if (!/A·S·D·F/.test(intro) || /Q·S·D·F/.test(intro)) problems.push('BR8 : l\'écran d\'introduction cite encore la position de repos AZERTY (Q·S·D·F) en cours QWERTY');
        await ev("app.renderView('test');true");
        const badge = await ev("(()=>{app._skipModulesHub=true;app.sess=null;app._showIntro=false;go('lessons');const t=document.getElementById('page-lessons').innerText;const ok={badge:/Cours QWERTY \\(bêta\\)/.test(t),r4:/A et point-virgule/.test(t),azerty:/Q et M/.test(t)};app._skipModulesHub=false;return ok})()");
        if (!badge.badge) problems.push('BR8 : la page des leçons n\'affiche pas « Cours QWERTY (bêta) » en cours QWERTY');
        if (!badge.r4 || badge.azerty) problems.push(`BR8 : la liste des leçons du cours QWERTY n'est pas celle du QWERTY (A et point-virgule : ${badge.r4}, Q et M : ${badge.azerty})`);
        await shot('pastille-clavier-qwerty.png');
        await ev("[...document.querySelectorAll('#nav-kb-menu .kb-layout-btn')].find(b=>b.dataset.kbLayout==='mac-us').click();true"); await sleep(150);
        if ((await ev("document.getElementById('nav-kb-text').textContent")) !== 'QWERTY · Mac US') problems.push('BR8 : choisir Mac US ne met pas à jour la pastille');
        await ev("[...document.querySelectorAll('#nav-kb-menu .nav-region-item')].find(b=>/Tous les réglages/.test(b.innerText)).click();true"); await sleep(900);
        if (!(await ev("!!document.getElementById('settings-overlay')"))) problems.push('BR8 : « Tous les réglages » n\'ouvre pas les réglages');
        // bandeau de détection : un QWERTY tapé sur le site AZERTY, pour un compte qui a accès au QWERTY, propose de choisir son clavier
        await ev("localStorage.setItem('kp_course','fr/azerty');kpChooseFamily('azerty');true"); await sleep(800);
        await ev("[['KeyQ','q'],['KeyW','w'],['KeyA','a']].forEach(([c,k])=>kpKbSample({code:c,key:k,altKey:false,ctrlKey:false,metaKey:false}));true"); await sleep(150);
        const ban = await ev("(()=>{const b=document.getElementById('kp-kb-suggest');return b?b.innerText:null})()");
        if (!ban || !/QWERTY/.test(ban)) problems.push(`BR8 : le bandeau de détection n'apparaît pas pour un QWERTY tapé (${ban})`);
        else {
          await ev("document.getElementById('kp-kbs-yes').click();true"); await sleep(900);
          if (!(await ev("!!document.getElementById('settings-overlay')"))) problems.push('BR8 : « Choisir mon clavier » du bandeau n\'ouvre pas les réglages');
          await ev("app.closeSettings();true");
        }
        // en-tête d'un compte connecté (plus chargé : badge, nom, avatar, « Passer Expert », « Déconnexion »)
        await ev("document.getElementById('settings-overlay')&&app.closeSettings();true");
        for (const w of [1280, 1100, 1000, 900, 800, 770]) {
          await S('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(300);
          const lg = await ev(`(()=>{const q=s=>document.querySelector(s);const r=x=>x?Math.round(x.getBoundingClientRect().height):0;const lo=q('.nav-logout'),up=q('#nav-upgrade-btn');
            return{overflow:document.documentElement.scrollWidth-window.innerWidth,logoutH:r(lo),upH:up&&getComputedStyle(up).display!=='none'?r(up):0,logoutRight:lo?Math.round(lo.getBoundingClientRect().right):0,kb:document.getElementById('nav-kb-btn').getBoundingClientRect().width>0}})()`);
          if (lg.overflow > 0) problems.push(`BR8 connecté (${w}) : l'en-tête fait défiler la page horizontalement (${lg.overflow} px)`);
          if (lg.upH > 42) problems.push(`BR8 connecté (${w}) : « Passer Expert » passe sur plusieurs lignes`);
          if (!lg.kb) problems.push(`BR8 connecté (${w}) : pastille clavier invisible`);
        }
        await S('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        exceptions.splice(0).forEach((e) => problems.push(`BR8 : exception : ${e}`));
        info.chip = 'ok';
      } catch (e) { problems.push(`BR8 : ${e.message}`); }
    }
  } catch (e) { problems.push(`navigateur : ${e.message}`); }
  finally { if (b) b.close(); server.close(); }
  return { problems, info };
}
module.exports = { run, launch, serve, sleep };

if (require.main === module) run({ screenshotDir: process.argv[2] }).then((r) => { console.log(JSON.stringify({ problems: r.problems, views: r.info.views, configs: r.info.configs, shot: r.info.shotBytes }, null, 1)); process.exit(r.problems.length ? 1 : 0); });
