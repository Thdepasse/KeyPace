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

-- Index pour les lookups fréquents
create index if not exists users_username_idx on users(username);
create index if not exists users_session_token_idx on users(session_token);
create index if not exists users_stripe_customer_id_idx on users(stripe_customer_id);
