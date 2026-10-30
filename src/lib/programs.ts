import "server-only";
import { type ExpressionBuilder, type Selectable } from "kysely";
import { jsonArrayFrom, jsonBuildObject } from "kysely/helpers/postgres";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { asUser, type DB } from "@/lib/db";
import type { Exercises } from "@/lib/db/types";

export type Exercise = Selectable<Exercises>;

const uuid = z.uuid();

// A program's workouts and their exercises, in order, as nested JSON.
function workoutsOf(eb: ExpressionBuilder<DB, "programs">) {
  return jsonArrayFrom(
    eb
      .selectFrom("program_workouts as w")
      .select((workout) => [
        "w.id",
        "w.name",
        "w.position",
        jsonArrayFrom(
          workout
            .selectFrom("workout_exercises as we")
            .innerJoin("exercises as e", "e.id", "we.exercise_id")
            .select((item) => [
              "we.id",
              "we.position",
              "we.sets",
              "we.reps",
              "we.weight",
              "we.rest",
              "we.notes",
              jsonBuildObject({
                id: item.ref("e.id"),
                name: item.ref("e.name"),
                category: item.ref("e.category"),
                instructions: item.ref("e.instructions"),
                video_url: item.ref("e.video_url"),
              }).as("exercise"),
            ])
            .whereRef("we.workout_id", "=", "w.id")
            .orderBy("we.position")
            .orderBy("we.created_at"),
        ).as("workout_exercises"),
      ])
      .whereRef("w.program_id", "=", "programs.id")
      .orderBy("w.position")
      .orderBy("w.created_at"),
  ).as("program_workouts");
}

// Every function checks the signed-in user itself, then queries with
// asUser(), so row level security is the second line of defense.

export async function listExercises() {
  const trainer = await requireUser("trainer");
  const rows = await asUser(trainer.id, (db) =>
    db
      .selectFrom("exercises")
      .select((eb) => [
        "id",
        "name",
        "category",
        "instructions",
        "video_url",
        eb
          .selectFrom("workout_exercises")
          .select((sub) => sub.fn.countAll<string>().as("count"))
          .whereRef("workout_exercises.exercise_id", "=", "exercises.id")
          .as("used_count"),
      ])
      .orderBy("category")
      .orderBy("name")
      .execute(),
  );
  return rows.map(({ used_count, ...exercise }) => ({ ...exercise, usedCount: Number(used_count ?? 0) }));
}

export async function listPrograms() {
  const trainer = await requireUser("trainer");
  const rows = await asUser(trainer.id, (db) =>
    db
      .selectFrom("programs")
      .select((eb) => [
        "id",
        "name",
        "description",
        "duration_weeks",
        eb
          .selectFrom("program_workouts")
          .select((sub) => sub.fn.countAll<string>().as("count"))
          .whereRef("program_workouts.program_id", "=", "programs.id")
          .as("workout_count"),
        eb
          .selectFrom("client_programs")
          .select((sub) => sub.fn.countAll<string>().as("count"))
          .whereRef("client_programs.program_id", "=", "programs.id")
          .as("client_count"),
      ])
      .orderBy("name")
      .execute(),
  );
  return rows.map(({ workout_count, client_count, ...program }) => ({
    ...program,
    workoutCount: Number(workout_count ?? 0),
    clientCount: Number(client_count ?? 0),
  }));
}

export async function countPrograms() {
  const trainer = await requireUser("trainer");
  const result = await asUser(trainer.id, (db) =>
    db
      .selectFrom("programs")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  );
  return Number(result.count);
}

export async function getProgram(id: string) {
  const trainer = await requireUser("trainer");
  if (!uuid.safeParse(id).success) return null;

  const program = await asUser(trainer.id, (db) =>
    db
      .selectFrom("programs")
      .select((eb) => ["id", "name", "description", "duration_weeks", workoutsOf(eb)])
      .where("id", "=", id)
      .executeTakeFirst(),
  );
  return program ?? null;
}

export type ProgramDetail = NonNullable<Awaited<ReturnType<typeof getProgram>>>;
export type Workout = ProgramDetail["program_workouts"][number];
export type WorkoutExercise = Workout["workout_exercises"][number];

// The clients a program is shared with.
export async function getProgramClients(programId: string) {
  const trainer = await requireUser("trainer");
  const rows = await asUser(trainer.id, (db) =>
    db
      .selectFrom("client_programs")
      .innerJoin("clients", "clients.id", "client_programs.client_id")
      .select(["client_programs.assigned_at", "clients.id", "clients.full_name", "clients.status"])
      .where("client_programs.program_id", "=", programId)
      .orderBy("client_programs.assigned_at")
      .execute(),
  );
  return rows.map(({ assigned_at, ...client }) => ({ assigned_at, client }));
}

// The programs shared with one of the trainer's clients.
export async function getClientPrograms(clientId: string) {
  const trainer = await requireUser("trainer");
  const rows = await asUser(trainer.id, (db) =>
    db
      .selectFrom("client_programs")
      .innerJoin("programs", "programs.id", "client_programs.program_id")
      .select(["client_programs.assigned_at", "programs.id", "programs.name", "programs.duration_weeks"])
      .where("client_programs.client_id", "=", clientId)
      .orderBy("client_programs.assigned_at", "desc")
      .execute(),
  );
  return rows.map(({ assigned_at, ...program }) => ({ assigned_at, program }));
}

// For the client portal: the programs shared with the signed-in client,
// newest first, with their workouts and exercises.
export async function getMyPrograms() {
  const user = await requireUser("client");
  const rows = await asUser(user.id, (db) =>
    db
      .selectFrom("client_programs")
      .innerJoin("programs", "programs.id", "client_programs.program_id")
      .select((eb) => [
        "client_programs.assigned_at",
        "programs.id",
        "programs.name",
        "programs.description",
        "programs.duration_weeks",
        workoutsOf(eb),
      ])
      .orderBy("client_programs.assigned_at", "desc")
      .execute(),
  );
  return rows.map(({ assigned_at, ...program }) => ({ assignedAt: assigned_at, program }));
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
