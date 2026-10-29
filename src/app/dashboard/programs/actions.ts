"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import starterExercises from "@/lib/starter-exercises.json";
import { createClient } from "@/lib/supabase/server";

// Every action checks the signed-in trainer itself: server actions can be
// called directly, not only from our forms. Row level security makes sure a
// trainer can only touch their own exercises, programs and clients.

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

function exerciseError(error: { code?: string; message: string }): Result {
  return {
    error: error.code === "23505" ? "You already have an exercise with that name." : error.message,
  };
}

export async function createExercise(formData: FormData): Promise<Result> {
  await requireUser("trainer");
  const parsed = readExercise(formData);
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("exercises").insert(parsed.data);
  if (error) return exerciseError(error);
  refresh();
  return {};
}

export async function updateExercise(exerciseId: string, formData: FormData): Promise<Result> {
  await requireUser("trainer");
  const parsed = readExercise(formData);
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("exercises").update(parsed.data).eq("id", exerciseId);
  if (error) return exerciseError(error);
  refresh();
  return {};
}

export async function deleteExercise(exerciseId: string): Promise<Result> {
  await requireUser("trainer");
  const supabase = await createClient();
  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
  if (error) {
    return {
      error:
        error.code === "23503"
          ? "This exercise is used in a program. Remove it from those workouts first."
          : error.message,
    };
  }
  refresh();
  return {};
}

