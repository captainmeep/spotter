"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { clientStatuses } from "@/lib/clients";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Every action checks the signed-in trainer itself: server actions can be
// called directly, not only from our forms.

export type ClientFormState = {
  error?: string;
  values?: Record<string, string>;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const clientSchema = z.object({
  full_name: z.string().trim().min(1, "Enter the client's name.").max(100, "Keep the name under 100 characters."),
  email: z
    .union([z.literal(""), z.email("Enter a valid email address, or leave it empty.")])
    .transform((value) => value.toLowerCase() || null),
  phone: optionalText(40),
  goals: z.string().trim().max(2000, "Keep goals under 2,000 characters."),
  status: z.enum(clientStatuses),
});

function readClientForm(formData: FormData) {
  const values = {
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? ""),
    goals: String(formData.get("goals") ?? ""),
    status: String(formData.get("status") ?? "active"),
  };
  return { values, parsed: clientSchema.safeParse(values) };
}

function saveError(error: { code?: string; message: string }) {
  return error.code === "23505"
    ? "You already have a client with that email address."
    : error.message;
}

export async function createClientRecord(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireUser("trainer");
  const { values, parsed } = readClientForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) return { error: saveError(error), values };

  redirect(`/dashboard/clients/${data.id}`);
}

export async function updateClientRecord(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireUser("trainer");
  const { values, parsed } = readClientForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(parsed.data)
    .eq("id", clientId)
    .select("id");
  if (error) return { error: saveError(error), values };
  if (data.length === 0) return { error: "That client doesn't exist anymore.", values };

  redirect(`/dashboard/clients/${clientId}`);
}

export async function deleteClientRecord(clientId: string) {
  const trainer = await requireUser("trainer");
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, user_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return { error: "That client doesn't exist anymore." };

  // Remove the client's login too, so they can't sign in after being deleted.
  // Check it really is this trainer's client login before using the admin API.
  if (client.user_id) {
    const { data: login } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", client.user_id)
      .eq("role", "client")
      .eq("trainer_id", trainer.id)
      .maybeSingle();
    if (login) {
      const { error } = await createAdminClient().auth.admin.deleteUser(login.id);
      if (error) return { error: `Couldn't remove the client's login: ${error.message}` };
    }
  }

  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) return { error: error.message };

  redirect("/dashboard/clients");
}

const noteSchema = z
  .string()
  .trim()
  .min(1, "Write something first.")
  .max(5000, "Keep notes under 5,000 characters.");

// On an error, `body` sends back what was typed so the form doesn't lose it.
export type NoteFormState = { error?: string; body?: string };

export async function addNote(
  clientId: string,
  _prevState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  await requireUser("trainer");
  const body = String(formData.get("body") ?? "");
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message, body };

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_notes")
    .insert({ client_id: clientId, body: parsed.data });
  if (error) return { error: error.message, body };

  refresh();
  return {};
}

export async function deleteNote(noteId: string) {
  await requireUser("trainer");
  const supabase = await createClient();
  const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export type InviteResult = { link?: string; error?: string };

// Creates a one-time link that signs the client in and asks them to choose a
// password. The trainer shares it however they like (text, email, WhatsApp).
export async function createInviteLink(clientId: string): Promise<InviteResult> {
  const trainer = await requireUser("trainer");
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, email, user_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return { error: "That client doesn't exist anymore." };

  const admin = createAdminClient();
  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ?? `https://${requestHeaders.get("host")}`;
  const now = new Date().toISOString();

  // Already invited: send a fresh sign-in link for the existing login.
  if (client.user_id) {
    const { data: login } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", client.user_id)
      .eq("role", "client")
      .eq("trainer_id", trainer.id)
      .maybeSingle();
    if (!login) return { error: "This client's login couldn't be found." };

    const { data: authUser, error: userError } =
      await admin.auth.admin.getUserById(login.id);
    if (userError || !authUser.user.email) {
      return { error: "This client's login couldn't be found." };
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authUser.user.email,
    });
    if (error) return { error: error.message };

    await admin.from("clients").update({ invited_at: now }).eq("id", client.id);
    refresh();
    return { link: confirmLink(origin, data.properties.hashed_token, "magiclink") };
  }

  if (!client.email) {
    return { error: "Add an email address for this client first." };
  }

  // New invite: create the login, then make it this trainer's client.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: client.email,
    options: { data: { full_name: client.full_name } },
  });
  if (error) {
    return {
      error:
        error.code === "email_exists"
          ? "That email address already has a Spotter account. Use a different email for this client."
          : error.message,
    };
  }

  const userId = data.user.id;
  const { error: roleError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: "client", trainer_id: trainer.id },
  });
  const { error: linkError } = roleError
    ? { error: roleError }
    : await admin
        .from("clients")
        .update({ user_id: userId, invited_at: now })
        .eq("id", client.id);
  if (linkError) {
    // Don't leave a half-made login behind.
    await admin.auth.admin.deleteUser(userId);
    return { error: `Couldn't create the invite: ${linkError.message}` };
  }

  refresh();
  return { link: confirmLink(origin, data.properties.hashed_token, "invite") };
}

function confirmLink(origin: string, tokenHash: string, type: "invite" | "magiclink") {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next: "/welcome" });
  return `${origin}/auth/confirm?${params}`;
}
