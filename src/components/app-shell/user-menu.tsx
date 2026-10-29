import { getCurrentUser } from "@/lib/auth";
import { UserMenuButton } from "./user-menu-button";

// Reads the session, so render it inside a <Suspense> boundary.
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <UserMenuButton
      name={user.fullName || user.email}
      email={user.email}
      role={user.role}
    />
  );
}

export function UserMenuSkeleton() {
  return <div className="size-8 animate-pulse rounded-full bg-muted" />;
}
