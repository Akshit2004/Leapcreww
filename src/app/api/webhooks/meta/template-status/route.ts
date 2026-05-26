import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Meta sends template status updates in this shape:
    // {
    //   "object": "whatsapp_business_account",
    //   "entry": [{
    //     "id": "WABA_ID",
    //     "changes": [{
    //       "field": "message_template_status_update",
    //       "value": {
    //         "event": "TEMPLATE_STATUS_UPDATE",
    //         "message_template_id": 123456789,
    //         "message_template_name": "my_template",
    //         "old_status": "PENDING",
    //         "new_status": "APPROVED",
    //         "rejected_reason": null
    //       }
    //     }]
    //   }]
    // }

    console.log("[Meta Template Webhook] Received:", JSON.stringify(body));

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Invalid object" }, { status: 400 });
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "message_template_status_update") continue;

        const value = change.value;
        if (!value) continue;

        const metaId = String(value.message_template_id);
        const newStatus = (value.new_status || "").toLowerCase();
        const oldStatus = (value.old_status || "").toLowerCase();
        const templateName = value.message_template_name;
        const rejectedReason = value.rejected_reason || null;

        console.log(`[Meta Template Webhook] Template "${templateName}" (${metaId}): ${oldStatus} → ${newStatus}`);

        // Map Meta status to app status
        let mappedStatus = "pending";
        if (newStatus === "approved") mappedStatus = "approved";
        else if (newStatus === "rejected") mappedStatus = "rejected";
        else if (newStatus === "flagged") mappedStatus = "rejected";

        // Find the template by metaId OR by name
        const existing = await prisma.template.findFirst({
          where: {
            OR: [
              { metaId },
              { name: templateName }
            ]
          }
        });

        if (existing) {
          await prisma.template.update({
            where: { id: existing.id },
            data: {
              metaStatus: mappedStatus,
              metaId,
            }
          });

          await prisma.systemLog.create({
            data: {
              timestamp: new Date().toISOString(),
              type: "crm",
              message: `Template "${templateName}" status updated via Meta webhook: ${mappedStatus.toUpperCase()}${rejectedReason ? ` (Reason: ${rejectedReason})` : ""}`,
              organizationId: existing.organizationId,
            }
          });

          console.log(`[Meta Template Webhook] Updated template "${templateName}" → ${mappedStatus}`);
        } else {
          console.warn(`[Meta Template Webhook] Template "${templateName}" not found in DB, skipping.`);
        }
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err: unknown) {
    console.error("[Meta Template Webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Meta sends a GET to verify the webhook
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "wappflow_verify_2026";

  if (mode === "subscribe" && token === expectedToken && challenge) {
    console.log("[Meta Template Webhook] Verified!");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}
