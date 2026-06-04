import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { orgId } = await params;
    interface CustomSessionUser { id: string }
    const userId = (session.user as unknown as CustomSessionUser).id;

    // 1. Verify User has active tenancy/membership in requested organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access forbidden. You do not belong to this workspace." },
        { status: 403 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        whatsappConnected: true,
        whatsappBusinessAccountId: true,
        whatsappPhoneNumberId: true,
        metaBusinessId: true,
        walletBalance: true,
        onboardingDismissed: true,
        marketplaceBotEnabled: true,
        chatbotBuilderEnabled: true,
        brandProfile: true,
      }
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    // 2. Fetch org members (users with membership in this org)
    const memberships = await prisma.membership.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const members = (memberships as { user: { id: string; name: string | null; email: string }; role: string }[]).map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.email.split("@")[0],
      email: m.user.email,
      role: m.role,
    }));

    // 3. Fetch scoped relational assets from local PostgreSQL
    const contacts = await prisma.contact.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
    });

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    const templates = await prisma.template.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, body: true, category: true,
        buttons: true, mediaType: true, mediaUrl: true, metaStatus: true, metaId: true, isShared: true,
        organizationId: true, createdAt: true,
      },
    });

    const sharedTemplates = await prisma.template.findMany({
      where: { isShared: true, organizationId: { not: orgId } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, body: true, category: true,
        buttons: true, mediaType: true, mediaUrl: true, metaStatus: true, metaId: true, isShared: true,
        organizationId: true, createdAt: true,
      },
    });

    const allTemplates = [...templates, ...sharedTemplates];

    const chatbotNodes = await prisma.chatbotNode.findMany({
      where: { organizationId: orgId },
      orderBy: { id: "asc" },
    });

    const integrations = await prisma.integration.findMany({
      where: { organizationId: orgId },
      orderBy: { id: "asc" },
    });

    const systemLogs = await prisma.systemLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const messages = await prisma.message.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
    });

    // 3. Assemble relational Message rows into dynamic ChatHistory map structure
    const chatHistory: Record<string, unknown[]> = {};
    
    contacts.forEach((c) => {
      chatHistory[c.id] = [];
    });

    messages.forEach((m) => {
      if (!chatHistory[m.contactId]) {
        chatHistory[m.contactId] = [];
      }
      chatHistory[m.contactId].push({
        id: m.id,
        sender: m.sender as "user" | "agent" | "system",
        text: m.text,
        timestamp: m.timestamp,
        status: m.status as "sent" | "delivered" | "read" | undefined,
        buttons: m.buttons as string[],
      });
    });

    const orders = await prisma.order.findMany({
      where: { organizationId: orgId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    // 4. Return unified JSON payloads
    return NextResponse.json({
      organization,
      contacts,
      campaigns,
      templates: allTemplates,
      chatbotNodes,
      integrations,
      systemLogs,
      chatHistory,
      members,
      orders,
    });
  } catch (err: unknown) {
    console.error("❌ Scoped Data Fetch API failed:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during database hydration." },
      { status: 500 }
    );
  }
}
