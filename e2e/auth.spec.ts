import { expect, test } from "@playwright/test";
import { CLIENT_EMAIL, logIn, logInAsNewTrainer, logInAsTrainer, logOut } from "./helpers";

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

test("the home page shows the trainer's profile", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Scott Jackman · Personal trainer in Portland, OR");
  await expect(page.getByRole("heading", { name: "Scott Jackman", level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: /Scott Jackman/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The Four Key Pillars of Success" })).toBeVisible();
  await expect(page.getByText("Certificate IV in Personal Training")).toBeVisible();
  await expect(page.getByText(/Hardstyle/i)).toHaveCount(0);

  await page.getByRole("link", { name: "Client log in" }).first().click();
  await expect(page).toHaveURL("/login");
  await expect(page.getByText("For Scott and his clients.")).toBeVisible();
});

test("there's no public sign-up", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("link", { name: /sign up|create an account/i })).toHaveCount(0);
  const response = await page.goto("/signup");
  expect(response?.status()).toBe(404);
});

test("people can change their name and password", async ({ page }) => {
  const { email } = await logInAsNewTrainer(page, "Pat Newname");
  await expect(page.getByRole("heading", { name: "Welcome back, Pat" })).toBeVisible();
  await expect(page.getByText("You have 0 active clients.")).toBeVisible();

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Account settings" }).click();
  await expect(page).toHaveURL("/dashboard/account");
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(page.getByText(`Logged in as ${email}`)).toBeVisible();

  // Exact, so it doesn't also match the account menu (labelled "Pat Newname").
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Robin Renamed");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Name saved.")).toBeVisible();

  await page.getByLabel("Current password").fill("a-good-password");
  await page.getByLabel("New password", { exact: true }).fill("first-new-password");
  await page.getByLabel("Confirm new password").fill("something-else");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("The two new passwords don't match.")).toBeVisible();

  await page.getByLabel("Current password").fill("not-my-password");
  await page.getByLabel("New password", { exact: true }).fill("first-new-password");
  await page.getByLabel("Confirm new password").fill("first-new-password");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Your current password isn't right.")).toBeVisible();

  await page.getByLabel("Current password").fill("a-good-password");
  await page.getByLabel("New password", { exact: true }).fill("first-new-password");
  await page.getByLabel("Confirm new password").fill("first-new-password");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed.")).toBeVisible();

  await logOut(page);
  await logIn(page, email, "first-new-password");
  await expect(page.getByRole("heading", { name: "Welcome back, Robin" })).toBeVisible();
});
