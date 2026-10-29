-- Profiles: one row per auth user, holding their role in Spotter.
--
-- Trainers sign up themselves. Clients are created by their trainer (Phase 2),
-- which sets `role` and `trainer_id` in the user's app_metadata. app_metadata can
-- only be written with the service role, so a user can never pick their own role.

create type public.user_role as enum ('trainer', 'client');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
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

comment on table public.profiles is 'Spotter user profile and role, one per auth user.';

-- Helpers live in a schema the API does not expose.
create schema if not exists private;

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

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Create a profile whenever a new auth user is created, and keep its role and
-- trainer in sync with app_metadata. Supabase Auth writes app_metadata passed to
-- admin.createUser in an update right after the insert, so both are needed.
create function private.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_role public.user_role :=
    coalesce(new.raw_app_meta_data ->> 'role', 'trainer')::public.user_role;
  new_trainer_id uuid := case
    when new_role = 'client' then (new.raw_app_meta_data ->> 'trainer_id')::uuid
  end;
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, role, full_name, trainer_id)
    values (
      new.id,
      new_role,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      new_trainer_id
    );
  else
    update public.profiles
    set role = new_role, trainer_id = new_trainer_id
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.sync_profile_from_auth_user();

create trigger on_auth_user_app_metadata_updated
  after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data is distinct from new.raw_app_meta_data)
  execute function private.sync_profile_from_auth_user();

-- The current user's trainer. Security definer so RLS policies on profiles can
-- call it without recursing into the same policies.
create function private.current_trainer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select trainer_id from public.profiles where id = (select auth.uid());
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_trainer_id() to authenticated;

-- Row level security
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Trainers can view their clients"
  on public.profiles for select
  to authenticated
  using (trainer_id = (select auth.uid()));

create policy "Clients can view their trainer"
  on public.profiles for select
  to authenticated
  using (id = (select private.current_trainer_id()));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Users may only change their name. Role and trainer are managed by the server.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;
