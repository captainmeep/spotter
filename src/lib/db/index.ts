import { Kysely, PostgresDialect, sql, type Transaction } from "kysely";
import { Pool } from "pg";
import { databaseConfig } from "./config";
import type { DB } from "./types";

export type { DB } from "./types";
export type Db = Kysely<DB>;

// One pool per server process. Created on first use, so building the app
// doesn't need a database.
const shared = globalThis as unknown as { spotterPool?: Pool; spotterDb?: Db };

export function getPool(): Pool {
  shared.spotterPool ??= new Pool({ ...databaseConfig(), max: 5 });
  return shared.spotterPool;
}

// The database as the table owner. Row level security doesn't apply, so only
// use this for server work like logins and invites, after checking that the
// signed-in person is allowed to do it. For everything a person does, use
// asUser().
export function getDb(): Db {
  shared.spotterDb ??= new Kysely<DB>({ dialect: new PostgresDialect({ pool: getPool() }) });
  return shared.spotterDb;
}

// Runs queries on behalf of a signed-in person, in one transaction, under row
// level security: as the `authenticated` role, with app.user_id set to them.
export async function asUser<T>(
  userId: string,
  run: (db: Transaction<DB>) => Promise<T>,
): Promise<T> {
  return getDb()
    .transaction()
    .execute(async (trx) => {
      await sql`select set_config('app.user_id', ${userId}, true)`.execute(trx);
      await sql`set local role authenticated`.execute(trx);
      return run(trx);
    });
}

// The Postgres error code of a failed query, like "23505" for a duplicate.
export function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}
