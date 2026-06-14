import { test, expect } from "./fixtures";

test.describe("Analytics & Attribution", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("analytics");
  });

  test("overview renders with header and time range filters", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /analytics overview/i })).toBeVisible();
    for (const label of ["7 Days", "30 Days", "All Time"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  test("AI Analytics Narrator briefing loads", async ({ page }) => {
    await expect(page.getByText(/ai analytics narrator & diagnostic brief/i)).toBeVisible();
    await expect(
      page.getByText(/revenue performance|no revenue performance telemetry recorded/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("Recalculate Brief refreshes the narrator", async ({ page }) => {
    await page.getByTitle(/recalculate brief/i).click();
    await expect(
      page.getByText(/revenue performance|no revenue performance telemetry recorded/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("Campaign Performance section shows KPI cards and funnel", async ({ page }) => {
    await page.getByRole("button", { name: /campaign performance/i }).click();

    for (const label of ["Total Messages Sent", "Messages Delivered", "Messages Read", "Link Clicks"]) {
      await expect(page.getByText(label)).toBeVisible();
    }
    await expect(page.getByText(/campaign delivery funnel/i)).toBeVisible();
  });

  test("Agent Latency Matrix section shows handler stats", async ({ page }) => {
    await page.getByRole("button", { name: /agent latency matrix/i }).click();

    for (const label of ["Active Team Handlers", "Avg Operational Latency", "Agent-Attributed Sales", "Agent-Attributed Revenue"]) {
      await expect(page.getByText(label)).toBeVisible();
    }
    await expect(page.getByText(/agent response latency & conversational volume matrix/i)).toBeVisible();
  });

  test("Attribution & ROI Ledger toggles between Campaigns and Sequences", async ({ page }) => {
    await page.getByRole("button", { name: /attribution & roi ledger/i }).click();

    await expect(page.getByText(/attributed sales revenue/i)).toBeVisible();
    await expect(page.getByText(/campaign attribution & roi performance matrix/i)).toBeVisible();

    await page.getByRole("button", { name: "Sequences", exact: true }).click();
    await expect(page.getByText(/sequence attribution & roi performance matrix/i)).toBeVisible();
    await expect(page.getByText(/aggregate sequence roi/i)).toBeVisible();
  });

  test("E-Commerce & Abandoned Carts section shows recovery ledger", async ({ page }) => {
    await page.getByRole("button", { name: /e-commerce & abandoned carts/i }).click();

    for (const label of ["Carts Abandoned", "Carts Recovered", "Recovery Rate", "Recovered Revenue"]) {
      await expect(page.getByText(label)).toBeVisible();
    }
    await expect(page.getByText(/abandoned checkout recovery ledger/i)).toBeVisible();
  });
});
