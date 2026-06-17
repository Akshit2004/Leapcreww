/**
 * GET /api/org/[orgId]/finder-links?product=<name>
 *
 * Returns click-to-WhatsApp deep links the merchant drops onto their storefront
 * (a "Find my shade" / "Find my size" button on the product page). When a
 * shopper taps the link and sends, the inbound webhook captures their phone
 * number and the relevant finder flow begins — turning anonymous browsers into
 * known, opted-in conversations.
 *
 * Returns { number, shade, size } or 409 if no WhatsApp number is connected.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { buildFinderDeepLink } from "@/features/size-shade-finder/services/sizeShadeService";
import { getOrgDialableNumber } from "@/features/size-shade-finder/repositories/sizeShadeRepo";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;
    const product = req.nextUrl.searchParams.get("product");

    const number = await getOrgDialableNumber(orgId);
    if (!number) {
      return NextResponse.json(
        { error: "No WhatsApp number connected for this organization." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      number,
      shade: buildFinderDeepLink(number, "shade", product),
      size: buildFinderDeepLink(number, "size", product),
    });
  } catch (err) {
    console.error("[finder-links]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
