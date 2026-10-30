-- Training programs.
--
-- exercises          a trainer's exercise library
-- programs           a reusable program, e.g. "Beginner strength", repeated for N weeks
-- program_workouts   the workouts in a program, in order, e.g. "Day 1: Upper body"
-- workout_exercises  the exercises in a workout, in order, with sets, reps and weight
-- client_programs    which clients a program is shared with
--
-- Trainers manage their own library and programs. Clients can read the
-- programs shared with them, and the exercises those programs use.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default app.current_user_id()
    references public.profiles (id) on delete cascade,
  name text not null
    constraint exercises_name_length check (char_length(trim(name)) between 1 and 100),
  category text not null default ''
    constraint exercises_category_length check (char_length(category) <= 50),
  instructions text not null default ''
    constraint exercises_instructions_length check (char_length(instructions) <= 2000),
  video_url text
    constraint exercises_video_url_format check (video_url ~* '^https?://\S+$' and char_length(video_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index exercises_trainer_name_idx on public.exercises (trainer_id, lower(name));

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function private.set_updated_at();

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default app.current_user_id()
    references public.profiles (id) on delete cascade,
  name text not null
    constraint programs_name_length check (char_length(trim(name)) between 1 and 100),
  description text not null default ''
    constraint programs_description_length check (char_length(description) <= 2000),
  -- How many weeks to repeat the workouts for. Null means open-ended.
  duration_weeks integer
    constraint programs_duration_weeks_range check (duration_weeks between 1 and 52),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index programs_trainer_id_idx on public.programs (trainer_id, name);

create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function private.set_updated_at();

create table public.program_workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null
    constraint program_workouts_name_length check (char_length(trim(name)) between 1 and 100),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index program_workouts_program_id_idx on public.program_workouts (program_id, position);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.program_workouts (id) on delete cascade,
  -- Exercises in use can't be deleted from the library.
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null default 0,
  sets integer
    constraint workout_exercises_sets_range check (sets between 1 and 50),
  -- Free text, so trainers can write "8-10", "30s" or "AMRAP".
  reps text not null default ''
    constraint workout_exercises_reps_length check (char_length(reps) <= 30),
  weight text not null default ''
    constraint workout_exercises_weight_length check (char_length(weight) <= 30),
  rest text not null default ''
    constraint workout_exercises_rest_length check (char_length(rest) <= 30),
  notes text not null default ''
    constraint workout_exercises_notes_length check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index workout_exercises_workout_id_idx on public.workout_exercises (workout_id, position);
create index workout_exercises_exercise_id_idx on public.workout_exercises (exercise_id);

create table public.client_programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  constraint client_programs_unique unique (client_id, program_id)
);

create index client_programs_program_id_idx on public.client_programs (program_id);

-- Access helpers. Security definer so policies can check ownership across
-- tables without running into each other's row level security.

create function private.owns_program(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.programs
    where id = target_program_id and trainer_id = (select app.current_user_id())
  );
$$;

-- Whether the program is shared with the signed-in client.
create function private.is_assigned_program(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.client_programs cp
    join public.clients c on c.id = cp.client_id
    where cp.program_id = target_program_id and c.user_id = (select app.current_user_id())
  );
$$;

create function private.workout_program_id(target_workout_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select program_id from public.program_workouts where id = target_workout_id;
$$;

create function private.owns_exercise(target_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exercises
    where id = target_exercise_id and trainer_id = (select app.current_user_id())
  );
$$;

-- Whether the exercise appears in a program shared with the signed-in client.
create function private.is_assigned_exercise(target_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_exercises we
    join public.program_workouts w on w.id = we.workout_id
    join public.client_programs cp on cp.program_id = w.program_id
    join public.clients c on c.id = cp.client_id
    where we.exercise_id = target_exercise_id and c.user_id = (select app.current_user_id())
  );
$$;

create function private.owns_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clients
    where id = target_client_id and trainer_id = (select app.current_user_id())
  );
$$;

grant execute on function
  private.owns_program(uuid),
  private.is_assigned_program(uuid),
  private.workout_program_id(uuid),
  private.owns_exercise(uuid),
  private.is_assigned_exercise(uuid),
  private.owns_client(uuid)
to authenticated;

-- exercises
alter table public.exercises enable row level security;

create policy "Trainers can view their exercises"
  on public.exercises for select to authenticated
  using (trainer_id = (select app.current_user_id()));

create policy "Clients can view exercises in their programs"
  on public.exercises for select to authenticated
  using ((select private.is_assigned_exercise(id)));

create policy "Trainers can add exercises"
  on public.exercises for insert to authenticated
  with check (trainer_id = (select app.current_user_id()) and (select private.is_trainer()));

create policy "Trainers can update their exercises"
  on public.exercises for update to authenticated
  using (trainer_id = (select app.current_user_id()))
  with check (trainer_id = (select app.current_user_id()));

create policy "Trainers can delete their exercises"
  on public.exercises for delete to authenticated
  using (trainer_id = (select app.current_user_id()));

-- programs
alter table public.programs enable row level security;

create policy "Trainers can view their programs"
  on public.programs for select to authenticated
  using (trainer_id = (select app.current_user_id()));

create policy "Clients can view programs shared with them"
  on public.programs for select to authenticated
  using ((select private.is_assigned_program(id)));

create policy "Trainers can add programs"
  on public.programs for insert to authenticated
  with check (trainer_id = (select app.current_user_id()) and (select private.is_trainer()));

create policy "Trainers can update their programs"
  on public.programs for update to authenticated
  using (trainer_id = (select app.current_user_id()))
  with check (trainer_id = (select app.current_user_id()));

create policy "Trainers can delete their programs"
  on public.programs for delete to authenticated
  using (trainer_id = (select app.current_user_id()));

-- program_workouts
alter table public.program_workouts enable row level security;

create policy "Trainers and assigned clients can view workouts"
  on public.program_workouts for select to authenticated
  using (
    (select private.owns_program(program_id))
    or (select private.is_assigned_program(program_id))
  );

create policy "Trainers can add workouts to their programs"
  on public.program_workouts for insert to authenticated
  with check ((select private.owns_program(program_id)));

create policy "Trainers can update workouts in their programs"
  on public.program_workouts for update to authenticated
  using ((select private.owns_program(program_id)))
  with check ((select private.owns_program(program_id)));

create policy "Trainers can delete workouts from their programs"
  on public.program_workouts for delete to authenticated
  using ((select private.owns_program(program_id)));

-- workout_exercises
alter table public.workout_exercises enable row level security;

create policy "Trainers and assigned clients can view workout exercises"
  on public.workout_exercises for select to authenticated
  using (
    (select private.owns_program(private.workout_program_id(workout_id)))
    or (select private.is_assigned_program(private.workout_program_id(workout_id)))
  );

create policy "Trainers can add their exercises to their workouts"
  on public.workout_exercises for insert to authenticated
  with check (
    (select private.owns_program(private.workout_program_id(workout_id)))
    and (select private.owns_exercise(exercise_id))
  );

create policy "Trainers can update exercises in their workouts"
  on public.workout_exercises for update to authenticated
  using ((select private.owns_program(private.workout_program_id(workout_id))))
  with check ((select private.owns_program(private.workout_program_id(workout_id))));

create policy "Trainers can remove exercises from their workouts"
  on public.workout_exercises for delete to authenticated
  using ((select private.owns_program(private.workout_program_id(workout_id))));

-- client_programs
alter table public.client_programs enable row level security;

create policy "Trainers can view their clients' programs"
  on public.client_programs for select to authenticated
  using ((select private.owns_client(client_id)));

create policy "Clients can view their own programs"
  on public.client_programs for select to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and c.user_id = (select app.current_user_id())
    )
  );

create policy "Trainers can share their programs with their clients"
  on public.client_programs for insert to authenticated
  with check (
    (select private.owns_client(client_id))
    and (select private.owns_program(program_id))
  );

create policy "Trainers can unshare programs from their clients"
  on public.client_programs for delete to authenticated
  using ((select private.owns_client(client_id)));

-- Column privileges: ids, owners and timestamps are set by the database.
grant select, delete on
  public.exercises,
  public.programs,
  public.program_workouts,
  public.workout_exercises,
  public.client_programs
to authenticated;

grant insert (name, category, instructions, video_url),
      update (name, category, instructions, video_url)
  on public.exercises to authenticated;

grant insert (name, description, duration_weeks),
      update (name, description, duration_weeks)
  on public.programs to authenticated;

grant insert (program_id, name, position),
      update (name, position)
  on public.program_workouts to authenticated;

grant insert (workout_id, exercise_id, position, sets, reps, weight, rest, notes),
      update (position, sets, reps, weight, rest, notes)
  on public.workout_exercises to authenticated;

grant insert (client_id, program_id) on public.client_programs to authenticated;
