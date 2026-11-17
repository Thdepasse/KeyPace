/* Module « Créer une adresse mail, Cc et Cci » : même moteur que les modules mail, CV et mot de passe. Rien de ce que l'élève tape n'est envoyé ni enregistré. Les adresses et les personnes sont inventées. */
/* =====================  PARTIE 1 : L'ADRESSE MAIL  ===================== */
const STEPS = [
  { z:'what', t:"À quoi sert une adresse mail", x:"Une adresse mail, c'est ta boîte aux lettres sur Internet. Elle te permet de recevoir des messages et d'en envoyer. Chaque adresse est unique au monde : une seule boîte lui correspond.", tip:"Pense à l'adresse de ta maison : elle dit où livrer le courrier.", a:"Donner ton adresse à n'importe qui sur Internet." },
  { z:'local', t:"Avant le @ : le nom de ta boîte", x:"La première partie, c'est toi qui la choisis : c'est le nom de ta boîte. On l'écrit sans espace. On utilise souvent le prénom et le nom, séparés par un point.", tip:"prenom.nom : facile à lire et facile à dicter.", a:"Des espaces, des virgules ou des accents." },
  { z:'at', t:"Le @ (arobase)", x:"Le @ sépare le nom de la boîte et le nom du service qui la garde. Il y en a toujours un, et un seul. Sur un clavier AZERTY belge, tu l'obtiens avec les touches Alt Gr et 2.", tip:"Sans @, ce n'est pas une adresse mail.", a:"Oublier le @, ou en taper deux." },
  { z:'domain', t:"Après le @ : le service", x:"Après le @ vient le nom du service (une messagerie, ton école, une entreprise), puis un point, puis une fin comme .be ou .com. On appelle cette partie le domaine.", tip:"Le point du domaine est obligatoire : exemple.be, pas exemplebe.", a:"Oublier le point ou une lettre du domaine." },
  { z:'check', t:"Une seule faute et le mail se perd", x:"Si tu tapes mal une adresse, ton message part chez quelqu'un d'autre ou revient avec une erreur. Avant d'envoyer, relis l'adresse caractère par caractère, surtout quand tu la recopies.", tip:"Une adresse se copie-colle ou se recopie lentement, elle ne se devine pas.", a:"Envoyer un mail important sans avoir relu l'adresse." },
  { z:'choose', t:"Bien choisir son adresse", x:"Choisis une adresse sobre que tu pourras garder longtemps : ce sera peut-être celle de ton CV. Évite les surnoms, les blagues et les informations privées comme ta date de naissance.", tip:"prenom.nom@... est un bon départ. Ajoute un chiffre si elle est déjà prise.", a:"Une adresse comme xX_lea2012_Xx ou lea.mignonne." },
  { z:'usage', t:"Une adresse par usage", x:"Tu peux avoir plusieurs adresses : une pour l'école, une pour ta vie privée, une pour t'inscrire sur des sites et des jeux. Les publicités arrivent alors dans cette dernière et ta boîte principale reste propre.", tip:"Garde une adresse sérieuse pour l'école et pour les adultes.", a:"Utiliser la même adresse pour tout, y compris pour les jeux." },
  { z:'create', t:"Créer son compte", x:"Pour avoir une adresse, tu passes par un service de messagerie. Tu donnes ton prénom et ton nom, tu choisis ton adresse, puis un mot de passe solide que tu ne donnes à personne. Le service peut demander un moyen de récupération, comme une autre adresse, pour retrouver ton compte si tu oublies ton mot de passe. Si tu es jeune, demande à un adulte de t'aider : certains services imposent un âge minimum.", tip:"Un mot de passe différent pour ta messagerie. Le module « Créer un mot de passe solide » t'explique comment.", a:"Réutiliser le mot de passe d'un autre compte." }
];

/* Adresses fictives à juger : « puis-je l'utiliser pour écrire à un professeur ? » */
const ADR = [
  { p:'lea.martin@exemple.be', ok:true, why:"Un nom de boîte clair, un @, un domaine avec son point : l'adresse est correcte et sobre." },
  { p:'lea martin@exemple.be', ok:false, why:"Il y a une espace dans le nom de la boîte. Une adresse ne contient jamais d'espace : on met un point à la place." },
  { p:'lea.martin@exemplebe', ok:false, why:"Le domaine n'a pas de point avant sa fin (.be). L'adresse est incomplète." },
  { p:'lea.martin.exemple.be', ok:false, why:"Le @ est oublié. Sans lui, personne ne sait où est la boîte." },
  { p:'lea,martin@exemple.be', ok:false, why:"Une virgule a pris la place du point. Sur un clavier, le point et la virgule se ressemblent : relis." },
  { p:'xX_lea2012_Xx@exemple.be', ok:false, why:"Elle peut fonctionner, mais elle ressemble à un pseudo de jeu et contient une année de naissance. Pour écrire à un adulte, choisis une adresse sobre." },
  { p:'lea.martin2@exemple.be', ok:true, why:"Le chiffre sert à se distinguer d'une autre Léa Martin. C'est correct, et elle reste sobre." },
  { p:'lea.martin@gmail.be', ok:false, why:"Gmail n'existe pas en .be : son domaine est gmail.com. Le mail ne partirait pas, ou arriverait chez quelqu'un d'autre sur un vrai domaine .be." },
  { p:'lea.martin@gmial.com', ok:false, why:"Deux lettres sont inversées dans « gmail ». Une faute de frappe dans le domaine envoie le message dans le vide." },
  { p:'groscoquin@gmail.com', ok:false, why:"L'adresse est correcte, mais le début ressemble à une blague. Un professeur ou un employeur n'y verra pas une personne sérieuse." },
  { p:'léa.martin@exemple.be', ok:false, why:"L'accent pose problème : beaucoup de services ne le comprennent pas. On écrit lea, sans accent." }
];

/* =====================  PARTIE 2 : À, CC, CCI  ===================== */
const STEPS2 = [
  { z:'to', t:"À : celui qui doit agir", x:"Dans « À », tu écris les personnes à qui tu t'adresses vraiment : celles qui doivent répondre ou faire quelque chose. Tous les destinataires voient les adresses écrites dans « À ».", tip:"Mets en « À » ceux qui ont quelque chose à faire.", a:"Mettre en « À » des personnes qui n'ont rien à faire." },
  { z:'cc', t:"Cc : pour information", x:"« Cc » veut dire copie. Le mot vient du papier carbone, qui faisait une copie d'une lettre. Les personnes en Cc reçoivent le mail pour être au courant, sans devoir répondre. Tout le monde voit leur adresse.", tip:"Un professeur en Cc sait que tu as écrit à ton titulaire.", a:"Mettre beaucoup de monde en Cc : chacun reçoit des échanges qui ne le concernent pas." },
  { z:'cci', t:"Cci : la copie cachée", x:"« Cci » veut dire copie cachée. La personne reçoit le mail, mais les autres destinataires ne voient pas son adresse. Elle, en général, voit ce qui est en « À » et en « Cc ».", tip:"Pour écrire à un groupe de personnes qui ne se connaissent pas, mets-les toutes en « Cci ».", a:"Mettre toute une liste en « À » : chacun reçoit les adresses de tous les autres." },
  { z:'see', t:"Qui voit quoi", x:"Les adresses en « À » et en « Cc » sont visibles par tous les destinataires. Les adresses en « Cci » ne sont visibles que par l'expéditeur et par la personne concernée. Une adresse est une information personnelle : la cacher protège les autres.", tip:"Avant d'envoyer, demande-toi : ces personnes ont-elles le droit de connaître les autres adresses ?", a:"Penser que « Cci » est un détail : une adresse partagée ne se reprend pas." },
  { z:'all', t:"Attention à « Répondre à tous »", x:"Quand un destinataire clique « Répondre à tous », sa réponse part vers l'expéditeur, vers ceux de « À » et vers ceux de « Cc ». Pas vers ceux de « Cci ». Mais si une personne en Cci clique « Répondre à tous », sa réponse arrive chez ceux de « À » et « Cc », qui découvrent qu'elle était dans la boucle.", tip:"Si tu es en Cci, réponds seulement à l'expéditeur.", a:"Cliquer « Répondre à tous » sans regarder qui est en copie." },
  { z:'fair', t:"Cci : à utiliser avec franchise", x:"Le « Cci » protège les adresses d'un groupe. Il ne sert pas à faire lire un échange en cachette à quelqu'un qui ne le sait pas. Si une personne doit être au courant, dis-le : mets-la en « Cc ».", tip:"En cas de doute, demande-toi si la personne en « À » serait gênée de savoir qui est en copie.", a:"Mettre quelqu'un en « Cci » pour surveiller une discussion à son insu." }
];

