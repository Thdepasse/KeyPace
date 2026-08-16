create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password_hash text not null,
  plan text default 'free' check (plan in ('free', 'expert')),
  stripe_customer_id text,
  session_token text,
  created_at timestamptz default now()
);

create table if not exists progress (
  user_id uuid references users(id) on delete cascade primary key,
  data jsonb default '{}',
  updated_at timestamptz default now()
);

-- Licences établissements
create table if not exists institutions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  password_hash text not null,
  seat_count integer not null check (seat_count > 0),
  created_at timestamptz default now()
);

-- Domaines email autorisés pour l'auto-rattachement des élèves (ex. {"uliege.be","etudiant.uliege.be"}).
-- L'email institutionnel sert de clé d'appartenance : un externe ne peut pas profiter de la licence.
alter table institutions add column if not exists domains text[] default '{}';

alter table users
  add column if not exists institution_id uuid references institutions(id) on delete set null,
  add column if not exists email text unique,
  add column if not exists email_verified boolean default false,
  add column if not exists verification_token text,
  add column if not exists verification_expires_at timestamptz,
  add column if not exists oauth_provider text; -- 'google' | 'apple' | null pour email+mot de passe

-- Index pour les lookups fréquents
create index if not exists users_username_idx on users(username);
create index if not exists users_session_token_idx on users(session_token);
create index if not exists users_stripe_customer_id_idx on users(stripe_customer_id);
create index if not exists users_institution_id_idx on users(institution_id);
create index if not exists institutions_slug_idx on institutions(slug);

