import { expect, test, type Page } from "@playwright/test";
import {
  addInvitedClient,
  deleteClient,
  logInAsTrainer,
  logOut,
  logInAsNewTrainer,
  uniqueClient,
} from "./helpers";

// The open dialog, so its fields don't clash with hidden pages' fields.
const dialog = (page: Page) => page.getByRole("dialog");

async function addExerciseToWorkout(
  page: Page,
  workout: string,
  exercise: string,
  details: { sets: string; reps: string; weight?: string; rest?: string },
) {
  const card = page.locator('[data-slot="card"]', { hasText: workout }).filter({ visible: true });
  await card.getByRole("button", { name: "Add exercise" }).click();
  await dialog(page).getByLabel("Exercise").selectOption({ label: exercise });
  await dialog(page).getByLabel("Sets").fill(details.sets);
  await dialog(page).getByLabel("Reps").fill(details.reps);
  if (details.weight) await dialog(page).getByLabel("Weight").fill(details.weight);
  if (details.rest) await dialog(page).getByLabel("Rest").fill(details.rest);
  await dialog(page).getByRole("button", { name: "Add exercise" }).click();
  await expect(dialog(page)).toBeHidden();
}

test("trainers can build a program and share it with a client", async ({ page, browser }) => {
  // A long journey: invite a client, build a program, share it, clean up.
  test.slow();
  const programName = uniqueClient("Program").name;
  await logInAsTrainer(page);
  const client = await addInvitedClient(page, browser, "Blake");

  // Create the program.
  await page.goto("/dashboard/programs");
  await page.getByRole("link", { name: "New program" }).click();
  await page.getByLabel("Name").fill(programName);
  await page.getByLabel("Description").fill("Twice a week, leave 2 reps in the tank.");
  await page.getByLabel("Length in weeks").fill("4");
  await page.getByRole("button", { name: "Create program" }).click();
  await expect(page.getByRole("heading", { name: programName })).toBeVisible();
  await expect(page.getByText("4 weeks", { exact: true })).toBeVisible();

  // Add a workout with two exercises.
  await page.getByRole("button", { name: "Add workout" }).click();
  await expect(dialog(page).getByLabel("Name")).toHaveValue("Day 1");
  await dialog(page).getByRole("button", { name: "Add workout" }).click();
  await expect(page.getByText("No exercises yet.")).toBeVisible();

  await addExerciseToWorkout(page, "Day 1", "Goblet squat", { sets: "4", reps: "8", weight: "20 kg", rest: "90s" });
  await expect(page.getByText("4 × 8 · 20 kg · rest 90s")).toBeVisible();
  await addExerciseToWorkout(page, "Day 1", "Plank", { sets: "3", reps: "30s" });
  await expect(page.getByText("3 × 30s")).toBeVisible();

  // Reorder: move the plank first.
  await page.getByRole("button", { name: "Move Plank up" }).click();
  const rows = page.locator("ol > li").filter({ visible: true });
  await expect(rows.first()).toContainText("Plank");

  // Edit an exercise.
  await page.getByRole("button", { name: "Edit Goblet squat" }).click();
  await dialog(page).getByLabel("Weight").fill("22 kg");
  await dialog(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByText("4 × 8 · 22 kg · rest 90s")).toBeVisible();

  // Add, rename and delete a second workout.
  await page.getByRole("button", { name: "Add workout" }).click();
  await dialog(page).getByRole("button", { name: "Add workout" }).click();
  await page.getByRole("button", { name: "Rename Day 2" }).click();
  await dialog(page).getByLabel("Name").fill("Day 2: Conditioning");
  await dialog(page).getByRole("button", { name: "Save" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByText("Day 2: Conditioning")).toBeVisible();
  await page.getByRole("button", { name: "Delete Day 2: Conditioning" }).click();
  await page.getByRole("button", { name: "Delete workout" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByText("Day 2: Conditioning", { exact: true })).toBeHidden();

  // Share with the client.
  const programUrl = page.url();
  await page.getByLabel("Client to share with").selectOption({ label: client.name });
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("link", { name: client.name })).toBeVisible();

  // The client sees it in their portal.
  const { clientPage } = client;
  await clientPage.goto("/portal/program");
  await expect(clientPage.getByRole("heading", { name: programName })).toBeVisible();
  await expect(clientPage.getByText("Twice a week, leave 2 reps in the tank.")).toBeVisible();
  await expect(clientPage.getByText("4 × 8 · 22 kg · rest 90s")).toBeVisible();
  await clientPage.getByText("How to do it").first().click();
  await expect(clientPage.getByText(/Forearms on the floor/)).toBeVisible();
  await clientPage.goto("/portal");
  await expect(clientPage.getByText(`${programName} · 1 workout`)).toBeVisible();

  // Duplicate, then delete the copy.
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByRole("heading", { name: `${programName} (copy)` })).toBeVisible();
  // The original program's page is still mounted (hidden), so look at visible text only.
  await expect(page.getByText("4 × 8 · 22 kg · rest 90s").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Not shared with anyone yet.").filter({ visible: true })).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete program" }).click();
  await expect(page).toHaveURL("/dashboard/programs");

  // Stop sharing from the client's page; the client no longer sees it.
  await page.goto(client.clientUrl);
  await page.getByRole("button", { name: `Stop sharing ${programName}` }).click();
  await page.getByRole("button", { name: "Stop sharing" }).click();
  await expect(page.getByText("No programs shared yet.")).toBeVisible();
  await clientPage.goto("/portal/program");
  await expect(clientPage.getByText("No program yet.")).toBeVisible();

  // Clean up.
  await page.goto(programUrl);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete program" }).click();
  await expect(page).toHaveURL("/dashboard/programs");
  await deleteClient(page, client.clientUrl);
  await client.context.close();
});

