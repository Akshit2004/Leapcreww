import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the repo layer — we're testing service logic, not DB queries.
vi.mock("@/features/billing/repositories/billingRepo", () => ({
  getWalletBalance: vi.fn(),
  getPartnerMarkup: vi.fn(),
  recordUsageAndDebit: vi.fn(),
}));

import * as billingRepo from "@/features/billing/repositories/billingRepo";
import { canAfford, recordUsage } from "@/features/billing/services/billingService";

const ORG = "org-test";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("canAfford", () => {
  it("returns true when wallet balance covers the cost", async () => {
    vi.mocked(billingRepo.getWalletBalance).mockResolvedValue({
      walletBalance: 10,
      partnerId: null,
    });
    // IN marketing = 88 paise = ₹0.88 — wallet has ₹10
    expect(await canAfford(ORG, "marketing", "IN")).toBe(true);
  });

  it("returns false when wallet balance is zero", async () => {
    vi.mocked(billingRepo.getWalletBalance).mockResolvedValue({
      walletBalance: 0,
      partnerId: null,
    });
    expect(await canAfford(ORG, "marketing", "IN")).toBe(false);
  });

  it("returns false when wallet balance is less than cost", async () => {
    vi.mocked(billingRepo.getWalletBalance).mockResolvedValue({
      walletBalance: 0.005, // ₹0.005 < ₹0.88
      partnerId: null,
    });
    expect(await canAfford(ORG, "marketing", "IN")).toBe(false);
  });

  it("returns true for service category regardless of balance (cost = 0)", async () => {
    vi.mocked(billingRepo.getWalletBalance).mockResolvedValue({
      walletBalance: 0,
      partnerId: null,
    });
    expect(await canAfford(ORG, "service", "IN")).toBe(true);
  });

  it("returns false when wallet record does not exist", async () => {
    vi.mocked(billingRepo.getWalletBalance).mockResolvedValue(null);
    expect(await canAfford(ORG, "marketing", "IN")).toBe(false);
  });
});

describe("recordUsage", () => {
  it("calls recordUsageAndDebit with correct cost for IN marketing", async () => {
    vi.mocked(billingRepo.getWalletBalance).mockResolvedValue({
      walletBalance: 100,
      partnerId: null,
    });
    vi.mocked(billingRepo.recordUsageAndDebit).mockResolvedValue([{} as any, {} as any]);

    await recordUsage({ organizationId: ORG, type: "message", category: "marketing", country: "IN" });

    expect(billingRepo.recordUsageAndDebit).toHaveBeenCalledOnce();
    const [event, cost] = vi.mocked(billingRepo.recordUsageAndDebit).mock.calls[0];
    expect(event.costMinor).toBe(88); // 88 paise
    expect(cost).toBeCloseTo(0.88);   // ₹0.88
  });

  it("applies partner markup to the cost", async () => {
    vi.mocked(billingRepo.getWalletBalance).mockResolvedValue({
      walletBalance: 100,
      partnerId: "partner-1",
    });
    vi.mocked(billingRepo.getPartnerMarkup).mockResolvedValue(0.20); // 20% markup
    vi.mocked(billingRepo.recordUsageAndDebit).mockResolvedValue([{} as any, {} as any]);

    await recordUsage({ organizationId: ORG, type: "message", category: "marketing", country: "IN" });

    const [event] = vi.mocked(billingRepo.recordUsageAndDebit).mock.calls[0];
    expect(event.costMinor).toBe(Math.round(88 * 1.20)); // 106 paise
  });

  it("does not call getPartnerMarkup when no partnerId", async () => {
    vi.mocked(billingRepo.getWalletBalance).mockResolvedValue({
      walletBalance: 100,
      partnerId: null,
    });
    vi.mocked(billingRepo.recordUsageAndDebit).mockResolvedValue([{} as any, {} as any]);

    await recordUsage({ organizationId: ORG, type: "message", category: "service" });

    expect(billingRepo.getPartnerMarkup).not.toHaveBeenCalled();
  });

  it("records the organizationId on the usage event", async () => {
    vi.mocked(billingRepo.getWalletBalance).mockResolvedValue({ walletBalance: 100, partnerId: null });
    vi.mocked(billingRepo.recordUsageAndDebit).mockResolvedValue([{} as any, {} as any]);

    await recordUsage({ organizationId: ORG, type: "message", category: "utility", country: "IN" });

    const [event] = vi.mocked(billingRepo.recordUsageAndDebit).mock.calls[0];
    expect(event.organizationId).toBe(ORG);
    expect(event.category).toBe("utility");
  });
});
