import { NextRequest } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { requireOrg, ok, route, body, ApiError } from "@/shared/lib/api";

export const PUT = route(async (req, { params }) => {
  const { orgId, flowId } = params!;
  await requireOrg(orgId, "AGENT");

  const data = await body<any>(req);

  const flow = await prisma.flow.updateMany({
    where: { id: flowId, organizationId: orgId },
    data: {
      flowJson: data.flowJson,
      name: data.name,
      category: data.category,
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
