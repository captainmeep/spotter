import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { homePathFor, type Role } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

// The signed-in user, or null. Reads the session cookie, so call it inside a
// <Suspense> boundary. Cached for the rest of the request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: claims.sub,
    email: claims.email ?? "",
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
