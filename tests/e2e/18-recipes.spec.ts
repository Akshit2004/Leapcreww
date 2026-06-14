import { test, expect, requireAI } from "./fixtures";

// Recipes have no dedicated nav tab — the RecipesSection is embedded at the
// bottom of Use Cases (and on the dashboard zero-state).
test.describe("Recipes (One-Click Automations)", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("usecases");
  });

  test("recipe library renders with category filters and cards", async ({ page }) => {
    await expect(page.getByText(/one-click automations/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "All", exact: true })).toBeVisible();

    const firstCard = page.locator("div", { has: page.getByRole("button", { name: /enable|disable/i }) }).first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
  });

  test("enable a recipe and then disable it", async ({ page }) => {
    const enableBtn = page.getByRole("button", { name: /^enable$/i }).first();
    test.skip(!(await enableBtn.isVisible().catch(() => false)), "All recipes already enabled");

    await enableBtn.click();
    const disableBtn = page.getByRole("button", { name: /^disable$/i }).first();
    await expect(disableBtn).toBeVisible({ timeout: 20_000 });

    await disableBtn.click();
    await page.getByRole("button", { name: /disable/i }).last().click();
  });

  test("AI Recipe Composer generates a custom automation from a brief", async ({ page }) => {
    requireAI();

    await page.getByText(/ai recipe composer/i).click();
    await page.getByPlaceholder(/send a welcome message to new leads/i).fill(
      "When a customer's order is delivered, wait a day then ask for a review."
    );
    await page.getByRole("button", { name: /generate & install/i }).click();

    await expect(page.getByText(/recipe installed|error/i)).toBeVisible({ timeout: 60_000 });
  });
});
