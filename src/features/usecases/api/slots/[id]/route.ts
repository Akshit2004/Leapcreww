import { route, ok, requireOrg } from "@/shared/lib/api";
import { deleteSlot } from "@/features/usecases/services/useCaseService";

export const DELETE = route(async (req, { params }) => {
  const id = params?.id as string;
  const orgId = new URL(req.url).searchParams.get("orgId") || "";
  await requireOrg(orgId, "ADMIN");
  return ok(await deleteSlot(id, orgId));
});
