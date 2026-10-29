import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { createClientRecord } from "../actions";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Add client" };

export default function NewClientPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Add client"
        description="You can invite them to Spotter once they're added."
      />
      <ClientForm
        action={createClientRecord}
        submitLabel="Add client"
        cancelHref="/dashboard/clients"
      />
    </div>
  );
}
