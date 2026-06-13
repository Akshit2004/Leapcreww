import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VALID_BANDS = ["<500", "500-2000", "2000-10000", "10000+"];
const VALID_SOURCES = ["landing", "calculator", "vs_page"];

// Public pre-launch waitlist capture. No auth by design; abuse surface is
// limited to a unique-email upsert plus a honeypot field for naive bots.
export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Honeypot — hidden field real users never fill. Pretend success for bots.
  if (typeof payload.website === "string" && payload.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const brandName =
    typeof payload.brandName === "string" ? payload.brandName.trim().slice(0, 120) || null : null;
  const monthlyOrders =
    typeof payload.monthlyOrders === "string" && VALID_BANDS.includes(payload.monthlyOrders)
      ? payload.monthlyOrders
      : null;
  const source =
    typeof payload.source === "string" && VALID_SOURCES.includes(payload.source)
      ? payload.source
      : "landing";

  try {
    await prisma.waitlistEntry.upsert({
      where: { email },
      update: {
        ...(brandName ? { brandName } : {}),
        ...(monthlyOrders ? { monthlyOrders } : {}),
      },
      create: { email, brandName, monthlyOrders, source },
    });
  } catch (err) {
    console.error("Waitlist upsert failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
