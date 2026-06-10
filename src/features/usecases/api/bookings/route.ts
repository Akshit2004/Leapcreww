import { route, ok, requireOrg } from "@/shared/lib/api";
import { listBookings } from "@/features/usecases/services/useCaseService";

export const GET = route(async (req) => {
  const orgId = new URL(req.url).searchParams.get("orgId") || "";
  await requireOrg(orgId);
  return ok({ bookings: await listBookings(orgId) });
});
