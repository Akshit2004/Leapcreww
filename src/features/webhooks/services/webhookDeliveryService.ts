/**
 * webhookDeliveryService.ts — Outbound webhooks (T-08).
 *
 * emitEvent() is called from business code (inbound message processing, order
 * creation, status updates). It creates a WebhookDelivery row per matching
 * subscription and tries each immediately; failures are retried by the
 * process-webhooks cron with exponential backoff. Every delivery is signed
 * with the subscription's secret (`x-leapcreww-signature: sha256=<hmac>`)
 * so subscribers can verify authenticity — same scheme we require of Meta.
 */
import * as crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/shared/lib/api";
import { sign } from "../lib/signing";
import * as repo from "../repositories/webhookSubscriptionRepo";
import {
  isWebhookEvent,
  type CreateSubscriptionInput,
  type TestDeliveryResult,
  type WebhookEnvelope,
  type WebhookEvent,
} from "../types";

const MAX_ATTEMPTS = 5;
const TIMEOUT_MS = 5_000;

/** Backoff: 1m, 4m, 16m, ~1h between retries. */
const backoffMinutes = (attempts: number) => Math.min(4 ** (attempts - 1), 64);

// ─── Subscriptions ───────────────────────────────────────────────────────────

export function listSubscriptions(organizationId: string) {
  return repo.listSubscriptions(organizationId);
}

export async function createSubscription(input: CreateSubscriptionInput) {
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    throw new ApiError("A valid endpoint URL is required", 400);
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new ApiError("Webhook endpoints must use HTTPS", 400);
  }
  const events = input.events.filter((e) => isWebhookEvent(e));
  if (!events.length) throw new ApiError("Subscribe to at least one event", 400);

  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
  return repo.createSubscription({
    url: input.url,
    events,
    secret,
    organizationId: input.organizationId,
  });
}

export async function deleteSubscription(organizationId: string, id: string) {
  const result = await repo.deleteSubscription(organizationId, id);
  if (result.count === 0) throw new ApiError("Subscription not found", 404);
}

// ─── Delivery ────────────────────────────────────────────────────────────────

async function post(url: string, secret: string, envelope: WebhookEnvelope): Promise<TestDeliveryResult> {
  const body = JSON.stringify(envelope);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-leapcreww-event": envelope.event,
        "x-leapcreww-signature": sign(secret, body),
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return {
      ok: res.ok,
      status: res.status,
      durationMs: Date.now() - started,
      error: res.ok ? undefined : `Endpoint responded ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : "Request failed",
    };
  }
}

/**
 * Fan an event out to every matching subscription. Never throws — outbound
 * webhooks must not break the business operation that emitted them.
 */
export async function emitEvent(
  organizationId: string,
  event: WebhookEvent,
  data: Prisma.JsonObject
): Promise<void> {
  try {
    // Write to append-only Event table first (source of truth for polling API)
    await repo.createEvent({ type: event, payload: data, organizationId });

    const subscriptions = await repo.findEnabledByEvent(organizationId, event);
    for (const sub of subscriptions) {
      const delivery = await repo.createDelivery({
        subscriptionId: sub.id,
        event,
        payload: data,
        organizationId,
      });
      const result = await post(sub.url, sub.secret, {
        id: delivery.id,
        event,
        createdAt: delivery.createdAt.toISOString(),
        data,
      });
      await repo.updateDelivery(delivery.id, result.ok
        ? { status: "delivered", attempts: 1, deliveredAt: new Date() }
        : {
            attempts: 1,
            lastError: result.error,
            nextAttemptAt: new Date(Date.now() + backoffMinutes(1) * 60_000),
          });
    }
  } catch (err) {
    console.error(`[Webhooks] emit ${event} failed:`, err);
  }
}

/** Cron worker: retry pending deliveries whose backoff window has elapsed. */
export async function processDueDeliveries() {
  const due = await repo.findDueDeliveries(new Date());
  let delivered = 0;
  let exhausted = 0;

  for (const delivery of due) {
    if (!delivery.subscription.enabled) {
      await repo.updateDelivery(delivery.id, { status: "failed", lastError: "Subscription disabled" });
      continue;
    }
    const result = await post(delivery.subscription.url, delivery.subscription.secret, {
      id: delivery.id,
      event: delivery.event as WebhookEvent,
      createdAt: delivery.createdAt.toISOString(),
      data: delivery.payload as Record<string, unknown>,
    });
    const attempts = delivery.attempts + 1;
    if (result.ok) {
      await repo.updateDelivery(delivery.id, { status: "delivered", attempts, deliveredAt: new Date() });
      delivered++;
    } else if (attempts >= MAX_ATTEMPTS) {
      await repo.updateDelivery(delivery.id, { status: "failed", attempts, lastError: result.error });
      exhausted++;
    } else {
      await repo.updateDelivery(delivery.id, {
        attempts,
        lastError: result.error,
        nextAttemptAt: new Date(Date.now() + backoffMinutes(attempts) * 60_000),
      });
    }
  }

  return { scanned: due.length, delivered, exhausted };
}

/** "Send test event" button: deliver a sample payload now, return the result. */
export async function sendTestEvent(organizationId: string, subscriptionId: string): Promise<TestDeliveryResult> {
  const sub = await repo.findSubscription(organizationId, subscriptionId);
  if (!sub) throw new ApiError("Subscription not found", 404);
  return post(sub.url, sub.secret, {
    id: `test_${crypto.randomBytes(8).toString("hex")}`,
    event: "test",
    createdAt: new Date().toISOString(),
    data: {
      message: "Test delivery from LeapCreww. Verify the x-leapcreww-signature header with your signing secret.",
      subscribedEvents: sub.events,
    },
  });
}
