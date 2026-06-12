import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { handleAutoResponder } from "@/shared/lib/autoresponder";

function isWithinWorkingHours(wh: import("@/features/inbox/api/working-hours/route").WorkingHoursConfig): boolean {
  const now = new Date();
  // Use Intl to get hours/minutes in the configured timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: wh.timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const dayName = parts.find(p => p.type === "weekday")?.value?.toLowerCase() as keyof typeof wh.schedule;
  const hour = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10);
  const daySchedule = wh.schedule[dayName];
  if (!daySchedule?.open) return false;
  const [fromH, fromM] = daySchedule.from.split(":").map(Number);
  const [toH, toM] = daySchedule.to.split(":").map(Number);
  const currentMins = hour * 60 + minute;
  return currentMins >= fromH * 60 + fromM && currentMins < toH * 60 + toM;
}

export async function POST(req: NextRequest) {
  // Only usable in development — prevents accidental sandbox calls in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Sandbox simulation endpoint is disabled in production." },
      { status: 403 }
    );
  }

  try {
    const { from, text } = await req.json();
    if (!from || !text) {
      return NextResponse.json({ error: "Missing from or text" }, { status: 400 });
    }

    const orgs = await prisma.organization.findMany({ take: 1 });
    if (orgs.length === 0) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const org = orgs[0];
    const normalizedPhone = `+${from.replace(/[^0-9]/g, "")}`;

    let contact = await prisma.contact.findFirst({
      where: {
        phone: normalizedPhone,
        organizationId: org.id,
      },
    });

    // Backward compatibility: try suffix match
    if (!contact) {
      contact = await prisma.contact.findFirst({
        where: {
          organizationId: org.id,
          phone: { contains: from.slice(-10) },
        },
      });
    }

    let activeOrgId = org.id;
    if (contact) {
      activeOrgId = contact.organizationId;
    }

    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    if (!contact) {
      const profileName = `Customer ${from.slice(-4)}`;
      contact = await prisma.contact.create({
        data: {
          name: profileName,
          phone: normalizedPhone,
          source: "WhatsApp Inbound",
          tags: ["WhatsApp", "Inbound"],
          status: "Active",
          lastMessage: text,
          lastMessageTime: timeStr,
          unreadCount: 1,
          assignedAgent: "Bot",
          organizationId: activeOrgId,
        },
      });
    } else {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          lastMessage: text,
          lastMessageTime: timeStr,
          unreadCount: { increment: 1 },
        },
      });
    }

    await prisma.message.create({
      data: {
        sender: "user",
        text,
        contactId: contact.id,
        organizationId: activeOrgId,
      },
    });

    await prisma.systemLog.create({
      data: {
        type: "chat",
        message: `Received WhatsApp message from ${contact.name}: "${text.slice(0, 60)}"`,
        organizationId: activeOrgId,
      },
    });

    // Working hours auto-away
    const orgWithHours = await prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: { workingHours: true, whatsappPhoneNumberId: true, whatsappConnected: true },
    });
    if (orgWithHours?.workingHours) {
      const wh = orgWithHours.workingHours as unknown as import("@/features/inbox/api/working-hours/route").WorkingHoursConfig;
      if (wh.enabled && !isWithinWorkingHours(wh)) {
        // Send away message via WhatsApp API if connected
        if (orgWithHours.whatsappConnected && orgWithHours.whatsappPhoneNumberId) {
          const { sendWhatsAppMessage } = await import("@/shared/lib/whatsapp");
          await sendWhatsAppMessage({ to: normalizedPhone, text: wh.awayMessage }, activeOrgId).catch(() => {});
        }
        // Log it and skip autoresponder
        return NextResponse.json({ status: "ok", contactId: contact.id, outsideHours: true }, { status: 200 });
      }
    }

    if (contact.assignedAgent === "Bot") {
      await handleAutoResponder(contact.id, activeOrgId);
    }

    return NextResponse.json({ status: "ok", contactId: contact.id }, { status: 200 });
  } catch (err: unknown) {
    console.error("WhatsApp process error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}