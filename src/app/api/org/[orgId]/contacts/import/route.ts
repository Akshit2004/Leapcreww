import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { prisma } from "../../../../../../lib/prisma";

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

    // Verify User has active tenancy/membership in requested organization
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

    const body = await request.json();
    const { contacts } = body;

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ error: "Invalid contacts payload." }, { status: 400 });
    }

    interface ImportContact {
      name?: string;
      phone: string;
      email?: string;
      source?: string;
      tags?: string[];
      status?: string;
    }
    const validContacts = (contacts as ImportContact[]).map((c) => ({
      name: c.name || "Unknown",
      phone: c.phone,
      email: c.email || "",
      source: c.source || "Imported CSV",
      tags: c.tags || ["imported"],
      status: c.status || "Active",
      organizationId: orgId,
    })).filter(c => c.phone);

    if (validContacts.length === 0) {
      return NextResponse.json({ error: "No valid contacts to import." }, { status: 400 });
    }

    const result = await prisma.contact.createMany({
      data: validContacts,
    });

    return NextResponse.json({ 
      message: "Import successful", 
      count: result.count 
    }, { status: 201 });
  } catch (err: unknown) {
    console.error("❌ CSV Import API failed:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during import." },
      { status: 500 }
    );
  }
}
