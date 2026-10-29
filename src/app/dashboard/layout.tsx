import {
  CalendarDaysIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboardIcon /> },
  { href: "/dashboard/clients", label: "Clients", icon: <UsersIcon /> },
  { href: "/dashboard/programs", label: "Programs", icon: <ClipboardListIcon /> },
  { href: "/dashboard/schedule", label: "Schedule", icon: <CalendarDaysIcon /> },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: <TrendingUpIcon /> },
];

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <AppShell role="trainer" homeHref="/dashboard" nav={nav}>
      {children}
    </AppShell>
  );
}
