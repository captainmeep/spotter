import { expect, test } from "@playwright/test";
import { logIn, logInAsTrainer, logOut, logInAsNewTrainer, uniqueClient } from "./helpers";

test("trainers can add, find, edit and delete a client", async ({ page }) => {
  const client = uniqueClient("Riley");
  await logInAsTrainer(page);

  await page.getByRole("navigation").getByRole("link", { name: "Clients" }).click();
  await expect(page).toHaveURL("/dashboard/clients");
  await page.getByRole("link", { name: "Add client" }).click();
  await expect(page).toHaveURL("/dashboard/clients/new");
  await page.getByLabel("Name").fill(client.name);
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Goals").fill("Swim 1km without stopping.");
  // Skip the browser's own email check to test the server's.
  await page
    .locator("form", { has: page.getByLabel("Name") })
    .evaluate((form) => form.setAttribute("novalidate", ""));
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText("Enter a valid email address, or leave it empty.")).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue(client.name);

  await page.getByLabel("Email").fill(client.email);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { name: client.name })).toBeVisible();
  await expect(page.getByText("Swim 1km without stopping.")).toBeVisible();
  await expect(page.getByText(client.email)).toBeVisible();

  // Search finds them in the active list.
  await page.goto("/dashboard/clients");
  await page.getByLabel("Search clients").fill(client.name);
  await page.getByLabel("Search clients").press("Enter");
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByRole("link", { name: client.name })).toBeVisible();
  await expect(page.getByRole("link", { name: /Morgan Lee/ })).toBeHidden();

  // Edit: new goals, and mark them inactive.
  await page.getByRole("link", { name: client.name }).click();
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Goals").fill("Swim 2km without stopping.");
  await page.getByLabel("Status", { exact: true }).selectOption("inactive");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Swim 2km without stopping.")).toBeVisible();
  // Recently visited pages stay in the DOM (hidden), so only look at visible text.
  await expect(
    page.getByText("Inactive", { exact: true }).filter({ visible: true }),
  ).toBeVisible();

  // Inactive clients move to the Inactive tab.
  await page.goto("/dashboard/clients");
  await expect(page.getByRole("link", { name: client.name })).toBeHidden();
  await page.getByRole("link", { name: "Inactive" }).click();
  await expect(page.getByRole("link", { name: client.name })).toBeVisible();

  // Delete, after confirming.
  await page.getByRole("link", { name: client.name }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete client" }).click();
  await expect(page).toHaveURL("/dashboard/clients");
  await page.getByRole("link", { name: "All" }).click();
  await expect(page.getByRole("link", { name: client.name })).toBeHidden();
});

test("trainers can add and delete notes", async ({ page }) => {
  const client = uniqueClient("Noah");
  await logInAsTrainer(page);
  await page.goto("/dashboard/clients/new");
  await page.getByLabel("Name").fill(client.name);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { name: client.name })).toBeVisible();
  await expect(page.getByText("No notes yet.")).toBeVisible();

  await page.getByLabel("New note").fill("Left shoulder is sore, avoid overhead press.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Left shoulder is sore, avoid overhead press.")).toBeVisible();
  await expect(page.getByLabel("New note")).toHaveValue("");

  await page.getByRole("button", { name: "Delete note" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete note" }).click();
  await expect(page.getByText("No notes yet.")).toBeVisible();

  // Clean up.
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete client" }).click();
  await expect(page).toHaveURL("/dashboard/clients");
});

test("an invited client can set a password, log in, and see their goals", async ({ page, browser }) => {
  const client = uniqueClient("Avery");
  await logInAsTrainer(page);
  await page.goto("/dashboard/clients/new");
  await page.getByLabel("Name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("Goals").fill("Do 10 pull-ups.");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText(/can't log in yet/)).toBeVisible();
  const clientUrl = page.url();

  await page.getByRole("button", { name: "Invite to Spotter" }).click();
  const linkInput = page.getByLabel("Login link");
  await expect(linkInput).toHaveValue(/\/invite\/[A-Za-z0-9_-]{43}$/);
  const inviteLink = await linkInput.inputValue();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Invited", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create a new login link" })).toBeVisible();

  // The client opens the link in their own browser.
  const clientContext = await browser.newContext();
  const clientPage = await clientContext.newPage();
  await clientPage.goto(inviteLink);
  await expect(clientPage).toHaveURL(/\/invite\//);
  await expect(clientPage.getByText("Welcome, Avery!")).toBeVisible();
  await clientPage.getByLabel("Password").fill("client-password-1");
  await clientPage.getByRole("button", { name: "Save password" }).click();
  await expect(clientPage).toHaveURL("/portal");
  await expect(clientPage.getByText("Do 10 pull-ups.")).toBeVisible();
  await expect(clientPage.getByText("You're training with Taylor Trainer.")).toBeVisible();

  // The link only works once.
  await logOut(clientPage);
  await clientPage.goto(inviteLink);
  await expect(clientPage).toHaveURL("/link-expired");

  // Their new password works.
  await logIn(clientPage, client.email, "client-password-1");
  await expect(clientPage).toHaveURL("/portal");
  await logOut(clientPage);

  // Deleting the client removes their login.
  await page.goto(clientUrl);
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(/removes their Spotter login/)).toBeVisible();
  await page.getByRole("button", { name: "Delete client" }).click();
  await expect(page).toHaveURL("/dashboard/clients");

  await logIn(clientPage, client.email, "client-password-1");
  await expect(clientPage.getByText("That email and password don't match.")).toBeVisible();
  await clientContext.close();
});

test("clients without an email can't be invited yet", async ({ page }) => {
  const client = uniqueClient("Quinn");
  await logInAsTrainer(page);
  await page.goto("/dashboard/clients/new");
  await page.getByLabel("Name").fill(client.name);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("link", { name: "Add an email address" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Invite to Spotter" })).toBeHidden();

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete client" }).click();
  await expect(page).toHaveURL("/dashboard/clients");
});

test("trainers only see their own clients", async ({ page }) => {
  // Find one of the demo trainer's clients.
  await logInAsTrainer(page);
  await page.goto("/dashboard/clients");
  await page.getByRole("link", { name: /Morgan Lee/ }).click();
  await expect(page.getByRole("heading", { name: "Morgan Lee" })).toBeVisible();
  const morganUrl = page.url();
  await logOut(page);

  await logInAsNewTrainer(page);
  await page.goto("/dashboard/clients");
  await expect(page.getByText("No active clients yet.")).toBeVisible();
  await page.goto(morganUrl);
  await expect(page.getByText("We couldn't find that client.")).toBeVisible();
});

test("the client portal only shows the signed-in client's goals", async ({ page }) => {
  await logIn(page, "client@example.com");
  await expect(page.getByText("Run a half marathon")).toBeVisible();
  await expect(page.getByText("Deadlift 1.5x bodyweight")).toBeHidden();
});
