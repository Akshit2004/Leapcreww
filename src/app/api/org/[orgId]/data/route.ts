import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "../../../../../lib/prisma";

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
    const userId = (session.user as any).id;

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

    // Sync templates with Meta before querying them
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

    if (wabaId && accessToken) {
      try {
        const metaRes = await fetch(
          `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?limit=250`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          const metaTemplates = metaData.data || [];
          const activeMetaIds = metaTemplates.map((t: any) => t.id).filter(Boolean);

          // 1. Purge all local templates for this org that are NOT in Meta's returned active list or don't have a metaId
          await prisma.template.deleteMany({
            where: {
              organizationId: orgId,
              OR: [
                { metaId: { notIn: activeMetaIds } },
                { metaId: null }
              ]
            }
          });

          // 2. Upsert each real template returned by Meta
          for (const t of metaTemplates) {
            const bodyComp = t.components?.find((c: any) => c.type === "BODY");
            const bodyText = bodyComp?.text || "";

            const buttonsComp = t.components?.find((c: any) => c.type === "BUTTONS");
            const buttonsList = buttonsComp?.buttons?.map((b: any) => b.text).filter(Boolean) || [];

            const headerComp = t.components?.find((c: any) => c.type === "HEADER");
            let mediaType = "none";
            if (headerComp?.format === "IMAGE") mediaType = "image";
            else if (headerComp?.format === "VIDEO") mediaType = "video";
            else if (headerComp?.format === "DOCUMENT") mediaType = "file";

            const categoryFormatted = 
              t.category === "UTILITY" ? "Utility" :
              t.category === "MARKETING" ? "Marketing" :
              t.category === "AUTHENTICATION" ? "Authentication" :
              t.category.charAt(0) + t.category.slice(1).toLowerCase();

            const statusFormatted = 
              t.status === "APPROVED" ? "approved" :
              t.status === "REJECTED" ? "rejected" : "pending";

            // Find if there is an existing record (by name or metaId)
            const existingTemplates = await prisma.template.findMany({
              where: {
                organizationId: orgId,
                OR: [
                  { name: t.name },
                  { metaId: t.id }
                ]
              }
            });

            if (existingTemplates.length > 0) {
              // Update the first one and delete any duplicates to keep DB clean
              const primary = existingTemplates[0];
              await prisma.template.update({
                where: { id: primary.id },
                data: {
                  name: t.name,
                  body: bodyText,
                  category: categoryFormatted,
                  buttons: buttonsList,
                  mediaType: mediaType,
                  metaStatus: statusFormatted,
                  metaId: t.id,
                }
              });

              if (existingTemplates.length > 1) {
                const duplicateIds = existingTemplates.slice(1).map(x => x.id);
                await prisma.template.deleteMany({
                  where: { id: { in: duplicateIds } }
                });
              }
            } else {
              // Create new record
              await prisma.template.create({
                data: {
                  organizationId: orgId,
                  name: t.name,
                  body: bodyText,
                  category: categoryFormatted,
                  buttons: buttonsList,
                  mediaType: mediaType,
                  metaStatus: statusFormatted,
                  metaId: t.id,
                }
              });
            }
          }
        }
      } catch (syncErr) {
        console.error("⚠️ Failed to sync templates from Meta:", syncErr);
      }
    }

    const templates = await prisma.template.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, body: true, category: true,
        buttons: true, mediaType: true, metaStatus: true, metaId: true,
        organizationId: true, createdAt: true,
      },
    });

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
    const chatHistory: Record<string, any[]> = {};
    
    // Initialize contact buckets
    contacts.forEach((c: any) => {
      chatHistory[c.id] = [];
    });

    messages.forEach((m: any) => {
      if (!chatHistory[m.contactId]) {
        chatHistory[m.contactId] = [];
      }
      chatHistory[m.contactId].push({
        id: m.id,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp,
        status: m.status,
        buttons: m.buttons,
      });
    });

    // 4. Return unified JSON payloads
    return NextResponse.json({
      contacts,
      campaigns,
      templates,
      chatbotNodes,
      integrations,
      systemLogs,
      chatHistory,
      members,
    });
  } catch (err: any) {
    console.error("❌ Scoped Data Fetch API failed:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during database hydration." },
      { status: 500 }
    );
  }
}
