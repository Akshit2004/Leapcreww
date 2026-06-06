import { route, requireOrg, ok, ApiError } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";

export const GET = route(async (req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "AGENT");
  const flowId = params!.flowId;

  // Verify that the flow exists and belongs to the org
  const flow = await prisma.flow.findFirst({
    where: { id: flowId, organizationId: orgId }
  });
  if (!flow) {
    throw new ApiError("Flow not found", 404);
  }

  // Fetch responses with contact details
  const responses = await prisma.flowResponse.findMany({
    where: { flowId, organizationId: orgId },
    include: {
      contact: {
        select: {
          name: true,
          phone: true,
          email: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return ok({ responses });
});
