import { test, expect, requireAI, closeModal } from "./fixtures";

test.describe("Flows (WhatsApp Interactive Forms)", () => {
  test.beforeEach(async ({ page, gotoTab }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoTab("flows");
  });

  test("flows list renders with 'New Flow' CTA", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /whatsapp flows/i })).toBeVisible();
    // A floating Quick Action FAB shares the exact accessible name "New Flow"
    // via aria-label; the panel's own button has no aria-label, so exclude it.
    await expect(page.locator('button:not([aria-label]):has-text("New Flow")')).toBeVisible();
    await expect(page.getByText(/your flows/i)).toBeVisible();
  });

  test("encryption setup overlay can generate & upload keys", async ({ page }) => {
    const overlay = page.getByRole("button", { name: /generate & upload keys/i });
    if (!(await overlay.isVisible().catch(() => false))) {
      test.skip(true, "Org-level encryption keys already configured");
    }
    await overlay.click();
    await expect(overlay).not.toBeVisible({ timeout: 30_000 });
  });

  test("create a new flow and toggle the JSON editor", async ({ page }) => {
    // See note above re: FAB sharing the "New Flow" accessible name.
    await page.locator('button:not([aria-label]):has-text("New Flow")').click();

    // A new flow should appear selected in the list and open the editor.
    await expect(page.getByRole("button", { name: /save json/i })).toBeVisible({ timeout: 15_000 });

    await page.getByTitle(/toggle raw json editor/i).click();
    const jsonEditor = page.locator("textarea");
    await expect(jsonEditor).toBeVisible();

    const current = await jsonEditor.inputValue();
    expect(() => JSON.parse(current)).not.toThrow();
  });

  test("save flow JSON", async ({ page }) => {
    const saveBtn = page.getByRole("button", { name: /save json/i });
    test.skip(!(await saveBtn.isVisible().catch(() => false)), "No flow selected");

    await page.getByTitle(/toggle raw json editor/i).click();
    await saveBtn.click();
    await expect(page.getByText(/flow json updated/i)).toBeVisible({ timeout: 15_000 });
  });

  test("publish a flow to Meta", async ({ page }) => {
    const publishBtn = page.getByRole("button", { name: /publish to meta/i });
    test.skip(!(await publishBtn.isVisible({ timeout: 5_000 }).catch(() => false)), "No unpublished flow selected");

    await publishBtn.click();
    await expect(page.getByRole("button", { name: /published/i })).toBeVisible({ timeout: 30_000 });
  });

  test("broadcast a published flow to a tag audience", async ({ page }) => {
    const broadcastBtn = page.getByRole("button", { name: /broadcast flow/i });
    test.skip(!(await broadcastBtn.isVisible().catch(() => false)), "No published flow available");

    await broadcastBtn.click();
    await expect(page.getByRole("heading", { name: /launch flow campaign/i })).toBeVisible();

    await page.getByPlaceholder(/lead capture/i).fill(`E2E Flow Broadcast ${Date.now()}`);
    await page.getByPlaceholder(/tag name, or 'all' for everyone/i).fill("all");
    await page.getByPlaceholder(/text shown above the form button/i).fill("Tap below to get started");

    await closeModal(page);
  });

  test("captured form submissions tab loads", async ({ page }) => {
    const submissionsTabBtn = page.getByRole("button", { name: /captured submissions/i });
    test.skip(!(await submissionsTabBtn.isVisible().catch(() => false)), "No flow selected");

    await submissionsTabBtn.click();
    await expect(page.getByText(/captured form submissions/i)).toBeVisible();
    await expect(page.getByText(/responses?$/i).first()).toBeVisible();
  });

  test("AI flow generation from requirements", async ({ page }) => {
    requireAI();
    const editBtn = page.getByRole("button", { name: /configure & edit/i });
    test.skip(!(await editBtn.isVisible().catch(() => false)), "No flow selected");
    await editBtn.click();

    // AI generation entry point (if present in the visual builder toolbar).
    const aiBtn = page.getByRole("button", { name: /generate with ai|ai generate/i });
    test.skip(!(await aiBtn.isVisible().catch(() => false)), "No AI flow-generation control in this build");
    await aiBtn.click();
  });

  test("delete a flow", async ({ page }) => {
    const deleteBtn = page.getByRole("button", { name: /^delete$/i });
    test.skip(!(await deleteBtn.isVisible().catch(() => false)), "No flow selected");

    await deleteBtn.click();
    await page.getByRole("button", { name: /delete/i }).last().click();
  });
});
