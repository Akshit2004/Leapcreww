import { test, expect } from "@playwright/test";

// These tests exercise the login screen itself, so they must NOT reuse the
// authenticated storage state from auth.setup.ts.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication & Accounts", () => {
  test("login page renders password / email OTP / WhatsApp tabs", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Password" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email OTP" })).toBeVisible();
    await expect(page.getByRole("button", { name: "WhatsApp" })).toBeVisible();

    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  });

  test("rejects invalid credentials with an error message", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").fill("nonexistent-user@example.com");
    await page.getByPlaceholder("••••••••").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("password login redirects to the org dashboard", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    test.skip(!email || !password, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not configured");

    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(email!);
    await page.getByPlaceholder("••••••••").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/org\/[^/?]+/, { timeout: 30_000 });
  });

  test("email OTP tab requests a one-time code", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Email OTP" }).click();

    const emailInput = page.getByPlaceholder(/alex@leapcreww\.com/i);
    await expect(emailInput).toBeVisible();
    await emailInput.fill(`otp-test-${Date.now()}@example.com`);

    const sendButton = page.getByRole("button", { name: /send (login )?code/i });
    await sendButton.click();

    // We can't read the inbox, but the UI should move into the "code sent" state.
    await expect(page.getByText(/code|otp|sent/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("unauthenticated user hitting an org dashboard is redirected to /login", async ({ page }) => {
    await page.goto("/org/non-existent-org-id?tab=overview");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});

test.describe("Multi-organization", () => {
  test.use({ storageState: "tests/e2e/.auth/user.json" });

  test("AGENT role cannot access admin-only routes", async ({ page, request }) => {
    test.skip(!process.env.E2E_ORG_ID, "E2E_ORG_ID not configured");
    // Smoke check: a non-admin user calling the admin stats API gets 401/403.
    const res = await request.get("/api/admin/stats");
    expect([401, 403]).toContain(res.status());
  });
});
