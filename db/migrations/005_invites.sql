-- One-time links that let someone choose their password: client invites from
-- their trainer, and the trainer's own first login. Only a hash of each token
-- is stored. Only the server uses this table, so signed-in people have no
-- access to it.

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references "user" (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index invites_user_id_idx on public.invites (user_id);

alter table public.invites enable row level security;
