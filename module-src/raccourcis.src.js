/* Module « Les raccourcis clavier » : même moteur que les modules signature, adresse, mail, CV et mot de passe. Rien de ce que l'élève tape ici n'est envoyé : tout reste dans son navigateur. */
/* =====================  PLATEFORME ET RACCOURCIS  ===================== */
const PLAT_KEY = 'kp-raccourcis-plat';
let PLAT = (() => { try{ const s = localStorage.getItem(PLAT_KEY); if (s === 'win' || s === 'mac') return s; }catch(e){} return /Mac/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '') ? 'mac' : 'win'; })();
const setPlat = p => { PLAT = p; try{ localStorage.setItem(PLAT_KEY, p); }catch(e){} };
const KEYLAB = { win:{ ctrl:'Ctrl', shift:'Maj', alt:'Alt', opt:'Alt', cmd:'Ctrl', tab:'Tab' }, mac:{ ctrl:'Ctrl', shift:'⇧ Maj', alt:'Alt', opt:'⌥ Option', cmd:'⌘ Cmd', tab:'Tab' } };
const lab = k => KEYLAB[PLAT][k] || k;
const kbd = c => `<span class="kbd">${c.map(k => `<kbd>${lab(k)}</kbd>`).join('<i>+</i>')}</span>`;
/* live : on peut détecter la frappe dans la page. Les autres (onglets, fenêtres) sont réservés au navigateur ou au système. */
const SC = {
  copy:  { n:'Copier', win:['ctrl','C'], mac:['cmd','C'], live:true },
  cut:   { n:'Couper', win:['ctrl','X'], mac:['cmd','X'], live:true },
  paste: { n:'Coller', win:['ctrl','V'], mac:['cmd','V'], live:true },
  all:   { n:'Tout sélectionner', win:['ctrl','A'], mac:['cmd','A'], live:true },
  word:  { n:'Sélectionner mot par mot', win:['ctrl','shift','→'], mac:['opt','shift','→'], live:false },
  undo:  { n:'Annuler', win:['ctrl','Z'], mac:['cmd','Z'], live:true },
  redo:  { n:'Rétablir', win:['ctrl','Y'], mac:['cmd','shift','Z'], live:true },
  bold:  { n:'Gras', win:['ctrl','G'], mac:['cmd','B'], alt:{ win:['ctrl','B'] }, live:true },
  ital:  { n:'Italique', win:['ctrl','I'], mac:['cmd','I'], live:true },
  under: { n:'Souligné', win:['ctrl','U'], mac:['cmd','U'], live:true },
  save:  { n:'Enregistrer', win:['ctrl','S'], mac:['cmd','S'], live:true },
  find:  { n:'Rechercher', win:['ctrl','F'], mac:['cmd','F'], live:true },
  print: { n:'Imprimer', win:['ctrl','P'], mac:['cmd','P'], live:true },
  ntab:  { n:'Nouvel onglet', win:['ctrl','T'], mac:['cmd','T'], live:false },
  ctab:  { n:'Fermer l\'onglet', win:['ctrl','W'], mac:['cmd','W'], live:false },
  rtab:  { n:'Rouvrir l\'onglet fermé', win:['ctrl','shift','T'], mac:['cmd','shift','T'], live:false },
  stab:  { n:'Onglet suivant', win:['ctrl','tab'], mac:['ctrl','tab'], live:false },
  swin:  { n:'Changer de fenêtre', win:['alt','tab'], mac:['cmd','tab'], live:false },
  refr:  { n:'Actualiser la page', win:['ctrl','R'], mac:['cmd','R'], live:false },
  addr:  { n:'Aller à la barre d\'adresse', win:['ctrl','L'], mac:['cmd','L'], live:false }
};
const combo = id => SC[id][PLAT];
function matches(e, c){
  const need = { ctrl:0, cmd:0, shift:0, alt:0 }; let key = null;
  c.forEach(k => { if (k in need) need[k] = 1; else key = k; });
  const has = { ctrl:e.ctrlKey, cmd:e.metaKey, shift:e.shiftKey, alt:e.altKey };
  for (const m in need) if (!!has[m] !== !!need[m]) return false;
  return (e.key || '').toLowerCase() === String(key).toLowerCase();
}
const pressed = (e, id) => { const c = combo(id); if (matches(e, c)) return true; const a = SC[id].alt && SC[id].alt[PLAT]; return !!a && matches(e, a); };
/* Lettres du clavier : on se fie à e.key (la lettre imprimée sur la touche), donc AZERTY, QWERTY et le reste fonctionnent pareil. AltGr (Ctrl+Alt) est refusé. */

/* =====================  PARTIE 1 : COPIER, COUPER, COLLER  ===================== */
const STEPS1 = [
  { z:'why', t:"Pourquoi apprendre les raccourcis", x:"Un raccourci clavier, c'est une petite combinaison de touches qui fait tout de suite ce qu'on irait chercher dans un menu avec la souris. Tu gardes les mains sur le clavier, tu ne perds pas le fil de ce que tu écris, et les mêmes raccourcis marchent dans presque tous les programmes.", tip:"Une fois qu'ils sont dans les doigts, tu n'y penses plus.", a:"Lâcher le clavier pour la souris à chaque petite action." },
  { z:'mod', t:"La touche qui change : Ctrl ou Cmd", x:"Presque tous les raccourcis se font en maintenant une touche enfoncée, puis en appuyant sur une lettre. Sur un ordinateur Windows (ou Chromebook), cette touche s'appelle Ctrl. Sur un Mac, c'est Cmd (la touche avec le signe ⌘), juste à côté de la barre d'espace. Les lettres, elles, restent les mêmes.", tip:"Maintiens la touche enfoncée, appuie sur la lettre, puis relâche les deux.", a:"Appuyer sur la lettre seule : tu écris la lettre au lieu de lancer l'action." },
  { z:'copy', t:"Copier", x:"Copier fait une copie de ce que tu as sélectionné (un mot, une phrase, une image). L'original reste où il est. La copie est gardée en mémoire, dans le « presse-papiers », prête à être collée.", tip:"Sélectionne d'abord, puis copie : sans sélection, il n'y a rien à copier.", a:"Copier sans avoir rien sélectionné, puis s'étonner que le collage ne donne rien de nouveau." },
  { z:'paste', t:"Coller", x:"Coller dépose ce qui est dans le presse-papiers à l'endroit où se trouve ton curseur. Tu peux coller autant de fois que tu veux, tant que tu ne copies rien d'autre.", tip:"Clique d'abord à l'endroit voulu, puis colle.", a:"Coller sans avoir cliqué à la bonne place : le texte arrive là où se trouvait le curseur." },
  { z:'cut', t:"Couper", x:"Couper, c'est copier et enlever en même temps : le texte disparaît d'ici et reste en mémoire pour être collé ailleurs. C'est la façon de déplacer quelque chose : on coupe, on clique plus loin, on colle.", tip:"Pour déplacer : couper, cliquer ailleurs, coller.", a:"Couper alors qu'on voulait garder l'original. Pour garder, on copie." },
  { z:'one', t:"Le presse-papiers ne garde qu'une chose", x:"La mémoire du copier-coller n'a qu'une place : si tu copies (ou coupes) autre chose, ça remplace ce qui y était. Pense donc à coller avant de copier à nouveau.", tip:"Une copie, un collage. Ensuite seulement, la copie suivante.", a:"Copier deux phrases à la suite en espérant les coller toutes les deux." },
  { z:'mem', t:"Comment les retenir", x:"C comme Copier. X ressemble à des ciseaux croisés : couper. V est juste à côté, c'est l'endroit où on dépose. Regarde ton clavier : X, C et V se suivent sur la rangée du bas, tout près de la touche Ctrl ou Cmd, ce qui permet de les faire d'une seule main.", tip:"Rangée du bas : X (couper), C (copier), V (coller), dans cet ordre.", a:"Chercher les touches en regardant le clavier à chaque fois." }
];

