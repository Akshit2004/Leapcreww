import { test, expect } from "./fixtures";

test.describe("Launches (Flash Sale & Countdown Sequences)", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("launches");
  });

  test("launches list renders with Create Launch CTA", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /flash sale & launch sequences/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create launch/i }).first()).toBeVisible();
  });

  test("create a new launch sequence", async ({ page }) => {
    await page.getByRole("button", { name: /create launch/i }).first().click();
    await expect(page.getByText(/new launch sequence/i)).toBeVisible();

    const name = `E2E Launch ${Date.now()}`;
    await page.getByPlaceholder(/summer drop 2026/i).fill(name);
    await page.getByPlaceholder(/what are you launching/i).fill("E2E test product launch");
    await page.getByPlaceholder(/yourstore\.com\/product/i).fill("https://example.com/product");

    const future = new Date(Date.now() + 2 * 86_400_000);
    const localIso = new Date(future.getTime() - future.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    await page.locator('input[type="datetime-local"]').fill(localIso);

    await page.getByRole("button", { name: /create launch/i }).last().click();
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("view steps and save an edited launch message", async ({ page }) => {
    const viewStepsBtn = page.getByRole("button", { name: /view steps/i }).first();
    test.skip(!(await viewStepsBtn.isVisible().catch(() => false)), "No launches exist");

    await viewStepsBtn.click();
    await expect(page.getByText(/\d+ steps/i)).toBeVisible();

    const textarea = page.locator("textarea").first();
    await textarea.fill("Updated E2E launch message copy.");
    await page.getByRole("button", { name: /save messages/i }).click();
  });

  test("activate a draft launch", async ({ page }) => {
    const activateBtn = page.getByRole("button", { name: /^activate$/i }).first();
    test.skip(!(await activateBtn.isVisible().catch(() => false)), "No draft launches to activate");

    await activateBtn.click();
    await expect(activateBtn).not.toBeVisible({ timeout: 15_000 });
  });

  test("delete a draft launch", async ({ page }) => {
    const deleteBtn = page.locator('button:has(svg.lucide-trash-2)').first();
    test.skip(!(await deleteBtn.isVisible().catch(() => false)), "No draft launches to delete");

    await deleteBtn.click();
  });
});
