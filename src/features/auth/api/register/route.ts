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

    // Validate WhatsApp attempt and hash password in parallel (don't depend on each other)
    const [attempt, hashedPassword] = await Promise.all([
      prisma.whatsAppLoginAttempt.findUnique({
        where: { id: attemptId }
      }),
      bcrypt.hash(password, 10)
    ]);

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

    // Check if user already exists and if phone already registered in parallel
    let checkPhoneUser: Awaited<ReturnType<typeof prisma.user.findUnique>> | undefined;
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
      checkPhoneUser = await prisma.user.findUnique({
        where: { phone: formattedPhone }
      });
      if (checkPhoneUser) {
        return NextResponse.json(
          { error: "A user with this WhatsApp number already exists." },
          { status: 400 }
        );
      }
    }

    // 3. Generate Slug for Organization
    const slug = organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
      
    const uniqueSlug = `${slug}-${Date.now().toString().slice(-4)}`;

    // 4. Execute Transaction to create User, Org, Membership, and Default assets!
    const result = await prisma.$transaction(async (tx) => {
      // Create User and Organization in parallel (don't depend on each other)
      const [user, org] = await Promise.all([
        tx.user.create({
          data: {
            email: emailLower,
            name,
            hashedPassword,
            phone: phone ? (phone.startsWith("+") ? phone : `+${phone.replace(/[^0-9]/g, "")}`) : null,
          }
        }),
        tx.organization.create({
          data: {
            name: organizationName.trim(),
            slug: uniqueSlug,
          }
        })
      ]);

      // Create Membership as OWNER
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "OWNER"
        }
      });

      // Mark WhatsApp attempt, create default chatbot node, and create templates in parallel (don't depend on each other)
      await Promise.all([
        tx.whatsAppLoginAttempt.update({
          where: { id: attemptId },
          data: {
            status: "VERIFIED",
            userId: user.id
          }
        }),
        tx.chatbotNode.create({
          data: {
            id: "n1",
            type: "message",
            title: "Welcome Message",
            content: "Hello! Welcome to our store. How can we help you today?",
            options: ["Support", "Sales"],
            organizationId: org.id,
          }
        }),
        tx.template.createMany({
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
        })
      ]);

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
