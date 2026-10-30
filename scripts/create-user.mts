// Creates a login. Spotter has no public sign-up, so this is how the trainer's
// account is made (and how tests make extra trainers).
//
//   npm run create-user -- --email scott@example.com --name "Scott Jackman"
//
// Without --password it prints a one-time invite link where the person
// chooses their own password. Links start with BETTER_AUTH_URL.
// Options: --role trainer|client (default trainer), --trainer-id (for clients).
import { parseArgs } from "node:util";
import { getPool } from "../src/lib/db";
import { createInvite, createUserWithProfile, findUserByEmail } from "../src/lib/users";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "trainer" },
    "trainer-id": { type: "string" },
    password: { type: "string" },
  },
});

const { email, name, role, password } = values;
if (!email || !name || (role !== "trainer" && role !== "client")) {
  console.error('Usage: npm run create-user -- --email EMAIL --name "FULL NAME" [--role trainer|client] [--password PASSWORD]');
  process.exit(1);
}

try {
  if (await findUserByEmail(email)) {
    console.error(`A login for ${email} already exists.`);
    process.exit(1);
  }

  const user = await createUserWithProfile({
    email,
    name,
    role,
    trainerId: values["trainer-id"] ?? null,
    password,
  });
  console.log(`Created ${role} ${email}.`);

  if (!password) {
    const token = await createInvite(user.id);
    const baseUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
    console.log(`Invite link (works once): ${baseUrl}/invite/${token}`);
  }
} finally {
  await getPool().end();
}
