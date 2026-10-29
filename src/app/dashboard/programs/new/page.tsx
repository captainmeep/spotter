import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { NewProgramForm } from "./new-program-form";

export const metadata: Metadata = { title: "New program" };

export default function NewProgramPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New program"
        description="Next you'll add workouts and exercises."
      />
      <NewProgramForm />
    </div>
  );
}
