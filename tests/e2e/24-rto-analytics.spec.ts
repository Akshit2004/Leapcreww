import { test, expect } from "./fixtures";

/**
 * RTO / NDR Analytics section — lives inside the analytics tab
 * under the "RTO / NDR" sub-navigation pill.
 *
 * The section shows two groups of KPI cards:
 *   NDR Recovery — Total NDRs, Rescued, Pending, Avg Attempts
 *   COD Intelligence — COD Orders, Confirmed, COD → Prepaid, RTO Loss Value
 *
 * Empty state is acceptable: cards render with "0" values when no order data
 * is present. The test does not assert exact numbers.
 */
test.describe("RTO / NDR Analytics", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("analytics");
  });

  test("analytics tab renders with time range selector", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible({ timeout: 15_000 });

    for (const label of ["7 Days", "30 Days", "All Time"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  test("RTO / NDR sub-nav pill is visible and clickable", async ({ page }) => {
    const rtoButton = page.getByRole("button", { name: /rto \/ ndr/i });
    await expect(rtoButton).toBeVisible({ timeout: 15_000 });
    await rtoButton.click();
  });

  test("NDR Recovery KPI cards render after clicking RTO / NDR", async ({ page }) => {
    await page.getByRole("button", { name: /rto \/ ndr/i }).click();

    for (const label of ["Total NDRs", "Rescued", "Pending", "Avg Attempts"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });
    }
  });

  test("COD Intelligence KPI cards render in RTO / NDR section", async ({ page }) => {
    await page.getByRole("button", { name: /rto \/ ndr/i }).click();

    for (const label of ["COD Orders", "Confirmed", "RTO Loss Value"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });
    }

    // "COD → Prepaid" may render with or without the arrow character
    await expect(page.getByText(/cod.*prepaid/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("NDR Recovery and COD Intelligence sub-headers are present", async ({ page }) => {
    await page.getByRole("button", { name: /rto \/ ndr/i }).click();

    await expect(page.getByText(/ndr recovery/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/cod intelligence/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("token prepay engine section renders when data is available", async ({ page }) => {
    await page.getByRole("button", { name: /rto \/ ndr/i }).click();

    // The token prepay section only renders when rtoData.tokenPrepay is populated.
    // If it isn't, the test is skipped gracefully.
    const tokenSection = page.getByText(/₹99 token prepay engine/i);
    const isPresent = await tokenSection.isVisible({ timeout: 10_000 }).catch(() => false);
    test.skip(!isPresent, "No token prepay data — section conditionally hidden. Skipping.");

    await expect(page.getByText("Tokens Sent", { exact: true })).toBeVisible();
    await expect(page.getByText("Tokens Paid", { exact: true })).toBeVisible();
  });

  test("time range buttons affect the displayed data without crashing", async ({ page }) => {
    await page.getByRole("button", { name: /rto \/ ndr/i }).click();
    await expect(page.getByText("Total NDRs", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Switch time range — page should not error
    await page.getByRole("button", { name: "7 Days", exact: true }).click();
    await expect(page.getByText("Total NDRs", { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "30 Days", exact: true }).click();
    await expect(page.getByText("Total NDRs", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});
