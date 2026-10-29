import "server-only";
import { z } from "zod";
import type { Database } from "@/lib/database.types";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientNote = Database["public"]["Tables"]["client_notes"]["Row"];
export type ClientStatus = Database["public"]["Enums"]["client_status"];

export const clientStatuses = ["active", "inactive"] as const satisfies ClientStatus[];

const uuid = z.uuid();

// Every function here checks the signed-in trainer itself. Row level security
// is the second line of defense, so a trainer only ever sees their own clients.

export async function listClients({
  search,
  status,
}: {
  search?: string;
  status?: ClientStatus;
}) {
  await requireUser("trainer");
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, full_name, email, phone, status, user_id, invited_at")
    .order("full_name");

  if (status) query = query.eq("status", status);

  // Drop characters that have a meaning in PostgREST filters.
  const term = search?.replace(/[,%()"\\]/g, " ").trim();
  if (term) {
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getClient(id: string): Promise<Client | null> {
  await requireUser("trainer");
  if (!uuid.safeParse(id).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getClientNotes(clientId: string): Promise<ClientNote[]> {
  await requireUser("trainer");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function countActiveClients() {
  await requireUser("trainer");
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  if (error) throw error;
  return count ?? 0;
}

// The signed-in client's own record, for the client portal.
export async function getMyClientRecord() {
  const user = await requireUser("client");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("full_name, goals")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
