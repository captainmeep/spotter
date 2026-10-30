"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { asUser, errorCode } from "@/lib/db";
import starterExercises from "@/lib/starter-exercises.json";

// Every action checks the signed-in trainer itself: server actions can be
// called directly, not only from our forms. Queries run with asUser(), so row
// level security makes sure a trainer can only touch their own exercises,
// programs and clients.

type Result = { error?: string };

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function firstIssue(error: z.ZodError) {
  return { error: error.issues[0].message };
}

const emptyToNull = <T extends z.ZodType>(schema: T) =>
  z.union([z.literal("").transform(() => null), schema]);

// Exercises

const exerciseSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(100, "Keep the name under 100 characters."),
  category: z.string().trim().max(50, "Keep the category under 50 characters."),
  instructions: z.string().trim().max(2000, "Keep the instructions under 2,000 characters."),
  video_url: emptyToNull(
    z.url({ protocol: /^https?$/, error: "Enter a full video link starting with https://" }).max(500),
  ),
});

function readExercise(formData: FormData) {
  return exerciseSchema.safeParse({
    name: text(formData, "name"),
    category: text(formData, "category"),
    instructions: text(formData, "instructions"),
    video_url: text(formData, "video_url").trim(),
  });
}

function exerciseError(error: unknown): Result {
  if (errorCode(error) === "23505") return { error: "You already have an exercise with that name." };
  throw error;
}

export async function createExercise(formData: FormData): Promise<Result> {
  const trainer = await requireUser("trainer");
  const parsed = readExercise(formData);
  if (!parsed.success) return firstIssue(parsed.error);

  try {
    await asUser(trainer.id, (db) => db.insertInto("exercises").values(parsed.data).execute());
  } catch (error) {
    return exerciseError(error);
  }
  refresh();
  return {};
}

export async function updateExercise(exerciseId: string, formData: FormData): Promise<Result> {
  const trainer = await requireUser("trainer");
  const parsed = readExercise(formData);
  if (!parsed.success) return firstIssue(parsed.error);

  try {
    await asUser(trainer.id, (db) =>
      db.updateTable("exercises").set(parsed.data).where("id", "=", exerciseId).execute(),
    );
  } catch (error) {
    return exerciseError(error);
  }
  refresh();
  return {};
}

export async function deleteExercise(exerciseId: string): Promise<Result> {
  const trainer = await requireUser("trainer");
  try {
    await asUser(trainer.id, (db) => db.deleteFrom("exercises").where("id", "=", exerciseId).execute());
  } catch (error) {
    if (errorCode(error) === "23503") {
      return { error: "This exercise is used in a program. Remove it from those workouts first." };
    }
    throw error;
  }
  refresh();
  return {};
}

// Adds the starter exercises the trainer doesn't have yet.
export async function addStarterExercises(): Promise<Result> {
  const trainer = await requireUser("trainer");
  await asUser(trainer.id, async (db) => {
    const existing = await db.selectFrom("exercises").select("name").execute();
    const taken = new Set(existing.map(({ name }) => name.toLowerCase()));
    const missing = starterExercises.filter(({ name }) => !taken.has(name.toLowerCase()));
    if (missing.length > 0) await db.insertInto("exercises").values(missing).execute();
  });
  refresh();
  return {};
}

// Programs

const programSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(100, "Keep the name under 100 characters."),
  description: z.string().trim().max(2000, "Keep the description under 2,000 characters."),
  duration_weeks: emptyToNull(
    z.coerce
      .number({ error: "Enter the number of weeks." })
      .int("Enter a whole number of weeks.")
      .min(1, "A program lasts at least 1 week.")
      .max(52, "A program can last up to 52 weeks."),
  ),
});

function readProgram(formData: FormData) {
  return programSchema.safeParse({
    name: text(formData, "name"),
    description: text(formData, "description"),
    duration_weeks: text(formData, "duration_weeks").trim(),
  });
}

export type ProgramFormState = Result & {
  values?: { name: string; description: string; duration_weeks: string };
};

export async function createProgram(
  _prevState: ProgramFormState,
  formData: FormData,
): Promise<ProgramFormState> {
  const trainer = await requireUser("trainer");
  const values = {
    name: text(formData, "name"),
    description: text(formData, "description"),
    duration_weeks: text(formData, "duration_weeks"),
  };
  const parsed = readProgram(formData);
  if (!parsed.success) return { ...firstIssue(parsed.error), values };

  const program = await asUser(trainer.id, (db) =>
    db.insertInto("programs").values(parsed.data).returning("id").executeTakeFirstOrThrow(),
  );
  redirect(`/dashboard/programs/${program.id}`);
}

