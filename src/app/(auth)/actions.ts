"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { homePathFor } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  // Sent back so the login form keeps the email after an error.
  email?: string;
};

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.code === "invalid_credentials"
          ? "That email and password don't match."
          : error.message,
      email,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  redirect(homePathFor(profile?.role ?? "trainer"));
}

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters for your password.")
  .max(72, "Keep your password under 72 characters.");

// For clients arriving from an invite link: they're signed in, but have no
// password yet.
export async function setPassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "That's already your password. Choose a different one, or skip this step."
          : error.message,
    };
  }

  redirect(homePathFor(user.role));
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

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data })
    .eq("id", user.id);
  if (error) return { error: error.message };

  refresh();
  return { message: "Name saved." };
}

export async function changePassword(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  await requireUser();
  const password = formData.get("password");
  if (password !== formData.get("confirm_password")) {
    return { error: "The two passwords don't match." };
  }
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "That's already your password. Choose a different one."
          : error.message,
    };
  }
  return { message: "Password changed." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
