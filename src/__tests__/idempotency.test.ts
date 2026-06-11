import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/public-api/repositories/publicApiRepo", () => ({
  findIdempotencyKey: vi.fn(),
  storeIdempotencyKey: vi.fn(),
  // other repo fns — not exercised here
  findContactByPhone: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
  listContacts: vi.fn(),
  listTemplates: vi.fn(),
  logOutboundMessage: vi.fn(),
}));

import * as repo from "@/features/public-api/repositories/publicApiRepo";
import { withIdempotency } from "@/features/public-api/services/v1Service";
import { ApiError } from "@/shared/lib/api";

const ORG = "org-1";

beforeEach(() => vi.clearAllMocks());

describe("withIdempotency", () => {
  it("calls fn and stores result on first request", async () => {
    vi.mocked(repo.findIdempotencyKey).mockResolvedValue(null);
    vi.mocked(repo.storeIdempotencyKey).mockResolvedValue({} as any);
    const fn = vi.fn().mockResolvedValue({ messageId: "abc" });

    const result = await withIdempotency(ORG, "key-1", fn);

    expect(fn).toHaveBeenCalledOnce();
    expect(repo.storeIdempotencyKey).toHaveBeenCalledWith(ORG, "key-1", { messageId: "abc" });
    expect(result).toEqual({ response: { messageId: "abc" }, replayed: false });
  });

  it("returns cached response and skips fn on replay", async () => {
    vi.mocked(repo.findIdempotencyKey).mockResolvedValue({
      id: "row-1",
      key: "key-1",
      response: { messageId: "abc" },
      organizationId: ORG,
      createdAt: new Date(),
    });
    const fn = vi.fn().mockResolvedValue({ messageId: "different" });

    const result = await withIdempotency(ORG, "key-1", fn);

    expect(fn).not.toHaveBeenCalled();
    expect(result).toEqual({ response: { messageId: "abc" }, replayed: true });
  });

  it("runs fn unconditionally when key is null", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true });
    const result = await withIdempotency(ORG, null, fn);

    expect(fn).toHaveBeenCalledOnce();
    expect(repo.findIdempotencyKey).not.toHaveBeenCalled();
    expect(result.replayed).toBe(false);
  });

  it("throws 400 when key exceeds 255 characters", async () => {
    const longKey = "x".repeat(256);
    const fn = vi.fn();

    await expect(withIdempotency(ORG, longKey, fn)).rejects.toMatchObject({
      status: 400,
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("still returns response when storeIdempotencyKey races and throws", async () => {
    vi.mocked(repo.findIdempotencyKey).mockResolvedValue(null);
    vi.mocked(repo.storeIdempotencyKey).mockRejectedValue(new Error("unique constraint"));
    const fn = vi.fn().mockResolvedValue({ messageId: "xyz" });

    // Should NOT throw — storage race is swallowed
    const result = await withIdempotency(ORG, "key-race", fn);
    expect(result.response).toEqual({ messageId: "xyz" });
    expect(result.replayed).toBe(false);
  });

  it("different orgs with same key do not collide", async () => {
    vi.mocked(repo.findIdempotencyKey).mockResolvedValue(null);
    vi.mocked(repo.storeIdempotencyKey).mockResolvedValue({} as any);
    const fn1 = vi.fn().mockResolvedValue({ org: "A" });
    const fn2 = vi.fn().mockResolvedValue({ org: "B" });

    await withIdempotency("org-A", "same-key", fn1);
    await withIdempotency("org-B", "same-key", fn2);

    // Both fns were called — each org gets its own namespace
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
    expect(repo.findIdempotencyKey).toHaveBeenCalledWith("org-A", "same-key");
    expect(repo.findIdempotencyKey).toHaveBeenCalledWith("org-B", "same-key");
  });
});
