import type { PoolConfig } from "pg";

// Database settings. Either DATABASE_URL (local development and CI), or
// separate settings, which suit Cloud Run: DB_HOST is the Cloud SQL socket
// folder (/cloudsql/PROJECT:REGION:INSTANCE) and DB_PASSWORD comes from
// Secret Manager.
export function databaseConfig(): PoolConfig {
  const url = process.env.DATABASE_URL;
  if (url) return { connectionString: url };

  const { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error(
      "Missing database settings. Set DATABASE_URL, or DB_HOST, DB_NAME, DB_USER and DB_PASSWORD. For local development, run `npm run local:up`.",
    );
  }
  return { host: DB_HOST, database: DB_NAME, user: DB_USER, password: DB_PASSWORD };
}
