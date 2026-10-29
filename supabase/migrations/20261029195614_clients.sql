-- Clients: a trainer's client records, and private notes about them.
--
-- A client record exists whether or not the client has a Spotter login. When a
-- trainer invites a client, the server creates their login and links it here
-- through user_id. Only the server (service role) sets user_id and invited_at.

create type public.client_status as enum ('active', 'inactive');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  full_name text not null
    constraint clients_full_name_length check (char_length(trim(full_name)) between 1 and 100),
  email text
    constraint clients_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text
    constraint clients_phone_length check (char_length(phone) <= 40),
  goals text not null default ''
    constraint clients_goals_length check (char_length(goals) <= 2000),
  status public.client_status not null default 'active',
  -- The client's Spotter login, once invited.
  user_id uuid unique references public.profiles (id) on delete set null,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_trainer_id_idx on public.clients (trainer_id, full_name);
-- One record per email address per trainer.
create unique index clients_trainer_email_idx
  on public.clients (trainer_id, lower(email))
  where email is not null;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function private.set_updated_at();

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  author_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  body text not null
    constraint client_notes_body_length check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index client_notes_client_id_idx on public.client_notes (client_id, created_at desc);

-- Whether the current user is a trainer.
create function private.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'trainer'
  );
$$;

grant execute on function private.is_trainer() to authenticated;

-- Row level security: clients
alter table public.clients enable row level security;

create policy "Trainers can view their clients"
  on public.clients for select
  to authenticated
  using (trainer_id = (select auth.uid()));

create policy "Clients can view their own record"
  on public.clients for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Trainers can add clients"
  on public.clients for insert
  to authenticated
  with check (trainer_id = (select auth.uid()) and (select private.is_trainer()));

create policy "Trainers can update their clients"
  on public.clients for update
  to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

create policy "Trainers can delete their clients"
  on public.clients for delete
  to authenticated
  using (trainer_id = (select auth.uid()));

revoke all on public.clients from anon;
revoke insert, update on public.clients from authenticated;
grant insert (full_name, email, phone, goals, status) on public.clients to authenticated;
grant update (full_name, email, phone, goals, status) on public.clients to authenticated;

-- Row level security: client notes. Only the client's trainer can see them.
alter table public.client_notes enable row level security;

create policy "Trainers can view notes on their clients"
  on public.client_notes for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and c.trainer_id = (select auth.uid())
    )
  );

create policy "Trainers can add notes to their clients"
  on public.client_notes for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.trainer_id = (select auth.uid())
    )
  );

create policy "Trainers can delete notes on their clients"
  on public.client_notes for delete
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and c.trainer_id = (select auth.uid())
    )
  );

revoke all on public.client_notes from anon;
revoke insert, update on public.client_notes from authenticated;
grant insert (client_id, body) on public.client_notes to authenticated;
