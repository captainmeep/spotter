import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { homePathFor } from "@/lib/routes";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Welcome" };

// Where invite links land: the client is signed in and chooses a password.
export default function WelcomePage() {
  return (
    <Suspense fallback={<Card><CardHeader className="h-48 animate-pulse" /></Card>}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const user = await requireUser();
  const firstName = user.fullName.split(" ")[0];

  return <SetPasswordForm firstName={firstName} skipHref={homePathFor(user.role)} />;
}
