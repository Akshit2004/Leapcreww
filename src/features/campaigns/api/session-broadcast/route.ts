import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { recordTouch } from "@/features/analytics/services/attribution";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      targetTag,
      text,
      organizationId,
      delay = 1,
      scheduledAt
    } = await request.json();

    if (!name || !targetTag || !text || !organizationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find contacts with the target tag (or all contacts)
    const taggedContacts = await prisma.contact.findMany({
      where: targetTag === "all"
        ? { organizationId }
        : { organizationId, tags: { has: targetTag } }
    });

    if (taggedContacts.length === 0) {
      return NextResponse.json({ error: "No contacts match the selected tag" }, { status: 400 });
    }

    // Filter to only contacts active in the 24h customer-initiated window
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const contactIds = taggedContacts.map((c) => c.id);

    const recentMessages = await prisma.message.groupBy({
      by: ["contactId"],
      where: {
        contactId: { in: contactIds },
        sender: "user",
        createdAt: { gte: twentyFourHoursAgo }
      },
      _max: { createdAt: true }
    });

    const recentContactIds = new Set(recentMessages.map((r) => r.contactId));
    const eligibleContacts = taggedContacts.filter((c) => recentContactIds.has(c.id));

    if (eligibleContacts.length === 0) {
      return NextResponse.json({
        error: "No contacts with messages in the last 24 hours. Free-form session messaging only works within the customer-initiated window.",
        eligibleCount: 0
      }, { status: 400 });
    }

    const recipientCount = eligibleContacts.length;
    const isScheduled = !!scheduledAt;

    const campaign = await prisma.campaign.create({
      data: {
        name,
        targetTag,
        templateName: "__session_broadcast__",
        sent: recipientCount,
        delivered: 0,
        read: 0,
        clicked: 0,
        status: isScheduled ? "Scheduled" : "Sending",
        date: new Date().toISOString().split("T")[0],
        scheduledAt: isScheduled ? new Date(scheduledAt) : null,
        organizationId
      }
    });

    if (isScheduled) {
      // Return early and let the cron job process it
      return NextResponse.json({
        campaign,
        eligibleCount: recipientCount,
        totalTagged: taggedContacts.length,
        skippedInactive: taggedContacts.length - recipientCount
      });
    }

    (async () => {
      try {
        const timeHelper = () => {
          const d = new Date();
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        };

        let deliveredCount = 0;

        for (const contact of eligibleContacts) {
          const phone = formatPhoneNumber(contact.phone);
          const timeStr = timeHelper();

          const result = await sendWhatsAppMessage({ to: phone, text }, organizationId);
          const waMessageId = result.data?.messages?.[0]?.id;

          if (!result.ok) {
            console.error(`Session broadcast failed to ${phone}:`, result.error);
            await prisma.systemLog.create({
              data: {
                timestamp: timeStr,
                type: "campaign",
                message: `Session broadcast delivery failed to ${contact.name} (${phone}): ${result.error}`,
                organizationId,
                campaignId: campaign.id
              }
            });
          } else {
            deliveredCount++;
            const previewText = text.length > 50 ? text.substring(0, 47) + "..." : text;
            await prisma.message.create({
              data: {
                sender: "agent",
                text: previewText,
                timestamp: timeStr,
                contactId: contact.id,
                organizationId,
                waMessageId,
                campaignId: campaign.id
              }
            });
            await prisma.contact.update({
              where: { id: contact.id },
              data: {
                lastMessage: previewText,
                lastMessageTime: timeStr
              }
            });
            await prisma.systemLog.create({
              data: {
                timestamp: timeStr,
                type: "campaign",
                message: `Session broadcast sent to ${contact.name} (${phone})`,
                organizationId,
                campaignId: campaign.id
              }
            });
            // D-04: record a campaign touch for last-touch revenue attribution.
            await recordTouch({ organizationId, contactId: contact.id, channel: "campaign", campaignId: campaign.id });
          }

          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { delivered: deliveredCount }
          });

          await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "Completed" }
        });

        await prisma.systemLog.create({
          data: {
            timestamp: timeHelper(),
            type: "campaign",
            message: `Session broadcast '${name}' completed.`,
            organizationId,
            campaignId: campaign.id
          }
        });
      } catch (workerErr: unknown) {
        console.error("[Session Broadcast Worker Error]:", workerErr);
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "Failed" }
        }).catch(() => {});
      }
    })();

    return NextResponse.json({
      campaign,
      eligibleCount: recipientCount,
      totalTagged: taggedContacts.length,
      skippedInactive: taggedContacts.length - recipientCount
    });
  } catch (err: unknown) {
    console.error("Session broadcast error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