test("trainers can manage their exercise library", async ({ page }) => {
  const name = uniqueClient("Sled push").name;
  await logInAsTrainer(page);
  await page.goto("/dashboard/programs");
  await page.getByRole("link", { name: "Exercise library" }).click();
  await expect(page).toHaveURL("/dashboard/programs/exercises");

  await page.getByRole("button", { name: "Add exercise" }).click();
  await dialog(page).getByLabel("Name").fill(name);
  await dialog(page).getByLabel("Category").fill("Conditioning");
  await dialog(page).getByLabel("How to do it").fill("Drive through the floor with short steps.");
  await dialog(page).getByRole("button", { name: "Add exercise" }).click();
  await expect(dialog(page)).toBeHidden();

  await page.getByLabel("Search exercises").fill(name);
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByText("Goblet squat")).toBeHidden();

  // Names must be unique.
  await page.getByRole("button", { name: "Add exercise" }).click();
  await dialog(page).getByLabel("Name").fill("goblet squat");
  await dialog(page).getByRole("button", { name: "Add exercise" }).click();
  await expect(dialog(page).getByText("You already have an exercise with that name.")).toBeVisible();
  await page.keyboard.press("Escape");

  // Edit, then delete.
  await page.getByRole("button", { name: `Edit ${name}` }).click();
  await dialog(page).getByLabel("How to do it").fill("Low hips, short powerful steps.");
  await dialog(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByText("Low hips, short powerful steps.")).toBeVisible();
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await page.getByRole("button", { name: "Delete exercise" }).click();
  await expect(page.getByText("No exercises match your search.")).toBeVisible();

  // Exercises used in a program can't be deleted.
  await page.getByLabel("Search exercises").fill("Goblet squat");
  await expect(page.getByRole("button", { name: "Edit Goblet squat" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete Goblet squat" })).toBeHidden();
});

test("new trainers can start from the starter exercises", async ({ page }) => {
  await logInAsNewTrainer(page);
  await page.goto("/dashboard/programs/exercises");
  await expect(page.getByText("Your exercise library is empty.")).toBeVisible();
  await page.getByRole("button", { name: "Add starter exercises" }).click();
  await expect(page.getByText("29 exercises")).toBeVisible();
  await expect(page.getByText("Bulgarian split squat")).toBeVisible();
});

test("trainers only see their own programs", async ({ page }) => {
  await logInAsTrainer(page);
  await page.goto("/dashboard/programs");
  await page.getByRole("link", { name: /Half marathon strength/ }).click();
  await expect(page.getByRole("heading", { name: "Half marathon strength" })).toBeVisible();
  const programUrl = page.url();
  await logOut(page);

  await logInAsNewTrainer(page);
  await page.goto("/dashboard/programs");
  await expect(page.getByText("No programs yet.")).toBeVisible();
  await page.goto(programUrl);
  await expect(page.getByText("We couldn't find that program.")).toBeVisible();
});

test("the demo client sees the program shared with them", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("client@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("link", { name: /My program/ }).first().click();
  await expect(page.getByRole("heading", { name: "Half marathon strength" })).toBeVisible();
  await expect(page.getByText("Day 1: Lower body")).toBeVisible();
  await expect(page.getByText("Beginner full body")).toBeHidden();
});
