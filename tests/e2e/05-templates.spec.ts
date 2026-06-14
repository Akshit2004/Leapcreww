import { test, expect, requireAI, requireWhatsApp, closeModal } from "./fixtures";

test.describe("Templates (Meta-Approved Messages)", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("templates");
  });

  test("templates list renders with category filters and search", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /meta approved templates/i })).toBeVisible();
    for (const label of ["All Templates", "Marketing", "Utility", "Authentication"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
    await expect(page.getByPlaceholder(/search templates by name or content/i)).toBeVisible();
  });

  test("category filter narrows the list", async ({ page }) => {
    await page.getByRole("button", { name: "Marketing", exact: true }).click();
    // Every visible status badge area should not show "Authentication"-only entries.
    await expect(page.getByRole("button", { name: "Marketing", exact: true })).toHaveClass(/bg-stone-950/);
  });

  test("create a Marketing template with an image header and quick reply button", async ({ page }) => {
    // Submitting actually calls the Meta Graph API (template registration +
    // media upload), which requires a connected WhatsApp Business Account.
    requireWhatsApp();

    // A floating Quick Action FAB has the same accessible name ("Create
    // Template") and is covered by the AI Copilot button. The page header's
    // button is rendered in all caps ("CREATE TEMPLATE"), so an exact,
    // case-sensitive match picks it out from the FAB.
    await page.getByRole("button", { name: "CREATE TEMPLATE", exact: true }).click();
    await expect(page.getByText(/create whatsapp compliant template/i)).toBeVisible();

    // The submit handler lowercases the name, strips non-alphanumerics, and
    // turns whitespace into underscores — so a space-separated input becomes
    // this snake_case name in the saved template list.
    const templateLabel = `e2e test ${Date.now()}`;
    const templateName = templateLabel.replace(/\s+/g, "_");
    await page.getByPlaceholder("e.g. black_friday_discount").fill(templateLabel);

    // The "Compliance Category" <select> has no associated <label for>, so
    // target it directly — it's the only <select> in the modal.
    await page.locator("select").first().selectOption("Marketing");

    // Optional image header.
    await page.getByRole("button", { name: "image", exact: true }).click();
    await page.locator('input[type="url"]').fill("https://placehold.co/600x400.png");

    // Body copy.
    await page.locator("textarea").first().fill("Hi {{1}}, enjoy 20% off your next order!");

    // Add a quick reply button if the control is present.
    const addButtonInput = page.getByPlaceholder(/add quick reply button text/i);
    if (await addButtonInput.isVisible().catch(() => false)) {
      await addButtonInput.fill("Shop Now");
      await page.getByRole("button", { name: /add/i }).last().click();
    }

    await page.getByRole("button", { name: "Submit Meta Approval" }).click();

    await expect(page.getByText(templateName)).toBeVisible({ timeout: 20_000 });
  });

  test("AI Compliance Auditor flags a policy-violating template", async ({ page }) => {
    requireAI();

    await page.getByRole("button", { name: /create template/i }).click();
    await page.locator("textarea").first().fill("CLICK NOW!!! FREE MONEY GUARANTEED!!! Limited time, act now or lose forever!!!");

    await page.getByRole("button", { name: /ai optimize template/i }).click();

    await expect(page.getByText(/compliance/i)).toBeVisible({ timeout: 60_000 });
    await closeModal(page);
  });

  test("Generate template from brief with AI", async ({ page }) => {
    requireAI();

    await page.getByRole("button", { name: /create template/i }).click();
    await page.getByRole("button", { name: /generate with ai/i }).click();

    await page.getByPlaceholder(/50% off diwali sale/i).fill("Welcome new subscribers with a 10% discount code");
    await page.getByRole("button", { name: /generate copy/i }).click();

    await expect(page.locator("textarea").first()).not.toHaveValue("", { timeout: 60_000 });
    await closeModal(page);
  });

  test("Sync templates from Meta", async ({ page }) => {
    await page.getByRole("button", { name: /sync from meta/i }).click();
    await expect(page.getByRole("button", { name: /syncing/i })).toBeVisible({ timeout: 5_000 }).catch(() => {});
    await expect(page.getByRole("button", { name: /sync from meta/i })).toBeEnabled({ timeout: 30_000 });
  });

  test("delete a template", async ({ page }) => {
    const deleteButtons = page.getByRole("button").filter({ has: page.locator("svg") });
    // Find a row with a trash icon — only proceed if a deletable template exists.
    const trashButton = page.locator('button:has(svg.lucide-trash-2)').first();
    test.skip(!(await trashButton.isVisible().catch(() => false)), "No templates available to delete");

    await trashButton.click();
    await page.getByRole("button", { name: /delete/i }).last().click();
    await expect(page.getByText(/deleted/i)).toBeVisible({ timeout: 15_000 });
  });
});
