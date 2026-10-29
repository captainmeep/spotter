import "server-only";
import { z } from "zod";
import type { Database } from "@/lib/database.types";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

const uuid = z.uuid();

// The columns of a program with its workouts and their exercises, in order.
const programDetail = `
  id, name, description, duration_weeks,
  program_workouts (
    id, name, position,
    workout_exercises (
      id, position, sets, reps, weight, rest, notes,
      exercise:exercises ( id, name, category, instructions, video_url )
    )
  )
` as const;

function sortProgram<
  T extends {
    program_workouts: { position: number; workout_exercises: { position: number }[] }[];
  },
>(program: T): T {
  program.program_workouts.sort((a, b) => a.position - b.position);
  for (const workout of program.program_workouts) {
    workout.workout_exercises.sort((a, b) => a.position - b.position);
  }
  return program;
}

// Every function checks the signed-in user itself. Row level security is the
// second line of defense.

export async function listExercises() {
  await requireUser("trainer");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, category, instructions, video_url, workout_exercises(count)")
    .order("category")
    .order("name");
  if (error) throw error;
  return data.map(({ workout_exercises, ...exercise }) => ({
    ...exercise,
    usedCount: workout_exercises[0]?.count ?? 0,
  }));
}

export async function listPrograms() {
  await requireUser("trainer");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select("id, name, description, duration_weeks, program_workouts(count), client_programs(count)")
    .order("name");
  if (error) throw error;
  return data.map(({ program_workouts, client_programs, ...program }) => ({
    ...program,
    workoutCount: program_workouts[0]?.count ?? 0,
    clientCount: client_programs[0]?.count ?? 0,
  }));
}

export async function countPrograms() {
  await requireUser("trainer");
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("programs")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getProgram(id: string) {
  await requireUser("trainer");
  if (!uuid.safeParse(id).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select(programDetail)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data && sortProgram(data);
}

export type ProgramDetail = NonNullable<Awaited<ReturnType<typeof getProgram>>>;
export type Workout = ProgramDetail["program_workouts"][number];
export type WorkoutExercise = Workout["workout_exercises"][number];

// The clients a program is shared with.
export async function getProgramClients(programId: string) {
  await requireUser("trainer");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_programs")
    .select("assigned_at, client:clients ( id, full_name, status )")
    .eq("program_id", programId)
    .order("assigned_at");
  if (error) throw error;
  return data;
}

// The programs shared with one of the trainer's clients.
export async function getClientPrograms(clientId: string) {
  await requireUser("trainer");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_programs")
    .select("assigned_at, program:programs ( id, name, duration_weeks )")
    .eq("client_id", clientId)
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return data;
}

// For the client portal: the programs shared with the signed-in client,
// newest first, with their workouts and exercises.
export async function getMyPrograms() {
  await requireUser("client");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_programs")
    .select(`assigned_at, program:programs ( ${programDetail} )`)
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return data.map(({ assigned_at, program }) => ({
    assignedAt: assigned_at,
    program: sortProgram(program),
  }));
}

export function formatPrescription(item: {
  sets: number | null;
  reps: string;
  weight: string;
  rest: string;
}) {
  const volume = [item.sets, item.reps].filter(Boolean).join(" × ");
  return [volume, item.weight, item.rest && `rest ${item.rest}`].filter(Boolean).join(" · ");
}
