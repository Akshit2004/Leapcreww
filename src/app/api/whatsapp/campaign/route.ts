import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, targetTag, templateName, organizationId } = await request.json();

    if (!name || !targetTag || !templateName || !organizationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get matching contacts in DB
    const contacts = await prisma.contact.findMany({
      where: {
        organizationId,
        tags: { has: targetTag }
      }
    });

    const recipientCount = contacts.length;

    // Create the campaign in DB
    const campaign = await prisma.campaign.create({
      data: {
        name,
        targetTag,
        templateName,
        sent: recipientCount,
        delivered: recipientCount, // Mock for sandbox view
        read: 0,
        clicked: 0,
        status: "Completed",
        date: new Date().toISOString().split("T")[0],
        organizationId
      }
    });

    // Send the actual WhatsApp message to each contact!
    for (const contact of contacts) {
      const phone = formatPhoneNumber(contact.phone);
      console.log(`Sending campaign template message to ${phone}`);
      
      const result = await sendWhatsAppMessage({
        to: phone,
        template: {
          name: templateName,
          language: { code: "en_US" }
        }
      });

      const d = new Date();
      const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

      if (!result.ok) {
        console.error(`Failed to send campaign message to ${phone}:`, result.error);
        // Create an error log in the system logs
        await prisma.systemLog.create({
          data: {
            timestamp: timeStr,
            type: "campaign",
            message: `Campaign delivery failed to ${contact.name} (${phone}): ${result.error}`,
            organizationId
          }
        });
      } else {
        console.log(`Successfully sent template to ${phone}`);
        // Create a successful log in system logs
        await prisma.systemLog.create({
          data: {
            timestamp: timeStr,
            type: "campaign",
            message: `Campaign successfully sent to ${contact.name} (${phone})`,
            organizationId
          }
        });

        // Add a message bubble in their chat history so they can see it in CRM inbox!
        await prisma.message.create({
          data: {
            sender: "agent",
            text: `[Template Message: ${templateName}]`, // Message body text representational
            timestamp: timeStr,
            contactId: contact.id,
            organizationId
          }
        });
      }
    }

    return NextResponse.json({ campaign });
  } catch (err: any) {
    console.error("Launch campaign error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