/* =====================  PARTIE 2 : SÉLECTIONNER ET ANNULER  ===================== */
const STEPS2 = [
  { z:'dbl', t:"Sélectionner à la souris", x:"Un double-clic sur un mot le sélectionne en entier. Un triple-clic sélectionne toute la ligne ou le paragraphe, dans la plupart des programmes. Pas besoin de viser précisément le début et la fin.", tip:"Double-clic : un mot. Triple-clic : tout le paragraphe.", a:"Glisser lentement la souris pour sélectionner un seul mot." },
  { z:'all', t:"Tout sélectionner", x:"Ce raccourci sélectionne tout le contenu du texte ou de la page où tu te trouves. C'est pratique pour copier un document entier, ou pour changer d'un coup la police de tout un texte.", tip:"Clique d'abord dans le texte, sinon c'est la page entière qui est sélectionnée.", a:"Cliquer en dehors du texte, puis s'étonner que la sélection ne couvre pas ce qu'on voulait." },
  { z:'shift', t:"Étendre avec Maj et les flèches", x:"La touche Maj (la grosse flèche vers le haut, au-dessus de Ctrl) sert à agrandir une sélection. Maj + flèche droite sélectionne une lettre de plus, Maj + flèche du bas une ligne de plus. Avec Ctrl en plus (Option sur Mac), la sélection avance mot par mot.", tip:"Maj + flèches : on ajuste la sélection au clavier, sans toucher à la souris.", a:"Recommencer toute la sélection à la souris pour une lettre en trop." },
  { z:'warn', t:"Attention : taper remplace la sélection", x:"Quand un texte est sélectionné, la prochaine lettre que tu tapes le remplace. C'est utile pour corriger un mot, mais surprenant si tu as tout sélectionné sans le vouloir : tout le texte disparaît. Pas de panique, il y a un raccourci pour revenir en arrière.", tip:"Si tout a disparu, ne retape rien : annule tout de suite.", a:"Retaper le texte à la main alors qu'un seul raccourci le ramène." },
  { z:'undo', t:"Annuler", x:"Annuler efface ta dernière action : une lettre tapée, un texte collé, une suppression. Appuie plusieurs fois pour remonter plusieurs actions en arrière. C'est le raccourci qui rend les erreurs sans importance.", tip:"Un doute, une fausse manipulation : annule d'abord, réfléchis ensuite.", a:"Fermer le document sans enregistrer parce qu'on a fait une erreur qu'on pouvait annuler." },
  { z:'redo', t:"Rétablir", x:"Si tu as annulé de trop, rétablir remet ce que tu venais d'annuler. Sous Windows, c'est Ctrl + Y. Sur Mac, c'est Cmd + Maj + Z : le même Z que pour annuler, avec Maj en plus.", tip:"Annuler et rétablir fonctionnent comme les touches « précédent » et « suivant ».", a:"Annuler trop de fois sans savoir qu'on peut revenir en avant." }
];

/* =====================  PARTIE 3 : METTRE EN FORME, ENREGISTRER, CHERCHER, IMPRIMER  ===================== */
const STEPS3 = [
  { z:'eng', t:"Des lettres qui viennent de l'anglais", x:"Beaucoup de raccourcis sont les initiales d'un mot anglais : S comme Save (enregistrer), F comme Find (chercher), P comme Print (imprimer), I comme Italic, U comme Underline (souligné), B comme Bold (gras). Retiens l'anglais, tu retrouveras la lettre.", tip:"Pas besoin de tout apprendre par cœur : la logique aide.", a:"Chercher une lettre logique en français : F pour « fouiller » ne marche pas, c'est F comme Find." },
  { z:'bold', t:"Gras, italique, souligné", x:"Sélectionne un mot, puis applique le style : gras pour insister, italique pour un titre d'œuvre ou un mot étranger, souligné avec parcimonie. Attention : dans Word en français, le gras est Ctrl + G (G comme gras). Dans Google Docs, dans la plupart des éditeurs de pages web et sur Mac, c'est la lettre B. Italique (I) et souligné (U) ne changent pas.", tip:"Si Ctrl + B ne marche pas dans Word en français, essaie Ctrl + G.", a:"Mettre tout un paragraphe en gras : plus rien ne ressort." },
  { z:'save', t:"Enregistrer", x:"Enregistrer écrit ton travail sur l'ordinateur, pour ne pas le perdre si l'ordinateur plante ou si la batterie s'éteint. La première fois, on te demande un nom et un endroit. Ensuite, le raccourci enregistre en un instant.", tip:"Enregistre souvent, par exemple après chaque paragraphe terminé.", a:"Travailler une heure sans jamais enregistrer." },
  { z:'find', t:"Rechercher", x:"Rechercher ouvre une petite barre où tu tapes un mot : l'ordinateur le trouve et le surligne partout dans la page ou dans le document. Entrée passe au résultat suivant. C'est très utile sur une page web longue ou un document de plusieurs pages.", tip:"Tape juste un morceau de mot : il suffit pour trouver.", a:"Relire toute une page à l'œil pour retrouver un mot." },
  { z:'print', t:"Imprimer", x:"Imprimer ouvre la fenêtre d'impression : tu y choisis l'imprimante, les pages et le nombre de copies, et tu vois un aperçu. Dans beaucoup de programmes, on peut aussi y choisir d'enregistrer le document en PDF au lieu de l'imprimer.", tip:"Regarde l'aperçu avant de lancer : il évite de gaspiller du papier.", a:"Lancer l'impression sans vérifier combien de pages vont sortir." }
];

