/**
 * GET /api/v1/events — Polling endpoint backed by the append-only Event table.
 *
 * Designed as a Zapier trigger source: poll every 5–15 minutes, pass the
 * `nextAfter` value back as `after` on the next request. Requires scope
 * `contacts:read`.
 */
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, requireScope } from "../../../services/apiKeyService";
import { prisma } from "@/shared/lib/prisma";

const VALID_TYPES = ["message.received", "message.status", "order.placed", "contact.created"] as const;
type EventType = (typeof VALID_TYPES)[number];

export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticateApiKey(req);
    requireScope(ctx, "contacts:read");

    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type") as EventType | null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const afterParam = searchParams.get("after");
    const after = afterParam ? new Date(afterParam) : new Date(Date.now() - 60 * 60 * 1000);

    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const { organizationId } = ctx;

    const rows = await prisma.event.findMany({
      where: {
        organizationId,
        createdAt: { gt: after },
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    const events = rows.map((r) => ({
      id: r.id,
      type: r.type as EventType,
      data: r.payload,
      createdAt: r.createdAt,
    }));

    const nextAfter = events.length > 0 ? events[events.length - 1].createdAt.toISOString() : null;

    return NextResponse.json({ events, nextAfter });
  } catch (err: unknown) {
    if (err instanceof Error && "statusCode" in err) {
      const e = err as { message: string; statusCode: number };
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
