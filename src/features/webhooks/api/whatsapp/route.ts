import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook, validateWebhookSignature, WhatsAppWebhookPayload } from "@/shared/lib/whatsapp";
import {
  processStatusUpdate,
  resolveOrgForInboundMessage,
  handleTemplateStatusUpdate,
  processInboundMessage,
  handleSystemAuthWebhook,
} from "../../services/whatsappInboundService";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const result = verifyWebhook(mode, token, challenge);

  if (result.verified) {
    return new NextResponse(result.challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-hub-signature-256");
    const bodyText = await req.text();

    if (!validateWebhookSignature(signature, bodyText)) {
      console.warn("WhatsApp webhook: missing or invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: WhatsAppWebhookPayload = JSON.parse(bodyText);

    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Invalid webhook object" }, { status: 400 });
    }

    for (const entry of payload.entry) {
      const entryWabaId = entry.id; // The WABA ID from the webhook payload

      for (const change of entry.changes) {
        const { value } = change;

        // ─── Message Template Status Updates ────────────────────────
        // Meta posts these when a template's review verdict changes. We flip the
        // local metaStatus and resume/cancel any AI-strategist campaign parked on it.
        if (change.field === "message_template_status_update" && value.event) {
          await handleTemplateStatusUpdate(entryWabaId, value);
          continue;
        }

        // ─── Status Updates ─────────────────────────────────────────
        if (value.statuses) {
          for (const status of value.statuses) {
            await processStatusUpdate(status);
          }
        }

        // ─── Inbound Messages ───────────────────────────────────────
        if (value.messages) {
          for (const msg of value.messages) {
            const waFrom = msg.from;
            const text = msg.text?.body || msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || msg.button?.text || (msg.order ? "WhatsApp Native Order" : (msg.interactive?.type === "nfm_reply" ? "WhatsApp Flow Response" : ""));
            const profileName = value.contacts?.[0]?.profile?.name || `Customer ${waFrom.slice(-4)}`;

            console.log(`WhatsApp message from ${waFrom} (${profileName}): ${text}`);

            const phoneNumberId = value.metadata?.phone_number_id;
            if (!phoneNumberId) {
              console.warn("WhatsApp webhook: missing phone_number_id in metadata, skipping");
              continue;
            }

            // ─── System-Level Auth Code Interception ───
            if (text.toUpperCase().includes("VERIFICATION CODE: WPF-")) {
              await handleSystemAuthWebhook(text, waFrom, phoneNumberId);
              continue;
            }

            const routing = await resolveOrgForInboundMessage(phoneNumberId, entryWabaId);
            if (!routing.matched) continue;

            await processInboundMessage(routing.orgId, waFrom, text, profileName, msg.id, msg.order, msg.referral, msg.interactive);
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err: unknown) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
