import { route, ok, requireOrg } from "@/shared/lib/api";
import { getRtoAnalytics } from "@/features/analytics/services/rtoAnalyticsService";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok(await getRtoAnalytics(orgId));
});
