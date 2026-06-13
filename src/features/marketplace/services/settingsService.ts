import { ApiError } from "@/shared/lib/api";
import * as settingsRepo from "../repositories/settingsRepo";

/** Toggle the marketplace automation bot, gating on a connected Razorpay integration. */
export async function setMarketplaceBotEnabled(organizationId: string, enabled: boolean) {
  if (enabled) {
    const razorpayIntegration = await settingsRepo.findRazorpayIntegration(organizationId);
    if (!razorpayIntegration || razorpayIntegration.status !== "connected") {
      throw new ApiError(
        "Please link your Razorpay account in the Integrations tab before enabling the Marketplace Bot.",
        400
      );
    }
  }

  return settingsRepo.setMarketplaceBotEnabled(organizationId, enabled);
}
