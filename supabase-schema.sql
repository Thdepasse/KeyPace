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