/* =====================  PARTIE 4 : NAVIGATEUR ET FENÊTRES  ===================== */
const STEPS4 = [
  { z:'ntab', t:"Ouvrir un onglet", x:"Un onglet est une page web ouverte à côté des autres dans le même navigateur. Ouvrir un nouvel onglet te laisse garder la page où tu es et en consulter une autre, par exemple un exercice et sa définition.", tip:"Un onglet par sujet : c'est plus clair qu'une seule page où l'on navigue.", a:"Ouvrir vingt onglets et ne plus savoir lequel est lequel." },
  { z:'ctab', t:"Fermer un onglet", x:"Ferme l'onglet où tu te trouves, sans toucher à la souris. Une fois que tu as fini avec une page, ferme-la : l'ordinateur reste plus fluide et tu t'y retrouves mieux.", tip:"Ferme ce qui ne sert plus.", a:"Fermer par erreur le navigateur entier plutôt que l'onglet." },
  { z:'rtab', t:"Rouvrir un onglet fermé par erreur", x:"Tu as fermé la mauvaise page ? Ce raccourci rouvre le dernier onglet fermé, avec la page telle qu'elle était. En le répétant, tu remontes les onglets fermés l'un après l'autre.", tip:"C'est le Ctrl + Z des onglets : à retenir pour les maladresses.", a:"Chercher la page dans l'historique alors qu'un seul geste la ramène." },
  { z:'stab', t:"Passer d'un onglet à l'autre", x:"Ctrl + Tab te fait passer à l'onglet suivant, de gauche à droite. La touche Tab est celle avec deux flèches opposées, à gauche de la lettre A (AZERTY) ou Q. C'est valable sur Windows comme sur Mac.", tip:"Utile quand on alterne entre un cours et un exercice.", a:"Aller à chaque fois chercher l'onglet à la souris quand il y en a beaucoup." },
  { z:'swin', t:"Changer de fenêtre", x:"Quand plusieurs programmes sont ouverts (le navigateur, un traitement de texte, un lecteur de musique), Alt + Tab te fait passer de l'un à l'autre sous Windows : maintiens Alt et appuie sur Tab pour avancer dans la liste. Sur Mac, la même chose se fait avec Cmd + Tab.", tip:"Maintiens la touche de gauche, appuie sur Tab autant de fois qu'il faut, puis relâche.", a:"Réduire toutes les fenêtres une par une pour retrouver celle qu'on voulait." },
  { z:'refr', t:"Actualiser une page", x:"Actualiser recharge la page actuelle depuis le début. C'est la première chose à essayer quand une page web reste figée ou n'affiche pas la dernière version. Sous Windows, la touche F5 (en haut du clavier) fait la même chose.", tip:"Page figée : actualise avant de te dire que c'est cassé.", a:"Actualiser en plein remplissage d'un formulaire non envoyé : ce que tu as tapé peut disparaître." },
  { z:'addr', t:"Aller à la barre d'adresse", x:"Ce raccourci sélectionne l'adresse en haut du navigateur : tu peux taper tout de suite un nouveau site, ou une recherche. Pas besoin de viser la barre avec la souris.", tip:"Ctrl + L, tape l'adresse, Entrée : trois gestes.", a:"Cliquer au milieu de la barre et retaper au-dessus de l'ancienne adresse sans la sélectionner." }
];
/* Dans la partie 4, le navigateur garde ces raccourcis pour lui : la page ne peut donc pas les détecter. On s'entraîne par choix. */

/* =====================  QUIZ  ===================== */
const QCM = {
  copier: [
    { q:"Quelle est la touche à maintenir pour les raccourcis sur un ordinateur Windows ?", o:["Ctrl","Maj","Entrée"], a:0, why:"Sur Windows, c'est Ctrl. Sur Mac, c'est Cmd (⌘)." },
    { q:"Tu veux déplacer une phrase ailleurs dans le texte. Que fais-tu ?", o:["Je la coupe, je clique plus loin, je colle","Je la copie, puis je la colle, sans rien enlever","Je la sélectionne et j'appuie sur Entrée"], a:0, why:"Couper retire le texte et le garde en mémoire : c'est le geste pour déplacer." },
    { q:"Tu copies un mot, puis un autre mot. Qu'obtiens-tu en collant ?", o:["Le deuxième mot seulement","Les deux mots","Le premier mot seulement"], a:0, why:"Le presse-papiers n'a qu'une place : la nouvelle copie remplace l'ancienne." },
    { q:"Avant de copier, que dois-tu faire ?", o:["Sélectionner ce que je veux copier","Enregistrer le document","Fermer le programme"], a:0, why:"Sans sélection, il n'y a rien à copier." }
  ],
  selectionner: [
    { q:"Quel geste sélectionne un seul mot ?", o:["Un double-clic dessus","Un clic droit","Une frappe sur Échap"], a:0, why:"Double-clic : un mot. Triple-clic : le paragraphe, dans la plupart des programmes." },
    { q:"Tout ton texte est sélectionné et tu tapes une lettre. Que se passe-t-il ?", o:["La lettre remplace tout le texte","La lettre s'ajoute à la fin","Rien ne se passe"], a:0, why:"Une sélection est remplacée par ce que tu tapes. Annule tout de suite pour tout récupérer." },
    { q:"Quel raccourci annule ta dernière action ?", o:["Ctrl + Z (Cmd + Z sur Mac)","Ctrl + A","Ctrl + S"], a:0, why:"Z annule. A sélectionne tout, S enregistre." },
    { q:"Tu as annulé de trop. Comment rétablir ?", o:["Ctrl + Y sur Windows, Cmd + Maj + Z sur Mac","Ctrl + C","Redémarrer l'ordinateur"], a:0, why:"Rétablir remet ce que tu venais d'annuler." }
  ],
  forme: [
    { q:"Pour enregistrer ton travail, quel raccourci utilises-tu ?", o:["Ctrl + S (Cmd + S sur Mac)","Ctrl + P","Ctrl + F"], a:0, why:"S comme Save, enregistrer en anglais." },
    { q:"Dans quel cas Ctrl + G met-il le texte en gras ?", o:["Dans Word en français","Dans tous les programmes","Jamais"], a:0, why:"Dans Word en français, le gras est Ctrl + G. Ailleurs, c'est souvent Ctrl + B (Cmd + B sur Mac)." },
    { q:"Tu cherches un mot dans une longue page web. Quel raccourci ouvre la recherche ?", o:["Ctrl + F","Ctrl + P","Ctrl + T"], a:0, why:"F comme Find, chercher en anglais." },
    { q:"Que fait Ctrl + P ?", o:["Ouvre la fenêtre d'impression","Colle le texte","Ferme l'onglet"], a:0, why:"P comme Print. On y voit un aperçu avant d'imprimer." }
  ],
  navigateur: [
    { q:"Quel raccourci ouvre un nouvel onglet ?", o:["Ctrl + T (Cmd + T sur Mac)","Ctrl + W","Ctrl + N"], a:0, why:"T comme Tab, onglet en anglais." },
    { q:"Tu viens de fermer un onglet par erreur. Comment le rouvrir ?", o:["Ctrl + Maj + T","Ctrl + Z","Ctrl + L"], a:0, why:"Ctrl + Maj + T rouvre le dernier onglet fermé (Cmd + Maj + T sur Mac)." },
    { q:"Sous Windows, comment passer d'un programme ouvert à un autre ?", o:["Alt + Tab","Ctrl + C","Maj + Entrée"], a:0, why:"Alt + Tab. Sur Mac, c'est Cmd + Tab." },
    { q:"Une page web reste figée. Que tentes-tu en premier ?", o:["L'actualiser (F5 ou Ctrl + R)","Débrancher l'ordinateur","Fermer tous les onglets"], a:0, why:"Actualiser recharge la page. Attention aux formulaires non envoyés." }
  ]
};
const BANK_EXTRA = [
  { part:1, q:"Quelle lettre sert à couper ?", o:["X","C","V"], a:0, why:"X ressemble à des ciseaux croisés. C copie, V colle." },
  { part:1, q:"Que se passe-t-il si tu appuies sur la lettre C sans maintenir Ctrl ?", o:["La lettre c s'écrit","Le texte est copié","Le document est enregistré"], a:0, why:"Il faut maintenir Ctrl (ou Cmd) avant d'appuyer sur la lettre." },
  { part:1, q:"Où se colle le texte copié ?", o:["Là où se trouve le curseur","Toujours en haut de la page","À la fin du document"], a:0, why:"Clique à l'endroit voulu avant de coller." },
  { part:2, q:"Tu as sélectionné tout un document sans le vouloir et tu as tapé un mot. Que fais-tu ?", o:["J'annule avec Ctrl + Z","Je retape tout le texte","Je ferme sans enregistrer"], a:0, why:"Annuler ramène le texte d'un seul geste." },
  { part:2, q:"Que fait Maj + flèche droite quand du texte est sélectionné ?", o:["Étend la sélection d'une lettre","Supprime une lettre","Colle la lettre suivante"], a:0, why:"Maj sert à agrandir une sélection au clavier." },
  { part:2, q:"Quel raccourci sélectionne tout le texte ?", o:["Ctrl + A","Ctrl + Z","Ctrl + X"], a:0, why:"A comme All, tout en anglais." },
  { part:3, q:"À quoi sert d'enregistrer souvent ?", o:["À ne pas perdre ton travail si l'ordinateur s'éteint","À rendre le texte plus joli","À envoyer le document à ton professeur"], a:0, why:"Un bon réflexe : enregistrer après chaque paragraphe terminé." },
  { part:3, q:"Que peut-on aussi choisir dans la fenêtre d'impression, souvent ?", o:["Enregistrer en PDF","Changer la langue du texte","Effacer le document"], a:0, why:"Beaucoup de programmes proposent d'enregistrer en PDF au lieu d'imprimer." },
  { part:3, q:"La touche pour le souligné est…", o:["U (comme Underline)","S (comme Souligner)","L (comme Ligne)"], a:0, why:"Les lettres viennent de l'anglais : Underline, Italic, Bold." },
  { part:4, q:"Quelle touche utilises-tu sur Mac à la place de Ctrl pour la plupart des raccourcis ?", o:["Cmd (⌘)","Alt","Échap"], a:0, why:"Sur Mac, Cmd remplace Ctrl dans la plupart des raccourcis." },
  { part:4, q:"Comment fermer l'onglet où tu te trouves ?", o:["Ctrl + W (Cmd + W sur Mac)","Ctrl + T","Ctrl + L"], a:0, why:"W ferme la fenêtre ou l'onglet actif." },
  { part:4, q:"Quel raccourci te met dans la barre d'adresse du navigateur ?", o:["Ctrl + L (Cmd + L sur Mac)","Ctrl + B","Ctrl + Maj + V"], a:0, why:"Tu peux alors taper une adresse ou une recherche." }
];
const BANK = () => [ ...QCM.copier.map(q => ({ ...q, part:1 })), ...QCM.selectionner.map(q => ({ ...q, part:2 })), ...QCM.forme.map(q => ({ ...q, part:3 })), ...QCM.navigateur.map(q => ({ ...q, part:4 })), ...BANK_EXTRA ];
const FQ_COUNT = 10;

