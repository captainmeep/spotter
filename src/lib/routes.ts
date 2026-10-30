import type { UserRole } from "@/lib/db/types";

export type Role = UserRole;

// Where each kind of user lands after logging in.
export function homePathFor(role: Role) {
  return role === "trainer" ? "/dashboard" : "/portal";
}

// Pages that need a signed-in user.
export const protectedPrefixes = ["/dashboard", "/portal"];

// Pages only for signed-out visitors.
export const authPages = ["/login"];
