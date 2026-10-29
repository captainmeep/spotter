-- Row level security tests for exercises, programs, workouts and sharing.
begin;
create extension if not exists pgtap with schema extensions;

select plan(28);

-- Trainer One has clients A and B, each with a login. Trainer Two has client C.
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'one@test.local', '{}', '{"full_name": "Trainer One"}'),
  ('22222222-2222-2222-2222-222222222222', 'two@test.local', '{}', '{"full_name": "Trainer Two"}'),
  ('aaaaaaaa-1111-1111-1111-111111111111', 'a@test.local',
    '{"role": "client", "trainer_id": "11111111-1111-1111-1111-111111111111"}', '{"full_name": "Client A"}'),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'b@test.local',
    '{"role": "client", "trainer_id": "11111111-1111-1111-1111-111111111111"}', '{"full_name": "Client B"}');

insert into public.clients (id, trainer_id, full_name, user_id)
values
  ('c0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Client A', 'aaaaaaaa-1111-1111-1111-111111111111'),
  ('c0000000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', 'Client B', 'bbbbbbbb-1111-1111-1111-111111111111'),
  ('c0000000-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222', 'Client C', null);

insert into public.exercises (id, trainer_id, name)
values
  ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Squat'),
  ('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Plank'),
  ('e0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Secret Move');

insert into public.programs (id, trainer_id, name)
values
  ('90000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Program One'),
  ('90000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Program Two'),
  ('90000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Program Three');

insert into public.program_workouts (id, program_id, name)
values
  ('a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Day 1'),
  ('a0000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000003', 'Secret Day');

insert into public.workout_exercises (workout_id, exercise_id, sets, reps)
values ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 3, '10');

-- Program One is shared with client A.
insert into public.client_programs (client_id, program_id)
values ('c0000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000001');

-- As Trainer One
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq('select name from public.exercises order by name', array['Plank', 'Squat'],
  'trainers see only their own exercises');
select results_eq('select name from public.programs order by name', array['Program One', 'Program Two'],
  'trainers see only their own programs');
select lives_ok($$insert into public.exercises (name, category) values ('Lunge', 'Legs')$$,
  'trainers can add exercises');
select throws_ok($$insert into public.exercises (name) values ('squat')$$, '23505', null,
  'exercise names are unique per trainer, ignoring case');
select lives_ok(
  $$insert into public.program_workouts (program_id, name, position) values ('90000000-0000-0000-0000-000000000001', 'Day 2', 1)$$,
  'trainers can add workouts to their programs');
select throws_ok(
  $$insert into public.program_workouts (program_id, name) values ('90000000-0000-0000-0000-000000000003', 'Hijack')$$,
  '42501', null, 'trainers cannot add workouts to other trainers'' programs');
select lives_ok(
  $$insert into public.workout_exercises (workout_id, exercise_id, sets, reps) values ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 3, '30s')$$,
  'trainers can add their exercises to their workouts');
select throws_ok(
  $$insert into public.workout_exercises (workout_id, exercise_id) values ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'trainers cannot use other trainers'' exercises');
select lives_ok(
  $$insert into public.client_programs (client_id, program_id) values ('c0000000-0000-0000-0000-00000000000b', '90000000-0000-0000-0000-000000000002')$$,
  'trainers can share their programs with their clients');
select throws_ok(
  $$insert into public.client_programs (client_id, program_id) values ('c0000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'trainers cannot share other trainers'' programs');
select throws_ok(
  $$insert into public.client_programs (client_id, program_id) values ('c0000000-0000-0000-0000-00000000000c', '90000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'trainers cannot share programs with other trainers'' clients');
select throws_ok(
  $$delete from public.exercises where id = 'e0000000-0000-0000-0000-000000000001'$$,
  '23503', null, 'exercises used in a workout cannot be deleted');
select throws_ok(
  $$update public.programs set trainer_id = '22222222-2222-2222-2222-222222222222' where id = '90000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'trainers cannot hand a program to another trainer');

-- As Trainer Two
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select results_eq('select name from public.programs', array['Program Three'],
  'trainers cannot see other trainers'' programs');
select is_empty($$select * from public.program_workouts where program_id = '90000000-0000-0000-0000-000000000001'$$,
  'trainers cannot see other trainers'' workouts');
select is_empty('select * from public.client_programs',
  'trainers cannot see other trainers'' sharing');
update public.programs set name = 'Hacked' where id = '90000000-0000-0000-0000-000000000001';
delete from public.workout_exercises;
delete from public.client_programs;

-- As client A, who has Program One
set local request.jwt.claims = '{"sub": "aaaaaaaa-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq('select name from public.programs', array['Program One'],
  'clients see only programs shared with them (and other trainers changed nothing)');
select results_eq('select name from public.program_workouts order by position, name', array['Day 1', 'Day 2'],
  'clients see the workouts in their programs');
select is((select count(*)::int from public.workout_exercises), 2,
  'clients see the exercises in their workouts (and other trainers deleted nothing)');
select results_eq('select name from public.exercises order by name', array['Plank', 'Squat'],
  'clients see only the library exercises their programs use');
select is((select count(*)::int from public.client_programs), 1,
  'clients see only their own sharing');
select throws_ok($$insert into public.programs (name) values ('My own program')$$, '42501', null,
  'clients cannot create programs');
select throws_ok(
  $$insert into public.program_workouts (program_id, name) values ('90000000-0000-0000-0000-000000000001', 'Extra day')$$,
  '42501', null, 'clients cannot add workouts');
select throws_ok(
  $$insert into public.client_programs (client_id, program_id) values ('c0000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'clients cannot share programs with themselves');
update public.workout_exercises set reps = '1';
select is((select count(*)::int from public.workout_exercises where reps = '1'), 0,
  'clients cannot change their workouts');

-- As client B, who has Program Two
set local request.jwt.claims = '{"sub": "bbbbbbbb-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq('select name from public.programs', array['Program Two'],
  'each client sees only their own programs');
select is_empty('select * from public.exercises',
  'clients see no exercises when their program has none');

-- Signed out
reset request.jwt.claims;
set local role anon;

select throws_ok('select * from public.programs', '42501', null,
  'signed-out visitors cannot read programs');

select * from finish();
rollback;
