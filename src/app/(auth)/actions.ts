"use server";

import { APIError } from "better-auth/api";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getAuth } from "@/lib/better-auth";
import { asUser, getDb } from "@/lib/db";
import { homePathFor } from "@/lib/routes";
import { findValidInvite, setUserPassword, markInviteUsed } from "@/lib/users";

export type AuthFormState = {
  error?: string;
  // Sent back so the login form keeps the email after an error.
  email?: string;
};

function errorCode(error: unknown) {
  return error instanceof APIError ? (error.body?.code as string | undefined) : undefined;
}

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = loginSchema.safeParse({
    email,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email };
  }

  let userId: string;
  try {
    const result = await getAuth().api.signInEmail({
      body: { email: parsed.data.email.toLowerCase(), password: parsed.data.password },
      headers: await headers(),
    });
    userId = result.user.id;
  } catch (error) {
    if (errorCode(error) === "INVALID_EMAIL_OR_PASSWORD") {
      return { error: "That email and password don't match.", email };
    }
    throw error;
  }

  const profile = await getDb()
    .selectFrom("profiles")
    .select("role")
    .where("id", "=", userId)
    .executeTakeFirst();
  redirect(homePathFor(profile?.role ?? "trainer"));
}

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters for your password.")
  .max(72, "Keep your password under 72 characters.");

// Where invite links lead: the person chooses a password and is logged in.
// Each link works once.
export async function acceptInvite(
  token: string,
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const invite = await findValidInvite(token);
  if (!invite || !(await markInviteUsed(invite.inviteId))) redirect("/link-expired");

  await setUserPassword(invite.userId, parsed.data);
  // A new link means a fresh start: log out any other devices.
  const ctx = await getAuth().$context;
  await ctx.internalAdapter.deleteUserSessions(invite.userId);
  await getAuth().api.signInEmail({
    body: { email: invite.email, password: parsed.data },
    headers: await headers(),
  });

  redirect(homePathFor(invite.role));
}

export type AccountFormState = { error?: string; message?: string };

const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(100, "Keep your name under 100 characters.");

export async function updateName(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();
  const parsed = nameSchema.safeParse(formData.get("full_name") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await asUser(user.id, (db) =>
    db.updateTable("profiles").set({ full_name: parsed.data }).where("id", "=", user.id).execute(),
  );
  // Keep the login's name in step.
  await getDb().updateTable("user").set({ name: parsed.data }).where("id", "=", user.id).execute();

  refresh();
  return { message: "Name saved." };
}

export async function changePassword(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  await requireUser();
  const currentPassword = String(formData.get("current_password") ?? "");
  const password = formData.get("password");
  if (password !== formData.get("confirm_password")) {
    return { error: "The two new passwords don't match." };
  }
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data === currentPassword) {
    return { error: "That's already your password. Choose a different one." };
  }

  try {
    await getAuth().api.changePassword({
      body: { currentPassword, newPassword: parsed.data },
      headers: await headers(),
    });
  } catch (error) {
    if (errorCode(error) === "INVALID_PASSWORD") {
      return { error: "Your current password isn't right." };
    }
    throw error;
  }
  return { message: "Password changed." };
}

export async function logout() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/login");
}
