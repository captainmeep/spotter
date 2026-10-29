import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeftIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  Trash2Icon,
} from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { ConfirmAction } from "@/components/confirm-action";
import { FormattedDate } from "@/components/formatted-date";
import { PageHeaderSkeleton } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClient, getClientNotes, type Client } from "@/lib/clients";
import { deleteClientRecord, deleteNote } from "../actions";
import { PortalBadge, StatusBadge } from "../client-badges";
import { InviteButton } from "./invite-button";
import { NoteForm } from "./note-form";

export const metadata: Metadata = { title: "Client" };

export default function ClientPage({
  params,
}: PageProps<"/dashboard/clients/[clientId]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/clients"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Clients
      </Link>
      <Suspense fallback={<PageHeaderSkeleton />}>
        {params.then(({ clientId }) => (
          <ClientDetail clientId={clientId} />
        ))}
      </Suspense>
    </div>
  );
}

async function ClientDetail({ clientId }: { clientId: string }) {
  const client = await getClient(clientId);
  if (!client) notFound();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{client.full_name}</h1>
          <div className="flex gap-2">
            <StatusBadge status={client.status} />
            <PortalBadge hasLogin={Boolean(client.user_id)} />
          </div>
        </div>
        <div className="flex gap-2">
          <ButtonLink
            href={`/dashboard/clients/${client.id}/edit`} variant="outline"
          >
            <PencilIcon />
            Edit
          </ButtonLink>
          <ConfirmAction
            action={deleteClientRecord.bind(null, client.id)}
            title={`Delete ${client.full_name}?`}
            description={
              client.user_id
                ? "This deletes their record and notes, and removes their Spotter login. This can't be undone."
                : "This deletes their record and notes. This can't be undone."
            }
            confirmLabel="Delete client"
            pendingLabel="Deleting…"
          >
            <Trash2Icon />
            Delete
          </ConfirmAction>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <ContactCard client={client} />
          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
            </CardHeader>
            <CardContent>
              {client.goals ? (
                <p className="text-sm whitespace-pre-line">{client.goals}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No goals yet.</p>
              )}
            </CardContent>
          </Card>
          <PortalAccessCard client={client} />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Only you can see these.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <NoteForm clientId={client.id} />
            <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-muted" />}>
              <NotesList clientId={client.id} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ContactCard({ client }: { client: Client }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {client.email || client.phone ? (
          <>
            {client.email && (
              <a href={`mailto:${client.email}`} className="flex items-center gap-2 hover:underline">
                <MailIcon className="size-4 text-muted-foreground" />
                <span className="truncate">{client.email}</span>
              </a>
            )}
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-2 hover:underline">
                <PhoneIcon className="size-4 text-muted-foreground" />
                {client.phone}
              </a>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">No contact details yet.</p>
        )}
        <p className="text-muted-foreground">
          Client since <FormattedDate date={client.created_at} />
        </p>
      </CardContent>
    </Card>
  );
}

function PortalAccessCard({ client }: { client: Client }) {
  const firstName = client.full_name.split(" ")[0];
  const invited = Boolean(client.user_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spotter login</CardTitle>
        <CardDescription>
          {invited && client.invited_at ? (
            <>
              Invited <FormattedDate date={client.invited_at} />. If {firstName} lost the
              link or it expired, create a new one.
            </>
          ) : (
            `${firstName} can't log in yet. Invite them to see their goals, and soon their program and sessions.`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invited || client.email ? (
          <InviteButton clientId={client.id} clientName={client.full_name} invited={invited} />
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href={`/dashboard/clients/${client.id}/edit`} className="underline underline-offset-4">
              Add an email address
            </Link>{" "}
            to invite them.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

async function NotesList({ clientId }: { clientId: string }) {
  const notes = await getClientNotes(clientId);

  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground">No notes yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y">
      {notes.map((note) => (
        <li key={note.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-xs text-muted-foreground">
              <FormattedDate date={note.created_at} withTime />
            </p>
            <p className="text-sm break-words whitespace-pre-line">{note.body}</p>
          </div>
          <ConfirmAction
            action={deleteNote.bind(null, note.id)}
            title="Delete this note?"
            description="This can't be undone."
            confirmLabel="Delete note"
            pendingLabel="Deleting…"
            triggerVariant="ghost"
            triggerSize="icon-sm"
            triggerLabel="Delete note"
          >
            <Trash2Icon />
          </ConfirmAction>
        </li>
      ))}
    </ul>
  );
}
