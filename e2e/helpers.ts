import { expect, type Browser, type Page } from "@playwright/test";

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

// Signs up a brand-new trainer, who starts with no clients.
export async function signUpTrainer(page: Page, name = "Jordan Newcoach") {
  const { email } = uniqueClient("trainer");
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-good-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/dashboard");
  return email;
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
