-- Row level security tests for public.profiles. Run with `npm run db:test`.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Two trainers, and one client who belongs to the first trainer.
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

-- Signup trigger
select is(
  (select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'trainer',
  'users without a role in app_metadata become trainers'
);
select is(
  (select trainer_id from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'clients are linked to the trainer from app_metadata'
);

update auth.users
set raw_app_meta_data = '{"role": "client", "trainer_id": "22222222-2222-2222-2222-222222222222"}'
where id = '33333333-3333-3333-3333-333333333333';
select is(
  (select trainer_id from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'changing app_metadata updates the profile'
);
update auth.users
set raw_app_meta_data = '{"role": "client", "trainer_id": "11111111-1111-1111-1111-111111111111"}'
where id = '33333333-3333-3333-3333-333333333333';

-- As the first trainer
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  'select full_name from public.profiles order by full_name',
  array['Client One', 'Trainer One'],
  'trainers see themselves and their clients'
);

-- As the other trainer
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select results_eq(
  'select full_name from public.profiles',
  array['Trainer Two'],
  'trainers do not see other trainers or their clients'
);

-- As the client
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select results_eq(
  'select full_name from public.profiles order by full_name',
  array['Client One', 'Trainer One'],
  'clients see themselves and their trainer'
);

select lives_ok(
  $$update public.profiles set full_name = 'Client Renamed' where id = '33333333-3333-3333-3333-333333333333'$$,
  'users can change their own name'
);
select throws_ok(
  $$update public.profiles set role = 'trainer', trainer_id = null where id = '33333333-3333-3333-3333-333333333333'$$,
  '42501',
  null,
  'users cannot change their own role'
);

update public.profiles set full_name = 'Hacked' where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Trainer One',
  'users cannot change someone else''s profile'
);

select throws_ok(
  $$delete from public.profiles where id = '33333333-3333-3333-3333-333333333333'$$,
  '42501',
  null,
  'users cannot delete profiles'
);
select throws_ok(
  $$insert into public.profiles (id) values ('44444444-4444-4444-4444-444444444444')$$,
  '42501',
  null,
  'users cannot create profiles'
);

-- Signed out
reset request.jwt.claims;
set local role anon;

select is_empty('select * from public.profiles', 'signed-out visitors see no profiles');

select * from finish();
rollback;
