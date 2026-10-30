// Supabase is only used on the server, so the settings are read at runtime.
// The plain names come first because Next.js bakes NEXT_PUBLIC_ values into
// the build, and hosts like Cloud Run set environment variables at runtime.
// The NEXT_PUBLIC_ names still work for local development (.env.local).
export function supabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. For local development, copy .env.example to .env.local and fill them in.",
    );
  }

  return { url, publishableKey };
}
