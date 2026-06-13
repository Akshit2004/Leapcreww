import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";
import { getGroqChatCompletion } from "@/shared/lib/groq";
import { estimateSendCostMinor } from "@/features/analytics/services/cost";

interface CustomSessionUser {
  id: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "Missing organization ID (orgId)" }, { status: 400 });
    }

    const userId = (session.user as unknown as CustomSessionUser).id;
    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId: orgId },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access forbidden. You do not belong to this workspace." },
        { status: 403 }
      );
    }

    // 1. Fetch campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const campaignsData = campaigns.map(c => ({
      name: c.name,
      templateName: c.templateName,
      sent: c.sent,
      delivered: c.delivered,
      read: c.read,
      clicked: c.clicked,
      status: c.status,
    }));

    // 2. Fetch orders to calculate approximate ROI
    const orders = await prisma.order.findMany({
      where: { organizationId: orgId, paymentStatus: "paid" },
    });

    // 3. Gather contacts count
    const contactsCount = await prisma.contact.count({
      where: { organizationId: orgId },
    });

    // 4. Build overall summary
    const totalSent = campaigns.reduce((acc, c) => acc + c.sent, 0);
    const totalDelivered = campaigns.reduce((acc, c) => acc + c.delivered, 0);
    const totalRead = campaigns.reduce((acc, c) => acc + c.read, 0);
    const totalClicked = campaigns.reduce((acc, c) => acc + c.clicked, 0);
    const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
    const simulatedCost = estimateSendCostMinor("marketing", totalDelivered); // centralized send rate (paise)
    const roiMultiplier = simulatedCost > 0 ? (totalRevenue / simulatedCost).toFixed(1) : "0.0";

    // 5. Money attribution (D-04) — revenue tied to the campaign/agent that drove each sale.
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

    const narration = await getGroqChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Telemetry Data:\n${JSON.stringify(telemetry, null, 2)}` }
    ], "llama-3.3-70b-versatile");

    return NextResponse.json({ narration });
  } catch (err: any) {
    console.error("AI Analytics Narrator API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
