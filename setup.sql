-- Geldfluss: einmal im Supabase SQL Editor ausführen (alles markieren → Run)

-- 1) Eine Zeile pro Person mit allen Geldfluss-Daten
create table if not exists public.geldfluss_state (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2) Zeitstempel setzt immer der Server, nie das Gerät
create or replace function public.geldfluss_touch()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists geldfluss_touch on public.geldfluss_state;
create trigger geldfluss_touch before insert or update on public.geldfluss_state
for each row execute function public.geldfluss_touch();

-- 3) Zugriffsschutz: Jede Person sieht und ändert nur ihre eigene Zeile
alter table public.geldfluss_state enable row level security;

drop policy if exists "geldfluss lesen" on public.geldfluss_state;
drop policy if exists "geldfluss anlegen" on public.geldfluss_state;
drop policy if exists "geldfluss ändern" on public.geldfluss_state;

create policy "geldfluss lesen" on public.geldfluss_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "geldfluss anlegen" on public.geldfluss_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "geldfluss ändern" on public.geldfluss_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.geldfluss_state from anon;
grant select, insert, update on public.geldfluss_state to authenticated;
