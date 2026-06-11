/**
 * Queue-engine tests for the broadcast service.
 *
 * We test the public contract, not the internals:
 *  - launchCampaign returns immediately with the correct initial state
 *  - processCampaignChunk advances offset, records delivered count, marks complete
 *  - The optimistic lock: a second concurrent call with same offset is a no-op
 *  - Wallet pre-flight: chunk fails fast when org cannot afford a send
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/campaigns/repositories/campaignRepo", () => ({
  findTargetContacts: vi.fn(),
  findTargetContactsPaged: vi.fn(),
  countTargetContacts: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  findCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  findScheduledDue: vi.fn(),
  findSendingCampaigns: vi.fn(),
  advanceCampaignChunk: vi.fn(),
  logCampaignEvent: vi.fn(),
  recordOutboundMessage: vi.fn(),
  userIsOrgMember: vi.fn(),
}));

vi.mock("@/features/billing/services/billingService", () => ({
  canAfford: vi.fn(),
  recordUsage: vi.fn(),
}));

vi.mock("@/shared/lib/whatsapp", () => ({
  sendWhatsAppMessage: vi.fn(),
  formatPhoneNumber: (p: string) => p.replace(/[^0-9]/g, ""),
}));

vi.mock("@/features/analytics/services/attribution", () => ({
  recordTouch: vi.fn(),
}));

import * as campaignRepo from "@/features/campaigns/repositories/campaignRepo";
import * as billingService from "@/features/billing/services/billingService";
import * as whatsapp from "@/shared/lib/whatsapp";
import {
  launchCampaign,
  processCampaignChunk,
  CHUNK_SIZE,
} from "@/features/campaigns/services/broadcastService";
import type { Campaign, Contact } from "@prisma/client";

// Minimal campaign stub
const baseCampaign = (overrides: Partial<Campaign> = {}): Campaign =>
  ({
    id: "camp-1",
    name: "Test Campaign",
    organizationId: "org-1",
    targetTag: "all",
    excludeTag: null,
    templateName: "test_template",
    flowId: null,
    mediaType: null,
    mediaUrl: null,
    variables: [],
    delay: 0,
    segmentId: null,
    sent: 3,
    delivered: 0,
    read: 0,
    clicked: 0,
    status: "Sending",
    date: "2026-06-11",
    scheduledAt: null,
    currentOffset: 0,
    timezone: null,
    recurrence: null,
    createdAt: new Date(),
    ...overrides,
  } as Campaign);

const makeContact = (n: number): Contact =>
  ({
    id: `contact-${n}`,
    name: `Contact ${n}`,
    phone: `+9190000000${n}`,
    email: `c${n}@test.com`,
    organizationId: "org-1",
    tags: [],
    status: "Active",
    source: "test",
    attributes: {},
    lastMessage: null,
    lastMessageTime: null,
    lastActiveAt: null,
    unreadCount: 0,
    assignedAgent: null,
    sourceAdId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Contact);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(campaignRepo.logCampaignEvent).mockResolvedValue({} as any);
  vi.mocked(campaignRepo.recordOutboundMessage).mockResolvedValue({} as any);
  vi.mocked(campaignRepo.updateCampaign).mockResolvedValue({} as any);
  vi.mocked(campaignRepo.advanceCampaignChunk).mockResolvedValue({ count: 1 } as any);
  vi.mocked(billingService.recordUsage).mockResolvedValue({ costMinor: 88 });
});

// ─── launchCampaign ───────────────────────────────────────────────────────────

describe("launchCampaign", () => {
  it("creates campaign with status Sending and currentOffset=0 for immediate campaigns", async () => {
    vi.mocked(campaignRepo.countTargetContacts).mockResolvedValue(150);
    vi.mocked(campaignRepo.createCampaign).mockResolvedValue(baseCampaign({ sent: 150 }));

    await launchCampaign({
      organizationId: "org-1",
      name: "Test",
      targetTag: "all",
      templateName: "tpl",
      delay: 1,
    } as any);

    const createCall = vi.mocked(campaignRepo.createCampaign).mock.calls[0][0];
    expect(createCall.status).toBe("Sending");
    expect(createCall.currentOffset).toBe(0);
    expect(createCall.sent).toBe(150);
  });

  it("creates campaign with status Scheduled when scheduledAt is provided", async () => {
    vi.mocked(campaignRepo.countTargetContacts).mockResolvedValue(50);
    vi.mocked(campaignRepo.createCampaign).mockResolvedValue(baseCampaign({ status: "Scheduled" }));

    await launchCampaign({
      organizationId: "org-1",
      name: "Scheduled",
      targetTag: "all",
      scheduledAt: "2026-12-01T10:00:00Z",
    } as any);

    const createCall = vi.mocked(campaignRepo.createCampaign).mock.calls[0][0];
    expect(createCall.status).toBe("Scheduled");
  });

  it("does NOT fire a background worker — returns immediately", async () => {
    vi.mocked(campaignRepo.countTargetContacts).mockResolvedValue(10_000);
    vi.mocked(campaignRepo.createCampaign).mockResolvedValue(baseCampaign({ sent: 10_000 }));

    const start = Date.now();
    await launchCampaign({ organizationId: "org-1", name: "Big", targetTag: "all" } as any);
    const elapsed = Date.now() - start;

    // Should return in well under 100ms — no sending happens at launch
    expect(elapsed).toBeLessThan(100);
    expect(whatsapp.sendWhatsAppMessage).not.toHaveBeenCalled();
  });
});

// ─── processCampaignChunk ─────────────────────────────────────────────────────

describe("processCampaignChunk", () => {
  it("sends CHUNK_SIZE contacts and advances offset by CHUNK_SIZE", async () => {
    const contacts = Array.from({ length: CHUNK_SIZE }, (_, i) => makeContact(i));
    vi.mocked(billingService.canAfford).mockResolvedValue(true);
    vi.mocked(campaignRepo.findTargetContactsPaged).mockResolvedValue(contacts);
    vi.mocked(whatsapp.sendWhatsAppMessage).mockResolvedValue({
      ok: true,
      data: { messages: [{ id: "wamid-1" }] },
    } as any);

    await processCampaignChunk(baseCampaign({ sent: 100, currentOffset: 0 }));

    expect(whatsapp.sendWhatsAppMessage).toHaveBeenCalledTimes(CHUNK_SIZE);
    const advanceCall = vi.mocked(campaignRepo.advanceCampaignChunk).mock.calls[0];
    expect(advanceCall[1]).toBe(0);             // expectedOffset
    expect(advanceCall[2]).toBe(CHUNK_SIZE);    // newOffset
    expect(advanceCall[3]).toBe(CHUNK_SIZE);    // delivered = all succeeded
    expect(advanceCall[4]).toBe(false);         // not complete (full chunk returned)
  });

  it("marks campaign Completed when last chunk is smaller than CHUNK_SIZE", async () => {
    const contacts = [makeContact(1), makeContact(2)]; // only 2 left
    vi.mocked(billingService.canAfford).mockResolvedValue(true);
    vi.mocked(campaignRepo.findTargetContactsPaged).mockResolvedValue(contacts);
    vi.mocked(whatsapp.sendWhatsAppMessage).mockResolvedValue({ ok: true, data: { messages: [{ id: "x" }] } } as any);

    await processCampaignChunk(baseCampaign({ sent: 52, currentOffset: 50 }));

    const advanceCall = vi.mocked(campaignRepo.advanceCampaignChunk).mock.calls[0];
    expect(advanceCall[4]).toBe(true); // isComplete = true
  });

  it("marks campaign Completed when contacts array is empty (already done)", async () => {
    vi.mocked(billingService.canAfford).mockResolvedValue(true);
    vi.mocked(campaignRepo.findTargetContactsPaged).mockResolvedValue([]);

    await processCampaignChunk(baseCampaign({ sent: 50, currentOffset: 50 }));

    expect(campaignRepo.updateCampaign).toHaveBeenCalledWith("camp-1", { status: "Completed" });
    expect(campaignRepo.advanceCampaignChunk).not.toHaveBeenCalled();
  });

  it("fails fast on insufficient wallet balance without sending", async () => {
    vi.mocked(billingService.canAfford).mockResolvedValue(false);

    await processCampaignChunk(baseCampaign());

    expect(whatsapp.sendWhatsAppMessage).not.toHaveBeenCalled();
    expect(campaignRepo.updateCampaign).toHaveBeenCalledWith("camp-1", { status: "Failed" });
  });

  it("only counts successful sends in deliveredDelta", async () => {
    const contacts = [makeContact(1), makeContact(2), makeContact(3)];
    vi.mocked(billingService.canAfford).mockResolvedValue(true);
    vi.mocked(campaignRepo.findTargetContactsPaged).mockResolvedValue(contacts);
    // First send fails, second and third succeed
    vi.mocked(whatsapp.sendWhatsAppMessage)
      .mockResolvedValueOnce({ ok: false, error: "timeout" } as any)
      .mockResolvedValue({ ok: true, data: { messages: [{ id: "x" }] } } as any);

    await processCampaignChunk(baseCampaign());

    const advanceCall = vi.mocked(campaignRepo.advanceCampaignChunk).mock.calls[0];
    expect(advanceCall[3]).toBe(2); // only 2 delivered
  });

  it("does not double-process when optimistic lock returns count=0", async () => {
    const contacts = [makeContact(1)];
    vi.mocked(billingService.canAfford).mockResolvedValue(true);
    vi.mocked(campaignRepo.findTargetContactsPaged).mockResolvedValue(contacts);
    vi.mocked(whatsapp.sendWhatsAppMessage).mockResolvedValue({ ok: true, data: { messages: [{ id: "x" }] } } as any);
    // Simulate lost optimistic lock race
    vi.mocked(campaignRepo.advanceCampaignChunk).mockResolvedValue({ count: 0 } as any);

    // Should not throw — just silently no-op after the failed commit
    await expect(processCampaignChunk(baseCampaign())).resolves.toBeUndefined();
  });
});
