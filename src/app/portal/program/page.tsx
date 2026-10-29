import type { Metadata } from "next";
import { Suspense } from "react";
import { ClipboardListIcon, PlayCircleIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrescription, getMyPrograms } from "@/lib/programs";

export const metadata: Metadata = { title: "My program" };

export default function MyProgramPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My program" description="Your workouts from your trainer." />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <Programs />
      </Suspense>
    </div>
  );
}

async function Programs() {
  const programs = await getMyPrograms();

  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <ClipboardListIcon className="size-8 text-muted-foreground" />
        <p className="font-medium">No program yet.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your trainer will share your training program here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {programs.map(({ program }) => (
        <section key={program.id} className="flex flex-col gap-4" aria-labelledby={`program-${program.id}`}>
          <div className="flex flex-col gap-2">
            <h2 id={`program-${program.id}`} className="text-xl font-semibold tracking-tight">
              {program.name}
            </h2>
            {program.duration_weeks && (
              <Badge variant="secondary">
                {program.duration_weeks} {program.duration_weeks === 1 ? "week" : "weeks"}
              </Badge>
            )}
            {program.description && (
              <p className="max-w-2xl text-sm whitespace-pre-line text-muted-foreground">
                {program.description}
              </p>
            )}
          </div>

          {program.program_workouts.length === 0 && (
            <p className="text-sm text-muted-foreground">Your trainer is still adding workouts.</p>
          )}

          {program.program_workouts.map((workout) => (
            <Card key={workout.id}>
              <CardHeader>
                <CardTitle>{workout.name}</CardTitle>
                <CardDescription>
                  {workout.workout_exercises.length}{" "}
                  {workout.workout_exercises.length === 1 ? "exercise" : "exercises"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="flex flex-col divide-y">
                  {workout.workout_exercises.map((item, index) => (
                    <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="w-5 shrink-0 pt-0.5 text-right text-sm text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="font-medium">{item.exercise.name}</span>
                        {formatPrescription(item) && (
                          <span className="text-sm">{formatPrescription(item)}</span>
                        )}
                        {item.notes && (
                          <span className="text-sm text-muted-foreground">{item.notes}</span>
                        )}
                        {(item.exercise.instructions || item.exercise.video_url) && (
                          <details className="text-sm">
                            <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">
                              How to do it
                            </summary>
                            <div className="mt-2 flex flex-col gap-2">
                              {item.exercise.instructions && <p>{item.exercise.instructions}</p>}
                              {item.exercise.video_url && (
                                <a
                                  href={item.exercise.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex w-fit items-center gap-1 underline underline-offset-4"
                                >
                                  <PlayCircleIcon className="size-4" />
                                  Watch a video
                                </a>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
