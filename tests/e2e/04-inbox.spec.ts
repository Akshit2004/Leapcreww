import { test, expect } from "./fixtures";

test.describe("Inbox (Unified Conversations)", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("inbox");
  });

  test("conversation list renders with filter tabs", async ({ page }) => {
    await expect(page.getByPlaceholder("Search contacts...")).toBeVisible();
    for (const label of ["All", "Mine", "Open", "Bot"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  test("selecting a conversation reveals the composer", async ({ page }) => {
    const firstContact = page.locator("button:has(h4)").first();
    test.skip(!(await firstContact.isVisible().catch(() => false)), "No conversations to open");

    await firstContact.click();
    await expect(page.getByPlaceholder("Type a message…")).toBeVisible({ timeout: 10_000 });
  });

  test("send a text message from the composer", async ({ page }) => {
    const firstContact = page.locator("button:has(h4)").first();
    test.skip(!(await firstContact.isVisible().catch(() => false)), "No conversations to open");
    await firstContact.click();

    const composer = page.getByPlaceholder("Type a message…");
    await expect(composer).toBeVisible({ timeout: 10_000 });

    const text = `E2E test message ${Date.now()}`;
    await composer.fill(text);
    await composer.press("Enter").catch(async () => {
      await page.locator('form button[type="submit"]').click();
    });

    await expect(page.getByText(text)).toBeVisible({ timeout: 15_000 });
  });

  test("canned replies picker opens from the lightning-bolt button", async ({ page }) => {
    const firstContact = page.locator("button:has(h4)").first();
    test.skip(!(await firstContact.isVisible().catch(() => false)), "No conversations to open");
    await firstContact.click();

    await page.getByTitle(/canned replies/i).click();
    await expect(page.getByText(/canned replies/i)).toBeVisible({ timeout: 10_000 });
  });

  test("internal note mode toggles a distinct amber composer", async ({ page }) => {
    const firstContact = page.locator("button:has(h4)").first();
    test.skip(!(await firstContact.isVisible().catch(() => false)), "No conversations to open");
    await firstContact.click();

    await page.getByTitle(/switch to note mode/i).click();
    await expect(page.getByPlaceholder(/write internal note/i)).toBeVisible({ timeout: 10_000 });

    const note = `E2E internal note ${Date.now()}`;
    await page.getByPlaceholder(/write internal note/i).fill(note);
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByText(note)).toBeVisible({ timeout: 15_000 });
  });

  test("AI reply suggestions render for the active conversation", async ({ page }) => {
    const firstContact = page.locator("button:has(h4)").first();
    test.skip(!(await firstContact.isVisible().catch(() => false)), "No conversations to open");
    await firstContact.click();

    await expect(
      page.getByText(/drafting suggestions|no suggestions available/i).or(
        page.locator("button.rounded-lg.text-stone-700")
      )
    ).toBeVisible({ timeout: 20_000 });
  });
});
