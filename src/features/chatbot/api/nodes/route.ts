import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

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

    const { nodes = [] } = await request.json();

    if (!Array.isArray(nodes)) {
      return NextResponse.json({ error: "Invalid nodes list payload" }, { status: 400 });
    }

    interface ChatbotNodeInput {
      id: string;
      type: string;
      title: string;
      content: string;
      options?: string[];
      delayTime?: string | number | null;
      nextId?: string | null;
      routes?: Record<string, string> | null;
    }

    // 2. Perform Transaction to atomic upsert nodes layout
    await prisma.$transaction([
      // A. Purge all existing chatbot nodes for this organization
      prisma.chatbotNode.deleteMany({
        where: { organizationId: orgId }
      }),
      // B. Create the new node list
      prisma.chatbotNode.createMany({
        data: (nodes as ChatbotNodeInput[]).map((node) => ({
          id: node.id,
          type: node.type,
          title: node.title,
          content: node.content,
          options: Array.isArray(node.options) ? node.options : [],
          delayTime: node.delayTime !== undefined ? parseInt(String(node.delayTime)) : null,
          nextId: node.nextId || null,
          routes: node.routes ? node.routes : {},
          organizationId: orgId
        }))
      })
    ]);

    // 3. Log layout save action
    await prisma.systemLog.create({
      data: {
        type: "crm",
        message: `Chatbot Builder visual nodes layout updated: ${nodes.length} nodes saved successfully.`,
        organizationId: orgId
      }
    });

    return NextResponse.json({ success: true, count: nodes.length });
  } catch (err: unknown) {
    console.error("Save chatbot nodes endpoint error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) || "Internal server error" }, { status: 500 });
  }
}
