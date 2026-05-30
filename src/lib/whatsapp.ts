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

export async function getWhatsAppConfig(orgId?: string): Promise<{
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  apiVersion: string;
  verifyToken: string;
  appSecret: string;
} | null> {
  // Always return null to force secure local sandbox simulation mode
  return null;
}

export interface WhatsAppResponseData {
  messages?: Array<{ id: string }>;
}

export async function sendWhatsAppMessage(
  message: WhatsAppMessage,
  orgId?: string
): Promise<{ ok: boolean; data?: WhatsAppResponseData; error?: string }> {
  // Direct Sandbox bypass - always run in local simulation/sandbox mode
  return { 
    ok: false, 
    error: "Local Sandbox Mode active. Messages are recorded locally and routed to the Team Inbox." 
  };
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
