/* Module « Créer un mot de passe solide » : même moteur que les modules mail et CV. Rien de ce que l'élève tape n'est envoyé ni enregistré. */
/* =====================  PARTIE 1 : LES ÉLÉMENTS D'UN MOT DE PASSE SOLIDE  ===================== */
const STEPS = [
  { z:'why', t:"À quoi sert un mot de passe", x:"C'est la clé de ton compte : messagerie, jeux, école en ligne. Si quelqu'un d'autre la trouve, il peut lire tes messages, utiliser ton compte et se faire passer pour toi.", tip:"Pense à ton mot de passe comme à la clé de ta maison : elle n'est qu'à toi.", a:"Le donner à un ami « pour dépanner »." },
  { z:'len', t:"La longueur, c'est le plus important", x:"Plus un mot de passe est long, plus il est difficile à deviner. Vise au moins 15 caractères. Un mot de passe court se trouve vite, même s'il est rempli de symboles.", tip:"15 caractères ou plus.", a:"Un mot de passe de 6 ou 8 caractères." },
  { z:'mix', t:"Le mélange", x:"Mélange des minuscules, des majuscules, des chiffres et des symboles comme ! ? # @. Chaque type de caractère ajoute des possibilités et rend le mot de passe plus difficile à deviner.", tip:"Au moins trois types de caractères différents.", a:"Seulement des minuscules, ou seulement des chiffres." },
  { z:'phrase', t:"La phrase de passe", x:"Retenir 15 caractères au hasard, c'est difficile. Invente plutôt une phrase que toi seul connais, puis garde la première lettre de chaque mot, avec les chiffres et la ponctuation. Tu peux aussi assembler plusieurs mots qui n'ont rien à voir entre eux.", tip:"« Chaque mardi, mon chat Pixel dort dans le salon depuis 2019 ! » devient CmmcPddlsd2019!", a:"Une phrase que tout le monde connaît, comme un titre de chanson." },
  { z:'unique', t:"Un mot de passe par compte", x:"Si tu utilises le même mot de passe partout et qu'un site se fait pirater, tous tes comptes sont en danger. Un mot de passe différent pour chaque compte limite les dégâts.", tip:"Un mot de passe différent pour ta messagerie, ton jeu et l'école.", a:"Le même mot de passe sur tous les sites." },
  { z:'avoid', t:"Ce qu'on évite", x:"Évite tout ce qui se devine facilement : ton prénom, ta date de naissance, le nom de ton animal, « azerty », « 123456 » ou « motdepasse ». Ce sont les premiers essais de quelqu'un qui cherche à entrer dans un compte.", tip:"Rien qui parle de toi et que d'autres peuvent connaître.", a:"Ton prénom suivi de ton année de naissance." },
  { z:'secret', t:"Le garder secret et bien protégé", x:"Ne le dis à personne, sauf à un adulte de confiance quand c'est nécessaire. Ne le note pas sur un post-it collé à l'écran. Un gestionnaire de mots de passe peut les retenir pour toi, et la double authentification, un code reçu sur ton téléphone, ajoute une deuxième protection.", tip:"Active la double authentification quand un site la propose.", a:"Un post-it sur l'écran, ou un fichier « mots de passe » sur le bureau." },
  { z:'shared', t:"Sur un ordinateur partagé", x:"À l'école ou à la bibliothèque, d'autres utilisent l'ordinateur après toi. Ouvre une fenêtre de navigation privée, réponds toujours NON quand le navigateur propose de retenir ton mot de passe, puis déconnecte-toi avec le bouton de ton compte et supprime tes fichiers personnels.", tip:"Avant de partir : se déconnecter, supprimer ses fichiers, vérifier qu'on n'oublie rien.", a:"Fermer simplement la fenêtre sans se déconnecter." }
];

