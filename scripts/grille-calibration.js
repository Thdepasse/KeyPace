// OUTIL DE DEV (non chargé par le site) : calibration de la difficulté de Grille réflexe.
//
// Fait jouer chaque niveau par 4 joueurs virtuels (débutant ~15e centile, moyen ~médiane, bon ~85e,
// expert ~97e) : temps de réaction + délai entre deux frappes, erreurs (touche à côté, piège tapé).
// Les 4 niveaux utilisent la même grille de 9 cases vides ; la lettre n'est révélée qu'à l'allumage et
// ne vient que de la rangée du niveau (milieu, haut, bas) ou de tout le clavier. Les rangées difficiles
// allongent la recherche de la touche (RTX) et multiplient les erreurs (ERX).
// Règle des seuils : bronze ≈ 65 % des débutants (niveaux 1 et 2), 50 % (niveau 3), 70 % des moyens
// (niveau 4) ; argent ≈ 55 % des moyens (60 % des bons au niveau 4) ; or ≈ 50 % des bons joueurs
// (50 % des experts au niveau 4).
//
// Mode d'emploi (jeu en local, ex. python3 -m http.server 8765, fenêtre ~1100x825) :
//   1. ouvrir index.html, se connecter en compte de démonstration, couper le son (window.playSound=()=>{}),
//      coller ce fichier dans la console ;
//   2. GSIM.batch(2,100)                     -> médiane, centiles, réussite B/S/G et % de parties perdues par profil
//   3. tryG(2,{'durée mini 1,6 s':{durMin:1600}},60)  -> teste des réglages sans éditer index.html
// Les réglages vivent dans app._sgrBase et app._sgrLevels[n].tune / .tiers (index.html). Profils
// modélisés, pas des mesures sur de vrais joueurs : à confirmer par des parties réelles.
// Joueurs virtuels pour Grille réflexe : temps de réaction + frappe, avec erreurs.
// Les rangées difficiles (haut, bas, tout le clavier) allongent la recherche de la touche.
window.GSIM=(()=>{
const SK={
  debutant:{react:850,gap:450,trap:.015,stray:.03,sig:.25},
  moyen:{react:620,gap:330,trap:.007,stray:.02,sig:.22},
  bon:{react:470,gap:240,trap:.003,stray:.01,sig:.2},
  expert:{react:360,gap:180,trap:.0015,stray:.005,sig:.18},
};
const RTX=[1.25,1.45,1.6,1.8];      // temps de recherche par niveau
const ERX=[1.2,1.5,1.8,2.2];         // fréquence des erreurs par niveau
const mul=(seed)=>function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const gauss=(r)=>{let u=0;while(!u)u=r();const v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
function run(lvl,skill,seed){
  const A=app,rnd=mul(seed*7919+lvl*101+11);
  const jit=Math.exp(0.12*gauss(rnd));
  const sk=Object.assign({},SK[skill]);sk.react*=jit*RTX[lvl-1];sk.gap*=jit*RTX[lvl-1];sk.trap*=ERX[lvl-1];sk.stray*=ERX[lvl-1];
  const origRandom=Math.random;Math.random=mul(seed*31+lvl*17+5);
  const o={};['_sgrPop','_sgrSay','_sgrPress','_sgrCellsUpdate','_sgrHud','_sgrRender','_sgrEnd','_sgrSpawn'].forEach(k=>o[k]=A[k]);
  const oPS=window.playSound;window.playSound=()=>{};
  try{
    A.souris={phase:'brief',track:'grid',lvl};
    A._sgrReset();const s=A.souris;
    A._sgrPop=A._sgrSay=A._sgrPress=A._sgrCellsUpdate=A._sgrHud=A._sgrRender=()=>{};
    A._sgrEnd=function(){this.souris.phase='end';};
    // une case qui se rallume est une nouvelle cible à planifier, même dans le même tick
    const sp=o._sgrSpawn;
    A._sgrSpawn=function(){const before=this.souris.cells.map(c=>c.state);sp.call(this);this.souris.cells.forEach((c,i)=>{if(c.state&&!before[i])c._sk=false;});};
    s.phase='play';
    let nextFree=0,guard=0;
    while(s.phase==='play'&&guard++<4000){
      const now=s.clock;
      for(const c of s.cells){
        if(c.state!=='target')c._sk=false;
        if(c.state==='target'&&!c._sk){
          c._sk=true;
          const idle=now>=nextFree;
          const rt=(idle?sk.react:sk.gap)*Math.exp(sk.sig*gauss(rnd));
          c._press=Math.max(now+60,(idle?now:nextFree)+rt);
          nextFree=Math.max(nextFree,c._press);
        }
      }
      const due=s.cells.filter(c=>c.state==='target'&&c._press<=now+50).sort((a,b)=>a._press-b._press)[0];
      if(due){
        const pool=A._sgrPoolOf(lvl),active=s.cells.filter(c=>c.state).map(c=>c.letter);
        if(rnd()<sk.stray){const cand=pool.filter(l=>!active.includes(l));if(cand.length)A._sgrKey(cand[Math.floor(rnd()*cand.length)]);}
        const trap=s.cells.find(c=>c.state==='trap');
        if(trap&&rnd()<sk.trap){A._sgrKey(trap.letter);due._press=now+300;} // il retape la bonne touche ensuite
        else{A._sgrKey(due.letter);due._press=1e12;}
      }
      A._sgrTick();
    }
    return {score:s.score,hits:s.hits,lives:s.lives,lost:s.lives<=0,expired:s.expired,traps:s.traps,stray:s.stray,left:s.left,combo:s.bestCombo};
  }finally{
    Math.random=origRandom;Object.keys(o).forEach(k=>{app[k]=o[k];});window.playSound=oPS;app._sgrStopLoop();
  }
}
function batch(lvl,n){
  const T=app._sgrLevel(lvl).tiers,out={},raw={};
  for(const sk of Object.keys(SK)){
    const r=[];for(let i=1;i<=n;i++)r.push(run(lvl,sk,i));raw[sk]=r;
    const sc=r.map(x=>x.score).sort((a,b)=>a-b),q=p=>sc[Math.min(sc.length-1,Math.floor(p*sc.length))];
    const pc=(f)=>Math.round(100*r.filter(f).length/r.length);
    out[sk]={med:q(.5),p10:q(.1),p90:q(.9),B:pc(x=>x.score>=T.bronze),S:pc(x=>x.score>=T.silver),G:pc(x=>x.score>=T.gold),perdu:pc(x=>x.lost),vies:(r.reduce((a,x)=>a+x.lives,0)/r.length).toFixed(1),dur:(r.reduce((a,x)=>a+(45000-x.left),0)/r.length/1000).toFixed(0)};
  }
  GSIM.raw=raw;return out;
}
// seuil tel que `target` des parties du profil le dépassent
function thr(skill,target){const eff=GSIM.raw[skill].map(x=>x.score).sort((a,b)=>b-a);return eff[Math.max(0,Math.min(eff.length-1,Math.round(target*eff.length)-1))];}
return {run,batch,thr,SK};
})();
// essaie des variantes de réglages (surcharge tune du niveau) sans éditer index.html
window.tryG=(lvl,variants,n)=>{
  const L=app._sgrLevels[lvl-1],base=JSON.parse(JSON.stringify(L.tune)),out={};
  for(const [k,v] of Object.entries(variants)){
    L.tune=Object.assign({},base,v);
    const r=GSIM.batch(lvl,n||60);
    out[k]=Object.fromEntries(Object.entries(r).map(([s,x])=>[s.slice(0,3),x.med+' ['+x.p10+'-'+x.p90+'] B'+x.B+' S'+x.S+' G'+x.G+' perdu'+x.perdu+'% '+x.dur+'s']));
  }
  L.tune=base;return out;
};
