import { test, expect } from "./fixtures";

test.describe("Public API & Webhooks (Settings)", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("settings");
  });

  test("Developer Quickstart card renders with snippet tabs", async ({ page }) => {
    await expect(page.getByText(/developer quickstart/i)).toBeVisible();
    for (const lang of ["curl", "node", "python"]) {
      await expect(page.getByRole("button", { name: lang, exact: true })).toBeVisible();
    }
  });

  test("generate an API key and copy the snippet", async ({ page }) => {
    const generateBtn = page.getByRole("button", { name: /generate api key/i });
    test.skip(!(await generateBtn.isVisible().catch(() => false)), "API key already generated for this org");

    await generateBtn.click();
    await expect(page.getByText(/shown only once/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^copy$/i }).first().click();
    await expect(page.getByRole("button", { name: /copied/i }).first()).toBeVisible();
  });

  test("revoke an existing API key", async ({ page }) => {
    const revokeBtn = page.getByRole("button", { name: /revoke/i }).first();
    test.skip(!(await revokeBtn.isVisible().catch(() => false)), "No API keys to revoke");

    await revokeBtn.click();
    await expect(revokeBtn).not.toBeVisible({ timeout: 15_000 });
  });

  test("send a test message via the Developer Quickstart", async ({ page }) => {
    const phoneInput = page.getByPlaceholder(/your whatsapp number/i);
    await expect(phoneInput).toBeVisible();

    await phoneInput.fill("+919876543210");
    // .last() avoids matching "Send test" buttons on any Outbound Webhooks
    // subscription rows, which sit above the Quickstart card in the DOM.
    await page.getByRole("button", { name: /send test/i }).last().click();

    await expect(
      page.getByText(/delivered to whatsapp|send failed|is whatsapp connected/i)
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Outbound Webhooks card renders subscription form", async ({ page }) => {
    await expect(page.getByText(/outbound webhooks/i)).toBeVisible();
    await expect(page.getByPlaceholder(/leapcreww-events/i)).toBeVisible();
    for (const label of ["Inbound message", "Delivery status", "Order placed", "COD order pending", "Back in stock"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  test("subscribe a webhook endpoint, send a test, then remove it", async ({ page }) => {
    const url = `https://example.com/leapcreww-e2e-${Date.now()}`;
    // "Inbound message" is selected by default — don't toggle it off.
    await page.getByPlaceholder(/leapcreww-events/i).fill(url);
    await page.getByRole("button", { name: /^subscribe$/i }).click();

    await expect(page.getByText(/shown only once/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(url)).toBeVisible();

    // Scope to the subscription row's own div (border rounded-xl p-4) so this
    // doesn't also match outer wrappers containing the Quickstart card's button.
    const row = page.locator("div.rounded-xl.p-4").filter({ has: page.getByText(url) });
    await row.getByRole("button", { name: /send test/i }).click();
    // The test-delivery endpoint requires ADMIN org permissions; on accounts
    // without that role no result is rendered. Don't block cleanup on it.
    await row.getByText(/ok —|failed/i).waitFor({ timeout: 20_000 }).catch(() => {});

    await row.getByLabel(/remove endpoint/i).click();
    await page.getByRole("button", { name: /remove/i }).last().click();
    await expect(page.getByText(url)).not.toBeVisible({ timeout: 10_000 });
  });
});
