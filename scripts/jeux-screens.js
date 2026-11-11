// Scénario navigateur partagé : fait afficher les écrans des jeux multijoueurs et du Boss (Duel, Battle Royale, Boss de la semaine), du Clavier vide,
// des fenêtres générales et de l'espace élève (classe, devoirs) avec des états simulés, sans appel réseau ni écriture dans la progression,
// puis renvoie le texte de chaque écran. Utilisé par la sous-gate BR12 de scripts/browser-gates.js (vérifie qu'aucun mot français ne reste en anglais).
// Source JavaScript d'une fonction asynchrone exécutée dans la page (via Runtime.evaluate) : le résultat est { nom: { t: texte, h: HTML sans style } }.
module.exports = `(async()=>{
const out={};const W=ms=>new Promise(r=>setTimeout(r,ms));
let seed=777;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const attrs=(el)=>[...el.querySelectorAll('[aria-label],[title],[placeholder],[alt]')].map(e=>(e.getAttribute('aria-label')||'')+'|'+(e.getAttribute('title')||'')+'|'+(e.getAttribute('placeholder')||'')+'|'+(e.getAttribute('alt')||'')).join(' / ');
const snap=(name,el)=>{out[name]=el?{t:el.innerText+' || '+attrs(el),h:el.innerHTML.replace(/ style="[^"]*"/g,'')}:{t:'(absent)',h:'(absent)'};};
const page=()=>document.getElementById('page-games');
const guard=async(name,fn)=>{try{await fn();}catch(e){out['ERR_'+name]={t:String(e&&e.message||e),h:''};}};
const stats0=JSON.stringify(app.stats);const lmc0=app.loadMyClasses;
// pas de fenêtres de conversion qui surgissent seules pendant le scénario
try{const day=new Date().toISOString().slice(0,10);localStorage.setItem('kp-conv-guest',day);localStorage.setItem('kp-conv-upsell',day);localStorage.setItem('kp-conv-nudge',String(Date.now()));}catch(e){}
currentUser='testeur-en';currentToken='tok-testeur-en';currentUserId='uid';_statsLoaded=true;app.stats=mergeStats();
// en anglais, on utilise le cours d'anglais (contenu des leçons et des textes en anglais), comme un élève qui a choisi l'anglais
if(KPI18n.lang()==='en'){_kpAccessFor=null;kpSetAllowed(['fr/qwerty','en/azerty','en/qwerty']);updateNavUser();out._ok=await kpSetSiteLanguage('en');}
// ── Duel ──
await guard('duel',async()=>{
go('games');await W(150);app.activeGame='duel';
const D=(o)=>{app.duel=Object.assign({phase:'lobby',role:'host',roomId:'r1',roomCode:'ABC123',text:'the cat sleeps',hostLabel:'Anna',oppLabel:null,oppPresent:false,startAt:Date.now()+3000,typed:[],correct:0,keystrokes:0,started:false,startTime:0,endTime:0,finished:false,myProg:0,oppProg:0,oppFinished:false,oppForfeit:false,oppWpm:0,oppAcc:0,myWpm:0,myAcc:0,winner:null,_channel:null},o);app.renderDuel();};
D({phase:'menu'});snap('duelMenu',page());
D({phase:'menu',_codeError:app.duel&&'x'});app.duel._codeError='ERR';app.renderDuel();snap('duelMenuErr',page());
D({phase:'creating'});snap('duelCreating',page());
D({phase:'error',msg:undefined});snap('duelError',page());
D({});snap('duelHost',page());
D({oppPresent:true,oppLabel:'Ben',_codeCopied:true,_copied:true});snap('duelHostJoined',page());
D({oppLeft:true,msg:'Oups'});snap('duelHostLeft',page());
D({role:'guest'});snap('duelGuest',page());
D({role:'guest',hostLabel:null,oppLeft:true});snap('duelGuestLeft',page());
D({phase:'countdown'});snap('duelCountdown',page());
D({phase:'racing',startAt:Date.now()-1000,typed:['l','e',' '],started:true,startTime:Date.now()-4000,oppLabel:null});snap('duelRacing',page());
D({phase:'racing',startAt:Date.now()-1000,finished:true,oppLabel:'Ben'});snap('duelRacingDone',page());
const res=(o)=>D(Object.assign({phase:'result',myWpm:48,myAcc:97,oppWpm:41,oppAcc:94,oppFinished:true,oppLabel:'Ben'},o));
res({winner:'host'});snap('duelWin',page());
res({winner:'guest'});snap('duelLose',page());
res({winner:'draw'});snap('duelDraw',page());
res({winner:'host',oppForfeit:true,oppFinished:false});snap('duelForfeit',page());
res({winner:'guest',_myRematch:true});snap('duelRematchMine',page());
res({winner:'guest',_oppRematch:true});snap('duelRematchOpp',page());
res({winner:'guest',_myRematch:true,_oppRematch:true});snap('duelRematchBoth',page());
res({winner:'guest',_rematchLoading:true});snap('duelRematchLoading',page());
res({winner:'guest',_rematchError:'Boum'});snap('duelRematchErr',page());
res({winner:'host',oppLabel:null});snap('duelWinNoName',page());
app.duel=null;
});
// ── Battle Royale ──
await guard('royale',async()=>{
app.activeGame='royale';
const Ro=(o)=>{app.royale=o;app.renderRoyale();};
Ro({phase:'menu'});snap('royaleMenu',page());
Ro({phase:'menu',_error:'Echec',_codeError:'ERR'});snap('royaleMenuErr',page());
Ro({phase:'creating'});snap('royaleCreating',page());
Ro({phase:'lobby',role:'host',joinCode:'XYZ789',players:[{label:'Anna'}],_codeCopied:true});snap('royaleLobbyHost1',page());
Ro({phase:'lobby',role:'host',joinCode:'XYZ789',players:[{label:'Anna'},{label:null},{label:'Cleo'}],error:'Oups'});snap('royaleLobbyHost3',page());
Ro({phase:'lobby',role:'guest',joinCode:'XYZ789',players:[{label:'Anna'},{label:'Ben'}]});snap('royaleLobbyGuest',page());
const keys=['frappe','sprint','course','ghost','simon'];
for(let i=0;i<5;i++){Ro({phase:'round-wait',role:i%2?'host':'guest',roundIndex:i,roundGameKeys:keys,myScore:i?120:null,finishedCount:1,totalPlayers:3,players:[{},{},{}],error:i===4?'Oups':null});snap('royaleWait'+i,page());}
Ro({phase:'final',finalLoading:true});snap('royaleFinalLoading',page());
Ro({phase:'final',ranking:[{label:'Anna',totalPoints:42},{label:'Ben',totalPoints:35},{label:null,totalPoints:20},{label:'Dan',totalPoints:12},{label:'Eva',totalPoints:5}]});snap('royaleFinal',page());
Ro({phase:'final',ranking:[{label:'Anna',totalPoints:42}]});snap('royaleFinal1',page());
app.royale=null;
});
// ── Clavier vide ──
await guard('clavier',async()=>{
app.activeGame='clavier';
app.clavier=null;app.renderClavier();snap('clavierPlay',page());
const c=app.clavier;c.selected='a';c.placed={q:true,w:true};c.mistakes=2;c.bank=c.bank.filter(x=>x!=='q'&&x!=='w');app.renderClavier();snap('clavierSel',page());
c.done=true;c.elapsed=61;c.mistakes=0;app.stats.clavierBest={elapsed:50,mistakes:0,date:1};app.renderClavier();snap('clavierDone0',page());
c.mistakes=1;app.stats.clavierBest={elapsed:50,mistakes:1,date:1};app.renderClavier();snap('clavierDone1',page());
c.mistakes=5;app.stats.clavierBest={elapsed:50,mistakes:4,date:1};c._isRecord=true;app.renderClavier();snap('clavierRecord',page());
app.clavier=null;const u=currentUser;currentUser=null;app.renderClavier();snap('clavierGuest',page());currentUser=u;app.clavier=null;
});
// ── Boss de la semaine ──
await guard('boss',async()=>{
app.activeGame='boss';
const lbFull={count:132,me:{rank:14,score:55.5,wpm:60,username:'eleve-test'},top:[1,2,3,4,5,6,7,8,9,10].map(i=>({rank:i,username:'user'+i,score:100-i,wpm:90-i}))};
const ch={isoWeek:'2026-W45',text:'the cat sleeps',secondsLeft:3*86400+7200};
const B=(o)=>{app.boss=o;app.renderBoss();};
B({phase:'loading'});snap('bossLoading',page());
B({phase:'error',msg:undefined});snap('bossError',page());
B({phase:'lobby',challenge:ch,lb:{top:[],me:null,count:0},secondsLeft:3*86400+7200});snap('bossLobbyEmpty',page());
B({phase:'lobby',challenge:ch,lb:{top:[{rank:1,username:'u1',score:50,wpm:50}],me:null,count:1},secondsLeft:7200+600});snap('bossLobbyOne',page());
B({phase:'lobby',challenge:ch,lb:lbFull,secondsLeft:900});snap('bossLobbyFull',page());
B({phase:'lobby',challenge:ch,lb:{top:lbFull.top,me:{rank:2,score:98,wpm:88,username:'user2'},count:20},secondsLeft:null});snap('bossLobbyMeTop',page());
B({phase:'playing',challenge:ch,text:'the cat sleeps',typed:['l','e'],correct:2,keystrokes:2,started:true,startTime:Date.now()-5000});snap('bossPlaying',page());
B({phase:'submitting',challenge:ch});snap('bossSubmitting',page());
B({phase:'result',challenge:ch,_wpm:60,_acc:96,_score:55.3,_isRecord:true,lb:lbFull});snap('bossResult',page());
B({phase:'result',challenge:ch,_wpm:60,_acc:96,_score:55.3,_submitErr:app.boss&&kpT('boss.net_error'),lb:{top:[],me:null}});snap('bossResultErr',page());
app.boss=null;
const lbHtml=app._bossLeaderboardHTML(lbFull,true)+app._bossLeaderboardHTML({top:[]},true);
const d=document.createElement('div');d.innerHTML=lbHtml;snap('bossLeaderboardHTML',d);
});

// ── Fenêtres ──
const modalOf=(id)=>document.getElementById(id);
await guard('modals',async()=>{
for(const [n,id] of [['school','school-modal'],['upgrade','upgrade-modal']]){openModal(id,{silent:true});await W(80);snap(n+'Modal',modalOf(id));closeModal(id);}
// tutoriel de démarrage (parcours élève puis enseignant)
for(const [n,steps] of [['obStudent',OB_STEPS_ELEVE],['obTeacher',OB_STEPS_PROF]]){
  _obList=steps;_obStep=0;document.getElementById('ob-overlay').classList.add('active');let txt='';
  for(let i=0;i<steps.length;i++){_obStep=i;obRender();await W(20);txt+=document.getElementById('ob-overlay').innerText+'\\n';}
  const d=document.createElement('div');d.textContent=txt;snap(n,d);_obPrevEl&&_obPrevEl.classList.remove('ob-highlight');document.getElementById('ob-overlay').classList.remove('active');}
showForcedPasswordChangeModal({token:'x'},'h');snap('forcedPw',document.getElementById('forced-pw-overlay'));document.getElementById('forced-pw-overlay').remove();
app.showResetPasswordModal('a'.repeat(64));snap('resetPw',document.getElementById('reset-pw-overlay'));
document.getElementById('reset-pw-new').value='abc';await app._confirmPasswordReset('a'.repeat(64));snap('resetPwShort',document.getElementById('reset-pw-overlay'));
document.getElementById('reset-pw-new').value='abcdef';document.getElementById('reset-pw-confirm').value='abcdeg';await app._confirmPasswordReset('a'.repeat(64));snap('resetPwMismatch',document.getElementById('reset-pw-overlay'));
document.getElementById('reset-pw-overlay').remove();
confirmModal({icon:'?',title:'T',body:'B'});await W(30);{const o=[...document.body.children].pop();snap('confirmDefault',o);o._close&&o._close();}
promptModal({icon:'?',title:'T',placeholder:'p',confirmText:'OK'});await W(30);{const o=[...document.body.children].pop();o.querySelector('#pm-confirm').click();snap('promptEmpty',o);o._close&&o._close();}
// rejoindre une classe (serveur simulé)
{const f0=window.fetch;window.fetch=async(u,o)=>({ok:true,status:200,json:async()=>({className:'5A Latin'})});
 startClassJoin('ABC123');await W(200);{const o=[...document.body.children].pop();snap('joinClassPreview',o);document.getElementById('cj-confirm').click();await W(200);snap('joinClassDone',o);o._close&&o._close();}
 window.fetch=async()=>({ok:false,status:400,json:async()=>({})});startClassJoin('ZZZ');await W(200);{const o=[...document.body.children].pop();snap('joinClassBad',o);o._close&&o._close();}
 window.fetch=f0;}
joinClassPrompt();await W(50);{const o=[...document.body.children].pop();snap('joinClassPrompt',o);o._close&&o._close();}
// bandeaux
showEmailPendingBanner('ana');snap('emailPending',document.getElementById('email-pending-banner'));document.getElementById('email-pending-banner').remove();
for(const v of ['success','already','email-changed','expired','invalid','error']){history.replaceState({},'','/?verified='+v);const n0=document.body.children.length;handleVerificationReturn();const o=[...document.body.children].pop();snap('verified_'+v,o);o.remove();}
history.replaceState({},'','/');
{const was=isMobileLayout;window.isMobileLayout=()=>true;history.replaceState({},'','/?defi=Ana~50~95');handleChallenge();await W(450);const m=document.getElementById('cert-modal')||[...document.querySelectorAll('[id*=cert]')].pop();snap('challengeMobile',m);try{app._closeCertModal();}catch(e){}window.isMobileLayout=was;history.replaceState({},'','/');}
for(const e of ['state','profile','seats','unconfigured','provider','server','invite','zzz']){history.replaceState({},'','/?sso_error='+e);handleSSOReturn();await W(220);snap('sso_'+e,modalOf('auth-modal'));closeModal('auth-modal');}
history.replaceState({},'','/');
// bandeau des cookies : on rejoue le script avec aucun choix retenu
{try{localStorage.removeItem('keypace_cookie_consent');}catch(e){}['cookie-consent-banner','cookie-consent-reopen'].forEach(i=>{const x=document.getElementById(i);x&&x.remove();});
 const code=await (await fetch('/cookie-consent.js')).text();(0,eval)(code);const b=document.getElementById('cookie-consent-banner');snap('cookieBanner',b);b&&b.remove();
 try{localStorage.setItem('keypace_cookie_consent','rejected');}catch(e){}const x=document.getElementById('cookie-consent-reopen');x&&x.remove();(0,eval)(code);{const w=document.createElement('div');const r=document.getElementById('cookie-consent-reopen');if(r)w.appendChild(r.cloneNode(true));snap('cookieReopen',w);}}
});
// ── Espace élève : classe et devoirs ──
await guard('student',async()=>{
const today=new Date();const iso=(d)=>{const x=new Date(today);x.setDate(x.getDate()+d);return x.toISOString().slice(0,10);};
const cls=[{id:'c1',name:'5A Latin',joinedAt:'2026-09-01',inviteCode:'ABC123'},{id:'c2',name:'IT 3',joinedAt:'2026-09-02'}];
const mk=(id,t,o)=>Object.assign({id,title:t,classId:'c1',className:'5A Latin',done:false,dueDate:null},o);
const P=document.getElementById('page-classes');
const S=(name,classes,asg,fn)=>{app._myClasses=classes;app._myAssignments=asg;app._clFilter=null;app._clExpanded=false;app._clCur=null;if(fn)fn();else app.renderStudentClasses();snap(name,P);};
app._clError=true;app._myClasses=null;app.renderStudentClasses();snap('clError',P);
app._myClasses=null;app._clError=false;app.loadMyClasses=()=>{};app.renderStudentClasses();snap('clLoading',P);
S('clNone',[],[]);currentInstitutionName='Royal Athenaeum';S('clNoneInst',[],[]);currentInstitutionName=null;
S('clNoAsg',cls,[]);
S('clAllDone',cls,[mk('a1','Home row',{done:true,lessonId:'r1'}),mk('a2','My essay',{done:true,mode:'essay'})]);
S('clLate5',cls,[1,2,3,4,5,6].map(i=>mk('l'+i,'Task '+i,{dueDate:iso(-i),lessonId:'r1'})));
S('clLate1',cls,[mk('a1','Home row',{dueDate:iso(-3),lessonId:'r1',targetWpm:30})]);
S('clLate2',cls,[mk('a1','One',{dueDate:iso(-1),mode:'essay'}),mk('a2','Two',{dueDate:iso(-2),customText:'x',mode:'vocal',targetWpm:25}),mk('a3','Three',{dueDate:iso(4)})]);
S('clSoonToday',cls,[mk('a1','Dictation work',{dueDate:iso(0),customText:'x',mode:'vocal'}),mk('a2','Autre',{dueDate:iso(5)}),mk('a3','Autre 2',{dueDate:iso(9)})]);
S('clSoonTomorrow',cls,[mk('a1','Free text',{dueDate:iso(1),customText:'x'})]);
S('clWelcome',cls,[mk('a1','First'),mk('a2','Second')]);
S('clDefault',cls,[mk('a1','First',{dueDate:iso(10)}),mk('a2','Second',{dueDate:iso(20),classId:'c2',className:'IT 3'}),mk('a3','Third',{done:true})]);
S('clNoDeadline',cls,[mk('a1','First',{done:true}),mk('a2','Second')]);
S('clMany',cls,[...Array(11).keys()].map(i=>mk('m'+i,'Task '+i,{dueDate:iso(i+2)})));
app._clExpanded=true;app.renderStudentClasses();snap('clManyExpanded',P);
app._clFilter='c2';app._clExpanded=false;app.renderStudentClasses();snap('clFilterNone',P);
app._clFilter='c1';app._myAssignments=[mk('a1','First',{done:true})];app.renderStudentClasses();snap('clFilterAllDone',P);
S('clView',cls,[mk('a1','First',{dueDate:iso(3)}),mk('a2','Second',{done:true,mode:'essay'}),mk('a3','Third',{done:true})],()=>app.viewStudentClass('c1'));
S('clViewDone',cls,[mk('a2','Second',{done:true})],()=>app.viewStudentClass('c1'));
S('clViewNone',cls,[],()=>app.viewStudentClass('c2'));
app._myClasses=null;app._myAssignments=null;
});
await guard('reminder',async()=>{app._showReminderPopup([{assignmentTitle:'Task 1'},{assignmentTitle:'Task 2'}]);const o=[...document.body.children].pop();snap('reminderPopup',o);o._close&&o._close();});
await guard('review',async()=>{const d=document.createElement('div');app._myReview=null;d.innerHTML=app._reviewBanner(12,true);snap('reviewAsk',d);
 app._myReview={status:'published'};d.innerHTML=app._reviewBanner(12,true);snap('reviewPub',d);app._myReview={status:'pending'};d.innerHTML=app._reviewBanner(12,true);snap('reviewPend',d);app._myReview=undefined;});

// ── Pop-ups de conversion et de fin de leçon ──
await guard('assign',async()=>{
 go('lessons');await W(100);
 app.sess=app._makeCustomSess({id:'a1',customText:'the cat sleeps',mode:'vocal',title:'Task 1'});app.view='lessons';app.renderTyping();snap('assignDictation',document.getElementById('page-lessons'));app.sess=null;
 app.sess=app._makeCustomSess({id:'a2',customText:'the cat sleeps',mode:'written',title:'Task 2'});app.renderTyping();snap('assignWritten',document.getElementById('page-lessons'));app.sess=null;
 app._showIntro=true;app.renderTyping();snap('lessonIntro',document.getElementById('page-lessons'));app._showIntro=false;
 go('testtime');app.tt={sec:60,phase:'ready',text:'the cat sleeps well',idx:0,typed:[],keystrokes:0,correct:0,startTime:0,log:[]};app.renderTestTime();snap('ttReady',document.getElementById('page-testtime'));
 app.tt={sec:180,phase:'done',res:{wpm:40,acc:88,errors:5,chars:200,segWpm:[30,40,45,38,41,42],segMs:30000,prevBest:35},text:'x',idx:0,typed:[],keystrokes:0,correct:0,startTime:0,log:[],};app.renderTestTime();snap('ttResult',document.getElementById('page-testtime'));
 app.tt.res.prevBest=0;app.renderTestTime();snap('ttResultFirst',document.getElementById('page-testtime'));app.tt.res.prevBest=40;app.renderTestTime();snap('ttResultEq',document.getElementById('page-testtime'));app.tt.res.prevBest=50;app.renderTestTime();snap('ttResultMiss',document.getElementById('page-testtime'));
 app.tt=null;
 app.stats.gameBest=0;app.activeGame='frappe';
 app._showTierBanner(GAME_TIERS[1],1);snap('tierBanner',document.getElementById('tier-banner'));document.getElementById('tier-banner')&&document.getElementById('tier-banner').remove();
});
await guard('popups',async()=>{
document.querySelectorAll('.conv-overlay,.cel-overlay').forEach(e=>e.remove());
celebrateLesson({keys:'f j',title:'Home row'},{wpm:30,acc:96});snap('celebrate',document.querySelector('.cel-overlay'));document.querySelector('.cel-overlay').remove();
showConvertPopup('guest',{wpm:42});snap('convGuest',document.querySelector('.conv-overlay'));document.querySelector('.conv-overlay').remove();
showConvertPopup('guest');snap('convGuestNoRes',document.querySelector('.conv-overlay'));document.querySelector('.conv-overlay').remove();
showConvertPopup('upgrade');snap('convUpgrade',document.querySelector('.conv-overlay'));document.querySelector('.conv-overlay').remove();
});
// ── Écrans publics et élève (compte gratuit, puis visiteur) ──
await guard('pages',async()=>{
const c=course();const now=Date.now();
c.tests.length=0;for(let i=0;i<6;i++)c.tests.push({t:now-i*86400000,wpm:30+i*3,acc:90+i,mode:i%2?'test':'lesson',dur:60});
const ls=ALL_LESSONS.slice(0,12);ls.forEach((l,i)=>{c.lessons[l.id]={bestWpm:25+i,bestErr:1,cleared:true};});
app.stats.role=undefined;
for(const v of ['home','test','testtime','testchoix','lessons','games','stats','classes']){
  try{app._skipModulesHub=false;go(v);await W(450);snap('page_'+v,document.getElementById('page-'+v));}catch(e){out['ERR_page_'+v]={t:String(e),h:''};}
}
// leçon en cours
app.sess=app.makeSession('lesson',ALL_LESSONS[0].id);go('lessons');await W(300);snap('lessonRun',document.getElementById('page-lessons'));app.sess=null;
app.sess=app.makeSession('test');go('test');await W(300);snap('testRun',document.getElementById('page-test'));app.sess=null;
// visiteur
const u=currentUser;currentUser=null;currentToken=null;updateNavUser();
for(const v of ['games','stats','classes']){
  try{app._skipModulesHub=false;go(v);await W(450);snap('guest_'+v,document.getElementById('page-'+v));}catch(e){out['ERR_guest_'+v]={t:String(e),h:''};}
}
snap('guestNav',document.getElementById('main-nav'));
openAuth('login');await W(100);snap('authLogin',document.getElementById('auth-modal'));closeModal('auth-modal');
openAuth('register');await W(100);snap('authRegister',document.getElementById('auth-modal'));closeModal('auth-modal');
currentUser=u;currentToken='tok-testeur-en';updateNavUser();go('home');
snap('userNav',document.getElementById('main-nav'));
await app.openSettings();await W(500);snap('settings',document.getElementById('settings-overlay'));app.closeSettings();
});
app.loadMyClasses=lmc0;currentInstitutionName=null;app.stats=JSON.parse(stats0);app.activeGame=null;
return out;
})()`;
