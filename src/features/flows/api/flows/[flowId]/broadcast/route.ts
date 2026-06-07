import { route, requireOrg, ok, body, requireFields, ApiError } from "@/shared/lib/api";
import { launchCampaign } from "@/features/campaigns/services/broadcastService";
import { prisma } from "@/shared/lib/prisma";

export const POST = route(async (req, { params }) => {
  const orgId = params!.orgId;
  await requireOrg(orgId, "AGENT");
  const flowId = params!.flowId;

  const input = await body<{
    name: string;
    targetTag: string;
    title: string;
    ctaText: string;
    footer?: string;
    delay?: number;
  }>(req);

  requireFields(input, ["name", "targetTag", "title", "ctaText"]);

  const flow = await prisma.flow.findFirst({
    where: { id: flowId, organizationId: orgId }
  });

  if (!flow) {
    throw new ApiError("Flow not found", 404);
  }

  if (flow.status !== "published") {
    throw new ApiError("Flow has unpublished changes. Publish it to Meta before broadcasting.", 400);
  }

  // Store Flow configuration in variables JSON field
  const campaign = await launchCampaign({
    name: input.name,
    targetTag: input.targetTag,
    flowId: flowId,
    organizationId: orgId,
    variables: {
      title: input.title,
      ctaText: input.ctaText,
      footer: input.footer || "",
    } as any,
    delay: input.delay || 1,
  });

  return ok({ success: true, campaign });
});
