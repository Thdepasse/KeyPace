// OUTIL DE DEV (non chargé par le site) : calibration de la difficulté de Précision souris.
//
// Fait jouer chaque niveau par 4 joueurs virtuels (débutant ~15e centile, moyen ~médiane,
// bon ~85e, expert ~97e) dont les temps de pointage suivent la loi de Fitts
// (MT = a + b*log2(D/W+1), réaction, bruit d'arrivée), puis calcule les seuils de médaille.
// Règle retenue : bronze ≈ 65 % des débutants (début de parcours), argent ≈ 55 % des moyens,
// or ≈ 55 % des bons joueurs ; un joueur qui perd ses 3 vies ne compte pas.
//
// Mode d'emploi (le jeu tourne en local, ex. python3 -m http.server 8765, fenêtre 1440x900) :
//   1. ouvrir index.html, coller ce fichier dans la console ;
//   2. await simBoot()              -> compte de démonstration local, ouvre Précision souris
//   3. tryV(4,{'2 cibles/3.6 s':{maxT:2,life:3600}},40)   -> teste des réglages sans éditer index.html
//   4. solve(4,100)                 -> seuils conseillés [bronze,argent,or] + taux de réussite par profil
// Les réglages vivent dans app._sfsTune (index.html). Ce sont des profils modélisés, pas des
// mesures sur de vrais joueurs : à confirmer par des parties réelles.
// Joueurs virtuels pour Précision souris (calibration de la difficulté).
// Temps de pointage : loi de Fitts MT = a + b*log2(D/W+1) (+ réaction, bruit d'arrivée).
// Profils : débutant ~15e centile, moyen ~médiane, bon ~85e, expert ~97e.
window.SIM=(()=>{
const SK={
  debutant:{a:250,b:280,react:550,plan:220,err:1.25,confuse:.12,greed:.3,dec:260,pred:.35},
  moyen:{a:150,b:180,react:400,plan:150,err:1.0,confuse:.06,greed:.5,dec:200,pred:.6},
  bon:{a:100,b:130,react:300,plan:100,err:.9,confuse:.025,greed:.7,dec:150,pred:.85},
  expert:{a:70,b:100,react:240,plan:70,err:.8,confuse:.01,greed:.9,dec:110,pred:1},
};
const mul=(seed)=>function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const gauss=(r)=>{let u=0;while(!u)u=r();const v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
function run(lvl,skill,seed){
  const A=app,rnd=mul(seed*7919+lvl*104729+13);
  const jit=Math.exp(0.12*gauss(rnd));
  const sk=Object.assign({},SK[skill]);sk.a*=jit;sk.b*=jit;sk.react*=jit;sk.plan*=jit;
  const origRandom=Math.random;Math.random=mul(seed*31+lvl*977+5);
  const o={};['_sfsPaint','_sfsHud','_sfsFx','_sfsFxBig','_sfsFlash','_sfsRender','_sfsFinish'].forEach(k=>o[k]=A[k]);
  const oPS=window.playSound,oTr=window.track;window.playSound=()=>{};window.track=()=>{};
  try{
    A.selectSouris(lvl);const s=A.souris;
    A._sfsStopLoop();A._sfsReset();s.phase='countdown';A._sfsRender();
    A._sfsPaint=A._sfsHud=A._sfsFx=A._sfsFxBig=A._sfsFlash=A._sfsRender=()=>{};
    A._sfsFinish=function(){const l=this._sourisLevels[this.souris.lvl-1];this._sfsStopLoop();this.souris.tier=this._sourisTier(l,this.souris.score);this.souris.phase='done';};
    s.phase='play';A._sfsRefreshGeo();
    const c=A._sourisCaps(lvl),G=s.geo,ar=document.getElementById('souris-arena'),R=ar.getBoundingClientRect(),K=G.K;
    const multi=c.move&&c.click?1.2:1;
    const B={pos:{x:G.W/2,y:G.H/2},mv:null,state:'idle',freeAt:0,seen:{},mis:{},bonusOk:{},hz:[],kbNext:0,cur:null,drag:null};
    const emit=(type)=>ar.dispatchEvent(new PointerEvent(type,{clientX:R.left+B.pos.x,clientY:R.top+B.pos.y,pointerId:1,pointerType:'mouse',button:0,bubbles:true,cancelable:true}));
    const dist=(x,y)=>Math.hypot(x-B.pos.x,y-B.pos.y);
    const tpx=(t)=>({x:t.x/100*G.W,y:t.y/100*G.H});
    const moveTo=(x,y,W,corr)=>{const D=dist(x,y);const MT=((corr?sk.a*0.55:sk.a)+sk.b*Math.log2(D/W+1))*multi;B.mv={x0:B.pos.x,y0:B.pos.y,x1:x,y1:y,t0:s.clock,dur:Math.max(90,MT)};};
    const perceivedGood=(t)=>{if(!t.bad)return true;if(!(t.id in B.mis))B.mis[t.id]=rnd()<(t.disguised?sk.confuse*2.2:sk.confuse*0.5);return B.mis[t.id];};
    const left=(t)=>(t.life||8000)-(s.clock-t.born);
    function pickTarget(){
      const now=s.clock;
      s.targets.forEach(t=>{if(!(t.id in B.seen))B.seen[t.id]=now;});
      let cands=s.targets.filter(t=>perceivedGood(t));
      if(c.bonus||c.hover){
        cands=cands.filter(t=>{if(!t.bonus)return true;if(!(t.id in B.bonusOk))B.bonusOk[t.id]=rnd()<sk.greed;return B.bonusOk[t.id]&&left(t)>500;});
      }
      if(!cands.length)return null;
      const b=cands.filter(t=>t.bonus);if(b.length&&c.bonus)return b[0];
      cands.sort((p,q)=>left(p)-left(q)||dist(tpx(p).x,tpx(p).y)-dist(tpx(q).x,tpx(q).y));
      return cands[0];
    }
    function mouse(){
      const now=s.clock;
      if(B.mv){
        const f=Math.min(1,(now-B.mv.t0)/B.mv.dur),e=10*f**3-15*f**4+6*f**5;
        B.pos.x=B.mv.x0+(B.mv.x1-B.mv.x0)*e;B.pos.y=B.mv.y0+(B.mv.y1-B.mv.y0)*e;
        if(f<1)return;
        B.mv=null;B.arrived=true;
      }
      if(B.state==='moving'&&B.arrived){
        B.arrived=false;
        if(c.drag){
          emit('pointermove');emit('pointerdown');
          if(s.drag){
            const zones=c.sort3?[.1665,.5,.8335]:[.25,.75];
            const cols=c.sort3?['#1FA971','#3B82F6','#818CF8']:['#1FA971','#3B82F6'];
            let zi=cols.indexOf(s.drag.color);if(rnd()<sk.confuse*0.6){zi=Math.floor(rnd()*zones.length);}
            const zw=G.W/zones.length*0.5;
            B.state='dragging';B.drag=s.drag;
            moveTo(zones[zi]*G.W+gauss(rnd)*zw*0.15,G.H*(0.74+0.1*rnd()),zw,false);
          }else{B.state='idle';B.freeAt=now+40;}
          return;
        }
        if(c.click){emit('pointermove');emit('pointerdown');B.state='idle';B.freeAt=now+40;return;}
        if(c.hover){B.state='holding';return;}
      }
      if(B.state==='dragging'&&B.arrived===true){B.arrived=false;emit('pointermove');emit('pointerup');B.drag=null;B.state='idle';B.freeAt=now+30;return;}
      if(B.state==='holding'){
        const t=B.cur&&s.targets.find(x=>x.id===B.cur.id);
        if(!t){B.state='idle';B.freeAt=now;return;}
        const p=tpx(t),rv=A._sfsRad(t);
        if(Math.hypot(p.x-B.pos.x,p.y-B.pos.y)>rv+3){moveTo(p.x+gauss(rnd)*rv*0.2,p.y+gauss(rnd)*rv*0.2,rv*1.2,true);B.state='moving';}
        return;
      }
      if(B.state==='idle'&&!B.mv){
        const t=pickTarget();if(!t)return;
        const startAt=(B.seen[t.id]>B.freeAt)?B.seen[t.id]+sk.react*(c.traps?1.15:1):B.freeAt+sk.plan*(c.traps?1.15:1);
        if(now<startAt)return;
        const p=tpx(t),rv=A._sfsRad(t);
        let W=2*rv; if(c.core||c.hover)W*=0.7;
        const sig=0.24*sk.err*W*(c.drag?0.9:1);
        B.cur=t;B.state='moving';
        moveTo(p.x+gauss(rnd)*sig,p.y+gauss(rnd)*sig,W,false);
      }
    }
    function kbd(){
      const now=s.clock;
      B.hz.push({t:now,h:(s.hazards||[]).map(h=>({id:h.id,x:h.x/100*G.W,y:h.y/100*G.H,r:h.r*K}))});
      while(B.hz.length&&B.hz[0].t<now-1500)B.hz.shift();
      if(now<B.kbNext)return;
      B.kbNext=now+sk.dec*(c.click?1.3:1);
      const p=s.player,px=p.x/100*G.W,py=p.y/100*G.H;
      let vx=0,vy=0;
      if(c.pads){
        const ts=s.targets.filter(t=>t.pad);
        if(ts.length){ts.sort((a,b)=>Math.hypot(a.x/100*G.W-px,a.y/100*G.H-py)-Math.hypot(b.x/100*G.W-px,b.y/100*G.H-py));
          const t=ts[0],dx=t.x/100*G.W-px,dy=t.y/100*G.H-py,d=Math.hypot(dx,dy)||1;
          if(d>t.r*K*0.45){vx=dx/d;vy=dy/d;}}
      }
      // perception retardée + extrapolation du mouvement (selon l'habileté du joueur)
      const old=B.hz.find(e=>e.t>=now-sk.react)||B.hz[0];
      const older=B.hz.find(e=>e.t>=now-sk.react-300)||B.hz[0];
      if(old)old.h.forEach(h=>{
        const h0=older&&older.h.find(q=>q.id===h.id),dt=Math.max(1,old.t-older.t);
        const vxh=h0?(h.x-h0.x)/dt:0,vyh=h0?(h.y-h0.y)/dt:0;
        const look=(sk.react+450)*sk.pred;
        const hx=h.x+vxh*look,hy=h.y+vyh*look;
        const dx=px-hx,dy=py-hy,d=Math.hypot(dx,dy)||1,m=h.r+80;
        if(d<m){const w=(m-d)/m*2.8;vx+=dx/d*w;vy+=dy/d*w;}
        const dx2=px-h.x,dy2=py-h.y,d2=Math.hypot(dx2,dy2)||1;
        if(d2<m){const w=(m-d2)/m*2.2;vx+=dx2/d2*w;vy+=dy2/d2*w;}
      });
      const Kk={z:vy<-0.3,s:vy>0.3,q:vx<-0.3,d:vx>0.3};
      ['z','q','s','d'].forEach(k=>{A._sfsKeys[k]=!!Kk[k];});
    }
    let guard=0;
    while(s.phase==='play'&&guard++<4000){
      if(c.move)kbd();
      if(c.hover||c.click||c.drag)mouse();
      emit('pointermove');
      A._sfsTick();
    }
    const l=A._sourisLevels[lvl-1];
    return {score:s.score,lives:s.lives,phase:s.phase,hit:s.hit,miss:s.miss,expired:s.expired,trap:s.trapHits,hz:s.hazardHits,lost:s.phase==='over',tier:s.score>=l.gold?'gold':s.score>=l.silver?'silver':s.score>=l.bronze?'bronze':null};
  }finally{
    Math.random=origRandom;Object.keys(o).forEach(k=>{app[k]=o[k];});window.playSound=oPS;window.track=oTr;
    app._sfsStopLoop();app._sfsKeys={z:false,q:false,s:false,d:false};
  }
}
// n parties par profil : médiane, centiles, et part de réussite de chaque médaille
function batch(lvl,n,skills){
  const res={},raw={};
  for(const sk of (skills||Object.keys(SK))){
    const r=[];for(let i=1;i<=n;i++)r.push(run(lvl,sk,i));
    raw[sk]=r;
    const sc=r.map(x=>x.score).sort((a,b)=>a-b),q=(p)=>sc[Math.min(sc.length-1,Math.floor(p*sc.length))];
    const L=app._sourisLevels[lvl-1];
    const pc=(f)=>Math.round(100*r.filter(f).length/r.length);
    res[sk]={med:q(.5),p10:q(.1),p90:q(.9),B:pc(x=>x.score>=L.bronze&&!x.lost),S:pc(x=>x.score>=L.silver&&!x.lost),G:pc(x=>x.score>=L.gold&&!x.lost),lost:pc(x=>x.lost)};
  }
  SIM.raw=raw;
  return res;
}
// Seuil tel que `target` des parties du profil le dépassent sans perdre toutes leurs vies
function thr(raw,skill,target){
  const eff=raw[skill].map(x=>x.lost?-1:x.score).sort((a,b)=>b-a);
  const k=Math.max(0,Math.min(eff.length-1,Math.round(target*eff.length)-1));
  return eff[k];
}
return {run,batch,thr,SK};
})();
// Essaie des variantes de réglages sans toucher au fichier : tryV(niveau,{nom:{...réglages}},n)
window.tryV=(lvl,variants,n)=>{
  const base=JSON.parse(JSON.stringify(app._sfsTune[lvl]));const out={};
  for(const [k,v] of Object.entries(variants)){
    app._sfsTune[lvl]=Object.assign({},base,v);
    const r=SIM.batch(lvl,n||30);
    out[k]=Object.fromEntries(Object.entries(r).map(([s,x])=>[s.slice(0,3),x.med+' ['+x.p10+'-'+x.p90+'] perdu'+x.lost+'%']));
  }
  app._sfsTune[lvl]=base;return out;
};
window.simBoot=async()=>{
  window.__errs=[];window.addEventListener('error',e=>window.__errs.push(e.message));
  currentUser='demo';currentPlan='expert';currentToken='x';app.stats=app.stats||{};app.stats.sourisBest=12;go('games');
  [...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Refuser').forEach(b=>b.click());app.selectGame('souris');
};
// Seuils : bronze = ~65 % des débutants (début) ; argent = ~55 % des moyens ; or = ~55 % des bons joueurs
window.TARGET=(l)=>({pbD:l<=3?.65:l===4?.5:l<=7?.4:l<=9?.6:.35,ps:l<=5?.55:l<=9?.5:.4,pg:l<=5?.55:l<=9?.45:.35});
window.rnd=(v)=>v>=60?Math.round(v/5)*5:v>=25?Math.round(v/2)*2:Math.round(v);
window.solve=(l,n)=>{
  const raw={};for(const sk of Object.keys(SIM.SK)){raw[sk]=[];for(let i=1;i<=n;i++)raw[sk].push(SIM.run(l,sk,i));}
  const t=TARGET(l);
  const bd=SIM.thr(raw,'debutant',t.pbD),bm=SIM.thr(raw,'moyen',.9);
  let b=rnd(Math.max(3,Math.min(bd<3?1e9:bd,bm)));
  let s=rnd(SIM.thr(raw,'moyen',t.ps)),g=rnd(SIM.thr(raw,'bon',t.pg));
  if(s<=b)s=b+Math.max(2,Math.round(b*.3));if(g<=s)g=s+Math.max(2,Math.round(s*.3));
  const rate=(sk,v)=>Math.round(100*raw[sk].filter(x=>!x.lost&&x.score>=v).length/n);
  const lost=Object.fromEntries(Object.keys(raw).map(k=>[k.slice(0,3),Math.round(100*raw[k].filter(x=>x.lost).length/n)]));
  return {lvl:l,thr:[b,s,g],deb:[rate('debutant',b),rate('debutant',s)],moy:[rate('moyen',b),rate('moyen',s),rate('moyen',g)],bon:[rate('bon',b),rate('bon',s),rate('bon',g)],exp:[rate('expert',b),rate('expert',s),rate('expert',g)],lost,med:Object.fromEntries(Object.keys(raw).map(k=>[k.slice(0,3),SIM.thr(raw,k,.5)]))};
};
window.RES={};
