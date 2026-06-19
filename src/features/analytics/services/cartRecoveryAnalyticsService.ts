/**
 * cartRecoveryAnalyticsService.ts — business logic for the cart-recovery
 * analytics surface (D-04 / Recovery tab).
 *
 * Answers:
 *  - How many carts are actively being worked vs recovered vs lost?
 *  - What is the recovery rate and recovered revenue?
 *  - Intent breakdown (hot / objection / not_now / dead) from the AI analyst.
 *  - Recent analysed replies (latest 12) for the human-readable feed.
 *
 * Data comes exclusively from SequenceEnrollment rows whose sequence.trigger
 * is "cart_abandoned", deduplicated to the latest enrollment per contact (the
 * current recovery state), plus contact.attributes stamped by cartRecoveryAgent.
 */
import * as analyticsRepo from "../repositories/analyticsRepo";

export interface CartRecoveryReplyRow {
  contactId: string;
  name: string;
  label: string;
  objection: string | null;
  score: number;
  action: string;
  analysedAt: string;
}

export interface CartRecoverySummary {
  inRecovery: number;
  recovered: number;
  lost: number;
  recoveryRate: number;
  repliesHandled: number;
  recoveredRevenuePaise: number;
}

export interface CartRecoveryAnalytics {
  summary: CartRecoverySummary;
  intentBreakdown: Record<string, number>;
  recentReplies: CartRecoveryReplyRow[];
}

export async function getCartRecoveryAnalytics(
  organizationId: string
): Promise<CartRecoveryAnalytics> {
  const enrollments = await analyticsRepo.findCartAbandonedEnrollments(organizationId);

  // Dedupe to the latest enrollment per contact — represents current recovery state.
  const latestByContact = new Map<string, (typeof enrollments)[number]>();
  for (const e of enrollments) {
    if (!latestByContact.has(e.contactId)) latestByContact.set(e.contactId, e);
  }

  let inRecovery = 0;
  let recovered = 0;
  let lost = 0;
  let repliesHandled = 0;
  let recoveredRevenuePaise = 0;
  const intentBreakdown: Record<string, number> = { hot: 0, objection: 0, not_now: 0, dead: 0 };
  const recentReplies: CartRecoveryReplyRow[] = [];

  for (const e of latestByContact.values()) {
    const attrs = (e.contact.attributes as Record<string, unknown>) || {};
    const isRecovered = attrs.cart_recovered === true;
    const isActive = e.status === "active" || e.status === "paused";

    if (isRecovered) {
      recovered += 1;
      const value = parseFloat(String(attrs.cart_total ?? "0"));
      if (!Number.isNaN(value)) recoveredRevenuePaise += Math.round(value * 100);
    } else if (isActive) {
      inRecovery += 1;
    } else {
      // completed or cancelled without a recovery flag = lost
      lost += 1;
    }

    const label = typeof attrs.recovery_intent_label === "string" ? attrs.recovery_intent_label : null;
    if (label) {
      repliesHandled += 1;
      if (label in intentBreakdown) intentBreakdown[label] += 1;
      recentReplies.push({
        contactId: e.contact.id,
        name: e.contact.name,
        label,
        objection: typeof attrs.recovery_objection === "string" ? attrs.recovery_objection : null,
        score: typeof attrs.recovery_score === "number" ? attrs.recovery_score : 0,
        action: typeof attrs.recovery_action === "string" ? attrs.recovery_action : "—",
        analysedAt: typeof attrs.recovery_analysed_at === "string" ? attrs.recovery_analysed_at : "",
      });
    }
  }

  // Most recently analysed first.
  recentReplies.sort((a, b) => (a.analysedAt < b.analysedAt ? 1 : -1));

  const endedTotal = recovered + lost;
  const recoveryRate = endedTotal > 0 ? Number(((recovered / endedTotal) * 100).toFixed(1)) : 0;

  return {
    summary: {
      inRecovery,
      recovered,
      lost,
      recoveryRate,
      repliesHandled,
      recoveredRevenuePaise,
    },
    intentBreakdown,
    recentReplies: recentReplies.slice(0, 12),
  };
}
