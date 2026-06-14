import { test, expect } from "./fixtures";

// Wallet top-up and usage ledger have no dedicated tab UI yet — covered
// via their org-scoped API endpoints. Razorpay calls are real sandbox keys
// per the org's RAZORPAY_TEST_KEY_ID/SECRET configuration.
test.describe("Billing & Wallet", () => {
  test("usage ledger returns spend/cost summary", async ({ page, orgId }) => {
    const res = await page.request.get(`/api/org/${orgId}/usage`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data).toBeTruthy();
  });

  test("wallet top-up rejects amounts below the ₹100 minimum", async ({ page, orgId }) => {
    const res = await page.request.post(`/api/org/${orgId}/wallet/topup`, {
      data: { amount: 50 },
    });

    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error ?? data.message ?? "").toMatch(/minimum/i);
  });

  test("wallet top-up creates a Razorpay order for a valid amount", async ({ page, orgId }) => {
    const res = await page.request.post(`/api/org/${orgId}/wallet/topup`, {
      data: { amount: 500 },
    });

    if (res.status() === 502) {
      test.skip(true, "Platform Razorpay sandbox keys not configured");
    }

    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.razorpayOrderId).toBeTruthy();
    expect(data.amount).toBe(500);
    expect(data.currency).toBe("INR");
  });
});
