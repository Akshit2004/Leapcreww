import { describe, it, expect } from "vitest";
import { buildSegmentWhere } from "@/features/segments/services/segmentRules";

const ORG = "org-1";

describe("buildSegmentWhere", () => {
  it("always scopes to organizationId", () => {
    const w = buildSegmentWhere(ORG, {});
    expect(w.organizationId).toBe(ORG);
  });

  it("tags eq → hasEvery (contact must have ALL specified tags)", () => {
    const w = buildSegmentWhere(ORG, {
      all: [{ field: "tags", op: "eq", value: "vip,whale" }],
    });
    expect(w.AND).toEqual([{ tags: { hasEvery: ["vip", "whale"] } }]);
  });

  it("tags in → hasSome (contact must have ANY specified tag)", () => {
    const w = buildSegmentWhere(ORG, {
      all: [{ field: "tags", op: "in", value: ["vip", "lead"] }],
    });
    expect(w.AND).toEqual([{ tags: { hasSome: ["vip", "lead"] } }]);
  });

  it("tags neq → NOT hasSome", () => {
    const w = buildSegmentWhere(ORG, {
      all: [{ field: "tags", op: "neq", value: "unsubscribed" }],
    });
    expect(w.AND).toEqual([{ NOT: { tags: { hasSome: ["unsubscribed"] } } }]);
  });

  it("status eq", () => {
    const w = buildSegmentWhere(ORG, {
      all: [{ field: "status", op: "eq", value: "Active" }],
    });
    expect(w.AND).toEqual([{ status: "Active" }]);
  });

  it("status neq → NOT status", () => {
    const w = buildSegmentWhere(ORG, {
      all: [{ field: "status", op: "neq", value: "Blocked" }],
    });
    expect(w.AND).toEqual([{ NOT: { status: "Blocked" } }]);
  });

  it("attribute path lookup", () => {
    const w = buildSegmentWhere(ORG, {
      all: [{ field: "attribute", op: "eq", key: "plan", value: "pro" }],
    });
    expect(w.AND).toEqual([{ attributes: { path: ["plan"], equals: "pro" } }]);
  });

  it("lastActive within_days produces gte clause", () => {
    const before = Date.now();
    const w = buildSegmentWhere(ORG, {
      all: [{ field: "lastActive", op: "active_within_days", value: 7 }],
    });
    const after = Date.now();
    const clause = (w.AND as any[])[0].lastActiveAt.gte as Date;
    const sevenDaysAgo = 7 * 24 * 60 * 60 * 1000;
    expect(clause.getTime()).toBeGreaterThanOrEqual(before - sevenDaysAgo - 100);
    expect(clause.getTime()).toBeLessThanOrEqual(after - sevenDaysAgo + 100);
  });

  it("any rules → OR clause", () => {
    const w = buildSegmentWhere(ORG, {
      any: [
        { field: "status", op: "eq", value: "Active" },
        { field: "status", op: "eq", value: "Pending" },
      ],
    });
    expect(w.OR).toEqual([{ status: "Active" }, { status: "Pending" }]);
    expect(w.AND).toBeUndefined();
  });

  it("empty rules produce no AND/OR clauses", () => {
    const w = buildSegmentWhere(ORG, {});
    expect(w.AND).toBeUndefined();
    expect(w.OR).toBeUndefined();
  });
});
