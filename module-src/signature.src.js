/* Module « Créer sa signature de mail » : même moteur que les modules adresse, mail, CV et mot de passe. Rien de ce que l'élève tape ou charge (logo, photo) n'est envoyé : tout reste dans son navigateur. Les personnes et les écoles des exemples sont inventées. */
/* =====================  PARTIE 1 : À QUOI SERT UNE SIGNATURE  ===================== */
const STEPS0 = [
  { z:'forget', t:"Ne rien oublier", x:"Quand on écrit vite, on oublie facilement de dire qui on est. Une signature s'ajoute toute seule à la fin du message : ton nom, ta classe et ton école sont toujours là, même les jours où tu es pressé.", tip:"Une fois réglée, tu n'y penses plus.", a:"Compter sur sa mémoire : un mail sur trois part sans classe ni école." },
  { z:'struct', t:"Un message structuré et professionnel", x:"Avec la même signature à chaque message, tes mails ont toujours la même présentation. Le destinataire retrouve vite l'information, et ton message fait sérieux, comme celui d'un adulte qui écrit pour son travail.", tip:"Une présentation stable inspire confiance.", a:"Une fin de message différente à chaque fois, tantôt complète, tantôt vide." },
  { z:'env', t:"Adaptée à ton environnement", x:"On n'écrit pas la même chose à un professeur, à un employeur pour un stage ou à un club. La signature s'adapte : l'école et la classe pour l'école, d'autres informations pour un stage. Beaucoup de messageries permettent d'avoir plusieurs signatures et de choisir la bonne.", tip:"Une signature pour l'école, une autre pour tes démarches de stage.", a:"Utiliser la signature de l'école pour écrire à un club de loisirs." },
  { z:'manual', t:"Tu n'es jamais obligé d'en régler une", x:"Une signature automatique est pratique, mais elle est toujours facultative. Tu peux écrire ton nom, ta classe et ton école à la main à la fin de chaque mail. C'est tout à fait correct, à condition de ne rien oublier.", tip:"Écrire à la main reste permis. Garde alors un petit modèle à copier-coller.", a:"Croire qu'un mail sans signature automatique est « mal fait »." },
  { z:'text', t:"Enregistrer une signature manuelle, sans image", x:"Une signature peut être seulement du texte : tu l'écris une fois dans les paramètres, et elle s'ajoute ensuite toute seule. Pas besoin d'image, de logo ni de photo. Une signature texte est légère, lisible partout et ne peut pas être bloquée par le destinataire.", tip:"Du texte seul suffit très bien, y compris pour un message à un professeur.", a:"Croire qu'une vraie signature doit avoir un logo ou une photo." },
  { z:'eco', t:"Une image a un coût pour la planète", x:"Un mail envoyé, reçu, stocké puis relu utilise de l'énergie : ton appareil, celui du destinataire, les réseaux et les serveurs. Une image de signature est renvoyée avec chaque message, y compris dans les réponses, et conservée dans toutes les boîtes qui les gardent. Plus l'image est lourde en pixels et en poids, plus cet effet grandit.", tip:"Les chiffres varient selon les études et les années : retiens surtout le principe, plus c'est lourd et répété, plus ça pèse.", a:"Une grande image de plusieurs mégaoctets recopiée dans chaque mail, juste pour décorer." },
  { z:'sober', t:"Rester sobre", x:"Si tu choisis quand même une image, garde-la petite : un logo d'environ 200 pixels de large, bien compressé. Évite les photos lourdes, les images animées et les bannières. Moins d'images, c'est moins d'énergie, et un mail qui s'affiche plus vite.", tip:"Pose-toi la question : cette image apporte-t-elle quelque chose que le texte ne dit pas ?", a:"Ajouter une bannière, une photo et un logo dans la même signature." }
];

/* =====================  PARTIE 2 : QUE METTRE DANS UNE SIGNATURE  ===================== */
const STEPS = [
  { z:'what', t:"À quoi sert une signature", x:"La signature, c'est le petit bloc qui s'ajoute tout seul à la fin de tes mails. Elle dit qui tu es, sans que tu doives le retaper à chaque fois. Un professeur ou un employeur qui reçoit ton message sait tout de suite à qui il répond.", tip:"Elle se règle une seule fois dans ta messagerie, ensuite elle s'ajoute toute seule.", a:"Écrire ton nom à la main à la fin de chaque mail, en oubliant parfois ta classe." },
  { z:'name', t:"Ton prénom et ton nom", x:"C'est l'information la plus importante. Écris ton prénom et ton nom complets, avec des majuscules. Un professeur qui a plusieurs élèves prénommés Léa doit savoir de laquelle il s'agit.", tip:"Prénom et nom, dans cet ordre, en un peu plus gros que le reste.", a:"Un prénom seul, un surnom ou un pseudo." },
  { z:'class', t:"Ta classe et ton année", x:"Pour un élève, la classe est ce qui permet de te situer : « 2e secondaire, classe 2B ». Le professeur sait alors dans quel groupe te trouver, même s'il ne te connaît pas encore.", tip:"Année d'étude et classe sur la même ligne, séparées par une virgule ou un point.", a:"Oublier la classe : le professeur ne sait pas dans quel groupe te chercher." },
  { z:'school', t:"Ton école et l'année scolaire", x:"Ajoute le nom de ton école. L'année scolaire (par exemple 2026-2027) évite la confusion quand on relit un vieux mail : on sait à quelle année il correspond. Tu la changeras à la rentrée.", tip:"Mets-toi un rappel en septembre pour mettre ta signature à jour.", a:"Garder en 2027 une signature qui dit encore 2026-2027." },
  { z:'contact', t:"Comment te joindre", x:"Ton adresse mail est déjà visible : inutile de la répéter dans la signature. Pour un élève, un numéro de téléphone n'est en général pas nécessaire. Si tu veux en mettre un, que ce soit celui que tes parents ont accepté.", tip:"En cas de doute, ne mets rien : on peut toujours te répondre par mail.", a:"Donner ton numéro personnel ou ton adresse de domicile à tous ceux qui reçoivent un mail de toi." },
  { z:'greet', t:"La formule de politesse", x:"Elle précède ton nom : « Cordialement », « Bien à vous », « Bonne journée ». Elle reste sobre. Tu peux l'écrire dans le message plutôt que dans la signature : choisis l'un ou l'autre, pas les deux.", tip:"Une seule formule, toujours polie, même pour un mail court.", a:"« Bisous » ou « Salut » pour écrire à un professeur ou à un employeur." },
  { z:'visual', t:"Logo et photo : facultatifs", x:"Le logo de l'école peut donner un air sérieux. Une petite photo est possible si tu le souhaites et si tu es à l'aise : ce n'est jamais obligatoire. Dans les deux cas, ils restent petits et ne prennent pas plus de place que le texte.", tip:"Demande à ton école si elle autorise l'usage de son logo.", a:"Une grande image qui écrase le message, ou une photo de vacances." },
  { z:'avoid', t:"Ce qu'il ne faut pas mettre", x:"Évite les citations, les blagues, les drapeaux, les couleurs vives et les polices fantaisie. Évite aussi toute information privée : adresse de ta maison, numéro de registre national, date de naissance. Tout ce qui est dans la signature est envoyé à tous ceux à qui tu écris.", tip:"Relis ta signature comme si elle allait à un inconnu.", a:"Un long texte de présentation ou un avertissement sur les mails que tu envoies." }
];

/* Signatures fictives à juger : « convient-elle pour un élève qui écrit à un professeur ? » */
const SIGS = [
  { l:["Cordialement,","Léa Martin","2e secondaire, classe 2B","École Saint-Exemple"], ok:true, why:"Nom complet, classe, école : tout ce qu'il faut, et rien de privé." },
  { l:["Léa Martin","2B","Rue des Lilas 12, 5000 Namur","GSM : 0470 12 34 56"], ok:false, why:"L'adresse de la maison et un numéro personnel n'ont pas leur place dans une signature : tous les destinataires les reçoivent." },
  { l:["Léa","La vie est un jeu, joue-la bien !"], ok:false, why:"Un prénom seul et une citation. Le professeur ne sait ni qui tu es, ni dans quelle classe, et la citation fait peu sérieux." },
  { l:["Léa Martin","2e secondaire, classe 2B","École Saint-Exemple, année scolaire 2026-2027"], ok:true, why:"L'année scolaire est un plus : on sait à quelle période le mail a été écrit." },
  { l:["Lea Martin ☆ 2B ☆","Envoyé avec amour depuis mon téléphone"], ok:false, why:"Décorations et phrase automatique. Elle ne dit pas ton école, et les symboles s'affichent mal sur certains appareils." },
  { l:["Envoyé de mon iPhone"], ok:false, why:"C'est la signature automatique du téléphone. Elle ne dit pas qui tu es : remplace-la par la tienne." },
  { l:["Bien à vous,","Léa Martin","Élève de 2B, École Saint-Exemple","(petit logo de l'école)"], ok:true, why:"Sobre, claire, avec un petit logo facultatif qui ne prend pas toute la place." },
  { l:["Léa Martin","Pour toute question, contactez-moi.","Ce message est confidentiel et ne doit pas être transmis."], ok:false, why:"Trop long pour une signature d'élève. L'avertissement de confidentialité ne sert à rien ici et alourdit chaque message." }
];

