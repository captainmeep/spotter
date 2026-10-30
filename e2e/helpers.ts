import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const DEMO_PASSWORD = "password123";
export const TRAINER_EMAIL = "trainer@example.com";
export const CLIENT_EMAIL = "client@example.com";

export async function logIn(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function logInAsTrainer(page: Page) {
  await logIn(page, TRAINER_EMAIL);
  await expect(page).toHaveURL("/dashboard");
}

export async function logOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login");
}

// A name and email no other test (or earlier run) uses.
export function uniqueClient(label: string) {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    name: `${label} ${id}`,
    email: `${label.toLowerCase().replace(/\W+/g, "-")}-${id}@example.com`,
  };
}

// The local Supabase settings written by `npm run local:up`.
function localEnv() {
  const env: Record<string, string> = {};
  for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
  return env;
}

// Creates a brand-new trainer, who starts with no clients, and logs in as
// them. Public sign-up is off, so this uses the admin API.
export async function logInAsNewTrainer(page: Page, name = "Jordan Newcoach") {
  const env = localEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { email } = uniqueClient("trainer");
  const password = "a-good-password";
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;

  await logIn(page, email, password);
  await expect(page).toHaveURL("/dashboard");
  return { email, password };
}

// Adds a client and accepts their invite in a separate browser, so tests can
// check what the client sees. Delete the client at the end with deleteClient().
export async function addInvitedClient(page: Page, browser: Browser, label: string) {
  const client = uniqueClient(label);
  await page.goto("/dashboard/clients/new");
  await page.getByLabel("Name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { name: client.name })).toBeVisible();
  const clientUrl = page.url();

  await page.getByRole("button", { name: "Invite to Spotter" }).click();
  const link = await page.getByLabel("Login link").inputValue();
  await page.keyboard.press("Escape");

  const context = await browser.newContext();
  const clientPage = await context.newPage();
  await clientPage.goto(link);
  await expect(clientPage).toHaveURL("/welcome");
  await clientPage.getByRole("link", { name: "Skip for now" }).click();
  await expect(clientPage).toHaveURL("/portal");

  return { ...client, clientUrl, clientPage, context };
}

export async function deleteClient(page: Page, clientUrl: string) {
  await page.goto(clientUrl);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete client" }).click();
  await expect(page).toHaveURL("/dashboard/clients");
}
