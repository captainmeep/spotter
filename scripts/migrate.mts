// Applies the SQL files in db/migrations, in name order, that haven't been
// applied yet. Run with `npm run db:migrate`. Uses the same database settings
// as the app (see src/lib/db/config.ts).
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";
import { databaseConfig } from "../src/lib/db/config";

const dir = join(process.cwd(), "db", "migrations");
const client = new Client(databaseConfig());
await client.connect();

try {
  // Only one migration run at a time, even if two deploys overlap.
  await client.query("select pg_advisory_lock(472613)");
  await client.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );

  const applied = new Set(
    (await client.query<{ name: string }>("select name from schema_migrations")).rows.map((row) => row.name),
  );
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
  const pending = files.filter((file) => !applied.has(file));

  for (const file of pending) {
    const sql = await readFile(join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  console.log(pending.length ? `Done: ${pending.length} applied.` : "Database is up to date.");
} finally {
  await client.end();
}