/* Mise en situation : placer des personnes dans À, Cc ou Cci. Noms et adresses inventés. */
const SIM = [
  { t:"Demander un délai", txt:"Tu écris à Mme Dupont, ta professeure de géographie, pour demander un délai. Tu veux aussi que ton titulaire, M. Bastin, soit au courant.",
    people:[ { n:'Mme Dupont', r:'professeure de géographie', e:'m.dupont@exemple.be', ok:'to', why:"C'est à elle que tu t'adresses et c'est elle qui doit répondre : « À »." },
             { n:'M. Bastin', r:'titulaire', e:'m.bastin@exemple.be', ok:'cc', why:"Il doit être informé, sans répondre : « Cc »." } ] },
  { t:"Un groupe qui ne se connaît pas", txt:"Tu es délégué de classe. Tu envoies le programme de la sortie à quatre élèves de classes différentes, qui ne se connaissent pas.",
    people:[ { n:'Inès', r:'classe 1A', e:'ines.b@exemple.be', ok:'bcc', why:"Elle ne connaît pas les autres : « Cci » garde son adresse privée." },
             { n:'Samir', r:'classe 1B', e:'samir.k@exemple.be', ok:'bcc', why:"Même chose : « Cci »." },
             { n:'Lou', r:'classe 1C', e:'lou.d@exemple.be', ok:'bcc', why:"Même chose : « Cci »." },
             { n:'Noah', r:'classe 1D', e:'noah.p@exemple.be', ok:'bcc', why:"Même chose : « Cci »." } ] },
  { t:"Le travail de groupe", txt:"Tu envoies le compte rendu de ton groupe de travail à tes trois coéquipiers. Tu informes aussi ton professeur, M. Aerts.",
    people:[ { n:'Inès', r:'coéquipière', e:'ines.b@exemple.be', ok:'to', why:"Elle travaille avec toi et doit lire le compte rendu : « À »." },
             { n:'Samir', r:'coéquipier', e:'samir.k@exemple.be', ok:'to', why:"Même chose : « À »." },
             { n:'Lou', r:'coéquipière', e:'lou.d@exemple.be', ok:'to', why:"Même chose : « À ». Ils se connaissent déjà, personne n'a d'adresse à cacher." },
             { n:'M. Aerts', r:'professeur', e:'m.aerts@exemple.be', ok:'cc', why:"Il est informé du travail, sans devoir répondre : « Cc »." } ] }
];

/* =====================  PARTIE 3 : RÉPONDRE, RÉPONDRE À TOUS, TRANSFÉRER  ===================== */
const ACTIONS = [
  { k:'reply', t:'Répondre', x:"Ta réponse part seulement vers l'expéditeur du mail.", use:"Quand ta réponse ne concerne que lui." },
  { k:'all', t:'Répondre à tous', x:"Ta réponse part vers l'expéditeur et vers tous les destinataires visibles, ceux de « À » et ceux de « Cc ».", use:"Quand tout le groupe doit lire ta réponse." },
  { k:'fwd', t:'Transférer', x:"Tu envoies le mail reçu, avec son contenu, à quelqu'un d'autre. Tu choisis toi-même les destinataires.", use:"Quand une personne qui n'était pas dans le mail doit le lire." }
];
const ME = 'Toi';
const MAIL_A = { from:'Mme Dupont', to:['Toi', 'Inès', 'Samir'], cc:['M. Bastin'], subj:'Travail de géographie : prochaine séance' };
const MAIL_B = { from:'La direction', to:[], cc:['60 élèves de 1re année'], subj:'Rappel : sortie de vendredi', many:true };
const MAIL_C = { from:'Samir', to:['Toi'], cc:[], subj:'Mon nouveau numéro', priv:true };
const SCR = [
  { mail:MAIL_A, txt:"Tu veux seulement remercier Mme Dupont pour son mail.", ok:'reply', why:"Ton merci ne concerne qu'elle. « Répondre » évite d'encombrer la boîte d'Inès, de Samir et de M. Bastin." },
  { mail:MAIL_A, txt:"Tu proposes un horaire pour le travail et tout le groupe doit le lire.", ok:'all', why:"Inès, Samir et Mme Dupont sont concernés : « Répondre à tous » les prévient en une fois." },
  { mail:MAIL_A, txt:"Lou était absent et doit lire ce mail pour rattraper le travail.", ok:'fwd', why:"Lou n'est pas dans le mail : il faut le lui transférer. Pense à vérifier que le message ne contient rien de privé." },
  { mail:MAIL_B, txt:"La direction rappelle la sortie à 60 élèves. Tu veux juste confirmer que tu seras présent.", ok:'reply', why:"« Répondre à tous » enverrait ta confirmation aux 60 élèves. « Répondre » suffit : seule la direction la reçoit." },
  { mail:MAIL_C, txt:"Samir t'a donné son numéro de téléphone dans ce mail. Lou te demande de le lui transmettre.", ok:'none', why:"Le numéro de Samir est à lui. Demande-lui d'abord s'il est d'accord. Un transfert envoie aussi tout le message d'origine." }
];
const ACT4 = [ ...ACTIONS, { k:'none', t:'Ne rien envoyer', x:'', use:'' } ];

/* =====================  QUIZ  ===================== */
const QCM = {
  adresse: [
    { q:"Quelle adresse est correcte ?", o:["lea.martin@exemple.be","lea martin@exemple.be","lea.martin.exemple.be"], a:0, why:"Elle a un nom de boîte sans espace, un @ et un domaine avec son point." },
    { q:"Que sépare le @ dans une adresse mail ?", o:["Le nom de la boîte et le nom du service","Le prénom et le nom","L'adresse et le mot de passe"], a:0, why:"Avant le @, le nom de ta boîte. Après le @, le service qui la garde." },
    { q:"Quelle adresse choisis-tu pour écrire à un employeur ?", o:["xX_lea2012_Xx@exemple.be","lea.martin@exemple.be","lea.mignonne@exemple.be"], a:1, why:"Une adresse sobre avec prénom et nom donne une image sérieuse." },
    { q:"Tu as tapé « exemplebe » sans le point dans le domaine. Que risque-t-il d'arriver ?", o:["Le mail ne part pas ou revient en erreur","Rien, il arrive quand même","Le professeur le reçoit en Cci"], a:0, why:"Le domaine est incomplet : le message ne trouve pas la boîte." }
  ],
  destinataires: [
    { q:"Dans quel champ les autres destinataires ne voient-ils pas l'adresse ?", o:["À","Cc","Cci"], a:2, why:"« Cci » veut dire copie cachée : l'adresse n'est visible ni des autres destinataires." },
    { q:"Tu envoies le même mail à quinze élèves de classes différentes qui ne se connaissent pas. Où mets-tu leurs adresses ?", o:["En Cc","En Cci","Toutes en À"], a:1, why:"En « Cci », chaque élève garde son adresse privée." },
    { q:"Que mets-tu en Cc ?", o:["Une personne qui doit être informée sans devoir répondre","Une personne dont l'adresse doit rester cachée","Une personne qui ne doit pas savoir que tu écris"], a:0, why:"« Cc » : pour information, et tout le monde voit l'adresse." },
    { q:"Qui reçoit la réponse quand quelqu'un clique « Répondre à tous » ?", o:["L'expéditeur, ceux de « À » et ceux de « Cc »","Seulement l'expéditeur","Tout le monde, même ceux en Cci"], a:0, why:"Les personnes en « Cci » ne sont pas dans la réponse." }
  ],
  repondre: [
    { q:"Un mail a été envoyé à dix personnes. Tu veux répondre seulement à l'expéditeur. Que choisis-tu ?", o:["Répondre","Répondre à tous","Transférer"], a:0, why:"« Répondre » n'envoie ta réponse qu'à l'expéditeur." },
    { q:"Que fait « Répondre à tous » ?", o:["Il envoie ta réponse à l'expéditeur et à tous les destinataires visibles","Il envoie le mail à tous tes contacts","Il transfère le mail à l'expéditeur"], a:0, why:"Les destinataires visibles sont ceux de « À » et de « Cc »." },
    { q:"Quand utilises-tu « Transférer » ?", o:["Pour faire lire un mail à quelqu'un qui n'était pas dans les destinataires","Pour répondre à l'expéditeur","Pour supprimer le mail"], a:0, why:"« Transférer » envoie le mail reçu à de nouvelles personnes." },
    { q:"Avant de transférer un mail, que vérifies-tu ?", o:["Qu'il ne contient pas d'informations privées","Que le mail est court","Rien, un transfert est toujours sans risque"], a:0, why:"Le transfert envoie tout le message d'origine, avec ses adresses et ses informations." }
  ]
};
const BANK_EXTRA = [
  { part:1, q:"Combien de @ contient une adresse mail ?", o:["Un seul","Deux","Aucun"], a:0, why:"Un seul @ sépare le nom de la boîte du service." },
  { part:1, q:"Pourquoi avoir une adresse pour l'école et une pour les jeux ?", o:["Pour que ta boîte sérieuse ne reçoive pas les publicités","Parce que c'est obligatoire","Pour raccourcir ton mot de passe"], a:0, why:"Une adresse par usage garde ta boîte principale propre." },
  { part:1, q:"Tu recopies une adresse pour un mail important. Que fais-tu avant d'envoyer ?", o:["Je la relis caractère par caractère","Je l'écris en majuscules","Je la mets en Cci"], a:0, why:"Une seule lettre fausse envoie le message à quelqu'un d'autre." },
  { part:2, q:"Qui voit qu'une personne a été mise en Cci ?", o:["L'expéditeur et la personne elle-même","Tous les destinataires","Seulement ceux de « À »"], a:0, why:"Les autres destinataires ne voient pas son adresse." },
  { part:2, q:"Pourquoi éviter de mettre beaucoup de monde en Cc ?", o:["Chacun reçoit des réponses qui ne le concernent pas et les adresses sont visibles","Le mail ne part pas","Le mail devient plus long"], a:0, why:"« Cc » est pour informer quelques personnes, pas un groupe entier." },
  { part:2, q:"Pourquoi ne pas mettre quelqu'un en Cci à son insu pour surveiller une discussion ?", o:["Ce n'est pas franc : si la personne doit savoir, mets-la en Cc","Parce que le mail ne partirait pas","Parce que Cci est réservé aux professeurs"], a:0, why:"« Cci » protège des adresses, il ne sert pas à cacher des échanges." },
  { part:3, q:"Une personne en Cci clique « Répondre à tous ». Que se passe-t-il ?", o:["Sa réponse arrive chez ceux de « À » et « Cc »","Rien, le bouton ne marche pas","Sa réponse reste cachée"], a:0, why:"Ceux de « À » et « Cc » découvrent alors qu'elle était en copie." },
  { part:3, q:"Que contient un mail transféré ?", o:["Le message d'origine, avec ce qui était écrit dedans","Seulement l'objet","Ton mot de passe"], a:0, why:"Fais attention à ce que le message d'origine révèle." },
  { part:3, q:"Tu cliques « Répondre à tous » par erreur sur un mail envoyé à 60 personnes. Que se passe-t-il ?", o:["Les 60 personnes lisent ta réponse","Rien","Seul l'expéditeur la lit"], a:0, why:"Vérifie toujours les destinataires avant d'envoyer." }
];
const BANK = () => [ ...QCM.adresse.map(q => ({ ...q, part:1 })), ...QCM.destinataires.map(q => ({ ...q, part:2 })), ...QCM.repondre.map(q => ({ ...q, part:3 })), ...BANK_EXTRA ];
const FQ_COUNT = 10;

