/**
 * Shiprocket connector (T-07) — Indian multi-courier shipping aggregator.
 *
 * Handles:
 *   - authenticateShiprocket()        — token-based credential validation
 *   - handleShiprocketStatusUpdate()  — routes inbound status webhooks to
 *     WhatsApp automations (shipped, OFD, delivered, NDR, RTO)
 *   - shiprocketConnector             — Connector interface for the registry
 *
 * Carrier examples routed through Shiprocket: Delhivery, BlueDart, Xpressbees,
 * DTDC, Ekart, Shadow Fax.
 */
import type { Prisma } from "@prisma/client";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import { enrollOnTrigger } from "@/features/sequences/services/sequenceService";
import { handleNdrWebhook } from "@/features/ndr/services/ndrService";
import type { Connector, ConnectorContext } from "./types";

// ─── Shiprocket API ──────────────────────────────────────────────────────────

const BASE = "https://apiv2.shiprocket.in/v1/external";

/**
 * Exchange email + password for a Shiprocket JWT token.
 * Throws a descriptive Error on failure so the connect handler can return a
 * clean 400 to the caller.
 */
export async function authenticateShiprocket(
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error("Shiprocket authentication failed — check email/password.");
  }
  const data = await res.json();
  if (!data.token) {
    throw new Error("No token in Shiprocket auth response.");
  }
  return data.token as string;
}

// ─── Webhook payload shape ───────────────────────────────────────────────────

export interface ShiprocketWebhookPayload {
  awb?: string;
  awb_code?: string;       // alternate key used in some Shiprocket webhook versions
  order_id?: string | number;
  shipment_id?: string | number;
  courier_name?: string;
  attempt?: number | string; // delivery attempt number (NDR events)
  /**
   * Examples: "SHIPPED" | "OUT FOR DELIVERY" | "DELIVERED" | "NDR" |
   * "RTO INITIATED" | "RTO DELIVERED" | "PICKUP SCHEDULED" | "PICKUP GENERATED"
   */
  current_status?: string;
  customer_name?: string;
  customer_phone?: string;
  tracking_url?: string;   // Shiprocket tracking page URL
  etd?: string;            // estimated delivery date (informational only)
}

// ─── Internal helpers (mirrors ndrService pattern) ───────────────────────────

async function upsertShiprocketContact(
  orgId: string,
  phone: string,
  name?: string
) {
  const { prisma } = await import("@/shared/lib/prisma");
  const existing = await prisma.contact.findFirst({
    where: { phone, organizationId: orgId },
  });
  if (existing) {
    // Update name only when we now know it and the stored name is a placeholder.
    if (name && existing.name.startsWith("Customer ")) {
      return prisma.contact.update({
        where: { id: existing.id },
        data: { name, status: "Active" },
      });
    }
    return existing;
  }
  return prisma.contact.create({
    data: {
      name: name || `Customer ${phone.slice(-4)}`,
      phone,
      source: "Shiprocket",
      tags: ["Shiprocket", "Shipment"],
      status: "Active",
      organizationId: orgId,
    },
  });
}

async function stampAttrs(contactId: string, patch: Record<string, unknown>) {
  const { prisma } = await import("@/shared/lib/prisma");
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return;
  const existing = (contact.attributes as Record<string, unknown>) || {};
  return prisma.contact.update({
    where: { id: contactId },
    data: { attributes: { ...existing, ...patch } as Prisma.InputJsonObject },
  });
}

async function writeLog(orgId: string, message: string) {
  const { prisma } = await import("@/shared/lib/prisma");
  return prisma.systemLog.create({
    data: { type: "integration", message, organizationId: orgId },
  });
}

/** Cancel all active enrollments with a given trigger for a contact. */
async function cancelEnrollments(
  contactId: string,
  orgId: string,
  trigger: string
) {
  const { prisma } = await import("@/shared/lib/prisma");
  const active = await prisma.sequenceEnrollment.findMany({
    where: {
      contactId,
      organizationId: orgId,
      status: "active",
      sequence: { trigger },
    },
  });
  for (const enrollment of active) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "completed", nextRunAt: null },
    });
  }
}

// ─── Status handler ──────────────────────────────────────────────────────────

/**
 * Route a Shiprocket status webhook event to the appropriate WhatsApp
 * automation. Called from the inbound webhook route and safe to call from
 * tests / admin tooling.
 *
 * Never throws — errors are caught and logged so a webhook retry loop cannot
 * be triggered by bad contact data.
 */
