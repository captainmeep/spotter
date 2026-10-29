import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// Where links in Supabase emails (sign-up confirmation, and invites later)
// land. Signs the user in and sends them on to `next`.
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

  return NextResponse.redirect(new URL(error ? "/link-expired" : next, request.url));
}
