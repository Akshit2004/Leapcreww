import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../shared/lib/prisma";
import type { Prisma } from "@prisma/client";
import { AUTOMATION_CATALOG } from "@/features/automations/config/catalog";

const RegisterSchema = z.object({
  email: z.string().trim().email("A valid email address is required").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(200).optional(),
  name: z.string().trim().min(1, "Name is required").max(120),
  organizationName: z.string().trim().min(1, "Organization name is required").max(120),
  phone: z.string().max(20).optional(),
  attemptId: z.string().min(1, "Missing verification attempt ID."),
  attemptType: z.enum(["whatsapp", "email"]).default("whatsapp"),
}).refine((d) => d.attemptType !== "email" || (d.password?.length ?? 0) >= 8, {
  message: "A password is required for email signups.",
  path: ["password"],
});

export async function POST(req: Request) {
  try {
    const parsed = RegisterSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }
    const { email, password, name, organizationName, phone, attemptId, attemptType } = parsed.data;

    const emailLower = email.toLowerCase().trim();

    // Verify Attempt (WhatsApp or Email OTP attempt — both carry status/expiry)
    let attempt: { status: string; expiresAt: Date } | null = null;
    let hashedPassword = null;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    if (attemptType === "whatsapp") {
      attempt = await prisma.whatsAppLoginAttempt.findUnique({
        where: { id: attemptId }
      });
    } else {
      attempt = await prisma.emailOtpAttempt.findUnique({
        where: { id: attemptId }
      });
    }

    if (!attempt) {
      return NextResponse.json(
        { error: "Verification session not found." },
        { status: 400 }
      );
    }

    if (attempt.status !== "VERIFIED_NEW_USER") {
      return NextResponse.json(
        { error: "Verification has not been completed for this session." },
        { status: 400 }
      );
    }

    if (attempt.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Verification session has expired. Please try again." },
        { status: 400 }
      );
    }

    // Check if user already exists
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

    // Generate Slug for Organization
    const slug = organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
      
    const uniqueSlug = `${slug}-${Date.now().toString().slice(-4)}`;

    // Execute Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create User and Organization
      const [user, org] = await Promise.all([
        tx.user.create({
          data: {
            email: emailLower,
            name,
            hashedPassword,
            emailVerified: attemptType === "email" ? new Date() : null,
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

      // Update attempt status
      if (attemptType === "whatsapp") {
        await tx.whatsAppLoginAttempt.update({
          where: { id: attemptId },
          data: {
            status: "VERIFIED",
            userId: user.id
          }
        });
      } else {
        await tx.emailOtpAttempt.update({
          where: { id: attemptId },
          data: {
            status: "VERIFIED"
          }
        });
      }

      // Default visual chatbot node
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

      // Seed all 20 default automations from catalog
      await tx.automation.createMany({
        data: AUTOMATION_CATALOG.map((item) => ({
          name: item.title,
          organizationId: org.id,
          triggerType: item.triggerType,
          triggerConfig: item.triggerConfig as Prisma.InputJsonValue,
          steps: item.steps as unknown as Prisma.InputJsonValue,
          templateName: "",
          templateParams: [] as Prisma.InputJsonValue,
          isActive: true,
        })),
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
