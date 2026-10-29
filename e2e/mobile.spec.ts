import { expect, test } from "@playwright/test";
import { logInAsTrainer } from "./helpers";

test("the trainer area works on a phone", async ({ page }) => {
  await logInAsTrainer(page);
  await expect(page.locator("aside")).toBeHidden();

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Clients" }).click();
  await expect(page).toHaveURL("/dashboard/clients");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("link", { name: /Casey Client/ })).toBeVisible();

  await page.getByRole("link", { name: /Casey Client/ }).click();
  await expect(page.getByRole("heading", { name: "Casey Client" })).toBeVisible();

  for (const path of ["/dashboard", "/dashboard/clients", "/dashboard/clients/new"]) {
    await page.goto(path);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth, `${path} scrolls sideways`).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
});
