import type { Database } from "@/lib/database.types";

export type Role = Database["public"]["Enums"]["user_role"];

// Where each kind of user lands after logging in.
export function homePathFor(role: Role) {
  return role === "trainer" ? "/dashboard" : "/portal";
}

// Pages that need a signed-in user.
export const protectedPrefixes = ["/dashboard", "/portal"];

// Pages only for signed-out visitors.
export const authPages = ["/login", "/signup"];

// Only allow redirects to paths inside the app, never to another site.
export function safeRedirectPath(path: string | null, fallback = "/") {
  return path?.startsWith("/") && !path.startsWith("//") ? path : fallback;
}
