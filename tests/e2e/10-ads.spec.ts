import { test, expect, requireAI } from "./fixtures";

test.describe("Ads (Click-to-WhatsApp Meta Ads)", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("ads");
  });

  test("ads list renders with header and create CTA", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /click-to-whatsapp ads/i })).toBeVisible();
    const createBtn = page
      .getByRole("button", { name: /create ad campaign/i })
      .or(page.getByRole("button", { name: /launch campaign wizard/i }));
    await expect(createBtn.first()).toBeVisible();
  });

  test("launch campaign wizard walks through all 4 steps", async ({ page }) => {
    const createBtn = page
      .getByRole("button", { name: /create ad campaign/i })
      .or(page.getByRole("button", { name: /launch campaign wizard/i }));
    await createBtn.first().click();

    await expect(page.getByText(/meta ads integration wizard/i)).toBeVisible();

    // Step 1: Details
    await page.getByPlaceholder(/lead gen - summer discount ads/i).fill(`E2E Ad Campaign ${Date.now()}`);
    // exact: true avoids matching the Next.js dev tools button ("Open Next.js Dev Tools").
    const nextBtn = page.getByRole("button", { name: "Next", exact: true });
    await nextBtn.click();

    // Step 2: AI Creative
    await expect(page.getByText(/describe the ad topic \/ offer/i)).toBeVisible();
    // The "Headline" label has no htmlFor, so target the input by placeholder.
    await page.getByPlaceholder(/generated headline/i).fill("Big Summer Sale");
    await page.locator("textarea").nth(1).fill("Get 20% off everything this week only!");
    await nextBtn.click();

    // Step 3: Welcome Trigger
    await expect(page.getByText(/set whatsapp welcome flow/i)).toBeVisible();
    await nextBtn.click();

    // Step 4: Review & Publish
    await expect(page.getByText(/campaign ledger/i)).toBeVisible();
    await expect(page.getByText(/facebook mobile feed preview/i)).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("AI Creative Generator produces ad copy from a topic", async ({ page }) => {
    requireAI();

    const createBtn = page
      .getByRole("button", { name: /create ad campaign/i })
      .or(page.getByRole("button", { name: /launch campaign wizard/i }));
    await createBtn.first().click();

    await page.getByPlaceholder(/lead gen - summer discount ads/i).fill(`E2E AI Ad Campaign ${Date.now()}`);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await page.getByPlaceholder(/50% discount on summer shoes/i).fill("50% off all handmade candles this weekend");
    await page.getByRole("button", { name: /generate copy & prompt/i }).click();

    await expect(page.getByPlaceholder(/generated headline/i)).not.toHaveValue("", { timeout: 60_000 });
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("delete an ad campaign", async ({ page }) => {
    const deleteBtn = page.getByTitle(/delete campaign/i).first();
    test.skip(!(await deleteBtn.isVisible().catch(() => false)), "No ad campaigns exist to delete");

    await deleteBtn.click();
  });
});
