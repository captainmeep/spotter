import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabaseEnv } from "./env";

// A Supabase client with the secret key. It bypasses row level security, so
// only use it after checking that the signed-in user is allowed to do the
// action, and only for things users can't do themselves (like creating logins).
export function createAdminClient() {
  const { url } = supabaseEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY. Add it to .env.local (or your host's settings).");
  }

  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
