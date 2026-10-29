// Creates demo accounts for local development. Run with `npm run db:seed`.
// Safe to run more than once: existing demo users are left as they are.
import { createClient } from "@supabase/supabase-js";
import starterExercises from "../src/lib/starter-exercises.json" with { type: "json" };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env.local first.",
  );
  process.exit(1);
}

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url)) {
  console.error(`Refusing to seed a non-local database (${url}).`);
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "password123";

async function findUser(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((user) => user.email === email);
}

async function ensureUser({ email, fullName, appMetadata = {} }) {
  const existing = await findUser(email);
  if (existing) {
    console.log(`- ${email} already exists`);
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: appMetadata,
  });
  if (error) throw error;
  console.log(`- created ${email}`);
  return data.user;
}

async function ensureClient(trainerId, { notes = [], ...client }) {
  const { data: existing, error: findError } = await supabase
    .from("clients")
    .select("id")
    .eq("trainer_id", trainerId)
    .eq("full_name", client.full_name)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) {
    console.log(`- client ${client.full_name} already exists`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ trainer_id: trainerId, ...client })
    .select("id")
    .single();
  if (error) throw error;

  if (notes.length > 0) {
    const { error: notesError } = await supabase.from("client_notes").insert(
      notes.map((body, index) => ({
        client_id: data.id,
        author_id: trainerId,
        body,
        // Space the notes out so they read like a history.
        created_at: new Date(Date.now() - (notes.length - index) * 3 * 86400000).toISOString(),
      })),
    );
    if (notesError) throw notesError;
  }
  console.log(`- created client ${client.full_name}`);
  return data.id;
}

async function ensureExercises(trainerId) {
  const { count, error } = await supabase
    .from("exercises")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", trainerId);
  if (error) throw error;
  if (!count) {
    const { error: insertError } = await supabase
      .from("exercises")
      .insert(starterExercises.map((exercise) => ({ trainer_id: trainerId, ...exercise })));
    if (insertError) throw insertError;
    console.log(`- added ${starterExercises.length} starter exercises`);
  }

  const { data, error: listError } = await supabase
    .from("exercises")
    .select("id, name")
    .eq("trainer_id", trainerId);
  if (listError) throw listError;
  return new Map(data.map((exercise) => [exercise.name, exercise.id]));
}

// workouts: [{ name, exercises: [[exerciseName, sets, reps, weight, rest, notes?]] }]
async function ensureProgram(trainerId, exerciseIds, { workouts, clientIds = [], ...program }) {
  const { data: existing, error: findError } = await supabase
    .from("programs")
    .select("id")
    .eq("trainer_id", trainerId)
    .eq("name", program.name)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) {
    console.log(`- program ${program.name} already exists`);
    return;
  }

  const { data, error } = await supabase
    .from("programs")
    .insert({ trainer_id: trainerId, ...program })
    .select("id")
    .single();
  if (error) throw error;

  for (const [workoutIndex, workout] of workouts.entries()) {
    const { data: savedWorkout, error: workoutError } = await supabase
      .from("program_workouts")
      .insert({ program_id: data.id, name: workout.name, position: workoutIndex })
      .select("id")
      .single();
    if (workoutError) throw workoutError;

    const { error: exercisesError } = await supabase.from("workout_exercises").insert(
      workout.exercises.map(([name, sets, reps, weight, rest, notes = ""], position) => {
        const exerciseId = exerciseIds.get(name);
        if (!exerciseId) throw new Error(`Unknown exercise: ${name}`);
        return { workout_id: savedWorkout.id, exercise_id: exerciseId, position, sets, reps, weight, rest, notes };
      }),
    );
    if (exercisesError) throw exercisesError;
  }

  if (clientIds.length > 0) {
    const { error: shareError } = await supabase
      .from("client_programs")
      .insert(clientIds.map((clientId) => ({ client_id: clientId, program_id: data.id })));
    if (shareError) throw shareError;
  }
  console.log(`- created program ${program.name}`);
}

const trainer = await ensureUser({
  email: "trainer@example.com",
  fullName: "Taylor Trainer",
});

const clientUser = await ensureUser({
  email: "client@example.com",
  fullName: "Casey Client",
  appMetadata: { role: "client", trainer_id: trainer.id },
});

const caseyId = await ensureClient(trainer.id, {
  full_name: "Casey Client",
  email: "client@example.com",
  phone: "555-0101",
  goals: "Run a half marathon in under 2 hours by spring.\nBuild core strength to stop lower back pain.",
  user_id: clientUser.id,
  invited_at: new Date().toISOString(),
  notes: [
    "First session: good cardio base, tight hamstrings. Start mobility work.",
    "Back pain much better after two weeks of core work.",
  ],
});
await ensureClient(trainer.id, {
  full_name: "Morgan Lee",
  email: "morgan@example.com",
  phone: "555-0102",
  goals: "Deadlift 1.5x bodyweight. Train 3 times a week.",
  notes: ["Wants morning sessions before work."],
});
await ensureClient(trainer.id, {
  full_name: "Sam Patel",
  email: "sam@example.com",
  goals: "Get back into training after knee surgery.",
  status: "inactive",
});

const exerciseIds = await ensureExercises(trainer.id);

await ensureProgram(trainer.id, exerciseIds, {
  name: "Half marathon strength",
  description: "Two strength sessions a week to support your running. Keep the weights challenging but leave 2 reps in the tank.",
  duration_weeks: 8,
  clientIds: [caseyId],
  workouts: [
    {
      name: "Day 1: Lower body",
      exercises: [
        ["Goblet squat", 3, "10", "16 kg", "90s"],
        ["Romanian deadlift", 3, "8", "40 kg", "90s", "Slow on the way down."],
        ["Walking lunge", 3, "10 each leg", "Bodyweight", "60s"],
        ["Calf raise", 3, "15", "Bodyweight", "45s"],
      ],
    },
    {
      name: "Day 2: Core and upper body",
      exercises: [
        ["Push-up", 3, "10", "", "60s"],
        ["Dumbbell row", 3, "10 each arm", "14 kg", "60s"],
        ["Dead bug", 3, "8 each side", "", "45s", "Keep your lower back on the floor."],
        ["Side plank", 3, "30s each side", "", "30s"],
      ],
    },
  ],
});

await ensureProgram(trainer.id, exerciseIds, {
  name: "Beginner full body",
  description: "Three full-body sessions a week to build a base.",
  duration_weeks: 6,
  workouts: [
    {
      name: "Full body A",
      exercises: [
        ["Goblet squat", 3, "8-10", "", "90s"],
        ["Push-up", 3, "AMRAP", "", "60s"],
        ["Seated cable row", 3, "10", "", "60s"],
        ["Plank", 3, "30s", "", "30s"],
      ],
    },
  ],
});

console.log(`\nDemo accounts are ready. Password for both: ${PASSWORD}`);
