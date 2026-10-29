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

async function ensureClient(trainerId, { notes = [], ...client }) {
  const { data: existing, error: findError } = await supabase
    .from("clients")
    .select("id")
    .eq("trainer_id", trainerId)
    .eq("full_name", client.full_name)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) {
    console.log(`- client ${client.full_name} already exists`);
    return;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ trainer_id: trainerId, ...client })
    .select("id")
    .single();
  if (error) throw error;

  if (notes.length > 0) {
    const { error: notesError } = await supabase.from("client_notes").insert(
      notes.map((body, index) => ({
        client_id: data.id,
        author_id: trainerId,
        body,
        // Space the notes out so they read like a history.
        created_at: new Date(Date.now() - (notes.length - index) * 3 * 86400000).toISOString(),
      })),
    );
    if (notesError) throw notesError;
  }
  console.log(`- created client ${client.full_name}`);
}

const trainer = await ensureUser({
  email: "trainer@example.com",
  fullName: "Taylor Trainer",
});

const clientUser = await ensureUser({
  email: "client@example.com",
  fullName: "Casey Client",
  appMetadata: { role: "client", trainer_id: trainer.id },
});

await ensureClient(trainer.id, {
  full_name: "Casey Client",
  email: "client@example.com",
  phone: "555-0101",
  goals: "Run a half marathon in under 2 hours by spring.\nBuild core strength to stop lower back pain.",
  user_id: clientUser.id,
  invited_at: new Date().toISOString(),
  notes: [
    "First session: good cardio base, tight hamstrings. Start mobility work.",
    "Back pain much better after two weeks of core work.",
  ],
});
await ensureClient(trainer.id, {
  full_name: "Morgan Lee",
  email: "morgan@example.com",
  phone: "555-0102",
  goals: "Deadlift 1.5x bodyweight. Train 3 times a week.",
  notes: ["Wants morning sessions before work."],
});
await ensureClient(trainer.id, {
  full_name: "Sam Patel",
  email: "sam@example.com",
  goals: "Get back into training after knee surgery.",
  status: "inactive",
});

console.log(`\nDemo accounts are ready. Password for both: ${PASSWORD}`);
