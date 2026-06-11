import { route, ok } from "@/shared/lib/api";
import { getPublicConfig } from "../../../services/widgetService";

/**
 * Public CORS headers — these endpoints are fetched by widget.js running on
 * customer websites, so any origin must be able to read them.
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "public, max-age=60",
} as const;

/** GET /api/widget/[publicKey]/config — public config for the embed script. */
export const GET = route(async (_req, { params }) => {
  const publicKey = params?.publicKey as string;
  return ok(await getPublicConfig(publicKey), { headers: CORS_HEADERS });
});

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
