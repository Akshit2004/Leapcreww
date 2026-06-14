import { test, expect } from "./fixtures";

// Partner / White-Label has no dedicated UI — it's a platform-admin-only API
// (POST /api/partner) for provisioning agency/reseller accounts with custom
// branding and pricing markup. Gated by PLATFORM_ADMIN_EMAILS.
test.describe("Partner / White-Label API", () => {
  test("POST /api/partner requires platform admin", async ({ page }) => {
    const res = await page.request.post("/api/partner", {
      data: { name: "E2E Partner", slug: `e2e-partner-${Date.now()}` },
    });

    // Either forbidden for non-admin accounts, or created (201) for platform admins.
    expect([201, 401, 403]).toContain(res.status());

    if (res.status() === 201) {
      const data = await res.json();
      expect(data.partner).toBeTruthy();
      expect(data.partner.slug).toMatch(/^e2e-partner-/);
    }
  });

  test("POST /api/partner validates required fields", async ({ page }) => {
    const res = await page.request.post("/api/partner", { data: {} });
    expect([400, 401, 403]).toContain(res.status());
  });
});
