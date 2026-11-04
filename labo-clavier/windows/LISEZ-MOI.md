# Capturer de vraies frappes Windows

But : savoir ce que fait **vraiment** Windows (touches mortes, AltGr) avec chaque disposition QWERTY, sans toucher à ton Mac.

## Voie A : une machine Windows de quelqu'un d'autre (la plus simple)
Envoie-lui le message de `message-pour-un-pc-windows.md`. Il n'a rien à installer.

## Voie B : lancement ponctuel dans GitHub (machines Windows de GitHub)
Non testé : le premier essai peut échouer, les journaux diront pourquoi.
1. Sur GitHub, dans le dépôt, ouvre **Actions**, puis **New workflow**, puis **set up a workflow yourself**.
2. Colle le contenu de `windows-capture.workflow.yml`, valide (commit).
3. Dans **Actions**, choisis « Capture clavier Windows (ponctuel) », clique **Run workflow**.
4. Quand c'est fini (quelques minutes par disposition), ouvre chaque exécution, télécharge les fichiers de **Artifacts** et donne-les à la personne qui s'occupe de KeyPace.
Les minutes Windows de GitHub comptent plus que les minutes Linux : je ne connais pas ton quota. Supprime le workflow ensuite si tu ne le veux plus.

## Ce que le pilote fait
`run-capture.js` déduit du modèle de disposition (`layouts-src/`) les touches à presser pour chaque caractère, les envoie au système avec `inject-windows.ps1` (comme un vrai clavier), lit ce qui apparaît dans la page de capture et écrit :
- `trace-<modèle>.json` : tous les événements reçus par le navigateur (rejouables par `npm run gates`) ;
- `rapport-<modèle>.json` : pour chaque caractère, le geste prévu, le texte obtenu, et si le modèle avait raison.
Le mode `--inject cdp` teste seulement le pilotage, sans toucher au système.
