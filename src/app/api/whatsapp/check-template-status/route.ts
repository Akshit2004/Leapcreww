import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json({ error: "Missing templateId" }, { status: 400 });
    }

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.metaId) {
      return NextResponse.json({ error: "Template not found or not sent to Meta" }, { status: 404 });
    }

    let dbStatus = template.metaStatus;
    let metaData = null;

    // Sandbox Mock Template Auto-Approval Simulator (for local testing)
    if (template.metaId.startsWith("mock-meta-")) {
      const ageMs = Date.now() - new Date(template.createdAt).getTime();
      if (ageMs > 12000) {
        dbStatus = "approved";
      } else {
        dbStatus = "pending";
      }
      metaData = { status: dbStatus.toUpperCase(), simulated: true };
    } else {
      // Real Meta API verification using System User Token
      const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;

      if (!systemToken) {
        return NextResponse.json({ error: "WhatsApp System User Token not configured" }, { status: 500 });
      }

      // Query template status from Meta using System User Token
      const metaRes = await fetch(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${template.metaId}?fields=status`,
        {
          headers: { Authorization: `Bearer ${systemToken}` },
        }
      );

      metaData = await metaRes.json();

      if (!metaRes.ok) {
        console.warn(`[Template Status] Meta API error for ${template.metaId}:`, metaData.error?.message);
        return NextResponse.json({ metaStatus: dbStatus, metaData: null, metaError: metaData.error?.message });
      }

      const metaStatus = metaData.status?.toLowerCase() || "pending";
      dbStatus = metaStatus === "approved" ? "approved" : metaStatus === "rejected" ? "rejected" : "pending";
    }

    // Update status in PostgreSQL if it changed
    if (dbStatus !== template.metaStatus) {
      await prisma.template.update({
        where: { id: templateId },
        data: { metaStatus: dbStatus },
      });

      const d = new Date();
      const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      await prisma.systemLog.create({
        data: {
          timestamp: timeStr,
          type: "crm",
          message: `Template approval status updated: "${template.name}" is now ${dbStatus.toUpperCase()}`,
          organizationId: template.organizationId
        }
      });
    }

    return NextResponse.json({ metaStatus: dbStatus, metaData });
  } catch (err: unknown) {
    console.error("Check template status error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
