import { Contact } from "@/shared/context/types";

// Client-side segment rule matching, shared by the Campaigns broadcast targeting
// preview and the Customers smart-folder filter so the two stay in lockstep.

export interface SegmentRule {
  field: "tags" | "status" | "source" | "attribute" | "lastActive";
  op: "eq" | "neq" | "contains" | "in" | "active_within_days";
  value: any;
  key?: string;
}

export interface SegmentRules {
  all?: SegmentRule[];
  any?: SegmentRule[];
}

export function evaluateRule(contact: Contact, rule: SegmentRule): boolean {
  switch (rule.field) {
    case "tags": {
      const tags = Array.isArray(rule.value)
        ? rule.value
        : String(rule.value || "").split(",").map((t) => t.trim()).filter(Boolean);
      if (tags.length === 0) return true;
      const hasSome = tags.some((t) => contact.tags?.includes(t));
      if (rule.op === "in") return hasSome;
      if (rule.op === "neq") return !hasSome;
      const hasEvery = tags.every((t) => contact.tags?.includes(t));
      return hasEvery;
    }
    case "status": {
      const matchesStatus = contact.status === rule.value;
      return rule.op === "neq" ? !matchesStatus : matchesStatus;
    }
    case "source": {
      const contactSource = contact.source || "";
      if (rule.op === "contains") {
        return contactSource.toLowerCase().includes(String(rule.value).toLowerCase());
      }
      return contactSource.toLowerCase() === String(rule.value).toLowerCase();
    }
    case "attribute": {
      if (!rule.key) return false;
      const val = contact.attributes?.[rule.key];
      if (val === undefined || val === null) return false;
      return String(val).toLowerCase() === String(rule.value).toLowerCase();
    }
    case "lastActive": {
      if (rule.op === "active_within_days" && contact.lastActiveAt) {
        const since = Date.now() - Number(rule.value) * 24 * 60 * 60 * 1000;
        const lastActiveTime = new Date(contact.lastActiveAt).getTime();
        return lastActiveTime >= since;
      }
      return false;
    }
    default:
      return false;
  }
}

export function evaluateSegmentRules(contact: Contact, rules: SegmentRules): boolean {
  if (!rules) return true;

  if (rules.all && rules.all.length > 0) {
    const allMatch = rules.all.every((rule) => evaluateRule(contact, rule));
    if (!allMatch) return false;
  }

  if (rules.any && rules.any.length > 0) {
    const anyMatch = rules.any.some((rule) => evaluateRule(contact, rule));
    if (!anyMatch) return false;
  }

  return true;
}
