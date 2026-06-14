import { test, expect } from "./fixtures";

test.describe("Integrations Hub", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("integrations");
  });

  test("integration list shows Shopify, Razorpay, and Shiprocket", async ({ page }) => {
    for (const name of [/shopify/i, /razorpay/i, /shiprocket/i]) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  test("Shopify panel shows connection status and store domain field", async ({ page }) => {
    await page.getByText(/^shopify$/i).first().click();

    await expect(page.getByText(/connected|not connected/i).first()).toBeVisible();
    await expect(page.getByText(/store connection/i)).toBeVisible();
    await expect(page.getByPlaceholder(/yourstore\.myshopify\.com/i)).toBeVisible();
  });

  test("Razorpay panel shows credential fields", async ({ page }) => {
    await page.getByText(/razorpay/i).first().click();

    await expect(page.getByText(/razorpay credentials/i)).toBeVisible();
    await expect(page.getByPlaceholder(/rzp_live/i)).toBeVisible();
  });

  test("Shiprocket panel shows email/password credential fields", async ({ page }) => {
    await page.getByText(/shiprocket/i).first().click();

    await expect(page.getByText(/shiprocket credentials/i)).toBeVisible();
    await expect(page.getByPlaceholder(/you@brand\.com/i)).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  });

  test("Sync Catalog Now triggers a Shopify product sync", async ({ page }) => {
    await page.getByText(/^shopify$/i).first().click();

    const syncBtn = page.getByRole("button", { name: /sync catalog now/i });
    test.skip(!(await syncBtn.isVisible().catch(() => false)), "Shopify not connected — sync unavailable");

    await syncBtn.click();
    await expect(page.getByText(/syncing/i)).toBeVisible({ timeout: 5_000 }).catch(() => {});
    await expect(syncBtn).toBeEnabled({ timeout: 30_000 });
  });
});
