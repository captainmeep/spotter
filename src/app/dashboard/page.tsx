import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { PageHeader, PageHeaderSkeleton } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const sections = [
  {
    href: "/dashboard/clients",
    icon: UsersIcon,
    title: "Clients",
    description: "Profiles, goals, notes and invites.",
    phase: 2,
  },
  {
    href: "/dashboard/programs",
    icon: ClipboardListIcon,
    title: "Programs",
    description: "Build training programs and share them with clients.",
    phase: 3,
  },
  {
    href: "/dashboard/schedule",
    icon: CalendarDaysIcon,
    title: "Schedule",
    description: "Book and manage training sessions.",
    phase: 4,
  },
  {
    href: "/dashboard/pipeline",
    icon: TrendingUpIcon,
    title: "Pipeline",
    description: "Track leads until they become clients.",
    phase: 5,
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<PageHeaderSkeleton />}>
        <Greeting />
      </Suspense>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ href, icon: Icon, title, description, phase }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors group-hover:bg-muted/50">
              <CardHeader>
                <Icon className="mb-2 size-5 text-muted-foreground" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
                <CardAction>
                  <Badge variant="secondary">Phase {phase}</Badge>
                </CardAction>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

async function Greeting() {
  const trainer = await requireUser("trainer");
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", trainer.id);

  const firstName = trainer.fullName.split(" ")[0];
  const clientCount = count ?? 0;

  return (
    <PageHeader
      title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
      description={`You have ${clientCount} ${clientCount === 1 ? "client" : "clients"}.`}
    />
  );
}
