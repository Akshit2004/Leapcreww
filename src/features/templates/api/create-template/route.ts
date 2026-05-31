import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      name, 
      category, 
      body, 
      buttons = [], 
      mediaType = "none", 
      organizationId 
    } = await request.json();

    if (!name || !category || !body || !organizationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Standardize template name: Meta requires lowercase snake_case, alphanumeric only
    const formattedName = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");

    if (!formattedName) {
      return NextResponse.json({ error: "Invalid template name format" }, { status: 400 });
    }

    // Get org's WABA ID and use System User Token
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { whatsappBusinessAccountId: true, whatsappConnected: true },
    });

    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    const wabaId = org?.whatsappBusinessAccountId;

    let metaId: string | null = null;
    let metaStatus = "pending";

    if (systemToken && wabaId && org?.whatsappConnected) {
      try {
        // Parse variables from body text (Meta strictly requires example body_text values)
        const varRegex = /\{\{(\d+)\}\}/g;
        const matches = (Array.from(body.matchAll(varRegex)) as RegExpExecArray[]).map((m) => parseInt(m[1]));
        const uniqueVarCount = new Set(matches).size;

        interface LocalBodyComponent {
          type: string;
          text: string;
          example?: {
            body_text: string[][];
          };
        }
        const bodyComponent: LocalBodyComponent = {
          type: "BODY",
          text: body
        };

        if (uniqueVarCount > 0) {
          const sampleValues = Array.from({ length: uniqueVarCount }, (_, i) => `[Sample ${i + 1}]`);
          bodyComponent.example = {
            body_text: [sampleValues]
          };
        }

        const components: unknown[] = [];

        // 1. Add HEADER component first (if media is configured)
        if (mediaType && mediaType !== "none") {
          components.push({
            type: "HEADER",
            format: mediaType.toUpperCase()
          });
        }

        // 2. Add BODY component next
        components.push(bodyComponent);

        // 3. Add BUTTONS component last (if quick replies are configured)
        if (buttons && buttons.length > 0) {
          components.push({
            type: "BUTTONS",
            buttons: buttons.map((text: string) => ({
              type: "QUICK_REPLY",
              text
            }))
          });
        }

        const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/message_templates`;
        const metaRes = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${systemToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: formattedName,
            category: category.toUpperCase(),
            language: "en_US",
            components
          })
        });

        const metaData = await metaRes.json();
        if (metaRes.ok && metaData.id) {
          metaId = metaData.id;
          metaStatus = metaData.status?.toLowerCase() || "pending";
          console.log(`[Meta API] Template submitted: WABA ${wabaId}, Meta ID ${metaId}`);
        } else {
          console.warn("[Meta API] Template submission failed:", metaData.error?.message);
          return NextResponse.json({ 
            error: `Meta rejected template: ${metaData.error?.message || "Unknown error"}` 
          }, { status: 400 });
        }
      } catch (apiErr) {
        console.error("[Meta API Exception] Error during Graph API submit:", apiErr);
        return NextResponse.json({ error: "Failed to communicate with Meta API" }, { status: 502 });
      }
    } else {
      return NextResponse.json({ 
        error: "WhatsApp not configured. Complete Embedded Signup first." 
      }, { status: 400 });
    }

    // Save in Prisma DB
    const template = await prisma.template.create({
      data: {
        name: formattedName,
        body,
        category,
        buttons,
        mediaType,
        metaStatus,
        metaId,
        organizationId
      }
    });

    // Write system log trace
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "crm",
        message: `Template submitted for approval: "${formattedName}" (${category}) - Status: ${metaStatus}`,
        organizationId
      }
    });

    return NextResponse.json({ template });
  } catch (err: unknown) {
    console.error("Create template endpoint error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || "Internal server error" }, { status: 500 });
  }
}
