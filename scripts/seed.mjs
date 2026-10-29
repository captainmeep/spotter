// Creates demo accounts for local development. Run with `npm run db:seed`.
// Safe to run more than once: existing demo users are left as they are.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env.local first.",
  );
  process.exit(1);
}

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url)) {
  console.error(`Refusing to seed a non-local database (${url}).`);
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "password123";

async function findUser(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((user) => user.email === email);
}

async function ensureUser({ email, fullName, appMetadata = {} }) {
  const existing = await findUser(email);
  if (existing) {
    console.log(`- ${email} already exists`);
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: appMetadata,
  });
  if (error) throw error;
  console.log(`- created ${email}`);
  return data.user;
}

const trainer = await ensureUser({
  email: "trainer@example.com",
  fullName: "Taylor Trainer",
});

await ensureUser({
  email: "client@example.com",
  fullName: "Casey Client",
  appMetadata: { role: "client", trainer_id: trainer.id },
});

console.log(`\nDemo accounts are ready. Password for both: ${PASSWORD}`);