const PARTS = [
  { k:'copier', n:1, title:"Copier, couper, coller", hl:'coller', img:'keypace-perso-raccourcis', desc:"Les trois gestes de base qui évitent de tout retaper : copier, couper et coller. Puis essaie-les pour de vrai dans un petit texte.", prev:['7 étapes','Windows et Mac','Essai libre'] },
  { k:'selectionner', n:2, title:"Sélectionner et annuler", hl:'annuler', img:'keypace-perso-raccourcis', desc:"Tout sélectionner, ajuster la sélection au clavier, et surtout annuler une erreur d'un seul geste.", prev:['6 étapes','Annuler, rétablir','Essai libre'] },
  { k:'forme', n:3, title:"Mettre en forme, enregistrer, chercher, imprimer", hl:'enregistrer', img:'keypace-mascot-desk', desc:"Gras, italique, souligné, puis enregistrer, rechercher un mot et imprimer. Les lettres viennent de l'anglais, ce qui aide à les retenir.", prev:['5 étapes','Lettres anglaises','Essai libre'] },
  { k:'navigateur', n:4, title:"Onglets et fenêtres", hl:'fenêtres', img:'keypace-mascot-bureau-complet', desc:"Ouvrir, fermer, rouvrir un onglet, passer d'une page ou d'un programme à l'autre, actualiser et aller à la barre d'adresse.", prev:['7 étapes','Navigateur','Quiz'] },
  { k:'train', n:5, title:"Entraîne-toi", hl:'Entraîne-toi', img:'keypace-perso-raccourcis', desc:"Dix missions au hasard : tape le raccourci pour de vrai, ou choisis-le quand le navigateur le garde pour lui. Un score à battre.", prev:['10 missions','Au hasard','Score'] }
];
const hlTitle = p => p.title.replace(p.hl, `<em>${p.hl}</em>`);
const $ = s => document.querySelector(s);
const shuffle = a => a.map(x => [Math.random(), x]).sort((x,y) => x[0]-y[0]).map(x => x[1]);
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);
const store = { get(){ try{ return JSON.parse(localStorage.getItem('kp-raccourcis-done')||'{}'); }catch(e){ return {}; } }, set(o){ try{ localStorage.setItem('kp-raccourcis-done', JSON.stringify(o)); }catch(e){} } };
let done = store.get(), io = null, tmr = null, offKeys = null;
const BEST_KEY = 'kp-raccourcis-quiz-best';
const getBest = () => { try{ return +localStorage.getItem(BEST_KEY) || 0; }catch(e){ return 0; } };
const setBest = n => { try{ localStorage.setItem(BEST_KEY, String(n)); }catch(e){} };
const allDone = () => PARTS.every(p => done[p.k]);
function reportDone(){ try{ const s = JSON.parse(localStorage.getItem('klak_session')); if (s && s.token) fetch('/api/classes', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ action:'module-done', token:s.token, moduleKey:'raccourcis' }) }).catch(() => {}); }catch(e){} }
function completePart(k){
  setTimeout(() => { if (allDone()) reportDone(); }, 0);
  done[k] = true; store.set(done);
  const f = $('#finish'), p = PARTS.find(x => x.k === k);
  if (f && '#raccourcis/'+p.n === location.hash){ f.textContent = 'Terminée ✓'; f.className = 'btn ok'; const r = $('#restart'); if (r) r.hidden = false; refreshNext(); }
}
function refreshNext(){ const nx = $('#next4'); if (!nx) return; if (allDone()){ nx.textContent = 'Quiz final →'; nx.onclick = () => { location.hash = 'raccourcis/quiz'; }; } }
function show(id){ document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === id)); window.scrollTo(0,0); }

function route(){
  if (io){ io.disconnect(); io = null; }
  if (offKeys){ offKeys(); offKeys = null; }
  clearInterval(tmr);
  const h = location.hash.replace('#','');
  if (h === 'raccourcis') return renderHub();
  if (h === 'raccourcis/quiz') return allDone() ? renderFinalQuiz() : renderHub();
  const m = h.match(/^raccourcis\/(\d)$/);
  if (m && PARTS[m[1]-1]) return renderLesson(PARTS[m[1]-1]);
  renderHub();
}
window.addEventListener('hashchange', route);
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g){ if (g.dataset.go === 'cours'){ location.href = '/?view=lessons'; return; } location.hash = g.dataset.go === 'hub' ? 'raccourcis' : g.dataset.go; return; }
  const pl = e.target.closest('[data-plat]');
  if (pl){ setPlat(pl.dataset.plat); route(); return; }
  if (e.target.id === 'restart'){ const p = PARTS.find(x => '#raccourcis/'+x.n === location.hash); if (p) renderLesson(p); return; }
  if (e.target.id === 'reset-all'){ if (confirm("Effacer ta progression dans ce module ? Tu pourras tout refaire depuis le début.")){ done = {}; store.set(done); try{ localStorage.removeItem(BEST_KEY); }catch(err){} renderHub(); } return; }
  if (e.target.id === 'finish'){ const p = PARTS.find(x => '#raccourcis/'+x.n === location.hash); if (p){ completePart(p.k); location.hash = 'raccourcis'; } }
});

