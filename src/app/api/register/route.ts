import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password, name, organizationName } = await req.json();

    if (!email || !password || !name || !organizationName) {
      return NextResponse.json(
        { error: "Missing required fields (email, password, name, organizationName)." },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists." },
        { status: 400 }
      );
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Generate Slug for Organization
    const slug = organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
      
    const uniqueSlug = `${slug}-${Date.now().toString().slice(-4)}`;

    // 4. Execute Transaction to create User, Org, Membership, and Default assets!
    const result = await prisma.$transaction(async (tx) => {
      // Create User
      const user = await tx.user.create({
        data: {
          email: emailLower,
          name,
          hashedPassword,
        }
      });

      // Create Organization
      const org = await tx.organization.create({
        data: {
          name: organizationName.trim(),
          slug: uniqueSlug,
        }
      });

      // Create Membership as OWNER
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "OWNER"
        }
      });

      // Seed Default Welcome Chatbot Node
      await tx.chatbotNode.create({
        data: {
          id: "n1",
          type: "message",
          title: "Welcome Message",
          content: "Hello! Welcome to our store. How can we help you today?",
          options: ["Support", "Sales"],
          organizationId: org.id,
        }
      });

      // Seed Default Templates
      await tx.template.createMany({
        data: [
          {
            name: "welcome_verification",
            body: "Welcome! Your verification code is {{1}}.",
            category: "Authentication",
            buttons: [],
            mediaType: "none",
            metaStatus: "approved",
            organizationId: org.id,
          },
          {
            name: "special_offer",
            body: "Hi {{1}}, we have a special offer for you! Reply YES to claim.",
            category: "Marketing",
            buttons: ["YES", "NO"],
            mediaType: "none",
            metaStatus: "approved",
            organizationId: org.id,
          }
        ]
      });

      return { user, org };
    });

    return NextResponse.json(
      { message: "Registration successful. Workspace created.", orgId: result.org.id },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("❌ Registration API failed:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during database registration." },
      { status: 500 }
    );
  }
}
