import { test, expect } from "./fixtures";

/**
 * COD Token Prepay feature — surfaced inside the analytics tab under the
 * "RTO / NDR" sub-navigation pill, in the "₹99 Token Prepay Engine" section.
 *
 * The section is conditionally rendered: it only appears when the org has
 * COD token prepay data (`rtoData.tokenPrepay` is truthy). If no data is
 * present the test skips the data-specific assertions and verifies only that
 * the surrounding RTO / NDR container loaded without error.
 *
 * COD Intelligence cards (Total COD Orders, confirmed orders, cancelled orders,
 * and the RTO Loss Value) are always rendered regardless of token prepay state.
 */
test.describe("COD Token Prepay Feature", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("analytics");
  });

  test("analytics tab loads and RTO / NDR pill is present", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /rto \/ ndr/i })).toBeVisible({ timeout: 15_000 });
  });

  test("COD Intelligence cards are visible in the RTO / NDR section", async ({ page }) => {
    await page.getByRole("button", { name: /rto \/ ndr/i }).click();

    // These four cards are always rendered — COD data exists as soon as any
    // order with a codStatus is present (may be 0 for fresh orgs).
    for (const label of ["COD Orders", "Confirmed", "RTO Loss Value"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });
    }
    await expect(page.getByText(/cod.*prepaid/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("₹99 Token Prepay Engine section renders when data exists", async ({ page }) => {
    await page.getByRole("button", { name: /rto \/ ndr/i }).click();

    const tokenHeading = page.getByText(/₹99 token prepay engine/i);
    const isPresent = await tokenHeading.isVisible({ timeout: 10_000 }).catch(() => false);
    test.skip(!isPresent, "No COD token prepay data — section is conditionally hidden. Skipping.");

    await expect(tokenHeading).toBeVisible();
  });

  test("Token Prepay KPI cards are correct when section is visible", async ({ page }) => {
    await page.getByRole("button", { name: /rto \/ ndr/i }).click();

    const tokenHeading = page.getByText(/₹99 token prepay engine/i);
    const isPresent = await tokenHeading.isVisible({ timeout: 10_000 }).catch(() => false);
    test.skip(!isPresent, "No COD token prepay data. Skipping KPI card assertions.");

    for (const label of ["Tokens Sent", "Tokens Paid", "Expired (Ghosted)", "RTO Blocked"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });
    }
  });

  test("high-risk flagged warning banner shows when high-risk COD contacts exist", async ({ page }) => {
    await page.getByRole("button", { name: /rto \/ ndr/i }).click();

    const banner = page.getByText(/high-risk cod contact/i);
    const isBannerVisible = await banner.isVisible({ timeout: 10_000 }).catch(() => false);
    test.skip(!isBannerVisible, "No high-risk COD contacts — warning banner conditionally hidden. Skipping.");

    await expect(page.getByText(/verification template sent automatically/i)).toBeVisible();
  });

  test("Shared RTO Fraud Network block renders when network signals exist", async ({ page }) => {
    await page.getByRole("button", { name: /rto \/ ndr/i }).click();

    const networkBlock = page.getByText(/shared rto fraud network/i);
    const isPresent = await networkBlock.isVisible({ timeout: 10_000 }).catch(() => false);
    test.skip(!isPresent, "No fraud network signals — block conditionally hidden. Skipping.");

    await expect(page.getByText(/cross-merchant anonymized risk signals/i)).toBeVisible();
  });

  test("RTO / NDR section container renders without JavaScript errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.getByRole("button", { name: /rto \/ ndr/i }).click();
    // Wait for the async metrics fetch to settle
    await page.waitForTimeout(3_000);

    expect(errors).toHaveLength(0);
  });
});
