import { test, expect } from "./fixtures";

/**
 * Cart Recovery analytics — two sections live inside the analytics tab:
 *
 *   1. "Commerce" sub-nav pill → E-commerce abandoned-cart ledger (Carts Abandoned,
 *      Carts Recovered, Recovery Rate, Recovered Revenue).
 *
 *   2. "Recovery" sub-nav pill → AI Recovery Pipeline (Carts In Recovery,
 *      Recovered, Lost, Recovery Rate + intent breakdown from the analyst agent).
 *
 * Empty state is acceptable — both sections render zero-state cards when no
 * abandoned-cart data is present in the database.
 */
test.describe("Cart Recovery Analytics", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("analytics");
  });

  test("analytics header and sub-navigation pills are visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible({ timeout: 15_000 });

    for (const pill of ["Campaigns", "Agents", "ROI", "Commerce", "Recovery", "RTO / NDR"]) {
      await expect(page.getByRole("button", { name: pill, exact: true })).toBeVisible({ timeout: 15_000 });
    }
  });

  test("Commerce section shows abandoned-cart KPI cards", async ({ page }) => {
    await page.getByRole("button", { name: "Commerce", exact: true }).click();

    for (const label of ["Carts Abandoned", "Carts Recovered", "Recovery Rate", "Recovered Revenue"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });
    }
  });

  test("Commerce section shows Abandoned Checkout Recovery Ledger", async ({ page }) => {
    await page.getByRole("button", { name: "Commerce", exact: true }).click();

    await expect(page.getByText(/abandoned checkout recovery ledger/i)).toBeVisible({ timeout: 15_000 });
  });

  test("Commerce empty state renders without error when no carts exist", async ({ page }) => {
    await page.getByRole("button", { name: "Commerce", exact: true }).click();

    // Either the table headers or the empty-state message should be present
    const emptyState = page.getByText(/no abandoned checkout records detected/i);
    const tableHeader = page.getByText(/recovery status/i);

    const hasEmpty = await emptyState.isVisible({ timeout: 10_000 }).catch(() => false);
    const hasTable = await tableHeader.isVisible({ timeout: 10_000 }).catch(() => false);
    expect(hasEmpty || hasTable).toBe(true);
  });

  test("Recovery section shows AI pipeline KPI cards", async ({ page }) => {
    await page.getByRole("button", { name: "Recovery", exact: true }).click();

    for (const label of ["Carts In Recovery", "Recovered", "Lost", "Recovery Rate"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });
    }
  });

  test("Recovery section shows Analyst Intent Breakdown panel", async ({ page }) => {
    await page.getByRole("button", { name: "Recovery", exact: true }).click();

    await expect(page.getByText(/analyst intent breakdown/i)).toBeVisible({ timeout: 15_000 });
  });

  test("Recovery section shows Recent Recovery Replies panel", async ({ page }) => {
    await page.getByRole("button", { name: "Recovery", exact: true }).click();

    await expect(page.getByText(/recent recovery replies/i)).toBeVisible({ timeout: 15_000 });
  });

  test("Recovery empty states render without error when no replies exist", async ({ page }) => {
    await page.getByRole("button", { name: "Recovery", exact: true }).click();

    // Intent breakdown: either bars or empty state
    const intentEmpty = page.getByText(/no replies analysed yet/i);
    const intentBar = page.getByText(/hot|objection|not now|dead/i).first();

    const hasIntentEmpty = await intentEmpty.isVisible({ timeout: 10_000 }).catch(() => false);
    const hasIntentBar = await intentBar.isVisible({ timeout: 10_000 }).catch(() => false);
    expect(hasIntentEmpty || hasIntentBar).toBe(true);
  });
});
