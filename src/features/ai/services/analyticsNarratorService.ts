/**
 * analyticsNarratorService.ts — Builds revenue/engagement telemetry for an org
 * and asks Groq to narrate it in plain English. Degrades to a static message
 * (never throws / never crashes the request) when GROQ_API_KEY is absent.
 */
import { getGroqChatCompletion } from "@/shared/lib/groq";
import { estimateSendCostMinor } from "@/features/analytics/services/cost";
import * as repo from "../repositories/aiRepo";

const FALLBACK_NARRATION =
  "AI narration is currently unavailable (the assistant is not configured). Check the metrics above for delivery, read and click rates, and revenue attribution.";

export async function generateAnalyticsNarration(organizationId: string): Promise<string> {
  // 1. Recent campaigns
  const campaigns = await repo.findRecentCampaigns(organizationId, 10);
  const campaignsData = campaigns.map((c) => ({
    name: c.name,
    templateName: c.templateName,
    sent: c.sent,
    delivered: c.delivered,
    read: c.read,
    clicked: c.clicked,
    status: c.status,
  }));

  // 2. Paid orders for approximate ROI
  const orders = await repo.findPaidOrders(organizationId);

  // 3. Contacts count
  const contactsCount = await repo.countContacts(organizationId);

  // 4. Overall summary
  const totalSent = campaigns.reduce((acc, c) => acc + c.sent, 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + c.delivered, 0);
  const totalRead = campaigns.reduce((acc, c) => acc + c.read, 0);
  const totalClicked = campaigns.reduce((acc, c) => acc + c.clicked, 0);
  const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const simulatedCost = estimateSendCostMinor("marketing", totalDelivered); // centralized send rate (paise)
  const roiMultiplier = simulatedCost > 0 ? (totalRevenue / simulatedCost).toFixed(1) : "0.0";

  // 5. Money attribution — revenue tied to the campaign/agent that drove each sale.
  const campaignNameById: Record<string, string> = {};
  campaigns.forEach((c) => { campaignNameById[c.id] = c.name; });

  const revenueByCampaign: Record<string, number> = {};
  const revenueByAgent: Record<string, number> = {};
  let attributedRevenue = 0;
  for (const o of orders) {
    if (o.attributedCampaignId) {
      const label = campaignNameById[o.attributedCampaignId] || "Unknown campaign";
      revenueByCampaign[label] = (revenueByCampaign[label] || 0) + o.total;
      attributedRevenue += o.total;
    }
    const agentKey = (!o.attributedAgent || o.attributedAgent === "Bot" || o.attributedAgent === "None")
      ? "Automation"
      : o.attributedAgent;
    revenueByAgent[agentKey] = (revenueByAgent[agentKey] || 0) + o.total;
  }

  const topCampaignsByRevenue = Object.entries(revenueByCampaign)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, paise]) => ({ name, revenueINR: (paise / 100).toFixed(2) }));

  const revenueByAgentINR = Object.entries(revenueByAgent)
    .sort(([, a], [, b]) => b - a)
    .map(([agent, paise]) => ({ agent, revenueINR: (paise / 100).toFixed(2) }));

  const telemetry = {
    contactsCount,
    overallMetrics: {
      totalSent,
      totalDelivered,
      totalRead,
      totalClicked,
      deliveryRate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) + "%" : "0%",
      readRate: totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) + "%" : "0%",
      ctr: totalRead > 0 ? ((totalClicked / totalRead) * 100).toFixed(1) + "%" : "0%",
      revenueINR: (totalRevenue / 100).toFixed(2),
      attributedRevenueINR: (attributedRevenue / 100).toFixed(2),
      costINR: (simulatedCost / 100).toFixed(2),
      roi: `${roiMultiplier}x`,
    },
    topCampaignsByRevenue,
    revenueByAgent: revenueByAgentINR,
    recentCampaigns: campaignsData,
  };

  const systemPrompt = `You are LeapCreww AI Analytics Narrator. Unlike competitors who only report engagement, LeapCreww ties revenue to messages. Analyze the telemetry and write a plain-English, executive overview explaining:
1. The MONEY first: total attributed revenue, ROI (revenue ÷ send cost), and which campaigns and which agents are driving the most revenue (use topCampaignsByRevenue and revenueByAgent).
2. Overall engagement health (delivery, read, click rates) as supporting context.
3. Which campaigns are underperforming (e.g. high sends but low attributed revenue, read rate under 30%, CTR under 3%) and exactly WHY.
4. Concrete, actionable recommendations to lift revenue and ROI (better templates, timing, segments, doubling down on top performers).

Name the best and worst performer explicitly. Be brief and highly professional. Structure your response in clean markdown with a few bullet points. Limit to 200-250 words. Do not use jargon.`;

  try {
    const narration = await getGroqChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Telemetry Data:\n${JSON.stringify(telemetry, null, 2)}` },
    ], "llama-3.1-8b-instant");
    return narration || FALLBACK_NARRATION;
  } catch (err) {
    // Missing GROQ_API_KEY or a transient Groq failure should never break this page.
    console.error("[ai] Analytics narrator Groq call failed:", err);
    return FALLBACK_NARRATION;
  }
}
