import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";
import { prisma } from "@/shared/lib/prisma";

function logTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await params;

  const integration = await prisma.integration.findUnique({
    where: { id_organizationId: { id: "shopify", organizationId: orgId } },
  });

  return NextResponse.json({ integration });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const body = await req.json();
  const { shopDomain, accessToken, action } = body;

  if (action === "disconnect") {
    await prisma.integration.upsert({
      where: { id_organizationId: { id: "shopify", organizationId: orgId } },
      update: { status: "disconnected", apiKey: null, webhookUrl: null },
      create: {
        id: "shopify",
        name: "Shopify",
        description: "Sync orders, products, and contacts from your Shopify store.",
        status: "disconnected",
        icon: "shopify",
        organizationId: orgId,
      },
    });
    return NextResponse.json({ status: "disconnected" });
  }

  if (!shopDomain || !accessToken) {
    return NextResponse.json({ error: "shopDomain and accessToken are required" }, { status: 400 });
  }

  // Validate credentials against Shopify API
  const domain = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const shopRes = await fetch(`https://${domain}/admin/api/2024-04/shop.json`, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });

  if (!shopRes.ok) {
    return NextResponse.json(
      { error: "Invalid credentials — could not reach your Shopify store. Check domain and token." },
      { status: 400 }
    );
  }

  const shopData = await shopRes.json();
  const shopName = shopData.shop?.name || domain;

  // Determine public origin for webhook registration
  const origin = req.headers.get("origin") || req.headers.get("x-forwarded-host") || "localhost:3000";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const webhookBase = isLocalhost
    ? null
    : origin.startsWith("http")
    ? origin
    : `https://${origin}`;

  const webhookUrl = webhookBase ? `${webhookBase}/api/webhooks/shopify` : null;

  const webhooksRegistered: string[] = [];
  let webhookWarning: string | null = null;

  if (webhookUrl) {
    const topics = ["orders/create", "orders/fulfilled", "checkouts/create"];
    for (const topic of topics) {
      try {
        const whRes = await fetch(`https://${domain}/admin/api/2024-04/webhooks.json`, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook: { topic, address: webhookUrl, format: "json" },
          }),
        });
        if (whRes.ok) webhooksRegistered.push(topic);
      } catch {
        // non-fatal
      }
    }
  } else {
    webhookWarning = "Running on localhost — webhooks cannot be auto-registered. Use a public tunnel (ngrok / Cloudflare) and register manually.";
  }

  const credentials = JSON.stringify({ shopDomain: domain, accessToken, shopName });

  await prisma.integration.upsert({
    where: { id_organizationId: { id: "shopify", organizationId: orgId } },
    update: {
      status: "connected",
      apiKey: credentials,
      webhookUrl: webhookUrl,
    },
    create: {
      id: "shopify",
      name: "Shopify",
      description: "Sync orders, products, and contacts from your Shopify store.",
      status: "connected",
      icon: "shopify",
      apiKey: credentials,
      webhookUrl: webhookUrl,
      organizationId: orgId,
    },
  });

  await prisma.systemLog.create({
    data: {
      type: "integration",
      message: `Shopify store "${shopName}" connected (${domain}). Webhooks registered: ${webhooksRegistered.join(", ") || "none"}.`,
      organizationId: orgId,
    },
  });

  return NextResponse.json({
    status: "connected",
    shopName,
    shopDomain: domain,
    webhooksRegistered,
    webhookUrl,
    webhookWarning,
    isLocalhost,
  });
}
