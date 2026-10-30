import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import type { Role } from "@/lib/routes";
import { NameForm, PasswordForm } from "./account-forms";

// The account settings page, shared by the trainer dashboard and client portal.
export function AccountPage({ role }: { role: Role }) {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader title="Account settings" />
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
        <AccountName role={role} />
      </Suspense>
      <PasswordForm />
    </div>
  );
}

async function AccountName({ role }: { role: Role }) {
  const user = await requireUser(role);
  return (
    <>
      <p className="-mt-4 text-sm text-muted-foreground">Logged in as {user.email}</p>
      <NameForm fullName={user.fullName} />
    </>
  );
}
