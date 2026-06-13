import { route, requireOrg, ok, body, requireFields } from "@/shared/lib/api";
import { launchCampaign } from "@/features/campaigns/services/broadcastService";
import { assertFlowPublished } from "@/features/flows/services/flowService";

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

  await assertFlowPublished(flowId, orgId);

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
