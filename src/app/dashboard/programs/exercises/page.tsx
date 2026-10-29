import type { Metadata } from "next";
import { Suspense } from "react";
import { DumbbellIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader } from "@/components/page-header";
import { listExercises } from "@/lib/programs";
import starterExercises from "@/lib/starter-exercises.json";
import { addStarterExercises, createExercise } from "../actions";
import { ProgramsTabs } from "../programs-tabs";
import { ExerciseFields } from "./exercise-fields";
import { ExerciseList } from "./exercise-list";

export const metadata: Metadata = { title: "Exercise library" };

export default function ExercisesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Exercise library"
        description="The exercises you build programs from."
      />
      <ProgramsTabs active="/dashboard/programs/exercises" />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <Library />
      </Suspense>
    </div>
  );
}

async function Library() {
  const exercises = await listExercises();
  const categories = [
    ...new Set([...exercises, ...starterExercises].map(({ category }) => category).filter(Boolean)),
  ].sort();

  const addButton = (
    <FormDialog
      action={createExercise}
      title="Add exercise"
      submitLabel="Add exercise"
      triggerVariant={exercises.length === 0 ? "outline" : "default"}
      trigger={
        <>
          <PlusIcon />
          Add exercise
        </>
      }
    >
      <ExerciseFields categories={categories} />
    </FormDialog>
  );

  if (exercises.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <DumbbellIcon className="size-8 text-muted-foreground" />
        <p className="font-medium">Your exercise library is empty.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Start with {starterExercises.length} common exercises you can edit, or add your own.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <ActionButton action={addStarterExercises} variant="default" pendingLabel="Adding…">
            <SparklesIcon />
            Add starter exercises
          </ActionButton>
          {addButton}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
        </p>
        {addButton}
      </div>
      <ExerciseList exercises={exercises} categories={categories} />
    </div>
  );
}
