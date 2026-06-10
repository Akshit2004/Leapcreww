import { route, ok, requireOrg, body } from "@/shared/lib/api";
import { updateBookingStatus } from "@/features/usecases/services/useCaseService";
import type { UpdateBookingInput } from "@/features/usecases/types";

export const PATCH = route(async (req, { params }) => {
  const id = params?.id as string;
  const input = await body<UpdateBookingInput>(req);
  await requireOrg(input.organizationId, "ADMIN");
  return ok({ bookings: await updateBookingStatus(id, input) });
});
