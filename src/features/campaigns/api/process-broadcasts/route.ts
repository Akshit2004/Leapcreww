import { route, ok, fail } from "@/shared/lib/api";
import { processScheduledCampaigns } from "../../services/broadcastService";

/** Shared cron-secret guard (Bearer header or ?secret=). Returns an error response or null. */
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
  const report = await processScheduledCampaigns();
  return ok({ ok: true, processedCount: report.length, report });
}

export const GET = route(handle);
export const POST = route(handle);
