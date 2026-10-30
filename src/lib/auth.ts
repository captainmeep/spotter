import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuth } from "@/lib/better-auth";
import { getDb } from "@/lib/db";
import { homePathFor, type Role } from "@/lib/routes";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

// The signed-in user, or null. Reads the session cookie, so call it inside a
// <Suspense> boundary. Cached for the rest of the request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Sessions are checked against the current time, so this can't be
  // prerendered or prefetched. Render it per request.
  await connection();
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;

  const profile = await getDb()
    .selectFrom("profiles")
    .select(["role", "full_name"])
    .where("id", "=", session.user.id)
    .executeTakeFirst();
  if (!profile) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    fullName: profile.full_name,
    role: profile.role,
  };
});

// The signed-in user, with the given role if one is passed. Sends anyone else
// to the login page, or to their own home page if they have a different role.
export async function requireUser(role?: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(homePathFor(user.role));
  return user;
}
