/**
 * analyticsRepo.ts — All Prisma access for the analytics feature.
 *
 * Covers the cart-recovery and RTO/NDR analytics data surfaces.
 * Services call these; routes never touch prisma directly.
 */
import { prisma } from "@/shared/lib/prisma";

// ─── Cart-recovery analytics ─────────────────────────────────────────────────

export type CartEnrollmentRow = {
  id: string;
  contactId: string;
  status: string;
  createdAt: Date;
  contact: {
    id: string;
    name: string;
    phone: string;
    attributes: unknown;
  };
};

/**
 * Fetch all SequenceEnrollment rows for sequences whose trigger is
 * "cart_abandoned", newest first, including the contact's CRM attributes.
 */
export function findCartAbandonedEnrollments(
  organizationId: string
): Promise<CartEnrollmentRow[]> {
  return prisma.sequenceEnrollment.findMany({
    where: { organizationId, sequence: { trigger: "cart_abandoned" } },
    orderBy: { createdAt: "desc" },
    include: {
      contact: { select: { id: true, name: true, phone: true, attributes: true } },
    },
  });
}

// ─── RTO / NDR analytics ─────────────────────────────────────────────────────

export type NdrEventRow = {
  status: string;
  attempt: number | null;
  createdAt: Date;
};

/** Fetch all NDR events for an org (status + attempt — no PII). */
export function findNdrEvents(organizationId: string): Promise<NdrEventRow[]> {
  return prisma.ndrEvent.findMany({
    where: { organizationId },
    select: { status: true, attempt: true, createdAt: true },
  });
}

export type CodOrderRow = {
  codStatus: string | null;
  paymentStatus: string;
  razorpayOrderId: string | null;
  total: number;
};

/** Fetch all orders that have a COD-lifecycle status column. */
export function findCodOrders(organizationId: string): Promise<CodOrderRow[]> {
  return prisma.order.findMany({
    where: { organizationId, codStatus: { not: null } },
    select: { codStatus: true, paymentStatus: true, razorpayOrderId: true, total: true },
  });
}

/** Count contacts tagged as high-risk COD. */
export function countHighRiskCodContacts(organizationId: string): Promise<number> {
  return prisma.contact.count({
    where: { organizationId, tags: { has: "COD-High-Risk" } },
  });
}

// ─── Token prepay analytics ───────────────────────────────────────────────────

export interface TokenPrepayStats {
  sent: number;
  paid: number;
  expired: number;
}

export async function getTokenPrepayStats(organizationId: string): Promise<TokenPrepayStats> {
  const [pending, paid, expired] = await Promise.all([
    prisma.contact.count({
      where: { organizationId, attributes: { path: ["token_prepay_pending"], equals: true } },
    }),
    prisma.contact.count({ where: { organizationId, tags: { has: "cod-token-confirmed" } } }),
    prisma.contact.count({ where: { organizationId, tags: { has: "Token-Expired" } } }),
  ]);
  return { sent: pending + paid + expired, paid, expired };
}

// ─── Fulfillment hold analytics ───────────────────────────────────────────────

export interface FulfillmentHoldStats {
  activeHolds: number;
  autoReleased: number;
  totalHeld: number;
}

export async function getFulfillmentHoldStats(organizationId: string): Promise<FulfillmentHoldStats> {
  const [active, released] = await Promise.all([
    prisma.order.count({
      where: { organizationId, fulfillmentHoldId: { not: null }, codStatus: "pending" },
    }),
    // Released: had a hold stamped (fulfillmentHeldAt set) but holdId cleared = auto-released
    prisma.order.count({
      where: { organizationId, fulfillmentHeldAt: { not: null }, fulfillmentHoldId: null },
    }),
  ]);
  return { activeHolds: active, autoReleased: released, totalHeld: active + released };
}

// ─── Success fee analytics ────────────────────────────────────────────────────

export interface SuccessFeeStats {
  codRescues: number;
  prepaidConversions: number;
  ndrRescues: number;
  estimatedFeePaise: number;
}

const FEE_PAISE_MAP = { cod_rescue: 1000, prepaid_conversion: 1500, ndr_rescue: 1000 } as const;

export async function getSuccessFeeStats(organizationId: string): Promise<SuccessFeeStats> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const events = await prisma.usageEvent.findMany({
    where: {
      organizationId,
      type: { in: ["cod_rescue", "prepaid_conversion", "ndr_rescue"] },
      createdAt: { gte: start },
    },
    select: { type: true },
  });

  const codRescues = events.filter((e) => e.type === "cod_rescue").length;
  const prepaidConversions = events.filter((e) => e.type === "prepaid_conversion").length;
  const ndrRescues = events.filter((e) => e.type === "ndr_rescue").length;
  const estimatedFeePaise =
    codRescues * FEE_PAISE_MAP.cod_rescue +
    prepaidConversions * FEE_PAISE_MAP.prepaid_conversion +
    ndrRescues * FEE_PAISE_MAP.ndr_rescue;

  return { codRescues, prepaidConversions, ndrRescues, estimatedFeePaise };
}

// ─── Network signal analytics ─────────────────────────────────────────────────

export interface NetworkSignalStats {
  totalSignals: number;
  uniquePhones: number;
}

export async function getNetworkSignalStats(organizationId: string): Promise<NetworkSignalStats> {
  const [totalSignals, grouped] = await Promise.all([
    prisma.networkSignal.count({ where: { organizationId } }),
    prisma.networkSignal.groupBy({
      by: ["phoneHash"],
      where: { organizationId },
      _count: { phoneHash: true },
    }),
  ]);
  return { totalSignals, uniquePhones: grouped.length };
}

// ─── Required RTO templates check ────────────────────────────────────────────

export const REQUIRED_RTO_TEMPLATES = [
  "cod_risk_verify",
  "cod_confirmation",
  "ndr_alert",
  "ndr_alert_attempt2",
  "ofd_alert",
  "rto_initiated",
] as const;

export async function getMissingRtoTemplates(organizationId: string): Promise<string[]> {
  const existing = await prisma.template.findMany({
    where: { organizationId, name: { in: [...REQUIRED_RTO_TEMPLATES] } },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((t) => t.name));
  return REQUIRED_RTO_TEMPLATES.filter((name) => !existingNames.has(name));
}
