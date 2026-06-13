import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";
import { getGroqChatCompletion } from "@/shared/lib/groq";

interface CustomSessionUser {
  id: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");
    const orgId = searchParams.get("orgId");

    if (!contactId || !orgId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userId = (session.user as unknown as CustomSessionUser).id;
    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId: orgId },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access forbidden. You do not belong to this workspace." },
        { status: 403 }
      );
    }

    // 1. Fetch recent messages in chat context
    const dbMessages = await prisma.message.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    // Reverse to chronological order
    const chatHistory = dbMessages.reverse();

    // 2. Fetch product catalog
    const products = await prisma.product.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { sku: true, name: true, description: true, price: true },
      take: 12,
    });

    // 3. Fetch Brand Profile
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { brandProfile: true },
    });
    const brand = (org?.brandProfile as any) || {};
    const brandName = brand.name || "the business";
    const industry = brand.industry || "general";
    const tone = brand.toneOfVoice || "professional and friendly";

    // Build model prompt
    const productCatalogText = products.length > 0
      ? products.map(p => `- ${p.name} (Price: ₹${(p.price / 100).toFixed(2)}, SKU: ${p.sku || "N/A"}): ${p.description}`).join("\n")
      : "No products currently listed in the catalog.";

    const systemPrompt = `You are an inbox assistant for LeapCreww CRM. Your goal is to draft exactly 3 brief, helpful suggested replies that a customer support agent can send to the user.
Ground your suggestions strictly in:
1. Recent chat messages.
2. The product catalog provided below (if empty, do not suggest products).
3. The brand guidelines of the organization.

Organization info:
- Brand: ${brandName}
- Industry: ${industry}
- Tone: ${tone}

Product catalog:
${productCatalogText}

Rules for response:
- Output exactly 3 alternative suggestions.
- Keep each suggestion very short (1-2 sentences), natural and friendly, suitable for WhatsApp.
- Output ONLY a valid JSON array of strings, for example:
["suggestion 1", "suggestion 2", "suggestion 3"]
- Do not output markdown, code blocks, or any surrounding text.`;

    const chatHistoryText = chatHistory.length > 0
      ? chatHistory.map(m => `${m.sender === "user" ? "Customer" : "Agent"}: ${m.text}`).join("\n")
      : "No messages yet. The conversation has just started.";

    const response = await getGroqChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Recent chat logs:\n${chatHistoryText}` }
    ], "llama-3.3-70b-versatile");

    const cleanJson = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const suggestions = JSON.parse(cleanJson);
      return NextResponse.json({ suggestions });
    } catch {
      // Fallback in case formatting fails
      return NextResponse.json({
        suggestions: [
          `Hi! Thank you for reaching out to ${brandName}. How can I assist you today?`,
          `Would you like to hear about our latest catalog offers?`,
          `Let me check that detail for you right away.`
        ]
      });
    }
  } catch (err: any) {
    console.error("AI Reply Suggestions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