/* =====================  PARTIE 2 : SOLIDE OU À ÉVITER ?  ===================== */
/* Mots de passe fictifs : aucun n'appartient à une vraie personne. */
const TRI = [
  { p:'azerty123', ok:false, why:"C'est une suite de touches du clavier suivie de chiffres faciles, et il est court (9 caractères). Il fait partie des premiers essais." },
  { p:'Lucas2013', ok:false, why:"Un prénom et une année : deux informations qu'on peut deviner. Il est aussi court (9 caractères)." },
  { p:'CmmcPddlsd2019!', ok:true, why:"15 caractères, un bon mélange, et il vient d'une phrase que seul son auteur connaît." },
  { p:'Zx9!kQ#2', ok:false, why:"Il est bien mélangé mais trop court (8 caractères). La longueur compte plus que les symboles." },
  { p:'Pt!tGat-Bleu-Orage-7-Tasse', ok:true, why:"26 caractères, des mots qui n'ont aucun lien entre eux, des chiffres et des symboles : difficile à deviner." },
  { p:'1234567890123456', ok:false, why:"Il est long (16 caractères) mais c'est une suite évidente de chiffres, essayée très tôt." },
  { p:'ilovefootball', ok:false, why:"Des mots courants, rien que des minuscules, aucun chiffre ni symbole." },
  { p:'Mx7-Soleil-Tram-Coffre-31!', ok:true, why:"26 caractères, des mots sans rapport, des chiffres et des symboles : long et imprévisible." }
];

/* =====================  QUIZ  ===================== */
const QCM = {
  comprendre: [
    { q:"Quelle longueur vises-tu pour un mot de passe solide ?", o:["6 caractères","15 caractères ou plus","La longueur n'a pas d'importance"], a:1, why:"Plus un mot de passe est long, plus il est difficile à deviner : vise au moins 15 caractères." },
    { q:"Comment retenir facilement un long mot de passe ?", o:["Avec une phrase que toi seul connais, en gardant la première lettre de chaque mot","En le notant sur un post-it","En utilisant ton prénom"], a:0, why:"Une phrase de passe est facile à retenir et donne un mot de passe long et imprévisible." },
    { q:"Tu as le même mot de passe sur trois sites et l'un d'eux est piraté. Que risque-t-il d'arriver ?", o:["Rien du tout","Les deux autres comptes sont aussi en danger","Les deux autres sont protégés"], a:1, why:"Avec un mot de passe unique par compte, un site piraté n'ouvre pas les autres." },
    { q:"À quoi sert la double authentification ?", o:["À ajouter une deuxième protection, comme un code reçu sur ton téléphone","À retenir ton mot de passe à ta place","À raccourcir ton mot de passe"], a:0, why:"Même si quelqu'un trouve ton mot de passe, il lui manque encore le code." }
  ],
  trier: [
    { q:"Quel mot de passe est le plus solide ?", o:["azerty123","Lucas2013","CmmcPddlsd2019!"], a:2, why:"Il est long, mélangé et construit à partir d'une phrase." },
    { q:"Pourquoi « Lucas2013 » est-il faible ?", o:["Il contient un prénom et une année qu'on peut deviner","Il est trop long","Il n'a pas de chiffre"], a:0, why:"Les informations personnelles se devinent facilement." },
    { q:"Un mot de passe de 8 caractères avec des symboles : est-ce assez ?", o:["Oui, les symboles suffisent","Non, il est trop court","Oui, si je le change chaque jour"], a:1, why:"La longueur compte plus que les symboles : vise 15 caractères ou plus." },
    { q:"Lequel est une bonne idée ?", o:["Quatre mots sans lien, des chiffres et des symboles","Le nom de ton chien","Une suite de touches du clavier"], a:0, why:"Des mots sans rapport donnent un mot de passe long et difficile à deviner." }
  ]
};
const BANK_EXTRA = [
  { part:1, q:"Que fais-tu de ton mot de passe ?", o:["Je le garde secret","Je le donne à mes amis","Je le colle sur l'écran"], a:0, why:"Un mot de passe est secret : c'est la clé de ton compte." },
  { part:1, q:"Quels types de caractères peux-tu mélanger ?", o:["Minuscules, majuscules, chiffres et symboles","Seulement des chiffres","Seulement ton prénom"], a:0, why:"Plus il y a de types de caractères, plus il est difficile à deviner." },
  { part:2, q:"« 1234567890123456 » a 16 caractères. Est-il solide ?", o:["Oui, il est long","Non, c'est une suite évidente de chiffres","Oui, les chiffres sont toujours forts"], a:1, why:"Une suite évidente est essayée très tôt, même quand elle est longue." },
  { part:2, q:"Pourquoi éviter « motdepasse » ?", o:["C'est un mot courant, vite essayé","Il est trop long","Il a un symbole"], a:0, why:"Les mots les plus courants sont les premiers essayés." },
  { part:1, q:"Sur l'ordinateur de l'école, le navigateur propose d'enregistrer ton mot de passe. Que réponds-tu ?", o:["Non, jamais","Oui, c'est pratique","Oui, pour la prochaine fois"], a:0, why:"Un mot de passe enregistré reste disponible pour tous ceux qui utilisent ensuite l'ordinateur." },
  { part:1, q:"Comment quittes-tu un ordinateur partagé ?", o:["Je me déconnecte avec le bouton de mon compte","Je ferme seulement la fenêtre","Je laisse ma session ouverte"], a:0, why:"Fermer la fenêtre ne suffit pas toujours : certaines sessions restent ouvertes." },
  { part:1, q:"Où peux-tu noter un mot de passe sans risque ?", o:["Dans ta tête ou dans un gestionnaire de mots de passe","Sur un post-it collé à l'écran","Dans un fichier « mots de passe » sur le bureau"], a:0, why:"Un post-it ou un fichier en clair se lit par tous ceux qui passent." },
  { part:1, q:"Avant de saisir un mot de passe sur un site, que vérifies-tu ?", o:["Que l'adresse commence par https","Que la page est colorée","Que le site a beaucoup de visiteurs"], a:0, why:"« https » indique une connexion sécurisée." },
  { part:1, q:"Que fais-tu de tes fichiers personnels sur un ordinateur partagé ?", o:["Je les supprime avant de partir","Je les laisse dans Téléchargements","Je les renomme"], a:0, why:"Ceux qui utilisent l'ordinateur après toi pourraient les ouvrir." },
  { part:1, q:"Quelle phrase donne « CmmcPddlsd2019! » ?", o:["Chaque mardi, mon chat Pixel dort dans le salon depuis 2019 !","Mon chat dort dans le salon.","Le mardi 2019, un chat !"], a:0, why:"On garde la première lettre de chaque mot, puis les chiffres et la ponctuation." }
];
const BANK = () => [ ...QCM.comprendre.map(q => ({ ...q, part:1 })), ...QCM.trier.map(q => ({ ...q, part:2 })), ...BANK_EXTRA ];
const FQ_COUNT = 10;