-- ───────────────────────────────────────────────────────────────
-- Jeu « Boss de la semaine » : défi hebdomadaire commun + classement
-- Tout l'accès se fait via les fonctions serverless (clé service).
-- RLS activée sans policy => accès anonyme refusé (lecture/écriture serveur only).
-- ───────────────────────────────────────────────────────────────
create table if not exists weekly_challenges (
  id uuid default gen_random_uuid() primary key,
  iso_week text unique not null,            -- ex. '2026-W26'
  text text not null,
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists weekly_scores (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references weekly_challenges(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  username text not null,
  score numeric not null,
  wpm integer not null,
  accuracy integer not null,
  created_at timestamptz default now(),
  unique (challenge_id, user_id)            -- 1 meilleur score par joueur / semaine
);
create index if not exists weekly_scores_rank_idx on weekly_scores(challenge_id, score desc);

alter table weekly_challenges enable row level security;
alter table weekly_scores     enable row level security;

-- ───────────────────────────────────────────────────────────────
-- Jeu « Duel 1v1 » : course en temps réel entre deux joueurs.
-- La progression live passe par Supabase Realtime (broadcast/presence,
-- éphémère). Création / départ chronométré / résultat sont gérés par les
-- fonctions serverless (clé service). RLS sans policy => accès anon refusé.
-- ───────────────────────────────────────────────────────────────
create table if not exists duel_rooms (
  id uuid default gen_random_uuid() primary key,
  room_code text unique,                     -- code court 6 caractères pour rejoindre
  text text not null,
  status text default 'lobby' check (status in ('lobby','racing','done')),
  host_user_id uuid references users(id) on delete set null,
  guest_user_id uuid references users(id) on delete set null,
  guest_label text,
  start_at timestamptz,                      -- départ synchronisé (serveur)
  winner text check (winner in ('host','guest','draw')),
  created_at timestamptz default now()
);

create table if not exists duel_results (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references duel_rooms(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  role text check (role in ('host','guest')),
  wpm integer,
  accuracy integer,
  finished boolean default false,
  time_ms integer,
  created_at timestamptz default now()
);
create index if not exists duel_results_room_idx on duel_results(room_id);

alter table duel_rooms   enable row level security;
alter table duel_results enable row level security;

-- ───────────────────────────────────────────────────────────────
-- REFONTE COMPTE ÉTABLISSEMENT — Phase 0 : modèle de données
-- Remplace le hack "progress.data.role + progress.data.classes (jsonb)"
-- par un vrai rôle utilisateur et des tables relationnelles.
-- Accès via fonctions serverless (clé service) ; RLS sans policy => anon refusé.
-- ───────────────────────────────────────────────────────────────

-- Rôle applicatif : eleve (défaut), prof (gère ses classes), admin (gère un établissement + ses profs, Phase 3)
alter table users
  add column if not exists role text default 'eleve' check (role in ('eleve','prof','admin'));

-- Une classe appartient à un prof (teacher_id) et, à terme, à un établissement (institution_id).
create table if not exists classes (
  id uuid default gen_random_uuid() primary key,
  institution_id uuid references institutions(id) on delete set null,
  teacher_id uuid references users(id) on delete cascade,
  name text not null,
  invite_code text unique,                 -- code court pour rejoindre la classe
  archived boolean default false,
  created_at timestamptz default now()
);
create index if not exists classes_teacher_idx on classes(teacher_id);
create index if not exists classes_institution_idx on classes(institution_id);

-- Appartenance élève -> classe (un élève peut être dans plusieurs classes).
create table if not exists class_members (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (class_id, student_id)
);
create index if not exists class_members_class_idx on class_members(class_id);
create index if not exists class_members_student_idx on class_members(student_id);

create index if not exists users_role_idx on users(role);

alter table classes       enable row level security;
alter table class_members enable row level security;

-- ───────────────────────────────────────────────────────────────
-- Phase 2 : devoirs assignés par le prof à une classe.
-- lesson_id = id de leçon du curriculum (texte) ou null pour un test de vitesse libre.
-- Accès via fonctions serverless (clé service) ; RLS sans policy => anon refusé.
-- ───────────────────────────────────────────────────────────────
create table if not exists assignments (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references classes(id) on delete cascade,
  lesson_id text,                          -- null => test de vitesse libre ou texte perso
  title text not null,
  target_wpm integer,                      -- objectif de vitesse (mpm), optionnel
  due_date date,                           -- échéance, optionnelle
  custom_text text,                        -- texte personnalisé saisi par le prof (sinon null)
  mode text,                               -- 'written' | 'vocal' (dictée) pour un texte perso
  created_at timestamptz default now()
);
-- Réparation idempotente si une table partielle existait déjà
alter table assignments add column if not exists class_id uuid references classes(id) on delete cascade;
alter table assignments add column if not exists lesson_id text;
alter table assignments add column if not exists title text;
alter table assignments add column if not exists target_wpm integer;
alter table assignments add column if not exists due_date date;
alter table assignments add column if not exists custom_text text;
alter table assignments add column if not exists mode text;
alter table assignments add column if not exists audio_url text;
alter table assignments add column if not exists created_at timestamptz default now();
create index if not exists assignments_class_idx on assignments(class_id);
alter table assignments enable row level security;

-- ───────────────────────────────────────────────────────────────
-- Phase 3 : compte établissement (role 'admin') au-dessus du professeur.
-- L'établissement gère ses profs (invitation/archivage) et voit ses élèves
-- déclinés par prof. Un prof = users.role='prof' + institution_id ;
-- un établissement = users.role='admin' + institution_id.
-- Accès via fonctions serverless (clé service) ; RLS sans policy => anon refusé.
-- ───────────────────────────────────────────────────────────────

-- Archivage d'un prof par son établissement : exclu des vues, classes conservées.
alter table users add column if not exists archived boolean default false;
create index if not exists users_archived_idx on users(archived);

alter table users add column if not exists onboarding_completed boolean default false;

-- Invitations enseignant émises par un établissement. Le prof complète son
-- inscription via le lien ?prof=TOKEN et choisit son propre mot de passe.
create table if not exists prof_invites (
  id uuid default gen_random_uuid() primary key,
  institution_id uuid references institutions(id) on delete cascade,
  email text,                              -- optionnel : invitation ciblée
  token text unique not null,
  used_by uuid references users(id) on delete set null,
  revoked boolean default false,
  created_at timestamptz default now()
);
create index if not exists prof_invites_token_idx on prof_invites(token);
create index if not exists prof_invites_institution_idx on prof_invites(institution_id);
alter table prof_invites enable row level security;

-- Rôle accordé par l'invitation : 'prof' (par défaut, via prof-invite-create)
-- ou 'admin' (bootstrap du tout premier compte établissement, voir
-- api/institutions.js — sans ça, aucun chemin produit ne crée jamais un
-- compte admin, il fallait le faire à la main en base).
alter table prof_invites add column if not exists role text default 'prof' check (role in ('prof','admin'));

-- ───────────────────────────────────────────────────────────────
-- Certificats de niveau (dactylographie). Émis par le serveur, signés (HMAC),
-- vérifiables publiquement via un code court + QR (page ?cert=CODE).
-- Un certificat par utilisateur, cumulatif (écrit et/ou dictée vocale).
-- Conditions d'obtention (vérifiées côté client puis enregistrées) :
-- regard sur l'écran >= 90%, précision >= 90%, vitesse >= seuil, sur un
-- examen standardisé. RLS sans policy => accès via serverless only.
-- ───────────────────────────────────────────────────────────────
create table if not exists certificates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade unique,
  code text unique not null,                 -- code public court (vérif/QR)
  full_name text not null,
  written_wpm integer,                       -- mpm en mode écrit (null si non passé)
  vocal_wpm integer,                         -- mpm en dictée vocale (null si non passé)
  written_gaze integer,                      -- % de regard écran (écrit)
  vocal_gaze integer,                        -- % de regard écran (dictée)
  level text,                                -- libellé du niveau global
  signature text not null,                   -- HMAC du contenu (intégrité)
  issued_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists certificates_code_idx on certificates(code);
alter table certificates enable row level security;

-- ───────────────────────────────────────────────────────────────
-- Sécurité & RGPD (juil. 2026)
-- Anti-bruteforce : verrouillage temporaire du compte après trop d'échecs.
-- Consentement / mineurs : trace du consentement, âge, email du responsable.
-- Les mots de passe sont désormais stockés au format scrypt salé
-- (password_hash reste text ; migration transparente au prochain login).
-- ───────────────────────────────────────────────────────────────
alter table users
  add column if not exists failed_attempts integer default 0,
  add column if not exists locked_until timestamptz,
  add column if not exists consent_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists birthdate date,
  add column if not exists parent_email text;

-- Licence établissement : échéance de renouvellement. Null = pas d'expiration
-- (compat licences existantes). À l'expiration, les élèves rattachés repassent
-- en 'free' au prochain login et les nouvelles inscriptions sont bloquées.
alter table institutions add column if not exists license_expires_at timestamptz;

-- ───────────────────────────────────────────────────────────────
-- Dashboard interne équipe (KPI, prospection écoles, calendrier marketing).
-- Accès uniquement via api/dashboard.js (clé ADMIN_KEY partagée, côté service).
-- RLS sans policy => accès anonyme refusé.
-- ───────────────────────────────────────────────────────────────
create table if not exists school_prospects (
  id uuid default gen_random_uuid() primary key,
  school_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  status text default 'a_contacter' check (status in
    ('a_contacter','envoye','relance','repondu','en_negociation','signe','perdu')),
  notes text,
  last_contact_at timestamptz,
  next_followup_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists school_prospects_status_idx on school_prospects(status);
create index if not exists school_prospects_followup_idx on school_prospects(next_followup_at);
alter table school_prospects enable row level security;

-- Ville du prospect (formulaire, tri, import/export CSV du dashboard).
alter table school_prospects add column if not exists city text;

-- Prochain rendez-vous planifié (appel/visio/rencontre), distinct de
-- next_followup_at qui est une date de relance suggérée automatiquement.
alter table school_prospects add column if not exists meeting_at timestamptz;
create index if not exists school_prospects_meeting_idx on school_prospects(meeting_at);

-- Effectif élèves estimé (texte libre, ex. "~1000 élèves (secondaire)") +
-- source/fiabilité de l'estimation (ex. "Wikipédia", "non trouvé"). Pas de
-- champ € : la conversion en revenu projeté reste une décision manuelle
-- (grille tarifaire non fixe), volontairement pas automatisée ici.
alter table school_prospects add column if not exists estimated_students text;
alter table school_prospects add column if not exists estimated_students_source text;

create table if not exists content_calendar (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content_type text default 'post' check (content_type in
    ('video','post','story','article','newsletter','tache')),
  platform text,
  account text default 'keypace',  -- 'keypace' | 'fondateur_1' | 'fondateur_2'
  caption text,                    -- texte réel du post (distinct de `notes`, interne)
  status text default 'idee' check (status in ('idee','a_faire','pret','publie')),
  scheduled_date date,            -- null = dans le backlog, pas encore planifié
  link text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists content_calendar_date_idx on content_calendar(scheduled_date);
alter table content_calendar enable row level security;

-- Un contenu peut être posté sur plusieurs plateformes à la fois (remplace
-- l'ancien `platform` unique). Migration : reprend la valeur existante avant
-- de supprimer la colonne.
alter table content_calendar add column if not exists platforms text[] default '{}';
update content_calendar set platforms = array[platform] where platform is not null and platforms = '{}';
alter table content_calendar drop column if exists platform;

-- Clé stable de l'idée de la banque d'idées (voir CONTENT_IDEAS,
-- dashboard-app/index.html) à l'origine de ce contenu, si créé depuis là.
-- Sert à ne plus reproposer un sujet déjà traité (regroupé par `topic`).
alter table content_calendar add column if not exists idea_key text;

-- ───────────────────────────────────────────────────────────────
-- Historique par élément (prospect ou contenu) : qui a changé quoi et quand,
-- + notes manuelles. entity_id référence school_prospects.id ou
-- content_calendar.id selon entity_type (pas de FK stricte car polymorphe ;
-- les lignes sont supprimées manuellement quand l'élément l'est, voir
-- prospectDelete/eventDelete dans dashboard-app/api/dashboard.js).
-- ───────────────────────────────────────────────────────────────
create table if not exists activity_log (
  id uuid default gen_random_uuid() primary key,
  entity_type text not null check (entity_type in ('prospect', 'content')),
  entity_id uuid not null,
  action text not null check (action in ('created', 'updated', 'status_changed', 'note')),
  detail text,
  created_at timestamptz default now()
);
create index if not exists activity_log_entity_idx on activity_log(entity_type, entity_id, created_at desc);
alter table activity_log enable row level security;

-- Élargit entity_type au backlog de développement (voir dev_backlog
-- ci-dessous). alter table ... add constraint ne supporte pas "if not
-- exists" pour les check constraints : on la retire puis la recrée.
alter table activity_log drop constraint if exists activity_log_entity_type_check;
alter table activity_log add constraint activity_log_entity_type_check
  check (entity_type in ('prospect', 'content', 'dev_issue', 'competitor'));

-- ───────────────────────────────────────────────────────────────
-- Backlog de développement KeyPace (bugs, features, dette technique) —
-- board interne façon Linear/GitHub Issues, historique via activity_log
-- (entity_type='dev_issue').
-- ───────────────────────────────────────────────────────────────
create table if not exists dev_backlog (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  item_type text not null default 'feature' check (item_type in ('bug', 'feature', 'tech_debt', 'idee')),
  priority text not null default 'moyenne' check (priority in ('basse', 'moyenne', 'haute', 'urgente')),
  status text not null default 'backlog' check (status in ('backlog', 'a_faire', 'en_cours', 'fait')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists dev_backlog_status_idx on dev_backlog(status);
alter table dev_backlog enable row level security;

-- ───────────────────────────────────────────────────────────────
-- Veille concurrentielle : liste de concurrents avec forces/faiblesses/CA
-- estimé (renseignés manuellement), + détection de changement de contenu
-- (hash du texte visible de leur page, voir competitorCheck dans
-- dashboard-app/api/dashboard.js) — pas d'IA, juste un hash comparé au
-- précédent, pour rester cohérent avec l'approche "templates/règles" déjà
-- retenue pour la banque d'idées.
-- ───────────────────────────────────────────────────────────────
create table if not exists competitors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  url text not null,
  strengths text,
  weaknesses text,
  estimated_revenue text,
  notes text,
  last_snapshot_hash text,
  last_checked_at timestamptz,
  content_changed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table competitors enable row level security;

-- File d'attente de concurrents suggérés à vérifier (pré-alimentée via
-- recherche ponctuelle, pas d'appel IA en runtime — cohérent avec le reste
-- du dashboard). Un clic "Ajouter" crée la ligne dans `competitors` et
-- marque la suggestion 'added' ; "Ignorer" la marque 'dismissed'.
create table if not exists competitor_suggestions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  url text not null,
  reason text,
  status text default 'pending' check (status in ('pending','added','dismissed')),
  created_at timestamptz default now()
);
create index if not exists competitor_suggestions_status_idx on competitor_suggestions(status);
alter table competitor_suggestions enable row level security;

-- Groupes de doublons potentiels (findDuplicateProspects, dedup_key = nom
-- d'école normalisé) explicitement marqués "pas un doublon" par l'utilisateur
-- — ne sont plus jamais reproposés dans la bannière d'alerte.
create table if not exists dismissed_duplicates (
  id uuid default gen_random_uuid() primary key,
  dedup_key text not null unique,
  created_at timestamptz default now()
);
alter table dismissed_duplicates enable row level security;

-- ───────────────────────────────────────────────────────────────
-- Checklist sécurité périodique (onglet Sécurité du dashboard).
-- Les items eux-mêmes (libellé, catégorie, pourquoi, fréquence conseillée)
-- sont définis en dur côté code (SECURITY_CHECKLIST_ITEMS dans dashboard.js)
-- — cette table ne garde que l'état "dernière vérification" par item_key,
-- pour savoir ce qui est en retard sans dépendre d'une IA en runtime.
-- ───────────────────────────────────────────────────────────────
create table if not exists security_checklist_checks (
  item_key text primary key,
  checked_at timestamptz not null default now(),
  notes text
);
alter table security_checklist_checks enable row level security;

-- ───────────────────────────────────────────────────────────────
-- Coffre-fort de secrets (identifiants de services tiers, etc.).
-- Chiffrement au repos (AES-256-GCM, voir vaultEncrypt/vaultDecrypt dans
-- dashboard-app/api/dashboard.js) : la clé VAULT_ENCRYPTION_KEY vit
-- uniquement en variable d'environnement Vercel, jamais en base — protège
-- contre une fuite/dump direct de cette table. Ne protège PAS contre une
-- fuite de l'ADMIN_KEY (accès complet via l'API normale du dashboard) :
-- n'y stocke jamais la clé service Supabase ni la clé secrète Stripe, ce
-- sont littéralement les clés qui donnent accès à l'endroit où ce coffre vit.
-- ───────────────────────────────────────────────────────────────
create table if not exists vault_secrets (
  id uuid default gen_random_uuid() primary key,
  label text not null,
  username text,
  secret_ciphertext text not null,  -- base64 (chiffré || auth tag GCM)
  secret_iv text not null,           -- base64, unique par entrée
  notes text,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table vault_secrets enable row level security;

-- Répertoire de liens (raccourcis vers consoles d'admin — Supabase, Vercel,
-- Stripe...) : jamais de secret ici, uniquement des URL.
create table if not exists resource_links (
  id uuid default gen_random_uuid() primary key,
  label text not null,
  url text not null,
  category text,
  created_at timestamptz default now()
);
alter table resource_links enable row level security;

-- Dédup de la synchro Zimbra (api/dashboard.js action=sync-zimbra) : un email
-- déjà traité (par Message-ID) n'est jamais reclassé lors d'une sync suivante.
create table if not exists zimbra_sync_log (
  id uuid default gen_random_uuid() primary key,
  message_id text unique not null,
  prospect_id uuid references school_prospects(id) on delete set null,
  direction text not null check (direction in ('in','out')),
  processed_at timestamptz default now()
);
create index if not exists zimbra_sync_log_message_id_idx on zimbra_sync_log(message_id);
alter table zimbra_sync_log enable row level security;

-- ───────────────────────────────────────────────────────────────
-- Avis KeyPace, affichés sur la home après le bandeau licence établissement.
-- Avis natifs déposés par un élève connecté depuis son dashboard (proposé
-- après un certain nombre de leçons/certificat), modérés avant publication.
-- Un seul avis natif par élève (uniques par user_id, resoumission = mise à
-- jour). `source`='google' réservé à une future synchro Google Business
-- Profile (source_url = lien vers l'avis d'origine).
-- Accès via api/reviews.js (clé service) ; RLS sans policy => anon refusé.
-- ───────────────────────────────────────────────────────────────
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete set null,
  source text not null default 'natif' check (source in ('natif','google')),
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  source_url text,
  published_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists reviews_status_idx on reviews(status, published_at desc);
create unique index if not exists reviews_user_unique_idx on reviews(user_id) where user_id is not null;
alter table reviews enable row level security;

-- Synchro avis Google Business Profile (dashboard-app, cron quotidien) :
-- l'API Google Places (legacy) ne renvoie pas d'ID stable par avis, donc on
-- en construit un nous-mêmes (horodatage + auteur) pour pouvoir upserter sans
-- doublon d'une synchro à l'autre sans jamais écraser un statut de
-- modération déjà décidé (voir syncGoogleReviews, dashboard-app/api/dashboard.js).
alter table reviews add column if not exists external_id text;
create unique index if not exists reviews_source_external_idx on reviews(source, external_id);

-- ───────────────────────────────────────────────────────────────
-- Analytics maison (remplace Umami Cloud, août 2026).
-- Un événement = une pageview ('event_name'='pageview') ou un événement
-- produit custom (signup, lesson_completed, ...). session_id est un hash
-- (IP + user-agent + jour + sel), recalculé chaque jour côté serveur
-- (api/track.js) : pas de cookie, pas d'identifiant persistant côté client,
-- donc pas de bannière de consentement nécessaire (même logique que le mode
-- "cookieless" d'Umami/Plausible déjà retenu). Écriture via clé service
-- uniquement (RLS sans policy => accès anon refusé).
-- ───────────────────────────────────────────────────────────────
create table if not exists analytics_events (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,          -- hash journalier anonyme, non ré-identifiable
  event_name text not null,
  path text,                          -- chemin de la page (pageviews)
  props jsonb default '{}',           -- payload custom (wpm, acc, game, ...)
  referrer text,                      -- hostname du référent externe, null si direct/interne
  country text,                       -- code pays ISO (en-tête géo Vercel, sans service tiers)
  browser text,
  os text,
  device_type text check (device_type in ('mobile','tablet','desktop')),
  created_at timestamptz default now()
);
create index if not exists analytics_events_name_idx on analytics_events(event_name, created_at);
create index if not exists analytics_events_created_idx on analytics_events(created_at);
create index if not exists analytics_events_session_idx on analytics_events(session_id);
alter table analytics_events enable row level security;
