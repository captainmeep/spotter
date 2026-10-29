import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PageHeaderSkeleton } from "@/components/page-header";
import { getClient } from "@/lib/clients";
import { updateClientRecord } from "../../actions";
import { ClientForm } from "../../client-form";

export const metadata: Metadata = { title: "Edit client" };

export default function EditClientPage({
  params,
}: PageProps<"/dashboard/clients/[clientId]/edit">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<PageHeaderSkeleton />}>
        {params.then(({ clientId }) => (
          <EditClient clientId={clientId} />
        ))}
      </Suspense>
    </div>
  );
}

async function EditClient({ clientId }: { clientId: string }) {
  const client = await getClient(clientId);
  if (!client) notFound();

  return (
    <>
      <PageHeader title={`Edit ${client.full_name}`} />
      <ClientForm
        action={updateClientRecord.bind(null, client.id)}
        initialValues={{
          full_name: client.full_name,
          email: client.email ?? "",
          phone: client.phone ?? "",
          goals: client.goals,
          status: client.status,
        }}
        submitLabel="Save changes"
        cancelHref={`/dashboard/clients/${client.id}`}
      />
    </>
  );
}
