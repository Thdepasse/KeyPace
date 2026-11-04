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
    }
  } catch (e) { problems.push(`navigateur : ${e.message}`); }
  finally { if (b) b.close(); server.close(); }
  return { problems, info };
}
module.exports = { run, launch, serve, sleep };

if (require.main === module) run({ screenshotDir: process.argv[2] }).then((r) => { console.log(JSON.stringify({ problems: r.problems, views: r.info.views, configs: r.info.configs, shot: r.info.shotBytes }, null, 1)); process.exit(r.problems.length ? 1 : 0); });
