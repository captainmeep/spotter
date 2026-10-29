import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDaysIcon, ClipboardListIcon } from "lucide-react";
import { PageHeader, PageHeaderSkeleton } from "@/components/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Home" };

export default function PortalPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<PageHeaderSkeleton />}>
        <Greeting />
      </Suspense>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/portal/program" className="group">
          <Card className="h-full transition-colors group-hover:bg-muted/50">
            <CardHeader>
              <ClipboardListIcon className="mb-2 size-5 text-muted-foreground" />
              <CardTitle>My program</CardTitle>
              <CardDescription>
                The training program your trainer shares with you.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/portal/sessions" className="group">
          <Card className="h-full transition-colors group-hover:bg-muted/50">
            <CardHeader>
              <CalendarDaysIcon className="mb-2 size-5 text-muted-foreground" />
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Your upcoming sessions.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

async function Greeting() {
  const client = await requireUser("client");
  const supabase = await createClient();
  // Row level security only lets a client read their own trainer's profile.
  const { data: trainer } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("role", "trainer")
    .maybeSingle();

  const firstName = client.fullName.split(" ")[0];

  return (
    <PageHeader
      title={firstName ? `Hi, ${firstName}` : "Hi there"}
      description={
        trainer?.full_name
          ? `You're training with ${trainer.full_name}.`
          : undefined
      }
    />
  );
}
