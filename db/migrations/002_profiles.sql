-- Roles, helpers and profiles.
--
-- How access works: the app connects as the database user that owns these
-- tables. For anything done on behalf of a signed-in person it opens a
-- transaction, switches to the `authenticated` role and sets `app.user_id`
-- (see asUser() in src/lib/db). Row level security then limits what that
-- person can see and change. Server-only work (logins, invites) runs as the
-- owner, which row level security doesn't restrict.

do $$
begin
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

-- Let the app's database user switch to the authenticated role.
grant authenticated to current_user;

create schema if not exists app;
create schema if not exists private;

-- The signed-in person for the current transaction, or null.
create function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant usage on schema public, app, private to authenticated;
grant execute on function app.current_user_id() to authenticated;

-- Profiles: one row per login, holding their role in Spotter. The server
-- creates it with the login (src/lib/auth/users.ts); people can't choose
-- their own role or trainer.
create type public.user_role as enum ('trainer', 'client');

create table public.profiles (
  id uuid primary key references "user" (id) on delete cascade,
  role public.user_role not null default 'trainer',
  full_name text not null default '',
  -- The trainer a client belongs to. Always null for trainers.
  trainer_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_client_has_trainer check (
    (role = 'client' and trainer_id is not null)
    or (role = 'trainer' and trainer_id is null)
  )
);

create index profiles_trainer_id_idx on public.profiles (trainer_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- The current person's trainer. Security definer so policies on profiles can
-- call it without recursing into the same policies.
create function private.current_trainer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select trainer_id from public.profiles where id = (select app.current_user_id());
$$;

grant execute on function private.current_trainer_id() to authenticated;

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select app.current_user_id()));

create policy "Trainers can view their clients"
  on public.profiles for select
  to authenticated
  using (trainer_id = (select app.current_user_id()));

create policy "Clients can view their trainer"
  on public.profiles for select
  to authenticated
  using (id = (select private.current_trainer_id()));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select app.current_user_id()))
  with check (id = (select app.current_user_id()));

-- People may only change their name. Role and trainer are set by the server.
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