const PARTS = [
  { k:'comprendre', n:1, title:'Comprendre un mot de passe solide', hl:'mot de passe solide', img:'keypace-perso-mot-de-passe', desc:"Les 8 règles d'un mot de passe solide, une par une. Fais défiler : chaque étape allume la zone correspondante.", prev:['8 étapes','Compte annoté','Quiz'] },
  { k:'trier', n:2, title:'Solide ou à éviter ?', hl:'à éviter', img:'keypace-perso-netiquette', desc:"Pose-toi trois questions, puis trie huit mots de passe : lesquels résistent, lesquels se devinent vite, et pourquoi.", prev:['3 questions','8 mots de passe','Quiz'] }
];
const hlTitle = p => p.title.replace(p.hl, `<em>${p.hl}</em>`);

const $ = s => document.querySelector(s);
const shuffle = a => a.map(x => [Math.random(), x]).sort((x,y) => x[0]-y[0]).map(x => x[1]);
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);
const srcRow = ids => '';   /* pastilles de sources retirées de l'affichage (données conservées dans SRC) */
const store = { get(){ try{ return JSON.parse(localStorage.getItem('kp-mdp-done')||'{}'); }catch(e){ return {}; } }, set(o){ try{ localStorage.setItem('kp-mdp-done', JSON.stringify(o)); }catch(e){} } };
let done = store.get(), io = null, tmr = null;
const BEST_KEY = 'kp-mdp-quiz-best';
const getBest = () => { try{ return +localStorage.getItem(BEST_KEY) || 0; }catch(e){ return 0; } };
const setBest = n => { try{ localStorage.setItem(BEST_KEY, String(n)); }catch(e){} };
const allDone = () => PARTS.every(p => done[p.k]);
function completePart(k){
  done[k] = true; store.set(done);
  const f = $('#finish'), p = PARTS.find(x => x.k === k);
  if (f && '#mdp/'+p.n === location.hash){ f.textContent = 'Terminée ✓'; f.className = 'btn ok'; const r = $('#restart'); if (r) r.hidden = false; refreshNext(); }
}
function refreshNext(){ const nx = $('#next4'); if (!nx) return; if (allDone()){ nx.textContent = 'Quiz final →'; nx.onclick = () => { location.hash = 'mdp/quiz'; }; } }
function show(id){ document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === id)); window.scrollTo(0,0); }

