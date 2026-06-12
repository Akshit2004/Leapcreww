import { route, ok } from "@/shared/lib/api";
import { recordClick } from "../../../services/widgetService";
import { CORS_HEADERS } from "../config/route";

/** POST /api/widget/[publicKey]/click — bodyless click beacon from widget.js. */
export const POST = route(async (_req, { params }) => {
  const publicKey = params?.publicKey as string;
  await recordClick(publicKey);
  return ok({ ok: true }, { headers: CORS_HEADERS });
});

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
