import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleAutoResponder } from "@/lib/autoresponder";

export async function POST(req: NextRequest) {
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
          email: `${from}@whatsapp.customer`,
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
        timestamp: timeStr,
        contactId: contact.id,
        organizationId: activeOrgId,
      },
    });

    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "chat",
        message: `Received WhatsApp message from ${contact.name}: "${text.slice(0, 60)}"`,
        organizationId: activeOrgId,
      },
    });

    if (contact.assignedAgent === "Bot") {
      await handleAutoResponder(contact.id, activeOrgId);
    }

    return NextResponse.json({ status: "ok", contactId: contact.id }, { status: 200 });
  } catch (err: unknown) {
    console.error("WhatsApp process error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}