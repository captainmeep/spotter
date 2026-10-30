import { createHash, randomBytes } from "node:crypto";
import { getAuth } from "@/lib/better-auth";
import { getDb } from "@/lib/db";
import type { UserRole } from "@/lib/db/types";
import { INVITE_DAYS } from "@/lib/invite-settings";

// Creating logins, setting passwords and one-time invite links. These run as
// the database owner, so callers must check permissions first. No
// "server-only" import, so scripts (seed, create-trainer) can use them too.

export async function createUserWithProfile({
  email,
  name,
  role,
  trainerId = null,
  password,
}: {
  email: string;
  name: string;
  role: UserRole;
  trainerId?: string | null;
  password?: string;
}) {
  const ctx = await getAuth().$context;
  const user = await ctx.internalAdapter.createUser(
    { email: email.trim().toLowerCase(), name, emailVerified: true },
    // Created by the server (an invite, the seed, or create-trainer).
    { method: "admin" },
  );

  try {
    await getDb()
      .insertInto("profiles")
      .values({ id: user.id, role, full_name: name, trainer_id: trainerId })
      .execute();
    if (password) await setUserPassword(user.id, password);
  } catch (error) {
    // Don't leave a half-made login behind.
    await ctx.internalAdapter.deleteUser(user.id);
    throw error;
  }
  return user;
}

export async function findUserByEmail(email: string) {
  const ctx = await getAuth().$context;
  const found = await ctx.internalAdapter.findUserByEmail(email.trim().toLowerCase());
  return found?.user ?? null;
}

export async function setUserPassword(userId: string, password: string) {
  const ctx = await getAuth().$context;
  const hash = await ctx.password.hash(password);
  const accounts = await ctx.internalAdapter.findAccounts(userId);
  if (accounts.some((account) => account.providerId === "credential")) {
    await ctx.internalAdapter.updatePassword(userId, hash);
  } else {
    await ctx.internalAdapter.linkAccount({
      userId,
      providerId: "credential",
      accountId: userId,
      password: hash,
    });
  }
}

// Deletes a login, with its sessions and profile.
export async function deleteUser(userId: string) {
  const ctx = await getAuth().$context;
  await ctx.internalAdapter.deleteUser(userId);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// A new one-time invite for a login. Any earlier unused invites stop working.
// Returns the token for the link (/invite/<token>); only its hash is stored.
export async function createInvite(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const db = getDb();
  await db.deleteFrom("invites").where("user_id", "=", userId).where("used_at", "is", null).execute();
  await db
    .insertInto("invites")
    .values({
      user_id: userId,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    })
    .execute();
  return token;
}

// The person an unused, unexpired invite is for, or null.
export async function findValidInvite(token: string) {
  return getDb()
    .selectFrom("invites")
    .innerJoin("user", "user.id", "invites.user_id")
    .innerJoin("profiles", "profiles.id", "invites.user_id")
    .select([
      "invites.id as inviteId",
      "user.id as userId",
      "user.email",
      "profiles.full_name as fullName",
      "profiles.role",
    ])
    .where("invites.token_hash", "=", hashToken(token))
    .where("invites.used_at", "is", null)
    .where("invites.expires_at", ">", new Date())
    .executeTakeFirst() ?? null;
}

// Marks an invite used. Returns false if it was already used (for example,
// opened twice at the same moment).
export async function markInviteUsed(inviteId: string) {
  const result = await getDb()
    .updateTable("invites")
    .set({ used_at: new Date() })
    .where("id", "=", inviteId)
    .where("used_at", "is", null)
    .executeTakeFirst();
  return result.numUpdatedRows > BigInt(0);
}
