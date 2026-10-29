import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import type { Role } from "@/lib/routes";
import { MobileNav } from "./mobile-nav";
import { NavLinks, type NavItem } from "./nav-links";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

// The signed-in layout shared by the trainer dashboard and the client portal:
// a sidebar on desktop, a top bar with a slide-out menu on phones.
export function AppShell({
  role,
  homeHref,
  nav,
  children,
}: {
  role: Role;
  homeHref: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r bg-muted/30 p-4 md:flex">
        <Logo href={homeHref} className="px-2" />
        <NavLinks items={nav} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <div className="md:hidden">
            <MobileNav items={nav} homeHref={homeHref} />
          </div>
          <Logo href={homeHref} className="md:hidden" />
          <div className="ml-auto">
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<PageSkeleton />}>
            <RoleGate role={role}>{children}</RoleGate>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// Only renders the page for users with the right role. Everyone else is sent
// to the login page or to their own home page.
async function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  await requireUser(role);
  return children;
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
