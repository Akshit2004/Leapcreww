import { NextRequest, NextResponse } from "next/server";
import { processDueEnrollments, sweepAbandonedCarts } from "@/features/sequences/services/sequenceService";

function guardCron(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfigured: CRON_SECRET not set" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  const secretParam = new URL(req.url).searchParams.get("secret");
  if (authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function handler(req: NextRequest) {
  const denied = guardCron(req);
  if (denied) return denied;

  const abandonedCartSweep = await sweepAbandonedCarts(60);
  const processed = await processDueEnrollments();
  return NextResponse.json({ ok: true, ...processed, abandonedCartSweep });
}

export const GET = handler;
export const POST = handler;
