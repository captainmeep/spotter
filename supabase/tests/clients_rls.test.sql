-- Row level security tests for public.clients and public.client_notes.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- Two trainers, and a client login that belongs to the first trainer.
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'trainer@test.local', '{}', '{"full_name": "Trainer One"}'),
  ('22222222-2222-2222-2222-222222222222', 'other@test.local', '{}', '{"full_name": "Trainer Two"}'),
  (
    '33333333-3333-3333-3333-333333333333',
    'client@test.local',
    '{"role": "client", "trainer_id": "11111111-1111-1111-1111-111111111111"}',
    '{"full_name": "Client One"}'
  );

-- Records created by the server (as the service role would).
insert into public.clients (id, trainer_id, full_name, email, user_id)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Client One', 'client@test.local', '33333333-3333-3333-3333-333333333333'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Client Two', null, null),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Other Client', null, null);

insert into public.client_notes (client_id, author_id, body)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Knee feels better.');

-- As the first trainer
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  'select full_name from public.clients order by full_name',
  array['Client One', 'Client Two'],
  'trainers see only their own clients'
);
select lives_ok(
  $$insert into public.clients (full_name, email, goals) values ('New Client', 'new@test.local', 'Run a 5k')$$,
  'trainers can add clients'
);
select is(
  (select trainer_id from public.clients where full_name = 'New Client'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'new clients belong to the trainer who added them'
);
select throws_ok(
  $$insert into public.clients (full_name, email) values ('Duplicate', 'NEW@test.local')$$,
  '23505',
  null,
  'a trainer cannot add the same email twice'
);
select lives_ok(
  $$update public.clients set goals = 'Lose 5kg', status = 'inactive' where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  'trainers can update their clients'
);
select throws_ok(
  $$update public.clients set user_id = '22222222-2222-2222-2222-222222222222' where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'trainers cannot link a login to a client themselves'
);
select throws_ok(
  $$update public.clients set trainer_id = '22222222-2222-2222-2222-222222222222' where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'trainers cannot move a client to another trainer'
);
select results_eq(
  'select body from public.client_notes',
  array['Knee feels better.'],
  'trainers see notes on their clients'
);
select lives_ok(
  $$insert into public.client_notes (client_id, body) values ('aaaaaaaa-0000-0000-0000-000000000002', 'First session booked.')$$,
  'trainers can add notes to their clients'
);
select throws_ok(
  $$insert into public.client_notes (client_id, body) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Sneaky note')$$,
  '42501',
  null,
  'trainers cannot add notes to another trainer''s client'
);

-- As the other trainer
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select results_eq(
  'select full_name from public.clients',
  array['Other Client'],
  'trainers cannot see other trainers'' clients'
);
select is_empty(
  'select * from public.client_notes',
  'trainers cannot see notes on other trainers'' clients'
);
update public.clients set full_name = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from public.clients where id = 'aaaaaaaa-0000-0000-0000-000000000002';
delete from public.client_notes;

-- As the client
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select results_eq(
  'select full_name from public.clients',
  array['Client One'],
  'other trainers could not change, delete, or remove notes (and clients see only their own record)'
);
select is_empty(
  'select * from public.client_notes',
  'clients cannot see their trainer''s notes'
);
select throws_ok(
  $$insert into public.clients (full_name) values ('Fake Client')$$,
  '42501',
  null,
  'clients cannot add client records'
);
update public.clients set goals = 'Changed by client' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select goals from public.clients where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '',
  'clients cannot change their own record'
);
delete from public.clients where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select isnt_empty(
  'select * from public.clients',
  'clients cannot delete their own record'
);

-- Back as the first trainer
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.client_notes),
  2,
  'notes are untouched by other users'
);
select lives_ok(
  $$delete from public.client_notes where body = 'First session booked.'$$,
  'trainers can delete notes on their clients'
);
select lives_ok(
  $$delete from public.clients where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  'trainers can delete their clients'
);
select results_eq(
  'select full_name from public.clients order by full_name',
  array['Client One', 'New Client'],
  'the deleted client is gone'
);

-- Signed out
reset request.jwt.claims;
set local role anon;

select throws_ok(
  'select * from public.clients',
  '42501',
  null,
  'signed-out visitors cannot read clients'
);

select * from finish();
rollback;
