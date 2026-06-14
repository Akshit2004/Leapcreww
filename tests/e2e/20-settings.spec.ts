import { test, expect, requireWhatsApp } from "./fixtures";

test.describe("Settings", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("settings");
  });

  test("Settings page renders core cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /whatsapp business connection/i })).toBeVisible();
    await expect(page.getByText(/website chat button/i)).toBeVisible();
    await expect(page.getByText(/brand profile/i)).toBeVisible();
    await expect(page.getByText(/ai agent settings/i)).toBeVisible();
    await expect(page.getByText(/security & privacy/i)).toBeVisible();
  });

  test("WhatsApp connection card shows connected or connect CTA", async ({ page }) => {
    await expect(
      page.getByText(/connected|not connected/i).first()
    ).toBeVisible({ timeout: 15_000 });

    const connectBtn = page.getByRole("button", { name: /connect with whatsapp/i });
    if (await connectBtn.isVisible().catch(() => false)) {
      await expect(connectBtn).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: /refresh status|disconnect/i }).first()).toBeVisible();
    }
  });

  test("disconnect WhatsApp (if connected)", async ({ page }) => {
    requireWhatsApp();

    const disconnectBtn = page.getByRole("button", { name: /disconnect/i });
    test.skip(!(await disconnectBtn.isVisible().catch(() => false)), "WhatsApp not connected");

    await disconnectBtn.click();
    await page.getByRole("button", { name: /disconnect|confirm/i }).last().click();
    await expect(page.getByRole("button", { name: /connect with whatsapp/i })).toBeVisible({ timeout: 15_000 });
  });

  test("Website Chat Button widget config: toggle, number, position, colors", async ({ page }) => {
    // Scope to the card's own container (bg-white border rounded-2xl) so this
    // doesn't also match the outer page wrapper, which contains other cards
    // with similarly-named inputs/buttons (e.g. the Developer Quickstart phone field).
    const card = page.locator("div.bg-white.border.border-stone-200.rounded-2xl").filter({ has: page.getByText(/website chat button/i) });
    await expect(card.getByText(/embed snippet/i)).toBeVisible({ timeout: 15_000 });

    await card.getByPlaceholder(/919876543210/i).fill("919876543210");

    await card.getByRole("button", { name: "Left", exact: true }).click();
    await card.getByRole("button", { name: "Right", exact: true }).click();

    await card.getByLabel(/toggle widget/i).click();

    await card.getByRole("button", { name: /save widget/i }).click();
    await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 10_000 });
  });

  test("copy embed snippet to clipboard", async ({ page, context }) => {
    // navigator.clipboard.writeText() throws without this permission, which
    // the component catches and silently leaves the button's label as "Copy".
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const card = page.locator("div.bg-white.border.border-stone-200.rounded-2xl").filter({ has: page.getByText(/website chat button/i) });
    await expect(card.getByText(/embed snippet/i)).toBeVisible({ timeout: 15_000 });

    await card.getByRole("button", { name: /^copy$/i }).click();
    await expect(card.getByRole("button", { name: /copied/i })).toBeVisible();
  });

  test("Brand Profile fields can be filled and saved", async ({ page }) => {
    await page.getByPlaceholder(/aurora coffee co/i).fill("E2E Test Brand");
    await page.getByPlaceholder(/e-commerce, edtech, d2c/i).fill("E-commerce");
    await page.getByPlaceholder(/professional, friendly, urgent/i).fill("Friendly");
    await page.getByPlaceholder(/auroracoffee\.com/i).fill("https://example.com");

    await page.getByRole("button", { name: /save profile/i }).click();
    await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 10_000 });
  });

  test("AI Agent Settings: knowledge base, persona, temperature, save", async ({ page }) => {
    await page.getByPlaceholder(/handmade leather wallets/i).fill("We sell premium teas, shipped within 3 days.");
    await page.getByPlaceholder(/speak as 'riya'/i).fill("Speak as 'Asha', a friendly support agent.");

    const slider = page.locator('input[type="range"]');
    await slider.fill("0.7");

    await page.getByRole("button", { name: /save ai settings/i }).click();
    await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 10_000 });
  });

  test("Security & Privacy info card renders", async ({ page }) => {
    await expect(page.getByText(/token architecture/i)).toBeVisible();
    await expect(page.getByText(/system user token/i)).toBeVisible();
    await expect(page.getByText(/data stored/i)).toBeVisible();
  });

  test("Phone Numbers card: open add-number form", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add number|add phone/i }).first();
    test.skip(!(await addBtn.isVisible().catch(() => false)), "Add number control not found");

    await addBtn.click();
    await expect(page.locator("form").last()).toBeVisible();
  });
});
