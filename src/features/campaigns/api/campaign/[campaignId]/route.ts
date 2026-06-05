import { route, ok, requireSession, ApiError } from "@/shared/lib/api";
import { deleteCampaignFor } from "../../../services/broadcastService";

export const DELETE = route(async (_req, { params }) => {
  const session = await requireSession();
  const campaignId = params?.campaignId as string;
  const email = session.user.email;
  if (!email) throw new ApiError("No email on session", 400);

  try {
    await deleteCampaignFor(campaignId, email);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    if (msg === "Campaign not found") throw new ApiError(msg, 404);
    if (msg === "Forbidden") throw new ApiError(msg, 403);
    throw err;
  }
  return ok({ status: "ok" });
});