/* =====================  PARTIE 2 : UNE SIGNATURE QUI SE LIT BIEN  ===================== */
const STEPS2 = [
  { z:'short', t:"Court : quatre lignes au plus", x:"Une signature n'est pas une carte de visite complète. Quatre lignes suffisent : formule, nom, classe, école. Au-delà, le message qu'elle accompagne passe au second plan.", tip:"Si tu hésites sur une ligne, supprime-la.", a:"Dix lignes, trois liens et deux citations." },
  { z:'font', t:"Une police et une taille normales", x:"Garde la police de ton message, ou une police simple comme Arial. Écris ton nom un peu plus gros, le reste à la taille du texte. Les polices fantaisie ne s'affichent pas chez tout le monde : chez le destinataire, elles sont remplacées par une autre.", tip:"Une seule police, une seule couleur d'accent.", a:"Trois polices différentes et des lettres de toutes les couleurs." },
  { z:'color', t:"Une couleur sobre", x:"Une couleur d'accent, foncée, pour ton nom ou un trait : bleu, vert foncé, gris. Le texte reste noir ou gris foncé pour rester lisible, y compris sur un écran en mode sombre ou une impression.", tip:"Teste : ta signature se lit-elle bien sur fond blanc et sur fond noir ?", a:"Du jaune clair sur fond blanc, illisible." },
  { z:'img', t:"Une image légère", x:"Quand tu ajoutes un logo ou une photo, réduis-la : quelques centaines de pixels de large suffisent. Une grande image alourdit chaque mail et consomme plus d'énergie à chaque envoi, et certains destinataires la reçoivent comme une pièce jointe.", tip:"Logo : environ 200 pixels de large. Photo : un petit carré ou un rond.", a:"Une photo prise au téléphone, de plusieurs mégaoctets, collée telle quelle." },
  { z:'text', t:"Le texte reste du texte", x:"Si toute ta signature est une image, certaines messageries l'affichent comme un trou : par défaut, elles bloquent parfois les images jusqu'à ce que le destinataire accepte de les voir. Ton nom et ta classe doivent donc aussi exister en texte.", tip:"Image pour le logo, texte pour le nom, la classe et l'école.", a:"Une signature faite d'une seule image : si l'image est bloquée, il ne reste rien." },
  { z:'check', t:"Teste avant de l'utiliser", x:"Après l'avoir créée, envoie-toi un mail à toi-même, ou à un adulte de confiance. Regarde sur ordinateur et, si tu peux, sur téléphone. Vérifie que tout est bien aligné, que rien ne manque et que ça reste lisible.", tip:"Un test, c'est trente secondes. Une faute dans une signature se répète dans tous tes mails.", a:"L'activer sans jamais l'avoir vue dans un vrai message." }
];

/* =====================  QUIZ  ===================== */
const QCM = {
  utilite: [
    { q:"À quoi sert une signature automatique ?", o:["À ne rien oublier et à garder une présentation structurée","À rendre le mail plus lourd","À remplacer le texte du message"], a:0, why:"Elle ajoute toujours les mêmes informations utiles, sans que tu aies à les retaper." },
    { q:"Es-tu obligé d'avoir une signature automatique ?", o:["Non, tu peux l'écrire à la main à chaque mail","Oui, sinon le mail ne part pas","Oui, ton école l'exige toujours"], a:0, why:"C'est facultatif. L'important est de ne rien oublier." },
    { q:"Une signature enregistrée doit-elle contenir une image ?", o:["Non, du texte seul suffit","Oui, un logo est obligatoire","Oui, une photo est obligatoire"], a:0, why:"Une signature texte est légère et lisible partout." },
    { q:"Pourquoi limiter les images dans une signature ?", o:["Elles sont renvoyées avec chaque message et consomment de l'énergie","Elles sont interdites par la loi","Elles font changer l'adresse mail"], a:0, why:"Plus l'image est lourde et répétée, plus l'impact écologique augmente." }
  ],
  contenu: [
    { q:"Quelle information est la plus importante dans la signature d'un élève ?", o:["Son prénom et son nom complets","Son adresse de domicile","Sa citation préférée"], a:0, why:"Le professeur doit savoir à qui il répond." },
    { q:"Pourquoi indiquer sa classe ?", o:["Pour que le professeur sache dans quel groupe te trouver","Parce que c'est obligatoire","Pour faire plus long"], a:0, why:"Plusieurs élèves peuvent porter le même prénom." },
    { q:"Que ne mets-tu pas dans une signature ?", o:["Ton adresse de domicile et ton numéro de registre national","Ton école","Ton prénom"], a:0, why:"Tout ce qui est dans la signature part à tous tes destinataires : les informations privées restent dehors." },
    { q:"Pourquoi mettre l'année scolaire ?", o:["Pour situer le mail dans le temps","Pour montrer que tu es en retard","Parce que la messagerie l'exige"], a:0, why:"On sait à quelle année correspond un vieux mail. Pense à la changer à la rentrée." }
  ],
  forme: [
    { q:"Combien de lignes pour une signature d'élève ?", o:["Quatre au plus","Une dizaine","Une page entière"], a:0, why:"Formule, nom, classe, école : au-delà, elle écrase le message." },
    { q:"Pourquoi garder une police simple ?", o:["Les polices fantaisie sont remplacées chez certains destinataires","Elles coûtent de l'argent","Elles sont interdites par l'école"], a:0, why:"Une police simple s'affiche de la même façon partout." },
    { q:"Ton logo est une image de plusieurs mégaoctets. Que fais-tu ?", o:["Je la réduis à quelques centaines de pixels","Je la laisse telle quelle","Je l'envoie en pièce jointe"], a:0, why:"Une image légère charge vite et n'alourdit pas chaque mail." },
    { q:"Pourquoi garder ton nom et ta classe en texte et pas seulement dans l'image ?", o:["Parce que certaines messageries bloquent les images","Parce que le texte est plus joli","Pour économiser de l'encre"], a:0, why:"Si l'image est bloquée, le texte reste lisible." }
  ]
};
const BANK_EXTRA = [
  { part:2, q:"Une signature « Envoyé de mon iPhone » convient-elle pour écrire à un professeur ?", o:["Non, elle ne dit pas qui tu es","Oui, elle est automatique donc parfaite","Oui, elle montre que tu as un téléphone"], a:0, why:"Remplace-la par ta propre signature." },
  { part:2, q:"Le logo de l'école et la photo sont…", o:["Facultatifs","Obligatoires","Interdits"], a:0, why:"Tu es libre de les ajouter, à condition qu'ils restent petits." },
  { part:2, q:"Où met-on la formule de politesse ?", o:["Avant ton nom, dans la signature ou à la fin du message, pas les deux","Après le mot de passe","Dans l'objet du mail"], a:0, why:"Une seule formule, sobre." },
  { part:3, q:"Quelle couleur d'accent conviendra le mieux ?", o:["Un bleu foncé","Un jaune très clair","Du fluo"], a:0, why:"Une couleur foncée reste lisible sur fond blanc." },
  { part:3, q:"Après avoir créé ta signature, que fais-tu ?", o:["Je m'envoie un mail pour la tester","Je l'active sans la regarder","Je l'envoie à toute la classe"], a:0, why:"Une faute dans une signature se répète dans tous tes mails." },
  { part:3, q:"Pourquoi éviter une signature faite d'une seule grande image ?", o:["Si l'image est bloquée, il ne reste rien","Parce que ça coûte cher","Parce que Cci est obligatoire"], a:0, why:"Le nom doit aussi exister en texte." },
  { part:1, q:"Tu écris à un professeur et ta messagerie n'a pas de signature réglée. Que fais-tu ?", o:["J'écris moi-même mon nom, ma classe et mon école à la fin","Je n'écris rien, ça ira","Je demande au professeur de deviner"], a:0, why:"Écrire à la main est permis, à condition de ne rien oublier." },
  { part:1, q:"Quelle signature est la plus sobre pour l'environnement ?", o:["Du texte seul","Un logo, une photo et une bannière","Une grande image animée"], a:0, why:"Moins d'images, moins d'énergie, et le mail s'affiche plus vite." },
  { part:1, q:"Pourquoi avoir plusieurs signatures peut être utile ?", o:["Pour adapter le message à son destinataire","Pour envoyer le mail deux fois","Pour changer d'adresse mail"], a:0, why:"École, stage, club : on n'écrit pas la même chose à chacun." }
];
const BANK = () => [ ...QCM.utilite.map(q => ({ ...q, part:1 })), ...QCM.contenu.map(q => ({ ...q, part:2 })), ...QCM.forme.map(q => ({ ...q, part:3 })), ...BANK_EXTRA ];
const FQ_COUNT = 10;

