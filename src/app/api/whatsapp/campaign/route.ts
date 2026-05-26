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

    const { 
      name, 
      targetTag, 
      templateName, 
      organizationId,
      variables = [], // Array<{ key: string; type: 'contact_field' | 'static'; value: string }>
      delay = 1,      // Message spacing delay in seconds
      scheduledAt,    // Optional Date-time string for future scheduling
      excludeTag,
      mediaType,
      mediaUrl
    } = await request.json();

    if (!name || !targetTag || !templateName || !organizationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get matching contacts in DB
    const allContacts = await prisma.contact.findMany({
      where: targetTag === "all"
        ? { organizationId }
        : { organizationId, tags: { has: targetTag } }
    });

    const contacts = excludeTag 
      ? allContacts.filter(c => !c.tags.includes(excludeTag))
      : allContacts;

    const recipientCount = contacts.length;
    const isScheduled = !!scheduledAt;

    // Create the campaign in DB
    // If scheduled, initial status is "Scheduled" and date stores the scheduled timestamp
    // If immediate, initial status is "Sending"
    const campaign = await prisma.campaign.create({
      data: {
        name,
        targetTag,
        excludeTag,
        templateName,
        mediaType,
        mediaUrl,
        variables: variables || [],
        delay: delay || 1,
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
      // Return early and let the cron job process it later
      return NextResponse.json({ campaign });
    }

    // Fire off asynchronous background campaign worker
    (async () => {
      try {
        const timeHelper = () => {
          const d = new Date();
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        };

        let deliveredCount = 0;

        for (const contact of contacts) {
          const phone = formatPhoneNumber(contact.phone);
          console.log(`[Broadcast Engine] Sending template message to ${phone}`);

          interface CampaignVariable {
            key: string;
            type: "contact_field" | "static";
            value: string;
          }
          const parsedVariables = (variables as unknown as CampaignVariable[]) || [];
          const parameters = parsedVariables.map((v) => {
            if (v.type === "contact_field") {
              if (v.value === "name") return { type: "text", text: contact.name };
              if (v.value === "email") return { type: "text", text: contact.email };
              if (v.value === "phone") return { type: "text", text: contact.phone };
            }
            return { type: "text", text: v.value || "" };
          });

          interface WhatsAppTemplateParameter {
            type: string;
            text?: string;
            [key: string]: unknown;
          }
          
          interface WhatsAppTemplateComponent {
            type: string;
            parameters: WhatsAppTemplateParameter[];
          }

          interface WhatsAppTemplatePayload {
            name: string;
            language: { code: string };
            components?: WhatsAppTemplateComponent[];
          }

          const templatePayload: WhatsAppTemplatePayload = {
            name: templateName,
            language: { code: "en_US" }
          };

          if (parameters.length > 0) {
            templatePayload.components = [
              {
                type: "body",
                parameters: parameters
              }
            ];
          }

          if (mediaType && mediaType !== "none" && mediaUrl) {
            const headerParams: WhatsAppTemplateParameter = {
              type: mediaType,
            };
            headerParams[mediaType] = { link: mediaUrl };

            if (!templatePayload.components) {
              templatePayload.components = [];
            }
            templatePayload.components.push({
              type: "header",
              parameters: [headerParams]
            });
          }

          const result = await sendWhatsAppMessage({
            to: phone,
            template: templatePayload as unknown as { name: string; language: { code: string; }; components?: Record<string, unknown>[] }
          }, organizationId);

          const timeStr = timeHelper();
          const waMessageId = result.data?.messages?.[0]?.id;

          if (!result.ok) {
            console.error(`Failed to send campaign message to ${phone}:`, result.error);
            await prisma.systemLog.create({
              data: {
                timestamp: timeStr,
                type: "campaign",
                message: `Broadcast delivery failed to ${contact.name} (${phone}): ${result.error}`,
                organizationId,
                campaignId: campaign.id
              }
            });
          } else {
            console.log(`Successfully sent template to ${phone}`);
            deliveredCount++;

            await prisma.systemLog.create({
              data: {
                timestamp: timeStr,
                type: "campaign",
                message: `Broadcast successfully sent to ${contact.name} (${phone})`,
                organizationId,
                campaignId: campaign.id
              }
            });

            let previewText = `[Template Message: ${templateName}]`;
            if (parameters.length > 0) {
              previewText = `[Template: ${templateName}] | Params: ${parameters.map((p: WhatsAppTemplateParameter) => p.text).join(", ")}`;
            }

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
          }

          await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              delivered: deliveredCount
            }
          });

          await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: "Completed"
          }
        });

        await prisma.systemLog.create({
          data: {
            timestamp: timeHelper(),
            type: "campaign",
            message: `Broadcast campaign '${name}' processing completely finalized.`,
            organizationId,
            campaignId: campaign.id
          }
        });

      } catch (workerErr: unknown) {
        console.error("[Broadcast Background Worker Error]:", workerErr);
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "Failed" }
        }).catch(() => {});
      }
    })();

    return NextResponse.json({ campaign });
  } catch (err: unknown) {
    console.error("Launch campaign error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
