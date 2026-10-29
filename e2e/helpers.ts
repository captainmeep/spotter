import { expect, type Page } from "@playwright/test";

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
