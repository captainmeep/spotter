import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { authPages, homePathFor, protectedPrefixes } from "@/lib/routes";
import { supabaseEnv } from "./env";

// Refreshes the Supabase session cookie on every request, and sends visitors
// to the right place: signed-out users to /login, signed-in users away from
// the login and sign-up pages. This is only a fast first check; every page and
// action still checks the user itself (see src/lib/auth.ts).
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Don't run code between createServerClient and getClaims: it refreshes the
  // session, and skipping it can log users out at random.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!userId && isProtected) {
    return redirectTo(request, response, "/login");
  }

  if (userId && authPages.includes(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profile) {
      return redirectTo(request, response, homePathFor(profile.role));
    }
  }

  return response;
}

// Redirect while keeping any refreshed session cookies.
function redirectTo(request: NextRequest, response: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  response.headers.forEach((value, key) => {
    if (key !== "set-cookie") redirect.headers.set(key, value);
  });
  return redirect;
}
