import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeftIcon,
  CopyIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { ConfirmAction } from "@/components/confirm-action";
import { FormDialog } from "@/components/form-dialog";
import { FormField } from "@/components/form-field";
import { PageHeaderSkeleton } from "@/components/page-header";
import { ShareForm } from "@/components/share-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listClients } from "@/lib/clients";
import { getProgram, getProgramClients, listExercises } from "@/lib/programs";
import {
  addWorkout,
  deleteProgram,
  duplicateProgram,
  shareProgram,
  unshareProgram,
  updateProgram,
} from "../actions";
import { ProgramFields } from "../program-fields";
import { WorkoutCard } from "./workout-card";

export const metadata: Metadata = { title: "Program" };

export default function ProgramPage({ params }: PageProps<"/dashboard/programs/[programId]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/programs"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Programs
      </Link>
      <Suspense fallback={<PageHeaderSkeleton />}>
        {params.then(({ programId }) => (
          <ProgramBuilder programId={programId} />
        ))}
      </Suspense>
    </div>
  );
}

async function ProgramBuilder({ programId }: { programId: string }) {
  const [program, library] = await Promise.all([getProgram(programId), listExercises()]);
  if (!program) notFound();

  const workouts = program.program_workouts;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{program.name}</h1>
          {program.duration_weeks && (
            <Badge variant="secondary">
              {program.duration_weeks} {program.duration_weeks === 1 ? "week" : "weeks"}
            </Badge>
          )}
          {program.description && (
            <p className="text-sm whitespace-pre-line text-muted-foreground">{program.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <FormDialog
            action={updateProgram.bind(null, program.id)}
            title="Edit program details"
            submitLabel="Save changes"
            trigger={
              <>
                <PencilIcon />
                Edit
              </>
            }
          >
            <ProgramFields
              values={{
                name: program.name,
                description: program.description,
                duration_weeks: program.duration_weeks?.toString() ?? "",
              }}
            />
          </FormDialog>
          <ActionButton action={duplicateProgram.bind(null, program.id)} pendingLabel="Copying…">
            <CopyIcon />
            Duplicate
          </ActionButton>
          <ConfirmAction
            action={deleteProgram.bind(null, program.id)}
            title={`Delete ${program.name}?`}
            description="This deletes the program and its workouts, and removes it from any clients it's shared with. This can't be undone."
            confirmLabel="Delete program"
            pendingLabel="Deleting…"
          >
            <Trash2Icon />
            Delete
          </ConfirmAction>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {workouts.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
              No workouts yet. Add one for each training day, like &ldquo;Day 1: Upper body&rdquo;.
            </div>
          ) : (
            workouts.map((workout, index) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                library={library}
                isFirst={index === 0}
                isLast={index === workouts.length - 1}
              />
            ))
          )}
          <div>
            <FormDialog
              action={addWorkout.bind(null, program.id)}
              title="Add a workout"
              description="A workout is one training session, like a day of the week."
              submitLabel="Add workout"
              triggerVariant={workouts.length === 0 ? "default" : "outline"}
              trigger={
                <>
                  <PlusIcon />
                  Add workout
                </>
              }
            >
              <FormField id="workout-name" label="Name">
                <Input
                  id="workout-name"
                  name="name"
                  placeholder={`Day ${workouts.length + 1}`}
                  defaultValue={`Day ${workouts.length + 1}`}
                  maxLength={100}
                  required
                />
              </FormField>
            </FormDialog>
          </div>
        </div>

        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
          <SharedWithCard programId={program.id} />
        </Suspense>
      </div>
    </>
  );
}

async function SharedWithCard({ programId }: { programId: string }) {
  const [shared, clients] = await Promise.all([
    getProgramClients(programId),
    listClients({ status: "active" }),
  ]);
  const sharedIds = new Set(shared.map(({ client }) => client.id));
  const available = clients.filter((client) => !sharedIds.has(client.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shared with</CardTitle>
        <CardDescription>Clients see shared programs in their portal.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {shared.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not shared with anyone yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {shared.map(({ client }) => (
              <li key={client.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                >
                  {client.full_name}
                </Link>
                <ConfirmAction
                  action={unshareProgram.bind(null, programId, client.id)}
                  title={`Stop sharing with ${client.full_name}?`}
                  description="They won't see this program in their portal anymore."
                  confirmLabel="Stop sharing"
                  pendingLabel="Removing…"
                  triggerVariant="ghost"
                  triggerSize="icon-sm"
                  triggerLabel={`Stop sharing with ${client.full_name}`}
                >
                  <XIcon />
                </ConfirmAction>
              </li>
            ))}
          </ul>
        )}
        {available.length > 0 && (
          <ShareForm
            action={shareProgram}
            fixed={{ name: "program_id", value: programId }}
            select={{ name: "client_id", label: "Client to share with" }}
            options={available.map((client) => ({ value: client.id, label: client.full_name }))}
            placeholder="Choose a client"
            submitLabel="Share"
          />
        )}
      </CardContent>
    </Card>
  );
}