export async function updateProgram(programId: string, formData: FormData): Promise<Result> {
  const trainer = await requireUser("trainer");
  const parsed = readProgram(formData);
  if (!parsed.success) return firstIssue(parsed.error);

  await asUser(trainer.id, (db) =>
    db.updateTable("programs").set(parsed.data).where("id", "=", programId).execute(),
  );
  refresh();
  return {};
}

export async function deleteProgram(programId: string): Promise<Result> {
  const trainer = await requireUser("trainer");
  await asUser(trainer.id, (db) => db.deleteFrom("programs").where("id", "=", programId).execute());
  redirect("/dashboard/programs");
}

// Copies a program with all its workouts, for tailoring it to one client. All
// in one transaction, so a failure leaves no half-made copy.
export async function duplicateProgram(programId: string): Promise<Result> {
  const trainer = await requireUser("trainer");
  const copyId = await asUser(trainer.id, async (db) => {
    const program = await db
      .selectFrom("programs")
      .select(["name", "description", "duration_weeks"])
      .where("id", "=", programId)
      .executeTakeFirst();
    if (!program) return null;

    const copy = await db
      .insertInto("programs")
      .values({ ...program, name: `${program.name} (copy)`.slice(0, 100) })
      .returning("id")
      .executeTakeFirstOrThrow();

    const workouts = await db
      .selectFrom("program_workouts")
      .select(["id", "name", "position"])
      .where("program_id", "=", programId)
      .execute();
    for (const workout of workouts) {
      const newWorkout = await db
        .insertInto("program_workouts")
        .values({ program_id: copy.id, name: workout.name, position: workout.position })
        .returning("id")
        .executeTakeFirstOrThrow();
      const items = await db
        .selectFrom("workout_exercises")
        .select(["exercise_id", "position", "sets", "reps", "weight", "rest", "notes"])
        .where("workout_id", "=", workout.id)
        .execute();
      if (items.length > 0) {
        await db
          .insertInto("workout_exercises")
          .values(items.map((item) => ({ ...item, workout_id: newWorkout.id })))
          .execute();
      }
    }
    return copy.id;
  });
  if (!copyId) return { error: "That program doesn't exist anymore." };

  redirect(`/dashboard/programs/${copyId}`);
}

// Workouts

const workoutNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name for the workout.")
  .max(100, "Keep the name under 100 characters.");

export async function addWorkout(programId: string, formData: FormData): Promise<Result> {
  const trainer = await requireUser("trainer");
  const parsed = workoutNameSchema.safeParse(text(formData, "name"));
  if (!parsed.success) return firstIssue(parsed.error);

  await asUser(trainer.id, async (db) => {
    const last = await db
      .selectFrom("program_workouts")
      .select("position")
      .where("program_id", "=", programId)
      .orderBy("position", "desc")
      .limit(1)
      .executeTakeFirst();
    await db
      .insertInto("program_workouts")
      .values({ program_id: programId, name: parsed.data, position: (last?.position ?? -1) + 1 })
      .execute();
  });
  refresh();
  return {};
}

export async function renameWorkout(workoutId: string, formData: FormData): Promise<Result> {
  const trainer = await requireUser("trainer");
  const parsed = workoutNameSchema.safeParse(text(formData, "name"));
  if (!parsed.success) return firstIssue(parsed.error);

  await asUser(trainer.id, (db) =>
    db.updateTable("program_workouts").set({ name: parsed.data }).where("id", "=", workoutId).execute(),
  );
  refresh();
  return {};
}

export async function deleteWorkout(workoutId: string): Promise<Result> {
  const trainer = await requireUser("trainer");
  await asUser(trainer.id, (db) =>
    db.deleteFrom("program_workouts").where("id", "=", workoutId).execute(),
  );
  refresh();
  return {};
}

// Swaps an item with its neighbour, then renumbers the list from 0.
function reorder<T extends { id: string }>(items: T[], id: string, direction: "up" | "down") {
  const index = items.findIndex((item) => item.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= items.length) return null;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((item, position) => ({ id: item.id, position }));
}

export async function moveWorkout(workoutId: string, direction: "up" | "down"): Promise<Result> {
  const trainer = await requireUser("trainer");
  const moved = await asUser(trainer.id, async (db) => {
    const workout = await db
      .selectFrom("program_workouts")
      .select("program_id")
      .where("id", "=", workoutId)
      .executeTakeFirst();
    if (!workout) return false;

    const siblings = await db
      .selectFrom("program_workouts")
      .select("id")
      .where("program_id", "=", workout.program_id)
      .orderBy("position")
      .orderBy("created_at")
      .execute();
    for (const { id, position } of reorder(siblings, workoutId, direction) ?? []) {
      await db.updateTable("program_workouts").set({ position }).where("id", "=", id).execute();
    }
    return true;
  });
  if (!moved) return { error: "That workout doesn't exist anymore." };
  refresh();
  return {};
}