export async function handleShiprocketStatusUpdate(
  orgId: string,
  payload: ShiprocketWebhookPayload
): Promise<void> {
  // ── Normalize ────────────────────────────────────────────────────────────
  const awb = (payload.awb || payload.awb_code || "unknown").trim();
  const rawPhone = (payload.customer_phone || "").trim();
  const status = (payload.current_status || "").toUpperCase().trim();
  const trackingUrl = (payload.tracking_url || "").trim();
  const courierName = (payload.courier_name || "").trim();
  const orderId = payload.order_id ? String(payload.order_id) : undefined;

  if (!rawPhone) {
    console.warn(
      `[Shiprocket] Skipping event (status: ${status}, AWB: ${awb}) — no customer_phone in payload.`
    );
    return;
  }

  const phone = formatPhoneNumber(rawPhone);

  // ── Upsert contact ───────────────────────────────────────────────────────
  const contact = await upsertShiprocketContact(
    orgId,
    phone,
    payload.customer_name
  ).catch((err) => {
    console.error("[Shiprocket] Contact upsert failed:", err);
    return null;
  });

  if (!contact) return;

  // Persist tracking metadata so sequence templates can read it via attrs.
  await stampAttrs(contact.id, {
    shiprocket_tracking_url: trackingUrl || undefined,
    last_awb: awb,
    last_courier: courierName || undefined,
    ...(trackingUrl ? { tracking_url: trackingUrl } : {}),
  }).catch((err) => console.error("[Shiprocket] stampAttrs failed:", err));

  // ── Route by status ──────────────────────────────────────────────────────
  try {
    switch (status) {
      // ---- Order dispatched → enroll in shipping notification sequence ----
      case "SHIPPED": {
        // Store a normalized tracking URL for the sequence template ({{2}}).
        if (trackingUrl) {
          await stampAttrs(contact.id, { last_tracking_url: trackingUrl });
        }
        await enrollOnTrigger(orgId, "order_shipped", contact.id);
        await writeLog(
          orgId,
          `Shiprocket: Order shipped for ${contact.name} (AWB: ${awb}${courierName ? `, ${courierName}` : ""}). WhatsApp notification sequence queued.`
        );
        break;
      }

      // ---- Out for delivery → enroll OFD sequence (template) ----------------
      case "OUT FOR DELIVERY": {
        // Prefer the proper OFD template sequence — it respects the 24h session
        // boundary and uses an approved Meta template when the session is cold.
        await enrollOnTrigger(orgId, "order_out_for_delivery", contact.id);
        await writeLog(
          orgId,
          `Shiprocket: OFD event for ${contact.name} (AWB: ${awb}). OFD alert sequence queued.`
        );
        break;
      }

      // ---- Delivered → post-delivery review sequence ----------------------
      case "DELIVERED": {
        await stampAttrs(contact.id, {
          last_delivered_at: new Date().toISOString(),
        });
        // Cancel any still-running shipping notification enrollments.
        await cancelEnrollments(contact.id, orgId, "order_shipped");
        await enrollOnTrigger(orgId, "order_delivered", contact.id);
        await writeLog(
          orgId,
          `Shiprocket: Order delivered for ${contact.name} (AWB: ${awb}). Post-delivery review sequence queued.`
        );
        break;
      }

      // ---- NDR → hand off to the dedicated NDR service -------------------
      case "NDR": {
        const attempt =
          typeof payload.attempt === "number"
            ? payload.attempt
            : typeof payload.attempt === "string"
            ? parseInt(payload.attempt, 10) || 1
            : 1;
        await handleNdrWebhook(orgId, {
          awb,
          orderId,
          courier: courierName || undefined,
          attempt,
          reason: "Delivery attempt failed",
          customerPhone: phone,
          customerName: payload.customer_name,
        });
        // writeSystemLog is already done inside handleNdrWebhook.
        break;
      }

      // ---- RTO initiated → alert customer --------------------------------
      case "RTO INITIATED": {
        const rtoMessage =
          "⚠️ Your order is being returned to us. We'll reach out to understand what went wrong.";
        await sendWhatsAppMessage({ to: phone, text: rtoMessage }, orgId).catch(
          (err) =>
            console.error("[Shiprocket] RTO WhatsApp send failed:", err)
        );
        await enrollOnTrigger(orgId, "order_rto", contact.id);

        // Feed the shared RTO fraud network — a confirmed RTO is the strongest
        // signal of all. Best-effort; never breaks webhook processing.
        try {
          const { recordNetworkSignal } = await import("@/features/cod/services/networkSignalService");
          await recordNetworkSignal(phone, "rto", orgId);
        } catch { /* non-fatal */ }

        await writeLog(
          orgId,
          `Shiprocket: RTO initiated for ${contact.name} (AWB: ${awb}). Customer notified on WhatsApp.`
        );
        break;
      }

      // ---- RTO complete → log only (order back at warehouse) -------------
      case "RTO DELIVERED": {
        await writeLog(
          orgId,
          `Shiprocket: Order returned to warehouse for ${contact.name} (AWB: ${awb}).`
        );
        break;
      }

      // ---- Pre-dispatch statuses → log only ------------------------------
      case "PICKUP SCHEDULED":
      case "PICKUP GENERATED":
      case "RETURN": {
        await writeLog(
          orgId,
          `Shiprocket: Status "${status}" received for ${contact.name} (AWB: ${awb}).`
        );
        break;
      }

      // ---- Unknown status → log for observability ------------------------
      default: {
        await writeLog(
          orgId,
          `Shiprocket: Unrecognized status "${status}" for ${contact.name} (AWB: ${awb}).`
        );
      }
    }
  } catch (err) {
    console.error(
      `[Shiprocket] Unhandled error processing status "${status}" for AWB ${awb}:`,
      err
    );
    // Do not rethrow — caller (webhook route) must still return 200 to
    // prevent Shiprocket from retrying with the same payload indefinitely.
  }
}

// ─── Connector object ────────────────────────────────────────────────────────

export const shiprocketConnector: Connector = {
  id: "shiprocket",
  name: "Shiprocket",
  description:
    "Auto-notify customers on ship, OFD, delivery, NDR, and RTO via WhatsApp. Powered by Shiprocket multi-courier aggregation (Delhivery, BlueDart, Xpressbees, and more).",

  async connect(ctx: ConnectorContext) {
    if (!ctx.apiKey) {
      return { ok: false, error: "Shiprocket email and password are required." };
    }
    try {
      const creds = JSON.parse(ctx.apiKey) as { email?: string; password?: string };
      if (!creds.email || !creds.password) {
        return { ok: false, error: "Shiprocket email and password are required." };
      }
      await authenticateShiprocket(creds.email, creds.password);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Shiprocket authentication failed.",
      };
    }
  },
};