const PARTS = [
  { k:'utilite', n:1, title:"À quoi sert une signature", hl:'sert', img:'keypace-perso-adresse-email', desc:"Ne rien oublier, rester structuré, s'adapter. Pourquoi la signature est facultative, pourquoi le texte suffit, et pourquoi les images pèsent sur l'environnement.", prev:['7 étapes','Texte ou image','Quiz'] },
  { k:'contenu', n:2, title:"Que mettre dans une signature", hl:'signature', img:'keypace-perso-adresse-email', desc:"Nom, classe, école, contact : les informations utiles, et celles à laisser de côté. Fais défiler : chaque étape allume la zone correspondante.", prev:['8 étapes','Signatures à juger','Quiz'] },
  { k:'forme', n:3, title:'Une signature qui se lit bien', hl:'se lit bien', img:'keypace-mascot-mail-allonge', desc:"Longueur, police, couleur, poids des images : ce qui rend une signature agréable à lire sur tous les écrans.", prev:['6 étapes','Exemple en direct','Quiz'] },
  { k:'creer', n:4, title:'Crée ta signature', hl:'Crée', img:'keypace-perso-netiquette', desc:"Remplis tes informations, ajoute le logo de ton école et une photo si tu veux, et vois ta signature se construire. Puis télécharge-la en image ou en PDF.", prev:['Aperçu en direct','Logo et photo','Image ou PDF'] }
];
const hlTitle = p => p.title.replace(p.hl, `<em>${p.hl}</em>`);
const $ = s => document.querySelector(s);
const shuffle = a => a.map(x => [Math.random(), x]).sort((x,y) => x[0]-y[0]).map(x => x[1]);
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);
const store = { get(){ try{ return JSON.parse(localStorage.getItem('kp-signature-done')||'{}'); }catch(e){ return {}; } }, set(o){ try{ localStorage.setItem('kp-signature-done', JSON.stringify(o)); }catch(e){} } };
let done = store.get(), io = null, tmr = null;
const BEST_KEY = 'kp-signature-quiz-best';
const getBest = () => { try{ return +localStorage.getItem(BEST_KEY) || 0; }catch(e){ return 0; } };
const setBest = n => { try{ localStorage.setItem(BEST_KEY, String(n)); }catch(e){} };
const allDone = () => PARTS.every(p => done[p.k]);
function completePart(k){
  done[k] = true; store.set(done);
  const f = $('#finish'), p = PARTS.find(x => x.k === k);
  if (f && '#signature/'+p.n === location.hash){ f.textContent = 'Terminée ✓'; f.className = 'btn ok'; const r = $('#restart'); if (r) r.hidden = false; refreshNext(); }
}
function refreshNext(){ const nx = $('#next4'); if (!nx) return; if (allDone()){ nx.textContent = 'Quiz final →'; nx.onclick = () => { location.hash = 'signature/quiz'; }; } }
function show(id){ document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === id)); window.scrollTo(0,0); }

function route(){
  if (io){ io.disconnect(); io = null; }
  clearInterval(tmr);
  const h = location.hash.replace('#','');
  if (h === 'signature') return renderHub();
  if (h === 'signature/messagerie' || h.indexOf('signature/messagerie/') === 0) return renderPlat(h.split('/')[2]);
  if (h === 'signature/quiz') return allDone() ? renderFinalQuiz() : renderHub();
  const m = h.match(/^signature\/(\d)$/);
  if (m && PARTS[m[1]-1]) return renderLesson(PARTS[m[1]-1]);
  renderHub();
}
window.addEventListener('hashchange', route);
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g){ if (g.dataset.go === 'cours'){ location.href = '/?view=lessons'; return; } location.hash = g.dataset.go === 'hub' ? 'signature' : g.dataset.go; return; }
  if (e.target.id === 'restart'){ const p = PARTS.find(x => '#signature/'+x.n === location.hash); if (p) renderLesson(p); return; }
  if (e.target.id === 'reset-all'){ if (confirm("Effacer ta progression dans ce module ? Tu pourras tout refaire depuis le début.")){ done = {}; store.set(done); try{ localStorage.removeItem(BEST_KEY); }catch(err){} renderHub(); } return; }
  if (e.target.id === 'finish'){ const p = PARTS.find(x => '#signature/'+x.n === location.hash); if (p){ completePart(p.k); location.hash = 'signature'; } }
});

/* ---------------- Hub ---------------- */
const MINI = {
  utilite:`<div class="mS"><b>Texte seul ✓</b><span>léger, lisible partout</span><i></i></div>`,
  contenu:`<div class="mS"><b>Léa Martin</b><span>2e sec., classe 2B</span><span>École Saint-Exemple</span></div>`,
  forme:`<div class="mS g"><b>Léa Martin</b><span>2B, École Saint-Exemple</span><i></i></div>`,
  creer:`<div class="mS lg"><u></u><div><b>Léa Martin</b><span>2B, École Saint-Exemple</span></div></div>`
};
function partCard(p){
  const d = done[p.k];
  return `<button class="part ${d?'done':''}" onclick="location.hash='signature/${p.n}'">
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
    <div class="qb-txt"><span class="qb-tag">Quiz final · 🔒 Verrouillé</span><h2>Le quiz de la signature</h2><p>Termine les ${PARTS.length} parties pour le débloquer. Il reprend tout le module, question après question, au hasard.</p></div>
    <div class="qb-act"><div class="qb-prog"><i style="width:${n/PARTS.length*100}%"></i></div><span style="font-size:12.5px;color:var(--muted)">${n}/${PARTS.length} parties terminées</span></div></section>`;
  return `<section class="qbanner"><img src="/images/keypace-pose-6.webp" alt="">
    <div class="qb-txt"><span class="qb-tag">Module terminé, bravo !</span><h2>Teste-toi avec le quiz <em>de la signature</em></h2><p>${FQ_COUNT} questions tirées au hasard dans toutes les parties, une à la fois. Tu peux rejouer autant de fois que tu veux.</p>
      <div class="qb-meta"><span>${FQ_COUNT} questions</span><span>Au hasard</span>${best ? `<span>Meilleur score : ${best}/${FQ_COUNT}</span>` : ''}</div></div>
    <div class="qb-act"><button class="btn primary" onclick="location.hash='signature/quiz'" style="font-size:16px;padding:14px 26px">Jouer →</button></div></section>`;
}
function platCard(){
  return `<section class="optcard"><div class="opt-txt"><span class="qb-tag">Pour aller plus loin · Facultatif</span><h2>L'installer dans ta <em>messagerie</em></h2>
    <p>Ta signature est prête : reste à la mettre dans Smartschool, Outlook, Gmail ou Zimbra. Le chemin dans les paramètres change d'une messagerie à l'autre. Entraîne-toi sur un écran proche du vrai, quand tu veux.</p>
    <div class="qb-meta">${PLAT_ORDER.map(k => `<span class="lg">${svcBadge(k, 20)}${esc(PLAT[k].name.replace(" messagerie", ""))}</span>`).join("")}</div></div>
    <div class="qb-act"><button class="btn primary" onclick="location.hash='signature/messagerie'">Ouvrir →</button></div></section>`;
}
function renderHub(){
  const n = PARTS.filter(p => done[p.k]).length, all = n === PARTS.length;
  $('#hub-prog').textContent = n + '/' + PARTS.length + ' parties';
  $('#hub-bar').style.width = (n/PARTS.length*100) + '%';
  $('#hub-meta').innerHTML = `<div class="ring" style="--p:${n/PARTS.length*100}"><i>${n}/${PARTS.length}</i></div><span>parties terminées</span>${n ? '<button class="linkbtn" id="reset-all">Réinitialiser ma progression</button>' : ''}`;
  const nextK = all ? null : (PARTS.find(p => !done[p.k]) || {}).k, mascots = ['cheer','idea','books','desk'];
  $('#parts-host').innerHTML = `<div class="road">${PARTS.map((p,i) => `
    <div class="stop ${done[p.k]?'done':''} ${p.k===nextK?'next':''}">
      ${partCard(p)}
      <div class="node">${done[p.k] ? '✓' : p.n}</div>
      <div class="side">${p.k===nextK ? `<img src="/images/keypace-mascot-${mascots[i]}.webp" alt=""><span class="bubble">${n ? 'Tu en es là !' : 'Commence ici !'}</span>` : ''}</div>
    </div>`).join('')}</div>${quizBanner(n)}${platCard()}`;
  show('v-hub');
}