// Exercises in a workout

const workoutExerciseSchema = z.object({
  sets: emptyToNull(
    z.coerce
      .number({ error: "Enter the number of sets." })
      .int("Enter a whole number of sets.")
      .min(1, "Enter at least 1 set.")
      .max(50, "Enter at most 50 sets."),
  ),
  reps: z.string().trim().max(30, "Keep reps under 30 characters."),
  weight: z.string().trim().max(30, "Keep weight under 30 characters."),
  rest: z.string().trim().max(30, "Keep rest under 30 characters."),
  notes: z.string().trim().max(500, "Keep notes under 500 characters."),
});

function readWorkoutExercise(formData: FormData) {
  return workoutExerciseSchema.safeParse({
    sets: text(formData, "sets").trim(),
    reps: text(formData, "reps"),
    weight: text(formData, "weight"),
    rest: text(formData, "rest"),
    notes: text(formData, "notes"),
  });
}

export async function addWorkoutExercise(workoutId: string, formData: FormData): Promise<Result> {
  const trainer = await requireUser("trainer");
  const exerciseId = z.uuid().safeParse(formData.get("exercise_id"));
  if (!exerciseId.success) return { error: "Choose an exercise." };
  const parsed = readWorkoutExercise(formData);
  if (!parsed.success) return firstIssue(parsed.error);

  await asUser(trainer.id, async (db) => {
    const last = await db
      .selectFrom("workout_exercises")
      .select("position")
      .where("workout_id", "=", workoutId)
      .orderBy("position", "desc")
      .limit(1)
      .executeTakeFirst();
    await db
      .insertInto("workout_exercises")
      .values({
        ...parsed.data,
        workout_id: workoutId,
        exercise_id: exerciseId.data,
        position: (last?.position ?? -1) + 1,
      })
      .execute();
  });
  refresh();
  return {};
}

export async function updateWorkoutExercise(itemId: string, formData: FormData): Promise<Result> {
  const trainer = await requireUser("trainer");
  const parsed = readWorkoutExercise(formData);
  if (!parsed.success) return firstIssue(parsed.error);

  await asUser(trainer.id, (db) =>
    db.updateTable("workout_exercises").set(parsed.data).where("id", "=", itemId).execute(),
  );
  refresh();
  return {};
}

export async function removeWorkoutExercise(itemId: string): Promise<Result> {
  const trainer = await requireUser("trainer");
  await asUser(trainer.id, (db) =>
    db.deleteFrom("workout_exercises").where("id", "=", itemId).execute(),
  );
  refresh();
  return {};
}

export async function moveWorkoutExercise(
  itemId: string,
  direction: "up" | "down",
): Promise<Result> {
  const trainer = await requireUser("trainer");
  const moved = await asUser(trainer.id, async (db) => {
    const item = await db
      .selectFrom("workout_exercises")
      .select("workout_id")
      .where("id", "=", itemId)
      .executeTakeFirst();
    if (!item) return false;

    const siblings = await db
      .selectFrom("workout_exercises")
      .select("id")
      .where("workout_id", "=", item.workout_id)
      .orderBy("position")
      .orderBy("created_at")
      .execute();
    for (const { id, position } of reorder(siblings, itemId, direction) ?? []) {
      await db.updateTable("workout_exercises").set({ position }).where("id", "=", id).execute();
    }
    return true;
  });
  if (!moved) return { error: "That exercise isn't in the workout anymore." };
  refresh();
  return {};
}

// Sharing programs with clients

const shareSchema = z.object({
  program_id: z.uuid({ error: "Choose a program." }),
  client_id: z.uuid({ error: "Choose a client." }),
});

export async function shareProgram(formData: FormData): Promise<Result> {
  const trainer = await requireUser("trainer");
  const parsed = shareSchema.safeParse({
    program_id: formData.get("program_id"),
    client_id: formData.get("client_id"),
  });
  if (!parsed.success) return firstIssue(parsed.error);

  try {
    await asUser(trainer.id, (db) => db.insertInto("client_programs").values(parsed.data).execute());
  } catch (error) {
    if (errorCode(error) === "23505") return { error: "This program is already shared with that client." };
    throw error;
  }
  refresh();
  return {};
}

export async function unshareProgram(programId: string, clientId: string): Promise<Result> {
  const trainer = await requireUser("trainer");
  await asUser(trainer.id, (db) =>
    db
      .deleteFrom("client_programs")
      .where("program_id", "=", programId)
      .where("client_id", "=", clientId)
      .execute(),
  );
  refresh();
  return {};
}
