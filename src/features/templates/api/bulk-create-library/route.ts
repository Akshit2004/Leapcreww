import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

const LIBRARY_TEMPLATES = [
  {
    name: "order_confirmation",
    category: "Utility",
    body: "Hi {{1}}, your order has been confirmed! Expected delivery is {{2}}. Track your shipment here: {{3}}. We will keep you updated.",
    buttons: ["Track Order"],
    mediaType: "none",
  },
  {
    name: "shipping_update",
    category: "Utility",
    body: "Hi {{1}}, great news! Your order {{2}} is out for delivery and will arrive by {{3}}. Track it live now.",
    buttons: ["Track Delivery"],
    mediaType: "none",
  },
  {
    name: "appointment_reminder",
    category: "Utility",
    body: "Reminder: You have an appointment with {{1}} on {{2}} at {{3}}. Reply CONFIRM or RESCHEDULE.",
    buttons: ["Confirm", "Reschedule"],
    mediaType: "none",
  },
  {
    name: "welcome_message",
    category: "Utility",
    body: "Welcome to {{1}}, {{2}}! We are glad to have you. Check out {{3}} to get started right away.",
    buttons: ["Get Started"],
    mediaType: "none",
  },
  {
    name: "feedback_request",
    category: "Marketing",
    body: "Hi {{1}}, we'd love your feedback on your recent experience with {{2}}. It'll only take 2 minutes!",
    buttons: ["Give Feedback"],
    mediaType: "none",
  },
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = await request.json();
    if (!organizationId) {
      return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
    }

    // Get org's WABA ID and use System User Token
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { whatsappBusinessAccountId: true, whatsappConnected: true },
    });

    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    const wabaId = org?.whatsappBusinessAccountId;

    if (!systemToken || !wabaId || !org?.whatsappConnected) {
      return NextResponse.json({ error: "WhatsApp not configured. Complete Embedded Signup first." }, { status: 400 });
    }

    // First fetch all existing templates from Meta to check for name conflicts
    const listUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/message_templates?limit=250`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${systemToken}` },
    });
    const listData = await listRes.json();
    const existingMetaTemplates: Record<string, string> = {};
    if (listRes.ok && listData.data) {
      for (const t of listData.data) {
        existingMetaTemplates[t.name] = t.id;
      }
    }

    const results: { name: string; success: boolean; metaId?: string; error?: string }[] = [];

    for (const tpl of LIBRARY_TEMPLATES) {
      try {
        // If template already exists in Meta, skip creation
        if (existingMetaTemplates[tpl.name]) {
          const metaId = existingMetaTemplates[tpl.name];
          const existing = await prisma.template.findFirst({
            where: { name: tpl.name, organizationId },
          });
          if (!existing) {
            await prisma.template.create({
              data: {
                name: tpl.name,
                body: tpl.body,
                category: tpl.category,
                buttons: tpl.buttons,
                mediaType: tpl.mediaType,
                metaStatus: "pending",
                metaId,
                organizationId,
              },
            });
          }
          results.push({ name: tpl.name, success: true, metaId });
          continue;
        }

        const varRegex = /\{\{(\d+)\}\}/g;
        const matches = Array.from(tpl.body.matchAll(varRegex)).map((m) => parseInt(m[1]));
        const uniqueVarCount = new Set(matches).size;

        interface LibraryBodyComponent {
          type: string;
          text: string;
          example?: {
            body_text: string[][];
          };
        }
        const bodyComponent: LibraryBodyComponent = {
          type: "BODY",
          text: tpl.body,
        };

        if (uniqueVarCount > 0) {
          const sampleValues = Array.from({ length: uniqueVarCount }, (_, i) => `[Sample ${i + 1}]`);
          bodyComponent.example = {
            body_text: [sampleValues],
          };
        }

        const components: unknown[] = [bodyComponent];

        if (tpl.buttons.length > 0) {
          components.push({
            type: "BUTTONS",
            buttons: tpl.buttons.map((text) => ({
              type: "QUICK_REPLY",
              text,
            })),
          });
        }

        const createUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/message_templates`;
        const metaRes = await fetch(createUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${systemToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: tpl.name,
            category: tpl.category.toUpperCase(),
            language: "en_US",
            components,
          }),
        });

        const metaData = await metaRes.json();

        if (metaRes.ok && metaData.id) {
          const existing = await prisma.template.findFirst({
            where: { name: tpl.name, organizationId },
          });

          if (existing) {
            await prisma.template.update({
              where: { id: existing.id },
              data: {
                body: tpl.body,
                category: tpl.category,
                buttons: tpl.buttons,
                metaStatus: metaData.status?.toLowerCase() || "pending",
                metaId: metaData.id,
              },
            });
          } else {
            await prisma.template.create({
              data: {
                name: tpl.name,
                body: tpl.body,
                category: tpl.category,
                buttons: tpl.buttons,
                mediaType: tpl.mediaType,
                metaStatus: metaData.status?.toLowerCase() || "pending",
                metaId: metaData.id,
                organizationId,
              },
            });
          }

          results.push({ name: tpl.name, success: true, metaId: metaData.id });
        } else {
          const ec = metaData.error?.code || "unknown";
          const em = metaData.error?.message || "Meta API rejected";
          const et = metaData.error?.error_user_title || "";
          const eu = metaData.error?.error_user_msg || "";
          const fullError = `[${ec}] ${em}${et ? ` — ${et}: ${eu}` : ""}`;
          results.push({ name: tpl.name, success: false, error: fullError });
        }
      } catch (err: unknown) {
        results.push({ name: tpl.name, success: false, error: (err instanceof Error ? err.message : String(err)) });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    await prisma.systemLog.create({
      data: {
        type: "crm",
        message: `Library template submission: ${successCount} succeeded, ${failCount} failed.`,
        organizationId,
      },
    });

    return NextResponse.json({ results, successCount, failCount });
  } catch (err: unknown) {
    console.error("Bulk library submission error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
