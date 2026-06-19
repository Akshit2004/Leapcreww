/**
 * successFeeService.ts — Meters success-fee outcomes for the COD Risk Engine.
 *
 * Records events to UsageEvent with costMinor=0 (success fee billing is invoiced
 * separately, not wallet-deducted). The type field is used by the billing summary
 * to count outcomes and compute estimated platform success fees.
 *
 * Event types:
 *   cod_rescue           — COD order confirmed via WhatsApp (saved from RTO)
 *   prepaid_conversion   — COD→prepaid conversion completed (highest value)
 *   ndr_rescue           — NDR resolved via WhatsApp (confirmed / rescheduled / address)
 *
 * Fee schedule (estimates — actual invoicing is manual):
 *   cod_rescue:         ₹10 / event
 *   prepaid_conversion: ₹15 / event (additive to cod_rescue)
 *   ndr_rescue:         ₹10 / event
 */
import { prisma } from "@/shared/lib/prisma";

const FEE_PAISE = {
  cod_rescue: 1000,
  prepaid_conversion: 1500,
  ndr_rescue: 1000,
} as const;

type SuccessFeeType = keyof typeof FEE_PAISE;

export interface SuccessFeeSummary {
  codRescues: number;
  prepaidConversions: number;
  ndrRescues: number;
  totalEvents: number;
  estimatedFeePaise: number;
}

async function record(orgId: string, type: SuccessFeeType, traceId: string): Promise<void> {
  try {
    await prisma.usageEvent.create({
      data: {
        type,
        category: "service",
        units: 1,
        costMinor: 0,
        campaignId: traceId,
        organizationId: orgId,
      },
    });
  } catch (err) {
    console.warn(`[SuccessFee] record(${type}) failed:`, err);
  }
}

/** COD order confirmed via WhatsApp — saved from RTO. */
export function recordCodRescue(orgId: string, orderId: string, _valuePaise?: number): Promise<void> {
  return record(orgId, "cod_rescue", orderId);
}

/** COD→prepaid conversion completed via Razorpay. */
export function recordPrepaidConversion(orgId: string, orderId: string, _valuePaise?: number): Promise<void> {
  return record(orgId, "prepaid_conversion", orderId);
}

/** NDR resolved (confirmed / rescheduled / address updated) via WhatsApp. */
export function recordNdrRescue(orgId: string, ndrEventId: string, _valuePaise?: number): Promise<void> {
  return record(orgId, "ndr_rescue", ndrEventId);
}

/** Monthly success fee summary for an org. Defaults to current calendar month. */
export async function getSuccessFeeSummary(orgId: string, month?: Date): Promise<SuccessFeeSummary> {
  const ref = month ?? new Date();
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);

  const events = await prisma.usageEvent.findMany({
    where: {
      organizationId: orgId,
      type: { in: ["cod_rescue", "prepaid_conversion", "ndr_rescue"] },
      createdAt: { gte: start, lt: end },
    },
    select: { type: true },
  });

  const codRescues = events.filter((e) => e.type === "cod_rescue").length;
  const prepaidConversions = events.filter((e) => e.type === "prepaid_conversion").length;
  const ndrRescues = events.filter((e) => e.type === "ndr_rescue").length;
  const totalEvents = events.length;
  const estimatedFeePaise =
    codRescues * FEE_PAISE.cod_rescue +
    prepaidConversions * FEE_PAISE.prepaid_conversion +
    ndrRescues * FEE_PAISE.ndr_rescue;

  return { codRescues, prepaidConversions, ndrRescues, totalEvents, estimatedFeePaise };
}
