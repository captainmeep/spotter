import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRightIcon, ClipboardListIcon, PlusIcon } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { listPrograms } from "@/lib/programs";
import { ProgramsTabs } from "./programs-tabs";

export const metadata: Metadata = { title: "Programs" };

export default function ProgramsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Programs"
          description="Build a program once and share it with any of your clients."
        />
        <ButtonLink href="/dashboard/programs/new">
          <PlusIcon />
          New program
        </ButtonLink>
      </div>
      <ProgramsTabs active="/dashboard/programs" />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <ProgramList />
      </Suspense>
    </div>
  );
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

async function ProgramList() {
  const programs = await listPrograms();

  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <ClipboardListIcon className="size-8 text-muted-foreground" />
        <p className="font-medium">No programs yet.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create a program, add workouts from your exercise library, then share it with clients.
        </p>
        <ButtonLink href="/dashboard/programs/new" variant="outline">
          <PlusIcon />
          Create your first program
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-xl border">
      {programs.map((program) => (
        <li key={program.id}>
          <Link
            href={`/dashboard/programs/${program.id}`}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-medium">{program.name}</span>
              <span className="truncate text-sm text-muted-foreground">
                {[
                  plural(program.workoutCount, "workout"),
                  program.duration_weeks && plural(program.duration_weeks, "week"),
                  program.clientCount > 0
                    ? `shared with ${plural(program.clientCount, "client")}`
                    : "not shared yet",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
