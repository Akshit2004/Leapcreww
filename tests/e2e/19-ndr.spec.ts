import { test, expect } from "./fixtures";

test.describe("NDR (Non-Delivery Report) Events", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("ndr");
  });

  test("NDR Events page renders with stats bar and filter tabs", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /ndr events/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh/i })).toBeVisible();

    for (const label of ["Total Events", "Pending", "Rescued", "RTO Risk"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    for (const label of ["All", "Pending", "Rescued", "Cancelled"]) {
      await expect(page.getByRole("button", { name: new RegExp(`^${label}`, "i") })).toBeVisible();
    }
  });

  test("Refresh reloads NDR events", async ({ page }) => {
    await page.getByRole("button", { name: /refresh/i }).click();
    await expect(page.getByRole("button", { name: /refresh/i })).toBeEnabled({ timeout: 15_000 });
  });

  test("filter tabs switch the visible event list", async ({ page }) => {
    await page.getByRole("button", { name: /^pending/i }).click();
    await expect(
      page.getByText(/no pending events|awb \/ order/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /^all/i }).click();
    await expect(
      page.getByText(/no ndr events yet|awb \/ order/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("empty state shows guidance to connect courier webhook", async ({ page }) => {
    const emptyState = page.getByText(/no ndr events yet/i);
    test.skip(!(await emptyState.isVisible().catch(() => false)), "NDR events exist — skipping empty-state check");

    await expect(page.getByText(/connect your courier webhook/i)).toBeVisible();
  });
});
