/**
 * E2E : pilote un Chrome headless sur jeu.html (joueur humain simulé, vitesse
 * légale) + ecran.html (spectateur), pendant que test/bots.ts fournit les
 * adversaires. Captures dans /tmp/kp-e2e-*.png.
 *
 * Usage : npx tsx test/e2e.ts <roomCode>
 */
import puppeteer, { Page } from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOM = process.argv[2];
if (!ROOM) { console.error('Usage: npx tsx test/e2e.ts <roomCode>'); process.exit(1); }
const BASE = 'http://localhost:8080';
const SERVER = encodeURIComponent('http://localhost:3001');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const results: string[] = [];
const errors: string[] = [];

function watchErrors(page: Page, tag: string) {
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${tag}] console: ${m.text()}`); });
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    timeout: 90_000, // le premier démarrage headless peut être lent
    args: ['--no-first-run', '--disable-gpu', '--hide-crash-restore-bubble'],
  });
  const player = await browser.newPage();
  await player.setViewport({ width: 1280, height: 800 });
  watchErrors(player, 'jeu');

  // ── Joueur : rejoint le salon ──
  await player.goto(`${BASE}/jeu.html?room=${ROOM}&server=${SERVER}`);
  await player.type('#nameInput', 'Théo');
  await player.click('#btnJoin');
  await player.waitForSelector('#s-lobby.on', { timeout: 8_000 });
  const code = await player.$eval('#lobbyCode', (el) => el.textContent);
  results.push(`✓ lobby affiché, code ${code}`);
  await player.screenshot({ path: '/tmp/kp-e2e-1-lobby.png' });

  // ── Écran géant : spectateur ──
  const screen = await browser.newPage();
  await screen.setViewport({ width: 1440, height: 810 });
  watchErrors(screen, 'ecran');
  await screen.goto(`${BASE}/ecran.html?room=${ROOM}&server=${SERVER}`);
  await screen.waitForSelector('#s-wait.on', { timeout: 8_000 });
  results.push('✓ écran géant en attente des joueurs');

  // ── Compte à rebours puis course (les bots lancent 8s après le join) ──
  await player.waitForSelector('#s-count.on', { timeout: 20_000 });
  results.push('✓ compte à rebours affiché (joueur)');
  await player.waitForSelector('#s-race.on', { timeout: 10_000 });
  await screen.waitForSelector('#s-race.on', { timeout: 10_000 });
  results.push('✓ course démarrée sur les deux pages');

  // ── Le joueur tape à ~210 WPM (légal, sous le plafond de 250) ──
  let midShotDone = false;
  const raceStart = Date.now();
  while (Date.now() - raceStart < 90_000) {
    const st = await player.evaluate(() => ({
      end: document.getElementById('s-end')!.classList.contains('on'),
      over: (document.getElementById('typeInput') as HTMLInputElement).disabled,
      cur: document.querySelector('.textbox .cur')?.textContent ?? null,
    }));
    if (st.end) break;
    if (!midShotDone && Date.now() - raceStart > 4_000) {
      midShotDone = true;
      await player.screenshot({ path: '/tmp/kp-e2e-2-course-joueur.png' });
      await screen.screenshot({ path: '/tmp/kp-e2e-3-course-ecran.png' });
      results.push('✓ captures mi-course prises');
    }
    if (st.over || !st.cur) { await sleep(250); continue; }
    await player.type('#typeInput', st.cur + ' ', { delay: 45 });
  }

  // ── Fin de partie ──
  await player.waitForSelector('#s-end.on', { timeout: 30_000 });
  await screen.waitForSelector('#s-end.on', { timeout: 10_000 });
  const endTitle = await player.$eval('#endTitle', (el) => el.textContent);
  const podium = await screen.$eval('#podium', (el) =>
    Array.from(el.querySelectorAll('.step .nm')).map((n) => n.textContent).join(' | '));
  results.push(`✓ fin de partie — joueur : « ${endTitle} », podium écran : ${podium}`);
  await sleep(900); // fin de l'animation du podium
  await player.screenshot({ path: '/tmp/kp-e2e-4-fin-joueur.png' });
  await screen.screenshot({ path: '/tmp/kp-e2e-5-fin-ecran.png' });

  const rejected = await player.evaluate(() =>
    document.getElementById('raceMsg')!.textContent!.includes('resynchronisée'));
  if (!rejected) results.push('✓ aucun rejet anti-triche pour le joueur légal');
  else results.push('✗ ÉCHEC : le joueur légal a été resynchronisé par l\'anti-triche');

  await browser.close();
  const realErrors = errors.filter((e) => !e.includes('favicon'));
  if (realErrors.length) results.push('✗ Erreurs JS : ' + realErrors.join(' ; '));
  console.log(results.join('\n'));
  process.exit(results.some((r) => r.startsWith('✗')) ? 1 : 0);
}

main().catch((e) => { console.error('✗ ÉCHEC E2E :', e.message); process.exit(1); });