const PARTS = [
  { k:'adresse', n:1, title:"Comprendre et choisir son adresse", hl:'adresse', img:'keypace-perso-adresse-email', desc:"Les morceaux d'une adresse mail, comment la choisir et la créer. Fais défiler : chaque étape allume la zone correspondante.", prev:['8 étapes','Adresses à juger','Quiz'] },
  { k:'destinataires', n:2, title:'À, Cc et Cci', hl:'Cc et Cci', img:'keypace-mascot-mail-allonge', desc:"Qui reçoit quoi, qui voit quelles adresses. Puis place toi-même les destinataires dans trois situations.", prev:['6 étapes','3 situations','Quiz'] },
  { k:'repondre', n:3, title:'Répondre, répondre à tous, transférer', hl:'répondre à tous', img:'keypace-perso-netiquette', desc:"Trois boutons, trois effets. Décide lequel utiliser dans cinq situations, et vois qui reçoit ton message.", prev:['3 boutons','5 situations','Quiz'] }
];
const hlTitle = p => p.title.replace(p.hl, `<em>${p.hl}</em>`);
const $ = s => document.querySelector(s);
const shuffle = a => a.map(x => [Math.random(), x]).sort((x,y) => x[0]-y[0]).map(x => x[1]);
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);
const srcRow = ids => '';   /* pastilles de sources retirées de l'affichage (données conservées dans SRC) */
const store = { get(){ try{ return JSON.parse(localStorage.getItem('kp-adresse-done')||'{}'); }catch(e){ return {}; } }, set(o){ try{ localStorage.setItem('kp-adresse-done', JSON.stringify(o)); }catch(e){} } };
let done = store.get(), io = null, tmr = null;
const BEST_KEY = 'kp-adresse-quiz-best';
const getBest = () => { try{ return +localStorage.getItem(BEST_KEY) || 0; }catch(e){ return 0; } };
const setBest = n => { try{ localStorage.setItem(BEST_KEY, String(n)); }catch(e){} };
const allDone = () => PARTS.every(p => done[p.k]);
function completePart(k){
  done[k] = true; store.set(done);
  const f = $('#finish'), p = PARTS.find(x => x.k === k);
  if (f && '#adresse/'+p.n === location.hash){ f.textContent = 'Terminée ✓'; f.className = 'btn ok'; const r = $('#restart'); if (r) r.hidden = false; refreshNext(); }
}
function refreshNext(){ const nx = $('#next4'); if (!nx) return; if (allDone()){ nx.textContent = 'Quiz final →'; nx.onclick = () => { location.hash = 'adresse/quiz'; }; } }
function show(id){ document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === id)); window.scrollTo(0,0); }

function route(){
  if (io){ io.disconnect(); io = null; }
  clearInterval(tmr);
  const h = location.hash.replace('#','');
  if (h === 'adresse') return renderHub();
  if (h === 'adresse/messagerie') return renderPlat();
  if (h === 'adresse/quiz') return allDone() ? renderFinalQuiz() : renderHub();
  const m = h.match(/^adresse\/(\d)$/);
  if (m && PARTS[m[1]-1]) return renderLesson(PARTS[m[1]-1]);
  renderHub();
}
window.addEventListener('hashchange', route);
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g){ if (g.dataset.go === 'cours'){ location.href = '/?view=lessons'; return; } location.hash = g.dataset.go === 'hub' ? 'adresse' : g.dataset.go; return; }
  if (e.target.id === 'restart'){ const p = PARTS.find(x => '#adresse/'+x.n === location.hash); if (p) renderLesson(p); return; }
  if (e.target.id === 'reset-all'){ if (confirm("Effacer ta progression dans ce module ? Tu pourras tout refaire depuis le début.")){ done = {}; store.set(done); try{ localStorage.removeItem(BEST_KEY); }catch(err){} renderHub(); } return; }
  if (e.target.id === 'finish'){ const p = PARTS.find(x => '#adresse/'+x.n === location.hash); if (p){ completePart(p.k); location.hash = 'adresse'; } }
});

/* ---------------- Hub ---------------- */
function partCard(p){
  const d = done[p.k];
  return `<button class="part ${d?'done':''}" onclick="location.hash='adresse/${p.n}'">
    <div class="mini">${MINI[p.k]}</div>
    ${d ? '<span class="badge-done">Terminée ✓</span>' : ''}
    <h3>${p.title}</h3><p>${p.desc}</p>
    <div class="prev">${p.prev.map(x => `<span>${x}</span>`).join('')}</div>
    <div class="foot"><span class="dur">Partie ${p.n}</span><span class="cta">${d?'Revoir':'Ouvrir'} →</span></div>
  </button>`;
}
function quizBanner(n){
  const all = n === PARTS.length, best = getBest();
  if (!all) return `<section class="qbanner locked"><img src="/images/keypace-pose-6.webp" alt="">
    <div class="qb-txt"><span class="qb-tag">Quiz final · 🔒 Verrouillé</span><h2>Le quiz de l'adresse mail</h2><p>Termine les 3 parties pour le débloquer. Il reprend tout le module, question après question, au hasard.</p></div>
    <div class="qb-act"><div class="qb-prog"><i style="width:${n/PARTS.length*100}%"></i></div><span style="font-size:12.5px;color:var(--muted)">${n}/${PARTS.length} parties terminées</span></div></section>`;
  return `<section class="qbanner"><img src="/images/keypace-pose-6.webp" alt="">
    <div class="qb-txt"><span class="qb-tag">Module terminé, bravo !</span><h2>Teste-toi avec le quiz <em>de l'adresse mail</em></h2><p>${FQ_COUNT} questions tirées au hasard dans toutes les parties, une à la fois. Tu peux rejouer autant de fois que tu veux.</p>
      <div class="qb-meta"><span>${FQ_COUNT} questions</span><span>Au hasard</span>${best ? `<span>Meilleur score : ${best}/${FQ_COUNT}</span>` : ''}</div></div>
    <div class="qb-act"><button class="btn primary" onclick="location.hash='adresse/quiz'" style="font-size:16px;padding:14px 26px">Jouer →</button></div></section>`;
}
function renderHub(){
  const n = PARTS.filter(p => done[p.k]).length, all = n === PARTS.length;
  $('#hub-prog').textContent = n + '/' + PARTS.length + ' parties';
  $('#hub-bar').style.width = (n/PARTS.length*100) + '%';
  $('#hub-meta').innerHTML = `<div class="ring" style="--p:${n/PARTS.length*100}"><i>${n}/${PARTS.length}</i></div><span>parties terminées</span>${n ? '<button class="linkbtn" id="reset-all">Réinitialiser ma progression</button>' : ''}`;
  const nextK = all ? null : (PARTS.find(p => !done[p.k]) || {}).k, mascots = ['cheer','idea','books'];
  $('#parts-host').innerHTML = `<div class="road">${PARTS.map((p,i) => `
    <div class="stop ${done[p.k]?'done':''} ${p.k===nextK?'next':''}">
      ${partCard(p)}
      <div class="node">${done[p.k] ? '✓' : p.n}</div>
      <div class="side">${p.k===nextK ? `<img src="/images/keypace-mascot-${mascots[i]}.webp" alt=""><span class="bubble">${n ? 'Tu en es là !' : 'Commence ici !'}</span>` : ''}</div>
    </div>`).join('')}</div>${quizBanner(n)}${platCard()}`;
  startRecDemo();
  show('v-hub');
}

