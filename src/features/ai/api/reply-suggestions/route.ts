import { route, ok, requireOrg, ApiError } from "@/shared/lib/api";
import { generateReplySuggestions } from "@/features/ai/services/replySuggestionsService";

/** GET /api/ai/reply-suggestions?contactId=...&orgId=... — AI-drafted inbox reply suggestions. */
export const GET = route(async (req) => {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const orgId = searchParams.get("orgId");
  if (!contactId || !orgId) throw new ApiError("Missing required fields", 400);

  await requireOrg(orgId, "AGENT");

  const suggestions = await generateReplySuggestions(orgId, contactId);
  return ok({ suggestions });
});
