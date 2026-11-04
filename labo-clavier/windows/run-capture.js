// Pilote la page de capture avec de vraies frappes du système et compare le résultat au modèle de disposition.
// Usage : node labo-clavier/windows/run-capture.js --model windows-us-intl --os Windows --layout "US International" --inject windows|cdp [--out traces-out]
//  --inject windows : vraies frappes via inject-windows.ps1 (Chrome avec fenêtre, sur une machine Windows) ;
//  --inject cdp     : mode d'essai : frappes simulées par Chrome (teste le pilotage, pas le système).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { launch, serve, sleep } = require('../../scripts/browser-gates');
const { gestureFor } = require('../../scripts/gesture');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const MODEL = arg('--model', 'windows-us-intl'), OS = arg('--os', 'Windows'), LAYOUT = arg('--layout', 'US International'), INJECT = arg('--inject', 'cdp'), OUT = arg('--out', 'traces-out');
// Codes de balayage (jeu 1) des touches de l'ISO
const SC = { Backquote: 0x29, Digit1: 2, Digit2: 3, Digit3: 4, Digit4: 5, Digit5: 6, Digit6: 7, Digit7: 8, Digit8: 9, Digit9: 10, Digit0: 11, Minus: 12, Equal: 13, KeyQ: 0x10, KeyW: 0x11, KeyE: 0x12, KeyR: 0x13, KeyT: 0x14, KeyY: 0x15, KeyU: 0x16, KeyI: 0x17, KeyO: 0x18, KeyP: 0x19, BracketLeft: 0x1A, BracketRight: 0x1B, KeyA: 0x1E, KeyS: 0x1F, KeyD: 0x20, KeyF: 0x21, KeyG: 0x22, KeyH: 0x23, KeyJ: 0x24, KeyK: 0x25, KeyL: 0x26, Semicolon: 0x27, Quote: 0x28, Backslash: 0x2B, IntlBackslash: 0x56, KeyZ: 0x2C, KeyX: 0x2D, KeyC: 0x2E, KeyV: 0x2F, KeyB: 0x30, KeyN: 0x31, KeyM: 0x32, Comma: 0x33, Period: 0x34, Slash: 0x35, Space: 0x39 };

async function main() {
  const def = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'layouts-src', MODEL + '.json'), 'utf8'));
  const { server, port } = await serve();
  const b = await launch({ headed: INJECT === 'windows' });
  const report = { model: MODEL, os: OS, layout: LAYOUT, inject: INJECT, steps: [] };
  try {
    const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
    const S = (m, p) => b.send(m, p, sessionId);
    b.on((m) => { if (m.sessionId === sessionId && m.method === 'Page.javascriptDialogOpening') S('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    await S('Page.enable'); await S('Runtime.enable');
    await S('Page.navigate', { url: `http://127.0.0.1:${port}/labo-clavier/capture.html` }); await sleep(1000);
    const ev = async (e) => { const r = await S('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
    report.systemLayoutMap = await ev("navigator.keyboard&&navigator.keyboard.getLayoutMap?navigator.keyboard.getLayoutMap().then(m=>Object.fromEntries(['KeyQ','KeyA','KeyZ','KeyW','KeyM','Semicolon','Quote','Digit2','Backquote','IntlBackslash','Backslash'].map(k=>[k,m.get(k)||null]))):null");
    await ev(`window.__blob=null;URL.createObjectURL=b=>{window.__blob=b;return 'blob:x'};HTMLAnchorElement.prototype.click=function(){};(()=>{for(const [id,v] of [['os',${JSON.stringify(OS)}],['layout',${JSON.stringify(LAYOUT)}],['caps',${JSON.stringify('none')}]]){const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('change'))};document.getElementById('device').value='pilotage automatique (${INJECT})';document.getElementById('start').click();return true})()`);
    await sleep(500);
    for (let n = 0; n < 60; n++) {
      const target = await ev("document.getElementById('run').hidden?'':document.getElementById('target').textContent"); if (!target) break;
      await ev("document.getElementById('field').focus();true");
      const plan = []; let impossible = false;
      for (const ch of [...target]) { const g = gestureFor(def, ch); if (!g) { impossible = true; break; } plan.push(...g); }
      if (!impossible) {
        if (INJECT === 'windows') {
          const steps = plan.map((p) => ({ sc: SC[p.code], ext: false, shift: !!p.shift, alt: !!p.alt }));
          const r = spawnSync('pwsh', ['-NoProfile', '-File', path.join(__dirname, 'inject-windows.ps1'), '-Json', JSON.stringify(steps)], { encoding: 'utf8' });
          if (r.status !== 0) throw new Error('injection : ' + (r.stderr || r.stdout));
        } else {
          for (const ch of [...target]) { await S('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch, unmodifiedText: ch, code: '' }); await S('Input.dispatchKeyEvent', { type: 'keyUp', key: ch, code: '' }); }
        }
        await sleep(250);
      }
      const produced = await ev("document.getElementById('field').value");
      report.steps.push({ target, gesture: impossible ? null : plan, produced, agrees: !impossible && produced === target, modelSaysImpossible: impossible });
      await ev(impossible || !produced ? "document.getElementById('impossible').click();true" : "document.getElementById('next').click();true");
      await sleep(80);
    }
    const out = await ev("document.getElementById('done').hidden?null:(document.getElementById('download').click(),window.__blob.text())");
    fs.mkdirSync(OUT, { recursive: true });
    if (out) fs.writeFileSync(path.join(OUT, `trace-${MODEL}.json`), out);
  } finally { b.close(); server.close(); }
  const bad = report.steps.filter((s) => !s.agrees && !s.modelSaysImpossible);
  report.summary = { total: report.steps.length, agree: report.steps.filter((s) => s.agrees).length, disagree: bad.map((s) => ({ target: s.target, produced: s.produced })), modelImpossible: report.steps.filter((s) => s.modelSaysImpossible).map((s) => s.target) };
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, `rapport-${MODEL}.json`), JSON.stringify(report, null, 1));
  console.log(`${MODEL} (${INJECT}) : ${report.summary.agree}/${report.summary.total} caractères conformes au modèle ; désaccords : ${bad.length}${bad.length ? ' ' + bad.map((s) => `${s.target}→« ${s.produced} »`).join(' ') : ''} ; impossibles selon le modèle : ${report.summary.modelImpossible.join(' ') || 'aucun'}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error('ERREUR', e.message); process.exit(2); });