/* Sélecteur Windows / Mac, affiché sur le hub et en haut de chaque leçon. */
const platToggle = () => `<div class="plat" role="group" aria-label="Ton ordinateur"><span>Ton ordinateur :</span>
  <button class="${PLAT==='win'?'on':''}" data-plat="win" aria-pressed="${PLAT==='win'}">Windows <small>Ctrl</small></button>
  <button class="${PLAT==='mac'?'on':''}" data-plat="mac" aria-pressed="${PLAT==='mac'}">Mac <small>⌘ Cmd</small></button></div>`;

/* ---------------- Hub ---------------- */
const MINI = {
  copier:`<div class="mK"><span class="kbd"><kbd>Ctrl</kbd><i>+</i><kbd>C</kbd></span><span class="kbd"><kbd>Ctrl</kbd><i>+</i><kbd>V</kbd></span></div>`,
  selectionner:`<div class="mK"><span class="kbd"><kbd>Ctrl</kbd><i>+</i><kbd>A</kbd></span><span class="kbd"><kbd>Ctrl</kbd><i>+</i><kbd>Z</kbd></span></div>`,
  forme:`<div class="mK"><span class="kbd"><kbd>Ctrl</kbd><i>+</i><kbd>S</kbd></span><span class="kbd"><kbd>Ctrl</kbd><i>+</i><kbd>F</kbd></span></div>`,
  navigateur:`<div class="mK"><span class="kbd"><kbd>Ctrl</kbd><i>+</i><kbd>T</kbd></span><span class="kbd"><kbd>Alt</kbd><i>+</i><kbd>Tab</kbd></span></div>`,
  train:`<div class="mK"><span class="mK-q">Copier ?</span><span class="kbd"><kbd>?</kbd><i>+</i><kbd>?</kbd></span></div>`
};
function partCard(p){
  const d = done[p.k];
  return `<button class="part ${d?'done':''}" onclick="location.hash='raccourcis/${p.n}'">
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
    <div class="qb-txt"><span class="qb-tag">Quiz final · 🔒 Verrouillé</span><h2>Le quiz des raccourcis</h2><p>Termine les ${PARTS.length} parties pour le débloquer. Il reprend tout le module, question après question, au hasard.</p></div>
    <div class="qb-act"><div class="qb-prog"><i style="width:${n/PARTS.length*100}%"></i></div><span style="font-size:12.5px;color:var(--muted)">${n}/${PARTS.length} parties terminées</span></div></section>`;
  return `<section class="qbanner"><img src="/images/keypace-pose-6.webp" alt="">
    <div class="qb-txt"><span class="qb-tag">Module terminé, bravo !</span><h2>Teste-toi avec le quiz <em>des raccourcis</em></h2><p>${FQ_COUNT} questions tirées au hasard dans toutes les parties, une à la fois. Tu peux rejouer autant de fois que tu veux.</p>
      <div class="qb-meta"><span>${FQ_COUNT} questions</span><span>Au hasard</span>${best ? `<span>Meilleur score : ${best}/${FQ_COUNT}</span>` : ''}</div></div>
    <div class="qb-act"><button class="btn primary" onclick="location.hash='raccourcis/quiz'" style="font-size:16px;padding:14px 26px">Jouer →</button></div></section>`;
}
function renderHub(){
  if (allDone()) reportDone();
  const n = PARTS.filter(p => done[p.k]).length, all = n === PARTS.length;
  $('#hub-prog').textContent = n + '/' + PARTS.length + ' parties';
  $('#hub-bar').style.width = (n/PARTS.length*100) + '%';
  $('#hub-meta').innerHTML = `<div class="ring" style="--p:${n/PARTS.length*100}"><i>${n}/${PARTS.length}</i></div><span>parties terminées</span>${n ? '<button class="linkbtn" id="reset-all">Réinitialiser ma progression</button>' : ''}`;
  const nextK = all ? null : (PARTS.find(p => !done[p.k]) || {}).k, mascots = ['cheer','idea','books','desk','cheer'];
  $('#parts-host').innerHTML = `${platToggle()}<div class="road">${PARTS.map((p,i) => `
    <div class="stop ${done[p.k]?'done':''} ${p.k===nextK?'next':''}">
      ${partCard(p)}
      <div class="node">${done[p.k] ? '✓' : p.n}</div>
      <div class="side">${p.k===nextK ? `<img src="/images/keypace-mascot-${mascots[i]}.webp" alt=""><span class="bubble">${n ? 'Tu en es là !' : 'Commence ici !'}</span>` : ''}</div>
    </div>`).join('')}</div>${quizBanner(n)}`;
  show('v-hub');
}