/* ---------------- Quiz final et QCM ---------------- */
function drawFinalDeck(){
  const bank = shuffle(BANK()), deck = [];
  [1,2,3].forEach(pt => bank.filter(q => q.part === pt).slice(0,2).forEach(q => deck.push(q)));
  bank.filter(q => !deck.includes(q)).slice(0, FQ_COUNT - deck.length).forEach(q => deck.push(q));
  return shuffle(deck).map(q => { const idx = shuffle(q.o.map((_,i) => i)); return { ...q, o:idx.map(i => q.o[i]), a:idx.indexOf(q.a) }; });
}
function renderFinalQuiz(){
  $('#crumb-part').textContent = 'Quiz final'; $('#lesson-pos').textContent = 'Quiz final';
  $('#lesson-hero').innerHTML = `<div class="hero small"><div class="wrap"><div class="txt"><span class="tag">Quiz final</span><h1>Le quiz <em>de l'adresse mail</em></h1><p>${FQ_COUNT} questions tirées au hasard dans toutes les parties. Une à la fois, dans un ordre différent à chaque partie.</p></div><img src="/images/keypace-mascot-cheer.webp" alt=""></div></div>`;
  $('#lesson-root').innerHTML = `<div id="fq"></div><div class="lesson-foot"><button class="btn" onclick="location.hash='adresse'">← Retour au module</button><span></span></div>`;
  show('v-lesson'); initFinalQuiz($('#fq'));
}
function initFinalQuiz(el){
  let deck = drawFinalDeck(), i = 0, picked = null, res = [];
  const draw = () => {
    if (i >= deck.length){
      const sc = res.filter(Boolean).length, N = deck.length, best = getBest(), isBest = sc > best;
      if (isBest) setBest(sc);
      const msg = sc === N ? 'Sans faute ! Tu maîtrises l\'adresse mail, le Cc et le Cci.' : sc >= N*0.8 ? 'Excellent, presque parfait.' : sc >= N*0.5 ? 'Bien joué, encore quelques points à revoir.' : 'Pas facile ! Reprends les parties puis retente.';
      const missed = deck.map((q,k) => ({ q, ok:res[k] })).filter(x => !x.ok);
      el.innerHTML = `<section class="qz" style="margin-top:34px"><div class="qz-top"><h2>Résultat du quiz</h2></div>
        <div class="res"><div class="score">${sc}/${N}</div><div><p style="font-size:17px;font-weight:600">${msg}</p><p style="color:var(--muted);font-size:14px">${isBest && sc > 0 ? 'Nouveau meilleur score !' : `Meilleur score : ${Math.max(best, sc)}/${N}`}</p></div></div>
        ${missed.length ? `<div class="miss-list"><b style="font-family:'Bricolage Grotesque',sans-serif;font-size:17px">À revoir</b>${missed.map(x => `<div><span class="fq-part">Partie ${x.q.part}</span> ${x.q.q}<small>Bonne réponse : ${x.q.o[x.q.a]}. ${x.q.why}</small></div>`).join('')}</div>` : ''}
        <div class="btnrow" style="margin-top:22px"><button class="btn primary" id="fq-again">Rejouer avec de nouvelles questions</button><button class="btn" onclick="location.hash='adresse'">Retour au module</button></div></section>`;
      $('#fq-again').onclick = () => { deck = drawFinalDeck(); i = 0; picked = null; res = []; draw(); window.scrollTo(0,0); };
      return;
    }
    const c = deck[i];
    el.innerHTML = `<section class="qz" style="margin-top:34px">
      <div class="qz-top"><span class="fq-part">Partie ${c.part} · ${PARTS[c.part-1].title}</span><div class="dots">${deck.map((_,j) => `<i class="${j<i?(res[j]?'ok':'ko'):j===i?'cur':''}"></i>`).join('')}</div></div>
      <div class="q">${c.q}</div>
      <div class="opts">${c.o.map((o,j) => { let cl = 'opt'; if (picked !== null){ if (j === c.a) cl += ' right'; else if (j === picked) cl += ' wrong'; }
        return `<button class="${cl}" data-j="${j}" ${picked!==null?'disabled':''}><span class="k">${'ABCD'[j]}</span>${o}</button>`; }).join('')}</div>
      ${picked !== null ? `<div class="fb ${picked===c.a?'ok':'ko'}"><b>${picked===c.a?'Exact.':'Pas tout à fait.'}</b> ${c.why}</div>
        <div class="btnrow" style="margin-top:16px"><button class="btn primary" id="fq-next">${i<deck.length-1?'Question suivante →':'Voir mon résultat'}</button></div>` : ''}
      <p style="margin-top:18px;font-size:13px;color:var(--muted)">Question ${i+1} sur ${deck.length}</p></section>`;
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => { picked = +b.dataset.j; res[i] = picked === c.a; draw(); });
    const nx = $('#fq-next'); if (nx) nx.onclick = () => { i++; picked = null; draw(); };
  };
  draw();
}
const shuffleQ = list => list.map(q => { const idx = shuffle(q.o.map((_,i) => i)); return { ...q, o:idx.map(i => q.o[i]), a:idx.indexOf(q.a) }; });
function initQCM(el, p){
  let Q = shuffleQ(QCM[p.k]), i = 0, picked = null, res = [];
  const draw = () => {
    if (i >= Q.length){
      const s = res.filter(Boolean).length;
      const msg = s === Q.length ? 'Sans faute, bravo !' : s >= Q.length-1 ? 'Presque parfait.' : s >= 2 ? 'Bon début, relis les points manqués.' : 'Reprends la partie, puis retente.';
      el.innerHTML = `<section class="qz"><div class="qz-top"><h2>Quiz terminé</h2></div>
        <div class="res"><div class="score">${s}/${Q.length}</div><div><p style="font-size:17px;font-weight:600">${msg}</p><p style="color:var(--muted);font-size:14px">Partie validée : tu peux passer à la suite quand tu veux.</p></div></div>
        <div class="btnrow" style="margin-top:20px"><button class="btn" id="qz-again">Refaire le quiz</button>${PARTS[p.n] ? `<button class="btn primary" onclick="location.hash='adresse/${p.n+1}'">${PARTS[p.n].title} →</button>`:''}</div></section>`;
      $('#qz-again').onclick = () => { Q = shuffleQ(QCM[p.k]); i = 0; picked = null; res = []; draw(); };
      completePart(p.k); return;
    }
    const c = Q[i];
    el.innerHTML = `<section class="qz"><div class="qz-top"><h2>Petit quiz <em>de fin de partie</em></h2><div class="dots">${Q.map((_,j) => `<i class="${j<i?(res[j]?'ok':'ko'):j===i?'cur':''}"></i>`).join('')}</div></div>
      <div class="q">${c.q}</div>
      <div class="opts">${c.o.map((o,j) => { let cl = 'opt'; if (picked !== null){ if (j === c.a) cl += ' right'; else if (j === picked) cl += ' wrong'; }
        return `<button class="${cl}" data-j="${j}" ${picked!==null?'disabled':''}><span class="k">${'ABCD'[j]}</span>${o}</button>`; }).join('')}</div>
      ${picked !== null ? `<div class="fb ${picked===c.a?'ok':'ko'}"><b>${picked===c.a?'Exact.':'Pas tout à fait.'}</b> ${c.why}</div>
        <div class="btnrow" style="margin-top:16px"><button class="btn primary" id="qz-next">${i<Q.length-1?'Question suivante →':'Voir mon résultat'}</button></div>` : ''}</section>`;
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => { picked = +b.dataset.j; res[i] = picked === c.a; draw(); });
    const nx = $('#qz-next'); if (nx) nx.onclick = () => { i++; picked = null; draw(); };
  };
  draw();
}

/* ---------------- Leçon ---------------- */
function renderLesson(p){
  $('#crumb-part').textContent = p.title;
  $('#lesson-pos').textContent = 'Partie ' + p.n + ' sur ' + PARTS.length;
  $('#lesson-hero').innerHTML = `<div class="hero small"><div class="wrap"><div class="txt"><span class="tag">Partie ${p.n} sur ${PARTS.length}</span><h1>${hlTitle(p)}</h1><p>${p.desc}</p></div><img src="/images/${p.img}.webp" alt=""></div></div>`;
  $('#lesson-root').innerHTML = '<div id="lesson-body"></div><div id="lesson-quiz"></div>' + footer(p);
  show('v-lesson');
  ({ adresse:initAdresse, destinataires:initDest, repondre:initRepondre })[p.k]($('#lesson-body'));
  if (QCM[p.k]) initQCM($('#lesson-quiz'), p);
}
function footer(p){
  const prev = PARTS[p.n-2], next = PARTS[p.n];
  const nextBtn = next ? `<button class="btn dark" onclick="location.hash='adresse/${next.n}'">${next.title} →</button>`
    : (allDone() ? `<button class="btn dark" id="next4" onclick="location.hash='adresse/quiz'">Quiz final →</button>` : `<button class="btn dark" id="next4" onclick="location.hash='adresse'">Retour au module</button>`);
  return `<div class="lesson-foot">
    ${prev ? `<button class="btn" onclick="location.hash='adresse/${prev.n}'">← ${prev.title}</button>` : `<button class="btn" onclick="location.hash='adresse'">← Retour au module</button>`}
    <span class="foot-grp"><button class="btn" id="restart" ${done[p.k]?'':'hidden'}>↺ Recommencer cette partie</button>
    <button class="btn ${done[p.k]?'ok':'primary'}" id="finish">${done[p.k] ? 'Terminée ✓' : 'Terminer cette partie'}</button></span>${nextBtn}</div>`;
}

/* ---------------- Hub : aperçus des cartes ---------------- */
const MINI = {
  adresse:`<div class="mA"><span class="a1">lea.martin</span><b>@</b><span class="a2">exemple.be</span></div>`,
  destinataires:`<div class="mB"><div class="r on" id="dm-0"><i>À</i><u></u></div><div class="r" id="dm-1"><i>Cc</i><u></u></div><div class="r" id="dm-2"><i>Cci</i><u></u></div></div>`,
  repondre:`<div class="mC"><span>Répondre</span><span id="dm-r" class="on">Répondre à tous</span><span>Transférer</span></div>`
};
function startRecDemo(){
  let i = 0;
  const tick = () => { const r = [0,1,2].map(k => $('#dm-'+k)); const c = $('#dm-r'); if (!r[0] || !c) return; r.forEach((x,k) => x.classList.toggle('on', k === i % 3)); c.classList.toggle('on', i % 2 === 0); i++; };
  tick(); tmr = setInterval(tick, 1500);
}
const people = l => l.length ? l.join(', ') : '(vide)';

