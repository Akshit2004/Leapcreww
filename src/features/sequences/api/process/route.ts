import { route, ok, fail } from "@/shared/lib/api";
import { processDueEnrollments, sweepAbandonedCarts } from "../../services/sequenceService";

/** Cron-secret guard (mirrors campaigns/process-broadcasts). */
function guardCron(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return fail("Server misconfigured: CRON_SECRET not set", 500);
  const authHeader = req.headers.get("authorization");
  const secretParam = new URL(req.url).searchParams.get("secret");
  if (authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
    return fail("Unauthorized", 401);
  }
  return null;
}

async function handle(req: Request) {
  const denied = guardCron(req);
  if (denied) return denied;
  // Detect WhatsApp marketplace carts left unpaid past the 60-min threshold and
  // enroll them into recovery, then advance all due enrollments one step.
  const abandonedCartSweep = await sweepAbandonedCarts(60);
  const processed = await processDueEnrollments();
  return ok({ ok: true, ...processed, abandonedCartSweep });
}

export const GET = route(handle);
export const POST = route(handle);
