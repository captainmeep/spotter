import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/better-auth";
import { getDb } from "@/lib/db";
import { authPages, homePathFor, protectedPrefixes } from "@/lib/routes";

// Sends visitors to the right place: signed-out people to /login, signed-in
// people away from /login. This is only a fast first check; every page and
// action still checks the user itself (see src/lib/auth.ts).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Only check the session itself here: a leftover cookie from an expired
  // session must not bounce people away from the login page.
  if (hasSessionCookie && authPages.includes(pathname)) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (session) {
      const profile = await getDb()
        .selectFrom("profiles")
        .select("role")
        .where("id", "=", session.user.id)
        .executeTakeFirst();
      if (profile) {
        return NextResponse.redirect(new URL(homePathFor(profile.role), request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on every request except static files and images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
