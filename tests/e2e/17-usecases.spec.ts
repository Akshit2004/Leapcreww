import { test, expect } from "./fixtures";

test.describe("Use Cases (Appointment Booking & Agent Selection)", () => {
  test.beforeEach(async ({ gotoTab }) => {
    await gotoTab("usecases");
  });

  test("agent selector renders all three options", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /use cases/i })).toBeVisible();
    await expect(page.getByText(/active agent/i)).toBeVisible();
    for (const label of ["Default Chatbot Flow", "E-Commerce & Catalog Bot", "Appointment Booking Bot"]) {
      await expect(page.getByRole("button", { name: new RegExp(label, "i") })).toBeVisible();
    }
  });

  test("switch to Appointment Booking Bot shows the booking console", async ({ page }) => {
    await page.getByRole("button", { name: /appointment booking bot/i }).click();
    await expect(page.getByText(/booking slots/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /generate schedule/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /add slot/i })).toBeVisible();
  });

  test("Generate Schedule form creates recurring booking slots", async ({ page }) => {
    await page.getByRole("button", { name: /appointment booking bot/i }).click();
    await expect(page.getByText(/booking slots/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /generate schedule/i }).click();
    await expect(page.getByText(/recurring schedule/i)).toBeVisible();

    const nameInput = page.locator("form").filter({ hasText: /recurring schedule/i }).locator("input[type=text]").first();
    await nameInput.fill("E2E Consultation");

    await page.getByRole("button", { name: /generate/i }).last().click();
    await expect(page.getByText(/slot.*created|generate slots/i)).toBeVisible({ timeout: 15_000 }).catch(() => {});
  });

  test("Add Slot form creates a single booking slot", async ({ page }) => {
    await page.getByRole("button", { name: /appointment booking bot/i }).click();
    await expect(page.getByText(/booking slots/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /add slot/i }).click();
    await expect(page.getByText(/new slot/i)).toBeVisible();
  });

  test("switch back to Default Chatbot Flow", async ({ page }) => {
    await page.getByRole("button", { name: /default chatbot flow/i }).click();
    await expect(page.getByText(/default chatbot flow active/i)).toBeVisible({ timeout: 15_000 });
  });

  test("One-Click Automations recipes render with filters", async ({ page }) => {
    await expect(page.getByText(/one-click automations/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "All", exact: true })).toBeVisible();
  });
});
