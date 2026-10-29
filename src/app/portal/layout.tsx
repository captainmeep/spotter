import { CalendarDaysIcon, ClipboardListIcon, HomeIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";

const nav = [
  { href: "/portal", label: "Home", icon: <HomeIcon /> },
  { href: "/portal/program", label: "My program", icon: <ClipboardListIcon /> },
  { href: "/portal/sessions", label: "Sessions", icon: <CalendarDaysIcon /> },
];

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <AppShell role="client" homeHref="/portal" nav={nav}>
      {children}
    </AppShell>
  );
}