/* ---------------- Quiz final et QCM ---------------- */
const shuffleQ = list => list.map(q => { const idx = shuffle(q.o.map((_,i) => i)); return { ...q, o:idx.map(i => q.o[i]), a:idx.indexOf(q.a) }; });
function drawFinalDeck(){
  const bank = shuffle(BANK()), deck = [];
  [1,2,3].forEach(pt => bank.filter(q => q.part === pt).slice(0,2).forEach(q => deck.push(q)));
  bank.filter(q => !deck.includes(q)).slice(0, FQ_COUNT - deck.length).forEach(q => deck.push(q));
  return shuffleQ(shuffle(deck));
}
function renderFinalQuiz(){
  $('#crumb-part').textContent = 'Quiz final'; $('#lesson-pos').textContent = 'Quiz final';
  $('#lesson-hero').innerHTML = `<div class="hero small"><div class="wrap"><div class="txt"><span class="tag">Quiz final</span><h1>Le quiz <em>de la signature</em></h1><p>${FQ_COUNT} questions tirées au hasard dans toutes les parties. Une à la fois, dans un ordre différent à chaque partie.</p></div><img src="/images/keypace-mascot-cheer.webp" alt=""></div></div>`;
  $('#lesson-root').innerHTML = `<div id="fq"></div><div class="lesson-foot"><button class="btn" onclick="location.hash='signature'">← Retour au module</button><span></span></div>`;
  show('v-lesson'); initFinalQuiz($('#fq'));
}
function initFinalQuiz(el){
  let deck = drawFinalDeck(), i = 0, picked = null, res = [];
  const draw = () => {
    if (i >= deck.length){
      const sc = res.filter(Boolean).length, N = deck.length, best = getBest(), isBest = sc > best;
      if (isBest) setBest(sc);
      const msg = sc === N ? 'Sans faute ! Tu sais faire une signature claire et sobre.' : sc >= N*0.8 ? 'Excellent, presque parfait.' : sc >= N*0.5 ? 'Bien joué, encore quelques points à revoir.' : 'Pas facile ! Reprends les parties puis retente.';
      const missed = deck.map((q,k) => ({ q, ok:res[k] })).filter(x => !x.ok);
      el.innerHTML = `<section class="qz" style="margin-top:34px"><div class="qz-top"><h2>Résultat du quiz</h2></div>
        <div class="res"><div class="score">${sc}/${N}</div><div><p style="font-size:17px;font-weight:600">${msg}</p><p style="color:var(--muted);font-size:14px">${isBest && sc > 0 ? 'Nouveau meilleur score !' : `Meilleur score : ${Math.max(best, sc)}/${N}`}</p></div></div>
        ${missed.length ? `<div class="miss-list"><b style="font-family:'Bricolage Grotesque',sans-serif;font-size:17px">À revoir</b>${missed.map(x => `<div><span class="fq-part">Partie ${x.q.part}</span> ${x.q.q}<small>Bonne réponse : ${x.q.o[x.q.a]}. ${x.q.why}</small></div>`).join('')}</div>` : ''}
        <div class="btnrow" style="margin-top:22px"><button class="btn primary" id="fq-again">Rejouer avec de nouvelles questions</button><button class="btn" onclick="location.hash='signature'">Retour au module</button></div></section>`;
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
function initQCM(el, p){
  let Q = shuffleQ(QCM[p.k]), i = 0, picked = null, res = [];
  const draw = () => {
    if (i >= Q.length){
      const s = res.filter(Boolean).length;
      const msg = s === Q.length ? 'Sans faute, bravo !' : s >= Q.length-1 ? 'Presque parfait.' : s >= 2 ? 'Bon début, relis les points manqués.' : 'Reprends la partie, puis retente.';
      el.innerHTML = `<section class="qz"><div class="qz-top"><h2>Quiz terminé</h2></div>
        <div class="res"><div class="score">${s}/${Q.length}</div><div><p style="font-size:17px;font-weight:600">${msg}</p><p style="color:var(--muted);font-size:14px">Partie validée : tu peux passer à la suite quand tu veux.</p></div></div>
        <div class="btnrow" style="margin-top:20px"><button class="btn" id="qz-again">Refaire le quiz</button>${PARTS[p.n] ? `<button class="btn primary" onclick="location.hash='signature/${p.n+1}'">${PARTS[p.n].title} →</button>`:''}</div></section>`;
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
  ({ utilite:initUtilite, contenu:initContenu, forme:initForme, creer:initCreer })[p.k]($('#lesson-body'));
  if (QCM[p.k]) initQCM($('#lesson-quiz'), p);
}
function footer(p){
  const prev = PARTS[p.n-2], next = PARTS[p.n];
  const nextBtn = next ? `<button class="btn dark" onclick="location.hash='signature/${next.n}'">${next.title} →</button>`
    : (allDone() ? `<button class="btn dark" id="next4" onclick="location.hash='signature/quiz'">Quiz final →</button>` : `<button class="btn dark" id="next4" onclick="location.hash='signature'">Retour au module</button>`);
  return `<div class="lesson-foot">
    ${prev ? `<button class="btn" onclick="location.hash='signature/${prev.n}'">← ${prev.title}</button>` : `<button class="btn" onclick="location.hash='signature'">← Retour au module</button>`}
    <span class="foot-grp"><button class="btn" id="restart" ${done[p.k]?'':'hidden'}>↺ Recommencer cette partie</button>
    <button class="btn ${done[p.k]?'ok':'primary'}" id="finish">${done[p.k] ? 'Terminée ✓' : 'Terminer cette partie'}</button></span>${nextBtn}</div>`;
}

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

/* ---------------- Partie 1 : à quoi ça sert ---------------- */
function initUtilite(el){
  const z = (k, inner) => `<div class="zone" data-z="${k}">${inner}</div>`;
  const card = `<div class="sigdemo">
    ${z('forget',`<div class="sd-t">☑ Nom &nbsp; ☑ Classe &nbsp; ☑ École : rien d'oublié</div>`)}
    ${z('struct','<div class="sd-cmp"><div><b>Chaque mail</b><div class="sd-t">même présentation</div></div><div><b>À la main</b><div class="sd-t">tantôt complet, tantôt vide</div></div></div>')}
    ${z('env','<div class="sd-t"><b>École</b> : nom, classe<br><b>Stage</b> : nom, formation, contact</div>')}
    ${z('manual','<div class="sd-t">✍ À la main : toujours permis</div>')}
    ${z('text',`<div class="sd-sig"><div class="sd-n">Léa Martin</div><div class="sd-t">2e secondaire, classe 2B</div><div class="sd-mut">Texte seul : très léger</div></div>`)}
    ${z('eco',`<div class="sd-sz"><span>Texte</span><u style="width:3%"></u><span>Logo léger</span><u style="width:20%"></u><span>Grande image, renvoyée dans chaque mail</span><u style="width:100%;background:var(--accent)"></u></div>`)}
    ${z('sober',`<div class="sd-t">🌱 Texte d'abord, petit logo si utile</div>`)}
  </div>`;
  el.innerHTML = anatHTML(STEPS0, card, "À quoi ça sert, en un coup d'œil");
  bindAnat(el, STEPS0);
}

/* ---------------- Partie 2 ---------------- */
function initContenu(el){
  const z = (k, inner, cls) => `<div class="zone ${cls||''}" data-z="${k}">${inner}</div>`;
  const card = `<div class="sigdemo">
    <div class="sd-mail"><div class="sd-l"><span>À</span> m.dupont@exemple.be</div><div class="sd-l"><span>Objet</span> Question sur le devoir</div>
      <p>Bonjour Madame, pouvez-vous me redire pour quand est le devoir ? Merci.</p></div>
    ${z('what', `<div class="sd-sep">Ta signature s'ajoute ici, toute seule</div>`)}
    <div class="sd-sig">
      ${z('greet','<div class="sd-g">Cordialement,</div>')}
      ${z('name','<div class="sd-n">Léa Martin</div>')}
      ${z('class','<div class="sd-t">2e secondaire, classe 2B</div>')}
      ${z('school','<div class="sd-t">École Saint-Exemple · 2026-2027</div>')}
      ${z('contact',`<div class="sd-t sd-mut">Pas d'adresse de domicile, pas de GSM personnel</div>`)}
      ${z('visual','<div class="sd-vis"><span class="sd-logo">logo</span><span class="sd-ph">photo</span><em>facultatifs, petits</em></div>')}
      ${z('avoid','<div class="sd-bad"><s>« La vie est un jeu »</s> <s>rue des Lilas 12</s> <s>0470 12 34 56</s></div>')}
    </div></div>`;
  el.innerHTML = anatHTML(STEPS, card, "Exemple fictif : un mail de Léa") + `<div id="sig-extra"></div>`;
  bindAnat(el, STEPS);
  initJuger($('#sig-extra'));
}
function initJuger(el){
  let S = SIGS.map(() => null);
  const draw = () => {
    const nDone = S.filter(x => x !== null).length, good = S.filter((x,i) => x !== null && x === SIGS[i].ok).length;
    el.innerHTML = `<div class="aw">
      <h2 class="aw-h2">Convient-elle ?</h2>
      <p class="aw-intro" style="margin-top:0">Ces signatures sont inventées. Pour chacune, dis si un élève peut l'utiliser pour écrire à un professeur.</p>
      <div class="tri-list">${SIGS.map((t,i) => {
        const a = S[i], ans = a !== null, right = ans && a === t.ok;
        return `<div class="tri ${ans ? (right ? 'ok' : 'ko') : ''}">
          <div class="tri-top"><div class="sigtxt">${t.l.map(x => `<div>${esc(x)}</div>`).join('')}</div>
          <div class="tri-b">${ans ? `<span class="tri-res">${right ? '✓ Bien vu' : '✗ Pas tout à fait'}</span>` : `<button class="btn" data-t="${i}-1">Oui</button><button class="btn" data-t="${i}-0">Non</button>`}</div></div>
          ${ans ? `<p class="tri-why"><b>${t.ok ? 'Oui.' : 'Non.'}</b> ${t.why}</p>` : ''}</div>`; }).join('')}</div>
      <div class="btnrow" style="margin-top:18px;align-items:center">${nDone === SIGS.length ? `<span class="msg" style="color:var(--mod-d)">${good}/${SIGS.length} bien jugées</span><button class="btn" id="tri-again">Recommencer</button>` : `<span class="hint2">${nDone}/${SIGS.length} répondues</span>`}</div>
    </div>`;
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const [i, v] = b.dataset.t.split('-'); S[+i] = v === '1'; const y = scrollY; draw(); scrollTo(0, y); });
    const ag = $('#tri-again'); if (ag) ag.onclick = () => { S = SIGS.map(() => null); draw(); };
  };
  draw();
}

/* ---------------- Partie 3 : une signature qui se lit bien ---------------- */
function initForme(el){
  const z = (k, inner) => `<div class="zone" data-z="${k}">${inner}</div>`;
  const card = `<div class="sigdemo">
    ${z('short','<div class="sd-cmp"><div><b>Bien</b><div class="sd-t">4 lignes</div></div><div><b>Trop</b><div class="sd-t">10 lignes, 3 liens, 2 citations…</div></div></div>')}
    ${z('font',`<div class="sd-fonts"><span style="font-family:Arial,sans-serif">Arial : s'affiche partout</span><span style="font-family:'Brush Script MT','Segoe Script',cursive">Police fantaisie : remplacée chez certains</span></div>`)}
    ${z('color','<div class="sd-cols"><span style="background:#fff;color:#0A5C8A;border:1px solid #E7E1D5">Bleu foncé</span><span style="background:#16140F;color:#fff">sur fond sombre</span><span style="background:#fff;color:#F2E67A;border:1px solid #E7E1D5">Jaune clair ✗</span></div>')}
    ${z('img','<div class="sd-sz"><span>Logo : 200 px de large</span><u style="width:34%"></u><span>Photo de téléphone : plusieurs Mo</span><u style="width:100%;background:var(--accent)"></u></div>')}
    ${z('text','<div class="sd-cmp"><div><b>Image seule</b><div class="sd-blk">[image bloquée]</div></div><div><b>Image + texte</b><div class="sd-t">Léa Martin, 2B</div></div></div>')}
    ${z('check',`<div class="sd-t">✉ Je m'envoie un mail de test avant de l'activer</div>`)}
  </div>`;
  el.innerHTML = anatHTML(STEPS2, card, "Ce qui change la lecture");
  bindAnat(el, STEPS2);
}

/* ---------------- Partie 4 : générateur ---------------- */
const DRAFT_KEY = 'kp-signature-draft';
const COLORS = [['#0A5C8A','Bleu'],['#1B6B4A','Vert'],['#4A4A4A','Gris'],['#7A2E2E','Bordeaux'],['#16140F','Noir']];
const FORMULES = ['Cordialement,','Bien à vous,','Bonne journée,','Merci d\'avance,','(aucune)'];
function schoolYear(){ const d = new Date(), y = d.getFullYear(); return d.getMonth() >= 7 ? `${y}-${y+1}` : `${y-1}-${y}`; }
const SIG = { first:'', last:'', annee:'', classe:'', ecole:'', sy:schoolYear(), mail:'', tel:'', formule:'Cordialement,', color:'#0A5C8A', logo:null, photo:null, showLogo:true, showPhoto:true };
try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); if (d) Object.keys(SIG).forEach(k => { if (k !== 'logo' && k !== 'photo' && d[k] !== undefined) SIG[k] = d[k]; }); } catch(e){}
const saveDraft = () => { try{ const d = { ...SIG }; delete d.logo; delete d.photo; localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }catch(e){} };
function sigLines(){
  const L = [];
  if (SIG.formule && SIG.formule !== '(aucune)') L.push({ t:SIG.formule, k:'g' });
  const nm = (SIG.first + ' ' + SIG.last).trim();
  if (nm) L.push({ t:nm, k:'n' });
  const cl = [SIG.annee, SIG.classe ? 'classe ' + SIG.classe : ''].filter(Boolean).join(', ');
  if (cl) L.push({ t:cl, k:'t' });
  const sc = [SIG.ecole, SIG.sy].filter(Boolean).join(' · ');
  if (sc) L.push({ t:sc, k:'t' });
  const ct = [SIG.mail, SIG.tel].filter(Boolean).join(' · ');
  if (ct) L.push({ t:ct, k:'m' });
  return L;
}
const sigText = () => sigLines().map(l => l.t).join('\n');
function sigHTML(){
  const L = sigLines(), c = SIG.color;
  const lines = L.map(l => l.k === 'g' ? `<div class="sg-g">${esc(l.t)}</div>` : l.k === 'n' ? `<div class="sg-n" style="color:${c}">${esc(l.t)}</div>` : l.k === 'm' ? `<div class="sg-m">${esc(l.t)}</div>` : `<div class="sg-t">${esc(l.t)}</div>`).join('');
  const ph = SIG.photo && SIG.showPhoto ? `<img class="sg-ph" src="${SIG.photo}" alt="">` : '';
  const lg = SIG.logo && SIG.showLogo ? `<img class="sg-lg" src="${SIG.logo}" alt="">` : '';
  if (!L.length && !ph && !lg) return `<div class="sg-empty">Remplis les champs : ta signature apparaît ici.</div>`;
  return `<div class="sg" style="border-left:3px solid ${c}">${ph}<div class="sg-x">${lines}${lg}</div></div>`;
}
function loadImg(file, max, square){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => {
      let sw = im.width, sh = im.height, sx = 0, sy = 0;
      if (square){ const s = Math.min(sw, sh); sx = (sw - s)/2; sy = (sh - s)/2; sw = sh = s; }
      const k = Math.min(1, max / Math.max(sw, sh)), w = Math.round(sw*k), h = Math.round(sh*k);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, w, h);
      res(cv.toDataURL('image/png'));
    }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
}
const imgEl = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
async function sigCanvas(){
  const L = sigLines(), S = 2, W = 560, pad = 16;
  const ph = SIG.photo && SIG.showPhoto ? await imgEl(SIG.photo) : null, lg = SIG.logo && SIG.showLogo ? await imgEl(SIG.logo) : null;
  const FS = { g:15, n:20, t:15, m:14 }, LH = { g:22, n:28, t:21, m:20 };
  const phS = ph ? 84 : 0, tx = pad + 6 + (ph ? phS + 14 : 0);
  let h = pad; const tH = L.reduce((a,l) => a + LH[l.k], 0);
  let lgW = 0, lgH = 0; if (lg){ lgH = Math.min(52, lg.height); lgW = lg.width * (lgH / lg.height); if (lgW > 220){ lgW = 220; lgH = lg.height * (lgW / lg.width); } }
  const contentH = Math.max(tH + (lg ? lgH + 10 : 0), phS);
  const H = pad*2 + contentH;
  const cv = document.createElement('canvas'); cv.width = W*S; cv.height = H*S;
  const g = cv.getContext('2d'); g.scale(S, S);
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.fillStyle = SIG.color; g.fillRect(pad, pad, 3, contentH);
  if (ph){ g.save(); g.beginPath(); g.arc(pad + 3 + 10 + phS/2, pad + phS/2, phS/2, 0, Math.PI*2); g.clip(); g.drawImage(ph, pad + 13, pad, phS, phS); g.restore(); }
  let y = pad;
  g.textBaseline = 'alphabetic';
  L.forEach(l => {
    const bold = l.k === 'n';
    g.font = `${bold ? '700 ' : ''}${FS[l.k]}px Arial, Helvetica, sans-serif`;
    g.fillStyle = l.k === 'n' ? SIG.color : l.k === 'm' ? '#5A544B' : '#2A2622';
    g.fillText(l.t, tx, y + LH[l.k] - 6, W - tx - pad);
    y += LH[l.k];
  });
  if (lg) g.drawImage(lg, tx, y + 10, lgW, lgH);
  return cv;
}
function initCreer(el){
  const fld = (k, lab, ph, extra) => `<label>${lab}<input data-f="${k}" type="text" value="${esc(SIG[k])}" placeholder="${esc(ph||'')}" autocomplete="off" ${extra||''}></label>`;
  el.innerHTML = `<div class="aw">
    <p class="aw-intro">Remplis tes informations : ta signature se construit à droite. Rien n'est envoyé ni enregistré sur nos serveurs. Ton logo et ta photo restent dans ton navigateur. Tu peux utiliser de fausses informations pour t'entraîner.</p>
    <div class="build">
      <div class="fm">
        <h3>Tes informations</h3>
        <div class="g2">${fld('first','Prénom','Léa')}${fld('last','Nom','Martin')}</div>
        <div class="g2">${fld('annee','Année d\'étude','2e secondaire')}${fld('classe','Classe','2B')}</div>
        <div class="g2">${fld('ecole','École','École Saint-Exemple')}${fld('sy','Année scolaire','2026-2027')}</div>
        <label>Formule de politesse<select data-f="formule">${FORMULES.map(f => `<option ${f===SIG.formule?'selected':''}>${esc(f)}</option>`).join('')}</select></label>
        <h3>Facultatif</h3>
        <div class="g2">${fld('mail','Adresse mail (inutile en général)','')}${fld('tel','Téléphone (déconseillé)','')}</div>
        <p class="hint2" id="tel-w" hidden>Un numéro personnel part à tous tes destinataires. Mets-le seulement si un adulte de confiance est d'accord.</p>
        <h3>Image (facultatif)</h3>
        <p class="hint2">Une signature sans image est tout à fait correcte, et plus légère pour l'environnement. Si tu en ajoutes, garde-les petites.</p>
        <label>Logo de l'école<input id="f-logo" type="file" accept="image/*"></label>
        <label class="chkl"><input type="checkbox" data-c="showLogo" ${SIG.showLogo?'checked':''}> Afficher le logo ${SIG.logo ? '' : '(aucun chargé)'}</label>
        <label>Petite photo<input id="f-photo" type="file" accept="image/*"></label>
        <label class="chkl"><input type="checkbox" data-c="showPhoto" ${SIG.showPhoto?'checked':''}> Afficher la photo ${SIG.photo ? '' : '(aucune chargée)'}</label>
        <p class="hint2">Les images sont réduites tout de suite, pour rester légères.</p>
        <h3>Couleur</h3>
        <div class="sw-row">${COLORS.map(c => `<button class="sw ${SIG.color===c[0]?'on':''}" data-col="${c[0]}" style="background:${c[0]}" title="${c[1]}" aria-label="${c[1]}"></button>`).join('')}</div>
      </div>
      <div class="paperwrap"><div class="aw-cap">Ta signature</div>
        <div class="sigprev" id="sig-prev"></div>
        <div class="sig-chk" id="sig-chk"></div>
        <div class="btnrow"><button class="btn primary" id="sg-png">Télécharger l'image</button><button class="btn" id="sg-copyimg">Copier l'image</button><button class="btn" id="sg-copytxt">Copier le texte</button><button class="btn" id="sg-pdf">Enregistrer en PDF</button></div>
        <p class="pf-msgbox" id="sg-msg"></p>
        <div class="card2"><h4>Maintenant, installe-la dans ta messagerie</h4><p>Une fois ta signature téléchargée ou copiée, choisis ta messagerie pour voir où cliquer dans les paramètres.</p><div class="lg-row">${PLAT_ORDER.map(k => `<button class="btn lgbtn" onclick="location.hash='signature/messagerie/${k}'">${svcBadge(k, 26)}${esc(PLAT[k].name.replace(" messagerie", ""))}</button>`).join("")}</div></div>
        <div class="card2"><h4>Image, texte ou PDF ?</h4><p>Dans une messagerie, une signature s'enregistre comme du <b>texte</b> ou une <b>image</b>. Le PDF ne s'y insère pas : garde-le pour l'imprimer, le montrer à ton professeur ou le joindre à un mail. Pour l'installer, utilise l'image ou le texte, puis suis la partie facultative « L'installer dans ta messagerie ».</p></div>
      </div>
    </div></div>`;
  const prev = $('#sig-prev'), chk = $('#sig-chk'), msg = $('#sg-msg');
  const say = (t, ok) => { msg.textContent = t; msg.className = 'pf-msgbox' + (ok ? ' ok' : ''); };
  const checks = () => {
    const L = sigLines().filter(l => l.k !== 'g').length;
    const rows = [
      [!!(SIG.first.trim() && SIG.last.trim()), 'Prénom et nom complets'],
      [!!SIG.classe.trim() || !!SIG.annee.trim(), 'Classe ou année d\'étude'],
      [!!SIG.ecole.trim(), 'Nom de l\'école'],
      [L <= 4, 'Quatre lignes ou moins'],
      [!SIG.tel.trim(), 'Pas de numéro personnel']
    ];
    chk.innerHTML = rows.map(r => `<div class="${r[0] ? 'y' : 'n'}">${r[0] ? '✓' : '○'} ${r[1]}</div>`).join('');
    $('#tel-w').hidden = !SIG.tel.trim();
  };
  const refresh = () => { prev.innerHTML = sigHTML(); checks(); saveDraft(); };
  el.querySelectorAll('[data-f]').forEach(i => i.oninput = () => { SIG[i.dataset.f] = i.value; refresh(); });
  el.querySelectorAll('[data-c]').forEach(i => i.onchange = () => { SIG[i.dataset.c] = i.checked; refresh(); });
  el.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { SIG.color = b.dataset.col; el.querySelectorAll('[data-col]').forEach(x => x.classList.toggle('on', x === b)); refresh(); });
  const pick = (id, key, max, sq) => { $(id).onchange = async e => { const f = e.target.files[0]; if (!f) return; try{ SIG[key] = await loadImg(f, max, sq); SIG['show' + key[0].toUpperCase() + key.slice(1)] = true; renderAgain(); }catch(err){ say("Cette image ne peut pas être lue. Essaie un fichier PNG ou JPG.", false); } }; };
  const renderAgain = () => { initCreer(el); };
  pick('#f-logo', 'logo', 400, false); pick('#f-photo', 'photo', 240, true);
  $('#sg-png').onclick = async () => {
    if (!sigLines().length) return say("Remplis d'abord quelques champs.", false);
    const cv = await sigCanvas(), a = document.createElement('a');
    a.download = 'signature-' + ((SIG.first + '-' + SIG.last).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mail') + '.png';
    a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
    say("Image téléchargée. Tu peux l'insérer dans ta messagerie.", true);
  };
  $('#sg-copyimg').onclick = async () => {
    if (!sigLines().length) return say("Remplis d'abord quelques champs.", false);
    try{ const cv = await sigCanvas(); const blob = await new Promise(r => cv.toBlob(r, 'image/png')); await navigator.clipboard.write([new ClipboardItem({ 'image/png':blob })]); say("Image copiée. Colle-la dans l'éditeur de signature de ta messagerie.", true); }
    catch(e){ say("La copie n'est pas possible sur cet appareil : utilise « Télécharger l'image ».", false); }
  };
  $('#sg-copytxt').onclick = async () => {
    if (!sigLines().length) return say("Remplis d'abord quelques champs.", false);
    try{ await navigator.clipboard.writeText(sigText()); say("Texte copié. Colle-le dans l'éditeur de signature.", true); }
    catch(e){ say("La copie n'est pas possible sur cet appareil : sélectionne le texte à la main.", false); }
  };
  $('#sg-pdf').onclick = () => {
    if (!sigLines().length) return say("Remplis d'abord quelques champs.", false);
    document.querySelectorAll('.print-root').forEach(n => n.remove());
    const r = document.createElement('div'); r.className = 'print-root';
    r.innerHTML = `<div class="sgprint"><h1>Ma signature de mail</h1><div class="sgp-box">${sigHTML()}</div><p>Signature créée avec KeyPace. Pour l'installer, ouvre les paramètres de ta messagerie, cherche « Signature », puis colle le texte ou insère l'image.</p></div>`;
    document.body.appendChild(r);
    const t = document.title; document.title = 'Signature_' + ((SIG.first + '_' + SIG.last).trim().replace(/\s+/g, '_') || 'mail');
    const clean = () => { document.title = t; r.remove(); window.removeEventListener('afterprint', clean); };
    window.addEventListener('afterprint', clean);
    window.print();
  };
  refresh();
}

/* =====================  POUR ALLER PLUS LOIN : DANS TA MESSAGERIE (facultatif)  ===================== */
/* Chemins relevés dans les aides officielles et des tutoriels, voir _research_signature.md. Les intitulés varient selon la version et la langue : l'écran de l'élève peut être un peu différent. */
const PLAT = {
  outlook: { name:'Outlook', sub:'Outlook sur le web', skin:'pf-ol',
    path:['Roue dentée (en haut à droite)','Afficher tous les paramètres','Courrier','Composer et répondre','Nouvelle signature','Enregistrer'],
    steps:[
      { q:"Où ouvres-tu les paramètres ?", o:["La roue dentée, en haut à droite","Ton nom, en bas à gauche","Le bouton « + Nouveau message »"], ok:0, say:"Les paramètres sont derrière la roue dentée." },
      { q:"Que choisis-tu dans le menu ?", o:["Afficher tous les paramètres d'Outlook","Changer de thème","Se déconnecter"], ok:0, say:"Il faut afficher tous les paramètres." },
      { q:"Quelle rubrique ouvres-tu ?", o:["Calendrier","Courrier","Personnes"], ok:1, say:"La signature fait partie du courrier." },
      { q:"Quel onglet ouvres-tu ?", o:["Règles","Composer et répondre","Courrier indésirable"], ok:1, say:"Composer et répondre : c'est là que se règlent les signatures." },
      { q:"Que cliques-tu ?", o:["Nouvelle signature","Ajouter une règle","Bloquer un expéditeur"], ok:0, say:"Donne un nom à ta signature, puis écris-la ou colle ton image. Enregistre." }
    ],
    facts:[ "Une signature créée dans Outlook sur le web peut s'ajouter à tous les messages sortants, ou s'insérer à la main dans certains messages.",
            "Dans « Composer et répondre », tu peux aussi choisir d'ajouter automatiquement ta signature aux réponses et aux transferts.",
            "Les intitulés changent un peu selon la version et la langue : « Composer et répondre », « Écrire et répondre »… Cherche le mot « signature ».",
            "Si tu as un compte Microsoft et que tu utilises à la fois l'application Outlook et Outlook sur le web, la signature se crée dans chacun des deux.",
            "N'oublie pas d'enregistrer, puis de t'envoyer un mail de test.",
            "Une signature en texte seul, sans image, convient très bien." ] },
  gmail: { name:'Gmail', sub:'Gmail sur ordinateur', skin:'pf-gm',
    path:['Roue dentée (en haut à droite)','Voir tous les paramètres','Onglet Général','Section Signature : + Créer','Enregistrer les modifications (tout en bas)'],
    steps:[
      { q:"Où ouvres-tu les réglages ?", o:["La roue dentée, en haut à droite","Le bouton « Nouveau message »","Ta photo de profil"], ok:0, say:"Les réglages sont derrière la roue dentée." },
      { q:"Que choisis-tu ?", o:["Voir tous les paramètres","Choisir un thème","Aide"], ok:0, say:"Il faut voir tous les paramètres." },
      { q:"Quel onglet ouvres-tu ?", o:["Libellés","Général","Comptes et importation"], ok:1, say:"La signature est dans l'onglet Général, en bas de la page." },
      { q:"Dans la section Signature, que cliques-tu ?", o:["+ Créer","Importer des contacts","Ajouter un filtre"], ok:0, say:"Donne un nom à ta signature, puis écris-la ou insère ton image." },
      { q:"Pour terminer, que fais-tu ?", o:["Je quitte la page directement","Je descends tout en bas et je clique « Enregistrer les modifications »","Je rafraîchis la page"], ok:1, say:"Sans enregistrer, la signature est perdue." }
    ],
    facts:[ "Les réglages de signature sont dans l'onglet Général, section Signature, en bas de la page.",
            "Gmail permet d'avoir plusieurs signatures et de choisir celle des nouveaux messages et celle des réponses.",
            "N'oublie pas « Enregistrer les modifications », tout en bas de la page des paramètres.",
            "Sur l'application du téléphone, la signature se règle à part : dans les paramètres du compte, rubrique « Signature mobile ».",
            "Une signature en texte seul, sans image, convient très bien.",
            "Compte Google d'école : l'établissement peut avoir imposé une signature identique pour tous. Demande à ton école si tu ne peux pas la modifier." ] },
  zimbra: { name:'Zimbra', sub:'Zimbra, webmail', skin:'pf-zm',
    path:['Préférences','Signatures','Ajouter une signature','Format HTML si image','Enregistrer'],
    steps:[
      { q:"Quel onglet ouvres-tu ?", o:["Préférences","Contacts","Agenda"], ok:0, say:"Les signatures se règlent dans les préférences." },
      { q:"Quelle rubrique ouvres-tu dans le volet de gauche ?", o:["Filtres","Signatures","Thème"], ok:1, say:"La rubrique Signatures." },
      { q:"Que cliques-tu ?", o:["Ajouter une signature","Supprimer mon compte","Imprimer"], ok:0, say:"Donne un nom à ta signature." },
      { q:"Tu veux insérer une image. Quel format choisis-tu ?", o:["Texte brut","HTML"], ok:1, say:"Pour une image, il faut passer la signature en format HTML." },
      { q:"Pour terminer, que fais-tu ?", o:["J'enregistre","Je ferme l'onglet"], ok:0, say:"Enregistre, puis choisis éventuellement cette signature pour les réponses et les transferts." }
    ],
    facts:[ "Zimbra existe en plusieurs versions : les libellés exacts de ton école ou de ton fournisseur peuvent être un peu différents (Préférences, Signatures).",
            "Pour mettre une image, la signature doit être au format HTML, pas en texte brut.",
            "Certains guides précisent que l'image insérée avec le bouton dédié part avec chaque message comme pièce jointe : fais un test et vérifie.",
            "Tu peux choisir quelle signature s'applique aux nouveaux messages et lesquelles aux réponses et transferts.",
            "Une signature en texte seul, sans image, convient très bien.",
            "Les écrans de cette page sont simplifiés : je n'ai pas pu vérifier tous les libellés français de la version Modern." ] },
  smartschool: { name:'Smartschool', sub:'Smartschool, module Berichten (la messagerie interne de l\'école)', skin:'pf-zm',
    path:['Berichten','Roue dentée (colonne du milieu, en bas)','Handtekening (signature)','Écrire : formule de politesse, nom, classe','Enregistrer'],
    steps:[
      { q:"Où commences-tu dans Smartschool ?", o:["Dans « Berichten » (les messages)","Dans « Cours »","Dans « Agenda »"], ok:0, say:"La signature se règle dans le module des messages : « Berichten »." },
      { q:"Quel bouton ouvres-tu ?", o:["La roue dentée, en bas de la colonne du milieu","Le bouton « Nouveau message »","Ta photo de profil"], ok:0, say:"Les réglages des messages sont derrière la roue dentée, en bas de la colonne du milieu." },
      { q:"Que choisis-tu ?", o:["Handtekening (signature)","Thème","Déconnexion"], ok:0, say:"L'entrée s'appelle « Handtekening », le mot néerlandais pour signature." },
      { q:"Qu’écris-tu dans la signature ?", o:["Une formule de politesse, ton nom et ta classe","Ton mot de passe","Rien du tout"], ok:0, say:"Une signature de mail contient une formule de fin, ton nom et ta classe." },
      { q:"Pour terminer, que fais-tu ?", o:["Je l'enregistre","Je quitte sans enregistrer"], ok:0, say:"Sans enregistrer, le changement ne se fait pas." }
    ],
    facts:[ "Dans Smartschool, la signature se règle dans « Berichten » : roue dentée en bas de la colonne du milieu, puis « Handtekening ». Une fois enregistrée, elle s'affiche sous tous tes messages Smartschool.",
            "Les guides d'école que j'ai trouvés parlent d'une signature en texte : formule de politesse, nom et classe. Je n'y ai pas trouvé d'image : un texte seul, c'est justement le bon choix. Utilise « Copier le texte » du générateur.",
            "Smartschool est la messagerie interne de beaucoup d'écoles : cette signature est celle des messages Smartschool, pas celle de ton adresse Outlook ou Gmail.",
            "Les libellés varient selon la version et les choix de ton école : certaines affichent les menus en néerlandais. Si tu ne trouves pas, clique sur le point d'interrogation (aide) ou demande à l'école.",
            "Je n'ai pas trouvé comment régler la signature dans l'application du téléphone : vérifie dans ton application." ] },
  autre: { name:'Autre messagerie', path:['Paramètres ou Préférences','Chercher « Signature »','Enregistrer, puis test'], sub:'Une autre messagerie (Apple Mail, Thunderbird, téléphone…)', skin:'pf-zm',
    steps:[
      { q:"Où commences-tu ?", o:["Dans les paramètres ou les préférences","Dans l'objet d'un nouveau message","Dans le dossier Spam"], ok:0, say:"Cherche l'engrenage, le menu ou « Préférences »." },
      { q:"Que cherches-tu ?", o:["Le mot « signature »","Le mot « Cci »","Le mot « mot de passe »"], ok:0, say:"Presque toutes les messageries ont une rubrique « Signature »." },
      { q:"Une fois la signature écrite, que fais-tu ?", o:["Je l'enregistre puis je m'envoie un test","Je ferme sans enregistrer"], ok:0, say:"Enregistre, puis teste." }
    ],
    facts:[ "Les noms changent d'une messagerie à l'autre, mais la rubrique s'appelle presque toujours « Signature ». Sers-toi de la recherche dans les paramètres.",
            "Sur un téléphone, la signature se règle souvent dans l'application, séparément de celle de l'ordinateur.",
            "Si ta messagerie n'accepte que du texte, ou si tu préfères rester sobre, utilise « Copier le texte » plutôt que l'image.",
            "Si tu ne trouves pas, demande à l'enseignant ou au service informatique de l'école : certaines écoles imposent une signature." ] }
};
/* Repères visuels : logos des messageries (fichiers dans images/mail/, comme le module Adresse mail). */
const LOGO_FILE = { smartschool:'png', gmail:'svg', outlook:'svg', zimbra:'png' };
const ENVI = c => `<rect x="6.5" y="9.5" width="19" height="13" rx="2.2" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M7.5 11.5l8.5 6.5 8.5-6.5" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
function svcBadge(k, size){
  const n = size || 32, nm = (PLAT[k] || {}).name || 'Messagerie';
  if (LOGO_FILE[k]) return `<img class="svc" src="/images/mail/${k}.${LOGO_FILE[k]}" width="${n}" height="${n}" alt="${esc(nm)}">`;
  return `<svg class="svc" width="${n}" height="${n}" viewBox="0 0 32 32" role="img" aria-label="${esc(nm)}"><rect x=".75" y=".75" width="30.5" height="30.5" rx="8" fill="#8A8275"/>${ENVI('#fff')}</svg>`;
}
const PLAT_ORDER = ['smartschool', 'outlook', 'gmail', 'zimbra', 'autre'];
function renderPlat(start){
  $('#crumb-part').textContent = 'Dans ta messagerie'; $('#lesson-pos').textContent = 'Pour aller plus loin';
  $('#lesson-hero').innerHTML = `<div class="hero small"><div class="wrap"><div class="txt"><span class="tag">Pour aller plus loin</span><h1>L'installer dans ta <em>messagerie</em></h1><p>Le but est le même partout : trouver la rubrique « Signature » dans les paramètres. Choisis ta messagerie et suis le chemin, un clic à la fois.</p></div><img src="/images/keypace-mascot-mail-allonge.webp" alt=""></div></div>`;
  $('#lesson-root').innerHTML = `<div id="plat-host"></div><div class="lesson-foot"><button class="btn" onclick="location.hash='signature'">← Retour au module</button><span></span></div>`;
  show('v-lesson');
  const PS = {}; PLAT_ORDER.forEach(k => PS[k] = { i:0, msg:'' });
  let cur = PLAT[start] ? start : 'smartschool';
  const host = $('#plat-host');
  const draw = () => {
    const P = PLAT[cur], st = PS[cur], fin = st.i >= P.steps.length;
    const s = P.steps[st.i];
    host.innerHTML = `<div class="aw"><div class="sim-tabs">${PLAT_ORDER.map(k => `<button class="${k===cur?'on':''}" data-pf="${k}">${svcBadge(k, 22)}<span>${PLAT[k].name}</span>${PS[k].i >= PLAT[k].steps.length ? ' ✓' : ''}</button>`).join('')}</div>
      <p class="aw-intro" style="margin:12px 0 4px">${P.sub}. Réponds à chaque question comme si tu cliquais dans les paramètres.</p>
      <div class="pf ${P.skin}" style="grid-template-columns:minmax(0,1fr)">
        <div class="pf-win"><div class="pf-top"><b>${svcBadge(cur, 22)}${P.name}</b><span>Paramètres</span></div>
          <div class="pl-path"><b>Le chemin à suivre :</b><ol>${P.path.map((x,j) => `<li class="${j===st.i||(fin&&j===P.path.length-1)?'cur':''}">${esc(x)}</li>`).join('')}</ol></div>
          <div class="pl-trail">${P.steps.map((x,j) => `<span class="${j<st.i?'ok':j===st.i?'cur':''}">${j+1}</span>`).join('<i></i>')}</div>
          <div class="pl-body">${fin ? `<div class="fb ok"><b>Signature installée !</b> Tu as suivi tout le chemin. Pense à t'envoyer un mail de test.</div>`
            : `<h3 class="pl-q">${s.q}</h3><div class="pl-opts">${s.o.map((o,j) => `<button class="btn" data-o="${j}">${esc(o)}</button>`).join('')}</div><p class="pf-msgbox">${esc(st.msg)}</p>`}</div></div>
      </div>
      ${fin ? `<div class="pf-facts"><h3>À retenir sur ${P.name}</h3><ul>${P.facts.map(f => `<li>${f}</li>`).join('')}</ul></div>` : ''}
      ${fin ? `<div class="btnrow" style="margin-top:14px"><button class="btn" id="pl-again">Recommencer</button></div>` : ''}
      <p class="aw-foot">Écrans simplifiés, inspirés de ces messageries. Selon ta version, ton réglage et ta langue, les intitulés peuvent être un peu différents. Rien n'est envoyé ni modifié dans ta vraie messagerie.</p></div>`;
    host.querySelectorAll('[data-pf]').forEach(b => b.onclick = () => { cur = b.dataset.pf; draw(); });
    host.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
      if (+b.dataset.o === s.ok){ st.i++; st.msg = ''; }
      else st.msg = "Pas tout à fait : " + s.say;
      draw();
    });
    const ag = $('#pl-again'); if (ag) ag.onclick = () => { st.i = 0; st.msg = ''; draw(); };
  };
  draw();
}

route();