function route(){
  if (io){ io.disconnect(); io = null; }
  clearInterval(tmr);
  const h = location.hash.replace('#','');
  if (h === 'mdp') return renderHub();
  if (h === 'mdp/quiz') return allDone() ? renderFinalQuiz() : renderHub();
  const m = h.match(/^mdp\/(\d)$/);
  if (m && PARTS[m[1]-1]) return renderLesson(PARTS[m[1]-1]);
  renderHub();
}
window.addEventListener('hashchange', route);
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g){ if (g.dataset.go === 'cours'){ location.href = '/?view=lessons'; return; } location.hash = g.dataset.go === 'hub' ? 'mdp' : g.dataset.go; return; }
  if (e.target.id === 'restart'){ const p = PARTS.find(x => '#mdp/'+x.n === location.hash); if (p) renderLesson(p); return; }
  if (e.target.id === 'reset-all'){ if (confirm("Effacer ta progression dans ce module ? Tu pourras tout refaire depuis le début.")){ done = {}; store.set(done); try{ localStorage.removeItem(BEST_KEY); }catch(err){} renderHub(); } return; }
  if (e.target.id === 'finish'){ const p = PARTS.find(x => '#mdp/'+x.n === location.hash); if (p){ completePart(p.k); location.hash = 'cv'; } }
});

/* ---------------- Hub ---------------- */
const MINI = {
  comprendre:`<div class="mw"><div class="dots"><i></i><i></i><i></i></div><div class="ml"></div><div class="ml"></div><div class="ml"></div><div class="ml"></div></div>`,
  trier:`<div class="m2"><div class="who" id="rec-who">azerty123</div><div class="bars" id="rec-bars">${[1,2,3,4,5].map(()=>'<span></span>').join('')}</div></div>`
};
function partCard(p){
  const d = done[p.k];
  return `<button class="part ${d?'done':''}" onclick="location.hash='mdp/${p.n}'">
    <div class="mini">${MINI[p.k]}</div>
    ${d ? '<span class="badge-done">Terminée ✓</span>' : ''}
    <h3>${p.title}</h3><p>${p.desc}</p>
    <div class="prev">${p.prev.map(x => `<span>${x}</span>`).join('')}</div>
    <div class="foot"><span class="dur">Partie ${p.n}</span><span class="cta">${d?'Revoir':'Ouvrir'} →</span></div>
  </button>`;
}
function startRecDemo(){
  const seq = [{l:'azerty123',f:1},{l:'Lucas2013',f:2},{l:'Zx9!kQ#2',f:3},{l:'CmmcPddlsd2019!',f:5}]; let i = 0;
  const tick = () => { const w = $('#rec-who'), b = $('#rec-bars'); if (!w || !b) return; const c = seq[i++ % seq.length]; w.textContent = c.l; [...b.children].forEach((x,j) => x.className = j < c.f ? 'f' : ''); };
  tick(); tmr = setInterval(tick, 1700);
}
function quizBanner(n){
  const all = n === PARTS.length, best = getBest();
  if (!all) return `<section class="qbanner locked"><img src="/images/keypace-mascot-cheer.webp" alt="">
    <div class="qb-txt"><span class="qb-tag">Quiz final · 🔒 Verrouillé</span><h2>Le quiz du mot de passe</h2><p>Termine les 2 parties pour le débloquer. Il reprend tout le module, question après question, au hasard.</p></div>
    <div class="qb-act"><div class="qb-prog"><i style="width:${n/PARTS.length*100}%"></i></div><span style="font-size:12.5px;color:var(--muted)">${n}/${PARTS.length} parties terminées</span></div></section>`;
  return `<section class="qbanner"><img src="/images/keypace-mascot-cheer.webp" alt="">
    <div class="qb-txt"><span class="qb-tag">Module terminé, bravo !</span><h2>Teste-toi avec le quiz <em>du mot de passe</em></h2><p>${FQ_COUNT} questions tirées au hasard dans toutes les parties, une à la fois. Tu peux rejouer autant de fois que tu veux.</p>
      <div class="qb-meta"><span>${FQ_COUNT} questions</span><span>Au hasard</span>${best ? `<span>Meilleur score : ${best}/${FQ_COUNT}</span>` : ''}</div></div>
    <div class="qb-act"><button class="btn primary" onclick="location.hash='mdp/quiz'" style="font-size:16px;padding:14px 26px">Jouer →</button></div></section>`;
}
function renderHub(){
  const n = PARTS.filter(p => done[p.k]).length, all = n === PARTS.length;
  $('#hub-prog').textContent = n + '/' + PARTS.length + ' parties';
  $('#hub-bar').style.width = (n/PARTS.length*100) + '%';
  $('#hub-meta').innerHTML = `<div class="ring" style="--p:${n/PARTS.length*100}"><i>${n}/${PARTS.length}</i></div><span>parties terminées</span>${n ? '<button class="linkbtn" id="reset-all">Réinitialiser ma progression</button>' : ''}`;
  const nextK = all ? null : (PARTS.find(p => !done[p.k]) || {}).k, mascots = ['cheer','idea','books','cheer'];
  $('#parts-host').innerHTML = `<div class="road">${PARTS.map((p,i) => `
    <div class="stop ${done[p.k]?'done':''} ${p.k===nextK?'next':''}">
      ${partCard(p)}
      <div class="node">${done[p.k] ? '✓' : p.n}</div>
      <div class="side">${p.k===nextK ? `<img src="/images/keypace-mascot-${mascots[i]}.webp" alt=""><span class="bubble">${n ? 'Tu en es là !' : 'Commence ici !'}</span>` : ''}</div>
    </div>`).join('')}</div>${quizBanner(n)}`;
  startRecDemo();
  show('v-hub');
}

