import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId } = await params;

    if (!templateId) {
      return NextResponse.json({ error: "Missing templateId" }, { status: 400 });
    }

    // 1. Fetch template from database
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // 2. Perform Meta Graph API Deletion if it is a real template
    const isMock = template.metaId?.startsWith("mock-meta-") || !template.metaId;
    
    if (!isMock) {
      const org = await prisma.organization.findUnique({
        where: { id: template.organizationId },
        select: { whatsappBusinessAccountId: true },
      });

      const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
      const wabaId = org?.whatsappBusinessAccountId;

      if (systemToken && wabaId) {
        const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/message_templates?name=${template.name}`;
        
        try {
          console.log(`[Meta API] Deleting template '${template.name}' from WABA ${wabaId}...`);
          const metaRes = await fetch(url, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${systemToken}`
            }
          });

          const metaData = await metaRes.json();
          if (metaRes.ok) {
            console.log(`[Meta API] Deleted template '${template.name}' from WABA ${wabaId}`);
          } else {
            console.warn(`[Meta API] Deletion warning:`, metaData.error?.message);
          }
        } catch (apiErr) {
          console.error(`[Meta API Exception] Failed to reach Graph API:`, apiErr);
        }
      }
    }

    // 3. Delete from local PostgreSQL database
    await prisma.template.delete({
      where: { id: templateId }
    });

    // 4. Create system log trace
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "crm",
        message: `Permanently deleted template: "${template.name}" from WappFlow${!isMock ? " and Meta Business Manager" : ""}.`,
        organizationId: template.organizationId
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete template endpoint error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || "Internal server error" }, { status: 500 });
  }
}
