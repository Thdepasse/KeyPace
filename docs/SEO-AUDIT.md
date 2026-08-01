# Audit SEO — KeyPace (Phase 0)

> État des lieux en lecture seule. Aucun code modifié. Chaque constat est étayé par un fichier (+ ligne).
> Date : session en cours. Périmètre : https://keypace.be

## 1. Stack réel

| Élément | Constat | Preuve |
|---|---|---|
| Framework | Aucun. **SPA en JavaScript vanilla**, un seul fichier `index.html` (~8 200 lignes, 590 Ko décodé / 151 Ko transféré) | `index.html` |
| Build | Aucun (pas de bundler, pas d'étape de génération) | absence de `vite/webpack/next`, `package.json` sans script `build` |
| Hébergement | Vercel (statique + fonctions serverless `api/*.js`), base Supabase | `vercel.json`, `api/*.js` |
| Rendu | **CSR (client-side rendering)** : les vues sont injectées en JS via `innerHTML` | `index.html:3531` (`renderHome`), `renderTyping/renderLessons/renderGames` |
| Routing | **Rewrite « tout vers `index.html` »** : chaque URL non-`api`/non-légale sert le même HTML | `vercel.json` (`{ "source": "/((?!api/).*)", "destination": "/index.html" }`) |

## 2. Réponses aux questions (preuves)

**Le HTML servi au crawler contient-il le contenu, ou est-il injecté en JS ?**
→ **Injecté en JS.** Les vues (Test, Cours, Jeux, Progrès) sont rendues par `renderView`/`render*` dans des `<div id="page-…">` vides (`index.html:3531+`). Seule exception : la home a un **contenu statique de repli dans `<noscript>`** (`index.html:1142-1155`, avec un `<h1>` et un descriptif) — mais c'est un fallback « JS désactivé », pas le rendu réel vu par un crawler qui exécute le JS. Les autres vues n'ont **aucun** contenu statique.

**Combien d'URL distinctes existent ? Chaque vue a-t-elle sa propre route ?**
→ **Non.** La navigation (`go(view)` → `renderView`) **ne change jamais l'URL** : tous les `history.replaceState` remettent `location.pathname` (ils suppriment les query params, ne créent pas de route) — `index.html:8016` (`go`), `:1647`, `:8021`, `:8108`. **Toutes les fonctionnalités vivent sur `/`.** URLs réellement distinctes : uniquement `/` + 5 pages légales (`/conditions`, `/cgv`, `/confidentialite`, `/cookies`, `/mentions-legales`) via `vercel.json`. → **≈ 6 URLs indexables**, zéro pour le cœur produit.

**Sitemap / robots / canonical / hreflang ?**
→ `sitemap.xml` **présent** mais ne liste que 6 URLs (`sitemap.xml`). `robots.txt` **présent**, cohérent (Allow /, bots IA autorisés, `Disallow: /api/`, lien sitemap). `canonical` **présent mais figé sur `/`** pour toute la SPA (`index.html:13`) → toute « vue » se canonicalise vers `/`. `hreflang` **incomplet** : seulement `fr` + `x-default`, tous vers `/` (`index.html:14,16`) → **`fr-BE` et `fr-FR` manquants**. Les pages légales **n'ont ni canonical ni hreflang** (`conditions.html:6-8`).

**Titles et meta descriptions uniques par page ou globaux ?**
→ **Globaux pour le crawler.** `index.html` a un seul `<title>` + une seule meta description statiques (`index.html:6-7`). `renderView` met bien à jour `document.title` et la meta par vue en JS (objet `_meta`), mais comme l'URL ne change pas et que le rendu est CSR, le crawler voit un **titre unique sur `/`**. Les pages légales ont chacune leur `<title>`/description (`conditions.html:7-8`). ✅ pour les légales, ❌ pour le produit.

**Core Web Vitals / poids des bundles ?**
→ Mesure réelle (desktop) sur keypace.be : HTML **590 Ko décodé / 151 Ko transféré** (bonne compression), `domInteractive` ≈ **980 ms**. Le contenu principal étant **rendu après exécution JS** (renderHome), le **LCP dépend du JS** → risque sur mobile 4G. Polices Google Fonts externes en `preload`+`display=swap` (`index.html:227-230`) : correct pour le FOIT, mais dépendance tierce. **Une mesure terrain/lab reste nécessaire** (PageSpeed Insights + rapport CWV de la Search Console) — je ne peux pas produire ici un LCP/CLS/INP mobile 4G fiable. Risque structurel : **monolithe de 590 Ko tout-en-un** (parse/exec lourd → INP/LCP), CSR (LCP retardé), fonts tierces.

**Contenu réservé aux abonnés séparé du public ?**
→ Le contenu Expert (55 leçons) est **gated côté client** via `getUserPlan()` (`index.html`). Le curriculum complet est dans le JS ; le public (10 leçons, test, jeux) est **aussi en CSR**. Pas de cloaking (le gating est honnête), mais **aucun contenu public n'existe en HTML indexable** sous une URL propre.

## 3. Constats classés par gravité

### 🔴 Bloquant (empêche tout positionnement)
1. **Une seule URL pour tout le produit** — `go()` ne route pas (`index.html:8016`). Google ne peut indexer qu'une page. *Sans URLs propres, aucune page produit ne peut se positionner.*
2. **Contenu en CSR sans HTML statique** — les vues sont injectées en JS (`index.html:3531+`). Le contenu n'est pas garanti servi au crawler.
3. **Canonical figé sur `/`** (`index.html:13`) — toute future route SPA se canonicaliserait vers `/`, s'auto-excluant de l'index.
4. **Aucune des 12 pages cibles n'existe** (test-vitesse, cours-dactylographie, clavier-azerty-belge, écoles, guides, comparatif).

### 🟠 Important
5. **`hreflang` incomplet** : `fr-BE`/`fr-FR` absents (`index.html:14,16`) alors que le site vise les deux marchés.
6. **Fichiers HTML orphelins servis en statique** : `indexKeyPace.html` (444 Ko, **vieille copie complète de l'app**), `ecran.html`, `jeu.html` — accessibles sur Vercel (ex. `/indexKeyPace.html`) et **non couverts par `noindex`** → risque de **contenu dupliqué**. Non listés dans le sitemap, mais indexables si découverts.
7. **Pas de `noindex` explicite** sur les écrans compte/paiement/tableau de bord/espace enseignant (ils vivent sur `/`, mais toute future route SPA devra les exclure).
8. **Analytics chargé sans consentement** : Umami est injecté inconditionnellement (`index.html:9`) et **il n'existe aucune bannière de consentement fonctionnelle** (`cookies.html` n'est qu'une page de politique). Point RGPD + prérequis de la Phase 5.
9. **JSON-LD partiel** : `WebApplication` (avec offres freemium 0 €/4,99 €) + `FAQPage` présents (`index.html:53,81`). Manquent `Organization`, `WebSite`+`SearchAction`, `SoftwareApplication`/`Course`, `BreadcrumbList`.
10. **Pages légales sans canonical/hreflang** (`conditions.html:6-8`).

### 🟢 Cosmétique / à préparer
11. `og-image.png` en PNG (pas de WebP/AVIF) — mineur tant qu'il n'y a pas d'images de contenu.
12. Pas de fil d'Ariane, pas de maillage interne (aucune page profonde à relier pour l'instant).
13. Sitemap au format daté à la main (`lastmod` fixe) — à générer au build.

## 4. Recommandation d'architecture (option la moins invasive)

Le blocage vient du couple **SPA unique + canonical figé**. Deux voies :

- **A. Migration SSR/framework** (Next/Astro) : refonte lourde, risque élevé sur une app de 8 200 lignes qui marche. **Non recommandé** à ce stade.
- **B. Pages d'atterrissage statiques + SPA conservée** *(recommandé)* : créer **une page `.html` réelle par URL cible** (comme les pages légales existantes), avec son `<title>`/meta/canonical/hreflang/JSON-LD **et son vrai contenu (300+ mots)**, servie en HTML complet au crawler. L'app interactive reste sur `/` (ou est ouverte depuis les CTA de ces pages). Chaque landing renvoie vers l'app. **Zéro migration, zéro risque sur l'existant, chaque URL est indexable et unique.** C'est exactement le motif déjà en place pour `/conditions` & co.

**Arbitrages à valider avant tout code :**
- (a) Confirmer la voie **B** (pages statiques) plutôt qu'une migration SSR.
- (b) **URLs** : les 12 cibles sont **nouvelles** (rien n'existe à ces chemins) → **aucune redirection 301 nécessaire**. Décision : la vue « Test » de l'app doit-elle *déménager* sur `/test-vitesse-frappe` (301 depuis `/` ? non — `/` reste la home) ou la landing SEO pointe-t-elle vers l'app ? Je propose : landing SEO dédiée + CTA vers l'app.
- (c) **Limite Vercel Hobby = 12 fonctions serverless, on est à 12/12.** L'image OG dynamique du partage `/resultat/{id}` (Phase 4) exige **une nouvelle fonction** → il faudra soit consolider un endpoint, soit passer en Pro. À trancher.
- (d) La **bannière de consentement** (Phase 5) n'existe pas → à construire ; décision sur GA4 vs Plausible (Plausible = cookieless, plus simple RGPD).

## 5. Plan d'action chiffré (effort indicatif, jours-dev)

| Phase | Contenu | Effort | Dépend de |
|---|---|---|---|
| **1 — Socle technique** | hreflang fr-BE/fr-FR, canonical par page, `noindex` compte/paiement/dashboard, robots+sitemap cohérents, suppression/`noindex` des HTML orphelins, alt/lazy/dimensions images, revue polices | **1–1,5 j** | validation voie B |
| **2 — 12 pages de contenu** | 12 landing `.html` (design system, palette #FF4D2E), 300+ mots each, home FAQ → pages `/guide/*`, maillage, rewrites+sitemap | **3–5 j** (surtout rédaction FR) | Phase 1 |
| **3 — JSON-LD** | Organization+WebSite+SearchAction, SoftwareApplication/Course/CourseInstance, FAQPage par page, BreadcrumbList ; valider au Rich Results Test | **0,5–1 j** | Phase 2 |
| **4 — Maillage & partage** | fil d'Ariane, ancres descriptives, `/resultat/{id}` + **image OG dynamique** (⚠️ contrainte 12 fonctions), vérif liens morts | **2–3 j** | Phases 2–3 + arbitrage (c) |
| **5 — Mesure & CI** | Search Console, GA4/Plausible **consent-gated** + bannière cookies fonctionnelle, script `npm run seo:check` (titles/meta uniques, canonical, sitemap, liens morts) | **1–2 j** | Phase 2 |

**Total : ≈ 8–13 jours-dev**, l'essentiel étant la rédaction des 12 pages (Phase 2) et le partage de résultat + image OG (Phase 4).

## Journal des phases

### Phase 1 — Socle technique ✅ (voie B validée)
- **Doublon supprimé** : `indexKeyPace.html` (444 Ko, vieille copie, non référencée) retiré du dépôt → plus de risque de contenu dupliqué. (`ecran.html`/`jeu.html` étaient déjà en `noindex`, conservés.)
- **hreflang complété** sur la home : `fr-BE`, `fr-FR`, `fr`, `x-default` (`index.html:14-17`).
- **canonical + hreflang ajoutés** sur les 5 pages légales (`conditions/cgv/confidentialite/cookies/mentions-legales.html`), qui n'en avaient pas.
- Tests : 27/27 verts, syntaxe inline OK, aucune régression.
- **Note** : le `noindex` compte/paiement/dashboard n'a pas d'objet tant que ces écrans vivent sur `/` (SPA) sans URL propre ; il sera garanti par construction en Phase 2 (les landings sont publiques, l'app reste sur `/`). Le `noindex` des vrais fichiers HTML est traité (orphelins).

### Phase 2 — 12 pages de contenu ✅
- **12 landing pages statiques** créées (design system + palette `#FF4D2E`, servies en HTML complet au crawler) :
  - Niveau 1 : `clavier-azerty-belge`, `test-vitesse-frappe`, `cours-dactylographie`, `jeux-dactylo`, `ecoles`, `comparatif`.
  - Guides : `guide/taper-a-10-doigts`, `guide/taper-sans-regarder-le-clavier`, `guide/vitesse-de-frappe-moyenne`, `guide/azerty-ou-qwerty`, `guide/position-des-doigts-azerty`.
- Chaque page : `<title>` unique (≤ 60 car.), meta description unique (130–154 car.), canonical propre, hreflang fr-BE/fr-FR/fr/x-default, OG + Twitter, **1 seul H1**, 300–470 mots de contenu original, FAQ `<details>`, fil d'Ariane, CTA vers l'app.
- **JSON-LD par page** : `BreadcrumbList` + `FAQPage` (validés, `JSON.parse` OK sur les 22 blocs).
- **Maillage interne** : chaque page relie 2–4 pages sœurs par des ancres descriptives.
- **Routage** : 11 rewrites ajoutés dans `vercel.json` (slug → slug.html), placés **avant** le catch-all SPA.
- **Sitemap** : 11 URLs ajoutées (priorité 0.7–0.9, > pages légales), `lastmod` 2026-07-29.
- Contrainte respectée : **contenu honnête** (le cœur AZERTY belge/français est identique ; le comparatif compare des critères, sans dénigrer de concurrent nommé).
- Vérif preview : 11/11 pages en 200, rendu on-brand confirmé, aucun tiret long.
- **Reste Phase 2** : migrer les 6 FAQ de la home vers les `/guide/*` (dédoublonnage) — optionnel.

### Phases 3–5 — à venir
Décisions actées : voie B (pages statiques) ; `/` reste la home, cibles = nouvelles landings (aucune 301) ; endpoint OG consolidé (limite 12 fonctions) ; analytics = Umami/Plausible **cookieless** (pas de GA4) + Search Console.
- Phase 3 : `Organization` + `WebSite`/`SearchAction` + `SoftwareApplication`/`Course` (sur la home / global).
- Phase 4 : `/resultat/{id}` partageable + image OG dynamique (⚠️ 12 fonctions).
- Phase 5 : Search Console, bannière consentement, `npm run seo:check`.

## 6. Règles respectées
- Aucune fonctionnalité cassée (Phase 0 = lecture seule).
- Design system / palette `#FF4D2E` conservés dans les futures pages.
- Toute URL modifiée → 301 (aucune modification d'URL existante prévue ; les cibles sont neuves).
- Ce document est mis à jour au fil des phases.
