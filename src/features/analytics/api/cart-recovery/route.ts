import { route, ok, requireOrg } from "@/shared/lib/api";
import { getCartRecoveryAnalytics } from "@/features/analytics/services/cartRecoveryAnalyticsService";

export const GET = route(async (_req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId);
  return ok(await getCartRecoveryAnalytics(orgId));
});
