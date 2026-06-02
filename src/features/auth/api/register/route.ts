import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../shared/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password, name, organizationName, phone, attemptId } = await req.json();

    if (!email || !password || !name || !organizationName) {
      return NextResponse.json(
        { error: "Missing required fields (email, password, name, organizationName)." },
        { status: 400 }
      );
    }

    if (!attemptId) {
      return NextResponse.json(
        { error: "Missing WhatsApp verification attempt ID." },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Validate the WhatsApp login attempt
    const attempt = await prisma.whatsAppLoginAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "WhatsApp verification session not found." },
        { status: 400 }
      );
    }

    if (attempt.status !== "VERIFIED_NEW_USER") {
      return NextResponse.json(
        { error: "WhatsApp verification has not been completed for this session." },
        { status: 400 }
      );
    }

    if (attempt.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "WhatsApp verification session has expired. Please scan the QR code again." },
        { status: 400 }
      );
    }

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

    // Check if phone already registered
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const formattedPhone = cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`;
      const existingPhoneUser = await prisma.user.findUnique({
        where: { phone: formattedPhone }
      });
      if (existingPhoneUser) {
        return NextResponse.json(
          { error: "A user with this WhatsApp number already exists." },
          { status: 400 }
        );
      }
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
          phone: phone ? (phone.startsWith("+") ? phone : `+${phone.replace(/[^0-9]/g, "")}`) : null,
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

      // Mark WhatsApp attempt as verified for this user
      await tx.whatsAppLoginAttempt.update({
        where: { id: attemptId },
        data: {
          status: "VERIFIED",
          userId: user.id
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