/* ---------------- Aide commune : défilement avec zones ---------------- */
function anatHTML(S, card, cap){
  return `<div class="anat">
    <div>${S.map((s,i) => `<article class="step" data-i="${i}">
      <div class="t"><span class="n">${String(i+1).padStart(2,'0')}</span><h3>${s.t}</h3></div>
      <p class="x">${s.x}</p>
      <div style="display:grid;gap:10px"><div class="tip"><b>Astuce :</b> ${s.tip}</div><div class="avoid"><b>À éviter :</b> ${s.a}</div></div>
    </article>`).join('')}</div>
    <div class="stk"><div class="cap"><span>${cap}</span><b id="active-label"></b></div>${card}</div>
  </div>`;
}
function bindAnat(el, S){
  const steps = [...el.querySelectorAll('.step')], zones = [...el.querySelectorAll('[data-z]')];
  const set = i => { const on = [].concat(S[i].z); steps.forEach((s,j) => s.classList.toggle('on', j === i)); zones.forEach(zn => zn.classList.toggle('on', on.includes(zn.dataset.z)));
    $('#active-label').textContent = String(i+1).padStart(2,'0') + ' · ' + S[i].t; };
  set(0);
  io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) set(+en.target.dataset.i); }), { rootMargin:'-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
}

/* ---------------- Partie 1 : l'adresse ---------------- */
function initAdresse(el){
  const z = (k, inner, cls) => `<div class="zone ${cls||''}" data-z="${k}">${inner}</div>`;
  const card = `<div class="adrcard">
    ${z('what','<div class="adr-h"><span class="mb">✉</span><div><b>Ma boîte mail</b><small>Reçoit et envoie des messages</small></div></div>')}
    <h4>Mon adresse</h4>
    <div class="adr-big"><span class="zone" data-z="local">lea.martin</span><span class="zone" data-z="at">@</span><span class="zone" data-z="domain">exemple.be</span></div>
    <div class="adr-lab"><span>nom de la boîte</span><span></span><span>le service (domaine)</span></div>
    ${z('domain','<div class="svc-row">'+[['gmail','gmail.com'],['outlook','outlook.com'],['yahoo','yahoo.com'],['icloud','icloud.com'],['proton','proton.me'],['proximus','proximus.be']].map(x => `<span>${svcBadge(x[0], 30)}<i>${x[1]}</i></span>`).join('')+'</div><p class="svc-cap">Des services connus. Un domaine d\'école ou d\'entreprise ne dit pas quelle messagerie il utilise.</p>')}
    <h4>Relire avant d'envoyer</h4>
    ${z('check','<div class="adr-ck"><span class="y">lea.martin@exemple.be ✓</span><span class="n">lea.martin@exemplebe ✗</span></div>')}
    <h4>Bien choisir</h4>
    ${z('choose','<div class="adr-ck"><span class="y">lea.martin@exemple.be</span><span class="n">xX_lea2012_Xx@exemple.be</span></div>')}
    <h4>Une adresse par usage</h4>
    ${z('usage','<div class="adr-use"><span><b>École</b> lea.martin@ecole-exemple.be</span><span><b>Privé</b> lea.martin@exemple.be</span><span><b>Jeux et sites</b> lea.jeux@exemple.be</span></div>')}
    <h4>Créer un compte</h4>
    ${z('create','<div class="adr-form"><span><i>Prénom</i>Léa</span><span><i>Nom</i>Martin</span><span><i>Adresse</i>lea.martin@exemple.be</span><span><i>Mot de passe</i>••••••••••••••••</span><span><i>Récupération</i>une autre adresse</span></div>')}
  </div>`;
  el.innerHTML = anatHTML(STEPS, card, "Exemple fictif : la boîte de Léa") + `<div id="adr-extra"></div>`;
  bindAnat(el, STEPS);
  initJuger($('#adr-extra'));
}
/* ---------------- Repères visuels : pastilles des services ---------------- */
/* Pastilles simplifiées aux couleurs des services, pas les logos officiels. Pour utiliser un vrai logo : déposer images/mail/<clé>.svg (ou .png) et ajouter la clé dans LOGO_FILE, ex. { gmail:'svg' }. */
const LOGO_FILE = { gmail:'svg', outlook:'svg', proton:'svg', icloud:'png', yahoo:'jpeg', zimbra:'png', proximus:'png', smartschool:'png' };
const ENV = c => `<rect x="6.5" y="9.5" width="19" height="13" rx="2.2" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M7.5 11.5l8.5 6.5 8.5-6.5" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
const SVC = {
  gmail:{ name:'Gmail', kind:'messagerie grand public (Google)', bg:'#fff', mark:ENV('#EA4335'), line:true },
  outlook:{ name:'Outlook / Hotmail', kind:'messagerie grand public (Microsoft)', bg:'#0F6CBD', mark:ENV('#fff') },
  yahoo:{ name:'Yahoo Mail', kind:'messagerie grand public', bg:'#6001D2', txt:'y!' },
  icloud:{ name:'iCloud Mail', kind:'messagerie grand public (Apple)', bg:'#3B9BF5', mark:'<path d="M11.5 22.5a4.2 4.2 0 0 1-.4-8.4 6.2 6.2 0 0 1 11.9-1.2 4.8 4.8 0 0 1-.6 9.6z" fill="#fff"/>' },
  proton:{ name:'Proton Mail', kind:'messagerie grand public (Proton)', bg:'#6D4AFF', txt:'P' },
  proximus:{ name:'Proximus', kind:"adresse Proximus (@skynet.be, @proximus.be ou @belgacom.net)", bg:'#5B2D8E', txt:'P' },
  zimbra:{ name:'Zimbra', kind:"messagerie d'école ou d'entreprise", bg:'#3B4A6B', txt:'Z' },
  smartschool:{ name:'Smartschool', kind:"plateforme d'école, messagerie interne (pas une adresse mail avec @)", bg:'#F2561D', txt:'S' },
  autre:{ name:'Autre domaine', kind:'service inconnu', bg:'#8A8275', mark:ENV('#fff') }
};
const SVC_DOM = { 'gmail.com':'gmail', 'googlemail.com':'gmail', 'outlook.com':'outlook', 'outlook.be':'outlook', 'outlook.fr':'outlook', 'hotmail.com':'outlook', 'hotmail.be':'outlook', 'hotmail.fr':'outlook', 'live.com':'outlook', 'live.be':'outlook', 'live.fr':'outlook', 'msn.com':'outlook', 'yahoo.com':'yahoo', 'yahoo.fr':'yahoo', 'icloud.com':'icloud', 'me.com':'icloud', 'proton.me':'proton', 'protonmail.com':'proton', 'skynet.be':'proximus', 'proximus.be':'proximus', 'belgacom.net':'proximus' };
function svcBadge(k, size){
  const v = SVC[k] || SVC.autre, n = size || 32;
  if (LOGO_FILE[k]) return `<img class="svc" src="/images/mail/${k}.${LOGO_FILE[k]}" width="${n}" height="${n}" alt="${esc(v.name)}">`;
  return `<svg class="svc" width="${n}" height="${n}" viewBox="0 0 32 32" role="img" aria-label="${esc(v.name)}"><rect x=".75" y=".75" width="30.5" height="30.5" rx="8" fill="${v.bg}" ${v.line ? 'stroke="#DDD6C8" stroke-width="1.5"' : ''}/>${v.txt ? `<text x="16" y="22" text-anchor="middle" font-family="Bricolage Grotesque,sans-serif" font-weight="800" font-size="17" fill="#fff">${v.txt}</text>` : v.mark}</svg>`;
}
/* Analyse d'une adresse : règles de forme, domaine douteux, adresse peu sérieuse. Heuristique, sans réseau : rien n'est envoyé. */
const DOM_OK = ['gmail.com','googlemail.com','outlook.com','outlook.be','outlook.fr','hotmail.com','hotmail.be','hotmail.fr','live.com','live.be','live.fr','yahoo.com','yahoo.fr','icloud.com','me.com','proton.me','protonmail.com','skynet.be','telenet.be','proximus.be','scarlet.be','voo.be','belgacom.net','msn.com','gmx.com','gmx.fr','orange.fr','free.fr','laposte.net'];
const BRAND_END = { gmail:['com'], googlemail:['com'], outlook:['com','be','fr'], hotmail:['com','be','fr'], live:['com','be','fr'], icloud:['com'], proton:['me'], protonmail:['com'] };
const TLD_OK = ['be','com','fr','net','org','eu','nl','de','uk','ch','lu','info','edu','io','co','es','it','ca','us','brussels','vlaanderen'];
const DOM_EXEMPLE = ['exemple.be','example.com','example.org','test.com','exemple.com','domaine.be','domaine.com','email.com','mail.com'];
const JOKE_SUB = ['coquin','sexy','sexe','killer','gamer','swag','prout','zizi','caca','pipi','mignon','chaton','gosse','gangster','ninja','merde','chatte'];
const JOKE_TOK = ['gros','bg','boss','king','queen','cool','hot','love','lol','mdr','ptdr','noob','dark','bebe','chou','poulet','nul','xx','xxx','cutie','sweet','crazy','fou','folle','star','best'];
function lev(a, b){ const d = Array.from({ length:a.length+1 }, (_,i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)); return d[a.length][b.length]; }
function analyseAdresse(v){
  const at = (v.match(/@/g) || []).length, loc = v.split('@')[0], dom = (v.split('@')[1] || '').toLowerCase();
  const domOk = /^[^@\s.][^@\s]*\.[^@\s.]{2,}$/.test(dom) && !/\.\./.test(dom);
  const rules = [
    [at === 1, "Un seul @"],
    [at >= 1 && loc.length > 0, "Un nom de boîte avant le @"],
    [!/\s/.test(v), "Pas d'espace"],
    [!/[^\x00-\x7F]/.test(v) && !/,/.test(v), "Pas d'accent ni de virgule"],
    [!/^\./.test(loc) && !/\.$/.test(loc) && !/\.\./.test(loc), "Pas de point au début, à la fin ou deux fois de suite dans le nom de la boîte"],
    [domOk, "Un domaine avec un point et une fin (.be, .com)"]
  ];
  const warns = [];
  const l = loc.toLowerCase();
  if (at === 1 && domOk){
    const parts = dom.split('.'), tld = parts[parts.length-1], brand = parts[0];
    if (!DOM_OK.includes(dom) && !DOM_EXEMPLE.includes(dom)){
      const near = DOM_OK.map(d => [d, lev(dom, d)]).sort((a,b) => a[1]-b[1])[0];
      if (BRAND_END[brand] && parts.length === 2 && !BRAND_END[brand].includes(tld)) warns.push(`Le service « ${brand} » existe, mais pas avec « .${tld} ». Essaie : ${BRAND_END[brand].map(e => brand + '.' + e).join(' ou ')}.`);
      else if (near[1] <= 2) warns.push(`Le domaine « ${dom} » ressemble à « ${near[0]} », un service connu. Une faute de frappe ?`);
      else if (!TLD_OK.includes(tld)) warns.push(`La fin « .${tld} » est très rare pour une adresse mail. Vérifie le domaine.`);
      else if (parts.length === 2 && parts[0].length <= 2 && !/^\d+$/.test(parts[0])) warns.push(`Le nom de domaine « ${parts[0]} » est très court. Vérifie qu'il existe.`);
    }
    if (/^\d+$/.test(parts[0])) warns.push("Un nom de domaine fait uniquement de chiffres est très inhabituel.");
  }
  if (l){
    const toks = l.split(/[._\-+0-9]+/).filter(Boolean);
    const joke = JOKE_SUB.find(s => l.includes(s)) || toks.find(t => JOKE_TOK.includes(t));
    if (joke) warns.push("Le début de l'adresse ressemble à un pseudo ou à une blague. Pour écrire à un professeur ou à un employeur, choisis prenom.nom.");
    if (/(19|20)\d{2}/.test(l) || /\d{6,8}/.test(l)) warns.push("Elle contient une année ou une date de naissance : c'est une information privée, mieux vaut l'éviter.");
    else if (/\d{4,}/.test(l)) warns.push("Une longue suite de chiffres donne une adresse difficile à retenir et peu sérieuse.");
    if (/^[xX]+[_.\-]|[_.\-][xX]+$/.test(loc) || /_{2,}|-{2,}/.test(l)) warns.push("Les décorations comme xX_..._Xx font penser à un pseudo de jeu.");
    if (/(.)\1{3,}/.test(l)) warns.push("Une lettre répétée plusieurs fois (aaaa, looool) donne une adresse peu sérieuse.");
    if (/^\d+$/.test(l)) warns.push("Une adresse faite uniquement de chiffres ne dit pas qui tu es.");
    if (l.length > 30) warns.push("Cette adresse est très longue : difficile à dicter ou à recopier.");
    else if (l.length < 3 && at === 1) warns.push("Très courte : cette adresse est probablement déjà prise.");
  }
  let svc = null;
  if (at === 1 && domOk) svc = SVC_DOM[dom] ? { key:SVC_DOM[dom], known:true } : { key:'autre', known:false };
  return { rules, warns, svc };
}
function initJuger(el){
  let S = ADR.map(() => null);
  const draw = () => {
    const nDone = S.filter(x => x !== null).length, good = S.filter((x,i) => x !== null && x === ADR[i].ok).length;
    el.innerHTML = `<div class="aw">
      <h2 class="aw-h2">Peut-on l'utiliser ?</h2>
      <p class="aw-intro" style="margin-top:0">Ces adresses sont inventées. Pour chacune, dis si tu peux l'utiliser pour écrire à un professeur.</p>
      <div class="tri-list">${ADR.map((t,i) => {
        const a = S[i], ans = a !== null, right = ans && a === t.ok;
        return `<div class="tri ${ans ? (right ? 'ok' : 'ko') : ''}">
          <div class="tri-top"><div class="pwfield"><span>${esc(t.p)}</span></div>
          <div class="tri-b">${ans ? `<span class="tri-res">${right ? '✓ Bien vu' : '✗ Pas tout à fait'}</span>` : `<button class="btn" data-t="${i}-1">Oui</button><button class="btn" data-t="${i}-0">Non</button>`}</div></div>
          ${ans ? `<p class="tri-why"><b>${t.ok ? 'Oui.' : 'Non.'}</b> ${t.why}</p>` : ''}</div>`; }).join('')}</div>
      <div class="btnrow" style="margin-top:18px;align-items:center">${nDone === ADR.length ? `<span class="msg" style="color:var(--mod-d)">${good}/${ADR.length} bien jugées</span><button class="btn" id="tri-again">Recommencer</button>` : `<span class="hint2">${nDone}/${ADR.length} répondues</span>`}</div>
      <h2 class="aw-h2">Teste une adresse</h2>
      <p class="aw-intro" style="margin-top:0">Tape une adresse : on vérifie chaque règle. Rien n'est envoyé ni enregistré.</p>
      <div class="chk"><input id="chk-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="prenom.nom@exemple.be"><div id="chk-out"></div></div>
    </div>`;
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const [i, v] = b.dataset.t.split('-'); S[+i] = v === '1'; const y = scrollY; draw(); scrollTo(0, y); });
    const ag = $('#tri-again'); if (ag) ag.onclick = () => { S = ADR.map(() => null); draw(); };
    const inp = $('#chk-in'), out = $('#chk-out');
    const check = () => {
      const v = inp.value;
      if (!v){ out.innerHTML = ''; return; }
      const r = analyseAdresse(v);
      const errs = r.rules.filter(x => !x[0]).length;
      out.innerHTML = r.rules.map(x => `<div class="${x[0] ? 'y' : 'n'}">${x[0] ? '✓' : '✗'} ${x[1]}</div>`).join('')
        + r.warns.map(w => `<div class="w">⚠ ${w}</div>`).join('')
        + `<p class="chk-res ${errs ? '' : r.warns.length ? 'w' : 'y'}">${errs ? 'Il reste une erreur à corriger.' : r.warns.length ? "La forme est correcte, mais regarde les points d'attention." : "Cette adresse a la bonne forme et reste sobre. Il reste à vérifier que c'est la bonne personne."}</p>`
        + (r.svc && !errs ? `<div class="svc-card">${svcBadge(r.svc.key, 40)}<div><b>${r.svc.known ? SVC[r.svc.key].name : 'Domaine non reconnu'}</b><small>${r.svc.known ? 'Cette adresse vient d\'un service : ' + SVC[r.svc.key].kind + '.' : "Ça peut être une école, une entreprise ou un autre service. L'adresse ne dit pas quelle messagerie est derrière."}</small></div></div>` : '')
        + `<p class="chk-note">Ce test repère les fautes courantes. Il ne peut pas savoir si la boîte existe vraiment : seul un envoi le dira.</p>`;
    };
    inp.oninput = check;
  };
  draw();
}

