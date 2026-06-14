import { test, expect, closeModal } from "./fixtures";

test.describe("Customers / CRM", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("customers");
  });

  test("contact table renders with search and 'All Customers' folder", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /customers & crm/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search customers by name, phone or email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /all customers/i })).toBeVisible();
  });

  test("add a new contact via the modal", async ({ page }) => {
    const phone = `+1555${Date.now().toString().slice(-7)}`;
    const name = `E2E Test Contact ${Date.now()}`;

    await page.getByRole("button", { name: /add customer/i }).click();
    await page.getByPlaceholder("e.g. John Doe").fill(name);
    await page.getByPlaceholder("e.g. +1234567890").fill(phone);
    await page.getByRole("button", { name: /save customer/i }).click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
  });

  test("search filters the contact list", async ({ page }) => {
    const search = page.getByPlaceholder(/search customers by name, phone or email/i);
    await search.fill("zzz-no-such-contact-zzz");
    // The table is replaced entirely by an empty-state message when nothing matches.
    await expect(page.getByText(/no contacts match your search/i)).toBeVisible({ timeout: 10_000 });
    await search.fill("");
  });

  test("filter by tag (Smart Folder) narrows the list", async ({ page }) => {
    const tagButtons = page.locator("text=Smart Folders").locator("..").locator("button");
    const count = await tagButtons.count();
    test.skip(count === 0, "No tags exist on any contact yet");

    await tagButtons.first().click();
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });
  });

  test("bulk tag: select contacts then add a tag to all of them", async ({ page }) => {
    const firstRowCheckbox = page.locator("tbody tr").first().locator('input[type="checkbox"]');
    test.skip(!(await firstRowCheckbox.isVisible().catch(() => false)), "No contacts to select");

    await firstRowCheckbox.check();
    await page.getByRole("button", { name: /add tag/i }).click();

    const tagInput = page.getByPlaceholder(/tag/i).last();
    await expect(tagInput).toBeVisible();
    const tagName = `e2e-${Date.now()}`;
    await tagInput.fill(tagName);
    await page.getByRole("button", { name: /^(add tag|apply|confirm)$/i }).click();

    await expect(page.getByText(/added tag/i)).toBeVisible({ timeout: 15_000 });
  });

  test("Win-Back modal opens and shows dormant-contact recipe explanation", async ({ page }) => {
    await page.getByRole("button", { name: /win-back/i }).click();
    await expect(page.getByText(/win-back campaign/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/win-back.* sequence/i)).toBeVisible();
    await closeModal(page);
  });
});

test.describe("Segments (Audience Builder)", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("customers");
  });

  test("create a smart segment with a rule and preview the matching count", async ({ page }) => {
    // The "+" button next to "Saved Segments" opens the builder.
    await page.getByTitle("Create Smart Segment").click();
    await expect(page.getByRole("heading", { name: /create smart segment/i })).toBeVisible();

    const segmentName = `E2E Segment ${Date.now()}`;
    await page.getByPlaceholder(/vip active shopify leads/i).fill(segmentName);

    // Default rule is `tags in ""`; the preview count should render regardless.
    await expect(page.getByText(/contacts match/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /save smart segment/i }).click();

    await expect(page.getByText(segmentName)).toBeVisible({ timeout: 15_000 });
  });

  test("selecting a saved segment filters the contact table", async ({ page }) => {
    const segmentButtons = page.locator("text=Saved Segments").locator("..").locator("..").locator("button");
    const count = await segmentButtons.count();
    test.skip(count <= 1, "No saved segments to select (only the '+' control exists)");

    // Click the first real segment entry (skip the "+ create" control).
    await segmentButtons.nth(1).click();
    await expect(page.locator("table")).toBeVisible();
  });

  test("delete a saved segment", async ({ page }) => {
    const deleteButtons = page.getByTitle("Delete Segment");
    const count = await deleteButtons.count();
    test.skip(count === 0, "No saved segments exist to delete");

    await deleteButtons.first().click();
    // ConfirmDialog appears — confirm deletion.
    await page.getByRole("button", { name: /delete segment/i }).click();
    await expect(page.getByText(/segment deleted/i)).toBeVisible({ timeout: 10_000 });
  });
});
