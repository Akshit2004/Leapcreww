import { test, expect, requireAI, closeModal } from "./fixtures";

test.describe("Campaigns (Broadcast Engine)", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("campaigns");
  });

  test("campaigns list renders with status filters and CTAs", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /campaigns & broadcasts/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /ai campaign strategist/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /launch broadcast/i })).toBeVisible();
    for (const label of ["All Broadcasts", "Sending", "Completed", "Scheduled"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  test("create a session broadcast to all contacts and send now", async ({ page }) => {
    await page.getByRole("button", { name: /launch broadcast/i }).click();
    await expect(page.getByText(/launch new whatsapp broadcast/i)).toBeVisible();

    const name = `E2E Session Broadcast ${Date.now()}`;
    await page.getByPlaceholder(/black friday discount drop/i).fill(name);
    await page.getByRole("button", { name: /free-form session/i }).click();

    await page.getByPlaceholder(/write your message here/i).fill("Hi! This is an automated E2E test broadcast.");

    const launchBtn = page.getByRole("button", { name: /launch live broadcast/i });
    if (await launchBtn.isEnabled()) {
      await launchBtn.click();
      // Free-form session sends can fail server-side if no contacts have
      // messaged in the last 24h — accept either outcome as a valid result.
      const success = page.getByText(name);
      const noSession = page.getByText(/no contacts with messages in the last 24 hours/i);
      await expect(success.or(noSession)).toBeVisible({ timeout: 20_000 });
    } else {
      // No contacts active in last 24h — expect the "0 matching" warning instead.
      await expect(page.getByText(/0 users|no active crm contacts/i)).toBeVisible();
      await closeModal(page);
    }
  });

  test("schedule a campaign for a future date/time", async ({ page }) => {
    await page.getByRole("button", { name: /launch broadcast/i }).click();

    const name = `E2E Scheduled Broadcast ${Date.now()}`;
    await page.getByPlaceholder(/black friday discount drop/i).fill(name);
    await page.getByRole("button", { name: /free-form session/i }).click();
    await page.getByPlaceholder(/write your message here/i).fill("Scheduled E2E test message.");

    await page.getByRole("button", { name: /schedule later/i }).click();

    const tomorrow = new Date(Date.now() + 86_400_000);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    await page.locator('input[type="date"]').fill(dateStr);
    await page.locator('input[type="time"]').fill("10:00");

    const submitBtn = page.getByRole("button", { name: /schedule broadcast trigger/i });
    if (await submitBtn.isEnabled()) {
      await submitBtn.click();
      // Free-form session sends can fail server-side if no contacts have
      // messaged in the last 24h — accept either outcome as a valid result.
      const success = page.getByText(name);
      const noSession = page.getByText(/no contacts with messages in the last 24 hours/i);
      await expect(success.or(noSession)).toBeVisible({ timeout: 20_000 });
    } else {
      await closeModal(page);
      test.skip(true, "No contacts match the audience — cannot create a campaign");
    }
  });

  test("anti-spam delay slider adjusts the per-message delay label", async ({ page }) => {
    await page.getByRole("button", { name: /launch broadcast/i }).click();

    const slider = page.locator('input[type="range"]');
    await slider.fill("3");
    await expect(page.getByText(/3s \/ msg/i)).toBeVisible();
    await closeModal(page);
  });

  test("open a campaign's report drawer and verify funnel labels", async ({ page }) => {
    const campaignCard = page.locator("text=Recent Broadcast Activity").locator("..").locator("button, a").first();
    test.skip(!(await campaignCard.isVisible().catch(() => false)), "No campaigns exist to open a report for");

    await campaignCard.click();
    await expect(page.getByText(/sent/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/delivered/i).first()).toBeVisible();
    await expect(page.getByText(/read/i).first()).toBeVisible();
    await expect(page.getByText(/clicked/i).first()).toBeVisible();
  });

  test("AI Campaign Strategist generates and previews a full strategy", async ({ page }) => {
    requireAI();

    await page.getByRole("button", { name: /ai campaign strategist/i }).click();
    await expect(page.getByText(/ai campaign strategist & copywriter/i)).toBeVisible();

    await page.getByPlaceholder(/handwoven banarasi sarees/i).fill(
      "It's summer, I sell handmade candles. Give a 10% discount code SUMMER10 to past buyers."
    );
    await page.getByRole("button", { name: /generate/i }).click();

    // Strategy sections: template, audience, schedule, drip steps.
    await expect(page.getByText(/approved template matched|no matching approved template found/i)).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByText(/launch schedule/i)).toBeVisible();
  });

  test("AI Strategist: approve & launch shows the result screen", async ({ page }) => {
    requireAI();

    await page.getByRole("button", { name: /ai campaign strategist/i }).click();
    await page.getByPlaceholder(/handwoven banarasi sarees/i).fill(
      "It's summer, I sell handmade candles. Give a 10% discount code SUMMER10 to past buyers."
    );
    await page.getByRole("button", { name: /generate/i }).click();
    await expect(page.getByText(/launch schedule/i)).toBeVisible({ timeout: 90_000 });

    await page.getByRole("button", { name: /approve & (launch strategy|register new template)/i }).click();

    await expect(page.getByText(/enrolled|drip|broadcast time|template name/i).first()).toBeVisible({ timeout: 60_000 });
  });
});
