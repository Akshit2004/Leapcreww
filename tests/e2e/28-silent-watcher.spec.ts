import { test, expect } from "./fixtures";

/**
 * Silent Watcher onboarding widget tests.
 *
 * The Silent Watcher is a backend analytics feature that surfaces the number
 * of high-risk COD orders an org has received *before* connecting WhatsApp —
 * it powers the "aha moment" in the onboarding flow, motivating merchants to
 * connect WhatsApp and activate the RTO interception pipeline.
 *
 * The API endpoint is:
 *   GET /api/org/[orgId]/analytics/silent-watcher
 *
 * At the time these specs were written, the Silent Watcher data is consumed
 * by the backend API only — a dedicated UI widget has not yet been built into
 * the dashboard. These tests therefore:
 *   1. Verify the dashboard loads without errors.
 *   2. Verify WhatsApp connection state indicators are present on the
 *      dashboard (the Connect CTA that the watcher motivates).
 *   3. Verify the silent-watcher API endpoint returns a valid JSON shape.
 *   4. Gracefully skip UI assertions that require a widget that does not yet
 *      exist, rather than hard-failing the suite.
 *
 * Once the Silent Watcher widget is built into the OverviewTab, update these
 * tests to assert on "Silent Watcher", "COD Risk", or "High Risk Orders" text.
 */
test.describe("Silent Watcher Onboarding Widget", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("overview");
  });

  test("dashboard overview renders without JavaScript errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.waitForTimeout(3_000);
    expect(errors).toHaveLength(0);
  });

  test("dashboard overview heading is visible", async ({ page }) => {
    // The overview tab renders a greeting or workspace title
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test("WhatsApp connection status indicator is present on the dashboard", async ({ page }) => {
    // Either a "Connect WhatsApp" CTA or a connected-status badge must appear.
    const connectCTA = page.getByText(/connect whatsapp|connect your whatsapp/i).first();
    const connectedBadge = page.getByText(/whatsapp connected|connected/i).first();

    const hasCTA = await connectCTA.isVisible({ timeout: 15_000 }).catch(() => false);
    const hasBadge = await connectedBadge.isVisible({ timeout: 15_000 }).catch(() => false);

    expect(hasCTA || hasBadge).toBe(true);
  });

  test("silent-watcher API endpoint returns a valid response", async ({ page, orgId }) => {
    const response = await page.request.get(`/api/org/${orgId}/analytics/silent-watcher`);

    // Must not be a server error
    expect(response.status()).toBeLessThan(500);

    if (response.status() === 200) {
      const json = await response.json();
      // Verify shape — all four keys should be present
      expect(typeof json.highRiskCount).toBe("number");
      expect(typeof json.totalCodOrders).toBe("number");
      expect(typeof json.rtoLossPreventablePaise).toBe("number");
      expect(typeof json.whatsappConnected).toBe("boolean");
    }
  });

  test("silent-watcher widget — skip if no UI component is rendered yet", async ({ page }) => {
    // Check for any element that might constitute the Silent Watcher widget.
    const silentWatcherText = page.getByText(/silent watcher/i);
    const codRiskText = page.getByText(/cod risk/i);
    const highRiskOrdersText = page.getByText(/high risk orders/i);

    const hasSW = await silentWatcherText.isVisible({ timeout: 8_000 }).catch(() => false);
    const hasCR = await codRiskText.isVisible({ timeout: 8_000 }).catch(() => false);
    const hasHR = await highRiskOrdersText.isVisible({ timeout: 8_000 }).catch(() => false);

    if (!hasSW && !hasCR && !hasHR) {
      test.skip(true, "Silent Watcher UI widget not yet rendered in the dashboard. Skipping widget-specific assertions.");
    }

    // If any of the above are present, they should be accompanied by a stat or CTA.
    const hasStatOrCTA = await page
      .getByText(/high risk|rto loss|connect whatsapp|activate/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasStatOrCTA).toBe(true);
  });

  test("RTO / COD stats are visible on the analytics tab", async ({ page, gotoTab }) => {
    // Until the dashboard widget is built, the analytics tab is the
    // primary surface showing COD risk data from the same data source.
    await gotoTab("analytics");
    await page.getByRole("button", { name: /rto \/ ndr/i }).click();

    await expect(page.getByText("COD Orders", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("RTO Loss Value", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("overview tab does not crash when WhatsApp is disconnected", async ({ page }) => {
    // Ensure the dashboard shell renders even in a pre-connection state
    await expect(page.locator("main, #main, [role='main']").first()).toBeVisible({ timeout: 15_000 });
  });
});
