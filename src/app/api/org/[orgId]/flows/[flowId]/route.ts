import { NextRequest } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { requireOrg, ok, route, body, ApiError } from "@/shared/lib/api";

export const PUT = route(async (req, { params }) => {
  const { orgId, flowId } = params!;
  await requireOrg(orgId, "AGENT");

  const data = await body<any>(req);

  // Editing the flow definition invalidates whatever was last published to
  // Meta — the live asset on Meta's side won't reflect these changes (e.g.
  // screen ids/names) until the flow is republished. Drop status back to
  // "draft" so the UI flags it and broadcasts/tests can't run against a
  // stale Meta asset (which fails with errors like #131009 "Specified
  // screen ... is not allowed as first screen of this flow").
  const existing = await prisma.flow.findFirst({ where: { id: flowId, organizationId: orgId } });
  if (!existing) {
    throw new ApiError("Flow not found", 404);
  }

  const flowJsonChanged = data.flowJson !== undefined &&
    JSON.stringify(data.flowJson) !== JSON.stringify(existing.flowJson);

  const flow = await prisma.flow.updateMany({
    where: { id: flowId, organizationId: orgId },
    data: {
      flowJson: data.flowJson,
      name: data.name,
      category: data.category,
      ...(flowJsonChanged && existing.status === "published" ? { status: "draft" } : {}),
    },
  });

  if (flow.count === 0) {
    throw new ApiError("Flow not found", 404);
  }

  return ok({ success: true });
});

export const DELETE = route(async (req, { params }) => {
  const { orgId, flowId } = params!;
  await requireOrg(orgId, "ADMIN");

  const flow = await prisma.flow.deleteMany({
    where: { id: flowId, organizationId: orgId },
  });

  if (flow.count === 0) {
    throw new ApiError("Flow not found", 404);
  }

  return ok({ success: true });
});