/* ---------------- Quiz final et QCM ---------------- */
const shuffleQ = list => list.map(q => { const idx = shuffle(q.o.map((_,i) => i)); return { ...q, o:idx.map(i => q.o[i]), a:idx.indexOf(q.a) }; });
function drawFinalDeck(){
  const bank = shuffle(BANK()), deck = [];
  [1,2,3,4].forEach(pt => bank.filter(q => q.part === pt).slice(0,2).forEach(q => deck.push(q)));
  bank.filter(q => !deck.includes(q)).slice(0, FQ_COUNT - deck.length).forEach(q => deck.push(q));
  return shuffleQ(shuffle(deck));
}
function renderFinalQuiz(){
  $('#crumb-part').textContent = 'Quiz final'; $('#lesson-pos').textContent = 'Quiz final';
  $('#lesson-hero').innerHTML = `<div class="hero small"><div class="wrap"><div class="txt"><span class="tag">Quiz final</span><h1>Le quiz <em>des raccourcis</em></h1><p>${FQ_COUNT} questions tirées au hasard dans toutes les parties. Une à la fois, dans un ordre différent à chaque partie.</p></div><img src="/images/keypace-mascot-cheer.webp" alt=""></div></div>`;
  $('#lesson-root').innerHTML = `<div id="fq"></div><div class="lesson-foot"><button class="btn" onclick="location.hash='raccourcis'">← Retour au module</button><span></span></div>`;
  show('v-lesson'); initFinalQuiz($('#fq'));
}
function initFinalQuiz(el){
  let deck = drawFinalDeck(), i = 0, picked = null, res = [];
  const draw = () => {
    if (i >= deck.length){
      const sc = res.filter(Boolean).length, N = deck.length, best = getBest(), isBest = sc > best;
      if (isBest) setBest(sc);
      const msg = sc === N ? 'Sans faute ! Tes doigts connaissent les raccourcis.' : sc >= N*0.8 ? 'Excellent, presque parfait.' : sc >= N*0.5 ? 'Bien joué, encore quelques points à revoir.' : 'Pas facile ! Reprends les parties puis retente.';
      const missed = deck.map((q,k) => ({ q, ok:res[k] })).filter(x => !x.ok);
      el.innerHTML = `<section class="qz" style="margin-top:34px"><div class="qz-top"><h2>Résultat du quiz</h2></div>
        <div class="res"><div class="score">${sc}/${N}</div><div><p style="font-size:17px;font-weight:600">${msg}</p><p style="color:var(--muted);font-size:14px">${isBest && sc > 0 ? 'Nouveau meilleur score !' : `Meilleur score : ${Math.max(best, sc)}/${N}`}</p></div></div>
        ${missed.length ? `<div class="miss-list"><b style="font-family:'Bricolage Grotesque',sans-serif;font-size:17px">À revoir</b>${missed.map(x => `<div><span class="fq-part">Partie ${x.q.part}</span> ${x.q.q}<small>Bonne réponse : ${x.q.o[x.q.a]}. ${x.q.why}</small></div>`).join('')}</div>` : ''}
        <div class="btnrow" style="margin-top:22px"><button class="btn primary" id="fq-again">Rejouer avec de nouvelles questions</button><button class="btn" onclick="location.hash='raccourcis'">Retour au module</button></div></section>`;
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
        <div class="btnrow" style="margin-top:20px"><button class="btn" id="qz-again">Refaire le quiz</button>${PARTS[p.n] ? `<button class="btn primary" onclick="location.hash='raccourcis/${p.n+1}'">${PARTS[p.n].title} →</button>`:''}</div></section>`;
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
  $('#lesson-root').innerHTML = platToggle() + '<div id="lesson-body"></div><div id="lesson-quiz"></div>' + footer(p);
  show('v-lesson');
  ({ copier:initCopier, selectionner:initSelectionner, forme:initFormeP, navigateur:initNavigateur, train:initTrain })[p.k]($('#lesson-body'));
  if (QCM[p.k]) initQCM($('#lesson-quiz'), p);
}
function footer(p){
  const prev = PARTS[p.n-2], next = PARTS[p.n];
  const nextBtn = next ? `<button class="btn dark" onclick="location.hash='raccourcis/${next.n}'">${next.title} →</button>`
    : (allDone() ? `<button class="btn dark" id="next4" onclick="location.hash='raccourcis/quiz'">Quiz final →</button>` : `<button class="btn dark" id="next4" onclick="location.hash='raccourcis'">Retour au module</button>`);
  return `<div class="lesson-foot">
    ${prev ? `<button class="btn" onclick="location.hash='raccourcis/${prev.n}'">← ${prev.title}</button>` : `<button class="btn" onclick="location.hash='raccourcis'">← Retour au module</button>`}
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
const zr = (z, inner) => `<div class="zone" data-z="${z}">${inner}</div>`;
const scRow = (z, id, note) => zr(z, `<div class="scr">${kbd(combo(id))}<span><b>${SC[id].n}</b>${note ? `<em>${note}</em>` : ''}</span></div>`);

/* ---------------- Exercices guidés : une consigne à la fois, on passe à la suivante en faisant le geste ---------------- */
const selOf = ta => ta.value.slice(ta.selectionStart, ta.selectionEnd);
const EX1 = { title:"Exercice : copier, coller, couper", text:"Bonjour tout le monde", steps:[
  { id:'copy', say:"Sélectionne le mot « Bonjour » (double-clic dessus), puis copie-le.", pre:ta => selOf(ta).length > 0, preMsg:"Il n'y a rien de sélectionné : fais d'abord un double-clic sur « Bonjour »." },
  { id:'paste', say:"Clique à la toute fin du texte, puis colle.", post:(ta, before) => ta.value.length > before.length, postMsg:"Le texte n'a pas changé. Clique d'abord dans la zone, à la fin du texte, puis colle." },
  { id:'cut', say:"Sélectionne un mot de ton choix, puis coupe-le.", pre:ta => selOf(ta).length > 0, preMsg:"Sélectionne d'abord un mot avec un double-clic.", post:(ta, before) => ta.value.length < before.length, postMsg:"Le mot est resté en place : vérifie que tu as bien sélectionné puis coupé." },
  { id:'paste', say:"Clique au tout début du texte, puis colle : tu viens de déplacer le mot.", post:(ta, before) => ta.value.length > before.length, postMsg:"Rien n'a été collé : clique dans la zone, puis colle." }
], end:"Tu sais copier, couper et coller. Le mot a changé de place sans que tu le retapes." };
const EX2 = { title:"Exercice : sélectionner et annuler", text:"Les raccourcis clavier me font gagner du temps.", steps:[
  { id:'all', say:"Clique dans le texte, puis sélectionne tout.", post:ta => ta.selectionStart === 0 && ta.selectionEnd === ta.value.length, postMsg:"Clique d'abord dans la zone de texte, puis refais le raccourci." },
  { type:'type', say:"Tape une lettre au clavier : tout le texte est remplacé." },
  { id:'undo', say:"Oups, tout a disparu ! Annule.", post:(ta, b, st) => ta.value === st.orig, postMsg:"Le texte n'est pas revenu. Essaie encore, une seule fois suffit ici." },
  { id:'redo', say:"Rétablis la lettre que tu venais d'annuler.", post:(ta, b, st) => ta.value === st.typed, postMsg:"Il faut annuler d'abord : refais l'étape précédente si besoin." },
  { id:'undo', say:"Annule encore une fois : le texte d'origine revient.", post:(ta, b, st) => ta.value === st.orig }
], end:"Une fausse manipulation ne fait plus peur : un geste, et tout revient." };
const EX3 = { title:"Exercice : mettre en forme et enregistrer", text:"Ce texte est un exemple pour t'entraîner.", fake:true, fmt:true, steps:[
  { id:'bold', say:"Sélectionne un mot (double-clic) et mets-le en gras.", pre:ta => selOf(ta).length > 0, preMsg:"Sélectionne d'abord un mot avec un double-clic." },
  { id:'ital', say:"Garde le mot sélectionné et mets-le en italique.", pre:ta => selOf(ta).length > 0, preMsg:"Le mot doit rester sélectionné." },
  { id:'under', say:"Souligne-le aussi.", pre:ta => selOf(ta).length > 0, preMsg:"Le mot doit rester sélectionné." },
  { id:'save', say:"Enregistre ton travail." },
  { id:'find', say:"Cherche un mot dans le document." },
  { id:'print', say:"Ouvre la fenêtre d'impression." }
], end:"Gras, italique, souligné, enregistrer, chercher, imprimer : tu as fait le tour des raccourcis de travail." };
const EX4 = { title:"Exercice : onglets et fenêtres", choice:true, steps:[
  { id:'ntab', scene:"Tu lis un article et tu veux ouvrir une autre page, sans quitter celle-ci.", say:"Quel raccourci ouvre un nouvel onglet ?" },
  { id:'ctab', scene:"Tu as fini de lire l'autre page.", say:"Lequel ferme cet onglet ?" },
  { id:'rtab', scene:"Oups : tu viens de fermer l'onglet de l'article par erreur.", say:"Lequel le rouvre ?" },
  { id:'stab', scene:"Tu as cinq onglets ouverts et tu veux aller à celui de droite.", say:"Quel raccourci passe à l'onglet suivant ?" },
  { id:'swin', scene:"Ton traitement de texte est ouvert derrière le navigateur.", say:"Quel raccourci te fait passer de l'un à l'autre ?" },
  { id:'addr', scene:"Tu veux aller sur un autre site.", say:"Lequel place le curseur dans la barre d'adresse ?" }
], end:"Tu navigues sans quitter le clavier. Essaie maintenant ces gestes dans ton vrai navigateur." };

function initFlow(el, cfg){
  let i = 0, locked = false; const st = { orig:cfg.text || '', typed:'', word:'', fmt:{} };
  const N = cfg.steps.length;
  el.innerHTML = `<div class="aw flow"><h2 class="aw-h2">${cfg.title}</h2>
    <div class="flow-prog" id="fl-prog"></div>
    <div class="flow-say" id="fl-say" aria-live="polite"></div>
    ${cfg.choice ? '<div class="flow-scene" id="fl-scene"></div><div class="opts" id="fl-opts"></div>' : `<textarea class="sbx" id="sbx" rows="3" spellcheck="false" autocomplete="off">${esc(cfg.text)}</textarea>${cfg.fmt ? '<p class="fx" id="fx"></p>' : ''}`}
    <p class="sbx-msg" id="sbx-msg" aria-live="polite"></p>
    <div class="btnrow" id="fl-end"></div></div>`;
  const ta = $('#sbx'), msg = $('#sbx-msg');
  const setMsg = t => { msg.textContent = t || ''; };
  const paintFx = () => { const fx = $('#fx'); if (!fx) return; if (!st.word){ fx.textContent = ''; return; }
    fx.innerHTML = `Dans un traitement de texte, « <span style="${st.fmt.bold?'font-weight:800;':''}${st.fmt.ital?'font-style:italic;':''}${st.fmt.under?'text-decoration:underline;':''}">${esc(st.word)}</span> » ressemblerait à ça.`; };
  const paint = () => {
    $('#fl-prog').innerHTML = cfg.steps.map((_, j) => `<i class="${j < i ? 'ok' : j === i ? 'cur' : ''}"></i>`).join('') + `<span>${i >= N ? 'Terminé' : 'Étape ' + (i+1) + ' sur ' + N}</span>`;
    if (i >= N){
      $('#fl-say').innerHTML = `<div class="fb ok"><b>Exercice réussi !</b> ${cfg.end}</div>`;
      if (ta) ta.disabled = true;
      const o = $('#fl-opts'); if (o) o.innerHTML = '';
      const sc = $('#fl-scene'); if (sc) sc.textContent = '';
      $('#fl-end').innerHTML = '<button class="btn" id="fl-again">Recommencer l\'exercice</button>';
      $('#fl-again').onclick = () => { i = 0; locked = false; st.fmt = {}; st.word = ''; if (ta){ ta.disabled = false; ta.value = cfg.text; ta.focus(); } setMsg(''); paintFx(); paint(); };
      return;
    }
    const s = cfg.steps[i];
    $('#fl-say').innerHTML = `<b>${s.say}</b> ${s.id && !cfg.choice ? kbd(combo(s.id)) : ''}`;
    if (s.type === 'type') $('#fl-say').innerHTML = `<b>${s.say}</b>`;
    $('#fl-end').innerHTML = '';
    if (cfg.choice){
      $('#fl-scene').textContent = s.scene;
      $('#fl-opts').innerHTML = trainChoices(s.id).map(c => `<button class="opt" data-c="${c}">${kbd(combo(c))}<span class="trn-n">${SC[c].n}</span></button>`).join('');
      el.querySelectorAll('#fl-opts [data-c]').forEach(b => b.onclick = () => {
        if (combo(b.dataset.c).join('+') === combo(s.id).join('+')){ setMsg('Bien joué.'); next(); } else setMsg('Pas celui-là : relis la situation et réessaie.'); });
    }
  };
  const next = () => { i++; locked = false; paint(); if (ta && i < N) ta.focus(); };
  if (ta){
    ta.addEventListener('keydown', e => {
      if (i >= N || locked) return;
      const s = cfg.steps[i];
      if (s.type === 'type') return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'Control' || e.key === 'Meta' || e.key === 'Shift' || e.key === 'Alt') return;
      if (!pressed(e, s.id)){
        if (/^[a-z]$/i.test(e.key || '')) setMsg((PLAT === 'win' ? e.metaKey : e.ctrlKey) ? (PLAT === 'win' ? 'Tu es sur Windows : utilise la touche Ctrl.' : 'Tu es sur Mac : utilise la touche Cmd (⌘).') : 'Ce n\'est pas le raccourci demandé : relis la consigne.');
        if (cfg.fake) e.preventDefault();
        return;
      }
      if (cfg.fake) e.preventDefault();
      if (s.pre && !s.pre(ta)){ setMsg(s.preMsg); e.preventDefault(); return; }
      const before = ta.value; locked = true;
      if (cfg.fmt && ['bold','ital','under'].includes(s.id)){ if (!st.word) st.word = selOf(ta); st.fmt[s.id === 'ital' ? 'ital' : s.id === 'under' ? 'under' : 'bold'] = true; paintFx(); }
      setTimeout(() => {
        if (!s.post || s.post(ta, before, st)){ setMsg('Bien joué : ' + SC[s.id].n + '.'); next(); }
        else { locked = false; setMsg(s.postMsg || 'Pas tout à fait : réessaie.'); }
      }, 60);
    });
    ta.addEventListener('input', () => {
      if (i >= N) return;
      const s = cfg.steps[i];
      if (s.type === 'type' && ta.value !== st.orig){ st.typed = ta.value; setMsg('Le texte a été remplacé par ce que tu as tapé.'); next(); }
    });
  }
  paint();
}
function initCopier(el){
  const card = `<div class="keycard">
    ${zr('why','<div class="scr-cmp"><div><b>À la souris</b><span>menu, clic droit, choix, clic</span></div><div><b>Au clavier</b><span>une combinaison, et c\'est fait</span></div></div>')}
    ${zr('mod',`<div class="scr-mod"><div><b>Windows</b><kbd>Ctrl</kbd></div><div><b>Mac</b><kbd>⌘ Cmd</kbd></div></div>`)}
    ${scRow('copy','copy','l\'original reste en place')}
    ${scRow('paste','paste','au curseur, autant de fois que voulu')}
    ${scRow('cut','cut','le texte part, il reste en mémoire')}
    ${zr('one','<div class="scr-note">Copier une 2<sup>e</sup> fois remplace la 1<sup>re</sup> copie.</div>')}
    ${zr('mem','<div class="scr-note">Rangée du bas : <b>X</b> couper, <b>C</b> copier, <b>V</b> coller.</div>')}
  </div>`;
  el.innerHTML = anatHTML(STEPS1, card, "Les trois gestes de base") + '<div id="sbx-host"></div>';
  bindAnat(el, STEPS1);
  initFlow($('#sbx-host'), EX1);
}
function initSelectionner(el){
  const card = `<div class="keycard">
    ${zr('dbl','<div class="scr-note"><b>Double-clic</b> : un mot<br><b>Triple-clic</b> : le paragraphe</div>')}
    ${scRow('all','all','tout le texte')}
    ${scRow('shift','word','Maj + flèches pour ajuster')}
    ${zr('warn','<div class="scr-note scr-warn">Texte sélectionné + une lettre = le texte est remplacé.</div>')}
    ${scRow('undo','undo','plusieurs fois pour remonter')}
    ${scRow('redo','redo','remet ce qu\'on a annulé')}
  </div>`;
  el.innerHTML = anatHTML(STEPS2, card, "Sélectionner, annuler") + '<div id="sbx-host"></div>';
  bindAnat(el, STEPS2);
  initFlow($('#sbx-host'), EX2);
}
function initFormeP(el){
  const card = `<div class="keycard">
    ${zr('eng','<div class="scr-note"><b>S</b>ave · <b>F</b>ind · <b>P</b>rint<br><b>B</b>old · <b>I</b>talic · <b>U</b>nderline</div>')}
    ${scRow('bold','bold','Word en français : G. Ailleurs : B')}
    ${scRow('bold','ital','')}
    ${scRow('bold','under','')}
    ${scRow('save','save','enregistre ton travail')}
    ${scRow('find','find','Entrée : résultat suivant')}
    ${scRow('print','print','aperçu, PDF, copies')}
  </div>`;
  el.innerHTML = anatHTML(STEPS3, card, "Mettre en forme, enregistrer, chercher") + '<div id="sbx-host"></div>';
  bindAnat(el, STEPS3);
  initFlow($('#sbx-host'), EX3);
}
function initNavigateur(el){
  const card = `<div class="keycard">
    ${scRow('ntab','ntab','')}
    ${scRow('ctab','ctab','')}
    ${scRow('rtab','rtab','la maladresse effacée')}
    ${scRow('stab','stab','')}
    ${scRow('swin','swin','maintiens la 1re touche')}
    ${scRow('refr','refr','Windows : F5 aussi')}
    ${scRow('addr','addr','puis tape l\'adresse')}
  </div>`;
  el.innerHTML = anatHTML(STEPS4, card, "Onglets, fenêtres, barre d'adresse") + `<div class="aw"><p class="aw-intro">Ces raccourcis appartiennent au navigateur : la page ne peut pas les voir quand tu les tapes. Tu t'entraînes donc ici en choisissant le bon raccourci pour chaque situation.</p></div><div id="sbx-host"></div>`;
  bindAnat(el, STEPS4);
  initFlow($('#sbx-host'), EX4);
}

/* ---------------- Partie 5 : entraînement ---------------- */
const TRAIN_ASK = {
  copy:"Tu as sélectionné un mot et tu veux en garder une copie.", cut:"Tu veux déplacer une phrase ailleurs : commence par la couper.", paste:"Tu as copié une adresse : dépose-la dans le texte.",
  all:"Tu veux sélectionner tout le texte d'un coup.", undo:"Tu viens de supprimer un paragraphe sans le vouloir.", redo:"Tu as annulé de trop et tu veux revenir en avant.",
  ital:"Tu veux mettre un titre d'œuvre en italique.", under:"Tu veux souligner un mot.", save:"Tu as fini un paragraphe : enregistre ton travail.", find:"Tu cherches un mot dans une longue page.", print:"Tu veux imprimer ce document.",
  ntab:"Tu veux ouvrir une nouvelle page sans quitter celle-ci.", ctab:"Tu as fini avec la page : ferme l'onglet.", rtab:"Tu viens de fermer un onglet par erreur.", swin:"Tu veux passer d'un programme ouvert à l'autre.", refr:"La page est figée : recharge-la.", addr:"Tu veux taper une nouvelle adresse de site.", stab:"Tu veux passer à l'onglet suivant."
};
function trainDeck(){ return shuffle(Object.keys(TRAIN_ASK)).slice(0, 10); }
function trainChoices(id){
  const same = a => a.join('+');
  const pool = shuffle(Object.keys(SC).filter(x => x !== id && SC[x].live === SC[id].live && same(combo(x)) !== same(combo(id)))).slice(0, 2);
  return shuffle([id, ...pool]);
}
function initTrain(el){
  let deck = trainDeck(), i = 0, res = [], state = 'ask', misses = 0, last = '';
  const draw = () => {
    if (offKeys){ offKeys(); offKeys = null; }
    if (i >= deck.length){
      const sc = res.filter(Boolean).length, N = deck.length;
      el.innerHTML = `<section class="qz"><div class="qz-top"><h2>Entraînement terminé</h2></div>
        <div class="res"><div class="score">${sc}/${N}</div><div><p style="font-size:17px;font-weight:600">${sc === N ? 'Sans faute, bravo !' : sc >= N*0.7 ? 'Bien joué.' : 'Relis les parties et rejoue.'}</p><p style="color:var(--muted);font-size:14px">Un point par mission réussie sans aide.</p></div></div>
        <div class="btnrow" style="margin-top:20px"><button class="btn primary" id="tr-again">Rejouer</button></div></section>`;
      $('#tr-again').onclick = () => { deck = trainDeck(); i = 0; res = []; state = 'ask'; misses = 0; draw(); };
      completePart('train'); return;
    }
    const id = deck[i], live = SC[id].live;
    el.innerHTML = `<section class="qz"><div class="qz-top"><span class="fq-part">Mission ${i+1} sur ${deck.length}</span><div class="dots">${deck.map((_,j) => `<i class="${j<i?(res[j]?'ok':'ko'):j===i?'cur':''}"></i>`).join('')}</div></div>
      <div class="q">${TRAIN_ASK[id]}</div>
      ${live && state === 'ask' ? `<p class="trn-hint">Appuie sur le raccourci pour de vrai${PLAT==='mac'?' (Cmd, pas Ctrl)':' (avec Ctrl)'}.</p><div class="trn-pad" id="trn-pad" tabindex="0">Clique ici puis tape le raccourci</div>`
      : !live && state === 'ask' ? `<div class="opts">${trainChoices(id).map(c => `<button class="opt" data-c="${c}">${kbd(combo(c))}</button>`).join('')}</div>` : ''}
      ${state === 'ask' && last ? `<div class="fb ko"><b>Pas tout à fait.</b> ${last}</div>` : ''}
      ${state === 'ok' ? `<div class="fb ok"><b>Exact.</b> ${SC[id].n} : ${kbd(combo(id))}</div><div class="btnrow" style="margin-top:16px"><button class="btn primary" id="tr-next">${i<deck.length-1?'Mission suivante →':'Voir mon résultat'}</button></div>` : ''}
      ${state === 'show' ? `<div class="fb ko"><b>La réponse :</b> ${SC[id].n} : ${kbd(combo(id))}</div><div class="btnrow" style="margin-top:16px"><button class="btn primary" id="tr-next">${i<deck.length-1?'Mission suivante →':'Voir mon résultat'}</button></div>` : ''}</section>`;
    const fin = ok => { if (ok) res[i] = misses === 0; else res[i] = false; state = ok ? 'ok' : 'show'; last = ''; draw(); };
    const wrong = () => { misses++; if (misses >= 2){ fin(false); } else { last = 'Réessaie, tu as encore une chance.'; draw(); } };
    if (state === 'ask' && live){
      const pad = $('#trn-pad'); if (pad) pad.focus();
      const fn = e => {
        if (!(e.ctrlKey || e.metaKey)) return;
        if (e.key === 'Control' || e.key === 'Meta' || e.key === 'Shift' || e.key === 'Alt') return;
        e.preventDefault();
        if (pressed(e, id)) fin(true); else wrong();
      };
      document.addEventListener('keydown', fn); offKeys = () => document.removeEventListener('keydown', fn);
    }
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { if (b.dataset.c === id || combo(b.dataset.c).join('+') === combo(id).join('+')) fin(true); else wrong(); });
    const nx = $('#tr-next'); if (nx) nx.onclick = () => { i++; state = 'ask'; misses = 0; last = ''; draw(); };
  };
  draw();
}

route();
