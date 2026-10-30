import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// Where invite and sign-in links land. Signs the user in and sends them on to
// `next`.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"), "/dashboard");

  const supabase = await createClient();
  let error: Error | null = new Error("The link is missing its token.");

  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  }

  // A relative redirect. Building an absolute URL from request.url would use
  // the server's own address (like 0.0.0.0:8080 in a container), not the one
  // the visitor is on.
  redirect(error ? "/link-expired" : next);
}
