import { test as setup, expect } from "@playwright/test";

const authFile = "tests/e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_TEST_EMAIL / E2E_TEST_PASSWORD are not set. Copy .env.test.example to .env.test and fill in a test account created via /signup."
    );
  }

  await page.goto("/login");

  // "Password" tab is the default active tab.
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/org\/.+/, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "AI" })).toBeVisible({ timeout: 30_000 }).catch(() => {});

  await page.context().storageState({ path: authFile });
});
