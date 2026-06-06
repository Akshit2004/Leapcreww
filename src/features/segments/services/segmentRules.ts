/**
 * segmentRules.ts — Translate segment rules into a Prisma `where` clause.
 * Pure function, no DB access — easy to unit test. Used by broadcasts (T-04)
 * and sequence enrollment (T-03) to resolve an audience.
 */
import type { Prisma } from "@prisma/client";
import type { SegmentRule, SegmentRules } from "../types";

function ruleToWhere(rule: SegmentRule): Prisma.ContactWhereInput {
  switch (rule.field) {
    case "tags": {
      const tags = Array.isArray(rule.value)
        ? rule.value
        : String(rule.value || "").split(",").map(t => t.trim()).filter(Boolean);
      if (tags.length === 0) return {};
      if (rule.op === "in") return { tags: { hasSome: tags } };
      if (rule.op === "neq") return { NOT: { tags: { hasSome: tags } } };
      return { tags: { hasEvery: tags } }; // eq / contains => must have all
    }
    case "status":
      return rule.op === "neq"
        ? { NOT: { status: String(rule.value) } }
        : { status: String(rule.value) };
    case "source":
      return rule.op === "contains"
        ? { source: { contains: String(rule.value), mode: "insensitive" } }
        : { source: String(rule.value) };
    case "attribute": {
      // Custom attributes are stored on Contact.attributes (Json). Match on a path.
      if (!rule.key) return {};
      return { attributes: { path: [rule.key], equals: rule.value as Prisma.InputJsonValue } };
    }
    case "lastActive": {
      if (rule.op === "active_within_days") {
        const since = new Date(Date.now() - Number(rule.value) * 24 * 60 * 60 * 1000);
        return { lastActiveAt: { gte: since } };
      }
      return {};
    }
    default:
      return {};
  }
}

/** Build a Prisma where clause for an org + segment rules. */
export function buildSegmentWhere(organizationId: string, rules: SegmentRules): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = { organizationId };
  if (rules.all?.length) where.AND = rules.all.map(ruleToWhere);
  if (rules.any?.length) where.OR = rules.any.map(ruleToWhere);
  return where;
}
