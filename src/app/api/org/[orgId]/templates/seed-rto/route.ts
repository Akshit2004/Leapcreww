/**
 * POST /api/org/[orgId]/templates/seed-rto
 *
 * Creates any missing RTO/COD template rows (status: "draft") so the
 * merchant can find them in the Template Builder and submit them to Meta.
 * Idempotent — never overwrites an existing template.
 *
 * Returns { created: string[], existing: string[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";

const SEED_TEMPLATES = [
  {
    name: "cod_risk_verify",
    category: "Utility",
    body: "Hi {{1}}, we noticed your COD order #{{2}} worth ₹{{3}} may need verification. Please reply YES to confirm or NO to cancel.",
    buttons: [],
  },
  {
    name: "cod_confirmation",
    category: "Utility",
    body: "Hi {{1}}, your COD order #{{2}} worth ₹{{3}} has been confirmed! We'll notify you once it's shipped. 🚚",
    buttons: [],
  },
  {
    name: "ndr_alert",
    category: "Utility",
    body: "Hi {{1}}, our courier attempted delivery for order #{{2}} but couldn't reach you. Reply 1-Confirm, 2-Reschedule, 3-Update Address, 4-Cancel.",
    buttons: [],
  },
  {
    name: "ndr_alert_attempt2",
    category: "Utility",
    body: "Hi {{1}}, this is our second delivery attempt for order #{{2}}. Please reply CONFIRM to reschedule or the order will be returned.",
    buttons: [],
  },
  {
    name: "ofd_alert",
    category: "Utility",
    body: "📦 Your order #{{1}} is out for delivery today! Please keep ₹{{2}} ready for the delivery agent. Reply CONFIRM to let us know you're available.",
    buttons: [],
  },
  {
    name: "rto_initiated",
    category: "Utility",
    body: "Hi {{1}}, your order #{{2}} is being returned to us. We're sorry about the inconvenience — reply to let us know if you'd like to reorder.",
    buttons: [],
  },
] as const;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;

    const existing = await prisma.template.findMany({
      where: { organizationId: orgId, name: { in: SEED_TEMPLATES.map((t) => t.name) } },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((t) => t.name));

    const toCreate = SEED_TEMPLATES.filter((t) => !existingNames.has(t.name));

    if (toCreate.length > 0) {
      await prisma.template.createMany({
        data: toCreate.map((t) => ({
          name: t.name,
          body: t.body,
          category: t.category,
          buttons: [...t.buttons],
          mediaType: "none",
          metaStatus: "pending",
          organizationId: orgId,
        })),
      });
    }

    return NextResponse.json({
      created: toCreate.map((t) => t.name),
      existing: [...existingNames],
    });
  } catch (err) {
    console.error("[seed-rto templates]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
