import Link from "next/link";
import { PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { ConfirmAction } from "@/components/confirm-action";
import { FormDialog } from "@/components/form-dialog";
import { FormField } from "@/components/form-field";
import { MoveButtons } from "@/components/move-buttons";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrescription, type Workout } from "@/lib/programs";
import {
  addWorkoutExercise,
  deleteWorkout,
  moveWorkout,
  moveWorkoutExercise,
  removeWorkoutExercise,
  renameWorkout,
  updateWorkoutExercise,
} from "../actions";
import { WorkoutExerciseFields, type LibraryOption } from "./workout-exercise-fields";

export function WorkoutCard({
  workout,
  library,
  isFirst,
  isLast,
}: {
  workout: Workout;
  library: LibraryOption[];
  isFirst: boolean;
  isLast: boolean;
}) {
  const items = workout.workout_exercises;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{workout.name}</CardTitle>
        <CardAction className="flex gap-1">
          <MoveButtons
            action={moveWorkout.bind(null, workout.id)}
            label={workout.name}
            isFirst={isFirst}
            isLast={isLast}
          />
          <FormDialog
            action={renameWorkout.bind(null, workout.id)}
            title="Rename workout"
            submitLabel="Save"
            triggerVariant="ghost"
            triggerSize="icon-sm"
            triggerLabel={`Rename ${workout.name}`}
            trigger={<PencilIcon />}
          >
            <FormField id="workout-name" label="Name">
              <Input id="workout-name" name="name" defaultValue={workout.name} maxLength={100} required />
            </FormField>
          </FormDialog>
          <ConfirmAction
            action={deleteWorkout.bind(null, workout.id)}
            title={`Delete ${workout.name}?`}
            description="This removes the workout and its exercises from the program."
            confirmLabel="Delete workout"
            pendingLabel="Deleting…"
            triggerVariant="ghost"
            triggerSize="icon-sm"
            triggerLabel={`Delete ${workout.name}`}
          >
            <Trash2Icon />
          </ConfirmAction>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exercises yet.</p>
        ) : (
          <ol className="flex flex-col divide-y">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <span className="w-5 shrink-0 pt-0.5 text-right text-sm text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{item.exercise.name}</span>
                    {formatPrescription(item) && (
                      <span className="text-sm">{formatPrescription(item)}</span>
                    )}
                    {item.notes && (
                      <span className="text-sm text-muted-foreground">{item.notes}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1 pl-8 sm:pl-0">
                  <MoveButtons
                    action={moveWorkoutExercise.bind(null, item.id)}
                    label={item.exercise.name}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                  />
                  <FormDialog
                    action={updateWorkoutExercise.bind(null, item.id)}
                    title={`Edit ${item.exercise.name}`}
                    submitLabel="Save changes"
                    triggerVariant="ghost"
                    triggerSize="icon-sm"
                    triggerLabel={`Edit ${item.exercise.name}`}
                    trigger={<PencilIcon />}
                  >
                    <WorkoutExerciseFields values={item} />
                  </FormDialog>
                  <ConfirmAction
                    action={removeWorkoutExercise.bind(null, item.id)}
                    title={`Remove ${item.exercise.name}?`}
                    description={`It will be removed from ${workout.name}.`}
                    confirmLabel="Remove"
                    pendingLabel="Removing…"
                    triggerVariant="ghost"
                    triggerSize="icon-sm"
                    triggerLabel={`Remove ${item.exercise.name}`}
                  >
                    <XIcon />
                  </ConfirmAction>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div>
          {library.length > 0 ? (
            <FormDialog
              action={addWorkoutExercise.bind(null, workout.id)}
              title={`Add an exercise to ${workout.name}`}
              submitLabel="Add exercise"
              triggerSize="sm"
              trigger={
                <>
                  <PlusIcon />
                  Add exercise
                </>
              }
            >
              <WorkoutExerciseFields library={library} />
            </FormDialog>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add exercises to your{" "}
              <Link href="/dashboard/programs/exercises" className="underline underline-offset-4">
                exercise library
              </Link>{" "}
              first.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
