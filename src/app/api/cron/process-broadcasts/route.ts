import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/lib/whatsapp";

async function processCampaigns() {
  const timeHelper = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // Find all scheduled campaigns ready to send
  const now = new Date();
  const pendingCampaigns = await prisma.campaign.findMany({
    where: {
      status: "Scheduled",
      scheduledAt: {
        lte: now,
      },
    },
  });

  const results = [];

  for (const campaign of pendingCampaigns) {
    const {
      id: campaignId,
      name,
      targetTag,
      excludeTag,
      templateName,
      mediaType,
      mediaUrl,
      variables,
      delay = 1,
      organizationId,
    } = campaign;

    try {
      // 1. Update status to Sending
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "Sending",
          date: new Date().toISOString().split("T")[0],
        },
      });

      await prisma.systemLog.create({
        data: {
          timestamp: timeHelper(),
          type: "campaign",
          message: `Scheduled broadcast campaign '${name}' processing has commenced.`,
          organizationId,
        },
      });

      // 2. Query target contacts
      const allContacts = await prisma.contact.findMany({
        where: targetTag === "all"
          ? { organizationId }
          : { organizationId, tags: { has: targetTag } },
      });

      const contacts = excludeTag
        ? allContacts.filter((c) => !c.tags.includes(excludeTag))
        : allContacts;

      const totalRecipients = contacts.length;

      // Update total sent metric
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          sent: totalRecipients,
        },
      });

      let deliveredCount = 0;
      interface CampaignVariable {
        key: string;
        type: "contact_field" | "static";
        value: string;
      }
      const parsedVariables = (variables as unknown as CampaignVariable[]) || [];
      const delayInSeconds = delay || 1;

      // 3. Sequential transmission loop
      for (const contact of contacts) {
        const phone = formatPhoneNumber(contact.phone);
        console.log(`[Scheduled Cron Engine] Sending template to ${phone} for campaign '${name}'`);

        // Formulate parameters dynamically matching contact schema
        const parameters = parsedVariables.map((v) => {
          if (v.type === "contact_field") {
            if (v.value === "name") return { type: "text", text: contact.name };
            if (v.value === "email") return { type: "text", text: contact.email };
            if (v.value === "phone") return { type: "text", text: contact.phone };
          }
          return { type: "text", text: v.value || "" };
        });

        // Meta template structure
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
          language: { code: "en_US" },
        };

        if (parameters.length > 0) {
          templatePayload.components = [
            {
              type: "body",
              parameters: parameters,
            },
          ];
        }

        if (mediaType && mediaType !== "none" && mediaUrl) {
          templatePayload.components = templatePayload.components || [];
          const headerParams: WhatsAppTemplateParameter = {
            type: mediaType,
          };
          headerParams[mediaType] = { link: mediaUrl };

          templatePayload.components.push({
            type: "header",
            parameters: [headerParams],
          });
        }

        const result = await sendWhatsAppMessage(
          {
            to: phone,
            template: templatePayload as unknown as { name: string; language: { code: string; }; components?: Record<string, unknown>[] },
          },
          organizationId
        );

        const logTime = timeHelper();

        if (!result.ok) {
          console.error(`[Scheduled Cron Engine] Failed to send to ${phone}:`, result.error);
          await prisma.systemLog.create({
            data: {
              timestamp: logTime,
              type: "campaign",
              message: `Scheduled broadcast failed to ${contact.name} (${phone}): ${result.error}`,
              organizationId,
            },
          });
        } else {
          deliveredCount++;

          await prisma.systemLog.create({
            data: {
              timestamp: logTime,
              type: "campaign",
              message: `Scheduled broadcast successfully sent to ${contact.name} (${phone})`,
              organizationId,
            },
          });

          // CRM Preview Text
          let previewText = `[Template Message: ${templateName}]`;
          if (parameters.length > 0) {
            previewText = `[Template: ${templateName}] | Params: ${parameters.map((p: WhatsAppTemplateParameter) => p.text).join(", ")}`;
          }

          // Add Message bubble into CRM
          await prisma.message.create({
            data: {
              sender: "agent",
              text: previewText,
              timestamp: logTime,
              contactId: contact.id,
              organizationId,
            },
          });
        }

        // Incrementally save delivered metrics
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            delivered: deliveredCount,
          },
        });

        // Sequential pacing delay
        if (delayInSeconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayInSeconds * 1000));
        }
      }

      // 4. Trigger progressive funnel growth simulation (simulating delivery/read tracking) in background
      if (deliveredCount > 0) {
        (async () => {
          try {
            const funnelStages = [
              { readPercent: 0.35, clickPercent: 0.05 },
              { readPercent: 0.65, clickPercent: 0.15 },
              { readPercent: 0.85, clickPercent: 0.28 },
              { readPercent: 0.95, clickPercent: 0.42 },
            ];

            for (let step = 0; step < funnelStages.length; step++) {
              await new Promise((resolve) => setTimeout(resolve, 3000));
              const stage = funnelStages[step];
              const activeRead = Math.min(deliveredCount, Math.round(deliveredCount * stage.readPercent));
              const activeClicked = Math.min(activeRead, Math.round(deliveredCount * stage.clickPercent));

              await prisma.campaign.update({
                where: { id: campaignId },
                data: {
                  read: activeRead,
                  clicked: activeClicked,
                },
              });
            }
          } catch (funnelErr) {
            console.error("[Cron Funnel Simulator Error]:", funnelErr);
          }
        })();
      }

      // 5. Finalize Campaign status
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "Completed",
        },
      });

      await prisma.systemLog.create({
        data: {
          timestamp: timeHelper(),
          type: "campaign",
          message: `Scheduled broadcast campaign '${name}' successfully processed and completed.`,
          organizationId,
        },
      });

      results.push({
        campaignId,
        name,
        recipients: totalRecipients,
        delivered: deliveredCount,
        status: "Completed",
      });
    } catch (err: unknown) {
      console.error(`Error processing campaign ${campaignId}:`, err);
      results.push({
        campaignId,
        name,
        error: (err instanceof Error ? err.message : String(err)) || "Failed during execution loop",
        status: "Failed",
      });

      // Update campaign status to Scheduled again or Failed to allow debugging
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "Failed",
        },
      }).catch(() => {});
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    // Cron authorization guard
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await processCampaigns();
    return NextResponse.json({
      ok: true,
      processedCount: report.length,
      report,
    });
  } catch (error: unknown) {
    console.error("[Cron process-broadcasts Error]:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await processCampaigns();
    return NextResponse.json({
      ok: true,
      processedCount: report.length,
      report,
    });
  } catch (error: unknown) {
    console.error("[Cron process-broadcasts Error]:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
