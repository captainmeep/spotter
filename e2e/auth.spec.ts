import { expect, test } from "@playwright/test";
import { CLIENT_EMAIL, logIn, logInAsTrainer, logOut, signUpTrainer } from "./helpers";

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/dashboard/clients");
  await expect(page).toHaveURL("/login");
  await page.goto("/portal");
  await expect(page).toHaveURL("/login");
});

test("a wrong password shows an error and keeps the email", async ({ page }) => {
  await logIn(page, "trainer@example.com", "not-the-password");
  await expect(page.getByText("That email and password don't match.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("trainer@example.com");
});

test("trainers land on the dashboard and stay out of the client portal", async ({ page }) => {
  await logInAsTrainer(page);
  await expect(page.getByRole("heading", { name: "Welcome back, Taylor" })).toBeVisible();

  await page.goto("/portal");
  await expect(page).toHaveURL("/dashboard");
  await page.goto("/login");
  await expect(page).toHaveURL("/dashboard");

  await logOut(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
});

test("clients land on the portal and stay out of the dashboard", async ({ page }) => {
  await logIn(page, CLIENT_EMAIL);
  await expect(page).toHaveURL("/portal");
  await expect(page.getByRole("heading", { name: "Hi, Casey" })).toBeVisible();
  await expect(page.getByText("You're training with Taylor Trainer.")).toBeVisible();
  await expect(page.getByText("Run a half marathon")).toBeVisible();

  await page.goto("/dashboard/clients");
  await expect(page).toHaveURL("/portal");
});

test("new trainers can sign up and start with no clients", async ({ page }) => {
  await signUpTrainer(page);
  await expect(page.getByRole("heading", { name: "Welcome back, Jordan" })).toBeVisible();
  await expect(page.getByText("You have 0 active clients.")).toBeVisible();
});
