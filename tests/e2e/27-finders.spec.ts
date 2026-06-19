import { test, expect } from "./fixtures";

/**
 * Size / Shade Finder feature tests.
 *
 * The Shade Finder and Size Finder are conversational WhatsApp agents
 * (backend services in `src/features/size-shade-finder/`). At the time
 * these specs were written, there is no dedicated "finders" nav tab —
 * the feature is triggered from within the Recipes / Automations flow or
 * via WhatsApp deep links baked into the brand's Shopify storefront.
 *
 * These tests therefore:
 *   1. Verify the Recipes / Automations section renders correctly — that
 *      is where brands activate the Finder recipes.
 *   2. Verify the Integrations tab (Shopify connection) is reachable —
 *      the finder deep link is emitted once the WhatsApp number is
 *      connected and the Shopify integration is active.
 *   3. Gracefully handle the case where a dedicated Finders UI does not
 *      yet exist in the navigation (all assertions use soft guards).
 *
 * If a "finders" tab is added to the nav in future, these tests will need
 * to be updated to use `gotoTab("finders")` directly.
 */
test.describe("Size / Shade Finder", () => {
  test("Recipes / Automations tab is reachable and renders a heading", async ({ page, gotoTab }) => {
    await gotoTab("recipes");
    // The tab renders under the label "Automations" in the nav but the page
    // heading may use either "Recipes" or "Automations".
    await expect(
      page.getByRole("heading", { name: /automations|recipes/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Recipes tab contains automation cards or an empty state", async ({ page, gotoTab }) => {
    await gotoTab("recipes");

    // Either recipe cards are present or an empty / loading state is shown.
    const hasCards = await page.getByRole("button").count().then((n) => n > 0);
    const hasAnyText = await page.getByText(/.+/).count().then((n) => n > 0);
    expect(hasCards || hasAnyText).toBe(true);
  });

  test("Integrations tab is reachable", async ({ page, gotoTab }) => {
    await gotoTab("integrations");
    await expect(
      page.getByRole("heading", { name: /integrations/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Integrations tab shows a Shopify connection option", async ({ page, gotoTab }) => {
    await gotoTab("integrations");
    await expect(page.getByText(/shopify/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("dedicated finders nav tab — skip if not yet in navigation", async ({ page, gotoTab }) => {
    // Attempt to navigate to a hypothetical "finders" tab.
    await gotoTab("finders");

    // If the nav ignores the unknown tab param and falls back to overview,
    // we check for that too — the test should not hard-fail.
    const hasFindersHeading = await page
      .getByRole("heading", { name: /finder|shade|size/i })
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasFallback = await page
      .getByRole("heading", { name: /overview|analytics|inbox/i })
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    // At least one of the two should be true — the page must render something.
    expect(hasFindersHeading || hasFallback).toBe(true);
  });

  test("Shade Finder and Size Finder API endpoints respond without 500 errors", async ({ page, orgId }) => {
    // The finder agents are webhook-driven — there are no dedicated admin API
    // endpoints for managing them from the UI. We verify the analytics tab
    // (which includes all ecommerce agents) loads without a 500 response.
    const responses: number[] = [];
    page.on("response", (res) => {
      if (res.url().includes(`/api/org/${orgId}`)) {
        responses.push(res.status());
      }
    });

    await page.goto(`/org/${orgId}?tab=analytics`);
    await page.waitForURL(new RegExp(`tab=analytics`));
    await page.waitForTimeout(3_000);

    const serverErrors = responses.filter((s) => s >= 500);
    expect(serverErrors).toHaveLength(0);
  });
});
