import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";
import { getGroqChatCompletion } from "@/shared/lib/groq";

interface BrandProfile {
  name?: string;
  industry?: string;
  toneOfVoice?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, url, orgId } = await request.json();

    if (!topic || !orgId) {
      return NextResponse.json({ error: "Missing required fields (topic, orgId)" }, { status: 400 });
    }

    interface CustomSessionUser { id: string }
    const userId = (session.user as unknown as CustomSessionUser).id;

    // Verify tenancy and pull the brand profile straight from the DB —
    // never trust a brand profile passed from the client.
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access forbidden. You do not belong to this workspace." },
        { status: 403 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { brandProfile: true },
    });

    const brand = (org?.brandProfile as BrandProfile | null) || {};
    const brandName = brand.name?.trim() || "the business";
    const industry = brand.industry?.trim() || "general";
    const tone = brand.toneOfVoice?.trim() || "professional and friendly";

    const linkClause = url
      ? `You must naturally include this exact link in the message: ${url}.`
      : "Do not invent or include any links.";

    const prompt = [
      {
        role: "system",
        content: `You are an expert WhatsApp marketing copywriter for ${brandName}, a business in the ${industry} industry.
Your brand's tone of voice is: ${tone}.

Write a single WhatsApp promotional message body based on the user's topic. Rules:
1. Sound like ${brandName} — reflect the brand tone, not generic AI copy.
2. ${linkClause}
3. Keep the message under 1024 characters.
4. You may use WhatsApp formatting: *bold*, _italics_, ~strikethrough~.
5. Do NOT use template variables like {{1}} unless the topic clearly needs personalization.
6. No abusive, spammy, or excessively pushy claims. Keep urgency professional.

Return ONLY the raw message body text. Do not include explanations, headers, quotation marks, or markdown code fences.`,
      },
      {
        role: "user",
        content: `Topic / offer: ${topic}`,
      },
    ];

    const resultString = await getGroqChatCompletion(prompt);
    const generatedText = (resultString || "")
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/```$/i, "")
      .trim();

    if (!generatedText) {
      return NextResponse.json({ error: "AI returned an empty response. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ generatedText });
  } catch (err: unknown) {
    console.error("AI Template Generator error:", err);
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : String(err)) || "Internal server error" },
      { status: 500 }
    );
  }
}
