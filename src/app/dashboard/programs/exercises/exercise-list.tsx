"use client";

import { PencilIcon, PlayCircleIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { FormDialog } from "@/components/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { deleteExercise, updateExercise } from "../actions";
import { ExerciseFields, type ExerciseValues } from "./exercise-fields";

type LibraryExercise = ExerciseValues & { id: string; usedCount: number };

export function ExerciseList({
  exercises,
  categories,
}: {
  exercises: LibraryExercise[];
  categories: string[];
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const matches = exercises.filter(
    (exercise) =>
      !term ||
      exercise.name.toLowerCase().includes(term) ||
      exercise.category.toLowerCase().includes(term),
  );

  const groups = new Map<string, LibraryExercise[]>();
  for (const exercise of matches) {
    const category = exercise.category || "Other";
    groups.set(category, [...(groups.get(category) ?? []), exercise]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative sm:w-72">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search exercises"
          aria-label="Search exercises"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-8"
        />
      </div>

      {matches.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No exercises match your search.</p>
      )}

      {[...groups].map(([category, items]) => (
        <section key={category} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">{category}</h2>
          <ul className="divide-y rounded-xl border">
            {items.map((exercise) => (
              <li key={exercise.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    {exercise.name}
                    {exercise.video_url && (
                      <a
                        href={exercise.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Watch a video of ${exercise.name}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <PlayCircleIcon className="size-4" />
                      </a>
                    )}
                  </span>
                  {exercise.instructions && (
                    <span className="line-clamp-1 text-sm text-muted-foreground">
                      {exercise.instructions}
                    </span>
                  )}
                </div>
                {exercise.usedCount > 0 && (
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    In {exercise.usedCount} {exercise.usedCount === 1 ? "workout" : "workouts"}
                  </Badge>
                )}
                <div className="flex shrink-0 gap-1">
                  <FormDialog
                    action={updateExercise.bind(null, exercise.id)}
                    title={`Edit ${exercise.name}`}
                    submitLabel="Save changes"
                    triggerVariant="ghost"
                    triggerSize="icon-sm"
                    triggerLabel={`Edit ${exercise.name}`}
                    trigger={<PencilIcon />}
                  >
                    <ExerciseFields values={exercise} categories={categories} />
                  </FormDialog>
                  {exercise.usedCount === 0 && (
                    <ConfirmAction
                      action={deleteExercise.bind(null, exercise.id)}
                      title={`Delete ${exercise.name}?`}
                      description="It will be removed from your exercise library."
                      confirmLabel="Delete exercise"
                      pendingLabel="Deleting…"
                      triggerVariant="ghost"
                      triggerSize="icon-sm"
                      triggerLabel={`Delete ${exercise.name}`}
                    >
                      <Trash2Icon />
                    </ConfirmAction>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
