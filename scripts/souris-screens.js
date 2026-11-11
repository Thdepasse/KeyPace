// Scénario navigateur partagé : fait afficher les écrans de Précision souris et de ses variantes (Grille réflexe, Duo, Magic Tiles)
// avec des états simulés, sans lancer de boucle de jeu ni écrire dans la progression, puis renvoie le texte de chaque écran.
// Utilisé par la sous-gate BR12 de scripts/browser-gates.js (vérifie qu'aucun mot français ne reste en anglais).
// Source JavaScript d'une fonction asynchrone exécutée dans la page (via Runtime.evaluate) : le résultat est { nom: { t: texte, h: HTML sans style } }.
module.exports = `(async()=>{
const out={};const W=ms=>new Promise(r=>setTimeout(r,ms));
const _rand=Math.random;let seed=12345;const seeded=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const Q=(arr)=>{let i=0;return()=>i<arr.length?arr[i++]:0.5;};
Math.random=seeded;
const st0=JSON.stringify([app.stats.sourisBest,app.stats.sourisTiers,app.stats.sourisHybridHand,app.stats.sourisTilesBest,app.stats.sourisTilesTutorialSeen,app.stats.sourisGridBest,app.stats.sourisGridTop]);
const attrs=(el)=>[...el.querySelectorAll('[aria-label],[title]')].map(e=>(e.getAttribute('aria-label')||'')+'|'+(e.getAttribute('title')||'')).join(' / ');
const snap=(name,el)=>{out[name]=el?{t:el.innerText+' || '+attrs(el),h:el.innerHTML.replace(/ style="[^"]*"/g,'')}:{t:'(absent)',h:'(absent)'};};
const page=()=>document.getElementById('page-games'),sfs=()=>document.getElementById('sfs'),sgr=()=>document.getElementById('sgr');
const done=()=>{try{app._sfsClose(true);app._sgrClose(true);}catch(e){}try{app.stopSouris();}catch(e){}app.souris=null;};
try{
go('games');await W(150);
// ── Précision souris : menu, règles des 12 niveaux, parties, pause, fin ──
app.stats.sourisBest=5;app.stats.sourisTiers={1:'gold',2:'silver',3:'bronze',4:'bronze',5:'bronze'};
app.activeGame='souris';app.souris={phase:'mouseMenu'};app.renderGames();await W(60);snap('menu',page());
app.stats.sourisBest=12;app.stats.sourisTiers={};for(let i=1;i<=12;i++)app.stats.sourisTiers[i]='gold';app.renderGames();snap('menuDone',page());
app.stats.sourisBest=0;app.stats.sourisTiers={};app.renderGames();snap('menuNew',page());
for(let n=1;n<=12;n++){app.souris={phase:'brief',track:'mouse',lvl:n,score:0,lives:3,hit:0,miss:0,t0:0};app.renderGames();snap('brief'+n,sfs());}
const play=(n)=>{done();app.souris={phase:'brief',track:'mouse',lvl:n,score:0,lives:3,hit:0,miss:0,t0:0};app.renderGames();app._sfsReset();const s=app.souris;s.phase='play';s.fresh=false;app._sfsRender();app._sfsRefreshGeo();return s;};
let s,g,t;
s=play(2);g=app._sfsG();s.targets=[{id:1,x:50,y:50,r:5,born:0,life:4000,hover:0}];app._sfsPaint();s.px=g.W/2;s.py=g.H/2;app._sfsClick();s.targets=[{id:2,x:30,y:30,r:5,born:0,life:10,hover:0}];app._sfsTick();app._sfsTick();s.px=5;s.py=5;app._sfsClick();snap('p2',sfs());
s=play(3);g=app._sfsG();s.lives=2;s.streak=4;s.targets=[{id:1,x:50,y:50,r:5,born:0,life:4000,hover:0}];s.px=g.W/2;s.py=g.H/2;app._sfsClick();app._sfsPaint();snap('p3',sfs());
s=play(5);g=app._sfsG();for(let i=0;i<6;i++)app._sfsSpawn();app._sfsPaint();snap('p5spawn',sfs());s.targets=[{id:90,x:50,y:50,r:5,bad:true,born:s.clock,life:4000,hover:0}];s.px=g.W/2;s.py=g.H/2;app._sfsClick();snap('p5trap',sfs());
s=play(6);g=app._sfsG();
for(const q of [[0.01,0.1],[0.01,0.5],[0.01,0.9]]){s.targets=[];Math.random=Q(q);app._sfsSpawn();Math.random=seeded;app._sfsPaint();snap('p6tag'+q[1],sfs());t=s.targets[0];s.px=t.x/100*g.W;s.py=t.y/100*g.H;app._sfsClick();snap('p6fx'+q[1],sfs());}
app._sfsPaint();snap('p6mult',sfs());
s=play(1);g=app._sfsG();Math.random=Q([0.01]);app._sfsSpawn();Math.random=seeded;app._sfsPaint();snap('p1bonusTag',sfs());t=s.targets[0];t.hover=5000;s.px=t.x/100*g.W;s.py=t.y/100*g.H;app._sfsTick();snap('p1bonusLock',sfs());
s.targets=[];app._sfsSpawn();app._sfsPaint();snap('p1tag',sfs());t=s.targets[0];t.hover=5000;s.px=t.x/100*g.W;s.py=t.y/100*g.H;app._sfsTick();snap('p1lock',sfs());
s=play(8);g=app._sfsG();app._sfsSpawn();app._sfsPaint();snap('p8tag',sfs());t=s.targets[0];s.drag=t;t.x=10;t.y=80;t.color='#1FA971';app._sfsDrop();snap('p8ok',sfs());
app._sfsSpawn();t=s.targets[0];s.drag=t;t.x=10;t.y=80;t.color='#3B82F6';app._sfsDrop();snap('p8bad',sfs());
s.targets=[{id:70,x:20,y:20,r:4.6,piece:true,life:10,color:'#1FA971',shape:'circle',born:0,hx:20,hy:20}];app._sfsTick();app._sfsTick();snap('p8late',sfs());
s=play(9);app._sfsSpawn();app._sfsPaint();snap('p9',sfs());
s=play(10);g=app._sfsG();app._sfsSpawn();app._sfsPaint();snap('p10tag',sfs());t=s.targets[0];s.player={x:t.x,y:t.y};t.hover=1000;app._sfsTick();snap('p10reach',sfs());
s.invUntil=0;s.player={x:s.hazards[0].x,y:s.hazards[0].y};app._sfsTick();snap('p10haz',sfs());
s=play(11);g=app._sfsG();s.tick=59;app._sfsTick();s.player={x:s.hazards[0].x,y:s.hazards[0].y};s.invUntil=0;app._sfsTick();snap('p11haz',sfs());
s=play(12);app._sfsSpawn();app._sfsPaint();snap('p12',sfs());
s.phase='paused';app._sfsRender();snap('pause12',sfs());
done();app.souris={phase:'brief',track:'mouse',lvl:4,score:0,lives:3,hit:0,miss:0,t0:0};app.renderGames();app._sfsReset();app._sfsCountdown(0,50);snap('go',sfs());app._sfsStopLoop();
const ends=[[3,'win','bronze',{hit:9,miss:2,cores:3,bestStreak:4}],[3,'win','silver',{hit:20,miss:1,cores:1,bestStreak:7}],[1,'win','gold',{hit:30,miss:0}],[12,'win','gold',{hit:50,miss:1}],[1,'win','bronze',{hit:8,miss:1}],[2,'win','bronze',{hit:8,miss:1}],
  [2,'over',null,{hit:3,miss:9,expired:3}],[5,'over',null,{hit:3,miss:3,trapHits:2}],[8,'over',null,{hit:3,miss:2,wrongDrops:2}],[11,'over',null,{hit:3,miss:2,hazardHits:2}],[2,'over',null,{hit:2,miss:9}],[4,'over',null,{hit:5,miss:3}]];
let ei=0;for(const [lv,ph,tier,x] of ends){done();app.souris={phase:'brief',track:'mouse',lvl:lv,score:0,lives:3,hit:0,miss:0,t0:0};app.renderGames();app._sfsReset();s=app.souris;Object.assign(s,{score:lv*10,tier},x);s.phase=ph;app._sfsRender();snap('end'+(ei++),sfs());}
done();
// ── Grille réflexe ──
app.stats.sourisGridBest={r1:{score:200,tier:'bronze'},r2:{score:150,tier:'silver'}};app.stats.sourisGridTop={r1:210,r2:150};
app.activeGame='sourisGrid';
for(const lv of [1,2,3,4,5]){app.souris={phase:'brief',track:'grid',lvl:lv};app.renderGames();await W(30);snap('sgrBrief'+lv,sgr());}
app.souris={phase:'brief',track:'grid',lvl:1};app.renderGames();app._sgrBegin();app._sgrStopLoop();s=app.souris;s.phase='play';s.fresh=false;
const cell=(i,l,st,life)=>{s.cells[i]={id:'s'+i,letter:l,state:st,life:life||2000,dur:2000};};
cell(0,'F','target');cell(1,'J','trap');app._sgrRender();snap('sgrPlay',sgr());
s.best=100;s.score=99;s.combo=3;app._sgrKey('F');snap('sgrCombo2',sgr());
cell(2,'D','target');s.combo=7;app._sgrKey('D');snap('sgrCombo3',sgr());
s.hits=app._sgrTuneOf(1).trapFrom-1;cell(3,'K','target');app._sgrKey('K');snap('sgrRed',sgr());
s.combo=2;app._sgrKey('Z');snap('sgrStray',sgr());
cell(4,'L','target',10);app._sgrTick();app._sgrTick();snap('sgrLate',sgr());
cell(5,'M','trap');app._sgrKey('M');snap('sgrTrap',sgr());
s.left=10000;s.lives=2;app._sgrHud();snap('sgrTen',sgr());
s.lives=1;app._sgrHud();snap('sgrOneLife',sgr());
s.phase='paused';app._sgrRender();snap('sgrPause',sgr());
app._sgrStopLoop();
const sgrEnd=(res,x,name)=>{s.phase='play';app._sgrRender();Object.assign(s,{score:120,hits:8,misses:2,bestCombo:5,_acc:80,_result:res,traps:0,expired:0,stray:0,_newTop:false,_prevTop:0},x);s.phase='end';app._sgrRender();snap(name,sgr());};
sgrEnd({tier:'bronze',isNewBest:true},{_newTop:true},'sgrEnd1');
sgrEnd({tier:null,isNewBest:false},{_prevTop:300,traps:2},'sgrEnd2');
sgrEnd({tier:'silver',isNewBest:false},{_prevTop:300,expired:3},'sgrEnd3');
sgrEnd({tier:null,isNewBest:false},{stray:4},'sgrEnd4');
s.lvl=4;sgrEnd({tier:'gold',isNewBest:false},{},'sgrEnd5');
s.lvl=5;sgrEnd({tier:null,isNewBest:false,training:true},{},'sgrEnd6');
done();
// ── Duo souris + clavier ──
app.activeGame='sourisHybrid';app.stats.sourisHybridHand=null;app.souris={phase:'config',track:'hybrid'};app.renderGames();snap('duoConfig',page());
for(const h of ['mouse-left','mouse-right']){app.stats.sourisHybridHand=h;app.souris={phase:'brief',track:'hybrid'};app.renderGames();snap('duoBrief'+h,page());}
app.souris={phase:'play',track:'hybrid',score:12,rounds:3,hits:3,misses:1,aimTimes:[300],glv:app._glResolve('hybrid'),letter:'f',tx:50,ty:50,tr:9,spawnAt:1,firstHoverAt:null,_hovering:false};app.renderGames();snap('duoPlay',page());
for(const [i,r] of [{tier:'bronze',isNewBest:true},{tier:null,isNewBest:false,training:true}].entries()){app.souris={phase:'end',track:'hybrid',score:50,rounds:15,hits:12,misses:3,aimTimes:[],_result:r,_acc:80,_avgAim:300};app.renderGames();snap('duoEnd'+i,page());}
done();
// ── Magic Tiles ──
app.activeGame='sourisTiles';app.stats.sourisTilesBest={facile:{score:80,tier:'bronze'}};app.stats.sourisTilesTutorialSeen=true;
app.souris={phase:'select',track:'tiles'};app.renderGames();snap('tilesSelect',page());
app._sourisTilesShowGlossary();snap('tilesGlossary',document.getElementById('tiles-glossary-overlay'));app._sourisTilesCloseGlossary();
app.souris={phase:'loading',track:'tiles',songId:'facile'};app.renderGames();snap('tilesLoading',page());
app._sourisTilesKbRequiredScreen();snap('tilesKb',page());
const stg=(e,m)=>app._sourisTilesStagesForDur(180000,e,m);
app.souris={phase:'brief',track:'tiles',songId:'facile',durMs:180000,stages:stg(false,1),lanes:TILES_LANES};app.renderGames();snap('tilesBrief',page());
app.souris={phase:'brief',track:'tiles',songId:'libre',durMs:Infinity,stages:TILES_FREE_STAGES,lanes:TILES_LANES.concat(TILES_EXPERT_LANES),bpm:100};app.renderGames();snap('tilesBriefFree',page());
app._sourisTilesTutorial(()=>{});snap('tilesTuto',page());app.stopSouris();
const tp=(songId,extra)=>{const stages=stg(songId==='extreme',songId==='extreme'?3:1);app.souris=Object.assign({phase:'play',track:'tiles',songId,durMs:180000,stages,lanes:TILES_LANES,score:25,combo:12,bestCombo:12,lives:3,hits:8,misses:1,tiles:Array(8).fill(null),nextSpawnAt:0,judge:null,playStartWall:Date.now(),stageIdx:1,banner:null,startAt:null,seenTypes:{},intenseActive:false},extra||{});return app.souris;};
s=tp('facile');s.tiles[3]={y:40,long:true,holding:false,letter:'f',born:0,dur:2000};s.banner={text:s.stages[1].label,kind:'stage',start:Date.now(),until:Date.now()+5000};app.renderGames();snap('tilesLong',page());
s=tp('facile');s.tiles[3]={y:80,letter:'f',chordId:'c1',chordHit:false,born:0,dur:2000};s.tiles[4]={y:80,letter:'j',chordId:'c1',chordHit:false,born:0,dur:2000};app.renderGames();snap('tilesChord',page());
app._sourisTilesPress('f');app._sourisTilesPress('j');snap('tilesChordJudge',page());
s.tiles[2]={y:40,letter:'d',trap:true,born:0,dur:2000};app.renderGames();snap('tilesTrap',page());
s.tiles[2]=null;s.tiles[5]={y:60,letter:'k',born:0,dur:2000};s.combo=9;app._sourisTilesPress('k');snap('tilesGood',page());
s.tiles[5]={y:80,letter:'k',born:0,dur:2000};app._sourisTilesPress('k');snap('tilesPerfect',page());
s.tiles[6]={y:50,letter:'l',bonus:true,born:0,dur:2000};app._sourisTilesPress('l');snap('tilesLife',page());
app._sourisTilesMiss();snap('tilesMiss',page());
s.paused=true;app.renderGames();snap('tilesPause',page());
s=tp('extreme',{startAt:Date.now()+3500,lanes:TILES_LANES.concat(TILES_EXPERT_LANES)});app.renderGames();snap('tilesCount',page());
s=tp('extreme',{phase:'end',_result:{tier:'silver',isNewBest:true},_acc:90});app.renderGames();snap('tilesEnd',page());
s=tp('libre',{phase:'end',_result:{tier:null,isNewBest:true},_acc:70,stages:TILES_FREE_STAGES});app.renderGames();snap('tilesEndFree',page());
}finally{
Math.random=_rand;done();
const a=JSON.parse(st0);app.stats.sourisBest=a[0];app.stats.sourisTiers=a[1];app.stats.sourisHybridHand=a[2];app.stats.sourisTilesBest=a[3];app.stats.sourisTilesTutorialSeen=a[4];app.stats.sourisGridBest=a[5];app.stats.sourisGridTop=a[6];
app.activeGame=null;
}
return out;})()`;
