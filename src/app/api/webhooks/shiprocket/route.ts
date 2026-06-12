/**
 * POST /api/webhooks/shiprocket?orgId=<id>
 *
 * Inbound status webhook from the Shiprocket dashboard.
 * The merchant configures this URL once under Shiprocket → Settings → Webhooks.
 *
 * Auth: org-scoped via `?orgId=` query param. Requires the org to have an
 * active "shiprocket" Integration row (status = "connected"). Shiprocket does
 * not sign webhooks by default; the orgId acts as a shared secret per tenant.
 *
 * All business logic lives in handleShiprocketStatusUpdate() — this handler
 * is intentionally thin: parse → guard → call service → respond.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { handleShiprocketStatusUpdate } from "@/features/integrations/connectors/shiprocket";
import type { ShiprocketWebhookPayload } from "@/features/integrations/connectors/shiprocket";

export async function POST(req: NextRequest) {
  const orgId = new URL(req.url).searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId query param is required." }, { status: 400 });
  }

  // Verify this org has an active Shiprocket integration.
  const integration = await prisma.integration.findUnique({
    where: { id_organizationId: { id: "shiprocket", organizationId: orgId } },
  });

  if (!integration || integration.status !== "connected") {
    return NextResponse.json(
      { error: "Shiprocket is not connected for this organisation." },
      { status: 401 }
    );
  }

  let payload: ShiprocketWebhookPayload;
  try {
    payload = (await req.json()) as ShiprocketWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Delegate all routing logic to the service layer.
  await handleShiprocketStatusUpdate(orgId, payload);

  return NextResponse.json({ success: true });
}
