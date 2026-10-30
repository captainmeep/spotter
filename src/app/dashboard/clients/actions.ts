"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { clientStatuses } from "@/lib/clients";
import { asUser, errorCode, getDb } from "@/lib/db";
import {
  createInvite,
  createUserWithProfile,
  deleteUser,
  findUserByEmail,
} from "@/lib/users";

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

function saveError(error: unknown) {
  if (errorCode(error) === "23505") return "You already have a client with that email address.";
  throw error;
}

export async function createClientRecord(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const trainer = await requireUser("trainer");
  const { values, parsed } = readClientForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  let clientId: string;
  try {
    const client = await asUser(trainer.id, (db) =>
      db.insertInto("clients").values(parsed.data).returning("id").executeTakeFirstOrThrow(),
    );
    clientId = client.id;
  } catch (error) {
    return { error: saveError(error), values };
  }

  redirect(`/dashboard/clients/${clientId}`);
}

export async function updateClientRecord(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const trainer = await requireUser("trainer");
  const { values, parsed } = readClientForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  try {
    const updated = await asUser(trainer.id, (db) =>
      db.updateTable("clients").set(parsed.data).where("id", "=", clientId).returning("id").execute(),
    );
    if (updated.length === 0) return { error: "That client doesn't exist anymore.", values };
  } catch (error) {
    return { error: saveError(error), values };
  }

  redirect(`/dashboard/clients/${clientId}`);
}

// The client record and, if they have one, their login, after checking it
// really is this trainer's client.
async function findOwnClient(trainerId: string, clientId: string) {
  return asUser(trainerId, async (db) => {
    const client = await db
      .selectFrom("clients")
      .select(["id", "full_name", "email", "user_id"])
      .where("id", "=", clientId)
      .executeTakeFirst();
    if (!client?.user_id) return client ? { client, loginId: null } : null;

    const login = await db
      .selectFrom("profiles")
      .select("id")
      .where("id", "=", client.user_id)
      .where("role", "=", "client")
      .where("trainer_id", "=", trainerId)
      .executeTakeFirst();
    return { client, loginId: login?.id ?? null };
  });
}

export async function deleteClientRecord(clientId: string) {
  const trainer = await requireUser("trainer");
  const found = await findOwnClient(trainer.id, clientId);
  if (!found) return { error: "That client doesn't exist anymore." };

  // Remove the client's login too, so they can't log in after being deleted.
  if (found.loginId) await deleteUser(found.loginId);

  await asUser(trainer.id, (db) => db.deleteFrom("clients").where("id", "=", clientId).execute());
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
  const trainer = await requireUser("trainer");
  const body = String(formData.get("body") ?? "");
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message, body };

  try {
    await asUser(trainer.id, (db) =>
      db.insertInto("client_notes").values({ client_id: clientId, body: parsed.data }).execute(),
    );
  } catch (error) {
    if (errorCode(error) === "42501") return { error: "That client doesn't exist anymore.", body };
    throw error;
  }

  refresh();
  return {};
}

export async function deleteNote(noteId: string) {
  const trainer = await requireUser("trainer");
  await asUser(trainer.id, (db) => db.deleteFrom("client_notes").where("id", "=", noteId).execute());
  refresh();
  return {};
}

export type InviteResult = { link?: string; error?: string };

// Creates a one-time link where the client chooses a password and is logged
// in. The trainer shares it however they like (text, email, WhatsApp).
export async function createInviteLink(clientId: string): Promise<InviteResult> {
  const trainer = await requireUser("trainer");
  const found = await findOwnClient(trainer.id, clientId);
  if (!found) return { error: "That client doesn't exist anymore." };
  const { client } = found;

  let userId = found.loginId;
  if (client.user_id && !userId) return { error: "This client's login couldn't be found." };

  // Not invited yet: create their login as this trainer's client.
  if (!userId) {
    if (!client.email) return { error: "Add an email address for this client first." };
    if (await findUserByEmail(client.email)) {
      return {
        error: "That email address already has a Spotter account. Use a different email for this client.",
      };
    }
    const user = await createUserWithProfile({
      email: client.email,
      name: client.full_name,
      role: "client",
      trainerId: trainer.id,
    });
    userId = user.id;
  }

  const token = await createInvite(userId);
  // Linking the login is server work, so it runs as the database owner.
  await getDb()
    .updateTable("clients")
    .set({ user_id: userId, invited_at: new Date() })
    .where("id", "=", client.id)
    .execute();

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? `https://${requestHeaders.get("host")}`;
  refresh();
  return { link: `${origin}/invite/${token}` };
}
