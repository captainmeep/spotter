"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { homePathFor } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  message?: string;
  // Sent back so the form keeps what the user typed after an error.
  email?: string;
  fullName?: string;
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

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters for your password."),
});

// Public sign-up is for trainers. Clients are invited by their trainer.
export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "");
  const parsed = signupSchema.safeParse({
    fullName,
    email,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email, fullName };
  }

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
    },
  });
  if (error) {
    return { error: error.message, email, fullName };
  }

  // No session means the project requires email confirmation first.
  if (!data.session) {
    return {
      message: `We sent a confirmation link to ${parsed.data.email}. Open it to finish signing up.`,
    };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
