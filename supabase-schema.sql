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
