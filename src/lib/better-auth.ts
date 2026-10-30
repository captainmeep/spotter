import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getPool } from "@/lib/db";

function createAuth() {
  return betterAuth({
    database: getPool(),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      // Spotter is for one trainer. Logins are created by the server: the
      // trainer's with `npm run create-trainer`, clients' through invites.
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 72,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refreshed at most once a day
    },
    advanced: { database: { generateId: "uuid" } },
    telemetry: { enabled: false },
    // Lets server actions set the login cookie. Must be the last plugin.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const shared = globalThis as unknown as { spotterAuth?: Auth };

// Created on first use, so building the app doesn't need a database.
export function getAuth(): Auth {
  shared.spotterAuth ??= createAuth();
  return shared.spotterAuth;
}