// Adds the starter exercises the trainer doesn't have yet.
export async function addStarterExercises(): Promise<Result> {
  await requireUser("trainer");
  const supabase = await createClient();
  const { data: existing, error: listError } = await supabase.from("exercises").select("name");
  if (listError) return { error: listError.message };

  const taken = new Set(existing.map(({ name }) => name.toLowerCase()));
  const missing = starterExercises.filter(({ name }) => !taken.has(name.toLowerCase()));
  if (missing.length > 0) {
    const { error } = await supabase.from("exercises").insert(missing);
    if (error) return { error: error.message };
  }
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
  await requireUser("trainer");
  const values = {
    name: text(formData, "name"),
    description: text(formData, "description"),
    duration_weeks: text(formData, "duration_weeks"),
  };
  const parsed = readProgram(formData);
  if (!parsed.success) return { ...firstIssue(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("programs").insert(parsed.data).select("id").single();
  if (error) return { error: error.message, values };

  redirect(`/dashboard/programs/${data.id}`);
}

export async function updateProgram(programId: string, formData: FormData): Promise<Result> {
  await requireUser("trainer");
  const parsed = readProgram(formData);
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("programs").update(parsed.data).eq("id", programId);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteProgram(programId: string): Promise<Result> {
  await requireUser("trainer");
  const supabase = await createClient();
  const { error } = await supabase.from("programs").delete().eq("id", programId);
  if (error) return { error: error.message };
  redirect("/dashboard/programs");
}

// Copies a program with all its workouts, for tailoring it to one client.
export async function duplicateProgram(programId: string): Promise<Result> {
  await requireUser("trainer");
  const supabase = await createClient();
  const { data: program, error } = await supabase
    .from("programs")
    .select(
      "name, description, duration_weeks, program_workouts ( name, position, workout_exercises ( exercise_id, position, sets, reps, weight, rest, notes ) )",
    )
    .eq("id", programId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!program) return { error: "That program doesn't exist anymore." };

  const { data: copy, error: copyError } = await supabase
    .from("programs")
    .insert({
      name: `${program.name} (copy)`.slice(0, 100),
      description: program.description,
      duration_weeks: program.duration_weeks,
    })
    .select("id")
    .single();
  if (copyError) return { error: copyError.message };

  for (const workout of program.program_workouts) {
    const { data: newWorkout, error: workoutError } = await supabase
      .from("program_workouts")
      .insert({ program_id: copy.id, name: workout.name, position: workout.position })
      .select("id")
      .single();
    if (workoutError) return { error: workoutError.message };

    if (workout.workout_exercises.length > 0) {
      const { error: exercisesError } = await supabase
        .from("workout_exercises")
        .insert(workout.workout_exercises.map((item) => ({ ...item, workout_id: newWorkout.id })));
      if (exercisesError) return { error: exercisesError.message };
    }
  }

  redirect(`/dashboard/programs/${copy.id}`);
}

// Workouts

const workoutNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name for the workout.")
  .max(100, "Keep the name under 100 characters.");

export async function addWorkout(programId: string, formData: FormData): Promise<Result> {
  await requireUser("trainer");
  const parsed = workoutNameSchema.safeParse(text(formData, "name"));
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("program_workouts")
    .select("position")
    .eq("program_id", programId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("program_workouts").insert({
    program_id: programId,
    name: parsed.data,
    position: (last?.position ?? -1) + 1,
  });
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function renameWorkout(workoutId: string, formData: FormData): Promise<Result> {
  await requireUser("trainer");
  const parsed = workoutNameSchema.safeParse(text(formData, "name"));
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("program_workouts")
    .update({ name: parsed.data })
    .eq("id", workoutId);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteWorkout(workoutId: string): Promise<Result> {
  await requireUser("trainer");
  const supabase = await createClient();
  const { error } = await supabase.from("program_workouts").delete().eq("id", workoutId);
  if (error) return { error: error.message };
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
  await requireUser("trainer");
  const supabase = await createClient();
  const { data: workout } = await supabase
    .from("program_workouts")
    .select("program_id")
    .eq("id", workoutId)
    .maybeSingle();
  if (!workout) return { error: "That workout doesn't exist anymore." };

  const { data: siblings, error } = await supabase
    .from("program_workouts")
    .select("id")
    .eq("program_id", workout.program_id)
    .order("position")
    .order("created_at");
  if (error) return { error: error.message };

  for (const { id, position } of reorder(siblings, workoutId, direction) ?? []) {
    const { error: updateError } = await supabase
      .from("program_workouts")
      .update({ position })
      .eq("id", id);
    if (updateError) return { error: updateError.message };
  }
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
  await requireUser("trainer");
  const exerciseId = z.uuid().safeParse(formData.get("exercise_id"));
  if (!exerciseId.success) return { error: "Choose an exercise." };
  const parsed = readWorkoutExercise(formData);
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("workout_exercises")
    .select("position")
    .eq("workout_id", workoutId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("workout_exercises").insert({
    ...parsed.data,
    workout_id: workoutId,
    exercise_id: exerciseId.data,
    position: (last?.position ?? -1) + 1,
  });
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function updateWorkoutExercise(itemId: string, formData: FormData): Promise<Result> {
  await requireUser("trainer");
  const parsed = readWorkoutExercise(formData);
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("workout_exercises").update(parsed.data).eq("id", itemId);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function removeWorkoutExercise(itemId: string): Promise<Result> {
  await requireUser("trainer");
  const supabase = await createClient();
  const { error } = await supabase.from("workout_exercises").delete().eq("id", itemId);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function moveWorkoutExercise(
  itemId: string,
  direction: "up" | "down",
): Promise<Result> {
  await requireUser("trainer");
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("workout_exercises")
    .select("workout_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { error: "That exercise isn't in the workout anymore." };

  const { data: siblings, error } = await supabase
    .from("workout_exercises")
    .select("id")
    .eq("workout_id", item.workout_id)
    .order("position")
    .order("created_at");
  if (error) return { error: error.message };

  for (const { id, position } of reorder(siblings, itemId, direction) ?? []) {
    const { error: updateError } = await supabase
      .from("workout_exercises")
      .update({ position })
      .eq("id", id);
    if (updateError) return { error: updateError.message };
  }
  refresh();
  return {};
}

// Sharing programs with clients

const shareSchema = z.object({
  program_id: z.uuid({ error: "Choose a program." }),
  client_id: z.uuid({ error: "Choose a client." }),
});

export async function shareProgram(formData: FormData): Promise<Result> {
  await requireUser("trainer");
  const parsed = shareSchema.safeParse({
    program_id: formData.get("program_id"),
    client_id: formData.get("client_id"),
  });
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("client_programs").insert(parsed.data);
  if (error) {
    return {
      error: error.code === "23505" ? "This program is already shared with that client." : error.message,
    };
  }
  refresh();
  return {};
}

export async function unshareProgram(programId: string, clientId: string): Promise<Result> {
  await requireUser("trainer");
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_programs")
    .delete()
    .eq("program_id", programId)
    .eq("client_id", clientId);
  if (error) return { error: error.message };
  refresh();
  return {};
}
