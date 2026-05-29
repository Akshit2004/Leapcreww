import { prisma } from "./prisma";
import * as crypto from "crypto";

export interface WhatsAppMessage {
  to: string;
  text?: string;
  template?: { name: string; language: { code: string }; components?: Record<string, unknown>[] };
  image?: { link?: string; id?: string };
  video?: { link?: string; id?: string };
  document?: { link?: string; id?: string; filename?: string };
  buttons?: { type: "reply"; reply: { id: string; title: string } }[];
}

export interface WhatsAppWebhookPayload {
  object: "whatsapp_business_account";
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: "whatsapp";
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: { profile: { name: string }; wa_id: string }[];
        messages?: {
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
          image?: { id: string; mime_type: string };
          button?: { payload: string; text: string };
          interactive?: { button_reply: { id: string; title: string } };
        }[];
        statuses?: {
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
          conversation?: { id: string };
        }[];
      };
      field: "messages";
    }[];
  }[];
}

export async function getWhatsAppConfig(orgId?: string) {
  const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "wappflow_verify_2026";
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!systemToken || !appSecret) {
    return null;
  }

  if (!orgId) {
    return null;
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        whatsappConnected: true,
        whatsappPhoneNumberId: true,
        whatsappBusinessAccountId: true,
      },
    });

    if (org?.whatsappConnected && org.whatsappPhoneNumberId) {
      return {
        phoneNumberId: org.whatsappPhoneNumberId,
        accessToken: systemToken,
        businessAccountId: org.whatsappBusinessAccountId || "",
        apiVersion,
        verifyToken,
        appSecret,
      };
    }
  } catch {
    return null;
  }

  return null;
}


export interface WhatsAppResponseData {
  messages?: Array<{ id: string }>;
}

export async function sendWhatsAppMessage(
  message: WhatsAppMessage,
  orgId?: string
): Promise<{ ok: boolean; data?: WhatsAppResponseData; error?: string }> {
  const config = await getWhatsAppConfig(orgId);
  if (!config) {
    return { ok: false, error: "WhatsApp API not configured. Connect a WhatsApp Business number first." };
  }

  const { phoneNumberId, accessToken, apiVersion } = config;

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: message.to,
  };

  if (message.buttons) {
    body.type = "interactive";
    body.interactive = {
      type: "button",
      body: { text: message.text || "" },
      action: { buttons: message.buttons },
    };
  } else if (message.text) {
    body.type = "text";
    body.text = { preview_url: true, body: message.text };
  } else if (message.template) {
    body.type = "template";
    body.template = message.template;
  } else if (message.image) {
    body.type = "image";
    body.image = message.image;
  } else if (message.video) {
    body.type = "video";
    body.video = message.video;
  } else if (message.document) {
    body.type = "document";
    body.document = message.document;
  }

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, data, error: data.error?.message || "WhatsApp API request failed" };
    }
    return { ok: true, data };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Network error sending WhatsApp message" };
  }
}

export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null
): { verified: boolean; challenge?: string } {
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "wappflow_verify_2026";

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return { verified: true, challenge };
  }
  return { verified: false };
}

export function validateWebhookSignature(signature: string | null, body: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(body)
    .digest("hex");

  const received = signature.replace("sha256=", "");
  if (received.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}
