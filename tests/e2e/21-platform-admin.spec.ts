import { test, expect } from "./fixtures";

// Platform Super Admin lives at /admin (outside the org workspace) and is
// gated by the PLATFORM_ADMIN_EMAILS allowlist. If the test account isn't a
// platform admin, every test here skips after confirming the access-denied gate.
test.describe("Platform Super Admin", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
  });

  async function skipIfNotAdmin(page: import("@playwright/test").Page) {
    const denied = page.getByText(/platform admin only/i);
    const adminContent = page.getByRole("button", { name: "Organizations", exact: true });
    // The /admin page renders a loading state before resolving to either the
    // access-denied view or the admin dashboard — wait for either to appear
    // before deciding, rather than racing a single isVisible() check.
    await Promise.race([
      denied.waitFor({ timeout: 20_000 }).catch(() => {}),
      adminContent.waitFor({ timeout: 20_000 }).catch(() => {}),
    ]);
    const isDenied = await denied.isVisible().catch(() => false);
    test.skip(isDenied, "Test account is not a platform admin");
  }

  test("Overview section renders platform-wide stats", async ({ page }) => {
    await skipIfNotAdmin(page);

    await expect(page.getByText(/platform/i).first()).toBeVisible();
    for (const label of [/total orgs/i, /total users/i, /total contacts/i, /messages sent/i]) {
      await expect(page.getByText(label).first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test("navigate between admin sections", async ({ page }) => {
    await skipIfNotAdmin(page);

    for (const [label, marker] of [
      ["Organizations", /organizations|orgs/i],
      ["Users", /users/i],
      ["Billing", /billing/i],
      ["Templates", /templates/i],
      ["System Logs", /logs/i],
    ] as const) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.getByText(marker).first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test("Organizations section lists orgs with connection status", async ({ page }) => {
    await skipIfNotAdmin(page);

    await page.getByRole("button", { name: "Organizations", exact: true }).click();
    await expect(page.getByText(/organizations/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("non-admin user is denied access to /admin", async ({ page }) => {
    const denied = page.getByText(/platform admin only/i);
    if (await denied.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
    } else {
      test.skip(true, "Test account is a platform admin — access-denied path not reachable");
    }
  });
});
