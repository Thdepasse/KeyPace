-- À exécuter une fois dans Supabase (SQL Editor). Relançable sans risque.
-- Étape 1c du plan clavier/langues : historique des dernières versions de la progression,
-- gardé seulement quand une sauvegarde ferait reculer des données (voir api/_progress-history.js).
-- Ne change rien au comportement du site tant que le code n'écrit pas dedans.

create table if not exists progress_history (
  id bigserial primary key,
  -- La clé étrangère `on delete cascade` fait disparaître l'historique d'un élève avec son compte
  -- (suppression de compte et suppression pour inactivité s'appuient sur ces cascades).
  user_id uuid references users(id) on delete cascade not null,
  data jsonb not null,
  lessons_count integer not null default 0,
  tests_count integer not null default 0,
  reason text,
  saved_at timestamptz default now()
);
create index if not exists progress_history_user_idx on progress_history(user_id, saved_at desc);
create index if not exists progress_history_saved_idx on progress_history(saved_at);
alter table progress_history enable row level security;
drop policy if exists "no_anon_access" on progress_history;
create policy "no_anon_access" on progress_history for all to anon using (false) with check (false);

-- Conservation : 90 jours, purge automatique par la tâche quotidienne (api/login.js, retention-sweep-cron).
-- Restauration manuelle d'un compte (à adapter) :
--   update progress set data = h.data, rev = rev + 1
--   from progress_history h where h.id = <id de la version> and progress.user_id = h.user_id;
