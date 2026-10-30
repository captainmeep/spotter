import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { findValidInvite } from "@/lib/users";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Welcome" };

// Where invite links land: the person chooses a password and is logged in.
export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <Suspense fallback={<Card><CardHeader className="h-48 animate-pulse" /></Card>}>
      {params.then(({ token }) => (
        <Invite token={token} />
      ))}
    </Suspense>
  );
}

async function Invite({ token }: { token: string }) {
  // Invites expire, so check them per request.
  await connection();
  const invite = await findValidInvite(token);
  if (!invite) redirect("/link-expired");

  return <SetPasswordForm token={token} firstName={invite.fullName.split(" ")[0]} />;
}
