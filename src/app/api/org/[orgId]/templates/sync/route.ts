import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

export async function POST(
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

    // Verify membership
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
        whatsappConnected: true,
        whatsappBusinessAccountId: true,
      }
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    if (!systemToken || !organization.whatsappConnected || !organization.whatsappBusinessAccountId) {
      return NextResponse.json({ success: false, message: "WhatsApp not connected or system user token missing." });
    }

    // Call Meta API
    const metaRes = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${organization.whatsappBusinessAccountId}/message_templates?limit=250`,
      {
        headers: { Authorization: `Bearer ${systemToken}` },
      }
    );

    if (!metaRes.ok) {
      const errData = await metaRes.json();
      console.error(`⚠️ Failed to sync templates from Meta (Status ${metaRes.status})`, errData);
      return NextResponse.json({ error: "Failed to fetch message templates from Meta." }, { status: 400 });
    }

    const metaData = await metaRes.json();
    const metaTemplates = metaData.data || [];
    const allMetaTemplates = new Map();
    for (const t of metaTemplates) {
      if (t.id) allMetaTemplates.set(t.id, t);
    }

    const activeMetaIds = Array.from(allMetaTemplates.keys());

    // 1. Purge all local templates for this org that are NOT in Meta's returned active list
    await prisma.template.deleteMany({
      where: {
        organizationId: orgId,
        OR: [
          { metaId: { notIn: activeMetaIds.length > 0 ? activeMetaIds : ["dummy_to_prevent_error"] } },
          { metaId: null }
        ]
      }
    });

    interface MetaTemplateComponent {
      type: string;
      text?: string;
      format?: string;
      buttons?: Array<{ text: string }>;
    }

    interface MetaTemplateInput {
      id: string;
      name: string;
      category: string;
      status: string;
      components?: MetaTemplateComponent[];
    }

    // 2. Upsert each real template returned by Meta
    for (const t of Array.from(allMetaTemplates.values()) as unknown as MetaTemplateInput[]) {
      const bodyComp = t.components?.find((c) => c.type === "BODY");
      const bodyText = bodyComp?.text || "";

      const buttonsComp = t.components?.find((c) => c.type === "BUTTONS");
      const buttonsList = buttonsComp?.buttons?.map((b) => b.text).filter(Boolean) || [];

      const headerComp = t.components?.find((c) => c.type === "HEADER");
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
            isShared: primary.isShared,
          }
        });

        if (existingTemplates.length > 1) {
          const duplicateIds = existingTemplates.slice(1).map(x => x.id);
          await prisma.template.deleteMany({
            where: { id: { in: duplicateIds } }
          });
        }
      } else {
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

    return NextResponse.json({ success: true, count: allMetaTemplates.size });
  } catch (err: unknown) {
    console.error("❌ Template Sync API failed:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during template synchronization." },
      { status: 500 }
    );
  }
}
