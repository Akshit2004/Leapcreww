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

    const { topic, orgId } = await request.json();

    if (!topic || !orgId) {
      return NextResponse.json({ error: "Missing required fields (topic, orgId)" }, { status: 400 });
    }

    interface CustomSessionUser { id: string }
    const userId = (session.user as unknown as CustomSessionUser).id;

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

    const prompt = [
      {
        role: "system",
        content: `You are an expert Facebook and Instagram Ad copywriter for ${brandName}, a business in the ${industry} industry.
Your brand's tone of voice is: ${tone}.

Based on the user's topic or offer, write high-converting ad copy and suggest an image prompt for a Click-to-WhatsApp ad.
Rules:
1. Sound like ${brandName} — reflect the brand tone.
2. The ad is meant to drive users to click a "Send WhatsApp Message" button.
3. Keep the primary text engaging and under 300 characters if possible.
4. Keep the headline punchy and under 40 characters.
5. Create a descriptive prompt for an AI image generator (like Midjourney or DALL-E) that would make a great visual for this ad.

You MUST respond with ONLY a valid JSON object matching this exact schema:
{
  "headline": "...",
  "primaryText": "...",
  "imagePrompt": "..."
}
Do not include any other text, markdown formatting, or code fences around the JSON.`,
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

    try {
      const parsedJson = JSON.parse(generatedText);
      return NextResponse.json(parsedJson);
    } catch (parseError) {
      console.error("Failed to parse JSON from AI output:", generatedText);
      return NextResponse.json({ error: "AI returned an invalid format. Please try again." }, { status: 502 });
    }
  } catch (err: unknown) {
    console.error("AI Ad Generator error:", err);
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : String(err)) || "Internal server error" },
      { status: 500 }
    );
  }
}
