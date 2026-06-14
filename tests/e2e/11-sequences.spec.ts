import { test, expect } from "./fixtures";

// Sequences (drip automation) have no dedicated builder UI yet — they are
// managed via the org API and surfaced read-only as "Sequence ROI" inside
// Analytics → Attribution & ROI Ledger (see 09-analytics.spec.ts).
test.describe("Sequences (Drip Automation)", () => {
  test("list sequences for the org", async ({ page, orgId }) => {
    const res = await page.request.get(`/api/org/${orgId}/sequences`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(Array.isArray(data.sequences)).toBe(true);
  });

  test("create a tag-triggered drip sequence with delayed steps", async ({ page, orgId }) => {
    const res = await page.request.post(`/api/org/${orgId}/sequences`, {
      data: {
        name: `E2E Sequence ${Date.now()}`,
        trigger: "tag_added",
        triggerConfig: { tag: "E2E-Test" },
        steps: [
          { order: 1, delayMinutes: 0, actionType: "send_message", message: "Welcome! Thanks for joining." },
          { order: 2, delayMinutes: 60, actionType: "send_message", message: "Just checking in — any questions?" },
        ],
      },
    });

    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.sequence).toMatchObject({ trigger: "tag_added" });
    expect(data.sequence.id).toBeTruthy();
  });

  test("creating a sequence without required fields fails validation", async ({ page, orgId }) => {
    const res = await page.request.post(`/api/org/${orgId}/sequences`, {
      data: { name: "Incomplete Sequence" },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("Sequence ROI is visible in the Analytics ROI ledger", async ({ gotoTab, page }) => {
    await gotoTab("analytics");
    await page.getByRole("button", { name: /attribution & roi ledger/i }).click();
    await page.getByRole("button", { name: "Sequences", exact: true }).click();

    await expect(page.getByText(/sequence attribution & roi performance matrix/i)).toBeVisible();
  });
});
