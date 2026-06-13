import { route, ok, requireOrg } from "@/shared/lib/api";
import { getNodeAnalyticsStats } from "../../services/chatbotAnalyticsService";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "AGENT");
  return ok({ stats: await getNodeAnalyticsStats(orgId) });
});
