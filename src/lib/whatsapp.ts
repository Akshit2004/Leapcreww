export interface WhatsAppMessage {
  to: string;
  text?: string;
  template?: { name: string; language: { code: string }; components?: any[] };
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

export function getWhatsAppConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "wappflow_verify_2026";
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!phoneNumberId || !accessToken || !appSecret) {
    return null;
  }

  return { phoneNumberId, accessToken, apiVersion, verifyToken, appSecret };
}

function isValidConfig(): boolean {
  return getWhatsAppConfig() !== null;
}

export async function sendWhatsAppMessage(
  message: WhatsAppMessage
): Promise<{ ok: boolean; data?: any; error?: string }> {
  const config = getWhatsAppConfig();
  if (!config) {
    return { ok: false, error: "WhatsApp API not configured (missing PHONE_NUMBER_ID, ACCESS_TOKEN, or APP_SECRET)" };
  }

  const { phoneNumberId, accessToken, apiVersion } = config;

  const body: Record<string, any> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: message.to,
  };

  if (message.text) {
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
  } else if (message.buttons) {
    body.type = "interactive";
    body.interactive = {
      type: "button",
      body: { text: message.text || "" },
      action: { buttons: message.buttons },
    };
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
  } catch (err: any) {
    return { ok: false, error: err.message || "Network error sending WhatsApp message" };
  }
}

export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null
): { verified: boolean; challenge?: string } {
  const config = getWhatsAppConfig();
  const expectedToken = config?.verifyToken || "wappflow_verify_2026";

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return { verified: true, challenge };
  }
  return { verified: false };
}

export function validateWebhookSignature(signature: string | null, body: string): boolean {
  const config = getWhatsAppConfig();
  if (!config?.appSecret) return false;
  if (!signature) return false;

  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", config.appSecret)
    .update(body)
    .digest("hex");

  const received = signature.replace("sha256=", "");
  if (received.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}