/* ---------------- Partie 2 : À, Cc, Cci ---------------- */
function initDest(el){
  const z = (k, inner) => `<div class="zone" data-z="${k}">${inner}</div>`;
  const row = (l, v) => `<div class="mrow"><span class="l">${l}</span><span>${v}</span></div>`;
  const card = `<div class="cmp"><div class="cmp-h">Nouveau message</div>
    ${z('to', row('À', 'm.dupont@exemple.be'))}
    ${z('cc', row('Cc', 'm.bastin@exemple.be'))}
    ${z('cci', row('Cci', 'ines.b@exemple.be, samir.k@exemple.be'))}
    ${row('Objet', 'Travail de géographie')}
    <div class="cmp-body">Bonjour Madame, voici le compte rendu de notre groupe...</div>
    ${z('see','<div class="legend"><span class="v">À et Cc : adresses visibles par tous</span><span class="h">Cci : adresses cachées</span></div>')}
    ${z('all','<div class="legend"><span class="v">Répondre à tous : expéditeur + À + Cc</span><span class="h">Pas les Cci</span></div>')}
    ${z('fair','<div class="legend"><span class="v">Cci : pour protéger des adresses</span><span class="h">Pas pour surveiller</span></div>')}
  </div>`;
  el.innerHTML = anatHTML(STEPS2, card, "Exemple fictif : un mail d'élève") + `<div id="sim-host"></div>`;
  bindAnat(el, STEPS2);
  initSim($('#sim-host'));
}
function initSim(el){
  let s = 0, placed = SIM.map(sc => sc.people.map(() => null)), view = SIM.map(() => 0), checked = SIM.map(() => false);
  const KL = { to:'À', cc:'Cc', bcc:'Cci' };
  const draw = () => {
    const sc = SIM[s], pl = placed[s], ck = checked[s], all = pl.every(x => x), v = view[s];
    const by = k => sc.people.filter((p,i) => pl[i] === k);
    const names = k => by(k).map(p => p.n);
    const vp = sc.people[v], vk = pl[v];
    const seen = vk
      ? `<div class="rv-box"><div class="rv-t">Ce que voit ${esc(vp.n)}</div>
         <div class="rv-l"><b>De</b> Toi</div>
         <div class="rv-l"><b>À</b> ${esc(people(names('to')))}</div>
         <div class="rv-l"><b>Cc</b> ${esc(people(names('cc')))}</div>
         <div class="rv-n">${vk === 'bcc' ? "Il est en copie cachée : il voit « À » et « Cc », mais les autres ne savent pas qu'il a reçu le mail." : "Il ne voit aucune adresse en « Cci »" + (by('bcc').length ? `. Les ${by('bcc').length} personnes en copie cachée lui restent inconnues.` : '.')}</div></div>`
      : `<div class="rv-box"><div class="rv-n">Place ${esc(vp.n)} dans un champ pour voir ce qu'il reçoit.</div></div>`;
    el.innerHTML = `<div class="aw"><h2 class="aw-h2">À toi de placer les destinataires</h2>
      <div class="sim-tabs">${SIM.map((x,i) => `<button class="${i===s?'on':''}" data-s="${i}">${i+1}. ${x.t}${checked[i] && placed[i].every((k,j) => k === x.people[j].ok) ? ' ✓' : ''}</button>`).join('')}</div>
      <p class="aw-intro" style="margin:12px 0 18px">${sc.txt}</p>
      <div class="sim">
        <div class="sim-l">${sc.people.map((p,i) => `<div class="sp ${ck ? (pl[i] === p.ok ? 'ok' : 'ko') : ''}">
          <div class="sp-n"><b>${esc(p.n)}</b><small>${esc(p.r)}</small></div>
          <div class="sp-b">${['to','cc','bcc'].map(k => `<button class="${pl[i]===k?'on':''}" data-p="${i}-${k}" ${ck?'disabled':''}>${KL[k]}</button>`).join('')}</div>
          ${ck ? `<p class="sp-w">${pl[i] === p.ok ? '✓ ' : '✗ Mieux : « ' + KL[p.ok] + ' ». '}${p.why}</p>` : ''}</div>`).join('')}</div>
        <div class="sim-r"><div class="cmp"><div class="cmp-h">Ton mail</div>
          <div class="mrow"><span class="l">À</span><span>${esc(people(names('to')))}</span></div>
          <div class="mrow"><span class="l">Cc</span><span>${esc(people(names('cc')))}</span></div>
          <div class="mrow"><span class="l">Cci</span><span>${esc(people(names('bcc')))}</span></div></div>
          <div class="rv-sel">Voir ce que reçoit : <select id="rv-pick">${sc.people.map((p,i) => `<option value="${i}" ${i===v?'selected':''}>${esc(p.n)}</option>`).join('')}</select></div>${seen}</div>
      </div>
      <div class="btnrow" style="margin-top:18px;align-items:center">${ck ? `<button class="btn" id="sim-again">Recommencer cette situation</button>${SIM[s+1] ? `<button class="btn primary" data-s="${s+1}">Situation suivante →</button>` : ''}` : `<button class="btn primary" id="sim-check" ${all?'':'disabled'}>Vérifier</button><span class="hint2">${all ? 'Tout est placé.' : 'Place chaque personne dans À, Cc ou Cci.'}</span>`}</div></div>`;
    el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { s = +b.dataset.s; draw(); });
    el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const [i, k] = b.dataset.p.split('-'); pl[+i] = pl[+i] === k ? null : k; view[s] = +i; draw(); });
    $('#rv-pick').onchange = e => { view[s] = +e.target.value; draw(); };
    const c = $('#sim-check'); if (c) c.onclick = () => { checked[s] = true; draw(); };
    const a = $('#sim-again'); if (a) a.onclick = () => { placed[s] = sc.people.map(() => null); checked[s] = false; draw(); };
  };
  draw();
}

