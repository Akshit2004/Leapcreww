import { test, expect } from "./fixtures";

test.describe("Marketplace", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("marketplace");
  });

  test("overview renders with stats and automation toggles", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Marketplace", exact: true })).toBeVisible();
    for (const label of ["Total Products", "Active Products", "Pending Orders", "Revenue (paid)"]) {
      await expect(page.getByText(label)).toBeVisible();
    }
    await expect(page.getByText(/abandoned cart recovery/i)).toBeVisible();
  });

  test("toggle the Marketplace Automation Bot", async ({ page }) => {
    const card = page.getByText(/marketplace automation bot/i).locator("..").locator("..");
    const toggle = card.locator("button").first();
    test.skip(!(await toggle.isVisible().catch(() => false)), "Marketplace bot toggle not present");

    const before = await page.getByText(/active \/ online|disabled/i).textContent();
    await toggle.click();
    await expect(page.getByText(/active \/ online|disabled/i)).not.toHaveText(before ?? "", { timeout: 10_000 });

    // Toggle back to restore original state.
    await toggle.click();
  });

  test("set up Abandoned Cart Recovery automation", async ({ page }) => {
    const setupBtn = page.getByRole("button", { name: /set up cart recovery/i });
    if (!(await setupBtn.isVisible().catch(() => false))) {
      await expect(page.getByText(/^active$/i)).toBeVisible();
      test.skip(true, "Cart recovery sequence already configured");
    }

    await setupBtn.click();
    await expect(page.getByText(/^active$/i)).toBeVisible({ timeout: 15_000 });
  });

  test("Products tab supports search and Add Product", async ({ page }) => {
    await page.getByRole("button", { name: "Products", exact: true }).click();
    await expect(page.getByPlaceholder(/search products/i)).toBeVisible();

    const addBtn = page.getByRole("button", { name: /add product/i });
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await expect(page.getByText(/add product/i)).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });

  test("Orders tab renders order list", async ({ page }) => {
    await page.getByRole("button", { name: "Orders", exact: true }).click();
    await expect(page.getByRole("button", { name: "Orders", exact: true })).toHaveClass(/bg-stone-950/);
  });
});