/* ---------------- Quiz final et QCM ---------------- */
function drawFinalDeck(){
  const bank = shuffle(BANK()), deck = [];
  [1,2].forEach(pt => bank.filter(q => q.part === pt).slice(0,2).forEach(q => deck.push(q)));
  bank.filter(q => !deck.includes(q)).slice(0, FQ_COUNT - deck.length).forEach(q => deck.push(q));
  return shuffle(deck).map(q => { const idx = shuffle(q.o.map((_,i) => i)); return { ...q, o:idx.map(i => q.o[i]), a:idx.indexOf(q.a) }; });
}
function renderFinalQuiz(){
  $('#crumb-part').textContent = 'Quiz final'; $('#lesson-pos').textContent = 'Quiz final';
  $('#lesson-hero').innerHTML = `<div class="hero small"><div class="wrap"><div class="txt"><span class="tag">Quiz final</span><h1>Le quiz <em>du mot de passe</em></h1><p>${FQ_COUNT} questions tirées au hasard dans toutes les parties. Une à la fois, dans un ordre différent à chaque partie.</p></div><img src="/images/keypace-mascot-cheer.webp" alt=""></div></div>`;
  $('#lesson-root').innerHTML = `<div id="fq"></div><div class="lesson-foot"><button class="btn" onclick="location.hash='mdp'">← Retour au module</button><span></span></div>`;
  show('v-lesson'); initFinalQuiz($('#fq'));
}
function initFinalQuiz(el){
  let deck = drawFinalDeck(), i = 0, picked = null, res = [];
  const draw = () => {
    if (i >= deck.length){
      const sc = res.filter(Boolean).length, N = deck.length, best = getBest(), isBest = sc > best;
      if (isBest) setBest(sc);
      const msg = sc === N ? 'Sans faute ! Tu sais créer un mot de passe solide.' : sc >= N*0.8 ? 'Excellent, presque parfait.' : sc >= N*0.5 ? 'Bien joué, encore quelques points à revoir.' : 'Pas facile ! Reprends les parties puis retente.';
      const missed = deck.map((q,k) => ({ q, ok:res[k] })).filter(x => !x.ok);
      el.innerHTML = `<section class="qz" style="margin-top:34px"><div class="qz-top"><h2>Résultat du quiz</h2></div>
        <div class="res"><div class="score">${sc}/${N}</div><div><p style="font-size:17px;font-weight:600">${msg}</p><p style="color:var(--muted);font-size:14px">${isBest && sc > 0 ? 'Nouveau meilleur score !' : `Meilleur score : ${Math.max(best, sc)}/${N}`}</p></div></div>
        ${missed.length ? `<div class="miss-list"><b style="font-family:'Bricolage Grotesque',sans-serif;font-size:17px">À revoir</b>${missed.map(x => `<div><span class="fq-part">Partie ${x.q.part}</span> ${x.q.q}<small>Bonne réponse : ${x.q.o[x.q.a]}. ${x.q.why}</small></div>`).join('')}</div>` : ''}
        <div class="btnrow" style="margin-top:22px"><button class="btn primary" id="fq-again">Rejouer avec de nouvelles questions</button><button class="btn" onclick="location.hash='mdp'">Retour au module</button></div></section>`;
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
        <div class="btnrow" style="margin-top:20px"><button class="btn" id="qz-again">Refaire le quiz</button>${PARTS[p.n] ? `<button class="btn primary" onclick="location.hash='mdp/${p.n+1}'">${PARTS[p.n].title} →</button>`:''}</div></section>`;
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
  ({ comprendre:initComprendre, trier:initTrier })[p.k]($('#lesson-body'));
  if (QCM[p.k]) initQCM($('#lesson-quiz'), p);
}
function footer(p){
  const prev = PARTS[p.n-2], next = PARTS[p.n];
  const nextBtn = next ? `<button class="btn dark" onclick="location.hash='mdp/${next.n}'">${next.title} →</button>`
    : (allDone() ? `<button class="btn dark" id="next4" onclick="location.hash='mdp/quiz'">Quiz final →</button>` : `<button class="btn dark" id="next4" onclick="location.hash='mdp'">Retour au module</button>`);
  return `<div class="lesson-foot">
    ${prev ? `<button class="btn" onclick="location.hash='mdp/${prev.n}'">← ${prev.title}</button>` : `<button class="btn" onclick="location.hash='mdp'">← Retour au module</button>`}
    <span class="foot-grp"><button class="btn" id="restart" ${done[p.k]?'':'hidden'}>↺ Recommencer cette partie</button>
    <button class="btn ${done[p.k]?'ok':'primary'}" id="finish">${done[p.k] ? 'Terminée ✓' : 'Terminer cette partie'}</button></span>${nextBtn}</div>`;
}

/* ---------------- Outils communs : types de caractères ---------------- */
const charType = c => /[a-zà-ÿ]/.test(c) ? 'l' : /[A-ZÀ-Ý]/.test(c) ? 'u' : /\d/.test(c) ? 'd' : 'o';
const colorize = t => Array.from(String(t)).map(c => c === ' ' ? ' ' : `<span class="c-${charType(c)}">${esc(c)}</span>`).join('');

/* ---------------- Partie 1 ---------------- */
function initComprendre(el){
  const z = (k, inner) => `<div class="zone" data-z="${k}">${inner}</div>`;
  const EX = 'CmmcPddlsd2019!';
  el.innerHTML = `<div class="anat">
    <div>${STEPS.map((s,i) => `<article class="step" data-i="${i}">
      <div class="t"><span class="n">${String(i+1).padStart(2,'0')}</span><h3>${s.t}</h3></div>
      <p class="x">${s.x}</p>
      <div style="display:grid;gap:10px"><div class="tip"><b>Astuce :</b> ${s.tip}</div><div class="avoid"><b>À éviter :</b> ${s.a}</div></div>
    </article>`).join('')}</div>
    <div class="stk">
      <div class="cap"><span>Exemple fictif : le compte de Léa</span><b id="active-label"></b></div>
      <div class="pwcard">
        ${z('why','<div class="pw-h"><span class="lock">🔒</span><div><b>Mon compte</b><small>lea.martin@mail.be</small></div></div>')}
        <h4>Mot de passe</h4>
        ${z('len',`<div class="pwfield"><span>${colorize(EX)}</span><span class="cnt">${EX.length} caractères</span></div>`)}
        ${z('mix','<div class="pwlegend"><span class="c-l">minuscules</span><span class="c-u">MAJUSCULES</span><span class="c-d">chiffres</span><span class="c-o">symboles</span></div>')}
        ${z('phrase',`<div class="pw-sent">« Chaque mardi, mon chat Pixel dort dans le salon depuis 2019 ! »</div><div class="pw-arrow">↓ la première lettre de chaque mot, puis les chiffres et la ponctuation</div><div class="pwfield"><span>${colorize(EX)}</span></div>`)}
        <h4>Un mot de passe par compte</h4>
        ${z('unique','<div class="acc"><span>Messagerie</span><span class="mask">•••••••••••••••</span></div><div class="acc"><span>Jeu en ligne</span><span class="mask">••••••••••••••••••</span></div><div class="acc"><span>École en ligne</span><span class="mask">••••••••••••••••••••</span></div>')}
        <h4>À éviter</h4>
        ${z('avoid','<span class="bad-pw">azerty</span><span class="bad-pw">123456</span><span class="bad-pw">Lea2012</span><span class="bad-pw">motdepasse</span>')}
        <h4>Protection</h4>
        ${z('secret','<span class="pill2">Double authentification</span><span class="pill2">Gestionnaire de mots de passe</span><span class="pill2">Jamais sur un post-it</span>')}
        ${z('shared','<div class="pwshared"><b>Ordinateur de l\'école</b><span>Navigation privée</span><span>« Jamais » pour enregistrer le mot de passe</span><span>Se déconnecter</span><span>Supprimer ses fichiers</span></div>')}
      </div>
    </div>
  </div>`;
  const steps = [...el.querySelectorAll('.step')], zones = [...el.querySelectorAll('[data-z]')];
  const set = i => { steps.forEach((s,j) => s.classList.toggle('on', j === i)); zones.forEach(zn => zn.classList.toggle('on', zn.dataset.z === STEPS[i].z));
    $('#active-label').textContent = String(i+1).padStart(2,'0') + ' · ' + STEPS[i].t; };
  set(0);
  io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) set(+en.target.dataset.i); }), { rootMargin:'-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
}

/* ---------------- Partie 2 : trier des mots de passe ---------------- */
function initTrier(el){
  let S = TRI.map(() => null);   // null = pas encore répondu, true / false = réponse « solide » ou non
  const draw = () => {
    const nDone = S.filter(x => x !== null).length, good = S.filter((x,i) => x !== null && x === TRI[i].ok).length;
    el.innerHTML = `<div class="aw">
      <p class="aw-intro">Un mot de passe, c'est comme une clé : plus elle est difficile à copier, mieux ta porte est fermée. Un programme peut essayer très vite beaucoup de mots de passe. Il commence par les plus courants (« azerty », « 123456 »), puis par les prénoms et les dates. Plus ton mot de passe est <b>long</b> et <b>imprévisible</b>, plus il y a de possibilités à essayer. Pour juger un mot de passe, pose-toi trois questions.</p>
      <div class="q3">
        <div><b>1</b><h4>Est-il assez long ?</h4><p>Vise 15 caractères ou plus. Un mot de passe court tombe vite, même avec des symboles.</p></div>
        <div><b>2</b><h4>Est-il mélangé ?</h4><p>Des minuscules, des majuscules, des chiffres et des symboles. Mais un mélange court ne suffit pas.</p></div>
        <div><b>3</b><h4>Quelqu'un peut-il le deviner ?</h4><p>Prénom, date de naissance, mot courant, suite de touches : tout ce qui se devine est à éviter.</p></div>
      </div>
      <h2 class="aw-h2">À toi de trier</h2>
      <p class="aw-intro" style="margin-top:0">Ces mots de passe sont inventés pour l'exercice. Pour chacun, dis s'il est solide ou à éviter.</p>
      <div class="tri-list">${TRI.map((t,i) => {
        const a = S[i], ans = a !== null, right = ans && a === t.ok;
        return `<div class="tri ${ans ? (right ? 'ok' : 'ko') : ''}">
          <div class="tri-top"><div class="pwfield"><span>${colorize(t.p)}</span><span class="cnt">${t.p.length} car.</span></div>
          <div class="tri-b">${ans ? `<span class="tri-res">${right ? '✓ Bien vu' : '✗ Pas tout à fait'}</span>` : `<button class="btn" data-t="${i}-1">Solide</button><button class="btn" data-t="${i}-0">À éviter</button>`}</div></div>
          ${ans ? `<p class="tri-why"><b>${t.ok ? 'Solide.' : 'À éviter.'}</b> ${t.why}</p>` : ''}</div>`; }).join('')}</div>
      <div class="btnrow" style="margin-top:18px;align-items:center">${nDone === TRI.length ? `<span class="msg" style="color:var(--mod-d)">${good}/${TRI.length} bien triés</span><button class="btn" id="tri-again">Recommencer</button>` : `<span class="hint2">${nDone}/${TRI.length} répondus</span>`}</div>
    </div>`;
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const [i, v] = b.dataset.t.split('-'); S[+i] = v === '1'; const y = scrollY; draw(); scrollTo(0, y); });
    const ag = $('#tri-again'); if (ag) ag.onclick = () => { S = TRI.map(() => null); draw(); };
  };
  draw();
}

route();
