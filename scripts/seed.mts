// Demo data for local development. Run with `npm run db:seed`.
// Safe to run more than once: anything that already exists is left alone.
import { getDb, getPool } from "../src/lib/db";
import starterExercises from "../src/lib/starter-exercises.json" with { type: "json" };
import { createUserWithProfile, findUserByEmail } from "../src/lib/users";

const PASSWORD = "password123";

if (!/@(127\.0\.0\.1|localhost)(:|\/)/.test(process.env.DATABASE_URL ?? "")) {
  console.error("Refusing to seed: DATABASE_URL isn't a local database.");
  process.exit(1);
}

const db = getDb();

async function ensureUser(options: Parameters<typeof createUserWithProfile>[0]) {
  const existing = await findUserByEmail(options.email);
  if (existing) {
    console.log(`- ${options.email} already exists`);
    return existing;
  }
  const user = await createUserWithProfile(options);
  console.log(`- created ${options.email}`);
  return user;
}

async function ensureClient(
  trainerId: string,
  {
    notes = [],
    ...client
  }: {
    full_name: string;
    email?: string;
    phone?: string;
    goals?: string;
    status?: "active" | "inactive";
    user_id?: string;
    invited_at?: Date;
    notes?: string[];
  },
) {
  const existing = await db
    .selectFrom("clients")
    .select("id")
    .where("trainer_id", "=", trainerId)
    .where("full_name", "=", client.full_name)
    .executeTakeFirst();
  if (existing) {
    console.log(`- client ${client.full_name} already exists`);
    return existing.id;
  }

  const { id } = await db
    .insertInto("clients")
    .values({ trainer_id: trainerId, ...client })
    .returning("id")
    .executeTakeFirstOrThrow();
  if (notes.length > 0) {
    await db
      .insertInto("client_notes")
      .values(
        notes.map((body, index) => ({
          client_id: id,
          author_id: trainerId,
          body,
          // Space the notes out so they read like a history.
          created_at: new Date(Date.now() - (notes.length - index) * 3 * 86400000),
        })),
      )
      .execute();
  }
  console.log(`- created client ${client.full_name}`);
  return id;
}

async function ensureExercises(trainerId: string) {
  const existing = await db
    .selectFrom("exercises")
    .select("id")
    .where("trainer_id", "=", trainerId)
    .executeTakeFirst();
  if (!existing) {
    await db
      .insertInto("exercises")
      .values(starterExercises.map((exercise) => ({ trainer_id: trainerId, ...exercise })))
      .execute();
    console.log(`- added ${starterExercises.length} starter exercises`);
  }
  const rows = await db
    .selectFrom("exercises")
    .select(["id", "name"])
    .where("trainer_id", "=", trainerId)
    .execute();
  return new Map(rows.map((row) => [row.name, row.id]));
}

// Each exercise: [name, sets, reps, weight, rest, notes?]
type WorkoutPlan = { name: string; exercises: [string, number, string, string, string, string?][] };

async function ensureProgram(
  trainerId: string,
  exerciseIds: Map<string, string>,
  {
    workouts,
    clientIds = [],
    ...program
  }: {
    name: string;
    description: string;
    duration_weeks: number;
    clientIds?: string[];
    workouts: WorkoutPlan[];
  },
) {
  const existing = await db
    .selectFrom("programs")
    .select("id")
    .where("trainer_id", "=", trainerId)
    .where("name", "=", program.name)
    .executeTakeFirst();
  if (existing) {
    console.log(`- program ${program.name} already exists`);
    return;
  }

  const { id: programId } = await db
    .insertInto("programs")
    .values({ trainer_id: trainerId, ...program })
    .returning("id")
    .executeTakeFirstOrThrow();

  for (const [workoutIndex, workout] of workouts.entries()) {
    const { id: workoutId } = await db
      .insertInto("program_workouts")
      .values({ program_id: programId, name: workout.name, position: workoutIndex })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("workout_exercises")
      .values(
        workout.exercises.map(([name, sets, reps, weight, rest, notes = ""], position) => {
          const exerciseId = exerciseIds.get(name);
          if (!exerciseId) throw new Error(`Unknown exercise: ${name}`);
          return { workout_id: workoutId, exercise_id: exerciseId, position, sets, reps, weight, rest, notes };
        }),
      )
      .execute();
  }

  if (clientIds.length > 0) {
    await db
      .insertInto("client_programs")
      .values(clientIds.map((clientId) => ({ client_id: clientId, program_id: programId })))
      .execute();
  }
  console.log(`- created program ${program.name}`);
}

const trainer = await ensureUser({
  email: "trainer@example.com",
  name: "Taylor Trainer",
  role: "trainer",
  password: PASSWORD,
});

const clientUser = await ensureUser({
  email: "client@example.com",
  name: "Casey Client",
  role: "client",
  trainerId: trainer.id,
  password: PASSWORD,
});

const caseyId = await ensureClient(trainer.id, {
  full_name: "Casey Client",
  email: "client@example.com",
  phone: "555-0101",
  goals: "Run a half marathon in under 2 hours by spring.\nBuild core strength to stop lower back pain.",
  user_id: clientUser.id,
  invited_at: new Date(),
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
  description:
    "Two strength sessions a week to support your running. Keep the weights challenging but leave 2 reps in the tank.",
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

await getPool().end();
console.log(`\nDemo accounts are ready. Password for both: ${PASSWORD}`);
