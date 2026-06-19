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