/* ---------------- Partie 3 : répondre, répondre à tous, transférer ---------------- */
function recipients(k, m){
  if (k === 'reply') return [m.from];
  if (k === 'all') return [m.from, ...m.to.filter(x => x !== ME), ...m.cc];
  if (k === 'fwd') return ['La personne que tu choisis', 'Avec le message d\'origine'];
  return [];
}
function initRepondre(el){
  const bodyMail = m => `<div class="cmp"><div class="cmp-h">Mail reçu</div>
    <div class="mrow"><span class="l">De</span><span>${esc(m.from)}</span></div>
    <div class="mrow"><span class="l">À</span><span>${esc(people(m.to))}</span></div>
    <div class="mrow"><span class="l">Cc</span><span>${esc(people(m.cc))}</span></div>
    <div class="mrow"><span class="l">Objet</span><span>${esc(m.subj)}</span></div></div>`;
  el.innerHTML = `<div class="aw">
    <p class="aw-intro">Quand tu reçois un mail, trois boutons te permettent de réagir. Ils ne font pas la même chose : choisir le mauvais, c'est envoyer ton message à des personnes qui n'en ont pas besoin.</p>
    <div class="q3">${ACTIONS.map((a,i) => `<div><b>${i+1}</b><h4>${a.t}</h4><p>${a.x}</p><p style="color:var(--mod-d);font-weight:600">${a.use}</p></div>`).join('')}</div>
    <h2 class="aw-h2">Que choisis-tu ?</h2><div id="scr-host"></div></div>`;
  const host = $('#scr-host');
  let i = 0, picked = null, res = [];
  const draw = () => {
    if (i >= SCR.length){
      const sc = res.filter(Boolean).length;
      host.innerHTML = `<div class="res"><div class="score">${sc}/${SCR.length}</div><div><p style="font-size:17px;font-weight:600">${sc === SCR.length ? 'Sans faute !' : sc >= 3 ? 'Bien joué, relis les points manqués.' : 'Reprends les trois boutons puis réessaie.'}</p></div></div>
        <div class="btnrow" style="margin-top:16px"><button class="btn" id="scr-again">Recommencer</button></div>`;
      $('#scr-again').onclick = () => { i = 0; picked = null; res = []; draw(); };
      return;
    }
    const c = SCR[i];
    host.innerHTML = `<div class="sim-tabs scr-dots">${SCR.map((_,j) => `<i class="${j<i?(res[j]?'ok':'ko'):j===i?'cur':''}"></i>`).join('')}</div>
      <div class="scr">${bodyMail(c.mail)}
      <div class="scr-r"><p class="aw-intro" style="margin:0 0 14px">${c.txt}</p>
        <div class="scr-b">${ACT4.map(a => `<button class="btn ${picked===a.k ? (a.k===c.ok?'ok':'bad') : (picked!==null && a.k===c.ok ? 'ok' : '')}" data-a="${a.k}" ${picked!==null?'disabled':''}>${a.t}</button>`).join('')}</div>
        ${picked !== null ? `<div class="fb ${picked===c.ok?'ok':'ko'}" style="margin-top:14px"><b>${picked===c.ok?'Exact.':'Pas tout à fait.'}</b> ${c.why}</div>
          <div class="rcp"><b>Avec « ${ACT4.find(a => a.k===picked).t} », qui reçoit ton message ?</b>${picked==='none' ? '<span class="chip0">Personne</span>' : recipients(picked, c.mail).map(n => `<span class="chip">${esc(n)}</span>`).join('')}</div>
          <div class="btnrow" style="margin-top:14px"><button class="btn primary" id="scr-next">${i<SCR.length-1?'Situation suivante →':'Voir mon résultat'}</button></div>` : ''}</div></div>
      <p style="margin-top:14px;font-size:13px;color:var(--muted)">Situation ${i+1} sur ${SCR.length}</p>`;
    host.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { picked = b.dataset.a; res[i] = picked === c.ok; draw(); });
    const n = $('#scr-next'); if (n) n.onclick = () => { i++; picked = null; draw(); };
  };
  draw();
}

