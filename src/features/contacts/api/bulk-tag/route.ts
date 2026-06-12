import { route, ok, requireOrg, body } from "@/shared/lib/api";
import { bulkTagContacts } from "../../services/winBackService";

export const POST = route(async (req, { params }) => {
  const orgId = params?.orgId as string;
  await requireOrg(orgId, "ADMIN");
  const { tag, contactIds, dormantDays } = await body<{
    tag: string;
    contactIds?: string[];
    dormantDays?: number;
  }>(req);

  if (!tag || typeof tag !== "string" || !tag.trim()) {
    throw new Error("tag is required");
  }
  if (!contactIds?.length && (dormantDays === undefined || dormantDays <= 0)) {
    throw new Error("Provide either contactIds or dormantDays > 0");
  }

  const result = await bulkTagContacts(orgId, {
    tag: tag.trim(),
    contactIds,
    dormantDays,
  });

  return ok(result);
});
