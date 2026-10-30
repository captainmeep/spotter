import "server-only";
import type { Selectable } from "kysely";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import type { ClientNotes, Clients, ClientStatus } from "@/lib/db/types";

export type Client = Selectable<Clients>;
export type ClientNote = Selectable<ClientNotes>;
export type { ClientStatus };

export const clientStatuses = ["active", "inactive"] as const satisfies ClientStatus[];

const uuid = z.uuid();

// Every function here checks the signed-in trainer itself, then queries with
// asUser(), so row level security is the second line of defense: a trainer
// only ever sees their own clients.

export async function listClients({
  search,
  status,
}: {
  search?: string;
  status?: ClientStatus;
}) {
  const trainer = await requireUser("trainer");
  const term = search?.trim();

  return asUser(trainer.id, (db) => {
    let query = db
      .selectFrom("clients")
      .select(["id", "full_name", "email", "phone", "status", "user_id", "invited_at"])
      .orderBy("full_name");
    if (status) query = query.where("status", "=", status);
    if (term) {
      const pattern = `%${term}%`;
      query = query.where((eb) =>
        eb.or([
          eb("full_name", "ilike", pattern),
          eb("email", "ilike", pattern),
          eb("phone", "ilike", pattern),
        ]),
      );
    }
    return query.execute();
  });
}

export async function getClient(id: string): Promise<Client | null> {
  const trainer = await requireUser("trainer");
  if (!uuid.safeParse(id).success) return null;

  const client = await asUser(trainer.id, (db) =>
    db.selectFrom("clients").selectAll().where("id", "=", id).executeTakeFirst(),
  );
  return client ?? null;
}

export async function getClientNotes(clientId: string): Promise<ClientNote[]> {
  const trainer = await requireUser("trainer");
  return asUser(trainer.id, (db) =>
    db
      .selectFrom("client_notes")
      .selectAll()
      .where("client_id", "=", clientId)
      .orderBy("created_at", "desc")
      .execute(),
  );
}

export async function countActiveClients() {
  const trainer = await requireUser("trainer");
  const result = await asUser(trainer.id, (db) =>
    db
      .selectFrom("clients")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .where("status", "=", "active")
      .executeTakeFirstOrThrow(),
  );
  return Number(result.count);
}

// The signed-in client's own record, for the client portal.
export async function getMyClientRecord() {
  const user = await requireUser("client");
  const record = await asUser(user.id, (db) =>
    db
      .selectFrom("clients")
      .select(["full_name", "goals"])
      .where("user_id", "=", user.id)
      .executeTakeFirst(),
  );
  return record ?? null;
}

// The signed-in client's trainer's name, for the client portal.
export async function getMyTrainerName() {
  const user = await requireUser("client");
  // Row level security only lets a client read their own trainer's profile.
  const trainer = await asUser(user.id, (db) =>
    db
      .selectFrom("profiles")
      .select("full_name")
      .where("role", "=", "trainer")
      .executeTakeFirst(),
  );
  return trainer?.full_name ?? null;
}