/* =====================  POUR ALLER PLUS LOIN : SUR TA MESSAGERIE (facultatif)  ===================== */
/* Écrans simplifiés : ils ressemblent à la messagerie sans la copier. Sources : aides officielles Microsoft, Google et Zimbra, voir _research_adresse_mail.md. */
const PLAT = {
  smartschool: { key:'smartschool', name:'Smartschool', sub:"Smartschool, messagerie de l'école", skin:'pf-ss', newBtn:'Rédiger un nouveau message', cc:'fields', read:'icons',
    facts:[ "Smartschool a sa propre messagerie, interne à l'école : on écrit aux membres de l'école depuis l'onglet « Messages », sans adresse en @.",
            "Dans un mode d'emploi d'école, la fenêtre de rédaction propose les champs À, Cc et Cci, chacun avec une croix verte pour choisir les personnes ou les groupes dans une liste.",
            "Les personnes se choisissent dans une liste : les comptes principaux et les comptes secondaires sont séparés (les parents ne se trouvent pas dans les comptes principaux).",
            "Les boutons sont surtout des icônes : survole-les pour lire leur nom avant de cliquer.",
            "Les écrans changent selon la version de Smartschool et les réglages de ton école : le mode d'emploi consulté date de 2018-2019." ] },
  outlook: { key:'outlook', name:'Outlook', sub:'Outlook sur le web', skin:'pf-ol', newBtn:'+ Nouveau message', cc:'links', read:'top',
    facts:[ "Avec « + Nouveau message », les champs Cc et Cci se choisissent à droite de la ligne « À ». Ils ne sont pas tous affichés au départ.",
            "Répondre, Répondre à tous et Transférer sont en haut à droite du message que tu lis. Selon la version, ils sont regroupés dans un menu « Autres actions ».",
            "« Envoyer plus tard » se trouve dans le menu « Actions d'envoi ».",
            "Dans le nouvel Outlook pour Windows, le champ Cci s'affiche par « Options », puis « Afficher les champs », puis « Afficher cci »." ] },
  gmail: { key:'gmail', name:'Gmail', sub:'Gmail sur ordinateur', skin:'pf-gm', newBtn:'Nouveau message', cc:'links', read:'below',
    facts:[ "Le bouton « Nouveau message » est en haut à gauche. Dans la fenêtre, Cc et Cci se déplient à droite de la ligne « À ».",
            "Répondre, Répondre à tous et Transférer sont sous le message.",
            "Juste après l'envoi, « Annuler » apparaît en bas à gauche pendant quelques secondes. Pratique pour rattraper une faute dans l'adresse.",
            "La flèche à côté d'Envoyer permet « Programmer l'envoi »." ] },
  zimbra: { key:'zimbra', name:'Zimbra', sub:'Zimbra, webmail', skin:'pf-zm', newBtn:'Nouveau', cc:'options', read:'bar',
    facts:[ "Zimbra existe en plusieurs versions (Modern et Classic) : l'écran de ton école ou de ton fournisseur peut être un peu différent de celui-ci.",
            "Dans certaines versions, le champ Cci est caché au départ : il faut passer par « Options » pour l'afficher.",
            "Répondre, Répondre à tous et Transférer sont dans la barre d'outils quand un message est ouvert.",
            "Quand tu tapes dans À, Cc ou Cci, Zimbra propose des adresses prises dans tes contacts : vérifie que c'est la bonne avant de valider." ] }
};
const PLAT_ORDER = ['smartschool', 'outlook', 'gmail', 'zimbra'];
function platCard(){
  return `<section class="optcard"><div class="opt-txt"><span class="qb-tag">Pour aller plus loin · Facultatif</span><h2>Sur ta <em>messagerie</em></h2>
    <p>Cc, Cci et les boutons de réponse ne sont pas toujours au même endroit. Entraîne-toi sur un écran proche de Smartschool, d'Outlook, de Gmail ou de Zimbra. Tu peux le faire quand tu veux, avec ou sans le quiz.</p>
    <div class="qb-meta"><span>Smartschool</span><span>Outlook</span><span>Gmail</span><span>Zimbra</span></div></div>
    <div class="qb-act"><button class="btn primary" onclick="location.hash='adresse/messagerie'">Ouvrir →</button></div></section>`;
}
function renderPlat(){
  $('#crumb-part').textContent = 'Sur ta messagerie'; $('#lesson-pos').textContent = 'Pour aller plus loin';
  $('#lesson-hero').innerHTML = `<div class="hero small"><div class="wrap"><div class="txt"><span class="tag">Pour aller plus loin</span><h1>Sur ta <em>messagerie</em></h1><p>Le principe est le même partout : À, Cc, Cci et trois boutons de réponse. Ce qui change, c'est l'endroit où ils se cachent. Choisis ta messagerie et fais les deux missions.</p></div><img src="/images/keypace-mascot-mail-allonge.webp" alt=""></div></div>`;
  $('#lesson-root').innerHTML = `<div id="plat-host"></div><div class="lesson-foot"><button class="btn" onclick="location.hash='adresse'">← Retour au module</button><span></span></div>`;
  show('v-lesson');
  const PS = {}; PLAT_ORDER.forEach(k => PS[k] = { ccOpen:false, optOpen:false, ccShown:false, bccShown:false, replied:false, msg:'' });
  let cur = PLAT_ORDER[0];
  const host = $('#plat-host');
  const readBar = (key, st) => {
    const P = PLAT[key], btn = (k, ic, lb) => `<button class="rb" data-rb="${k}"><span class="ic">${ic}</span>${lb}</button>`;
    const ico = P.read === 'icons', ib = (k, ic, lb) => `<button class="rb ico" data-rb="${k}" title="${lb}" aria-label="${lb}">${ic}</button>`;
    const bs = ico ? ib('reply','↩','Répondre') + ib('all','↩↩','Répondre à tous') + ib('fwd','➜','Transférer') : btn('reply','↩','Répondre') + btn('all','↩↩','Répondre à tous') + btn('fwd','➜','Transférer');
    return bs;
  };
  const draw = () => {
    const P = PLAT[cur], st = PS[cur], k1 = st.bccShown, k2 = st.replied;
    const mA = MAIL_A;
    const ccLinks = P.cc === 'links' ? `<span class="trg"><button data-trg="cc">Cc</button><button data-trg="bcc">Cci</button></span>` : '';
    const opt = P.cc === 'options' ? `<div class="tb"><span>Envoyer</span><span>Joindre</span><button data-trg="opt">Options ▾</button>${st.optOpen ? `<div class="dd"><button data-trg="showbcc">Afficher Cci</button></div>` : ''}</div>` : `<div class="tb"><span class="send">Envoyer</span></div>`;
    const compose = `<div class="pf-win"><div class="pf-top"><b>${svcBadge(P.key, 22)}${P.name}</b><span>${P.newBtn}</span></div>
      ${opt}
      ${P.cc === 'fields' ? `<div class="pf-tabs"><span class="on">Comptes principaux</span><span>Comptes secondaires</span></div>
      <div class="pf-row"><label>À</label><span>Mme Dupont</span><button class="pl" data-trg="to" title="Choisir des personnes" aria-label="Choisir des personnes pour À">+</button></div>
      <div class="pf-row"><label>Cc</label><span></span><button class="pl" data-trg="cc" title="Choisir des personnes" aria-label="Choisir des personnes pour Cc">+</button></div>
      <div class="pf-row ${st.bccShown ? 'ok' : ''}"><label>Cci</label><span></span><button class="pl" data-trg="bcc" title="Choisir des personnes" aria-label="Choisir des personnes pour Cci">+</button></div>`
      : `<div class="pf-row"><label>À</label><span>m.dupont@exemple.be</span>${ccLinks}</div>`}
      ${P.cc === 'fields' ? '' : st.ccShown ? `<div class="pf-row"><label>Cc</label><span>(ajoute ici les personnes informées)</span></div>` : ''}
      ${P.cc === 'fields' ? '' : st.bccShown ? `<div class="pf-row ok"><label>Cci</label><span>(ajoute ici les adresses à cacher)</span></div>` : ''}
      <div class="pf-row"><label>Objet</label><span>Travail de géographie</span></div>
      <div class="pf-body">Bonjour Madame,</div></div>`;
    const read = `<div class="pf-win"><div class="pf-top"><b>${svcBadge(P.key, 22)}${P.name}</b><span>Boîte de réception</span></div>
      ${P.read === 'top' ? `<div class="rbar top">${readBar(cur, st)}</div>` : ''}
      ${P.read === 'bar' || P.read === 'icons' ? `<div class="rbar bar">${readBar(cur, st)}</div>` : ''}
      <div class="pf-msg"><b>${esc(mA.subj)}</b><div>De : ${esc(mA.from)}</div><div>À : ${esc(mA.to.join(', '))}</div><div>Cc : ${esc(mA.cc.join(', '))}</div>
      <p>Bonjour, pouvez-vous me dire quel jour vous préférez pour la prochaine séance ? Merci.</p></div>
      ${P.read === 'below' ? `<div class="rbar below">${readBar(cur, st)}</div>` : ''}</div>`;
    host.innerHTML = `<div class="aw"><div class="sim-tabs">${PLAT_ORDER.map(k => `<button class="${k===cur?'on':''}" data-pf="${k}">${svcBadge(PLAT[k].key, 20)}<span>${PLAT[k].name}</span>${PS[k].bccShown && PS[k].replied ? ' ✓' : ''}</button>`).join('')}</div>
      <p class="aw-intro" style="margin:12px 0 4px">${P.sub}. Clique pour faire les deux missions.</p>
      <div class="pf ${P.skin}">
        <div class="pf-col"><div class="aw-step"><b>1</b>${P.cc === 'fields' ? 'Trouve le champ Cci' : 'Fais apparaître le champ Cci'}</div>${compose}
          <p class="pf-msgbox ${k1 ? 'ok' : ''}">${k1 ? (P.cc === 'fields' ? '✓ Bravo : c\'est le champ Cci. Il est déjà là, sous À et Cc.' : '✓ Bravo : le champ Cci est affiché.') : esc(st.msg1 || 'Clique là où tu penses trouver Cci.')}</p></div>
        <div class="pf-col"><div class="aw-step"><b>2</b>Réponds à tout le monde</div>${read}
          <p class="pf-msgbox ${k2 ? 'ok' : ''}">${k2 ? '✓ Exact : « Répondre à tous » prévient Mme Dupont, Inès, Samir et M. Bastin.' : esc(st.msg2 || 'Mme Dupont a écrit à plusieurs personnes. Clique sur le bon bouton.')}</p></div>
      </div>
      ${k1 && k2 ? `<div class="pf-facts"><h3>À retenir sur ${P.name}</h3><ul>${P.facts.map(f => `<li>${f}</li>`).join('')}</ul></div>` : ''}
      ${PLAT_ORDER.every(k => PS[k].bccShown && PS[k].replied) ? `<div class="fb ok" style="margin-top:16px"><b>Toutes les messageries sont faites.</b> Le principe est le même : seul l'endroit change.</div>` : ''}
      <p class="aw-foot">Écrans simplifiés, inspirés de ces messageries. Selon ta version et ton réglage, les boutons peuvent avoir une autre place ou seulement une icône. Les adresses et les personnes sont inventées. Rien n'est envoyé.</p></div>`;
    host.querySelectorAll('[data-pf]').forEach(b => b.onclick = () => { cur = b.dataset.pf; draw(); });
    host.querySelectorAll('[data-trg]').forEach(b => b.onclick = () => {
      const t = b.dataset.trg;
      if (t === 'cc'){ st.ccShown = true; st.msg1 = "Ça, c'est Cc : la copie visible par tous. Cherche Cci, la copie cachée."; }
      else if (t === 'to'){ st.msg1 = "Ça, c'est À : le destinataire principal. Cherche Cci."; }
      else if (t === 'bcc' || t === 'showbcc'){ st.bccShown = true; st.optOpen = false; }
      else if (t === 'opt'){ st.optOpen = !st.optOpen; st.msg1 = st.optOpen ? "Un menu s'ouvre. Regarde ce qu'il propose." : ''; }
      draw();
    });
    host.querySelectorAll('[data-rb]').forEach(b => b.onclick = () => {
      const a = b.dataset.rb;
      if (a === 'all'){ st.replied = true; }
      else st.msg2 = a === 'reply' ? "« Répondre » n'écrit qu'à Mme Dupont. Tu veux que tout le groupe lise." : "« Transférer » envoie le mail à quelqu'un d'autre. Tu veux répondre au groupe.";
      draw();
    });
  };
  draw();
}

route();
